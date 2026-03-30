"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card-premium p-20 flex flex-col items-center justify-center text-text-muted">
      <Icon size={48} className="mb-4 text-surface-highest" />
      <p className="text-sm tracking-widest uppercase text-center font-display">
        {title}
      </p>
      {description && (
        <p className="text-[13px] text-text-muted mt-2 text-center max-w-md">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-6 py-2 rounded-lg font-display text-[12px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
