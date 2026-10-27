"use client";

import { useId, useState } from "react";
import type { Commander, Player } from "@/lib/types";
import { PLAYER_COLORS } from "@/lib/lifeCounter";
import CommanderSearch from "@/components/CommanderSearch";
import { useCommanderArt } from "./useCommanderArt";
import { RiCheckLine, RiCloseLine, RiImageLine, RiPaletteLine } from "@remixicon/react";

// playerId: "" when playerName doesn't match an existing player (a new player, created on registration)
// commander: "" (none) | commander id | "new:<name>" (not in DB yet)
export type SeatFieldsValue = {
	playerId: string;
	playerName: string;
	commander: string;
	color: string;
	useArt: boolean;
};

export type PlayerGroup = { label: string | null; list: Player[] };

export function commanderNameOf(commander: string, commanders: Commander[]): string | null {
	if (!commander) return null;
	if (commander.startsWith("new:")) return commander.slice(4);
	return commanders.find((c) => c.id === commander)?.name ?? null;
}

interface Props {
	value: SeatFieldsValue;
	onChange: (patch: Partial<SeatFieldsValue>) => void;
	playerGroups: PlayerGroup[];
	takenPlayerIds: string[];
	takenColors: string[];
	commanders: Commander[];
	playerCommanderUsage: Record<string, string[]>;
	// "panel" = inside a (dark, rotated) player panel during a game
	variant?: "setup" | "panel";
}

export default function SeatFields({
	value,
	onChange,
	playerGroups,
	takenPlayerIds,
	takenColors,
	commanders,
	playerCommanderUsage,
	variant = "setup",
}: Props) {
	const listId = useId();
	// In a running game the name is committed on blur/Enter, so typing doesn't flood undo history
	const [nameDraft, setNameDraft] = useState(value.playerName);
	const [searching, setSearching] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const artUrl = useCommanderArt(commanderNameOf(value.commander, commanders));

	const inPanel = variant === "panel";
	const field = inPanel
		? "rounded border border-white/20 bg-black/60 px-2 py-1.5 text-sm text-white focus:outline-none"
		: "rounded border border-border bg-surface px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

	const usedIds = value.playerId ? (playerCommanderUsage[value.playerId] ?? []) : [];
	const frequent = commanders
		.filter((c) => usedIds.includes(c.id))
		.sort((a, b) => usedIds.indexOf(a.id) - usedIds.indexOf(b.id));
	const rest = commanders.filter((c) => !usedIds.includes(c.id));
	const newName = value.commander.startsWith("new:") ? value.commander.slice(4) : null;

	const allPlayers = playerGroups.flatMap((g) => g.list);

	function commitName(text: string) {
		const name = text.trim();
		if (!name) {
			// Empty: clear the seat during setup, keep the old name in a running game
			if (inPanel) setNameDraft(value.playerName);
			else if (value.playerName) onChange({ playerId: "", playerName: "" });
			return;
		}
		if (name === value.playerName) return;
		// An exact (case-insensitive) match picks the existing player, anything else is a new player
		const match = allPlayers.find(
			(p) => p.name.toLowerCase() === name.toLowerCase() && !takenPlayerIds.includes(p.id),
		);
		const playerId = match?.id ?? "";
		const playerName = match?.name ?? name;
		// Auto-fill most-used commander if the slot is currently empty
		const topId = playerId && !value.commander ? playerCommanderUsage[playerId]?.[0] : undefined;
		onChange(topId ? { playerId, playerName, commander: topId } : { playerId, playerName });
	}

	function changeName(text: string) {
		setNameDraft(text);
		if (!inPanel) commitName(text);
	}

	const nameMatchesPlayer = !!value.playerId;

	function confirmSearch() {
		const name = searchValue.trim();
		if (!name) return;
		const existing = commanders.find((c) => c.name.toLowerCase() === name.toLowerCase());
		onChange({ commander: existing ? existing.id : `new:${name}` });
		setSearching(false);
		setSearchValue("");
	}

	const toggleButton = (active: boolean) =>
		`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30 ${
			active
				? inPanel
					? "bg-white text-black"
					: "bg-accent/20 text-accent border border-accent/50"
				: inPanel
					? "text-white/70 border border-white/20"
					: "text-foreground/50 border border-border"
		}`;

	return (
		<div className="space-y-2">
			<div className="grid grid-cols-2 gap-2">
				<div className="relative min-w-0">
					<input
						type="text"
						list={listId}
						value={nameDraft}
						onChange={(e) => changeName(e.target.value)}
						onBlur={() => commitName(nameDraft)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								commitName(nameDraft);
								e.currentTarget.blur();
							}
						}}
						placeholder="Player name"
						autoComplete="off"
						className={`w-full ${field}`}
					/>
					{/* League players first, players already seated left out */}
					<datalist id={listId}>
						{allPlayers
							.filter((p) => !takenPlayerIds.includes(p.id))
							.map((p) => (
								<option key={p.id} value={p.name} />
							))}
					</datalist>
					{value.playerName && !nameMatchesPlayer && (
						<span
							className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1 text-[10px] ${
								inPanel ? "bg-white/20 text-white" : "bg-accent/20 text-accent"
							}`}
						>
							new
						</span>
					)}
				</div>
				<select
					value={value.commander}
					onChange={(e) => {
						if (e.target.value === "__search") {
							setSearching(true);
							setSearchValue("");
						} else {
							onChange({ commander: e.target.value });
						}
					}}
					className={`${field} ${inPanel ? "" : "text-foreground/70"}`}
				>
					<option value="">— commander —</option>
					{newName && <option value={value.commander}>{newName} (new)</option>}
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
					<option value="__search">Search for another commander…</option>
				</select>
			</div>

			{searching && (
				<div className={`flex items-center gap-2 ${inPanel ? "text-foreground" : ""}`}>
					<CommanderSearch
						value={searchValue}
						onChange={setSearchValue}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								confirmSearch();
							}
						}}
						autoFocus
						className="flex-1"
					/>
					<button
						type="button"
						onClick={confirmSearch}
						disabled={!searchValue.trim()}
						className="rounded bg-accent p-1.5 text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
						aria-label="Use commander"
					>
						<RiCheckLine size={16} />
					</button>
					<button
						type="button"
						onClick={() => setSearching(false)}
						className={`p-1.5 transition-colors ${inPanel ? "text-white/70" : "text-foreground/50 hover:text-foreground"}`}
						aria-label="Cancel search"
					>
						<RiCloseLine size={16} />
					</button>
				</div>
			)}

			{/* Background: commander art or color */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onChange({ useArt: true })}
					disabled={!artUrl}
					className={toggleButton(value.useArt && !!artUrl)}
				>
					<RiImageLine size={14} />
					Art
				</button>
				<button
					type="button"
					onClick={() => onChange({ useArt: false })}
					className={toggleButton(!value.useArt || !artUrl)}
				>
					<RiPaletteLine size={14} />
					Color
				</button>
				{artUrl && value.useArt && (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={artUrl} alt="" className="h-7 w-11 rounded object-cover" />
				)}
			</div>

			<div className="flex flex-wrap gap-2">
				{PLAYER_COLORS.map((c) => (
					<button
						key={c}
						type="button"
						onClick={() => onChange({ color: c })}
						disabled={takenColors.includes(c)}
						aria-label={`Color ${c}`}
						className={`h-7 w-7 rounded-full transition-transform disabled:opacity-20 ${
							value.color === c ? `ring-2 ${inPanel ? "ring-white" : "ring-foreground"} scale-110` : "opacity-70"
						}`}
						style={{ backgroundColor: c }}
					/>
				))}
			</div>
		</div>
	);
}
