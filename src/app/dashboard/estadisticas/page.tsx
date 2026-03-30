"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord } from "@/lib/types";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TrendingUp, Scissors, DollarSign, Activity } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";

export default function EstadisticasPage() {
  const { userRole, loading } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [periodFilter, setPeriodFilter] = useState<"day" | "week" | "month">("week");

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
        return record.date === hoy.toLocaleDateString("en-CA");
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

  const dailyStats = filteredRecords.reduce((acc, r) => {
    if (!acc[r.date]) {
      acc[r.date] = {
        total: 0,
        barbero: 0,
        barberia: 0,
      };
    }

    acc[r.date].total += r.totalAmount;
    acc[r.date].barbero += r.barberShare;
    acc[r.date].barberia += r.barberiaShare;

    return acc;
  }, {} as Record<string, { total: number; barbero: number; barberia: number }>);

  const topService = Object.entries(servicesByType).sort((a, b) => b[1] - a[1])[0];
  const topBarber = Object.entries(revenueByBarber).sort((a, b) => b[1] - a[1])[0];

  const maxDailyBarbero = Math.max(...Object.values(dailyStats).map((stats) => stats.barbero), 0);
  const maxDailyBarberia = Math.max(...Object.values(dailyStats).map((stats) => stats.barberia), 0);

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

          <div className="flex flex-wrap gap-2">
            {(["day", "week", "month"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`min-w-24 px-5 py-2.5 rounded-md font-display text-[13px] font-bold tracking-widest uppercase transition-all border ${
                  periodFilter === period
                    ? "bg-primary text-white border-primary shadow-red-glow"
                    : "bg-surface-high text-text-muted border-white/5 hover:border-primary/30 hover:text-white"
                }`}
              >
                {period === "day" ? "Hoy" : period === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="card-premium p-6 min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Scissors size={20} className="text-primary" />
            </div>
            <span className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Servicios</span>
          </div>
          <p className="font-display text-5xl text-white tracking-tight leading-none">{totalServices}</p>
        </div>

        <div className="card-premium p-6 min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DollarSign size={20} className="text-emerald-400" />
            </div>
            <span className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
              Ingreso Barbero
            </span>
          </div>
          <p className="font-display text-5xl text-white tracking-tight leading-none">${ingresosBarbero.toFixed(2)}</p>
        </div>

        <div className="card-premium p-6 min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <DollarSign size={20} className="text-cyan-400" />
            </div>
            <span className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
              Ingreso Barbería
            </span>
          </div>
          <p className="font-display text-5xl text-white tracking-tight leading-none">${ingresosBarberia.toFixed(2)}</p>
        </div>

        <div className="card-premium p-6 min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <span className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Promedio</span>
          </div>
          <p className="font-display text-5xl text-white tracking-tight leading-none">${avgTicket.toFixed(2)}</p>
        </div>

        <div className="card-premium p-6 min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Activity size={20} className="text-amber-400" />
            </div>
            <span className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Serv/Día</span>
          </div>
          <p className="font-display text-5xl text-white tracking-tight leading-none">
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
              Ingresos por <span className="text-primary">jornada</span>
            </h3>
            <p className="text-text-muted text-sm">
              Comparativa diaria entre lo generado para el barbero y lo correspondiente a la barbería.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {Object.entries(dailyStats)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, amount]) => (
              <div key={date} className="rounded-xl border border-white/5 bg-void/30 p-4 sm:p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <span className="text-text-muted text-[11px] font-medium uppercase tracking-[0.15em]">
                    {date}
                  </span>
                  <span className="text-white font-display text-lg tracking-wider">
                    Total ${amount.total.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_110px] items-center gap-3">
                    <span className="text-emerald-400 text-[11px] font-bold uppercase tracking-[0.18em]">
                      Barbero
                    </span>
                    <div className="h-3 bg-surface-high rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${maxDailyBarbero > 0 ? (amount.barbero / maxDailyBarbero) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-white font-display text-lg text-left md:text-right tracking-wider">
                      ${amount.barbero.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_110px] items-center gap-3">
                    <span className="text-cyan-400 text-[11px] font-bold uppercase tracking-[0.18em]">
                      Barbería
                    </span>
                    <div className="h-3 bg-surface-high rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-linear-to-r from-cyan-700 to-cyan-400 rounded-full transition-all duration-1000"
                        style={{ width: `${maxDailyBarberia > 0 ? (amount.barberia / maxDailyBarberia) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-white font-display text-lg text-left md:text-right tracking-wider">
                      ${amount.barberia.toFixed(2)}
                    </span>
                  </div>
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Object.entries(servicesByType)
              .sort((a, b) => b[1] - a[1])
              .map(([service, count], index) => {
                const percentage = totalServices > 0 ? (count / totalServices) * 100 : 0;

                return (
                  <div
                    key={service}
                    className="bg-void/50 p-5 sm:p-6 rounded-2xl border border-white/5 group hover:border-primary/30 hover:bg-void/70 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="font-display text-xl text-primary tracking-widest">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white font-display text-xl sm:text-2xl tracking-[0.04em] uppercase leading-tight break-words">
                              {service}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.18em]">
                              {count} servicios
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="h-3 bg-surface-high rounded-full overflow-hidden border border-white/5">
                            <div
                              className="h-full bg-linear-to-r from-primary-dark via-primary to-orange-400 rounded-full transition-all duration-1000"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-text-muted uppercase tracking-[0.15em]">
                                Participación
                              </span>
                              <span className="text-white font-semibold">{percentage.toFixed(1)}%</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-text-muted uppercase tracking-[0.15em]">
                                Posición
                              </span>
                              <span className="text-primary font-semibold">#{index + 1}</span>
                            </div>
                          </div>
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
        <div className="card-premium p-6">
          <h3 className="font-display text-2xl text-white mb-6 tracking-[0.05em] uppercase">RENDIMIENTO POR <span className="text-primary">STAFF</span></h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Barbero</TableHead>
                  <TableHead>Servicios</TableHead>
                  <TableHead>Ingresos</TableHead>
                  <TableHead>% Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(revenueByBarber)
                  .sort((a, b) => b[1] - a[1])
                  .map(([barber, revenue]) => {
                    const services = filteredRecords.filter(r => r.barberName === barber).length;
                    const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                    return (
                      <TableRow key={barber}>
                        <TableCell className="text-text-primary font-medium tracking-wide">{barber}</TableCell>
                        <TableCell className="text-text-secondary">{services}</TableCell>
                        <TableCell className="text-primary font-display text-xl tracking-wider">
                          ${revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-text-muted text-sm">{percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
