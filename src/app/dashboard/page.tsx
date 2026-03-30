"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { DollarSign, Users, Scissors, TrendingUp, Activity, Wallet, CalendarDays, Target, BarChart3, ArrowRight, History } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";

export default function DashboardPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    if (isAdmin) {
      q = query(collection(db, "finances"), orderBy("date", "desc"));
    } else {
      q = query(collection(db, "finances"), where("barberId", "==", userRole?.uid), orderBy("date", "desc"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FinancialRecord[];
      setRecords(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin, userRole?.uid]);

  const today = new Date().toISOString().split("T")[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

  const todayRecords = records.filter(r => r.date === today);
  const weekRecords = records.filter(r => r.date >= startOfWeekStr);
  const monthRecords = records.filter(r => {
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const dailyRevenue = todayRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  const weeklyRevenue = weekRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  const monthlyRevenue = monthRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  const barberDaily = todayRecords.reduce((sum, r) => sum + r.barberShare, 0);
  const barberiaDaily = todayRecords.reduce((sum, r) => sum + r.barberiaShare, 0);

  const totalServices = records.length;
  const todayServices = todayRecords.length;

  const revenueByBarber = isAdmin ? records.reduce((acc, r) => {
    acc[r.barberName] = (acc[r.barberName] || 0) + r.totalAmount;
    return acc;
  }, {} as Record<string, number>) : {};

  const topBarber = Object.entries(revenueByBarber).sort((a, b) => b[1] - a[1])[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-text-muted text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    const stats = [
      { name: "Ingresos del Día", value: `$${dailyRevenue.toFixed(2)}`, icon: DollarSign, color: "text-primary" },
      { name: "Ingresos Semana", value: `$${weeklyRevenue.toFixed(2)}`, icon: TrendingUp, color: "text-emerald-400" },
      { name: "Ingresos Mes", value: `$${monthlyRevenue.toFixed(2)}`, icon: Activity, color: "text-blue-400" },
      { name: "Servicios Hoy", value: todayServices.toString(), icon: Scissors, color: "text-primary-light" },
    ];

    return (
      <div className="space-y-8">
        

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 stagger-children">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="card-premium p-4 sm:p-6 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-high flex items-center justify-center border border-white/5 group-hover:border-primary/50 transition-colors">
                    <Icon size={20} className={stat.color} />
                  </div>
                </div>
                <div>
                  <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] font-bold mb-1 opacity-70">{stat.name}</p>
                  <h3 className="font-display text-3xl sm:text-5xl text-text-primary tracking-tight leading-none group-hover:scale-110 transition-transform origin-left duration-500">{stat.value}</h3>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="card-premium p-4 sm:p-6">
            <h3 className="font-display text-lg sm:text-2xl text-text-primary mb-6 flex items-center gap-3 tracking-[0.05em] uppercase">
              <Wallet size={22} className="text-primary" />
              DISTRIBUCIÓN DE GANANCIAS (HOY)
            </h3>
            {(() => {
              const earningsByBarber = todayRecords.reduce((acc, r) => {
                if (!acc[r.barberName]) acc[r.barberName] = { share: 0, barberiaShare: 0, generated: 0, services: 0 };
                acc[r.barberName].share += r.barberShare;
                acc[r.barberName].barberiaShare += r.barberiaShare;
                acc[r.barberName].generated += r.totalAmount;
                acc[r.barberName].services += 1;
                return acc;
              }, {} as Record<string, { share: number; barberiaShare: number; generated: number; services: number }>);
              const barberEntries = Object.entries(earningsByBarber);
              const gridCols = "grid-cols-1";
              return (
                <div className={`grid ${gridCols} gap-4`}>
                  {barberEntries.map(([name, data]) => (
                    <div key={name} className="bg-surface-high/50 p-3 sm:p-5 rounded-xl border border-border-subtle hover:border-primary/30 transition-all duration-300 flex flex-col group w-full">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                          <Scissors size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-lg leading-tight uppercase tracking-wider font-display">{name}</p>
                          <p className="text-text-muted text-[10px] uppercase tracking-wider">{data.services} servicio{data.services !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3 flex-1 mb-5">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-text-secondary text-[11px] uppercase tracking-widest font-bold">Barbero <span className="text-text-muted/50 font-normal">(60%)</span></span>
                          <span className="font-display text-xl text-emerald-400">${data.share.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-text-secondary text-[11px] uppercase tracking-widest font-bold">Barbería <span className="text-text-muted/50 font-normal">(40%)</span></span>
                          <span className="font-display text-xl text-blue-400">${data.barberiaShare.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-auto flex justify-between items-center bg-void/40 p-3 rounded-lg border border-white/5 relative overflow-hidden group-hover:border-white/10 transition-colors">
                        <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="text-white text-[10px] uppercase tracking-[0.2em] font-bold relative z-10">Total Generado</span>
                        <span className="font-display text-2xl text-white relative z-10">${data.generated.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {barberEntries.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-10 text-center bg-surface-high/20 rounded-xl border border-white/5 border-dashed">
                      <Wallet size={32} className="text-text-muted/30 mb-3" />
                      <p className="text-text-muted text-sm uppercase tracking-widest font-bold text-[10px]">No hay ganancias registradas hoy</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="card-premium p-6">
            <h3 className="font-display text-2xl text-text-primary mb-6 flex items-center gap-3 tracking-[0.05em] uppercase">
              <Users size={22} className="text-primary" />
              TOP <span className="text-primary">BARBERO</span> <span className="text-text-muted text-sm ml-2 font-body opacity-50 tracking-tight lowercase font-medium italic">(Día)</span>
            </h3>
            {topBarber ? (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-muted flex items-center justify-center border border-primary/20">
                  <Users size={24} className="text-primary" />
                </div>
                <div>
                  <p className="font-display text-3xl text-text-primary leading-none tracking-wide">{topBarber[0].toUpperCase()}</p>
                  <p className="text-emerald-400 font-display text-xl tracking-wider mt-1">${topBarber[1].toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <p className="text-text-muted">No hay datos disponibles</p>
            )}
          </div>
        </div>

        <div className="card-premium p-6">
          <h3 className="font-display text-2xl text-text-primary mb-6 tracking-[0.05em] uppercase">SERVICIOS <span className="text-primary">RECIENTES</span></h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Barbero</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead align="right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayRecords.slice(0, 5).map((r) => (
                  <TableRow key={r.id} className="hover:bg-surface-high/30">
                    <TableCell className="py-3 text-text-secondary">{r.date}</TableCell>
                    <TableCell className="py-3 text-text-primary">{r.barberName}</TableCell>
                    <TableCell className="py-3 text-text-secondary">{r.serviceName}</TableCell>
                    <TableCell className="py-3 text-text-secondary">{r.clientName}</TableCell>
                    <TableCell className="py-3 text-primary text-right font-display">${r.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {todayRecords.length === 0 && (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={5} className="py-8 text-center text-text-muted">
                      No hay servicios registrados hoy
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  // Vista de Barbero
  const accionesRapidas = [
    {
      label: "Registrar Servicio",
      descripcion: "Agrega un nuevo servicio al registro",
      href: "/dashboard/finanzas",
      icon: DollarSign,
      colorIcono: "text-emerald-400",
      bgIcono: "bg-emerald-400/10",
      bordeIcono: "border-emerald-400/20",
      hoverCard: "hover:border-emerald-400/30 hover:bg-emerald-400/5",
    },
    {
      label: "Mis Reservas",
      descripcion: "Consulta tus citas agendadas",
      href: "/dashboard/reservas",
      icon: CalendarDays,
      colorIcono: "text-blue-400",
      bgIcono: "bg-blue-400/10",
      bordeIcono: "border-blue-400/20",
      hoverCard: "hover:border-blue-400/30 hover:bg-blue-400/5",
    },
    {
      label: "Servicios",
      descripcion: "Catálogo de servicios disponibles",
      href: "/dashboard/servicios",
      icon: Scissors,
      colorIcono: "text-primary",
      bgIcono: "bg-primary/10",
      bordeIcono: "border-primary/20",
      hoverCard: "hover:border-primary/30 hover:bg-primary/5",
    },
    {
      label: "Estadísticas",
      descripcion: "Revisa tu rendimiento y métricas",
      href: "/dashboard/estadisticas",
      icon: BarChart3,
      colorIcono: "text-purple-400",
      bgIcono: "bg-purple-400/10",
      bordeIcono: "border-purple-400/20",
      hoverCard: "hover:border-purple-400/30 hover:bg-purple-400/5",
    },
    {
      label: "Mis Objetivos",
      descripcion: "Sigue el avance de tus metas",
      href: "/dashboard/objetivos",
      icon: Target,
      colorIcono: "text-amber-400",
      bgIcono: "bg-amber-400/10",
      bordeIcono: "border-amber-400/20",
      hoverCard: "hover:border-amber-400/30 hover:bg-amber-400/5",
    },
    {
      label: "Mi Historial",
      descripcion: "Consulta todos tus servicios registrados",
      href: "/dashboard/historial",
      icon: History,
      colorIcono: "text-rose-400",
      bgIcono: "bg-rose-400/10",
      bordeIcono: "border-rose-400/20",
      hoverCard: "hover:border-rose-400/30 hover:bg-rose-400/5",
    },
  ];

  const stats = [
    { name: "Tus Ingresos Hoy", value: `$${barberDaily.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400" },
    { name: "Tus Ingresos Semana", value: `$${weekRecords.reduce((s, r) => s + r.barberShare, 0).toFixed(2)}`, icon: TrendingUp, color: "text-blue-400" },
    { name: "Tus Ingresos Mes", value: `$${monthRecords.reduce((s, r) => s + r.barberShare, 0).toFixed(2)}`, icon: Activity, color: "text-primary-light" },
    { name: "Servicios Hoy", value: todayServices.toString(), icon: Scissors, color: "text-primary" },
  ];

  return (
    <div className="space-y-8">
      

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card-premium p-6 hover:border-primary/30 transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-lg bg-surface-high flex items-center justify-center border border-border-subtle">
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-widest mb-1">{stat.name}</p>
                <h3 className="font-display text-3xl text-text-primary">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Acciones Rápidas */}
      <div className="space-y-4">
        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-text-muted font-bold px-1">
          Acciones Rápidas
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accionesRapidas.map((accion) => {
            const Icono = accion.icon;
            return (
              <Link
                key={accion.href}
                href={accion.href}
                className={`group card-premium p-5 flex items-center gap-4 transition-all duration-300 border border-border-subtle ${accion.hoverCard}`}
              >
                <div className={`w-12 h-12 rounded-xl ${accion.bgIcono} border ${accion.bordeIcono} flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110`}>
                  <Icono size={22} className={accion.colorIcono} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-bold text-text-primary uppercase tracking-widest leading-tight">{accion.label}</p>
                  <p className="text-text-muted text-[11px] mt-1 leading-snug">{accion.descripcion}</p>
                </div>
                <ArrowRight size={16} className="text-text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="card-premium p-6">
          <h3 className="font-display text-2xl text-text-primary mb-6 flex items-center gap-3 tracking-[0.05em] uppercase">
            <Wallet size={22} className="text-primary" />
            DISTRIBUCIÓN DE <span className="text-primary">GANANCIAS</span>
            <span className="text-text-muted text-sm ml-2 font-body opacity-50 tracking-tight lowercase font-medium italic">(Hoy)</span>
          </h3>
          {todayRecords.length > 0 ? (
            <div className="bg-surface-high/50 p-5 rounded-xl border border-border-subtle hover:border-primary/30 transition-all duration-300 group w-full">
              <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_260px] gap-6 items-stretch">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    <Scissors size={18} className="text-primary" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl text-white leading-none">
                      {todayServices}
                    </span>
                    <p className="text-text-secondary text-[11px] sm:text-xs uppercase tracking-[0.16em] font-semibold leading-none">
                      servicio{todayServices !== 1 ? "s" : ""} hoy
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center border border-white/5 rounded-lg bg-void/20 px-4 py-4">
                    <span className="text-text-secondary text-[11px] uppercase tracking-widest font-bold">Tu Parte <span className="text-text-muted/50 font-normal">(60%)</span></span>
                    <span className="font-display text-2xl text-emerald-400">${barberDaily.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border border-white/5 rounded-lg bg-void/20 px-4 py-4">
                    <span className="text-text-secondary text-[11px] uppercase tracking-widest font-bold">Barbería <span className="text-text-muted/50 font-normal">(40%)</span></span>
                    <span className="font-display text-2xl text-blue-400">${barberiaDaily.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-auto flex justify-between items-center bg-void/40 p-4 rounded-lg border border-white/5 relative overflow-hidden group-hover:border-white/10 transition-colors">
                  <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="text-white text-[10px] uppercase tracking-[0.2em] font-bold relative z-10">Total Generado</span>
                  <span className="font-display text-3xl text-white relative z-10">${dailyRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-surface-high/20 rounded-xl border border-white/5 border-dashed">
              <Wallet size={32} className="text-text-muted/30 mb-3" />
              <p className="text-text-muted text-sm uppercase tracking-widest font-bold text-[10px]">No hay ganancias registradas hoy</p>
            </div>
          )}
        </div>

        <div className="card-premium p-6">
          <h3 className="font-display text-xl text-text-primary mb-4">Tus Servicios de Hoy</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead align="right">Tu Parte (60%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayRecords.map((r) => (
                  <TableRow key={r.id} className="hover:bg-surface-high/30">
                    <TableCell className="py-3 text-text-secondary">{r.date}</TableCell>
                    <TableCell className="py-3 text-text-primary">{r.serviceName}</TableCell>
                    <TableCell className="py-3 text-text-secondary">{r.clientName}</TableCell>
                    <TableCell className="py-3 text-emerald-400 text-right font-display">${r.barberShare.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {todayRecords.length === 0 && (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={4} className="py-8 text-center text-text-muted">
                      No has registrado servicios hoy
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
