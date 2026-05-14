export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlayerWithStats } from "@/lib/data";
import { computeAchievements, toChronological } from "@/lib/achievements";
import { getPointsForPlacement } from "@/lib/types";
import PlayerActions from "./PlayerActions";
import {
	RiArrowLeftSLine,
	RiTrophyLine,
	RiSkullLine,
	RiFireLine,
	RiShieldLine,
	RiFlashlightLine,
	type RemixiconComponentType,
} from "@remixicon/react";

const ACHIEVEMENT_ICONS: Record<string, RemixiconComponentType> = {
	one_of_every_kind: RiTrophyLine,
	fallen_from_grace: RiSkullLine,
	the_underdog: RiFireLine,
	consistency_is_key: RiShieldLine,
	hot_streak: RiFlashlightLine,
};

const PLACEMENT_LABEL: Record<number, string> = {
	1: "1st",
	2: "2nd",
	3: "3rd",
	4: "4th",
	5: "5th",
};

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	let data;
	try {
		data = await getPlayerWithStats(id);
	} catch {
		notFound();
	}

	const { player, leagueStandings, overallStats, practiceStats, favoriteCommander, results } = data;
	const achievements = computeAchievements(toChronological(results));
	const unlocked = achievements.filter((a) => a.unlocked);
	const locked = achievements.filter((a) => !a.unlocked);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<div className="w-full flex justify-between">
					<Link
						href="/players"
						className="flex gap-1 items-center text-sm text-foreground/50 hover:text-accent transition-colors"
					>
						<RiArrowLeftSLine size={16} />
						<span>Players</span>
					</Link>
					<PlayerActions
						playerId={player.id}
						playerName={player.name}
						hasMatches={results.length > 0}
					/>
				</div>
				<div className="flex items-start justify-between mt-2">
					<div>
						<div className="flex gap-2">
							<h1 className="text-5xl font-bold">{player.name}</h1>
							{leagueStandings.length > 0 && (
								<div className="flex flex-wrap place-content-center">
									{leagueStandings.map((s) => (
										<span
											key={s.league.id}
											className="flex text-xl place-centent-center justify-self-center gap-2 text-foreground/20"
										>
											<span className="text-accent text-5xl font-bold">#{s.rank}</span>
											<span className="place-self-center">{s.league.name}</span>
										</span>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Overall competitive stats */}
			<div>
				<p className="text-xs text-foreground/40 uppercase tracking-wider mb-2">
					Overall standings
				</p>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					{[
						{ label: "Points", value: overallStats.totalPoints.toLocaleString() },
						{ label: "Matches", value: overallStats.matches },
						{ label: "Wins", value: overallStats.wins },
						{ label: "Win Rate", value: `${overallStats.winRate}%` },
					].map(({ label, value }) => (
						<div key={label} className="rounded-lg border border-border bg-surface p-4 text-center">
							<div className="text-2xl font-bold text-accent">{value}</div>
							<div className="text-xs text-foreground/50 mt-1">{label}</div>
						</div>
					))}
				</div>
			</div>

			{/* Per-league standings */}
			{leagueStandings.length > 0 && (
				<div>
					<p className="text-xs text-foreground/40 uppercase tracking-wider mb-2">By league</p>
					<div className="space-y-2">
						{leagueStandings.map((s) => (
							<div
								key={s.league.id}
								className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
							>
								<div>
									<p className="font-semibold text-sm">{s.league.name}</p>
									<p className="text-xs text-foreground/50">
										{s.matches} matches · {s.winRate}% win rate
									</p>
								</div>
								<div className="text-right">
									<p className="text-lg font-bold text-accent">#{s.rank}</p>
									<p className="text-xs text-foreground/50">{s.totalPoints} pts</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Favourite commander + practice stats */}
			{(favoriteCommander || practiceStats.matches > 0) && (
				<div className="grid grid-cols-2 gap-3">
					{favoriteCommander && (
						<div className="rounded-lg border border-border bg-surface p-4 text-center">
							<div className="text-sm font-bold text-accent truncate">{favoriteCommander.name}</div>
							<div className="text-xs text-foreground/50 mt-1">Favourite commander</div>
						</div>
					)}
					{practiceStats.matches > 0 && (
						<div className="rounded-lg border border-border bg-surface/50 p-4 text-center">
							<div className="text-sm font-bold text-foreground/60">
								{practiceStats.matches} games
							</div>
							<div className="text-xs text-foreground/40 mt-1">Practice played</div>
						</div>
					)}
				</div>
			)}

			{/* Achievements */}
			<section>
				<h2 className="text-xl font-bold mb-3">Achievements</h2>
				{achievements.length === 0 ? (
					<p className="text-foreground/40 text-sm">No matches yet.</p>
				) : (
					<div className="space-y-4">
						{unlocked.length > 0 && (
							<div>
								<p className="text-xs text-foreground/50 uppercase tracking-wider mb-2">Unlocked</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{unlocked.map((a) => {
										const Icon = ACHIEVEMENT_ICONS[a.id];
										return (
											<div
												key={a.id}
												className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 p-3"
											>
												{Icon && <Icon size={24} className="shrink-0 text-accent mt-0.5" />}
												<div>
													<p className="font-semibold text-sm">{a.name}</p>
													<p className="text-xs text-foreground/60">{a.description}</p>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
						{locked.length > 0 && (
							<div>
								<p className="text-xs text-foreground/50 uppercase tracking-wider mb-2">Locked</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{locked.map((a) => {
										const Icon = ACHIEVEMENT_ICONS[a.id];
										return (
											<div
												key={a.id}
												className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3 opacity-40"
											>
												{Icon && <Icon size={24} className="shrink-0 mt-0.5" />}
												<div>
													<p className="font-semibold text-sm">{a.name}</p>
													<p className="text-xs text-foreground/60">{a.description}</p>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>
				)}
			</section>

			{/* Match history */}
			<section>
				<h2 className="text-xl font-bold mb-3">Match History</h2>
				{results.length === 0 ? (
					<p className="text-foreground/40 text-sm">No matches played yet.</p>
				) : (
					<div className="rounded-lg border border-border overflow-hidden">
						<table className="w-full text-sm">
							<thead className="bg-surface text-foreground/60 uppercase text-xs tracking-wider">
								<tr>
									<th className="px-4 py-3 text-left">Date</th>
									<th className="px-4 py-3 text-center">Placement</th>
									<th className="px-4 py-3 text-left hidden sm:table-cell">Commander</th>
									<th className="px-4 py-3 text-right">Points</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{results.map((r) => (
									<tr
										key={r.id}
										className={`hover:bg-surface transition-colors ${r.matches.league.is_practice ? "opacity-60" : ""}`}
									>
										<td className="px-4 py-3 text-foreground/70">
											<div className="flex items-center gap-2">
												{new Date(r.matches.played_at).toLocaleDateString("sv-SE", {
													year: "numeric",
													month: "short",
													day: "numeric",
												})}
												<span className="text-xs px-1 py-0.5 rounded bg-foreground/10 text-foreground/40">
													{r.matches.league.name}
												</span>
											</div>
										</td>
										<td className="px-4 py-3 text-center">
											<span
												className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
													r.placement === 1
														? "bg-accent/20 text-accent"
														: r.wasLast
															? "bg-red-900/20 text-red-400"
															: "bg-surface text-foreground/70"
												}`}
											>
												{PLACEMENT_LABEL[r.placement]}
											</span>
										</td>
										<td className="px-4 py-3 text-foreground/40 text-xs hidden sm:table-cell">
											{r.commander?.name ?? <span className="text-foreground/20">—</span>}
										</td>
										<td className="px-4 py-3 text-right font-bold text-accent">
											{r.matches.league.is_practice ? (
												<span className="text-foreground/30 font-normal">—</span>
											) : (
												<>+{getPointsForPlacement(r.allPlacements, r.placement, r.playerCount)}</>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
}
