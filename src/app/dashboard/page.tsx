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
import { DollarSign, Users, Scissors, TrendingUp, Activity, CalendarCheck, Wallet, Target } from "lucide-react";

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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-urban-header text-text-primary">
              RESUMEN DE <span className="text-primary">OPERACIONES</span>
            </h1>
            <p className="text-text-muted mt-2 text-sm">
              Bienvenido, {userRole?.name}. Aquí está el overview de la barbería.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="card-premium p-6 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-high flex items-center justify-center border border-white/5 group-hover:border-primary/50 transition-colors">
                    <Icon size={20} className={stat.color} />
                  </div>
                </div>
                <div>
                  <p className="text-text-muted text-[10px] uppercase tracking-[0.2em] font-bold mb-1 opacity-70">{stat.name}</p>
                  <h3 className="font-display text-5xl text-text-primary tracking-tight leading-none group-hover:scale-110 transition-transform origin-left duration-500">{stat.value}</h3>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-premium p-6">
            <h3 className="font-display text-2xl text-text-primary mb-6 flex items-center gap-3 tracking-[0.05em] uppercase">
              <Wallet size={22} className="text-primary" />
              DISTRIBUCIÓN DE <span className="text-primary">GANANCIAS</span> <span className="text-text-muted text-sm ml-2 font-body font-normal opacity-50 tracking-tight lowercase font-medium italic">(Hoy)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-high/50 p-4 rounded-lg border border-border-subtle">
                <p className="text-text-secondary text-sm">Para Barberos (60%)</p>
                <p className="font-display text-2xl text-emerald-400">${barberDaily.toFixed(2)}</p>
              </div>
              <div className="bg-surface-high/50 p-4 rounded-lg border border-border-subtle">
                <p className="text-text-secondary text-sm">Para Barbería (40%)</p>
                <p className="font-display text-2xl text-blue-400">${barberiaDaily.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <h3 className="font-display text-2xl text-text-primary mb-6 flex items-center gap-3 tracking-[0.05em] uppercase">
              <Users size={22} className="text-primary" />
              TOP <span className="text-primary">BARBERO</span> <span className="text-text-muted text-sm ml-2 font-body font-normal opacity-50 tracking-tight lowercase font-medium italic">(Día)</span>
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Barbero</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Servicio</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Cliente</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {todayRecords.slice(0, 5).map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-high/30 transition-colors">
                    <td className="py-3 px-4 text-text-secondary">{r.date}</td>
                    <td className="py-3 px-4 text-text-primary">{r.barberName}</td>
                    <td className="py-3 px-4 text-text-secondary">{r.serviceName}</td>
                    <td className="py-3 px-4 text-text-secondary">{r.clientName}</td>
                    <td className="py-3 px-4 text-primary text-right font-display">${r.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
                {todayRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-muted">
                      No hay servicios registrados hoy
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Vista de Barbero
  const stats = [
    { name: "Tus Ingresos Hoy", value: `$${barberDaily.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400" },
    { name: "Tus Ingresos Semana", value: `$${weekRecords.reduce((s, r) => s + r.barberShare, 0).toFixed(2)}`, icon: TrendingUp, color: "text-blue-400" },
    { name: "Tus Ingresos Mes", value: `$${monthRecords.reduce((s, r) => s + r.barberShare, 0).toFixed(2)}`, icon: Activity, color: "text-primary-light" },
    { name: "Servicios Hoy", value: todayServices.toString(), icon: Scissors, color: "text-primary" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-urban-header text-text-primary">
            HOLA, <span className="text-primary">{userRole?.name?.toUpperCase()}</span>
          </h1>
          <p className="text-text-muted mt-2 text-sm">
            Este es tu resumen de ganancias y rendimiento.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card-premium p-6 hover:border-primary/30 transition-all duration-300">
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

      <div className="card-premium p-6">
        <h3 className="font-display text-xl text-text-primary mb-4">Tus Servicios de Hoy</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Hora</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Servicio</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Cliente</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider">Tu Parte (60%)</th>
              </tr>
            </thead>
            <tbody>
              {todayRecords.map((r) => (
                <tr key={r.id} className="border-b border-border-subtle hover:bg-surface-high/30 transition-colors">
                  <td className="py-3 px-4 text-text-secondary">{r.date}</td>
                  <td className="py-3 px-4 text-text-primary">{r.serviceName}</td>
                  <td className="py-3 px-4 text-text-secondary">{r.clientName}</td>
                  <td className="py-3 px-4 text-emerald-400 text-right font-display">${r.barberShare.toFixed(2)}</td>
                </tr>
              ))}
              {todayRecords.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted">
                    No has registrado servicios hoy
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
