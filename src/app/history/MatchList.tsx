"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Commander, League, Player } from "@/lib/types";
import { getPointsForPlacement } from "@/lib/types";
import type { MatchWithResults } from "@/lib/data";

const PLACEMENT_LABEL: Record<number, string> = {
	1: "1st",
	2: "2nd",
	3: "3rd",
	4: "4th",
	5: "5th",
};

const PLAYER_COUNTS = [3, 4, 5] as const;
type PlayerCount = (typeof PLAYER_COUNTS)[number];

type Props = {
	matches: MatchWithResults[];
	players: Player[];
	commanders: Commander[];
	leagues: League[];
};

type EntryState = { playerId: string; placement: number; commanderId: string };

type EditState = {
	playedAt: string;
	playerCount: PlayerCount;
	entries: EntryState[];
	notes: string;
	leagueId: string;
};

export default function MatchList({
	matches,
	players,
	commanders: initialCommanders,
	leagues,
}: Props) {
	const router = useRouter();

	const [commanders, setCommanders] = useState<Commander[]>(initialCommanders);

	// Inline new commander (edit mode)
	const [showNewCommander, setShowNewCommander] = useState(false);
	const [newCommanderName, setNewCommanderName] = useState("");
	const [newCommanderLoading, setNewCommanderLoading] = useState(false);
	const [newCommanderError, setNewCommanderError] = useState("");

	const [adminAuthed, setAdminAuthed] = useState(false);
	const [showAdminModal, setShowAdminModal] = useState(false);
	const [adminPassword, setAdminPassword] = useState("");
	const [adminAuthError, setAdminAuthError] = useState("");
	const [adminAuthLoading, setAdminAuthLoading] = useState(false);

	const [masterAuthed, setMasterAuthed] = useState(false);
	const [showMasterModal, setShowMasterModal] = useState(false);
	const [masterPassword, setMasterPassword] = useState("");
	const [masterAuthError, setMasterAuthError] = useState("");
	const [masterAuthLoading, setMasterAuthLoading] = useState(false);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

	const [editingId, setEditingId] = useState<string | null>(null);
	const [editState, setEditState] = useState<EditState | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [actionError, setActionError] = useState("");

	async function handleAdminLogin(e: React.SyntheticEvent) {
		e.preventDefault();
		setAdminAuthLoading(true);
		setAdminAuthError("");
		const res = await fetch("/api/auth", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: adminPassword }),
		});
		setAdminAuthLoading(false);
		if (res.ok) {
			setAdminAuthed(true);
			setShowAdminModal(false);
			setAdminPassword("");
		} else setAdminAuthError("Wrong password.");
	}

	async function handleMasterLogin(e: React.SyntheticEvent) {
		e.preventDefault();
		setMasterAuthLoading(true);
		setMasterAuthError("");
		const res = await fetch("/api/master-auth", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: masterPassword }),
		});
		setMasterAuthLoading(false);
		if (res.ok) {
			setMasterAuthed(true);
			setShowMasterModal(false);
			setMasterPassword("");
			if (pendingDeleteId) {
				setConfirmDeleteId(pendingDeleteId);
				setPendingDeleteId(null);
			}
		} else {
			setMasterAuthError("Wrong password.");
		}
	}

	function requestDelete(matchId: string) {
		setActionError("");
		if (masterAuthed) setConfirmDeleteId(matchId);
		else {
			setPendingDeleteId(matchId);
			setShowMasterModal(true);
		}
	}

	function startEdit(match: MatchWithResults) {
		const playerCount = Math.max(3, Math.min(5, match.results.length)) as PlayerCount;
		const entries: EntryState[] = [...match.results]
			.sort((a, b) => a.placement - b.placement)
			.map((r) => ({
				playerId: r.player_id,
				placement: r.placement,
				commanderId: r.commander?.id ?? "",
			}));
		setEditState({
			playedAt: match.played_at,
			playerCount,
			entries,
			notes: match.notes ?? "",
			leagueId: match.league_id,
		});
		setEditingId(match.id);
		setActionError("");
	}

	function updateEntry(index: number, patch: Partial<EntryState>) {
		setEditState((prev) => {
			if (!prev) return prev;
			const next = [...prev.entries];
			next[index] = { ...next[index], ...patch };
			if (patch.playerId) {
				for (let i = 0; i < next.length; i++) {
					if (i !== index && next[i].playerId === patch.playerId)
						next[i] = { ...next[i], playerId: "" };
				}
			}
			return { ...prev, entries: next };
		});
	}

	function changeEditPlayerCount(count: PlayerCount) {
		setEditState((prev) =>
			prev
				? {
						...prev,
						playerCount: count,
						entries: Array.from({ length: count }, (_, i) => ({
							playerId: prev.entries[i]?.playerId ?? "",
							placement: i + 1,
							commanderId: prev.entries[i]?.commanderId ?? "",
						})),
					}
				: prev,
		);
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

	async function handleSave(matchId: string) {
		if (!editState) return;
		if (editState.entries.some((e) => !e.playerId)) {
			setActionError("Assign a player to every slot.");
			return;
		}
		if (!editState.entries.some((e) => e.placement === 1)) {
			setActionError("At least one player must be in 1st place.");
			return;
		}
		setSaving(true);
		setActionError("");
		const res = await fetch(`/api/matches/${matchId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				playedAt: editState.playedAt,
				entries: editState.entries.map((e) => ({
					playerId: e.playerId,
					placement: e.placement,
					commanderId: e.commanderId || null,
				})),
				notes: editState.notes,
				leagueId: editState.leagueId,
			}),
		});
		setSaving(false);
		if (res.ok) {
			setEditingId(null);
			setEditState(null);
			router.refresh();
		} else {
			const data = await res.json();
			setActionError(data.error ?? "Something went wrong.");
		}
	}

	async function handleDelete(matchId: string) {
		setDeleting(true);
		setActionError("");
		const res = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
		setDeleting(false);
		if (res.ok) {
			setConfirmDeleteId(null);
			router.refresh();
		} else {
			const data = await res.json();
			setActionError(data.error ?? "Something went wrong.");
		}
	}

	return (
		<div>
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold">Match History</h1>
				{!adminAuthed ? (
					<button
						onClick={() => setShowAdminModal(true)}
						className="rounded bg-background border px-4 py-2 text-sm font-semibold text-foreground/30 hover:text-foreground transition-colors cursor-pointer"
					>
						Manage matches
					</button>
				) : (
					<span className="text-xs text-accent border border-accent/30 rounded px-3 py-1.5">
						Edit mode
					</span>
				)}
			</div>

			{/* Admin auth modal */}
			{showAdminModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
					<div className="bg-surface border border-border rounded-lg p-6 w-full max-w-sm shadow-xl">
						<h2 className="text-lg font-bold mb-4">Admin Login</h2>
						<form onSubmit={handleAdminLogin} className="space-y-3">
							<input
								type="password"
								value={adminPassword}
								onChange={(e) => setAdminPassword(e.target.value)}
								placeholder="Admin password"
								autoFocus
								className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
							/>
							{adminAuthError && <p className="text-red-400 text-sm">{adminAuthError}</p>}
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => {
										setShowAdminModal(false);
										setAdminAuthError("");
									}}
									className="flex-1 rounded border border-border px-3 py-2 text-sm hover:bg-background transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={adminAuthLoading}
									className="flex-1 rounded bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
								>
									{adminAuthLoading ? "Checking…" : "Login"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Master auth modal */}
			{showMasterModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
					<div className="bg-surface border border-border rounded-lg p-6 w-full max-w-sm shadow-xl">
						<h2 className="text-lg font-bold mb-1">Master Password Required</h2>
						<p className="text-sm text-foreground/50 mb-4">
							Deleting a match requires the master password.
						</p>
						<form onSubmit={handleMasterLogin} className="space-y-3">
							<input
								type="password"
								value={masterPassword}
								onChange={(e) => setMasterPassword(e.target.value)}
								placeholder="Master password"
								autoFocus
								className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
							/>
							{masterAuthError && <p className="text-red-400 text-sm">{masterAuthError}</p>}
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => {
										setShowMasterModal(false);
										setPendingDeleteId(null);
										setMasterAuthError("");
									}}
									className="flex-1 rounded border border-border px-3 py-2 text-sm hover:bg-background transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={masterAuthLoading}
									className="flex-1 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
								>
									{masterAuthLoading ? "Checking…" : "Unlock"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Confirm delete modal */}
			{confirmDeleteId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
					<div className="bg-surface border border-border rounded-lg p-6 w-full max-w-sm shadow-xl">
						<h2 className="text-lg font-bold mb-2">Delete match?</h2>
						<p className="text-sm text-foreground/60 mb-4">
							This permanently removes the match and all its results.
						</p>
						{actionError && <p className="text-red-400 text-sm mb-2">{actionError}</p>}
						<div className="flex gap-2">
							<button
								onClick={() => {
									setConfirmDeleteId(null);
									setActionError("");
								}}
								className="flex-1 rounded border border-border px-3 py-2 text-sm hover:bg-background transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={() => handleDelete(confirmDeleteId)}
								disabled={deleting}
								className="flex-1 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
							>
								{deleting ? "Deleting…" : "Delete"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Match list — two-column layout */}
			{matches.length === 0 ? (
				<p className="text-foreground/40 text-sm">No matches recorded yet.</p>
			) : (
				(() => {
					// Split and group matches before rendering
					const matchNumber = new Map(matches.map((m, i) => [m.id, matches.length - i]));
					const compMatches = matches.filter((m) => !m.league.is_practice);
					const practiceMatches = matches.filter((m) => m.league.is_practice);

					const leagueOrder: string[] = [];
					const byLeague = new Map<string, typeof matches>();
					for (const m of compMatches) {
						if (!byLeague.has(m.league.id)) {
							leagueOrder.push(m.league.id);
							byLeague.set(m.league.id, []);
						}
						byLeague.get(m.league.id)!.push(m);
					}

					const renderCard = (match: (typeof matches)[0]) => {
						const playerCount = match.results.length;
						const allPlacements = match.results.map((r) => r.placement);
						return (
							<div key={match.id} className="rounded-lg border border-border bg-surface p-4">
								{editingId === match.id && editState ? (
									/* ── Edit form ── */
									<div className="space-y-4">
										<p className="text-sm font-semibold text-foreground/60">Editing match</p>

										<div className="grid grid-cols-2 gap-3">
											<div>
												<label className="block text-xs text-foreground/50 mb-1">Date</label>
												<input
													type="date"
													value={editState.playedAt}
													onChange={(e) =>
														setEditState((s) => (s ? { ...s, playedAt: e.target.value } : s))
													}
													className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
												/>
											</div>
											<div>
												<label className="block text-xs text-foreground/50 mb-1">League</label>
												<select
													value={editState.leagueId}
													onChange={(e) =>
														setEditState((s) => (s ? { ...s, leagueId: e.target.value } : s))
													}
													className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
												>
													{leagues.map((l) => (
														<option key={l.id} value={l.id}>
															{l.name}
														</option>
													))}
												</select>
											</div>
										</div>

										<div>
											<label className="block text-xs text-foreground/50 mb-1">
												Number of players
											</label>
											<div className="flex gap-2">
												{PLAYER_COUNTS.map((count) => (
													<button
														key={count}
														type="button"
														onClick={() => changeEditPlayerCount(count)}
														className={`rounded border px-3 py-1 text-xs font-semibold transition-colors ${
															editState.playerCount === count
																? "border-accent bg-accent/20 text-accent"
																: "border-border hover:bg-background"
														}`}
													>
														{count}p
													</button>
												))}
											</div>
										</div>

										{/* Player/placement rows */}
										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 flex-1">
													<span className="text-xs text-foreground/40">Player</span>
													<span className="text-xs text-foreground/40">Commander</span>
													<span className="text-xs text-foreground/40 w-24 text-center">
														Placement
													</span>
												</div>
												<button
													type="button"
													onClick={() => {
														setShowNewCommander((v) => !v);
														setNewCommanderError("");
													}}
													className="text-xs text-accent hover:underline ml-2 shrink-0"
												>
													{showNewCommander ? "Cancel" : "+ New commander"}
												</button>
											</div>

											{showNewCommander && (
												<div className="flex items-center gap-2 rounded border border-accent/30 bg-accent/5 p-2">
													<input
														type="text"
														value={newCommanderName}
														onChange={(e) => setNewCommanderName(e.target.value)}
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																e.preventDefault();
																handleAddCommander(e);
															}
														}}
														placeholder="Commander name"
														autoFocus
														className="flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
													/>
													<button
														type="button"
														onClick={handleAddCommander}
														disabled={newCommanderLoading || !newCommanderName.trim()}
														className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
													>
														{newCommanderLoading ? "Adding…" : "Add"}
													</button>
													{newCommanderError && (
														<p className="text-red-400 text-xs">{newCommanderError}</p>
													)}
												</div>
											)}

											{editState.entries.map((entry, i) => {
												const editAllPlacements = editState.entries.map((e) => e.placement);
												const placementCounts = new Map<number, number>();
												editAllPlacements.forEach((p) =>
													placementCounts.set(p, (placementCounts.get(p) ?? 0) + 1),
												);
												return (
													<div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
														<select
															value={entry.playerId}
															onChange={(e) => updateEntry(i, { playerId: e.target.value })}
															className="rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
														>
															<option value="">— player —</option>
															{players.map((p) => (
																<option
																	key={p.id}
																	value={p.id}
																	disabled={editState.entries.some(
																		(e, j) => j !== i && e.playerId === p.id,
																	)}
																>
																	{p.name}
																</option>
															))}
														</select>
														<select
															value={entry.commanderId}
															onChange={(e) => updateEntry(i, { commanderId: e.target.value })}
															className="rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent text-foreground/70"
														>
															<option value="">— none —</option>
															{commanders.map((c) => (
																<option key={c.id} value={c.id}>
																	{c.name}
																</option>
															))}
														</select>
														<div className="flex gap-1 w-24">
															{Array.from({ length: editState.playerCount }, (_, k) => k + 1).map(
																(p) => {
																	const sel = entry.placement === p;
																	const tied = sel && (placementCounts.get(p) ?? 0) > 1;
																	return (
																		<button
																			key={p}
																			type="button"
																			onClick={() => updateEntry(i, { placement: p })}
																			className={`flex-1 rounded text-xs font-semibold py-1.5 transition-colors ${
																				sel
																					? tied
																						? "bg-yellow-500/20 border border-yellow-500/50 text-yellow-400"
																						: "bg-accent/20 border border-accent/50 text-accent"
																					: "border border-border hover:bg-surface text-foreground/50"
																			}`}
																		>
																			{p}
																		</button>
																	);
																},
															)}
														</div>
													</div>
												);
											})}
										</div>

										<div>
											<label className="block text-xs text-foreground/50 mb-1">Notes</label>
											<textarea
												value={editState.notes}
												onChange={(e) =>
													setEditState((s) => (s ? { ...s, notes: e.target.value } : s))
												}
												rows={2}
												className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
											/>
										</div>

										{actionError && <p className="text-red-400 text-sm">{actionError}</p>}
										<div className="flex gap-2">
											<button
												onClick={() => {
													setEditingId(null);
													setEditState(null);
													setActionError("");
												}}
												className="flex-1 rounded border border-border px-3 py-1.5 text-sm hover:bg-background transition-colors"
											>
												Cancel
											</button>
											<button
												onClick={() => handleSave(match.id)}
												disabled={saving}
												className="flex-1 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
											>
												{saving ? "Saving…" : "Save"}
											</button>
										</div>
									</div>
								) : (
									/* ── View mode ── */
									<>
										<div className="flex items-center justify-between mb-3">
											<Link
												href={`/match/${match.id}`}
												className="group flex gap-2 items-center text-sm transition-colors"
											>
												<span className="text-foreground/70 group-hover:text-accent transition-colors">
													{new Date(match.played_at).toLocaleDateString("sv-SE", {
														year: "numeric",
														month: "long",
														day: "numeric",
													})}
												</span>
												<span className="text-foreground/50 group-hover:text-accent transition-colors">
													{playerCount}p
												</span>
											</Link>
											<div className="flex items-center gap-2">
												<span className="text-xs text-foreground/40">
													#{matchNumber.get(match.id)}
												</span>
												{adminAuthed && (
													<>
														<button
															onClick={() => startEdit(match)}
															className="text-xs text-foreground/50 hover:text-accent transition-colors px-2 py-0.5 rounded border border-border hover:border-accent"
														>
															Edit
														</button>
														<button
															onClick={() => requestDelete(match.id)}
															className="text-xs text-foreground/50 hover:text-red-400 transition-colors px-2 py-0.5 rounded border border-border hover:border-red-400"
														>
															Delete
														</button>
													</>
												)}
											</div>
										</div>

										<div
											className="grid gap-2"
											style={{ gridTemplateColumns: `repeat(${playerCount}, minmax(0, 1fr))` }}
										>
											{match.results.map((r) => {
												const pts = getPointsForPlacement(allPlacements, r.placement, playerCount);
												const tied = allPlacements.filter((p) => p === r.placement).length > 1;
												return (
													<div
														key={r.id}
														className={`rounded p-2 text-center text-sm ${r.placement === 1 ? "bg-accent/20 border border-accent/40" : "bg-background/60"}`}
													>
														<div className="text-xs text-foreground/50 mb-0.5">
															{PLACEMENT_LABEL[r.placement]}
															{tied && <span className="ml-0.5 text-yellow-400">T</span>}
														</div>
														<Link
															href={`/player/${r.player.id}`}
															className="font-semibold hover:text-accent transition-colors text-xs sm:text-sm"
														>
															{r.player.name}
														</Link>
														{r.commander && (
															<div className="text-xs text-foreground/40 mt-0.5 truncate">
																{r.commander.name}
															</div>
														)}
														{!match.league.is_practice && (
															<div className="text-xs text-accent mt-0.5">+{pts}</div>
														)}
													</div>
												);
											})}
										</div>

										{match.notes && (
											<p className="mt-4 text-sm text-foreground/50 italic border-t border-border pt-2">
												{match.notes}
											</p>
										)}
									</>
								)}
							</div>
						);
					};

					return (
						<div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-x-8 gap-y-6 items-start">
							{/* Left: competitive leagues */}
							<div className="space-y-6">
								{leagueOrder.length === 0 ? (
									<p className="text-foreground/40 text-sm">No league matches yet.</p>
								) : (
									leagueOrder.map((lid) => {
										const leagueMatches = byLeague.get(lid)!;
										const league = leagueMatches[0].league;
										return (
											<div key={lid}>
												<div className="flex items-center gap-3 mb-3">
													<h3 className="text-lg font-semibold text-foreground/60 whitespace-nowrap">
														{league.name}
													</h3>
													<div className="flex-1 border-t border-border" />
												</div>
												<div className="space-y-3">{leagueMatches.map(renderCard)}</div>
											</div>
										);
									})
								)}
							</div>

							{/* Right: practice games */}
							<div>
								<div className="flex items-center gap-3 mb-3">
									<h3 className="text-lg font-semibold text-foreground/60 whitespace-nowrap">
										Practice Games
									</h3>
									<div className="flex-1 border-t border-border" />
								</div>
								{practiceMatches.length === 0 ? (
									<p className="text-foreground/40 text-xs">No practice games yet.</p>
								) : (
									<div className="space-y-3">{practiceMatches.map(renderCard)}</div>
								)}
							</div>
						</div>
					);
				})()
			)}
		</div>
	);
}
