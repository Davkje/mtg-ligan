import { notFound } from "next/navigation";
import Link from "next/link";
import { getMatchById } from "@/lib/data";
import { getPoints } from "@/lib/types";
import { RiArrowLeftSLine, RiStackFill, RiStarFill } from "@remixicon/react";
import { div } from "framer-motion/client";

const PLACEMENT_LABEL: Record<number, string> = {
	1: "1st",
	2: "2nd",
	3: "3rd",
	4: "4th",
	5: "5th",
};

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const match = await getMatchById(id);
	if (!match) notFound();

	const playerCount = match.results.length;

	return (
		<div className="max-w-xl space-y-8">
			{/* Header */}
			<div>
				<Link
					href="/"
					className="flex gap-1 items-center text-sm text-foreground/50 hover:text-accent transition-colors"
				>
					<RiArrowLeftSLine size={16} />
					<span>Match History</span>
				</Link>
				<h1 className="text-3xl font-bold mt-2">
					{new Date(match.played_at).toLocaleDateString("sv-SE", {
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</h1>
				<p className="text-sm text-foreground/40 mt-1">{playerCount}-player game</p>
			</div>

			{/* Results */}
			<section>
				<h2 className="text-lg font-bold mb-3">Results</h2>
				<div className="rounded-lg border border-border overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-surface text-foreground/60 uppercase text-xs tracking-wider">
							<tr>
								<th className="px-4 py-3 text-left">Placement</th>
								<th className="px-4 py-3 text-left">Player</th>
								<th className="px-4 py-3 text-right">Points earned</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{match.results.map((r) => (
								<tr
									key={r.id}
									className={
										r.placement === 1 ? "bg-accent/10" : "hover:bg-surface transition-colors"
									}
								>
									<td className="px-4 py-3">
										<span
											className={`inline-block rounded px-2 py-2 text-xs font-semibold ${
												r.placement === 1
													? "bg-accent/20 text-accent"
													: "bg-surface text-foreground/70"
											}`}
										>
											{r.placement === 1 ? <RiStarFill className="pb-1" size={16} /> : ""}
											{PLACEMENT_LABEL[r.placement]}
										</span>
									</td>
									<td className="px-4 py-3 font-semibold">
										<Link
											href={`/player/${r.player.id}`}
											className="hover:text-accent transition-colors"
										>
											{r.player.name}
										</Link>
									</td>
									<td className="px-4 py-3 text-right font-bold text-accent">
										+{getPoints(playerCount, r.placement)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* Notes */}
			{match.notes && (
				<section>
					<h2 className="text-lg font-bold mb-2">Notes</h2>
					<div className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground/70 whitespace-pre-wrap">
						{match.notes}
					</div>
				</section>
			)}
		</div>
	);
}
