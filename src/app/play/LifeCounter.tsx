"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Commander, League, Player } from "@/lib/types";
import {
	type GameState,
	isNewCommander,
	isNewPlayer,
	readSavedGameRaw,
	saveGame,
	saveRegisterDraft,
} from "@/lib/lifeCounter";
import Setup from "./Setup";
import GameBoard from "./GameBoard";
import type { SeatEditorData } from "./PlayerPanel";
import Results from "./Results";

interface Props {
	leagues: League[];
	players: Player[];
	commanders: Commander[];
	playerCommanderUsage: Record<string, string[]>;
	leaguePlayerIds: Record<string, string[]>;
}

type Phase = "setup" | "game" | "results";

function subscribeNoop() {
	return () => {};
}

export default function LifeCounter(props: Props) {
	const router = useRouter();
	const [phase, setPhase] = useState<Phase>("setup");
	const [game, setGame] = useState<GameState | null>(null);
	const [savedDismissed, setSavedDismissed] = useState(false);

	// A game saved in localStorage (e.g. after a reload) can be resumed from setup
	const savedRaw = useSyncExternalStore(subscribeNoop, readSavedGameRaw, () => null);
	const savedGame = useMemo(() => {
		if (!savedRaw || savedDismissed) return null;
		try {
			return JSON.parse(savedRaw) as GameState;
		} catch {
			return null;
		}
	}, [savedRaw, savedDismissed]);

	function startGame(next: GameState) {
		saveGame(next);
		setSavedDismissed(false);
		setGame(next);
		setPhase("game");
	}

	function exitGame() {
		saveGame(null);
		setPhase("setup");
	}

	function register(final: GameState, placements: number[]) {
		saveRegisterDraft({
			leagueId: final.leagueId,
			playedAt: new Date().toLocaleDateString("sv-SE"),
			entries: final.seats.map((s, i) => ({
				playerId: isNewPlayer(s) ? null : s.playerId,
				playerName: isNewPlayer(s) ? s.name : null,
				placement: placements[i],
				commanderId: s.commanderId,
				commanderName: isNewCommander(s) ? s.commanderName : null,
			})),
		});
		saveGame(null);
		router.push("/register");
	}

	// Data for editing a seat mid-game (league players first)
	const inLeague = new Set(game?.leagueId ? (props.leaguePlayerIds[game.leagueId] ?? []) : []);
	const leaguePlayers = props.players.filter((p) => inLeague.has(p.id));
	const editor: SeatEditorData = {
		playerGroups: [
			{ label: leaguePlayers.length > 0 ? "In this league" : null, list: leaguePlayers },
			{
				label: leaguePlayers.length > 0 ? "Other players" : null,
				list: props.players.filter((p) => !inLeague.has(p.id)),
			},
		],
		commanders: props.commanders,
		playerCommanderUsage: props.playerCommanderUsage,
	};

	if (phase === "game" && game) {
		return (
			<GameBoard
				initialGame={game}
				editor={editor}
				onHome={() => router.push("/")}
				onEnd={(final) => {
					setGame(final);
					setPhase("results");
				}}
				onExit={exitGame}
			/>
		);
	}

	if (phase === "results" && game) {
		return (
			<Results
				game={game}
				leagues={props.leagues}
				onBack={() => setPhase("game")}
				onNewGame={() => {
					saveGame(null);
					setPhase("setup");
				}}
				onRegister={(placements) => register(game, placements)}
			/>
		);
	}

	return (
		<Setup
			{...props}
			previous={game}
			savedGame={savedGame}
			onStart={startGame}
			onResume={(saved) => {
				setGame(saved);
				setPhase("game");
			}}
			onDiscardSaved={() => {
				saveGame(null);
				setSavedDismissed(true);
			}}
		/>
	);
}
