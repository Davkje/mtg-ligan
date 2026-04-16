export const dynamic = "force-dynamic";

import Link from "next/link";
import { getLeaderboard, getRecentMatches } from "@/lib/data";
import { getPoints } from "@/lib/types";
import { RiStarFill } from "@remixicon/react";

const PLACEMENT_LABEL: Record<number, string> = {
	1: "1st",
	2: "2nd",
	3: "3rd",
	4: "4th",
	5: "5th",
};

export default async function HomePage() {
	const [leaderboard, recentMatches] = await Promise.all([getLeaderboard(), getRecentMatches(5)]);

	return (
		<div className="space-y-8">
			{/* Leaderboard */}
			<section>
				<h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
				<div className="rounded-lg border border-border overflow-hidden">
					<table className="w-full bg-background/90 text-sm">
						<thead className="bg-surface text-foreground/60 uppercase text-[clamp(12px,1.6vw,14px)] tracking-wider">
							<tr className="">
								<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-left">Rank</th>
								<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-left">Player</th>
								<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-center">Points</th>
								<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-center">Matches</th>
								<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-right">Win %</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border text-[clamp(14px,1.8vw,16px)]">
							{leaderboard.map((entry, i) => (
								<tr
									key={entry.player.id}
									className={i === 0 ? "bg-accent/10" : "hover:bg-surface transition-colors"}
								>
									<td className="px-[clamp(10px,1.4vw,16px)] py-3 font-mono text-foreground/50">
										{i === 0 ? (
											<div className="flex gap-1 items-center">
												<span>#1</span>
												<RiStarFill size={16} className="text-accent" />
											</div>
										) : (
											`#${entry.rank}`
										)}
									</td>
									<td className="px-[clamp(10px,1.4vw,16px)] py-3 font-semibold">
										<Link
											href={`/player/${entry.player.id}`}
											className="hover:text-accent transition-colors"
										>
											{entry.player.name}
										</Link>
									</td>
									<td className="px-[clamp(10px,1.4vw,16px)] py-3 text-center font-bold text-accent">
										{entry.totalPoints}
									</td>
									<td className="px-[clamp(10px,1.4vw,16px)] py-3 text-center text-foreground/70">
										{entry.matches}
									</td>
									<td className="px-[clamp(10px,1.4vw,16px)] py-3 text-right text-foreground/70">
										{entry.winRate}%
									</td>
								</tr>
							))}
							{leaderboard.length === 0 && (
								<tr>
									<td
										colSpan={5}
										className="px-[clamp(10px,1.4vw,16px)] py-8 text-center text-foreground/40"
									>
										No matches played yet.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>

			{/* Recent matches */}
			<section>
				<h2 className="text-xl font-bold mb-4">Recent Matches</h2>
				{recentMatches.length === 0 ? (
					<p className="text-foreground/40 text-sm">No matches yet.</p>
				) : (
					<div className="space-y-3">
						{recentMatches.map((match) => {
							const playerCount = match.results.length;
							return (
								<div
									key={match.id}
									className="rounded-lg border border-border bg-surface p-3 md:p-4"
								>
									<div className="flex items-center gap-2 mb-3">
										<Link
											href={`/match/${match.id}`}
											className="group flex gap-2 text-sm transition-colors"
										>
											<span className="text-foreground/70 group-hover:text-accent transition-colors">
												{new Date(match.played_at).toLocaleDateString("sv-SE", {
													year: "numeric",
													month: "long",
													day: "numeric",
												})}
											</span>
											<span className="text-foreground/50 group-hover:text-accent transition-colors">
												{playerCount} players
											</span>
										</Link>
									</div>
									<div
										className="grid gap-4"
										style={{ gridTemplateColumns: `repeat(${playerCount}, minmax(0, 1fr))` }}
									>
										{match.results.map((r) => (
											<div
												key={r.id}
												className={`flex flex-col justify-center items-center gap-1 bg-background/70 rounded px-5 py-3 text-center ${
													r.placement === 1 ? "" : ""
												}`}
											>
												<div className="flex gap-2 font-semibold text-sm md:text-md">
													<Link
														href={`/player/${r.player.id}`}
														className="hover:text-accent transition-colors "
													>
														{r.player.name}
													</Link>
													<div className="text-accent">{PLACEMENT_LABEL[r.placement]}</div>
												</div>
												<div className="text-xs text-foreground/50">
													+{getPoints(playerCount, r.placement)}
												</div>
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}
