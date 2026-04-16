"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Player } from "@/lib/types";
import { getPoints, POINTS_TABLE } from "@/lib/types";
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

type Props = { matches: MatchWithResults[]; players: Player[] };

type EditState = {
	playedAt: string;
	playerCount: PlayerCount;
	assignments: Record<number, string>;
	notes: string;
};

export default function MatchList({ matches, players }: Props) {
	const router = useRouter();

	// Admin auth (create + edit)
	const [adminAuthed, setAdminAuthed] = useState(false);
	const [showAdminModal, setShowAdminModal] = useState(false);
	const [adminPassword, setAdminPassword] = useState("");
	const [adminAuthError, setAdminAuthError] = useState("");
	const [adminAuthLoading, setAdminAuthLoading] = useState(false);

	// Master auth (delete only)
	const [masterAuthed, setMasterAuthed] = useState(false);
	const [showMasterModal, setShowMasterModal] = useState(false);
	const [masterPassword, setMasterPassword] = useState("");
	const [masterAuthError, setMasterAuthError] = useState("");
	const [masterAuthLoading, setMasterAuthLoading] = useState(false);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

	// Edit / delete state
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editState, setEditState] = useState<EditState | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [actionError, setActionError] = useState("");

	// ── Auth handlers ──

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
		} else {
			setAdminAuthError("Wrong password.");
		}
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
			// Proceed to confirm delete if we were waiting
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
		if (masterAuthed) {
			setConfirmDeleteId(matchId);
		} else {
			setPendingDeleteId(matchId);
			setShowMasterModal(true);
		}
	}

	// ── Edit handlers ──

	function startEdit(match: MatchWithResults) {
		const playerCount = Math.max(3, Math.min(5, match.results.length)) as PlayerCount;
		const assignments: Record<number, string> = { 1: "", 2: "", 3: "", 4: "", 5: "" };
		for (const r of match.results) assignments[r.placement] = r.player_id;
		setEditState({ playedAt: match.played_at, playerCount, assignments, notes: match.notes ?? "" });
		setEditingId(match.id);
		setActionError("");
	}

	function changeEditPlayerCount(count: PlayerCount) {
		setEditState((prev) =>
			prev
				? { ...prev, playerCount: count, assignments: { 1: "", 2: "", 3: "", 4: "", 5: "" } }
				: prev,
		);
	}

	function assignPlayer(placement: number, playerId: string) {
		setEditState((prev) => {
			if (!prev) return prev;
			const next = { ...prev, assignments: { ...prev.assignments } };
			const ps = Array.from({ length: prev.playerCount }, (_, i) => i + 1);
			for (const p of ps) {
				if (next.assignments[p] === playerId && p !== placement) next.assignments[p] = "";
			}
			next.assignments[placement] = playerId;
			return next;
		});
	}

	async function handleSave(matchId: string) {
		if (!editState) return;
		const ps = Array.from({ length: editState.playerCount }, (_, i) => i + 1);
		const entries = ps.map((p) => ({ playerId: editState.assignments[p], placement: p }));
		if (entries.some((e) => !e.playerId)) {
			setActionError("Assign a player to every placement.");
			return;
		}
		setSaving(true);
		setActionError("");
		const res = await fetch(`/api/matches/${matchId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ playedAt: editState.playedAt, entries, notes: editState.notes }),
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
						className="text-xs bg-background text-foreground/50 hover:text-accent border border-border rounded px-3 py-1.5 transition-colors"
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
								className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
								autoFocus
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

			{/* Master auth modal (delete only) */}
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
								className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
								autoFocus
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

			{/* Match list */}
			{matches.length === 0 ? (
				<p className="text-foreground/40 text-sm">No matches recorded yet.</p>
			) : (
				<div className="space-y-4">
					{matches.map((match, idx) => {
						const playerCount = match.results.length;
						return (
							<div key={match.id} className="rounded-lg border border-border bg-surface p-4">
								{editingId === match.id && editState ? (
									/* ── Edit form ── */
									<div className="space-y-4">
										<p className="text-sm font-semibold text-foreground/60">Editing match</p>

										<div>
											<label className="block text-xs text-foreground/50 mb-1">Date</label>
											<input
												type="date"
												value={editState.playedAt}
												onChange={(e) =>
													setEditState((s) => (s ? { ...s, playedAt: e.target.value } : s))
												}
												className="rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
											/>
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

										<div className="space-y-2">
											{Array.from({ length: editState.playerCount }, (_, i) => i + 1).map((p) => (
												<div key={p} className="flex items-center gap-3">
													<span className="w-20 text-xs font-semibold shrink-0">
														{PLACEMENT_LABEL[p]}
														<span className="ml-1 text-accent">
															+{POINTS_TABLE[editState.playerCount][p - 1]}
														</span>
													</span>
													<select
														value={editState.assignments[p]}
														onChange={(e) => assignPlayer(p, e.target.value)}
														className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
													>
														<option value="">— select —</option>
														{players.map((pl) => {
															const ps = Array.from(
																{ length: editState.playerCount },
																(_, i) => i + 1,
															);
															const takenByOther = ps.some(
																(other) => other !== p && editState.assignments[other] === pl.id,
															);
															return (
																<option key={pl.id} value={pl.id} disabled={takenByOther}>
																	{pl.name}
																</option>
															);
														})}
													</select>
												</div>
											))}
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
												className="text-sm font-semibold hover:text-accent transition-colors"
											>
												{new Date(match.played_at).toLocaleDateString("sv-SE", {
													year: "numeric",
													month: "long",
													day: "numeric",
												})}
											</Link>
											<div className="flex items-center gap-2">
												<span className="text-xs text-foreground/40">
													{playerCount}p · #{matches.length - idx}
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
											{match.results.map((r) => (
												<div
													key={r.id}
													className={`rounded p-2 text-center text-sm ${
														r.placement === 1
															? "bg-accent/20 border border-accent/40"
															: "bg-background/60"
													}`}
												>
													<div className="text-xs text-foreground/50 mb-0.5">
														{PLACEMENT_LABEL[r.placement]}
													</div>
													<Link
														href={`/player/${r.player.id}`}
														className="font-semibold hover:text-accent transition-colors text-xs sm:text-sm"
													>
														{r.player.name}
													</Link>
													<div className="text-xs text-accent mt-0.5">
														+{getPoints(playerCount, r.placement)}
													</div>
												</div>
											))}
										</div>

										{match.notes && (
											<p className="mt-3 text-xs text-foreground/50 italic border-t border-border pt-2">
												{match.notes}
											</p>
										)}
									</>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
