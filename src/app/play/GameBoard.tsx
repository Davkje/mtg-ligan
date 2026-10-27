"use client";

import { useEffect, useReducer, useState } from "react";
import {
	type GameState,
	LAYOUTS,
	aliveSeats,
	historyReducer,
	saveGame,
} from "@/lib/lifeCounter";
import PlayerPanel, { type SeatEditorData } from "./PlayerPanel";
import {
	RiArrowGoBackLine,
	RiCloseLine,
	RiFlagLine,
	RiHome4Line,
	RiRestartLine,
	RiTrophyLine,
} from "@remixicon/react";

interface Props {
	initialGame: GameState;
	editor: SeatEditorData;
	onEnd: (game: GameState) => void;
	onExit: () => void;
	onHome: () => void;
}

type DragState = { from: number; x: number; y: number; over: number | null };

// Keeps the screen awake while a game is running (where supported)
function useWakeLock() {
	useEffect(() => {
		let lock: WakeLockSentinel | null = null;
		let cancelled = false;

		async function request() {
			try {
				if (document.visibilityState === "visible" && "wakeLock" in navigator) {
					lock = await navigator.wakeLock.request("screen");
					if (cancelled) lock.release();
				}
			} catch {
				// Denied or unsupported — not critical
			}
		}

		request();
		document.addEventListener("visibilitychange", request);
		return () => {
			cancelled = true;
			document.removeEventListener("visibilitychange", request);
			lock?.release().catch(() => {});
		};
	}, []);
}

export default function GameBoard({ initialGame, editor, onEnd, onExit, onHome }: Props) {
	const [history, dispatch] = useReducer(historyReducer, { current: initialGame, past: [] });
	const game = history.current;
	const layout = LAYOUTS[game.seats.length];
	const alive = aliveSeats(game);
	// Dismissing the game-over card hides it until the next knockout
	const [dismissedAt, setDismissedAt] = useState<number | null>(null);
	const gameOver = alive.length <= 1 && dismissedAt !== game.eliminated.length;

	useWakeLock();

	// Dragging a name onto another panel swaps the two seats
	const [drag, setDrag] = useState<DragState | null>(null);

	function handleDragMove(from: number, x: number, y: number) {
		const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-seat]");
		const over = target ? Number(target.dataset.seat) : null;
		setDrag({ from, x, y, over: over === from ? null : over });
	}

	function handleDragEnd(from: number, cancelled: boolean) {
		if (!cancelled && drag?.over != null) dispatch({ type: "swapSeats", a: from, b: drag.over });
		setDrag(null);
	}

	// Persist every change so a reload or locked screen doesn't lose the game
	useEffect(() => {
		saveGame(game);
	}, [game]);

	const menuButton = "p-2 text-white/70 hover:text-white disabled:opacity-30 transition-colors";

	return (
		<div
			className="fixed inset-0 z-[100] grid h-dvh grid-cols-2 gap-1.5 bg-black p-1.5 select-none overscroll-none"
			style={{ gridTemplateRows: layout.rows }}
		>
			{layout.seats.map((s, i) => (
				<PlayerPanel
					key={i}
					game={game}
					seat={i}
					rotation={s.rotation}
					dispatch={dispatch}
					editor={editor}
					highlight={drag?.over === i}
					onDragMove={handleDragMove}
					onDragEnd={handleDragEnd}
					style={{ gridRow: s.row, gridColumn: `${s.col} / span ${s.colSpan}` }}
				/>
			))}

			{/* Name following the finger while moving a seat */}
			{drag && (
				<div
					className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white px-3 py-1 text-sm font-semibold text-black shadow-lg"
					style={{ left: drag.x, top: drag.y }}
				>
					{game.seats[drag.from].name}
				</div>
			)}

			{/* Menu bar */}
			<div
				className="flex items-center justify-center gap-5"
				style={{ gridRow: layout.menuRow, gridColumn: "1 / span 2" }}
			>
				<button type="button" onClick={onHome} aria-label="Main menu" className={menuButton}>
					<RiHome4Line size={24} />
				</button>
				<button
					type="button"
					onClick={() => dispatch({ type: "undo" })}
					disabled={history.past.length === 0}
					aria-label="Undo"
					className={menuButton}
				>
					<RiArrowGoBackLine size={24} />
				</button>
				<button
					type="button"
					onClick={() => window.confirm("Restart the game? Life resets for everyone.") && dispatch({ type: "reset" })}
					aria-label="Restart"
					className={menuButton}
				>
					<RiRestartLine size={24} />
				</button>
				<button type="button" onClick={() => onEnd(game)} aria-label="End game" className={menuButton}>
					<RiFlagLine size={24} />
				</button>
				<button
					type="button"
					onClick={() => window.confirm("Exit and discard this game?") && onExit()}
					aria-label="Exit"
					className={menuButton}
				>
					<RiCloseLine size={24} />
				</button>
			</div>

			{/* Game over */}
			{gameOver && (
				<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-6">
					<div className="relative w-full max-w-xs space-y-4 rounded-2xl border border-border bg-surface p-5 text-center">
						<button
							type="button"
							onClick={() => setDismissedAt(game.eliminated.length)}
							aria-label="Close"
							className="absolute right-3 top-3 text-foreground/50 hover:text-foreground transition-colors"
						>
							<RiCloseLine size={20} />
						</button>
						<RiTrophyLine size={36} className="mx-auto text-accent" />
						<p className="text-xl font-bold">
							{alive.length === 1 ? `${game.seats[alive[0]].name} wins!` : "Game over"}
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => dispatch({ type: "undo" })}
								disabled={history.past.length === 0}
								className="flex-1 inline-flex items-center justify-center gap-1.5 rounded border border-border px-3 py-2 text-sm hover:bg-background transition-colors disabled:opacity-40"
							>
								<RiArrowGoBackLine size={16} />
								Undo
							</button>
							<button
								type="button"
								onClick={() => onEnd(game)}
								className="flex-1 rounded bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
							>
								See results
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
