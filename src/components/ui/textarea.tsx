"use client"

import { cn } from "@/lib/utils"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <div>
      <textarea
        className={cn(
          "flex w-full bg-surface-high border rounded-lg px-4 py-3 text-text-primary placeholder-text-muted",
          "transition-all duration-300 outline-none resize-none",
          "focus:border-primary/50 focus:ring-2 focus:ring-primary/10",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error
            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10"
            : "border-border-subtle",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}