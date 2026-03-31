"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord } from "@/lib/types";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TrendingUp, Scissors, DollarSign, Activity } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { getLocalDateString } from "@/lib/utils";


export default function EstadisticasPage() {
  const { userRole, loading } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [barbersList, setBarbersList] = useState<{uid: string, name: string}[]>([]);
  const [periodFilter, setPeriodFilter] = useState<"day" | "week" | "month">("week");
  const [today, setToday] = useState(getLocalDateString());

  // Actualizar la fecha actual cada minuto para manejar el cambio de medianoche
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getLocalDateString();
      if (current !== today) {
        setToday(current);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [today]);


  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        const querySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "barber")));
        const list = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          name: doc.data().name || "Sin nombre"
        }));
        
        setBarbersList(list);
      } catch (error) {
        console.error("Error al cargar barberos:", error);
      }
    };
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!userRole?.uid) {
      setRecords([]);
      return;
    }

    const consultaFinanzas = isAdmin
      ? query(collection(db, "finances"), orderBy("date", "desc"))
      : query(
          collection(db, "finances"),
          where("barberId", "==", userRole.uid),
          orderBy("date", "desc")
        );

    const unsubscribe = onSnapshot(consultaFinanzas, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as FinancialRecord[];

      setRecords(data);
    });

    return () => unsubscribe();
  }, [isAdmin, loading, userRole?.uid]);


  const getFilteredRecords = () => {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    return records.filter((record) => {
      const [anio, mes, dia] = record.date.split("-").map(Number);

      if (!anio || !mes || !dia) {
        return false;
      }

      const fechaRegistro = new Date(anio, mes - 1, dia);

      if (periodFilter === "day") {
        return record.date === today;
      }


      if (periodFilter === "week") {
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());

        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        finSemana.setHours(23, 59, 59, 999);

        return fechaRegistro >= inicioSemana && fechaRegistro <= finSemana;
      }

      if (periodFilter === "month") {
        return fechaRegistro.getMonth() === hoy.getMonth() && fechaRegistro.getFullYear() === hoy.getFullYear();
      }

      return true;
    });
  };

  const filteredRecords = getFilteredRecords();

  const totalServices = filteredRecords.length;
  const totalRevenue = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  const ingresosBarbero = filteredRecords.reduce((sum, r) => sum + r.barberShare, 0);
  const ingresosBarberia = filteredRecords.reduce((sum, r) => sum + r.barberiaShare, 0);
  const avgTicket = totalServices > 0 ? totalRevenue / totalServices : 0;

  const servicesByType = filteredRecords.reduce((acc, r) => {
    acc[r.serviceName] = (acc[r.serviceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const revenueByBarber = filteredRecords.reduce((acc, r) => {
    acc[r.barberName] = (acc[r.barberName] || 0) + r.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const weeklyStats = filteredRecords.reduce((acc, r) => {
    const fecha = parseISO(r.date);
    const inicioId = format(startOfWeek(fecha, { weekStartsOn: 0 }), "yyyy-MM-dd");
    
    if (!acc[inicioId]) {
      acc[inicioId] = {
        label: `${format(startOfWeek(fecha, { weekStartsOn: 0 }), "dd MMM", { locale: es })} - ${format(endOfWeek(fecha, { weekStartsOn: 0 }), "dd MMM", { locale: es })}`,
        total: 0,
        barberia: 0,
        barbers: {} as Record<string, { barberShare: number; barberiaShare: number; total: number }>
      };
    }

    acc[inicioId].total += r.totalAmount;
    acc[inicioId].barberia += r.barberiaShare;

    if (!acc[inicioId].barbers[r.barberName]) {
      acc[inicioId].barbers[r.barberName] = { barberShare: 0, barberiaShare: 0, total: 0 };
    }
    acc[inicioId].barbers[r.barberName].barberShare += r.barberShare;
    acc[inicioId].barbers[r.barberName].barberiaShare += r.barberiaShare;
    acc[inicioId].barbers[r.barberName].total += r.totalAmount;

    return acc;
  }, {} as Record<string, { label: string; total: number; barberia: number; barbers: Record<string, { barberShare: number; barberiaShare: number; total: number }> }>);

  // Asegurar que todos los barberos aparezcan en cada semana
  Object.keys(weeklyStats).forEach(weekId => {
    barbersList.forEach(barber => {
      if (!weeklyStats[weekId].barbers[barber.name]) {
        weeklyStats[weekId].barbers[barber.name] = { barberShare: 0, barberiaShare: 0, total: 0 };
      }
    });
  });

  const maxWeeklyValue = Math.max(
    ...Object.values(weeklyStats).flatMap(stats => 
      Object.entries(stats.barbers)
        .filter(([name]) => barbersList.some(b => b.name === name))
        .flatMap(([, b]) => [b.barberShare, b.barberiaShare])
    ),
    1
  );

  const topService = Object.entries(servicesByType).sort((a, b) => b[1] - a[1])[0];
  const topBarber = Object.entries(revenueByBarber).sort((a, b) => b[1] - a[1])[0];
  
  // Para mantener compatibilidad con otras partes si se usan
  const dailyStats = filteredRecords.reduce((acc, r) => {
    if (!acc[r.date]) {
      acc[r.date] = { total: 0, barbero: 0, barberia: 0 };
    }
    acc[r.date].total += r.totalAmount;
    acc[r.date].barbero += r.barberShare;
    acc[r.date].barberia += r.barberiaShare;
    return acc;
  }, {} as Record<string, { total: number; barbero: number; barberia: number }>);

  return (
    <div className="space-y-8">
      <div className="card-premium p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-text-muted text-[10px] font-bold tracking-[0.25em] uppercase opacity-70">
              Vista general
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-white tracking-[0.05em] uppercase">
              Rendimiento del período
            </h2>
          </div>

          <div className="bg-void/60 rounded-lg p-1 border border-white/5 w-full lg:w-auto">
            <div className="grid grid-cols-3 lg:flex items-center gap-1">
              {(["day", "week", "month"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setPeriodFilter(period)}
                  className={`px-3 py-2.5 rounded-md font-display text-[11px] sm:text-[13px] font-bold tracking-widest uppercase transition-all border text-center whitespace-nowrap ${
                    periodFilter === period
                      ? "bg-primary text-white border-primary shadow-red-glow"
                      : "bg-surface-high/50 text-text-muted border-transparent hover:border-primary/30 hover:text-white"
                  }`}
                >
                  {period === "day" ? "Hoy" : period === "week" ? "Semana" : "Mes"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <Scissors size={16} className="text-primary md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70">Servicios</span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none">{totalServices}</p>
        </div>

        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <DollarSign size={16} className="text-emerald-400 md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70 shrink-0 truncate">
              Barbero
            </span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none truncate">${ingresosBarbero.toFixed(2)}</p>
        </div>

        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0">
              <DollarSign size={16} className="text-cyan-400 md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70 shrink-0 truncate">
              Barbería
            </span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none truncate">${ingresosBarberia.toFixed(2)}</p>
        </div>

        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
              <TrendingUp size={16} className="text-blue-400 md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70">Promedio</span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none truncate">${avgTicket.toFixed(0)}</p>
        </div>

        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Activity size={16} className="text-amber-400 md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70 shrink-0 truncate">Serv/Día</span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none">
            {Object.keys(dailyStats).length > 0 ? (totalServices / Object.keys(dailyStats).length).toFixed(1) : 0}
          </p>
        </div>
      </div>

      {(topService || (isAdmin && topBarber)) && (
        <div className={`grid grid-cols-1 gap-6 ${isAdmin && topBarber ? "xl:grid-cols-[1.3fr_0.9fr]" : ""}`}>
          {topService && (
            <div className="card-premium p-6 sm:p-8 group overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase mb-4 opacity-70">
                    Servicio más popular
                  </h3>
                  <p className="font-display text-3xl sm:text-5xl text-white leading-none mb-4 group-hover:text-primary transition-colors uppercase tracking-tight">
                    {topService[0]}
                  </p>
                  <p className="text-primary font-display text-lg sm:text-2xl tracking-widest">
                    {topService[1]} SERVICIOS
                  </p>
                </div>
                <div className="hidden sm:flex w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center">
                  <Scissors size={24} className="text-primary" />
                </div>
              </div>
            </div>
          )}

          {isAdmin && topBarber && (
            <div className="card-premium p-6 sm:p-8 group">
              <h3 className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase mb-4 opacity-70">
                Mejor barbero
              </h3>
              <p className="font-display text-3xl sm:text-5xl text-white leading-none mb-4 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                {topBarber[0]}
              </p>
              <p className="text-emerald-400 font-display text-lg sm:text-2xl tracking-widest">
                ${topBarber[1].toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="card-premium p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <h3 className="font-display text-2xl text-text-primary tracking-[0.05em] uppercase">
              Ingresos por <span className="text-primary">semana</span>
            </h3>
            <p className="text-text-muted text-sm">
              Comparativa semanal entre lo generado para el barbero y lo correspondiente a la barbería.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(weeklyStats)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([weekId, data]) => (
              <div key={weekId} className="rounded-xl border border-white/5 bg-void/30 p-4 sm:p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <span className="text-text-muted text-[11px] font-medium uppercase tracking-[0.15em]">
                    Semana {data.label}
                  </span>
                  <span className="text-white font-display text-lg tracking-wider">
                    Total ${data.total.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-8">
                  {Object.entries(data.barbers)
                    .filter(([name]) => barbersList.some(b => b.name === name))
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([barberName, stats]) => (
                      <div key={barberName} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-px flex-1 bg-white/5"></div>
                          <span className="text-white/80 font-display text-[13px] uppercase tracking-[0.2em]">{barberName}</span>
                          <div className="h-px flex-1 bg-white/5"></div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_110px] items-center gap-3">
                            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.18em]">
                              Personal
                            </span>
                            <div className="h-2.5 bg-surface-high rounded-full overflow-hidden border border-white/5">
                              <div
                                className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000"
                                style={{ width: `${maxWeeklyValue > 0 ? (stats.barberShare / maxWeeklyValue) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-white font-display text-lg text-left md:text-right tracking-wider">
                              ${stats.barberShare.toFixed(2)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_110px] items-center gap-3">
                            <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.18em]">
                              Barbería
                            </span>
                            <div className="h-2.5 bg-surface-high rounded-full overflow-hidden border border-white/5">
                              <div
                                className="h-full bg-linear-to-r from-cyan-700 to-cyan-400 rounded-full transition-all duration-1000"
                                style={{ width: `${maxWeeklyValue > 0 ? (stats.barberiaShare / maxWeeklyValue) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-white font-display text-lg text-left md:text-right tracking-wider">
                              ${stats.barberiaShare.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {Object.keys(servicesByType).length > 0 && (
        <div className="card-premium p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
            <div>
              <h3 className="font-display text-2xl text-text-primary tracking-[0.05em] uppercase">
                Distribución por <span className="text-primary">servicio</span>
              </h3>
              <p className="text-text-muted text-sm">
                Ranking visual de los servicios con mayor participación en el período actual.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {Object.entries(servicesByType)
              .sort((a, b) => b[1] - a[1])
              .map(([service, count], index) => {
                const percentage = totalServices > 0 ? (count / totalServices) * 100 : 0;
                
                return (
                  <div
                    key={service}
                    className="bg-surface-high/40 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/5 group hover:border-primary/40 hover:bg-surface-high/60 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />

                    <div className="relative z-10 flex flex-col gap-4">
                      {/* Cabecera: Ranking + Nombre */}
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-void/60 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-primary/30 transition-colors">
                          <span className="font-hero text-lg sm:text-xl text-primary tracking-tight">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-white font-display text-lg sm:text-xl tracking-wide uppercase leading-tight truncate group-hover:text-primary-light transition-colors">
                            {service}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                              Ranking #{index + 1}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                              {percentage.toFixed(1)}% Participación
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cuerpo: Estadísticas y Barra */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="flex items-baseline gap-1">
                            <span className="font-display text-2xl text-white tracking-widest">
                              {count}
                            </span>
                            <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">
                              Servicios realizados
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] text-text-secondary uppercase font-bold tracking-tighter">Popular</span>
                          </div>
                        </div>

                        {/* Barra de progreso premium */}
                        <div className="relative h-1.5 bg-void/60 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="absolute inset-y-0 left-0 bg-linear-to-r from-primary-dark via-primary to-zinc-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(82,82,91,0.3)]"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {isAdmin && Object.keys(revenueByBarber).length > 0 && (
        <div className="card-premium p-5 md:p-6">
          <h3 className="font-display text-xl md:text-2xl text-white mb-6 tracking-[0.05em] uppercase">RENDIMIENTO POR <span className="text-primary">STAFF</span></h3>
          
          {/* Escritorio - Tabla */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent text-text-muted">
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold">Barbero</TableHead>
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold">Servicios</TableHead>
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold">Ingresos</TableHead>
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold text-right">% Participación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(revenueByBarber)
                  .sort((a, b) => b[1] - a[1])
                  .map(([barber, revenue]) => {
                    const services = filteredRecords.filter(r => r.barberName === barber).length;
                    const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                    return (
                      <TableRow key={barber} className="hover:bg-surface-high/30 transition-colors">
                        <TableCell className="text-text-primary font-medium tracking-wide py-4">{barber}</TableCell>
                        <TableCell className="text-text-secondary py-4">{services}</TableCell>
                        <TableCell className="text-primary font-display text-xl tracking-wider py-4">
                          ${revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-text-muted text-right py-4 font-medium">{percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Móvil - Vista de Tarjetas */}
          <div className="lg:hidden space-y-3">
            {Object.entries(revenueByBarber)
              .sort((a, b) => b[1] - a[1])
              .map(([barber, revenue]) => {
                const services = filteredRecords.filter(r => r.barberName === barber).length;
                const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={barber} className="bg-void/40 border border-white/5 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-white font-display text-lg tracking-wide uppercase">{barber}</p>
                      <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        <span className="text-primary font-display text-sm">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Servicios</p>
                        <p className="text-text-secondary font-display text-lg tracking-widest">{services}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Ingresos</p>
                        <p className="text-emerald-400 font-display text-xl tracking-wider">${revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
