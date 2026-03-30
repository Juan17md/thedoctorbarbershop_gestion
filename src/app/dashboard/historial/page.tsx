"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord } from "@/lib/types";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  History,
  DollarSign,
  Scissors,
  Wallet,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
} from "@/components/ui";
import SearchInput from "@/components/ui/search-input";
import { DatePicker } from "@/components/ui/date-picker";

const ITEMS_POR_PAGINA = 15;

export default function HistorialPage() {
  const { userRole } = useAuth();
  const esAdmin = userRole?.role === "admin";

  const [registros, setRegistros] = useState<FinancialRecord[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);

  // Filtros
  const [periodo, setPeriodo] = useState<"hoy" | "semana" | "mes" | "todo">("todo");
  const [busqueda, setBusqueda] = useState("");
  const [filtroBarbero, setFiltroBarbero] = useState("todos");
  const [filtroServicio, setFiltroServicio] = useState("todos");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    let q;
    if (esAdmin) {
      q = query(collection(db, "finances"), orderBy("date", "desc"));
    } else {
      q = query(
        collection(db, "finances"),
        where("barberId", "==", userRole?.uid),
        orderBy("date", "desc")
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FinancialRecord[];
      setRegistros(data);
      setCargando(false);
    });
    return () => unsubscribe();
  }, [esAdmin, userRole?.uid]);

  // Opciones dinámicas de filtros
  const opcionesBarberos = useMemo(() => {
    return [...new Set(registros.map((r) => r.barberName))].sort();
  }, [registros]);

  const opcionesServicios = useMemo(() => {
    return [...new Set(registros.map((r) => r.serviceName))].sort();
  }, [registros]);

  // Registros filtrados
  const registrosFiltrados = useMemo(() => {
    const ahora = new Date();
    const hoyStr = ahora.toISOString().split("T")[0];
    const inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - ahora.getDay());
    const inicioSemanaStr = inicioSemana.toISOString().split("T")[0];

    return registros.filter((r) => {
      if (periodo === "hoy" && r.date !== fechaSeleccionada) return false;
      if (periodo === "semana" && r.date < inicioSemanaStr) return false;
      if (periodo === "mes") {
        const d = new Date(r.date + "T00:00:00");
        if (
          d.getMonth() !== ahora.getMonth() ||
          d.getFullYear() !== ahora.getFullYear()
        )
          return false;
      }
      if (esAdmin && filtroBarbero !== "todos" && r.barberName !== filtroBarbero)
        return false;
      if (filtroServicio !== "todos" && r.serviceName !== filtroServicio)
        return false;
      if (busqueda) {
        const t = busqueda.toLowerCase();
        return (
          r.clientName.toLowerCase().includes(t) ||
          r.serviceName.toLowerCase().includes(t) ||
          (esAdmin && r.barberName.toLowerCase().includes(t))
        );
      }
      return true;
    });
  }, [registros, periodo, fechaSeleccionada, filtroBarbero, filtroServicio, busqueda, esAdmin]);

  // Reset paginación cuando cambian filtros
  useEffect(() => {
    setPagina(1);
  }, [periodo, busqueda, filtroBarbero, filtroServicio, fechaSeleccionada]);

  const totalPaginas = Math.ceil(registrosFiltrados.length / ITEMS_POR_PAGINA);
  const registrosPagina = registrosFiltrados.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  );

  // Métricas del filtro actual
  const totalIngresos = registrosFiltrados.reduce((s, r) => s + r.totalAmount, 0);
  const totalBarbero = registrosFiltrados.reduce((s, r) => s + r.barberShare, 0);
  const totalBarberia = registrosFiltrados.reduce((s, r) => s + r.barberiaShare, 0);

  const hayFiltrosActivos =
    busqueda || filtroBarbero !== "todos" || filtroServicio !== "todos";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroBarbero("todos");
    setFiltroServicio("todos");
  };

  // Números de página visibles
  const paginasVisibles = useMemo(() => {
    if (totalPaginas <= 5) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    if (pagina <= 3) return [1, 2, 3, 4, 5];
    if (pagina >= totalPaginas - 2)
      return [
        totalPaginas - 4,
        totalPaginas - 3,
        totalPaginas - 2,
        totalPaginas - 1,
        totalPaginas,
      ];
    return [pagina - 2, pagina - 1, pagina, pagina + 1, pagina + 2];
  }, [pagina, totalPaginas]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-text-muted text-sm">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Panel de filtros */}
      <div className="card-premium p-5 space-y-4">
        {/* Filtro de período */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex bg-void/60 rounded-lg p-1 border border-white/5">
            {(["hoy", "semana", "mes", "todo"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-4 py-2 rounded-md font-display text-[12px] font-bold tracking-widest uppercase transition-all ${
                  periodo === p
                    ? "bg-primary/15 text-white border border-primary shadow-red-glow"
                    : "text-text-secondary hover:text-white border border-transparent"
                }`}
              >
                {p === "hoy" ? "Hoy" : p === "semana" ? "Semana" : p === "mes" ? "Mes" : "Todo"}
              </button>
            ))}
          </div>

          {periodo === "hoy" && (
            <DatePicker
              value={fechaSeleccionada}
              onChange={(v) => setFechaSeleccionada(v)}
              placeholder="Seleccionar fecha"
            />
          )}
        </div>

        {/* Búsqueda y filtros avanzados */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Búsqueda */}
          <div className="flex-1 min-w-[200px]">
            <SearchInput
              value={busqueda}
              onChange={setBusqueda}
              placeholder={esAdmin ? "Buscar cliente, servicio o barbero..." : "Buscar cliente o servicio..."}
            />
          </div>

          {/* Filtro barbero (solo admin) */}
          {esAdmin && (
            <div className="min-w-[170px]">
              <Select
                options={[
                  { value: "todos", label: "Todos los barberos" },
                  ...opcionesBarberos.map((b) => ({ value: b, label: b })),
                ]}
                value={filtroBarbero}
                onChange={setFiltroBarbero}
                placeholder="Todos los barberos"
              />
            </div>
          )}

          {/* Filtro servicio */}
          <div className="min-w-[170px]">
            <Select
              options={[
                { value: "todos", label: "Todos los servicios" },
                ...opcionesServicios.map((s) => ({ value: s, label: s })),
              ]}
              value={filtroServicio}
              onChange={setFiltroServicio}
              placeholder="Todos los servicios"
            />
          </div>

          {/* Limpiar filtros */}
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-text-muted hover:text-white border border-white/10 hover:border-white/20 transition-all"
            >
              <X size={14} />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-5 group hover:border-primary/20 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <Scissors size={18} className="text-primary" />
            <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">
              Servicios
            </p>
          </div>
          <p className="font-display text-3xl text-white">
            {registrosFiltrados.length}
          </p>
        </div>

        <div className="card-premium p-5 group hover:border-emerald-400/20 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={18} className="text-emerald-400" />
            <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">
              Total Generado
            </p>
          </div>
          <p className="font-display text-3xl text-white">
            ${totalIngresos.toFixed(2)}
          </p>
        </div>

        <div className="card-premium p-5 group hover:border-blue-400/20 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-blue-400" />
            <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">
              {esAdmin ? "Barberos (60%)" : "Tu Parte (60%)"}
            </p>
          </div>
          <p className="font-display text-3xl text-white">
            ${totalBarbero.toFixed(2)}
          </p>
        </div>

        <div className="card-premium p-5 group hover:border-amber-400/20 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={18} className="text-amber-400" />
            <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">
              Barbería (40%)
            </p>
          </div>
          <p className="font-display text-3xl text-white">
            ${totalBarberia.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display text-lg text-white tracking-widest uppercase flex items-center gap-3">
            <History size={20} className="text-primary" />
            Registros
          </h3>
          <span className="text-text-muted text-xs">
            {registrosFiltrados.length}{" "}
            resultado{registrosFiltrados.length !== 1 ? "s" : ""}
          </span>
        </div>

        {registrosPagina.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    {esAdmin && <TableHead>Barbero</TableHead>}
                    <TableHead>Servicio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead align="right">Total</TableHead>
                    <TableHead align="right">
                      {esAdmin ? "Barbero (60%)" : "Tu Parte"}
                    </TableHead>
                    <TableHead align="right">Barbería (40%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrosPagina.map((r) => (
                    <TableRow key={r.id} className="hover:bg-surface-high/30">
                      <TableCell className="text-text-secondary text-sm">
                        {r.date}
                      </TableCell>
                      {esAdmin && (
                        <TableCell className="text-white text-sm font-medium">
                          {r.barberName}
                        </TableCell>
                      )}
                      <TableCell className="text-white text-sm">
                        {r.serviceName}
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {r.clientName}
                      </TableCell>
                      <TableCell className="text-right font-display text-white tracking-wider">
                        ${r.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-display text-emerald-400 tracking-wider">
                        ${r.barberShare.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-display text-blue-400 tracking-wider">
                        ${r.barberiaShare.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="p-4 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-text-muted text-xs">
                  Página {pagina} de {totalPaginas} &middot;{" "}
                  {registrosFiltrados.length} registros
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {paginasVisibles.map((num) => (
                    <button
                      key={num}
                      onClick={() => setPagina(num)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        pagina === num
                          ? "bg-primary/20 text-white border border-primary shadow-red-glow"
                          : "text-text-muted hover:text-white border border-white/10 hover:border-white/20"
                      }`}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                    className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <History size={48} className="text-text-muted/20 mb-4" />
            <p className="font-display text-sm uppercase tracking-widest text-text-muted">
              No hay registros
            </p>
            <p className="text-text-muted/60 text-xs mt-2">
              {hayFiltrosActivos
                ? "Intenta ajustar los filtros de búsqueda"
                : "Aún no se han registrado servicios"}
            </p>
            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="mt-4 px-4 py-2 rounded-lg text-xs text-text-muted border border-white/10 hover:text-white hover:border-white/20 transition-all"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
