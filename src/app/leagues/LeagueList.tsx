"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { League } from "@/lib/types";
import {
	RiAddLine,
	RiCheckboxCircleLine,
	RiDeleteBinLine,
	RiGamepadLine,
	RiShieldCheckLine,
	RiShieldStarLine,
	RiTrophyFill,
	RiTrophyLine,
} from "@remixicon/react";

export type StandingOption = { playerId: string; name: string; points: number };

interface Props {
	leagues: League[];
	matchCountById: Record<string, number>;
	standingsById: Record<string, StandingOption[]>;
	playerNameById: Record<string, string>;
}

type LoginMode = "admin" | "master";

export default function LeagueList({
	leagues: initialLeagues,
	matchCountById: initialCounts,
	standingsById,
	playerNameById,
}: Props) {
	const router = useRouter();
	const [leagues, setLeagues] = useState<League[]>(initialLeagues);
	const [matchCounts, setMatchCounts] = useState(initialCounts);

	// Auth state — only one login form open at a time
	const [adminAuthed, setAdminAuthed] = useState(false);
	const [masterAuthed, setMasterAuthed] = useState(false);
	const [loginMode, setLoginMode] = useState<LoginMode | null>(null);
	const [loginPw, setLoginPw] = useState("");
	const [loginError, setLoginError] = useState("");

	// New league form
	const [showNewLeague, setShowNewLeague] = useState(false);
	const [newLeagueName, setNewLeagueName] = useState("");
	const [newLeagueIsPractice, setNewLeagueIsPractice] = useState(false);
	const [newLeagueLoading, setNewLeagueLoading] = useState(false);
	const [newLeagueError, setNewLeagueError] = useState("");

	// Delete state
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<Record<string, string>>({});

	// Rename state
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const [renameError, setRenameError] = useState("");
	const [renameLoading, setRenameLoading] = useState(false);

	// Close / reopen state
	const [closingId, setClosingId] = useState<string | null>(null);
	const [closeWinnerId, setCloseWinnerId] = useState("");
	const [closeError, setCloseError] = useState("");
	const [closeLoading, setCloseLoading] = useState(false);

	function toggleLogin(mode: LoginMode) {
		setLoginMode((current) => (current === mode ? null : mode));
		setLoginPw("");
		setLoginError("");
	}

	async function handleLogin(e: React.SyntheticEvent) {
		e.preventDefault();
		if (!loginMode) return;
		const res = await fetch(loginMode === "admin" ? "/api/auth" : "/api/master-auth", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: loginPw }),
		});
		if (res.ok) {
			if (loginMode === "admin") setAdminAuthed(true);
			else setMasterAuthed(true);
			setLoginMode(null);
			setLoginPw("");
			setLoginError("");
		} else {
			setLoginError("Wrong password.");
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
				setMatchCounts((prev) => {
					const next = { ...prev };
					for (const l of updated as League[]) {
						if (!(l.id in next)) next[l.id] = 0;
					}
					return next;
				});
			}
			setNewLeagueName("");
			setNewLeagueIsPractice(false);
			setShowNewLeague(false);
			router.refresh();
		} else {
			const data = await res.json();
			setNewLeagueError(data.error ?? "Something went wrong.");
		}
	}

	async function handleDelete(id: string) {
		setDeletingId(id);
		setDeleteError((prev) => ({ ...prev, [id]: "" }));
		const res = await fetch(`/api/leagues/${id}`, { method: "DELETE" });
		setDeletingId(null);
		if (res.ok) {
			setLeagues((prev) => prev.filter((l) => l.id !== id));
			router.refresh();
		} else {
			const data = await res.json();
			setDeleteError((prev) => ({ ...prev, [id]: data.error ?? "Could not delete." }));
		}
	}

	async function handleRename(e: React.SyntheticEvent, id: string) {
		e.preventDefault();
		if (!renameValue.trim()) return;
		setRenameLoading(true);
		setRenameError("");
		const res = await fetch(`/api/leagues/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: renameValue.trim() }),
		});
		setRenameLoading(false);
		if (res.ok) {
			setLeagues((prev) => prev.map((l) => (l.id === id ? { ...l, name: renameValue.trim() } : l)));
			setRenamingId(null);
			setRenameValue("");
			router.refresh();
		} else {
			const data = await res.json();
			setRenameError(data.error ?? "Could not rename.");
		}
	}

	function startClosing(league: League) {
		setClosingId(league.id);
		setCloseWinnerId(standingsById[league.id]?.[0]?.playerId ?? "");
		setCloseError("");
	}

	async function handleSetClosed(id: string, isClosed: boolean) {
		const winnerId = isClosed ? closeWinnerId || null : null;
		setCloseLoading(true);
		setCloseError("");
		const res = await fetch(`/api/leagues/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ is_closed: isClosed, winner_id: winnerId }),
		});
		setCloseLoading(false);
		if (res.ok) {
			setLeagues((prev) =>
				prev.map((l) => (l.id === id ? { ...l, is_closed: isClosed, winner_id: winnerId } : l)),
			);
			setClosingId(null);
			router.refresh();
		} else {
			const data = await res.json();
			setCloseError(data.error ?? "Could not update league.");
		}
	}

	const official = leagues.filter((l) => !l.is_practice && !l.is_closed);
	const practice = leagues.filter((l) => l.is_practice && !l.is_closed);
	const completed = leagues.filter((l) => l.is_closed);

	function LeagueCard({ league }: { league: League }) {
		const count = matchCounts[league.id] ?? 0;
		const isRenaming = renamingId === league.id;
		const isDeleting = deletingId === league.id;
		const isClosing = closingId === league.id;
		const err = deleteError[league.id];
		const standings = standingsById[league.id] ?? [];
		const winnerName = league.winner_id ? playerNameById[league.winner_id] : null;
		const canClose = adminAuthed && !league.is_closed && count > 0;

		return (
			<div
				className={`rounded-lg border px-4 py-3 flex flex-col gap-2 ${
					league.is_closed || league.is_practice ? "border-border" : "border-accent/30 bg-accent/5"
				}`}
			>
				<div className="flex items-center gap-3">
					{isRenaming ? (
						<form onSubmit={(e) => handleRename(e, league.id)} className="flex gap-2 flex-1">
							<input
								autoFocus
								value={renameValue}
								onChange={(e) => setRenameValue(e.target.value)}
								className="flex-1 rounded border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
							/>
							<button
								type="submit"
								disabled={renameLoading || !renameValue.trim()}
								className="rounded bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
							>
								{renameLoading ? "Saving…" : "Save"}
							</button>
							<button
								type="button"
								onClick={() => {
									setRenamingId(null);
									setRenameError("");
								}}
								className="text-xs text-foreground/50 hover:text-foreground transition-colors"
							>
								Cancel
							</button>
						</form>
					) : (
						<Link
							href={`/leagues/${league.id}`}
							className="flex-1 font-semibold hover:text-accent transition-colors"
						>
							{league.name}
						</Link>
					)}

					<div className="flex items-center gap-3 shrink-0">
						{adminAuthed && !isRenaming && (
							<button
								onClick={() => {
									setRenamingId(league.id);
									setRenameValue(league.name);
									setRenameError("");
								}}
								className="text-xs text-foreground/40 hover:text-foreground transition-colors"
							>
								Rename
							</button>
						)}
						{canClose && !isClosing && (
							<button
								onClick={() => startClosing(league)}
								className="text-xs text-foreground/40 hover:text-foreground transition-colors"
							>
								Close
							</button>
						)}
						{adminAuthed && league.is_closed && (
							<button
								onClick={() => handleSetClosed(league.id, false)}
								disabled={closeLoading}
								className="text-xs text-foreground/40 hover:text-foreground transition-colors disabled:opacity-40"
							>
								Reopen
							</button>
						)}
						{masterAuthed && count === 0 && (
							<button
								onClick={() => handleDelete(league.id)}
								disabled={isDeleting}
								className="text-foreground/30 hover:text-red-400 transition-colors disabled:opacity-40"
								title="Delete league"
							>
								<RiDeleteBinLine size={16} />
							</button>
						)}
					</div>
				</div>

				{renameError && isRenaming && <p className="text-red-400 text-xs">{renameError}</p>}

				{league.is_closed && winnerName && (
					<div className="flex items-center gap-2 text-sm">
						<RiTrophyFill size={16} className="text-accent" />
						<span className="text-foreground/50">Winner</span>
						<Link
							href={`/player/${league.winner_id}`}
							className="font-semibold hover:text-accent transition-colors"
						>
							{winnerName}
						</Link>
					</div>
				)}

				<div className="flex items-center gap-3 text-sm text-foreground/50">
					<span>
						{count} {count === 1 ? "match" : "matches"}
					</span>
					{/* {count > 0 && (
						<Link
							href={`/leagues/${league.id}`}
							className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
						>
							{league.is_closed ? "Final standings" : "View standings"}
						</Link>
					)} */}
					{masterAuthed && count > 0 && (
						<span className="text-xs text-foreground/30">(has matches — cannot delete)</span>
					)}
				</div>

				{isClosing && (
					<div className="rounded border border-border bg-surface/60 p-3 space-y-2">
						{!league.is_practice && (
							<>
								<label className="block text-xs text-foreground/50">Winner</label>
								<select
									value={closeWinnerId}
									onChange={(e) => setCloseWinnerId(e.target.value)}
									className="w-full rounded border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
								>
									{standings.map((s, i) => (
										<option key={s.playerId} value={s.playerId}>
											#{i + 1} {s.name} ({s.points} pts)
										</option>
									))}
								</select>
							</>
						)}
						<p className="text-xs text-foreground/40">
							No new matches can be registered in a closed league.
						</p>
						<div className="flex gap-3 justify-end items-center">
							{closeError && <p className="text-red-400 text-xs flex-1">{closeError}</p>}
							<button
								type="button"
								onClick={() => setClosingId(null)}
								className="text-xs text-foreground/50 hover:text-foreground transition-colors"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => handleSetClosed(league.id, true)}
								disabled={closeLoading || (!league.is_practice && !closeWinnerId)}
								className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
							>
								{closeLoading ? "Closing…" : "Close league"}
							</button>
						</div>
					</div>
				)}

				{err && <p className="text-red-400 text-xs">{err}</p>}
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Auth bar */}
			<div className="space-y-3">
				<div className="flex gap-3 flex-wrap">
					{!adminAuthed && (
						<button
							onClick={() => toggleLogin("admin")}
							className="text-xs text-accent hover:underline"
						>
							{loginMode === "admin" ? "Cancel" : "Admin login"}
						</button>
					)}
					{!masterAuthed && (
						<button
							onClick={() => toggleLogin("master")}
							className="text-xs text-foreground/40 hover:text-foreground transition-colors"
						>
							{loginMode === "master" ? "Cancel" : "Master login"}
						</button>
					)}
					{adminAuthed && <span className="inline-flex items-center gap-1 text-xs text-accent">
							<RiShieldCheckLine size={14} />
							Admin
						</span>}
					{masterAuthed && <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
							<RiShieldStarLine size={14} />
							Master
						</span>}
				</div>

				{loginMode && (
					<form key={loginMode} onSubmit={handleLogin} className="flex gap-2 items-center">
						<input
							type="password"
							value={loginPw}
							onChange={(e) => setLoginPw(e.target.value)}
							placeholder={loginMode === "admin" ? "Admin password" : "Master password"}
							autoFocus
							className="rounded border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
						/>
						<button
							type="submit"
							className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
						>
							Login
						</button>
						{loginError && <p className="text-red-400 text-xs">{loginError}</p>}
					</form>
				)}
			</div>

			{/* Official leagues */}
			<section className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<RiTrophyLine size={18} className="text-accent" />
						<h2 className="font-semibold">Official Leagues</h2>
					</div>
					{adminAuthed && (
						<button
							onClick={() => {
								setShowNewLeague((v) => !v);
								setNewLeagueError("");
								setNewLeagueIsPractice(false);
							}}
							className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
						>
							{showNewLeague && !newLeagueIsPractice ? "Cancel" : <>
								<RiAddLine size={14} />
								New league
							</>}
						</button>
					)}
				</div>

				{showNewLeague && !newLeagueIsPractice && (
					<div className="rounded border border-accent/30 bg-accent/5 p-3 space-y-2">
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
						<div className="flex gap-2 justify-end">
							{newLeagueError && <p className="text-red-400 text-xs flex-1">{newLeagueError}</p>}
							<button
								type="button"
								onClick={handleAddLeague}
								disabled={newLeagueLoading || !newLeagueName.trim()}
								className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
							>
								{newLeagueLoading ? "Creating…" : "Create"}
							</button>
						</div>
					</div>
				)}

				{official.length === 0 ? (
					<p className="text-sm text-foreground/40">No active official leagues.</p>
				) : (
					<div className="space-y-2">
						{official.map((l) => (
							<LeagueCard key={l.id} league={l} />
						))}
					</div>
				)}
			</section>

			{/* Practice leagues */}
			<section className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<RiGamepadLine size={18} className="text-foreground/40" />
						<h2 className="font-semibold text-foreground/60">Practice Leagues</h2>
					</div>
					{adminAuthed && (
						<button
							onClick={() => {
								setShowNewLeague((v) => !v);
								setNewLeagueError("");
								setNewLeagueIsPractice(true);
							}}
							className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground transition-colors"
						>
							{showNewLeague && newLeagueIsPractice ? "Cancel" : <>
								<RiAddLine size={14} />
								New practice league
							</>}
						</button>
					)}
				</div>

				{showNewLeague && newLeagueIsPractice && (
					<div className="rounded border border-border p-3 space-y-2">
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
							placeholder="Practice league name"
							autoFocus
							className="w-full rounded border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
						/>
						<div className="flex gap-2 justify-end">
							{newLeagueError && <p className="text-red-400 text-xs flex-1">{newLeagueError}</p>}
							<button
								type="button"
								onClick={handleAddLeague}
								disabled={newLeagueLoading || !newLeagueName.trim()}
								className="rounded bg-surface border border-border px-3 py-1.5 text-xs font-semibold hover:bg-background transition-colors disabled:opacity-50"
							>
								{newLeagueLoading ? "Creating…" : "Create"}
							</button>
						</div>
					</div>
				)}

				<p className="text-xs text-foreground/40">
					Practice games track personal stats but don&apos;t count toward standings.
				</p>

				{practice.length === 0 ? (
					<p className="text-sm text-foreground/40">No practice leagues yet.</p>
				) : (
					<div className="space-y-2">
						{practice.map((l) => (
							<LeagueCard key={l.id} league={l} />
						))}
					</div>
				)}
			</section>

			{/* Completed leagues */}
			{completed.length > 0 && (
				<section className="space-y-3">
					<div className="flex items-center gap-2">
						<RiCheckboxCircleLine size={18} className="text-foreground/40" />
						<h2 className="font-semibold text-foreground/60">Completed Leagues</h2>
					</div>
					<div className="space-y-2">
						{completed.map((l) => (
							<LeagueCard key={l.id} league={l} />
						))}
					</div>
				</section>
			)}
		</div>
	);
}
