"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "border-white/5 bg-surface-high/50",
  primary: "border-primary/20 bg-primary/5",
  success: "border-green-500/20 bg-green-500/5",
  warning: "border-yellow-500/20 bg-yellow-500/5",
  danger: "border-red-500/20 bg-red-500/5",
};

const iconVariantStyles = {
  default: "text-text-muted bg-white/5",
  primary: "text-primary bg-primary/10",
  success: "text-green-500 bg-green-500/10",
  warning: "text-yellow-500 bg-yellow-500/10",
  danger: "text-red-500 bg-red-500/10",
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden p-5 rounded-2xl border backdrop-blur-xl
        transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
        ${variantStyles[variant]}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1">
            {title}
          </p>
          <p className="text-3xl font-display font-bold text-white tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-text-muted text-sm mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-sm font-medium mt-2 flex items-center gap-1 ${
                trend.isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-text-muted font-normal">vs mes anterior</span>
            </p>
          )}
        </div>
        <div
          className={`
            p-3 rounded-xl ${iconVariantStyles[variant]}
          `}
        >
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
