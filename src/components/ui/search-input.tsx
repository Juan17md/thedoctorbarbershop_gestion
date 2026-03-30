"use client";

import { Search, X } from "lucide-react";
import { ChangeEvent } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = "Buscar..." }: SearchInputProps) {
  return (
    <div className="group relative">
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-r from-white/[0.02] via-transparent to-primary/[0.03] opacity-70 transition-opacity duration-300 group-focus-within:opacity-100" />
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/80 pointer-events-none transition-colors duration-300 group-focus-within:text-primary"
      />
      <input
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        className="relative w-full rounded-xl border border-white/10 bg-void/70 pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-text-muted/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm outline-none transition-all duration-300 font-body hover:border-white/15 hover:bg-void/80 focus:border-primary/50 focus:bg-void/85 focus:shadow-[0_0_0_1px_rgba(239,68,68,0.18),0_0_24px_rgba(239,68,68,0.08)]"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/8 bg-white/[0.03] p-1.5 text-text-muted transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
