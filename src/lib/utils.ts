import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getLocalDateString(date: Date = new Date()): string {
  // ISO-8601 format (YYYY-MM-DD) for America/Caracas
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getStartOfWeekString(date: Date = new Date()): string {
  // Encontrar el domingo anterior usando la hora de Venezuela
  const offsetDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Caracas" }));
  const diff = offsetDate.getDay(); // 0 es Domingo
  const sunday = new Date(offsetDate);
  sunday.setDate(offsetDate.getDate() - diff);
  return getLocalDateString(sunday);
}

export function getStartOfMonthString(date: Date = new Date()): string {
  const result = getLocalDateString(date);
  return `${result.substring(0, 7)}-01`;
}
