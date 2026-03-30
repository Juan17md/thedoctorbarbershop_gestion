"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { SERVICES, type Reserva, type ReservaEstado, type Service } from "@/lib/types";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { DatePicker } from "@/components/ui/date-picker";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import {
  CalendarDays,
  Check,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";

interface BarberoOpcion {
  uid: string;
  name: string;
  role: "admin" | "barber";
}

interface FormularioReserva {
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  fecha: string;
  hora: string;
  clienteNombre: string;
  clienteTelefono: string;
  estado: ReservaEstado;
  notas: string;
}

const ESTADOS_FILTRO: Array<"todos" | ReservaEstado> = [
  "todos",
  "pendiente",
  "confirmada",
  "completada",
  "cancelada",
];

const ESTADOS_RESERVA: ReservaEstado[] = [
  "pendiente",
  "confirmada",
  "completada",
  "cancelada",
];

const HORAS_RESERVA = [
  "09:00",
  "09:45",
  "10:30",
  "11:15",
  "12:00",
  "12:45",
  "13:30",
  "14:15",
  "15:00",
  "15:45",
  "16:30",
  "17:15",
  "18:00",
];

const estadoConfig: Record<
  ReservaEstado,
  { color: string; bg: string; border: string; boton?: string }
> = {
  pendiente: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  confirmada: {
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
  },
  completada: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  cancelada: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
};

function obtenerNombreBarbero(
  barberos: BarberoOpcion[],
  barberId: string,
  nombreFallback: string
) {
  return (
    barberos.find((barbero) => barbero.uid === barberId)?.name ||
    nombreFallback ||
    "Barbero"
  );
}

function obtenerNombreServicio(
  servicios: Service[],
  serviceId: string,
  nombreFallback: string
) {
  return (
    servicios.find((servicio) => servicio.id === serviceId)?.name ||
    nombreFallback ||
    "Servicio"
  );
}

function crearFormularioInicial(): FormularioReserva {
  return {
    barberId: "",
    barberName: "",
    serviceId: "",
    serviceName: "",
    fecha: "",
    hora: "",
    clienteNombre: "",
    clienteTelefono: "",
    estado: "pendiente",
    notas: "",
  };
}

export default function ReservasDashboardPage() {
  const { user, userRole, loading } = useAuth();
  const esAdmin = userRole?.role === "admin";

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [barberos, setBarberos] = useState<BarberoOpcion[]>([]);
  const [servicios, setServicios] = useState<Service[]>(SERVICES);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | ReservaEstado>("todos");
  const [error, setError] = useState<string>("");
  const [mensaje, setMensaje] = useState<string>("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoFormulario, setModoFormulario] = useState<"crear" | "editar">("crear");
  const [reservaEditandoId, setReservaEditandoId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<FormularioReserva>(crearFormularioInicial());

  useEffect(() => {
    const tiempo = setTimeout(() => {
      if (mensaje) {
        setMensaje("");
      }
    }, 3500);

    return () => clearTimeout(tiempo);
  }, [mensaje]);

  useEffect(() => {
    const tiempo = setTimeout(() => {
      if (error) {
        setError("");
      }
    }, 5000);

    return () => clearTimeout(tiempo);
  }, [error]);

  useEffect(() => {
    const consulta = query(collection(db, "users"), orderBy("name"));
    const cancelar = onSnapshot(consulta, (snapshot) => {
      const usuarios = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            name: typeof data.name === "string" ? data.name : "Usuario",
            role: data.role === "admin" ? "admin" : "barber",
          } satisfies BarberoOpcion;
        })
        .filter((usuario) => usuario.role === "admin" || usuario.role === "barber");

      setBarberos(usuarios);
    });

    return () => cancelar();
  }, []);

  useEffect(() => {
    const consulta = query(collection(db, "services"), orderBy("name"));
    const cancelar = onSnapshot(consulta, (snapshot) => {
      const personalizados = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Service[];

      const base = [...SERVICES];
      const nombresBase = new Set(base.map((servicio) => servicio.name.trim().toLowerCase()));
      const extras = personalizados.filter(
        (servicio) => !nombresBase.has(servicio.name.trim().toLowerCase())
      );

      setServicios([...base, ...extras]);
    });

    return () => cancelar();
  }, []);

  const obtenerToken = useCallback(async () => {
    if (!user) {
      throw new Error("Debes iniciar sesión para gestionar reservas.");
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
      setError(error instanceof Error ? error.message : "Error al cargar las reservas.");
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

  const reservasFiltradas = useMemo(() => {
    return filtroEstado === "todos"
      ? reservas
      : reservas.filter((reserva) => reserva.estado === filtroEstado);
  }, [reservas, filtroEstado]);

  const conteo = useMemo(
    () => ({
      todos: reservas.length,
      pendiente: reservas.filter((reserva) => reserva.estado === "pendiente").length,
      confirmada: reservas.filter((reserva) => reserva.estado === "confirmada").length,
      completada: reservas.filter((reserva) => reserva.estado === "completada").length,
      cancelada: reservas.filter((reserva) => reserva.estado === "cancelada").length,
    }),
    [reservas]
  );

  const opcionesBarberos: SelectOption[] = useMemo(
    () =>
      barberos.map((barbero) => ({
        value: barbero.uid,
        label: `${barbero.name} (${barbero.role})`,
      })),
    [barberos]
  );

  const opcionesServicios: SelectOption[] = useMemo(
    () =>
      servicios.map((servicio) => ({
        value: servicio.id,
        label: servicio.name,
      })),
    [servicios]
  );

  const opcionesHora: SelectOption[] = useMemo(
    () =>
      HORAS_RESERVA.map((hora) => ({
        value: hora,
        label: hora,
      })),
    []
  );

  const opcionesEstado: SelectOption[] = useMemo(
    () =>
      ESTADOS_RESERVA.map((estado) => ({
        value: estado,
        label: estado.charAt(0).toUpperCase() + estado.slice(1),
      })),
    []
  );

  const abrirModalCrear = () => {
    setModoFormulario("crear");
    setReservaEditandoId(null);

    if (esAdmin) {
      setFormulario(crearFormularioInicial());
    } else {
      setFormulario({
        ...crearFormularioInicial(),
        barberId: userRole?.uid || "",
        barberName: userRole?.name || "",
      });
    }

    setModalAbierto(true);
  };

  const abrirModalEditar = (reserva: Reserva) => {
    setModoFormulario("editar");
    setReservaEditandoId(reserva.id);
    setFormulario({
      barberId: reserva.barberId,
      barberName: reserva.barberName,
      serviceId: reserva.serviceId,
      serviceName: reserva.serviceName,
      fecha: reserva.fecha,
      hora: reserva.hora,
      clienteNombre: reserva.clienteNombre,
      clienteTelefono: reserva.clienteTelefono,
      estado: reserva.estado,
      notas: reserva.notas || "",
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setModalAbierto(false);
    setReservaEditandoId(null);
    setFormulario(crearFormularioInicial());
  };

  const actualizarCampoFormulario = (
    campo: keyof FormularioReserva,
    valor: string
  ) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  const manejarCambioBarbero = (barberId: string) => {
    const nombre = obtenerNombreBarbero(barberos, barberId, "");
    setFormulario((actual) => ({
      ...actual,
      barberId,
      barberName: nombre,
    }));
  };

  const manejarCambioServicio = (serviceId: string) => {
    const nombre = obtenerNombreServicio(servicios, serviceId, "");
    setFormulario((actual) => ({
      ...actual,
      serviceId,
      serviceName: nombre,
    }));
  };

  const validarFormulario = () => {
    if (!formulario.barberId || !formulario.barberName) {
      return "Debes seleccionar un barbero.";
    }

    if (!formulario.serviceId || !formulario.serviceName) {
      return "Debes seleccionar un servicio.";
    }

    if (!formulario.fecha) {
      return "Debes indicar la fecha de la reserva.";
    }

    if (!formulario.hora) {
      return "Debes indicar la hora de la reserva.";
    }

    if (!formulario.clienteNombre.trim()) {
      return "Debes indicar el nombre del cliente.";
    }

    if (!formulario.clienteTelefono.trim()) {
      return "Debes indicar el teléfono del cliente.";
    }

    return null;
  };

  const guardarReserva = async (event: React.FormEvent) => {
    event.preventDefault();

    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    try {
      setGuardando(true);
      setError("");
      const token = await obtenerToken();

      const payload = {
        ...formulario,
        clienteNombre: formulario.clienteNombre.trim(),
        clienteTelefono: formulario.clienteTelefono.trim(),
        notas: formulario.notas.trim(),
      };

      const url =
        modoFormulario === "crear"
          ? "/api/reservas"
          : `/api/reservas/${reservaEditandoId}`;
      const method = modoFormulario === "crear" ? "POST" : "PUT";

      const respuesta = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "No se pudo guardar la reserva.");
      }

      setMensaje(
        modoFormulario === "crear"
          ? "Reserva creada correctamente."
          : "Reserva actualizada correctamente."
      );
      cerrarModal();
      await cargarReservas();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Error al guardar la reserva.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (id: string, nuevoEstado: ReservaEstado) => {
    const reserva = reservas.find((item) => item.id === id);
    if (!reserva) {
      return;
    }

    try {
      const token = await obtenerToken();
      const respuesta = await fetch(`/api/reservas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barberId: reserva.barberId,
          barberName: reserva.barberName,
          serviceId: reserva.serviceId,
          serviceName: reserva.serviceName,
          fecha: reserva.fecha,
          hora: reserva.hora,
          clienteNombre: reserva.clienteNombre,
          clienteTelefono: reserva.clienteTelefono,
          estado: nuevoEstado,
          notas: reserva.notas || "",
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "No se pudo actualizar el estado.");
      }

      setMensaje(`Reserva ${nuevoEstado} correctamente.`);
      await cargarReservas();
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Error al actualizar el estado de la reserva."
      );
    }
  };

  const eliminarReserva = async (id: string) => {
    try {
      setEliminandoId(id);
      const token = await obtenerToken();
      const respuesta = await fetch(`/api/reservas/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "No se pudo eliminar la reserva.");
      }

      setMensaje("Reserva eliminada correctamente.");
      await cargarReservas();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Error al eliminar la reserva.");
    } finally {
      setEliminandoId(null);
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

      {(mensaje || error) && (
        <div className="space-y-3">
          {mensaje && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {mensaje}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {ESTADOS_FILTRO.map((estado) => (
            <button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-4 py-2 rounded-md font-display text-[13px] font-bold tracking-widest uppercase transition-all border ${
                filtroEstado === estado
                  ? "bg-primary/15 text-white border-primary shadow-red-glow"
                  : "bg-surface-high text-text-secondary border-white/5 hover:border-primary/30 hover:text-white"
              }`}
            >
              {estado}{" "}
              <span className="opacity-50 ml-1 font-body text-[10px]">
                ({conteo[estado]})
              </span>
            </button>
          ))}
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/dashboard/reservas/agenda"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-surface-high px-6 py-2.5 text-sm font-bold text-text-secondary transition-all hover:border-primary/30 hover:text-white self-start lg:self-auto"
          >
            <CalendarDays size={18} />
            Ver agenda
          </Link>

          <button
            onClick={abrirModalCrear}
            className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6 self-start lg:self-auto"
          >
            <Plus size={18} />
            Nueva reserva
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="card-premium p-20 flex flex-col items-center justify-center text-text-muted">
          <Loader2 size={32} className="animate-spin text-primary mb-4" />
          <p className="text-sm tracking-widest uppercase">Actualizando agenda...</p>
        </div>
      ) : reservasFiltradas.length === 0 ? (
        <div className="card-premium p-20 flex flex-col items-center justify-center text-text-muted">
          <CalendarDays size={48} className="mb-4 text-surface-highest" />
          <p className="text-sm tracking-widest uppercase text-center">
            No hay reservas{" "}
            {filtroEstado !== "todos" ? `con estado "${filtroEstado}"` : "registradas"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {reservasFiltradas.map((reserva) => {
            const config = estadoConfig[reserva.estado] || estadoConfig.pendiente;
            return (
              <div key={reserva.id} className="card-premium overflow-hidden group">
                <div className={`px-4 py-2 ${config.bg} border-b border-white/5`}>
                  <span
                    className={`font-display text-[11px] font-bold tracking-[0.2em] uppercase ${config.color}`}
                  >
                    {reserva.estado}
                  </span>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-lg border border-primary/20">
                      {reserva.clienteNombre?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary tracking-wide">
                        {reserva.clienteNombre}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {reserva.clienteTelefono}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[13px]">
                      <User size={14} className="text-primary/70" />
                      <span className="text-text-secondary">
                        Barbero:{" "}
                        <span className="text-text-primary font-medium">
                          {reserva.barberName}
                        </span>
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
                        {reserva.serviceName}
                      </span>
                    </div>
                    {reserva.notas && (
                      <div className="rounded-lg border border-white/5 bg-void/30 p-3 text-xs text-text-muted">
                        {reserva.notas}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-void/30 space-y-3">
                  <div className={`grid gap-2 ${reserva.estado === "completada" ? "grid-cols-1" : "grid-cols-2"}`}>
                    {reserva.estado !== "completada" && (
                      <button
                        onClick={() => abrirModalEditar(reserva)}
                        className="flex items-center justify-center gap-2 rounded-md border border-white/10 bg-surface-high px-3 py-2 text-xs font-bold uppercase tracking-widest text-text-secondary transition-all hover:border-primary/30 hover:text-white"
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                    )}
                    <button
                      onClick={() => eliminarReserva(reserva.id)}
                      disabled={eliminandoId === reserva.id}
                      className="flex items-center justify-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500 hover:text-white disabled:opacity-60"
                    >
                      {eliminandoId === reserva.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Eliminar
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {reserva.estado === "pendiente" && (
                      <>
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
                      </>
                    )}

                    {reserva.estado === "confirmada" && (
                      <>
                        <button
                          onClick={() => cambiarEstado(reserva.id, "completada")}
                          className="flex-1 py-2 rounded-md font-display text-[12px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Check size={14} />
                          Completar
                        </button>
                        <button
                          onClick={() => cambiarEstado(reserva.id, "cancelada")}
                          className="py-2 px-3 rounded-md text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}

                    {reserva.estado === "cancelada" && (
                      <button
                        onClick={() => cambiarEstado(reserva.id, "pendiente")}
                        className="w-full py-2 rounded-md font-display text-[12px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all"
                      >
                        Reabrir
                      </button>
                    )}

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
          <div className="card-premium w-full max-w-2xl p-8 relative border-t-2 border-t-primary border-primary/20 max-h-[90vh] overflow-y-auto">
            <button
              onClick={cerrarModal}
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-display text-3xl mb-6 tracking-widest uppercase text-white">
              {modoFormulario === "crear" ? "Nueva Reserva" : "Editar Reserva"}
            </h3>

            <form onSubmit={guardarReserva} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  {esAdmin ? (
                    <SelectField
                      label="Barbero"
                      options={opcionesBarberos}
                      value={formulario.barberId}
                      onValueChange={manejarCambioBarbero}
                      placeholder="Selecciona un barbero"
                      required
                      selectClassName="border-white/10"
                    />
                  ) : (
                    <>
                      <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                        Barbero
                      </label>
                      <input
                        type="text"
                        value={userRole?.name || ""}
                        disabled
                        className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white/70 outline-none"
                      />
                    </>
                  )}
                </div>

                <SelectField
                  label="Servicio"
                  options={opcionesServicios}
                  value={formulario.serviceId}
                  onValueChange={manejarCambioServicio}
                  placeholder="Selecciona un servicio"
                  required
                  selectClassName="border-white/10"
                />

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                    Fecha
                  </label>
                  <DatePicker
                    value={formulario.fecha}
                    onChange={(valor) => actualizarCampoFormulario("fecha", valor)}
                    placeholder="Seleccionar fecha"
                    className="w-full"
                  />
                </div>

                <SelectField
                  label="Hora"
                  options={opcionesHora}
                  value={formulario.hora}
                  onValueChange={(valor) => actualizarCampoFormulario("hora", valor)}
                  placeholder="Selecciona una hora"
                  required
                  selectClassName="border-white/10"
                />

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={formulario.clienteNombre}
                    onChange={(event) =>
                      actualizarCampoFormulario("clienteNombre", event.target.value)
                    }
                    placeholder="Nombre del cliente"
                    className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={formulario.clienteTelefono}
                    onChange={(event) =>
                      actualizarCampoFormulario("clienteTelefono", event.target.value)
                    }
                    placeholder="Teléfono del cliente"
                    className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <SelectField
                    label="Estado"
                    options={opcionesEstado}
                    value={formulario.estado}
                    onValueChange={(valor) =>
                      actualizarCampoFormulario("estado", valor as ReservaEstado)
                    }
                    placeholder="Selecciona un estado"
                    selectClassName="border-white/10"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                    Notas
                  </label>
                  <textarea
                    value={formulario.notas}
                    onChange={(event) =>
                      actualizarCampoFormulario("notas", event.target.value)
                    }
                    rows={4}
                    placeholder="Notas adicionales de la reserva..."
                    className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 btn-primary text-sm py-3 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  {modoFormulario === "crear" ? "Crear" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
