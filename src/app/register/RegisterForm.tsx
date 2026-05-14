"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Commander, League, Player } from "@/lib/types";
import { getPointsForPlacement } from "@/lib/types";
import { RiCheckboxCircleLine } from "@remixicon/react";
import CommanderSearch from "@/components/CommanderSearch";

const PLACEMENT_LABEL: Record<number, string> = {
	1: "1st",
	2: "2nd",
	3: "3rd",
	4: "4th",
	5: "5th",
};
const PLAYER_COUNTS = [3, 4, 5] as const;
type PlayerCount = (typeof PLAYER_COUNTS)[number];

type Entry = { playerId: string; placement: number; commanderId: string };

function makeDefaultEntries(count: number): Entry[] {
	return Array.from({ length: count }, (_, i) => ({
		playerId: "",
		placement: i + 1,
		commanderId: "",
	}));
}

interface Props {
	players: Player[];
	commanders: Commander[];
	leagues: League[];
	playerCommanderUsage: Record<string, string[]>;
}

export default function RegisterForm({
	players: initialPlayers,
	commanders: initialCommanders,
	leagues: initialLeagues,
	playerCommanderUsage,
}: Props) {
	const router = useRouter();
	const [authed, setAuthed] = useState(false);
	const [password, setPassword] = useState("");
	const [authError, setAuthError] = useState("");
	const [authLoading, setAuthLoading] = useState(false);

	const [players, setPlayers] = useState<Player[]>(initialPlayers);
	const [commanders, setCommanders] = useState<Commander[]>(initialCommanders);
	const [leagues, setLeagues] = useState<League[]>(initialLeagues);

	const today = new Date().toISOString().split("T")[0];
	const [playedAt, setPlayedAt] = useState(today);
	const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
	const [entries, setEntries] = useState<Entry[]>(makeDefaultEntries(4));
	const [leagueId, setLeagueId] = useState(initialLeagues[0]?.id ?? "");
	const [notes, setNotes] = useState("");
	const [submitError, setSubmitError] = useState("");
	const [submitLoading, setSubmitLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	// Inline new player
	const [showNewPlayer, setShowNewPlayer] = useState(false);
	const [newPlayerName, setNewPlayerName] = useState("");
	const [newPlayerLoading, setNewPlayerLoading] = useState(false);
	const [newPlayerError, setNewPlayerError] = useState("");

	// Inline new commander
	const [showNewCommander, setShowNewCommander] = useState(false);
	const [newCommanderName, setNewCommanderName] = useState("");
	const [newCommanderLoading, setNewCommanderLoading] = useState(false);
	const [newCommanderError, setNewCommanderError] = useState("");

	// Inline new league
	const [showNewLeague, setShowNewLeague] = useState(false);
	const [newLeagueName, setNewLeagueName] = useState("");
	const [newLeagueIsPractice, setNewLeagueIsPractice] = useState(false);
	const [newLeagueLoading, setNewLeagueLoading] = useState(false);
	const [newLeagueError, setNewLeagueError] = useState("");

	function changePlayerCount(count: PlayerCount) {
		setPlayerCount(count);
		setEntries(makeDefaultEntries(count));
	}

	function updateEntry(index: number, patch: Partial<Entry>) {
		setEntries((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], ...patch };
			if (patch.playerId !== undefined) {
				// Clear duplicate player from other rows
				for (let i = 0; i < next.length; i++) {
					if (i !== index && next[i].playerId === patch.playerId)
						next[i] = { ...next[i], playerId: "" };
				}
				// Auto-fill most-used commander if slot is currently empty
				if (patch.playerId && !prev[index].commanderId) {
					const topId = playerCommanderUsage[patch.playerId]?.[0];
					if (topId) next[index] = { ...next[index], commanderId: topId };
				}
			}
			return next;
		});
	}

	function calcPoints(entry: Entry): number {
		return getPointsForPlacement(
			entries.map((e) => e.placement),
			entry.placement,
			playerCount,
		);
	}

	async function handleLogin(e: React.SyntheticEvent) {
		e.preventDefault();
		setAuthLoading(true);
		setAuthError("");
		const res = await fetch("/api/auth", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password }),
		});
		setAuthLoading(false);
		if (res.ok) setAuthed(true);
		else setAuthError("Wrong password.");
	}

	async function handleAddPlayer(e: React.SyntheticEvent) {
		e.preventDefault();
		if (!newPlayerName.trim()) return;
		setNewPlayerLoading(true);
		setNewPlayerError("");
		const res = await fetch("/api/players", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: newPlayerName.trim() }),
		});
		setNewPlayerLoading(false);
		if (res.ok) {
			const refreshed = await fetch("/api/players");
			if (refreshed.ok) {
				const { players: updated } = await refreshed.json();
				setPlayers(updated);
			}
			setNewPlayerName("");
			setShowNewPlayer(false);
		} else {
			const data = await res.json();
			setNewPlayerError(data.error ?? "Something went wrong.");
		}
	}

	async function handleAddCommander(e: React.SyntheticEvent) {
		e.preventDefault();
		if (!newCommanderName.trim()) return;
		setNewCommanderLoading(true);
		setNewCommanderError("");
		const res = await fetch("/api/commanders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: newCommanderName.trim() }),
		});
		setNewCommanderLoading(false);
		if (res.ok) {
			const refreshed = await fetch("/api/commanders");
			if (refreshed.ok) {
				const { commanders: updated } = await refreshed.json();
				setCommanders(updated);
			}
			setNewCommanderName("");
			setShowNewCommander(false);
		} else {
			const data = await res.json();
			setNewCommanderError(data.error ?? "Something went wrong.");
		}
	}

	async function handleAddLeague(e: React.SyntheticEvent) {
		e.preventDefault();
		if (!newLeagueName.trim()) return;
		setNewLeagueLoading(true);
		setNewLeagueError("");
		const res = await fetch("/api/leagues", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: newLeagueName.trim(), is_practice: newLeagueIsPractice }),
		});
		setNewLeagueLoading(false);
		if (res.ok) {
			const refreshed = await fetch("/api/leagues");
			if (refreshed.ok) {
				const { leagues: updated } = await refreshed.json();
				setLeagues(updated);
				// Auto-select the newly created league
				const newLeague = (updated as League[]).find(
					(l: League) => l.name === newLeagueName.trim(),
				);
				if (newLeague) setLeagueId(newLeague.id);
			}
			setNewLeagueName("");
			setNewLeagueIsPractice(false);
			setShowNewLeague(false);
		} else {
			const data = await res.json();
			setNewLeagueError(data.error ?? "Something went wrong.");
		}
	}

	async function handleSubmit(e: React.SyntheticEvent) {
		e.preventDefault();
		setSubmitError("");
		if (!leagueId) {
			setSubmitError("Select a league.");
			return;
		}
		if (entries.some((e) => !e.playerId)) {
			setSubmitError("Select a player for every slot.");
			return;
		}
		if (!entries.some((e) => e.placement === 1)) {
			setSubmitError("At least one player must be in 1st place.");
			return;
		}
		setSubmitLoading(true);
		const res = await fetch("/api/matches", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				playedAt,
				entries: entries.map((e) => ({
					playerId: e.playerId,
					placement: e.placement,
					commanderId: e.commanderId || null,
				})),
				notes,
				leagueId,
			}),
		});
		setSubmitLoading(false);
		if (res.ok) {
			setSuccess(true);
			router.refresh();
		} else {
			const data = await res.json();
			setSubmitError(data.error ?? "Something went wrong.");
		}
	}

	function reset() {
		setSuccess(false);
		setEntries(makeDefaultEntries(4));
		setPlayedAt(today);
		setPlayerCount(4);
		setLeagueId(leagues[0]?.id ?? "");
		setNotes("");
	}

	if (!authed) {
		return (
			<div className="max-w-sm mx-auto mt-16">
				<h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
				<form onSubmit={handleLogin} className="space-y-4">
					<div>
						<label className="block text-sm text-foreground/70 mb-1">Password</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoFocus
							className="w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
						/>
					</div>
					{authError && <p className="text-red-400 text-sm">{authError}</p>}
					<button
						type="submit"
						disabled={authLoading}
						className="w-full rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
					>
						{authLoading ? "Checking…" : "Login"}
					</button>
				</form>
			</div>
		);
	}

	if (success) {
		return (
			<div className="max-w-sm mx-auto mt-16 text-center space-y-4">
				<RiCheckboxCircleLine size={40} className="mx-auto text-accent" />
				<p className="text-lg font-semibold">Match registered!</p>
				<div className="flex gap-3 justify-center">
					<button
						onClick={reset}
						className="rounded border border-border px-4 py-2 text-sm hover:bg-surface transition-colors"
					>
						Register another
					</button>
					<Link
						href="/"
						className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
					>
						View leaderboard
					</Link>
				</div>
			</div>
		);
	}

	const selectedLeague = leagues.find((l) => l.id === leagueId);

	return (
		<div className="max-w-lg mx-auto">
			<h1 className="text-2xl font-bold mb-6">Register Match</h1>
			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Date */}
				<div>
					<label className="block text-sm text-foreground/70 mb-1">Date played</label>
					<input
						type="date"
						value={playedAt}
						onChange={(e) => setPlayedAt(e.target.value)}
						required
						className="rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
					/>
				</div>

				{/* League */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<label className="text-sm text-foreground/70">League</label>
						<button
							type="button"
							onClick={() => {
								setShowNewLeague((v) => !v);
								setNewLeagueError("");
							}}
							className="text-xs text-accent hover:underline"
						>
							{showNewLeague ? "Cancel" : "+ New league"}
						</button>
					</div>

					{showNewLeague && (
						<div className="mb-3 rounded border border-accent/30 bg-accent/5 p-3 space-y-2">
							<input
								type="text"
								value={newLeagueName}
								onChange={(e) => setNewLeagueName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleAddLeague(e);
									}
								}}
								placeholder="League name (e.g. Summer 2026)"
								autoFocus
								className="w-full rounded border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
							/>
							<label className="flex items-center gap-2 text-xs text-foreground/60 cursor-pointer">
								<input
									type="checkbox"
									checked={newLeagueIsPractice}
									onChange={(e) => setNewLeagueIsPractice(e.target.checked)}
									className="rounded"
								/>
								Practice league (doesn&apos;t count toward standings)
							</label>
							<div className="flex gap-2">
								{newLeagueError && <p className="text-red-400 text-xs flex-1">{newLeagueError}</p>}
								<button
									type="button"
									onClick={handleAddLeague}
									disabled={newLeagueLoading || !newLeagueName.trim()}
									className="ml-auto rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
								>
									{newLeagueLoading ? "Creating…" : "Create league"}
								</button>
							</div>
						</div>
					)}

					<div className="flex gap-2 flex-wrap">
						{leagues.map((l) => (
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
								{l.is_practice && (
									<span className="ml-1.5 text-xs text-foreground/40">(Practice)</span>
								)}
							</button>
						))}
					</div>
					{selectedLeague?.is_practice && (
						<p className="text-xs text-foreground/40 mt-1.5">
							Practice games do not count toward league standings.
						</p>
					)}
				</div>

				{/* Player count */}
				<div>
					<label className="block text-sm text-foreground/70 mb-2">Number of players</label>
					<div className="flex gap-2">
						{PLAYER_COUNTS.map((count) => (
							<button
								key={count}
								type="button"
								onClick={() => changePlayerCount(count)}
								className={`flex-1 rounded border px-3 py-2 text-sm font-semibold transition-colors ${
									playerCount === count
										? "border-accent bg-accent/20 text-accent"
										: "border-border hover:bg-surface"
								}`}
							>
								{count} players
							</button>
						))}
					</div>
				</div>

				{/* Players */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<label className="text-sm text-foreground/70">Players &amp; results</label>
						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => {
									setShowNewCommander((v) => !v);
									setNewCommanderError("");
								}}
								className="text-xs text-accent hover:underline"
							>
								{showNewCommander ? "Cancel" : "+ New commander"}
							</button>
							<button
								type="button"
								onClick={() => {
									setShowNewPlayer((v) => !v);
									setNewPlayerError("");
								}}
								className="text-xs text-accent hover:underline"
							>
								{showNewPlayer ? "Cancel" : "+ New player"}
							</button>
						</div>
					</div>

					{showNewCommander && (
						<div className="flex items-center gap-2 rounded border border-accent/30 bg-accent/5 p-3">
							<CommanderSearch
								value={newCommanderName}
								onChange={setNewCommanderName}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleAddCommander(e);
									}
								}}
								autoFocus
								className="flex-1"
							/>
							<button
								type="button"
								onClick={handleAddCommander}
								disabled={newCommanderLoading || !newCommanderName.trim()}
								className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
							>
								{newCommanderLoading ? "Adding…" : "Add"}
							</button>
							{newCommanderError && <p className="text-red-400 text-xs">{newCommanderError}</p>}
						</div>
					)}

					{showNewPlayer && (
						<div className="flex items-center gap-2 rounded border border-accent/30 bg-accent/5 p-3">
							<input
								type="text"
								value={newPlayerName}
								onChange={(e) => setNewPlayerName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleAddPlayer(e);
									}
								}}
								placeholder="Player name"
								autoFocus
								className="flex-1 rounded border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
							/>
							<button
								type="button"
								onClick={handleAddPlayer}
								disabled={newPlayerLoading || !newPlayerName.trim()}
								className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
							>
								{newPlayerLoading ? "Adding…" : "Add"}
							</button>
							{newPlayerError && <p className="text-red-400 text-xs">{newPlayerError}</p>}
						</div>
					)}

					{/* Column headers */}
					<div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
						<span className="text-xs text-foreground/40">Player</span>
						<span className="text-xs text-foreground/40">Commander</span>
						<span className="text-xs text-foreground/40 w-32 text-center">Placement</span>
					</div>

					{entries.map((entry, i) => {
						const pts = entry.playerId ? calcPoints(entry) : null;
						const placementCounts = new Map<number, number>();
						entries.forEach((e) =>
							placementCounts.set(e.placement, (placementCounts.get(e.placement) ?? 0) + 1),
						);
						return (
							<div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
								<select
									value={entry.playerId}
									onChange={(e) => updateEntry(i, { playerId: e.target.value })}
									className="rounded border border-border bg-surface px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
								>
									<option value="">— player —</option>
									{players.map((p) => (
										<option
											key={p.id}
											value={p.id}
											disabled={entries.some((e, j) => j !== i && e.playerId === p.id)}
										>
											{p.name}
										</option>
									))}
								</select>
								{(() => {
									const usedIds = entry.playerId
										? (playerCommanderUsage[entry.playerId] ?? [])
										: [];
									const frequent = commanders
										.filter((c) => usedIds.includes(c.id))
										.sort((a, b) => usedIds.indexOf(a.id) - usedIds.indexOf(b.id));
									const rest = commanders.filter((c) => !usedIds.includes(c.id));
									return (
										<select
											value={entry.commanderId}
											onChange={(e) => updateEntry(i, { commanderId: e.target.value })}
											className="rounded border border-border bg-surface px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent text-foreground/70"
										>
											<option value="">— none —</option>
											{frequent.length > 0 && (
												<optgroup label="Previously played">
													{frequent.map((c) => (
														<option key={c.id} value={c.id}>
															{c.name}
														</option>
													))}
												</optgroup>
											)}
											{rest.length > 0 && (
												<optgroup label={frequent.length > 0 ? "All commanders" : undefined}>
													{rest.map((c) => (
														<option key={c.id} value={c.id}>
															{c.name}
														</option>
													))}
												</optgroup>
											)}
										</select>
									);
								})()}
								<div className="flex gap-1 w-32">
									{Array.from({ length: playerCount }, (_, k) => k + 1).map((p) => {
										const selected = entry.placement === p;
										const tied = selected && (placementCounts.get(p) ?? 0) > 1;
										return (
											<button
												key={p}
												type="button"
												onClick={() => updateEntry(i, { placement: p })}
												title={selected && pts !== null ? `+${pts} pts` : PLACEMENT_LABEL[p]}
												className={`flex-1 rounded text-xs font-semibold py-2 transition-colors ${
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

					{/* Points preview */}
					<div className="flex flex-wrap gap-2 pt-1">
						{entries.map((entry, i) => {
							if (!entry.playerId || selectedLeague?.is_practice) return null;
							const player = players.find((p) => p.id === entry.playerId);
							const pts = calcPoints(entry);
							return (
								<span key={i} className="text-xs text-foreground/50">
									{player?.name ?? "?"}: <span className="text-accent">+{pts}</span>
								</span>
							);
						})}
					</div>
				</div>

				{/* Notes */}
				<div>
					<label className="block text-sm text-foreground/70 mb-1">
						Notes <span className="text-foreground/40">(optional)</span>
					</label>
					<textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Decks, location, vibe…"
						rows={3}
						className="w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
					/>
				</div>

				{submitError && <p className="text-red-400 text-sm">{submitError}</p>}

				<button
					type="submit"
					disabled={submitLoading}
					className="w-full rounded bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
				>
					{submitLoading ? "Saving…" : "Submit Match"}
				</button>
			</form>
		</div>
	);
}
