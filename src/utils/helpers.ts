import {
    getDaysInMonth,
    format,
    startOfMonth,
    getDay,
} from 'date-fns';

/* ------------------------------------------------------------------ */
/* ---------------------------   TYPES   ---------------------------- */
/* ------------------------------------------------------------------ */
export type Status = 'done' | 'partial' | 'missed' | 'extra' | 'notNeeded' | null;

export interface MonthDetails {
    year: number;
    /** 0 = January … 11 = December */
    month: number;
    /** "YYYY‑MM" key used in storage */
    monthKey: string;
    daysInMonth: number;
    /** 0 = Sunday … 6 = Saturday (date‑fns convention) */
    firstDayWeekday: number;
    /** Convenience helper */
    getDayName: (dayOfMonth: number) => string;
}

// Predefined colors for the color picker.
// IMPORTANT: this must be a regular object (or non-const enum) — the values
// are iterated at runtime via `Object.entries(COLORS)` in HabitForm. A
// `const enum` is inlined at compile time and would iterate as empty.
export const COLORS = {
    Blue: "#2196f3",
    Red: "#f44336",
    Green: "#4caf50",
    Orange: "#ff9800",
    Purple: "#9c27b0",
    Brown: "#795548",
    Gray: "#607d8b",
    Pink: "#e91e63",
    Teal: "#009688",

    // Radial colors for habit statuses - used by helpers.getStatusColor
    Missed: "#950101",
    Partial: "#E25E3E",
    Done: "#89AC46",
    Extra: "#FCC737",

    // Default colors for UI elements (not habit colours)
    DefaultBlack: "#FFFFFF19",
    NotNeeded: "#404258",
} as const;

export type ColorName = keyof typeof COLORS;

/* ------------------------------------------------------------------ */
/* ------------------------   IMPLEMENTATION   ---------------------- */
/* ------------------------------------------------------------------ */
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Returns metadata for the given month (used by UI & storage) */
export const getMonthDetails = (date: Date): MonthDetails => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0‑indexed
    const monthKey = format(date, 'yyyy-MM');
    const daysInMonth = getDaysInMonth(date);
    const firstDayWeekday = getDay(startOfMonth(date)); // 0‑Sun … 6‑Sat

    return {
        year,
        month,
        monthKey,
        daysInMonth,
        firstDayWeekday,
        getDayName: (day) => {
            // day = 1..daysInMonth
            const idx = (firstDayWeekday + day - 1) % 7;
            return WEEKDAY_NAMES[idx];
        },
    };
};

/** Maps a Status to a display colour */
export const getStatusColor = (status: Status): string => {
    switch (status) {
        case 'done':
            return COLORS.Done;
        case 'partial':
            return COLORS.Partial;
        case 'missed':
            return COLORS.Missed;
        case 'extra':
            return COLORS.Extra;
        case 'notNeeded':
            return COLORS.NotNeeded;
        default:
            return COLORS.DefaultBlack;
    }
};

