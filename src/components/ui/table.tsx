import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        "w-full caption-bottom border-separate border-spacing-0 text-sm overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "[&_tr]:border-b-0 sticky top-0 z-10 backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "group transition-all duration-300",
        "odd:[&_td]:bg-white/[0.015] even:[&_td]:bg-transparent hover:[&_td]:bg-white/[0.03]",
        className
      )}
      {...props}
    />
  );
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "center" | "right";
}

/** Cabecera de columna con alto contraste (título legible sobre fondo oscuro). */
export function TableHead({ className, align = "left", ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-4 py-4 sm:px-6 sm:py-4 align-middle font-display text-xs sm:text-sm font-extrabold uppercase tracking-[0.12em]",
        "text-white bg-linear-to-r from-surface-high via-surface-high/95 to-surface-high/80",
        "border-b border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl whitespace-normal md:whitespace-nowrap",
        "first:rounded-tl-xl last:rounded-tr-xl",
        align === "center" && "text-center",
        align === "right" && "text-right",
        align === "left" && "text-left",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-4 py-4 sm:px-6 align-middle text-[15px] text-text-secondary",
        "bg-transparent group-hover:bg-white/[0.015] transition-colors duration-300",
        className
      )}
      {...props}
    />
  );
}
