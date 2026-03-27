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

export default function EstadisticasPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [periodFilter, setPeriodFilter] = useState<"day" | "week" | "month">("week");

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
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as FinancialRecord[];
      setRecords(data);
    });
    return () => unsubscribe();
  }, [isAdmin, userRole?.uid]);

  const getFilteredRecords = () => {
    const now = new Date();
    
    return records.filter(record => {
      const recordDate = new Date(record.date);
      if (periodFilter === "day") {
        return record.date === now.toISOString().split("T")[0];
      } else if (periodFilter === "week") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return recordDate >= weekStart;
      } else if (periodFilter === "month") {
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const filteredRecords = getFilteredRecords();

  const totalServices = filteredRecords.length;
  const totalRevenue = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);
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
    acc[r.date] = (acc[r.date] || 0) + r.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const topService = Object.entries(servicesByType).sort((a, b) => b[1] - a[1])[0];
  const topBarber = Object.entries(revenueByBarber).sort((a, b) => b[1] - a[1])[0];

  const maxDaily = Math.max(...Object.values(dailyStats), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-urban-header text-text-primary">ESTADÍSTICAS</h1>
          <p className="text-text-muted mt-1 text-sm">
            {isAdmin ? "Overview completo de la barbería" : "Tu rendimiento personal"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["day", "week", "month"] as const).map((period) => (
          <button 
            key={period}
            onClick={() => setPeriodFilter(period)}
            className={`px-6 py-2 rounded-md font-display text-[13px] font-bold tracking-widest uppercase transition-all border ${
              periodFilter === period 
                ? "bg-primary text-white border-primary shadow-red-glow" 
                : "bg-surface-high text-text-muted border-white/5 hover:border-primary/30 hover:text-white"
            }`}
          >
            {period === "day" ? "Hoy" : period === "week" ? "Semana" : "Mes"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Scissors size={20} className="text-primary" />
            </div>
            <span className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Servicios</span>
          </div>
          <p className="font-display text-5xl text-white tracking-tight leading-none">{totalServices}</p>
        </div>
        
        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DollarSign size={20} className="text-emerald-400" />
            </div>
            <span className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Ingresos</span>
          </div>
          <p className="font-display text-5xl text-white tracking-tight leading-none">${totalRevenue.toFixed(2)}</p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <span className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Promedio</span>
          </div>
          <p className="font-display text-5xl text-white tracking-tight leading-none">${avgTicket.toFixed(2)}</p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topService && (
          <div className="card-premium p-6 group">
            <h3 className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase mb-3 opacity-70">Popular</h3>
            <p className="font-display text-4xl text-white leading-none mb-2 group-hover:text-primary transition-colors uppercase tracking-tight">{topService[0]}</p>
            <p className="text-primary font-display text-xl tracking-widest">{topService[1]} SERVICIOS</p>
          </div>
        )}
        {isAdmin && topBarber && (
          <div className="card-premium p-6 group">
            <h3 className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase mb-3 opacity-70">Mejor Barbero</h3>
            <p className="font-display text-4xl text-white leading-none mb-2 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{topBarber[0]}</p>
            <p className="text-emerald-400 font-display text-xl tracking-widest">${topBarber[1].toFixed(2)}</p>
          </div>
        )}
      </div>

      <div className="card-premium p-6">
        <h3 className="font-display text-2xl text-text-primary mb-6 tracking-[0.05em] uppercase">INGRESOS POR <span className="text-primary">JORNADA</span></h3>
        <div className="space-y-4">
          {Object.entries(dailyStats).sort((a, b) => a[0].localeCompare(b[0])).map(([date, amount]) => (
            <div key={date} className="flex items-center gap-4">
              <span className="text-text-muted text-[11px] font-medium w-24 uppercase">{date}</span>
              <div className="flex-1 h-3 bg-surface-high rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-linear-to-r from-primary-dark to-primary rounded-full transition-all duration-1000"
                  style={{ width: `${maxDaily > 0 ? (amount / maxDaily) * 100 : 0}%` }}
                />
              </div>
              <span className="text-white font-display text-xl w-24 text-right tracking-wider">${amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(servicesByType).length > 0 && (
        <div className="card-premium p-6">
          <h3 className="font-display text-2xl text-text-primary mb-6 tracking-[0.05em] uppercase">DISTRIBUCIÓN POR <span className="text-primary">SERVICIO</span></h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(servicesByType).map(([service, count]) => (
              <div key={service} className="bg-void/50 p-4 rounded-lg border border-white/5 text-center group hover:border-primary/30 transition-all">
                <p className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-70">{service}</p>
                <p className="font-display text-4xl text-white tracking-widest group-hover:text-primary transition-colors">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && Object.keys(revenueByBarber).length > 0 && (
        <div className="card-premium p-6">
          <h3 className="font-display text-2xl text-white mb-6 tracking-[0.05em] uppercase">RENDIMIENTO POR <span className="text-primary">STAFF</span></h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-4 px-4 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Barbero</th>
                  <th className="text-left py-4 px-4 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Servicios</th>
                  <th className="text-left py-4 px-4 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Ingresos</th>
                  <th className="text-left py-4 px-4 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">% Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(revenueByBarber)
                  .sort((a, b) => b[1] - a[1])
                  .map(([barber, revenue]) => {
                    const services = filteredRecords.filter(r => r.barberName === barber).length;
                    const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                    return (
                      <tr key={barber} className="border-b border-white/2 hover:bg-white/1 transition-colors">
                        <td className="py-4 px-4 text-text-primary font-medium tracking-wide">{barber}</td>
                        <td className="py-4 px-4 text-text-secondary">{services}</td>
                        <td className="py-4 px-4 text-primary font-display text-xl tracking-wider">${revenue.toFixed(2)}</td>
                        <td className="py-4 px-4 text-text-muted text-sm">{percentage.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
