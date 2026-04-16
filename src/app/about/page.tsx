import { POINTS_TABLE } from "@/lib/types";
import {
	RiTrophyLine,
	RiSkullLine,
	RiFireLine,
	RiShieldLine,
	RiFlashlightLine,
	type RemixiconComponentType,
	RiCircleFill,
} from "@remixicon/react";

const achievements: { icon: RemixiconComponentType; name: string; description: string }[] = [
	{
		icon: RiTrophyLine,
		name: "One of Every Kind",
		description: "Has won, come 2nd, come 3rd, and finished last at least once.",
	},
	{
		icon: RiSkullLine,
		name: "Fallen from Grace",
		description: "Won 2+ matches in a row, then finished last in the next.",
	},
	{
		icon: RiFireLine,
		name: "The Underdog",
		description: "Won a match after finishing last 3+ times in a row.",
	},
	{
		icon: RiShieldLine,
		name: "Consistency is Key",
		description: "Did not finish last in 5 consecutive matches.",
	},
	{ icon: RiFlashlightLine, name: "Hot Streak", description: "Won 3 matches in a row." },
];

const placements = ["1st", "2nd", "3rd", "4th", "5th"];

export default function AboutPage() {
	return (
		<div className="max-w-2xl m-auto space-y-10">
			<div>
				<h1 className="text-3xl font-bold mb-2">About Ligan</h1>
				<p className="text-foreground/60 leading-7">
					Ligan is a highly competative, private Commander league. Ever since we started playing
					Commander, a few weeks ago, we have dreamt about setting up a league where we can track
					our wins, losses, and glor, and that day is finally here. Ligan is a verry exclusive tier
					of gamers so to join youll have to talk to one of our founders or current players.
				</p>
			</div>
			{/* Point system */}
			<section>
				<h2 className="text-xl font-bold mb-4">Point System</h2>
				<p className="text-foreground/60 mb-4">
					Points scale with the number of players at the table. More players = higher stakes = more
					points.
				</p>
				<div className="rounded-lg border border-border overflow-hidden">
					<table className="w-full text-sm">
						<thead className="bg-surface text-foreground/60 uppercase text-xs tracking-wider">
							<tr>
								<th className="px-4 py-3 text-left">Placement</th>
								<th className="px-4 py-3 text-right">3 P</th>
								<th className="px-4 py-3 text-right">4 P</th>
								<th className="px-4 py-3 text-right">5 P</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{placements.map((label, i) => {
								const p3 = POINTS_TABLE[3][i];
								const p4 = POINTS_TABLE[4][i];
								const p5 = POINTS_TABLE[5][i];
								if (p3 === undefined && p4 === undefined && p5 === undefined) return null;
								return (
									<tr
										key={label}
										className={i === 0 ? "bg-accent/5" : "hover:bg-surface transition-colors"}
									>
										<td className="px-4 py-3 font-semibold">{label}</td>
										<td className="px-4 py-3 text-right text-foreground/70">
											{p3 !== undefined ? `${p3} pts` : "—"}
										</td>
										<td className="px-4 py-3 text-right text-foreground/70">
											{p4 !== undefined ? `${p4} pts` : "—"}
										</td>
										<td className="px-4 py-3 text-right font-semibold text-accent">
											{p5 !== undefined ? `${p5} pts` : "—"}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<p className="text-sm text-foreground/40 mt-2">
					Multipliers: 3 players = 0.8×, 4 players = 1.0× (base), 5 players = 1.2×
				</p>
			</section>

			{/* Rules */}
			<section>
				<h2 className="text-xl font-bold mb-4">Rules</h2>
				<ul className="space-y-4 text-foreground/70">
					<li className="flex gap-4 items-center">
						<RiCircleFill className="text-accent shrink-0" size={8} />
						Snacks are required.
					</li>
					<li className="flex gap-4 items-center">
						<RiCircleFill className="text-accent shrink-0" size={8} />
						Bring your personal deck, dice, tokens and playmat.
					</li>
					<li className="flex gap-4 items-center">
						<RiCircleFill className="text-accent shrink-0" size={8} />
						You can register matches between 3-5 players but 4 are prefered.
					</li>
					<li className="flex gap-4 items-center">
						<RiCircleFill className="text-accent shrink-0" size={8} />
						Players with more points rank higher but win rate gives you bragging rights and glory.
					</li>
				</ul>
			</section>

			{/* Achievements */}
			<section>
				<h2 className="text-xl font-bold mb-4">Achievements</h2>
				<p className="text-foreground/60 mb-4">
					Achievements are calculated dynamically from match history. They appear on each
					player&apos;s profile page.
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{achievements.map((a) => (
						<div
							key={a.name}
							className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
						>
							<a.icon size={24} className="shrink-0 text-accent mt-0.5" />
							<div>
								<p className="font-semibold">{a.name}</p>
								<p className="text-sm text-foreground/60 mt-0.5">{a.description}</p>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
