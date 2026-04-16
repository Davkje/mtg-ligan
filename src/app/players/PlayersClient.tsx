"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlayersClient() {
	const router = useRouter();

	const [authed, setAuthed] = useState(false);
	const [showAuthModal, setShowAuthModal] = useState(false);
	const [password, setPassword] = useState("");
	const [authError, setAuthError] = useState("");
	const [authLoading, setAuthLoading] = useState(false);

	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [submitError, setSubmitError] = useState("");
	const [submitLoading, setSubmitLoading] = useState(false);

	async function handleLogin(e: React.FormEvent) {
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
			setShowAuthModal(false);
			setShowForm(true);
			setPassword("");
		} else {
			setAuthError("Wrong password.");
		}
	}

	async function handleAddPlayer(e: React.FormEvent) {
		e.preventDefault();
		setSubmitError("");
		if (!name.trim()) return;
		setSubmitLoading(true);
		const res = await fetch("/api/players", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name }),
		});
		setSubmitLoading(false);
		if (res.ok) {
			setName("");
			setShowForm(false);
			router.refresh();
		} else {
			const data = await res.json();
			setSubmitError(data.error ?? "Something went wrong.");
		}
	}

	return (
		<div>
			{/* Auth modal */}
			{showAuthModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
					<div className="bg-surface border border-border rounded-lg p-6 w-full max-w-sm shadow-xl">
						<h2 className="text-lg font-bold mb-4">Admin Login</h2>
						<form onSubmit={handleLogin} className="space-y-3">
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Admin password"
								className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
								autoFocus
							/>
							{authError && <p className="text-red-400 text-sm">{authError}</p>}
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => {
										setShowAuthModal(false);
										setAuthError("");
									}}
									className="flex-1 rounded border border-border px-3 py-2 text-sm hover:bg-background transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={authLoading}
									className="flex-1 rounded bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
								>
									{authLoading ? "Checking…" : "Login"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Add player button / form */}
			{!showForm ? (
				<button
					onClick={() => {
						if (authed) setShowForm(true);
						else setShowAuthModal(true);
					}}
					className="rounded bg-background border px-4 py-2 text-sm font-semibold text-foreground/30 hover:text-foreground transition-colors cursor-pointer"
				>
					Add player
				</button>
			) : (
				<form onSubmit={handleAddPlayer} className="flex items-center gap-2">
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Player name"
						className="rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
						autoFocus
					/>
					<button
						type="submit"
						disabled={submitLoading || !name.trim()}
						className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
					>
						{submitLoading ? "Adding…" : "Add"}
					</button>
					<button
						type="button"
						onClick={() => {
							setShowForm(false);
							setSubmitError("");
						}}
						className="rounded border border-border px-3 py-2 text-sm hover:bg-surface transition-colors"
					>
						Cancel
					</button>
					{submitError && <p className="text-red-400 text-sm">{submitError}</p>}
				</form>
			)}
		</div>
	);
}
