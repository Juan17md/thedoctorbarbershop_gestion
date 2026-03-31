import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getLocalDateString(date: Date = new Date()): string {
  // Aseguramos el formato YYYY-MM-DD para America/Caracas sin depender de en-CA
  const d = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = d.find(p => p.type === "year")?.value;
  const month = d.find(p => p.type === "month")?.value;
  const day = d.find(p => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function getStartOfWeekString(date: Date = new Date()): string {
  // Encontrar el domingo anterior usando la hora de Venezuela de forma robusta
  const caracasDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Caracas" }));
  const diff = caracasDate.getDay(); // 0 es Domingo
  const sunday = new Date(caracasDate);
  sunday.setDate(caracasDate.getDate() - diff);
  return getLocalDateString(sunday);
}


export function getStartOfMonthString(date: Date = new Date()): string {
  const result = getLocalDateString(date);
  return `${result.substring(0, 7)}-01`;
}
