"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Player } from "@/lib/types";
import { POINTS_TABLE } from "@/lib/types";

const PLACEMENT_LABEL: Record<number, string> = {
	1: "1st place",
	2: "2nd place",
	3: "3rd place",
	4: "4th place",
	5: "5th place",
};

const PLAYER_COUNTS = [3, 4, 5] as const;
type PlayerCount = (typeof PLAYER_COUNTS)[number];

export default function RegisterForm({ players: initialPlayers }: { players: Player[] }) {
	const router = useRouter();
	const [authed, setAuthed] = useState(false);
	const [password, setPassword] = useState("");
	const [authError, setAuthError] = useState("");
	const [authLoading, setAuthLoading] = useState(false);

	// Local player list — grows when inline player is created
	const [players, setPlayers] = useState<Player[]>(initialPlayers);

	const today = new Date().toISOString().split("T")[0];
	const [playedAt, setPlayedAt] = useState(today);
	const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
	const [assignments, setAssignments] = useState<Record<number, string>>({
		1: "",
		2: "",
		3: "",
		4: "",
		5: "",
	});
	const [notes, setNotes] = useState("");
	const [submitError, setSubmitError] = useState("");
	const [submitLoading, setSubmitLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	// Inline new player
	const [showNewPlayer, setShowNewPlayer] = useState(false);
	const [newPlayerName, setNewPlayerName] = useState("");
	const [newPlayerLoading, setNewPlayerLoading] = useState(false);
	const [newPlayerError, setNewPlayerError] = useState("");

	const placements = Array.from({ length: playerCount }, (_, i) => i + 1);
	const points = POINTS_TABLE[playerCount];

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
		if (res.ok) {
			setAuthed(true);
		} else {
			setAuthError("Wrong password.");
		}
	}

	function changePlayerCount(count: PlayerCount) {
		setPlayerCount(count);
		setAssignments({ 1: "", 2: "", 3: "", 4: "", 5: "" });
	}

	function assignPlayer(placement: number, playerId: string) {
		setAssignments((prev) => {
			const next = { ...prev };
			for (const p of placements) {
				if (next[p] === playerId && p !== placement) next[p] = "";
			}
			next[placement] = playerId;
			return next;
		});
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
			const data = await res.json();
			// Refresh player list from server
			const refreshed = await fetch("/api/players");
			if (refreshed.ok) {
				const { players: updated } = await refreshed.json();
				setPlayers(updated);
			} else {
				// Optimistic fallback
				setPlayers((prev) => [
					...prev,
					{ id: data.id ?? crypto.randomUUID(), name: newPlayerName.trim() },
				]);
			}
			setNewPlayerName("");
			setShowNewPlayer(false);
		} else {
			const data = await res.json();
			setNewPlayerError(data.error ?? "Something went wrong.");
		}
	}

	async function handleSubmit(e: React.SyntheticEvent) {
		e.preventDefault();
		setSubmitError("");

		const entries = placements.map((p) => ({ playerId: assignments[p], placement: p }));
		if (entries.some((e) => !e.playerId)) {
			setSubmitError("Assign a player to every placement.");
			return;
		}

		setSubmitLoading(true);
		const res = await fetch("/api/matches", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ playedAt, entries, notes }),
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
		setAssignments({ 1: "", 2: "", 3: "", 4: "", 5: "" });
		setPlayedAt(today);
		setPlayerCount(4);
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
							className="w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
							autoFocus
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
				<p className="text-2xl">✅</p>
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
						className="rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
						required
					/>
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

				{/* Placements */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-sm text-foreground/70">Assign a player to each placement</p>
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

					{/* Inline new player form */}
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
								placeholder="New player name"
								className="flex-1 rounded border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
								autoFocus
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

					{placements.map((p) => (
						<div key={p} className="flex items-center gap-3">
							<span className="w-24 text-sm font-semibold shrink-0">
								{PLACEMENT_LABEL[p]}
								<span className="ml-1 text-accent text-xs">+{points[p - 1]}</span>
							</span>
							<select
								value={assignments[p]}
								onChange={(e) => assignPlayer(p, e.target.value)}
								className="flex-1 rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
								required
							>
								<option value="">— select player —</option>
								{players.map((player) => {
									const takenByOther = placements.some(
										(other) => other !== p && assignments[other] === player.id,
									);
									return (
										<option key={player.id} value={player.id} disabled={takenByOther}>
											{player.name}
										</option>
									);
								})}
							</select>
						</div>
					))}
				</div>

				{/* Notes */}
				<div>
					<label className="block text-sm text-foreground/70 mb-1">
						Notes <span className="text-foreground/40">(optional)</span>
					</label>
					<textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Decks, location, vibe etc."
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
