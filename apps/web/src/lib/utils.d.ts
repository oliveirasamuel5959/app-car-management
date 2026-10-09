/**
 * Type declarations for the JavaScript utility module (`lib/utils.js`).
 * Without this file TypeScript reports TS7016 for every `cn` import.
 */
export function cn(...inputs: unknown[]): string;
export function debounce<T extends (...args: never[]) => void>(fn: T, wait: number): T;
export function throttle<T extends (...args: never[]) => void>(fn: T, limit: number): T;
