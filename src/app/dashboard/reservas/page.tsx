"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CalendarDays, Clock, User, Check, X, Loader2 } from "lucide-react";

interface Reserva {
  id: string;
  barbero: string;
  servicio: string;
  fecha: string;
  hora: string;
  cliente_nombre: string;
  cliente_telefono: string;
  estado: string;
  creadoAt: unknown;
}

export default function ReservasDashboardPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  useEffect(() => {
    const q = query(collection(db, "reservas"), orderBy("creadoAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Reserva[];
      setReservas(datos);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await updateDoc(doc(db, "reservas", id), { estado: nuevoEstado });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  const reservasFiltradas =
    filtroEstado === "todos"
      ? reservas
      : reservas.filter((r) => r.estado === filtroEstado);

  const conteo = {
    todos: reservas.length,
    pendiente: reservas.filter((r) => r.estado === "pendiente").length,
    confirmada: reservas.filter((r) => r.estado === "confirmada").length,
    completada: reservas.filter((r) => r.estado === "completada").length,
    cancelada: reservas.filter((r) => r.estado === "cancelada").length,
  };

  const estadoConfig: Record<string, { color: string; bg: string; border: string }> = {
    pendiente: { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    confirmada: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
    completada: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    cancelada: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-urban-header text-text-primary">
          AGENDA DE <span className="text-primary">CITAS</span>
        </h1>
        <p className="text-text-muted mt-2 text-sm leading-relaxed max-w-xl">
          Visualiza y gestiona las reservas realizadas desde la landing page en
          tiempo real.
        </p>
      </div>

      {/* Filtros por Estado */}
      <div className="flex flex-wrap gap-2">
        {(["todos", "pendiente", "confirmada", "completada", "cancelada"] as const).map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`px-4 py-2 rounded-md font-display text-[13px] font-bold tracking-widest uppercase transition-all border ${
              filtroEstado === estado
                ? "bg-primary/15 text-white border-primary shadow-red-glow"
                : "bg-surface-high text-text-secondary border-white/5 hover:border-primary/30 hover:text-white"
            }`}
          >
            {estado} <span className="opacity-50 ml-1 font-body text-[10px]">({conteo[estado]})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {cargando ? (
        <div className="card-premium p-20 flex flex-col items-center justify-center text-text-muted">
          <Loader2 size={32} className="animate-spin text-primary mb-4" />
          <p className="text-sm tracking-widest uppercase">Cargando Agenda...</p>
        </div>
      ) : reservasFiltradas.length === 0 ? (
        <div className="card-premium p-20 flex flex-col items-center justify-center text-text-muted">
          <CalendarDays size={48} className="mb-4 text-surface-highest" />
          <p className="text-sm tracking-widest uppercase text-center">No hay reservas {filtroEstado !== "todos" ? `con estado "${filtroEstado}"` : "registradas"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {reservasFiltradas.map((reserva) => {
            const config = estadoConfig[reserva.estado] || estadoConfig.pendiente;
            return (
              <div key={reserva.id} className="card-premium overflow-hidden group">
                {/* Estado Top Bar */}
                <div className={`px-4 py-2 ${config.bg} border-b border-white/5 flex items-center justify-between`}>
                  <span className={`font-display text-[11px] font-bold tracking-[0.2em] uppercase ${config.color}`}>
                    {reserva.estado}
                  </span>
                  <span className="text-[10px] text-text-muted tracking-wider">
                    #{reserva.id.slice(0, 8)}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  {/* Cliente */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-lg border border-primary/20">
                      {reserva.cliente_nombre?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary tracking-wide">{reserva.cliente_nombre}</p>
                      <p className="text-[11px] text-text-muted">{reserva.cliente_telefono}</p>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="space-y-2 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[13px]">
                      <User size={14} className="text-primary/70" />
                      <span className="text-text-secondary">
                        Barbero: <span className="text-text-primary font-medium">{reserva.barbero}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <CalendarDays size={14} className="text-text-muted" />
                      <span className="text-text-secondary">{reserva.fecha}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <Clock size={14} className="text-text-muted" />
                      <span className="text-text-secondary">{reserva.hora}</span>
                    </div>
                    <div className="pt-2">
                      <span className="font-display text-[11px] px-2 py-1 rounded bg-surface-highest text-text-primary uppercase font-bold tracking-widest border border-white/5">
                        {reserva.servicio}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                {reserva.estado === "pendiente" && (
                  <div className="p-4 border-t border-white/5 flex gap-2 bg-void/30">
                    <button
                      onClick={() => cambiarEstado(reserva.id, "confirmada")}
                      className="flex-1 py-2 rounded-md font-display text-[12px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => cambiarEstado(reserva.id, "cancelada")}
                      className="py-2 px-3 rounded-md text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {reserva.estado === "confirmada" && (
                  <div className="p-4 border-t border-white/5 bg-void/30">
                    <button
                      onClick={() => cambiarEstado(reserva.id, "completada")}
                      className="w-full py-2 rounded-md font-display text-[12px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Check size={14} /> Marcar como Completada
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
