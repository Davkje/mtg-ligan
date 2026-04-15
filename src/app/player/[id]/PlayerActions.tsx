"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  playerId: string;
  playerName: string;
  hasMatches: boolean;
}

export default function PlayerActions({ playerId, playerName, hasMatches }: Props) {
  const router = useRouter();

  // Auth state
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [masterAuthed, setMasterAuthed] = useState(false);

  // Modal state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Password inputs
  const [adminPassword, setAdminPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Rename
  const [newName, setNewName] = useState(playerName);
  const [renameError, setRenameError] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  // Delete
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleAdminLogin(e: React.SyntheticEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword }),
    });
    setAuthLoading(false);
    if (res.ok) {
      setAdminAuthed(true);
      setAdminPassword("");
      setShowAdminModal(false);
      setShowRenameModal(true);
    } else {
      setAuthError("Wrong password.");
    }
  }

  async function handleMasterLogin(e: React.SyntheticEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const res = await fetch("/api/master-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: masterPassword }),
    });
    setAuthLoading(false);
    if (res.ok) {
      setMasterAuthed(true);
      setMasterPassword("");
      setShowMasterModal(false);
      setShowDeleteConfirm(true);
    } else {
      setAuthError("Wrong password.");
    }
  }

  function onRenameClick() {
    setNewName(playerName);
    setRenameError("");
    if (adminAuthed) {
      setShowRenameModal(true);
    } else {
      setAuthError("");
      setShowAdminModal(true);
    }
  }

  function onDeleteClick() {
    setDeleteError("");
    if (masterAuthed) {
      setShowDeleteConfirm(true);
    } else {
      setAuthError("");
      setShowMasterModal(true);
    }
  }

  async function handleRename(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === playerName) {
      setShowRenameModal(false);
      return;
    }
    setRenameLoading(true);
    setRenameError("");
    const res = await fetch(`/api/players/${playerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setRenameLoading(false);
    if (res.ok) {
      setShowRenameModal(false);
      router.refresh();
    } else {
      const data = await res.json();
      setRenameError(data.error ?? "Something went wrong.");
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError("");
    const res = await fetch(`/api/players/${playerId}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (res.ok) {
      router.push("/players");
    } else {
      const data = await res.json();
      setDeleteError(data.error ?? "Something went wrong.");
      setShowDeleteConfirm(false);
    }
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onRenameClick}
          className="rounded border border-border px-3 py-1.5 text-xs hover:bg-surface transition-colors"
        >
          Rename
        </button>
        <button
          onClick={onDeleteClick}
          className="rounded border border-red-900/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors"
        >
          Delete
        </button>
      </div>

      {deleteError && (
        <p className="text-red-400 text-xs mt-1">{deleteError}</p>
      )}

      {/* Admin password modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg">Admin Login</h3>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              {authError && <p className="text-red-400 text-xs">{authError}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowAdminModal(false); setAuthError(""); }}
                  className="rounded border border-border px-3 py-1.5 text-sm hover:bg-background transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {authLoading ? "Checking…" : "Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master password modal */}
      {showMasterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg">Master Login</h3>
            <form onSubmit={handleMasterLogin} className="space-y-3">
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Master password"
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              {authError && <p className="text-red-400 text-xs">{authError}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowMasterModal(false); setAuthError(""); }}
                  className="rounded border border-border px-3 py-1.5 text-sm hover:bg-background transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {authLoading ? "Checking…" : "Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg">Rename Player</h3>
            <form onSubmit={handleRename} className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              {renameError && <p className="text-red-400 text-xs">{renameError}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="rounded border border-border px-3 py-1.5 text-sm hover:bg-background transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameLoading || !newName.trim()}
                  className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {renameLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-lg">Delete Player</h3>
            <p className="text-sm text-foreground/70">
              Are you sure you want to delete <span className="font-semibold text-foreground">{playerName}</span>?
              {hasMatches && (
                <span className="block mt-2 text-red-400">
                  This player has match history and cannot be deleted.
                </span>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded border border-border px-3 py-1.5 text-sm hover:bg-background transition-colors"
              >
                Cancel
              </button>
              {!hasMatches && (
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteLoading ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
