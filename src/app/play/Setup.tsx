"use client";

import { useState } from "react";
import type { Commander, League, Player } from "@/lib/types";
import {
	type GameSettings,
	type GameState,
	type Seat,
	MAX_PLAYERS,
	MIN_PLAYERS,
	PLAYER_COLORS,
	STARTING_LIFE_OPTIONS,
	createGame,
} from "@/lib/lifeCounter";
import SeatFields, { type PlayerGroup, type SeatFieldsValue, commanderNameOf } from "./SeatFields";
import { RiPlayFill } from "@remixicon/react";

interface Props {
	leagues: League[];
	players: Player[];
	commanders: Commander[];
	playerCommanderUsage: Record<string, string[]>;
	leaguePlayerIds: Record<string, string[]>;
	previous: GameState | null;
	savedGame: GameState | null;
	onStart: (game: GameState) => void;
	onResume: (game: GameState) => void;
	onDiscardSaved: () => void;
}


const PLAYER_COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i);

function seatsFromGame(game: GameState): SeatFieldsValue[] {
	return game.seats.map((s) => ({
		playerId: s.playerId,
		playerName: s.name,
		commander: s.commanderId ?? (s.commanderName ? `new:${s.commanderName}` : ""),
		color: s.color,
		useArt: s.useArt,
	}));
}

function resizeSeats(seats: SeatFieldsValue[], count: number): SeatFieldsValue[] {
	const next = seats.slice(0, count);
	while (next.length < count) {
		const used = new Set(next.map((s) => s.color));
		const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[next.length % PLAYER_COLORS.length];
		next.push({ playerId: "", playerName: "", commander: "", color, useArt: true });
	}
	return next;
}

function availableLeagues(leagues: League[], count: number): League[] {
	return count === 2 ? leagues.filter((l) => l.is_practice) : leagues;
}

export default function Setup({
	leagues,
	players,
	commanders,
	playerCommanderUsage,
	leaguePlayerIds,
	previous,
	savedGame,
	onStart,
	onResume,
	onDiscardSaved,
}: Props) {
	const initialCount = previous?.seats.length ?? 4;
	const [count, setCount] = useState(initialCount);
	const [leagueId, setLeagueId] = useState(
		previous?.leagueId ?? availableLeagues(leagues, initialCount)[0]?.id ?? "",
	);
	const [settings, setSettings] = useState<GameSettings>(
		previous?.settings ?? { startingLife: 40, autoKo: true, cmdDamageLifeLoss: true },
	);
	const [seats, setSeats] = useState<SeatFieldsValue[]>(
		previous ? seatsFromGame(previous) : resizeSeats([], initialCount),
	);
	const [error, setError] = useState("");

	const leagueOptions = availableLeagues(leagues, count);
	const inLeague = new Set(leagueId ? (leaguePlayerIds[leagueId] ?? []) : []);
	const leaguePlayers = players.filter((p) => inLeague.has(p.id));
	const otherPlayers = players.filter((p) => !inLeague.has(p.id));
	const selectedLeague = leagues.find((l) => l.id === leagueId);
	const playerGroups: PlayerGroup[] = [
		{ label: selectedLeague ? `Played in ${selectedLeague.name}` : null, list: leaguePlayers },
		{ label: leaguePlayers.length > 0 ? "Other players" : null, list: otherPlayers },
	];

	function changeCount(next: number) {
		setCount(next);
		setSeats((prev) => resizeSeats(prev, next));
		if (!availableLeagues(leagues, next).some((l) => l.id === leagueId)) {
			setLeagueId(availableLeagues(leagues, next)[0]?.id ?? "");
		}
	}

	function updateSeat(index: number, patch: Partial<SeatFieldsValue>) {
		setSeats((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], ...patch };
			if (patch.color !== undefined) {
				// Swap colors so two seats never share one
				const clash = next.findIndex((s, i) => i !== index && s.color === patch.color);
				if (clash !== -1) next[clash] = { ...next[clash], color: prev[index].color };
			}
			return next;
		});
	}

	function handleStart() {
		setError("");
		const names = seats.map((s) => s.playerName.trim().toLowerCase());
		if (names.some((n) => !n)) {
			setError("Enter a name for every seat.");
			return;
		}
		if (new Set(names).size !== names.length) {
			setError("Each seat needs a different player.");
			return;
		}
		const gameSeats: Seat[] = seats.map((s) => ({
			playerId: s.playerId,
			name: s.playerName.trim(),
			commanderId: s.commander && !s.commander.startsWith("new:") ? s.commander : null,
			commanderName: commanderNameOf(s.commander, commanders),
			color: s.color,
			useArt: s.useArt,
		}));
		onStart(createGame(leagueId || null, settings, gameSeats));
	}

	return (
		<div className="max-w-lg mx-auto space-y-6">
			<h1 className="text-2xl font-bold">Play</h1>

			{savedGame && (
				<div className="rounded-lg border border-accent/30 bg-accent/5 p-3 flex items-center gap-3">
					<div className="flex-1 text-sm">
						<p className="font-semibold">Game in progress</p>
						<p className="text-foreground/50 text-xs">{savedGame.seats.map((s) => s.name).join(", ")}</p>
					</div>
					<button
						type="button"
						onClick={onDiscardSaved}
						className="text-xs text-foreground/40 hover:text-foreground transition-colors"
					>
						Discard
					</button>
					<button
						type="button"
						onClick={() => onResume(savedGame)}
						className="inline-flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
					>
						<RiPlayFill size={14} />
						Resume
					</button>
				</div>
			)}

			{/* Player count */}
			<div>
				<label className="block text-sm text-foreground/70 mb-2">Number of players</label>
				<div className="flex gap-2">
					{PLAYER_COUNTS.map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => changeCount(c)}
							className={`flex-1 rounded border px-3 py-2 text-sm font-semibold transition-colors ${
								count === c ? "border-accent bg-accent/20 text-accent" : "border-border hover:bg-surface"
							}`}
						>
							{c}
						</button>
					))}
				</div>
			</div>

			{/* League */}
			<div>
				<label className="block text-sm text-foreground/70 mb-2">League</label>
				<div className="flex gap-2 flex-wrap">
					{leagueOptions.map((l) => (
						<button
							key={l.id}
							type="button"
							onClick={() => setLeagueId(l.id)}
							className={`rounded border px-3 py-2 text-sm font-medium transition-colors ${
								leagueId === l.id
									? "border-accent bg-accent/20 text-accent"
									: "border-border hover:bg-surface text-foreground/70"
							}`}
						>
							{l.name}
							{l.is_practice && <span className="ml-1.5 text-xs text-foreground/40">(Practice)</span>}
						</button>
					))}
					<button
						type="button"
						onClick={() => setLeagueId("")}
						className={`rounded border px-3 py-2 text-sm font-medium transition-colors ${
							leagueId === ""
								? "border-accent bg-accent/20 text-accent"
								: "border-border hover:bg-surface text-foreground/70"
						}`}
					>
						No league
					</button>
				</div>
				{count === 2 && (
					<p className="text-xs text-foreground/40 mt-1.5">
						2-player games can only be registered in practice leagues.
					</p>
				)}
			</div>

			{/* Seats */}
			<div className="space-y-3">
				<label className="block text-sm text-foreground/70">Players</label>
				{seats.map((seat, i) => (
					<div
						key={i}
						className="rounded-lg border border-border bg-surface/60 p-3"
						style={{ borderLeftColor: seat.color, borderLeftWidth: 4 }}
					>
						<SeatFields
							value={seat}
							onChange={(patch) => updateSeat(i, patch)}
							playerGroups={playerGroups}
							takenPlayerIds={seats.filter((_, j) => j !== i).map((s) => s.playerId)}
							takenColors={[]}
							commanders={commanders}
							playerCommanderUsage={playerCommanderUsage}
						/>
					</div>
				))}
				<p className="text-xs text-foreground/40">
					New commanders are added to the list when the game is registered.
				</p>
			</div>

			{/* Settings */}
			<div className="space-y-3">
				<label className="block text-sm text-foreground/70">Starting life</label>
				<div className="flex gap-2">
					{STARTING_LIFE_OPTIONS.map((life) => (
						<button
							key={life}
							type="button"
							onClick={() => setSettings((s) => ({ ...s, startingLife: life }))}
							className={`flex-1 rounded border px-3 py-2 text-sm font-semibold transition-colors ${
								settings.startingLife === life
									? "border-accent bg-accent/20 text-accent"
									: "border-border hover:bg-surface"
							}`}
						>
							{life}
						</button>
					))}
				</div>

				{[
					{
						key: "autoKo" as const,
						label: "Auto-KO",
						hint: "From 0 life or 21 commander damage",
					},
					{
						key: "cmdDamageLifeLoss" as const,
						label: "Commander damage life loss",
						hint: "Commander damage also reduces life",
					},
				].map(({ key, label, hint }) => (
					<label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
						<span>
							<span className="block text-sm">{label}</span>
							<span className="block text-xs text-foreground/40">{hint}</span>
						</span>
						<input
							type="checkbox"
							checked={settings[key]}
							onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.checked }))}
							className="h-5 w-5 accent-accent"
						/>
					</label>
				))}
			</div>

			{error && <p className="text-red-400 text-sm">{error}</p>}

			<button
				type="button"
				onClick={handleStart}
				className="w-full inline-flex items-center justify-center gap-2 rounded bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-hover transition-colors"
			>
				<RiPlayFill size={18} />
				Start game
			</button>
		</div>
	);
}
