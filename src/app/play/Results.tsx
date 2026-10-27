"use client";

import { useState } from "react";
import type { League } from "@/lib/types";
import { getPointsForPlacement } from "@/lib/types";
import { type GameState, computePlacements, isNewCommander } from "@/lib/lifeCounter";
import { RiArrowLeftLine, RiFileAddLine, RiRestartLine, RiSkull2Line } from "@remixicon/react";

const PLACEMENT_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };

interface Props {
	game: GameState;
	leagues: League[];
	onBack: () => void;
	onNewGame: () => void;
	onRegister: (placements: number[]) => void;
}

export default function Results({ game, leagues, onBack, onNewGame, onRegister }: Props) {
	const [placements, setPlacements] = useState<number[]>(() => computePlacements(game));
	const [error, setError] = useState("");

	const n = game.seats.length;
	const league = leagues.find((l) => l.id === game.leagueId) ?? null;
	const showPoints = league && !league.is_practice && n >= 3;
	const blockedOfficial = n === 2 && league && !league.is_practice;

	const order = game.seats.map((_, i) => i).sort((a, b) => placements[a] - placements[b]);
	const placementCounts = new Map<number, number>();
	placements.forEach((p) => placementCounts.set(p, (placementCounts.get(p) ?? 0) + 1));

	function handleRegister() {
		setError("");
		if (!placements.includes(1)) {
			setError("At least one player must be in 1st place.");
			return;
		}
		onRegister(placements);
	}

	return (
		<div className="max-w-lg mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Results</h1>
				<p className="text-sm text-foreground/50 mt-1">
					{league ? league.name : "No league selected"} · {n} players
				</p>
			</div>

			<div className="space-y-2">
				{order.map((seat) => {
					const s = game.seats[seat];
					const placement = placements[seat];
					const pts = showPoints ? getPointsForPlacement(placements, placement, n) : null;
					return (
						<div
							key={seat}
							className="rounded-lg border border-border bg-surface/60 px-3 py-2 flex items-center gap-3"
							style={{ borderLeftColor: s.color, borderLeftWidth: 4 }}
						>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className={placement === 1 ? "font-semibold" : ""}>{s.name}</span>
									{game.eliminated.includes(seat) && (
										<RiSkull2Line size={14} className="text-foreground/30" />
									)}
									{pts !== null && <span className="text-xs text-accent font-medium">+{pts}</span>}
								</div>
								<p className="text-xs text-foreground/40 truncate">
									{s.commanderName
										? `${s.commanderName}${isNewCommander(s) ? " (new)" : ""}`
										: "No commander"}
								</p>
							</div>
							<div className="flex gap-1">
								{Array.from({ length: n }, (_, k) => k + 1).map((p) => {
									const selected = placement === p;
									const tied = selected && (placementCounts.get(p) ?? 0) > 1;
									return (
										<button
											key={p}
											type="button"
											onClick={() => setPlacements((prev) => prev.map((x, i) => (i === seat ? p : x)))}
											title={PLACEMENT_LABEL[p]}
											className={`w-8 rounded text-xs font-semibold py-2 transition-colors ${
												selected
													? tied
														? "bg-yellow-500/20 border border-yellow-500/50 text-yellow-400"
														: "bg-accent/20 border border-accent/50 text-accent"
													: "border border-border hover:bg-surface text-foreground/50"
											}`}
										>
											{p}
										</button>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>

			{blockedOfficial && (
				<p className="text-xs text-foreground/40">
					2-player games can only be registered in practice leagues — pick one when registering.
				</p>
			)}
			{error && <p className="text-red-400 text-sm">{error}</p>}

			<div className="space-y-2">
				<button
					type="button"
					onClick={handleRegister}
					className="w-full inline-flex items-center justify-center gap-2 rounded bg-accent px-4 py-3 font-semibold text-white hover:bg-accent-hover transition-colors"
				>
					<RiFileAddLine size={18} />
					Register game
				</button>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={onBack}
						className="flex-1 inline-flex items-center justify-center gap-1.5 rounded border border-border px-3 py-2 text-sm hover:bg-surface transition-colors"
					>
						<RiArrowLeftLine size={16} />
						Back to game
					</button>
					<button
						type="button"
						onClick={onNewGame}
						className="flex-1 inline-flex items-center justify-center gap-1.5 rounded border border-border px-3 py-2 text-sm hover:bg-surface transition-colors"
					>
						<RiRestartLine size={16} />
						New game
					</button>
				</div>
			</div>
		</div>
	);
}
