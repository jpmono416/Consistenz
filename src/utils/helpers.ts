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

// Predefined colors for the color picker
export const enum COLORS {
    Blue = "#2196f3", // blue
    Red = "#f44336", // red
    Green = "#4caf50", // green
    Orange = "#ff9800", // orange
    Purple = "#9c27b0", // purple
    Brown = "#795548", // brown
    Gray = "#607d8b", // gray
    Pink = "#e91e63", // pink
    Teal = "#009688", // teal

    // Radial colors for habit statuses - these are used in helpers.getStatusColor
    Missed = "#950101", // crimson - missed
    Partial = "#E25E3E", // orange - partial
    Done = "#89AC46", // lime - done
    Extra = "#FCC737", // yellow - extra

    // Default colors for UI elements (not habit colours)
    DefaultBlack = '#FFFFFF19',
    NotNeeded = '#404258', // grey uncompleted non-required habits
}

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

