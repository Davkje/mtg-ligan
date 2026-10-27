// Pure state + helpers for the in-app life counter (/play). No React here.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;
export const STARTING_LIFE_OPTIONS = [20, 25, 30, 40, 60] as const;
export const COMMANDER_DAMAGE_LETHAL = 21;

// Darkish tones so white text stays readable
export const PLAYER_COLORS = [
	"#b4532a",
	"#2b5fb4",
	"#2f8a4e",
	"#7b3fb0",
	"#b0303f",
	"#1f8a8f",
	"#a5801f",
	"#b03a7f",
] as const;

export type GameSettings = {
	startingLife: number;
	autoKo: boolean;
	cmdDamageLifeLoss: boolean;
};

export type Seat = {
	// "" when the player isn't in the DB yet (typed-in name) — created on registration
	playerId: string;
	name: string;
	// null when there's no commander, or it isn't in the DB yet (created on registration)
	commanderId: string | null;
	// Display name — also used to look up commander art
	commanderName: string | null;
	color: string;
	// Show commander art as the panel background instead of the color
	useArt: boolean;
};

export function isNewPlayer(seat: Seat): boolean {
	return !seat.playerId;
}

export function isNewCommander(seat: Seat): boolean {
	return !!seat.commanderName && !seat.commanderId;
}

export type GameState = {
	leagueId: string | null;
	settings: GameSettings;
	seats: Seat[];
	life: number[];
	// cmdDamage[target][source] — damage dealt to `target` by `source`'s commander
	cmdDamage: number[][];
	// Seat indices in the order they were knocked out
	eliminated: number[];
	startedAt: string;
};

export type GameAction =
	| { type: "adjustLife"; seat: number; delta: number }
	| { type: "adjustCmdDamage"; target: number; source: number; delta: number }
	| { type: "concede"; seat: number }
	| { type: "revive"; seat: number }
	| { type: "updateSeat"; seat: number; patch: Partial<Seat> }
	| { type: "swapSeats"; a: number; b: number }
	| { type: "reset" };

export function createGame(leagueId: string | null, settings: GameSettings, seats: Seat[]): GameState {
	return {
		leagueId,
		settings,
		seats,
		life: seats.map(() => settings.startingLife),
		cmdDamage: seats.map(() => seats.map(() => 0)),
		eliminated: [],
		startedAt: new Date().toISOString(),
	};
}

// Drives the pulsing panel glow: under half / under a quarter of starting life, or well above it
export type LifeLevel = "low" | "critical" | "high" | null;

export function lifeLevel(life: number, startingLife: number): LifeLevel {
	if (life < startingLife / 4) return "critical";
	if (life < startingLife / 2) return "low";
	if (life > startingLife * 1.5) return "high";
	return null;
}

function isDead(state: GameState, seat: number): boolean {
	return (
		state.life[seat] <= 0 || state.cmdDamage[seat].some((d) => d >= COMMANDER_DAMAGE_LETHAL)
	);
}

function withAutoKo(state: GameState, seat: number): GameState {
	if (!state.settings.autoKo || state.eliminated.includes(seat) || !isDead(state, seat)) return state;
	return { ...state, eliminated: [...state.eliminated, seat] };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
	switch (action.type) {
		case "adjustLife": {
			if (state.eliminated.includes(action.seat)) return state;
			const life = [...state.life];
			life[action.seat] += action.delta;
			return withAutoKo({ ...state, life }, action.seat);
		}
		case "adjustCmdDamage": {
			const { target, source, delta } = action;
			if (state.eliminated.includes(target)) return state;
			const current = state.cmdDamage[target][source];
			const next = Math.max(0, current + delta);
			const applied = next - current;
			if (applied === 0) return state;
			const cmdDamage = state.cmdDamage.map((row, i) =>
				i === target ? row.map((d, j) => (j === source ? next : d)) : row,
			);
			const life = state.settings.cmdDamageLifeLoss
				? state.life.map((l, i) => (i === target ? l - applied : l))
				: state.life;
			return withAutoKo({ ...state, cmdDamage, life }, target);
		}
		case "concede":
			if (state.eliminated.includes(action.seat)) return state;
			return { ...state, eliminated: [...state.eliminated, action.seat] };
		case "revive": {
			const eliminated = state.eliminated.filter((s) => s !== action.seat);
			// Bring a player revived at 0 life back to 1 so they aren't instantly dead again
			const life = state.life.map((l, i) => (i === action.seat && l <= 0 ? 1 : l));
			return { ...state, eliminated, life };
		}
		case "updateSeat":
			return {
				...state,
				seats: state.seats.map((s, i) => (i === action.seat ? { ...s, ...action.patch } : s)),
			};
		case "swapSeats": {
			// Swap everything tied to the two positions (seat info, life, damage in both directions, KOs)
			const { a, b } = action;
			if (a === b) return state;
			const p = (i: number) => (i === a ? b : i === b ? a : i);
			return {
				...state,
				seats: state.seats.map((_, i) => state.seats[p(i)]),
				life: state.life.map((_, i) => state.life[p(i)]),
				cmdDamage: state.cmdDamage.map((row, i) => row.map((_, j) => state.cmdDamage[p(i)][p(j)])),
				eliminated: state.eliminated.map(p),
			};
		}
		case "reset":
			return createGame(state.leagueId, state.settings, state.seats);
	}
}

// Undo support — keeps a bounded stack of previous states
const UNDO_LIMIT = 50;

export type GameHistory = { current: GameState; past: GameState[] };

export type HistoryAction = GameAction | { type: "undo" } | { type: "load"; game: GameState };

export function historyReducer(history: GameHistory, action: HistoryAction): GameHistory {
	if (action.type === "load") return { current: action.game, past: [] };
	if (action.type === "undo") {
		const prev = history.past[history.past.length - 1];
		return prev ? { current: prev, past: history.past.slice(0, -1) } : history;
	}
	const next = gameReducer(history.current, action);
	if (next === history.current) return history;
	return { current: next, past: [...history.past, history.current].slice(-UNDO_LIMIT) };
}

export function aliveSeats(state: GameState): number[] {
	return state.seats.map((_, i) => i).filter((i) => !state.eliminated.includes(i));
}

// Placement per seat: players still alive rank by life (ties share a placement),
// knocked-out players rank in reverse order of elimination (first out = last place).
export function computePlacements(state: GameState): number[] {
	const alive = aliveSeats(state).sort((a, b) => state.life[b] - state.life[a]);
	const placements = new Array<number>(state.seats.length).fill(0);

	alive.forEach((seat, i) => {
		const prev = alive[i - 1];
		placements[seat] = prev !== undefined && state.life[prev] === state.life[seat] ? placements[prev] : i + 1;
	});

	const knockedOut = [...state.eliminated].reverse();
	knockedOut.forEach((seat, i) => {
		placements[seat] = alive.length + i + 1;
	});
	return placements;
}

// Fixed layout per player count. The menu bar sits in its own grid row.
export type SeatLayout = { row: number; col: number; colSpan: 1 | 2; rotation: 0 | 90 | 180 | 270 };
export type BoardLayout = { rows: string; menuRow: number; seats: SeatLayout[] };

export const LAYOUTS: Record<number, BoardLayout> = {
	2: {
		rows: "1fr auto 1fr",
		menuRow: 2,
		seats: [
			{ row: 1, col: 1, colSpan: 2, rotation: 180 },
			{ row: 3, col: 1, colSpan: 2, rotation: 0 },
		],
	},
	3: {
		rows: "1fr auto 1.5fr",
		menuRow: 2,
		seats: [
			{ row: 1, col: 1, colSpan: 2, rotation: 180 },
			{ row: 3, col: 1, colSpan: 1, rotation: 90 },
			{ row: 3, col: 2, colSpan: 1, rotation: 270 },
		],
	},
	4: {
		rows: "1fr auto 1fr",
		menuRow: 2,
		seats: [
			{ row: 1, col: 1, colSpan: 1, rotation: 90 },
			{ row: 1, col: 2, colSpan: 1, rotation: 270 },
			{ row: 3, col: 1, colSpan: 1, rotation: 90 },
			{ row: 3, col: 2, colSpan: 1, rotation: 270 },
		],
	},
	5: {
		rows: "1fr auto 1fr 1fr",
		menuRow: 2,
		seats: [
			{ row: 1, col: 1, colSpan: 2, rotation: 180 },
			{ row: 3, col: 1, colSpan: 1, rotation: 90 },
			{ row: 3, col: 2, colSpan: 1, rotation: 270 },
			{ row: 4, col: 1, colSpan: 1, rotation: 90 },
			{ row: 4, col: 2, colSpan: 1, rotation: 270 },
		],
	},
};

// ── localStorage ────────────────────────────────────────────────────────────

const GAME_KEY = "ligan:play:game";
const DRAFT_KEY = "ligan:play:draft";
const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

// Raw string so it can be used as a stable useSyncExternalStore snapshot
export function readSavedGameRaw(): string | null {
	try {
		return localStorage.getItem(GAME_KEY);
	} catch {
		return null;
	}
}

export function saveGame(game: GameState | null) {
	try {
		if (game) localStorage.setItem(GAME_KEY, JSON.stringify(game));
		else localStorage.removeItem(GAME_KEY);
	} catch {
		// Storage unavailable (private mode etc.) — the game just won't survive a reload
	}
}

export type RegisterDraft = {
	leagueId: string | null;
	playedAt: string;
	entries: Array<{
		// playerId is null for a new player; playerName is then set
		playerId: string | null;
		playerName: string | null;
		placement: number;
		commanderId: string | null;
		commanderName: string | null;
	}>;
	createdAt: number;
};

export function saveRegisterDraft(draft: Omit<RegisterDraft, "createdAt">) {
	try {
		localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, createdAt: Date.now() }));
	} catch {
		// ignore
	}
}

export function readRegisterDraft(): RegisterDraft | null {
	try {
		const raw = localStorage.getItem(DRAFT_KEY);
		if (!raw) return null;
		const draft = JSON.parse(raw) as RegisterDraft;
		if (Date.now() - draft.createdAt > DRAFT_MAX_AGE_MS) {
			localStorage.removeItem(DRAFT_KEY);
			return null;
		}
		return draft;
	} catch {
		return null;
	}
}

export function clearRegisterDraft() {
	try {
		localStorage.removeItem(DRAFT_KEY);
	} catch {
		// ignore
	}
}
