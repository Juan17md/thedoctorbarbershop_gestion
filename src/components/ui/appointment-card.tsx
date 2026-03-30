"use client";

import { User, CalendarDays, Clock, X, Check } from "lucide-react";

type AppointmentStatus = "pendiente" | "confirmada" | "completada" | "cancelada";

interface AppointmentCardProps {
  id: string;
  clientName: string;
  clientPhone: string;
  barber: string;
  date: string;
  time: string;
  service: string;
  status: AppointmentStatus;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  onComplete?: (id: string) => void;
}

const statusConfig: Record<AppointmentStatus, { bg: string; color: string; label: string }> = {
  pendiente: { bg: "bg-yellow-500/10", color: "text-yellow-500", label: "Pendiente" },
  confirmada: { bg: "bg-blue-500/10", color: "text-blue-400", label: "Confirmada" },
  completada: { bg: "bg-green-500/10", color: "text-green-500", label: "Completada" },
  cancelada: { bg: "bg-red-500/10", color: "text-red-500", label: "Cancelada" },
};

export default function AppointmentCard({
  id,
  clientName,
  clientPhone,
  barber,
  date,
  time,
  service,
  status,
  onConfirm,
  onCancel,
  onComplete,
}: AppointmentCardProps) {
  const config = statusConfig[status] || statusConfig.pendiente;

  return (
    <div className="card-premium overflow-hidden group">
      <div className={`px-4 py-2 ${config.bg} border-b border-white/5 flex items-center justify-between`}>
        <span className={`font-display text-[11px] font-bold tracking-[0.2em] uppercase ${config.color}`}>
          {config.label}
        </span>
        <span className="text-[10px] text-text-muted tracking-wider">
          #{id.slice(0, 8)}
        </span>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-lg border border-primary/20">
            {clientName?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary tracking-wide">{clientName}</p>
            <p className="text-[11px] text-text-muted">{clientPhone}</p>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-[13px]">
            <User size={14} className="text-primary/70" />
            <span className="text-text-secondary">
              Barbero: <span className="text-text-primary font-medium">{barber}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <CalendarDays size={14} className="text-text-muted" />
            <span className="text-text-secondary">{date}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <Clock size={14} className="text-text-muted" />
            <span className="text-text-secondary">{time}</span>
          </div>
          <div className="pt-2">
            <span className="font-display text-[11px] px-2 py-1 rounded bg-surface-highest text-text-primary uppercase font-bold tracking-widest border border-white/5">
              {service}
            </span>
          </div>
        </div>
      </div>

      {status === "pendiente" && (
        <div className="p-4 border-t border-white/5 flex gap-2 bg-void/30">
          {onConfirm && (
            <button
              onClick={() => onConfirm(id)}
              className="flex-1 py-2 rounded-md font-display text-[12px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
            >
              Confirmar
            </button>
          )}
          {onCancel && (
            <button
              onClick={() => onCancel(id)}
              className="py-2 px-3 rounded-md text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {status === "confirmada" && onComplete && (
        <div className="p-4 border-t border-white/5 bg-void/30">
          <button
            onClick={() => onComplete(id)}
            className="w-full py-2 rounded-md font-display text-[12px] font-bold uppercase tracking-widest bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all shadow-sm"
          >
            <Check size={14} className="inline mr-1" />
            Completar
          </button>
        </div>
      )}
    </div>
  );
}
