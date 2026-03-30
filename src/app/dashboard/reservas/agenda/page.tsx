"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Reserva } from "@/lib/types";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Scissors,
  User,
  UserRound,
} from "lucide-react";

function obtenerFechaReserva(reserva: Reserva) {
  return parseISO(`${reserva.fecha}T${reserva.hora || "00:00"}:00`);
}

function obtenerClaveFecha(fecha: Date) {
  return format(fecha, "yyyy-MM-dd");
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerClasesEstado(estado: Reserva["estado"]) {
  switch (estado) {
    case "confirmada":
      return {
        tarjeta: "border-blue-500/25 bg-blue-500/8 hover:border-blue-400/35",
        hora: "border-blue-500/25 bg-blue-500/12 text-blue-300",
        estado: "border-blue-500/25 bg-blue-500/12 text-blue-300",
      };
    case "completada":
      return {
        tarjeta: "border-emerald-500/25 bg-emerald-500/8 hover:border-emerald-400/35",
        hora: "border-emerald-500/25 bg-emerald-500/12 text-emerald-300",
        estado: "border-emerald-500/25 bg-emerald-500/12 text-emerald-300",
      };
    case "cancelada":
      return {
        tarjeta: "border-red-500/25 bg-red-500/8 hover:border-red-400/35",
        hora: "border-red-500/25 bg-red-500/12 text-red-300",
        estado: "border-red-500/25 bg-red-500/12 text-red-300",
      };
    case "pendiente":
    default:
      return {
        tarjeta: "border-amber-500/25 bg-amber-500/8 hover:border-amber-400/35",
        hora: "border-amber-500/25 bg-amber-500/12 text-amber-300",
        estado: "border-amber-500/25 bg-amber-500/12 text-amber-300",
      };
  }
}

export default function AgendaReservasPage() {
  const { user, userRole, loading } = useAuth();
  const esAdmin = userRole?.role === "admin";

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mesActual, setMesActual] = useState(() => startOfMonth(new Date()));
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => new Date());

  const obtenerToken = useCallback(async () => {
    if (!user) {
      throw new Error("Debes iniciar sesión para ver la agenda.");
    }

    return user.getIdToken();
  }, [user]);

  const cargarReservas = useCallback(async () => {
    if (!user || !userRole) {
      setReservas([]);
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError("");
      const token = await obtenerToken();
      const respuesta = await fetch("/api/reservas", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "No se pudieron cargar las reservas.");
      }

      setReservas(Array.isArray(data.reservas) ? data.reservas : []);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Error al cargar la agenda.");
    } finally {
      setCargando(false);
    }
  }, [obtenerToken, user, userRole]);

  useEffect(() => {
    if (loading) {
      return;
    }

    void cargarReservas();
  }, [cargarReservas, loading]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const tiempo = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(tiempo);
  }, [error]);

  const reservasPorFecha = useMemo(() => {
    return reservas.reduce<Record<string, Reserva[]>>((acumulado, reserva) => {
      const clave = reserva.fecha;
      if (!acumulado[clave]) {
        acumulado[clave] = [];
      }

      acumulado[clave].push(reserva);
      return acumulado;
    }, {});
  }, [reservas]);

  const diasCalendario = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesActual), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mesActual), { weekStartsOn: 1 });

    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mesActual]);

  const reservasDiaSeleccionado = useMemo(() => {
    const clave = obtenerClaveFecha(diaSeleccionado);
    const reservasDia = reservasPorFecha[clave] || [];

    return [...reservasDia].sort((a, b) =>
      obtenerFechaReserva(a).getTime() - obtenerFechaReserva(b).getTime()
    );
  }, [diaSeleccionado, reservasPorFecha]);

  const resumenMes = useMemo(() => {
    const inicio = startOfMonth(mesActual);
    const fin = endOfMonth(mesActual);

    let diasConReservas = 0;
    let totalReservas = 0;

    for (let dia = inicio; dia <= fin; dia = addDays(dia, 1)) {
      const clave = obtenerClaveFecha(dia);
      const cantidad = reservasPorFecha[clave]?.length || 0;
      if (cantidad > 0) {
        diasConReservas += 1;
        totalReservas += cantidad;
      }
    }

    return { diasConReservas, totalReservas };
  }, [mesActual, reservasPorFecha]);

  const cambiarMes = (direccion: "anterior" | "siguiente") => {
    const nuevoMes =
      direccion === "anterior" ? subMonths(mesActual, 1) : addMonths(mesActual, 1);

    setMesActual(nuevoMes);

    if (!isSameMonth(diaSeleccionado, nuevoMes)) {
      setDiaSeleccionado(startOfMonth(nuevoMes));
    }
  };

  const seleccionarDia = (dia: Date) => {
    setDiaSeleccionado(dia);

    if (!isSameMonth(dia, mesActual)) {
      setMesActual(startOfMonth(dia));
    }
  };

  if (loading || (cargando && !reservas.length && !error)) {
    return (
      <div className="card-premium p-20 flex flex-col items-center justify-center text-text-muted">
        <Loader2 size={32} className="animate-spin text-primary mb-4" />
        <p className="text-sm tracking-widest uppercase">Cargando agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary/80">
            Agenda de reservas
          </p>
          <h1 className="font-display text-3xl uppercase tracking-[0.18em] text-white">
            {capitalizar(format(mesActual, "MMMM yyyy", { locale: es }))}
          </h1>
          <p className="text-sm text-text-muted">
            Visualiza las reservas por día y revisa el detalle horario.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="card-premium px-4 py-3 min-w-[150px]">
            <p className="text-[10px] uppercase tracking-[0.25em] text-text-muted">
              Días ocupados
            </p>
            <p className="mt-2 font-display text-2xl text-white">
              {resumenMes.diasConReservas}
            </p>
          </div>
          <div className="card-premium px-4 py-3 min-w-[150px]">
            <p className="text-[10px] uppercase tracking-[0.25em] text-text-muted">
              Reservas del mes
            </p>
            <p className="mt-2 font-display text-2xl text-white">
              {resumenMes.totalReservas}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
        <section className="card-premium p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted">
                Vista mensual
              </p>
              <h2 className="mt-2 font-display text-xl uppercase tracking-[0.15em] text-white">
                {capitalizar(format(mesActual, "MMMM yyyy", { locale: es }))}
              </h2>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => cambiarMes("anterior")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-surface-high text-text-secondary transition-all hover:border-primary/30 hover:text-white"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setMesActual(startOfMonth(new Date()))}
                className="rounded-md border border-white/10 bg-surface-high px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary transition-all hover:border-primary/30 hover:text-white"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => cambiarMes("siguiente")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-surface-high text-text-secondary transition-all hover:border-primary/30 hover:text-white"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => (
              <div
                key={dia}
                className="px-2 pb-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted"
              >
                {dia}
              </div>
            ))}

            {diasCalendario.map((dia) => {
              const claveFecha = obtenerClaveFecha(dia);
              const reservasDia = reservasPorFecha[claveFecha] || [];
              const estaSeleccionado = isSameDay(dia, diaSeleccionado);
              const esHoy = isSameDay(dia, new Date());
              const perteneceAlMes = isSameMonth(dia, mesActual);

              const tieneReservas = reservasDia.length > 0;

              return (
                <button
                  key={claveFecha}
                  type="button"
                  onClick={() => seleccionarDia(dia)}
                  className={`min-h-[108px] rounded-xl border p-3 text-left transition-all ${
                    estaSeleccionado
                      ? "border-primary bg-primary/10 shadow-red-glow"
                      : tieneReservas
                        ? "border-emerald-500/35 bg-emerald-500/10 hover:border-emerald-400/45 hover:bg-emerald-500/15"
                        : perteneceAlMes
                          ? "border-white/8 bg-surface-high/60 hover:border-primary/30 hover:bg-surface-high"
                          : "border-white/5 bg-void/20 text-text-muted/60 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        esHoy
                          ? "bg-primary text-white"
                          : tieneReservas
                            ? "bg-emerald-500 text-white"
                            : estaSeleccionado
                              ? "bg-white/10 text-white"
                              : perteneceAlMes
                                ? "bg-white/5 text-text-primary"
                                : "bg-transparent text-text-muted"
                      }`}
                    >
                      {format(dia, "d")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="card-premium p-4 sm:p-6">
          <div className="border-b border-white/5 pb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted">
              Detalle del día
            </p>
            <h2 className="mt-2 font-display text-xl uppercase tracking-[0.15em] text-white">
              {capitalizar(format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es }))}
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              {reservasDiaSeleccionado.length > 0
                ? `${reservasDiaSeleccionado.length} reserva${reservasDiaSeleccionado.length > 1 ? "s" : ""} programada${reservasDiaSeleccionado.length > 1 ? "s" : ""}.`
                : "No hay reservas registradas para este día."}
            </p>
          </div>

          <div className="mt-6">
            {reservasDiaSeleccionado.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-void/20 px-6 py-10 text-center">
                <CalendarDays size={34} className="mx-auto mb-4 text-surface-highest" />
                <p className="text-sm uppercase tracking-widest text-text-muted">
                  Día sin reservas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reservasDiaSeleccionado.map((reserva) => {
                  const clasesEstado = obtenerClasesEstado(reserva.estado);

                  return (
                  <div
                    key={reserva.id}
                    className={`rounded-2xl border p-4 transition-all ${clasesEstado.tarjeta}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold tracking-widest ${clasesEstado.hora}`}
                      >
                        <Clock size={15} />
                        {reserva.hora}
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${clasesEstado.estado}`}
                      >
                        {reserva.estado}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-start gap-3 text-sm">
                        <User size={16} className="mt-0.5 text-primary/80" />
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                            Cliente
                          </p>
                          <p className="text-text-primary">{reserva.clienteNombre}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-sm">
                        <Scissors size={16} className="mt-0.5 text-primary/80" />
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                            Servicio
                          </p>
                          <p className="text-text-primary">{reserva.serviceName}</p>
                        </div>
                      </div>

                      {esAdmin && (
                        <div className="flex items-start gap-3 text-sm">
                          <UserRound size={16} className="mt-0.5 text-primary/80" />
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                              Barbero
                            </p>
                            <p className="text-text-primary">{reserva.barberName}</p>
                          </div>
                        </div>
                      )}

                      {reserva.notas && (
                        <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-text-muted">
                          {reserva.notas}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
