"use client";

import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Commander } from "@/lib/types";
import {
	type GameAction,
	type GameState,
	type Seat,
	COMMANDER_DAMAGE_LETHAL,
	lifeLevel,
} from "@/lib/lifeCounter";
import { useCommanderArt } from "./useCommanderArt";
import SeatFields, { type PlayerGroup, type SeatFieldsValue, commanderNameOf } from "./SeatFields";
import { RiAddLine, RiFlagLine, RiSkull2Line, RiSubtractLine } from "@remixicon/react";

const HOLD_DELAY_MS = 450;
const HOLD_REPEAT_MS = 550;
const BUBBLE_MS = 1500;
const DRAG_THRESHOLD_PX = 12;

// Tap = small step, hold = big step (repeating while held)
function useHoldPress(onTap: () => void, onHold: () => void) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const held = useRef(false);

	function stop() {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
	}

	return {
		onPointerDown: () => {
			held.current = false;
			stop();
			const tick = () => {
				held.current = true;
				onHold();
				timer.current = setTimeout(tick, HOLD_REPEAT_MS);
			};
			timer.current = setTimeout(tick, HOLD_DELAY_MS);
		},
		onPointerUp: () => {
			stop();
			if (!held.current) onTap();
		},
		onPointerCancel: stop,
		onPointerLeave: stop,
		onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
	};
}

// Panel / tile background: commander art (darkened for readability) or the seat color
function SeatBackground({ seat, className, children }: { seat: Seat; className?: string; children?: ReactNode }) {
	const art = useCommanderArt(seat.useArt ? seat.commanderName : null);
	return (
		<div
			className={className}
			style={{
				backgroundColor: seat.color,
				backgroundImage: art ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${art})` : undefined,
				backgroundSize: "cover",
				backgroundPosition: "center",
			}}
		>
			{children}
		</div>
	);
}

export type SeatEditorData = {
	playerGroups: PlayerGroup[];
	commanders: Commander[];
	playerCommanderUsage: Record<string, string[]>;
};

interface Props {
	game: GameState;
	seat: number;
	rotation: 0 | 90 | 180 | 270;
	dispatch: (action: GameAction) => void;
	editor: SeatEditorData;
	highlight: boolean;
	onDragMove: (seat: number, x: number, y: number) => void;
	onDragEnd: (seat: number, cancelled: boolean) => void;
	style?: CSSProperties;
}

type Overlay = "damage" | "edit" | null;

export default function PlayerPanel({
	game,
	seat,
	rotation,
	dispatch,
	editor,
	highlight,
	onDragMove,
	onDragEnd,
	style,
}: Props) {
	const [overlay, setOverlay] = useState<Overlay>(null);
	const [bubble, setBubble] = useState(0);
	const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const drag = useRef<{ x: number; y: number; active: boolean } | null>(null);

	const player = game.seats[seat];
	const life = game.life[seat];
	const isOut = game.eliminated.includes(seat);
	const glow = isOut ? null : lifeLevel(life, game.settings.startingLife);
	const opponents = game.seats.map((s, i) => ({ seat: s, index: i })).filter((o) => o.index !== seat);
	const sideways = rotation === 90 || rotation === 270;

	function changeLife(delta: number) {
		dispatch({ type: "adjustLife", seat, delta });
		setBubble((b) => b + delta);
		if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
		bubbleTimer.current = setTimeout(() => setBubble(0), BUBBLE_MS);
	}

	const minus = useHoldPress(
		() => changeLife(-1),
		() => changeLife(-10),
	);
	const plus = useHoldPress(
		() => changeLife(1),
		() => changeLife(10),
	);

	// Name: tap opens the seat editor, drag moves the player to another seat
	const nameHandlers = {
		onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
			drag.current = { x: e.clientX, y: e.clientY, active: false };
			e.currentTarget.setPointerCapture(e.pointerId);
		},
		onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
			const d = drag.current;
			if (!d) return;
			if (!d.active && Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_THRESHOLD_PX) d.active = true;
			if (d.active) onDragMove(seat, e.clientX, e.clientY);
		},
		onPointerUp: () => {
			const d = drag.current;
			drag.current = null;
			if (!d) return;
			if (d.active) onDragEnd(seat, false);
			else setOverlay("edit");
		},
		onPointerCancel: () => {
			if (drag.current?.active) onDragEnd(seat, true);
			drag.current = null;
		},
		onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
	};

	const fieldsValue: SeatFieldsValue = {
		playerId: player.playerId,
		playerName: player.name,
		commander: player.commanderId ?? (player.commanderName ? `new:${player.commanderName}` : ""),
		color: player.color,
		useArt: player.useArt,
	};

	function updateSeat(patch: Partial<SeatFieldsValue>) {
		const seatPatch: Partial<Seat> = {};
		if (patch.playerName !== undefined) {
			seatPatch.playerId = patch.playerId ?? "";
			seatPatch.name = patch.playerName;
		}
		if (patch.commander !== undefined) {
			seatPatch.commanderId =
				patch.commander && !patch.commander.startsWith("new:") ? patch.commander : null;
			seatPatch.commanderName = commanderNameOf(patch.commander, editor.commanders);
		}
		if (patch.color !== undefined) seatPatch.color = patch.color;
		if (patch.useArt !== undefined) seatPatch.useArt = patch.useArt;
		dispatch({ type: "updateSeat", seat, patch: seatPatch });
	}

	const closeOverlay = () => setOverlay(null);
	const stop = (e: React.SyntheticEvent) => e.stopPropagation();

	return (
		<div
			data-seat={seat}
			className={`relative overflow-hidden rounded-2xl transition-shadow ${highlight ? "ring-4 ring-white" : ""}`}
			style={{ ...style, containerType: "size" }}
		>
			<SeatBackground seat={player} className="absolute inset-0" />
			{glow && <div className={`life-glow life-glow-${glow}`} />}

			{/* Rotated content — width/height swap when sideways so it fills the panel */}
			<div
				className="absolute left-1/2 top-1/2"
				style={{
					width: sideways ? "100cqh" : "100cqw",
					height: sideways ? "100cqw" : "100cqh",
					transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
				}}
			>
				{/* Tap zones */}
				<button
					type="button"
					aria-label={`${player.name} minus life`}
					className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-start pl-[6%] text-white/60 active:bg-black/10 touch-none"
					{...minus}
				>
					<RiSubtractLine size={28} />
				</button>
				<button
					type="button"
					aria-label={`${player.name} plus life`}
					className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-[6%] text-white/60 active:bg-black/10 touch-none"
					{...plus}
				>
					<RiAddLine size={28} />
				</button>

				{/* Life */}
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-white">
					<span
						className={`h-6 text-lg font-semibold transition-opacity ${bubble ? "opacity-100" : "opacity-0"}`}
					>
						{bubble > 0 ? `+${bubble}` : bubble}
					</span>
					<span
						className="font-bold leading-none tabular-nums drop-shadow"
						style={{ fontSize: "min(38cqw, 38cqh)" }}
					>
						{life}
					</span>
				</div>

				{/* Commander damage mini-grid */}
				<button
					type="button"
					onClick={() => setOverlay("damage")}
					aria-label={`${player.name} commander damage`}
					className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 rounded-lg bg-black/40 p-1"
				>
					{opponents.map((o) => {
						const dmg = game.cmdDamage[seat][o.index];
						return (
							<SeatBackground
								key={o.index}
								seat={o.seat}
								className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-white ${
									dmg >= COMMANDER_DAMAGE_LETHAL ? "ring-2 ring-white" : ""
								}`}
							>
								{dmg}
							</SeatBackground>
						);
					})}
				</button>

				{/* Name — tap to edit, drag to move seat */}
				<button
					type="button"
					className="absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[80%] truncate rounded-lg bg-black/40 px-3 py-1 text-sm font-semibold text-white touch-none"
					{...nameHandlers}
				>
					{player.name}
				</button>

				{/* Commander damage overlay — tap the dark area to close */}
				{overlay === "damage" && (
					<div className="absolute inset-0 z-10 flex flex-col bg-black/85 p-3 text-white" onClick={closeOverlay}>
						<div className="flex items-center justify-between text-xs text-white/50">
							<span>Commander damage taken</span>
							<button
								type="button"
								onClick={(e) => {
									stop(e);
									dispatch({ type: "concede", seat });
									closeOverlay();
								}}
								className="inline-flex items-center gap-1 rounded border border-white/20 px-2 py-0.5 text-[11px] text-white/60"
							>
								<RiFlagLine size={12} />
								Concede
							</button>
						</div>
						<div className="flex flex-1 min-h-0 items-center justify-center">
							<div className="grid w-full max-w-md grid-cols-2 gap-2">
								{opponents.map((o) => (
									<SeatBackground
										key={o.index}
										seat={o.seat}
										className="flex h-14 items-center justify-between rounded-lg px-1"
									>
										<button
											type="button"
											aria-label={`Less damage from ${o.seat.name}`}
											onClick={(e) => {
												stop(e);
												dispatch({ type: "adjustCmdDamage", target: seat, source: o.index, delta: -1 });
											}}
											className="h-full px-2"
										>
											<RiSubtractLine size={20} />
										</button>
										<div className="flex min-w-0 flex-col items-center" onClick={stop}>
											<span className="text-2xl font-bold tabular-nums leading-none">
												{game.cmdDamage[seat][o.index]}
											</span>
											<span className="max-w-full truncate text-[10px] text-white/80">{o.seat.name}</span>
										</div>
										<button
											type="button"
											aria-label={`More damage from ${o.seat.name}`}
											onClick={(e) => {
												stop(e);
												dispatch({ type: "adjustCmdDamage", target: seat, source: o.index, delta: 1 });
											}}
											className="h-full px-2"
										>
											<RiAddLine size={20} />
										</button>
									</SeatBackground>
								))}
							</div>
						</div>
					</div>
				)}

				{/* Seat editor overlay — tap the dark area to close */}
				{overlay === "edit" && (
					<div
						className="absolute inset-0 z-10 overflow-y-auto touch-pan-y bg-black/85 p-3 text-white"
						onClick={closeOverlay}
					>
						<div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-2">
							<span className="text-xs text-white/50">Edit seat</span>
							<div onClick={stop}>
								<SeatFields
									value={fieldsValue}
									onChange={updateSeat}
									playerGroups={editor.playerGroups}
									takenPlayerIds={opponents.map((o) => o.seat.playerId)}
									takenColors={opponents.map((o) => o.seat.color)}
									commanders={editor.commanders}
									playerCommanderUsage={editor.playerCommanderUsage}
									variant="panel"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Knocked out */}
				{isOut && (
					<button
						type="button"
						onClick={() => dispatch({ type: "revive", seat })}
						className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-black/65 text-white/80"
					>
						<RiSkull2Line style={{ width: "min(40cqw, 40cqh)", height: "min(40cqw, 40cqh)" }} />
						<span className="text-xs text-white/50">Tap to revive</span>
					</button>
				)}
			</div>
		</div>
	);
}
