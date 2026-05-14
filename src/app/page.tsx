export const dynamic = "force-dynamic";

import Link from "next/link";
import { getLeaderboard, getLeagues, getMatchSummary, getRecentMatches } from "@/lib/data";
import { getPointsForPlacement } from "@/lib/types";
import type { MatchWithResults } from "@/lib/data";
import {
	RiStarFill,
	RiSwordLine,
	RiTrophyLine,
	RiGroupLine,
	RiCalendarLine,
	RiBarChartLine,
	RiFireLine,
	RiShieldLine,
} from "@remixicon/react";

const PLACEMENT_LABEL: Record<number, string> = {
	1: "1st",
	2: "2nd",
	3: "3rd",
	4: "4th",
	5: "5th",
};

export default async function HomePage() {
	const leagues = await getLeagues();
	const [leaderboard, recentMatches, summary] = await Promise.all([
		getLeaderboard(),
		getRecentMatches(10),
		getMatchSummary(leagues),
	]);

	const leader = leaderboard[0] ?? null;
	const bestWinRate =
		[...leaderboard].filter((e) => e.matches >= 3).sort((a, b) => b.winRate - a.winRate)[0] ?? null;
	const mostActive = [...leaderboard].sort((a, b) => b.matches - a.matches)[0] ?? null;

	const leaguesWithCount = leagues
		.map((l) => ({ league: l, count: summary.byLeague.get(l.id) ?? 0 }))
		.filter((x) => x.count > 0)
		.sort((a, b) => b.count - a.count);

	const leagueOrder: string[] = [];
	const byLeague = new Map<string, MatchWithResults[]>();
	for (const match of recentMatches) {
		const lid = match.league.id;
		if (!byLeague.has(lid)) {
			leagueOrder.push(lid);
			byLeague.set(lid, []);
		}
		byLeague.get(lid)!.push(match);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
			{/* Leaderboard */}
			<div className="flex flex-col gap-4 ">
				<section>
					<h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
					<div className="rounded-lg border border-border overflow-hidden">
						<table className="w-full bg-background/90 text-sm">
							<thead className="bg-surface text-foreground/60 uppercase text-[clamp(12px,1.6vw,14px)] tracking-wider">
								<tr>
									<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-left">Rank</th>
									<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-left">Player</th>
									<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-center">Points</th>
									<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-center">Matches</th>
									<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-right">Win %</th>
									<th className="px-[clamp(10px,1.4vw,16px)] py-3 text-left hidden lg:table-cell">
										Top Commander
									</th>
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
										<td className="px-[clamp(10px,1.4vw,16px)] py-3 text-left text-foreground/50 text-sm hidden lg:table-cell">
											{entry.favoriteCommander?.name ?? (
												<span className="text-foreground/20">—</span>
											)}
										</td>
									</tr>
								))}
								{leaderboard.length === 0 && (
									<tr>
										<td colSpan={6} className="px-4 py-8 text-center text-foreground/40">
											No matches played yet.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</section>

				{/* Recent matches grouped by league */}
				<section>
					<h2 className="text-xl font-bold mb-4">Recent Matches</h2>
					{recentMatches.length === 0 ? (
						<p className="text-foreground/40 text-sm">No matches yet.</p>
					) : (
						<div className="flex flex-col gap-4">
							{leagueOrder.map((leagueId) => {
								const league = byLeague.get(leagueId)![0].league;
								const matches = byLeague.get(leagueId)!;
								return (
									<div key={leagueId}>
										<div className="flex items-center gap-3 mb-3">
											<h3 className="text-sm font-semibold text-foreground/60">{league.name}</h3>
											<div className="flex-1 border-t border-border" />
											{league.is_practice && (
												<span className="text-xs text-foreground/30">Practice</span>
											)}
										</div>
										<div className="space-y-3">
											{matches.map((match) => {
												const playerCount = match.results.length;
												const allPlacements = match.results.map((r) => r.placement);
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
																<span className="text-foreground/40 group-hover:text-accent transition-colors">
																	{playerCount} players
																</span>
															</Link>
														</div>
														<div
															className="grid gap-2"
															style={{
																gridTemplateColumns: `repeat(${playerCount}, minmax(0, 1fr))`,
															}}
														>
															{match.results.map((r) => {
																const pts = getPointsForPlacement(
																	allPlacements,
																	r.placement,
																	playerCount,
																);
																const tied =
																	allPlacements.filter((p) => p === r.placement).length > 1;
																return (
																	<div
																		key={r.id}
																		className="flex flex-col justify-center items-center gap-1 bg-background/70 rounded px-3 py-3 text-center"
																	>
																		<div className="flex gap-1.5 font-semibold text-sm flex-wrap justify-center">
																			<Link
																				href={`/player/${r.player.id}`}
																				className="hover:text-accent transition-colors"
																			>
																				{r.player.name}
																			</Link>
																			<span className="text-accent">
																				{PLACEMENT_LABEL[r.placement]}
																				{tied ? "T" : ""}
																			</span>
																		</div>
																		{r.commander && (
																			<div className="text-xs text-foreground/40 truncate w-full text-center">
																				{r.commander.name}
																			</div>
																		)}
																		{!league.is_practice && (
																			<div className="text-xs text-foreground/50">+{pts}</div>
																		)}
																	</div>
																);
															})}
														</div>
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</section>
			</div>

			<div className="flex flex-col gap-4 ">
				{/* Quick stats */}
				<h1 className="text-2xl font-bold">Stats</h1>
				<div className="grid grid-cols-1 gap-3">
					{[
						{ icon: RiSwordLine, label: "Total Matches", value: summary.total },
						{ icon: RiTrophyLine, label: "Ranked Matches", value: summary.ranked },
						{ icon: RiCalendarLine, label: "Games This Week", value: summary.lastWeek },
						{ icon: RiBarChartLine, label: "Commanders Played", value: summary.uniqueCommanders },
					].map(({ icon: Icon, label, value }) => (
						<div
							key={label}
							className="rounded-lg border border-border bg-surface px-4 py-3 flex justify-between items-start gap-3"
						>
							<div>
								<div className="text-lg leadin-5 text-foreground/50">{label}</div>
								<div className="text-xl font-bold">{value}</div>
							</div>
							<Icon size={22} className="text-accent mt-1" />
						</div>
					))}
				</div>

				{/* Featured players */}
				{(leader || bestWinRate || mostActive) && (
					<div className="grid grid-cols-1 gap-4">
						{leader && (
							<Link
								href={`/player/${leader.player.id}`}
								className="rounded-lg border border-accent/30 bg-accent/5 p-4 hover:bg-accent/10 transition-colors"
							>
								<div className="flex items-center gap-2 mb-2">
									<RiTrophyLine size={16} className="text-accent" />
									<span className="text-xs text-accent uppercase tracking-wider font-semibold">
										League leader
									</span>
								</div>
								<p className="text-xl font-bold">{leader.player.name}</p>
								<p className="text-sm text-foreground/50 mt-0.5">
									{leader.totalPoints} pts · {leader.matches} matches
								</p>
								{leader.favoriteCommander && (
									<p className="text-xs text-foreground/30 mt-1 truncate">
										{leader.favoriteCommander.name}
									</p>
								)}
							</Link>
						)}
						{bestWinRate && (
							<Link
								href={`/player/${bestWinRate.player.id}`}
								className="rounded-lg border border-border bg-surface p-4 hover:border-accent/40 transition-colors"
							>
								<div className="flex items-center gap-2 mb-2">
									<RiFireLine size={16} className="text-orange-400" />
									<span className="text-xs text-foreground/50 uppercase tracking-wider font-semibold">
										Best win rate
									</span>
								</div>
								<p className="text-xl font-bold">{bestWinRate.player.name}</p>
								<p className="text-sm text-foreground/50 mt-0.5">
									{bestWinRate.winRate}% · {bestWinRate.wins}/{bestWinRate.matches} wins
								</p>
								{bestWinRate.favoriteCommander && (
									<p className="text-xs text-foreground/30 mt-1 truncate">
										{bestWinRate.favoriteCommander.name}
									</p>
								)}
							</Link>
						)}
						{mostActive && (
							<Link
								href={`/player/${mostActive.player.id}`}
								className="rounded-lg border border-border bg-surface p-4 hover:border-accent/40 transition-colors"
							>
								<div className="flex items-center gap-2 mb-2">
									<RiShieldLine size={16} className="text-accent" />
									<span className="text-xs text-foreground/50 uppercase tracking-wider font-semibold">
										Most active
									</span>
								</div>
								<p className="text-xl font-bold">{mostActive.player.name}</p>
								<p className="text-sm text-foreground/50 mt-0.5">
									{mostActive.matches} matches played
								</p>
								{mostActive.favoriteCommander && (
									<p className="text-xs text-foreground/30 mt-1 truncate">
										{mostActive.favoriteCommander.name}
									</p>
								)}
							</Link>
						)}
					</div>
				)}

				{/* Active leagues */}
				{leaguesWithCount.length > 0 && (
					<div>
						<h2 className="text-xl font-bold mb-4">Active leagues</h2>
						<div className="flex flex-col flex-wrap gap-4">
							{leaguesWithCount.map(({ league, count }) => (
								<div
									key={league.id}
									className={`flex items-center gap-2 rounded-lg border px-4 py-4 text-lg ${
										league.is_practice
											? "border-border text-foreground/40"
											: "border-accent/30 bg-accent/5 text-foreground/70"
									}`}
								>
									<span className="font-medium">{league.name}</span>
									<span className="text-foreground/40">
										{count} {count === 1 ? "match" : "matches"}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
