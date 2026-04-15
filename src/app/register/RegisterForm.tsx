"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";
import { POINTS } from "@/lib/types";

const PLACEMENTS = [1, 2, 3, 4] as const;
const PLACEMENT_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "1st place",
  2: "2nd place",
  3: "3rd place",
  4: "4th place",
};

export default function RegisterForm({ players }: { players: Player[] }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [playedAt, setPlayedAt] = useState(today);
  const [assignments, setAssignments] = useState<Record<1 | 2 | 3 | 4, string>>({
    1: "",
    2: "",
    3: "",
    4: "",
  });
  const [submitError, setSubmitError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
    } else {
      setAuthError("Wrong password.");
    }
  }

  function assignPlayer(placement: 1 | 2 | 3 | 4, playerId: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      // Clear the player from any other slot first
      for (const p of PLACEMENTS) {
        if (next[p] === playerId && p !== placement) next[p] = "";
      }
      next[placement] = playerId;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    const entries = PLACEMENTS.map((p) => ({ playerId: assignments[p], placement: p }));
    if (entries.some((e) => !e.playerId)) {
      setSubmitError("Assign a player to every placement.");
      return;
    }

    setSubmitLoading(true);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playedAt, entries }),
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
    setAssignments({ 1: "", 2: "", 3: "", 4: "" });
    setPlayedAt(today);
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
          <a
            href="/"
            className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            View leaderboard
          </a>
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

        {/* Placements */}
        <div className="space-y-3">
          <p className="text-sm text-foreground/70">Assign a player to each placement</p>
          {PLACEMENTS.map((p) => (
            <div key={p} className="flex items-center gap-3">
              <span className="w-24 text-sm font-semibold shrink-0">
                {PLACEMENT_LABEL[p]}
                <span className="ml-1 text-accent text-xs">+{POINTS[p]}</span>
              </span>
              <select
                value={assignments[p]}
                onChange={(e) => assignPlayer(p, e.target.value)}
                className="flex-1 rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
              >
                <option value="">— select player —</option>
                {players.map((player) => {
                  const takenByOther = PLACEMENTS.some(
                    (other) => other !== p && assignments[other] === player.id
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
