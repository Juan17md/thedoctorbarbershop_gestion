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

export function getWeekRangeFromOffset(offset: number = 0): {
  inicio: string;
  fin: string;
  label: string;
} {
  const ahora = new Date();
  const fechaCaracas = new Date(
    ahora.toLocaleString("en-US", { timeZone: "America/Caracas" })
  );

  // Calcular el domingo de la semana actual y aplicar offset
  const diaSemana = fechaCaracas.getDay(); // 0 = Domingo
  const domingo = new Date(fechaCaracas);
  domingo.setDate(fechaCaracas.getDate() - diaSemana + offset * 7);

  const sabado = new Date(domingo);
  sabado.setDate(domingo.getDate() + 6);

  const inicio = getLocalDateString(domingo);
  const fin = getLocalDateString(sabado);

  // Formatear label: "06 Abr – 12 Abr 2026"
  const meses = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  const partesInicio = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(domingo);

  const partesFin = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(sabado);

  const diaInicio = partesInicio.find((p) => p.type === "day")?.value;
  const mesInicio =
    parseInt(partesInicio.find((p) => p.type === "month")?.value || "1") - 1;
  const diaFin = partesFin.find((p) => p.type === "day")?.value;
  const mesFin =
    parseInt(partesFin.find((p) => p.type === "month")?.value || "1") - 1;
  const anioFin = partesFin.find((p) => p.type === "year")?.value;

  const label = `${diaInicio} ${meses[mesInicio]} – ${diaFin} ${meses[mesFin]} ${anioFin}`;

  return { inicio, fin, label };
}
