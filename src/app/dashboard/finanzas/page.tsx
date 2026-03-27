"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord, SERVICES, BARBERS } from "@/lib/types";
import { 
  collection, 
  addDoc, 
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DollarSign, TrendingUp, Calendar, Users, Scissors, Wallet, Filter, Plus, Check } from "lucide-react";

interface Transaccion {
  id: string;
  tipo: "acta" | "gasto";
  concepto: string;
  monto: number;
  fechaString: string;
}

export default function FinanzasPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [periodFilter, setPeriodFilter] = useState<"day" | "week" | "month">("day");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ serviceId: "", clientName: "" });

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

  useEffect(() => {
    const q = query(collection(db, "transacciones"), orderBy("creadoAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaccion[];
      setTransacciones(datos);
    });
    return () => unsubscribe();
  }, []);

  const getFilteredRecords = () => {
    const now = new Date();
    
    return records.filter(record => {
      if (periodFilter === "day") {
        return record.date === selectedDate;
      } else if (periodFilter === "week") {
        const recordDate = new Date(record.date);
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return recordDate >= weekStart;
      } else if (periodFilter === "month") {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const filteredRecords = getFilteredRecords();

  const totalRevenue = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  const barberShare = filteredRecords.reduce((sum, r) => sum + r.barberShare, 0);
  const barberiaShare = filteredRecords.reduce((sum, r) => sum + r.barberiaShare, 0);

  const ingresos = transacciones
    .filter((t) => t.tipo === "acta")
    .reduce((acc, curr) => acc + curr.monto, 0);

  const egresos = transacciones
    .filter((t) => t.tipo === "gasto")
    .reduce((acc, curr) => acc + curr.monto, 0);

  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    const service = SERVICES.find(s => s.id === formData.serviceId);
    if (!service) return;

    const totalAmount = service.price;
    const barberShareAmount = totalAmount * 0.6;
    const barberiaShareAmount = totalAmount * 0.4;
    const date = new Date().toISOString().split("T")[0];

    // 1. Crear registro financiero
    const financeDoc = await addDoc(collection(db, "finances"), {
      serviceId: service.id,
      serviceName: service.name,
      barberId: userRole?.uid,
      barberName: userRole?.name,
      clientName: formData.clientName || "Cliente",
      totalAmount,
      barberShare: barberShareAmount,
      barberiaShare: barberiaShareAmount,
      date,
      createdAt: new Date()
    });

    // 2. Actualizar banco del barbero
    const barberBankRef = doc(db, "bank", userRole?.uid || "");
    const barberBankDoc = await getDoc(barberBankRef);
    if (barberBankDoc.exists()) {
      await updateDoc(barberBankRef, {
        balance: increment(barberShareAmount),
        totalEarned: increment(barberShareAmount),
        lastUpdated: new Date()
      });
    } else {
      await setDoc(barberBankRef, {
        userId: userRole?.uid,
        userName: userRole?.name,
        balance: barberShareAmount,
        totalEarned: barberShareAmount,
        totalPaid: 0,
        lastUpdated: new Date()
      });
    }

    // 3. Agregar transacción al historial del banco del barbero
    await addDoc(collection(db, "bank_transactions"), {
      userId: userRole?.uid,
      userName: userRole?.name,
      type: "earning",
      amount: barberShareAmount,
      description: `Servicio: ${service.name}`,
      date,
      createdAt: new Date()
    });

    // 4. Actualizar banco de la barbería (admin)
    const barberiaBankRef = doc(db, "bank", "barbershop");
    const barberiaBankDoc = await getDoc(barberiaBankRef);
    if (barberiaBankDoc.exists()) {
      await updateDoc(barberiaBankRef, {
        balance: increment(barberiaShareAmount),
        totalEarned: increment(barberiaShareAmount),
        lastUpdated: new Date()
      });
    } else {
      await setDoc(barberiaBankRef, {
        userId: "barbershop",
        userName: "The Doctor Barber Shop",
        balance: barberiaShareAmount,
        totalEarned: barberiaShareAmount,
        totalPaid: 0,
        lastUpdated: new Date()
      });
    }

    // 5. Agregar transacción al historial de la barbería
    await addDoc(collection(db, "bank_transactions"), {
      userId: "barbershop",
      userName: "The Doctor Barber Shop",
      type: "earning",
      amount: barberiaShareAmount,
      description: `Servicio: ${service.name} (${userRole?.name})`,
      date,
      createdAt: new Date()
    });

    // 6. Actualizar objetivos automáticamente
    const objectivesQuery = query(collection(db, "objectives"));
    const objectivesSnapshot = await getDocs(objectivesQuery);
    const now = new Date();
    
    for (const objDoc of objectivesSnapshot.docs) {
      const objData = objDoc.data();
      const endDate = objData.endDate?.toDate();
      
      // Solo actualizar si el objetivo está vigente
      if (endDate && endDate >= now) {
        const isBarberObjective = objData.barberoId && objData.barberoId === userRole?.uid;
        const isGeneralObjective = !objData.barberoId;
        
        if (isBarberObjective || isGeneralObjective) {
          const currentAmount = objData.currentAmount || 0;
          const newAmount = isBarberObjective 
            ? currentAmount + barberShareAmount 
            : currentAmount + totalAmount;
          
          await updateDoc(doc(db, "objectives", objDoc.id), {
            currentAmount: newAmount
          });
        }
      }
    }

    setIsModalOpen(false);
    setFormData({ serviceId: "", clientName: "" });
  };

  const revenueByService = filteredRecords.reduce((acc, r) => {
    acc[r.serviceName] = (acc[r.serviceName] || 0) + r.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const serviceCount = filteredRecords.reduce((acc, r) => {
    acc[r.serviceName] = (acc[r.serviceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">Finanzas</h1>
          <p className="text-text-secondary mt-1">
            {isAdmin ? "Gestiona las finanzas de la barbería" : "Gestiona tus finanzas"}
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-surgical flex items-center gap-2"
        >
          <Plus size={18} /> Registrar Servicio
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex bg-surface-high rounded-lg p-1">
          <button 
            onClick={() => setPeriodFilter("day")}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${periodFilter === "day" ? "bg-surgical-red text-white" : "text-text-secondary hover:text-white"}`}
          >
            Hoy
          </button>
          <button 
            onClick={() => setPeriodFilter("week")}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${periodFilter === "week" ? "bg-surgical-red text-white" : "text-text-secondary hover:text-white"}`}
          >
            Semana
          </button>
          <button 
            onClick={() => setPeriodFilter("month")}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${periodFilter === "month" ? "bg-surgical-red text-white" : "text-text-secondary hover:text-white"}`}
          >
            Mes
          </button>
        </div>

        {periodFilter === "day" && (
          <input 
            type="date" 
            className="input-surgical bg-surface-high"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 border border-surgical-red/30">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={24} className="text-surgical-red" />
            <span className="text-text-secondary text-sm">Servicios (Total)</span>
          </div>
          <p className="font-display text-3xl text-white">${totalRevenue.toFixed(2)}</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users size={24} className="text-blue-400" />
            <span className="text-text-secondary text-sm">{isAdmin ? "Para Barberos (60%)" : "Tu Parte (60%)"}</span>
          </div>
          <p className="font-display text-3xl text-white">${barberShare.toFixed(2)}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Wallet size={24} className="text-green-400" />
            <span className="text-text-secondary text-sm">Para Barbería (40%)</span>
          </div>
          <p className="font-display text-3xl text-white">${barberiaShare.toFixed(2)}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-6 border-l-4 border-l-green-500">
            <p className="text-text-secondary text-sm">Ingresos (Actas)</p>
            <p className="font-display text-2xl text-white">${ingresos.toFixed(2)}</p>
          </div>
          <div className="glass-card p-6 border-l-4 border-l-red-500">
            <p className="text-text-secondary text-sm">Egresos (Gastos)</p>
            <p className="font-display text-2xl text-white">${egresos.toFixed(2)}</p>
          </div>
          <div className="glass-card p-6 border-l-4 border-surgical-red">
            <p className="text-text-secondary text-sm">Balance Neto</p>
            <p className="font-display text-2xl text-white">${(ingresos - egresos).toFixed(2)}</p>
          </div>
        </div>
      )}

      {Object.keys(revenueByService).length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-display text-xl text-white mb-4">Ganancias por Servicio</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline">
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Servicio</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Citas</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(revenueByService).map(([service, amount]) => (
                  <tr key={service} className="border-b border-white/5">
                    <td className="py-3 px-4 text-white">{service}</td>
                    <td className="py-3 px-4 text-text-secondary">{serviceCount[service]}</td>
                    <td className="py-3 px-4 text-surgical-red font-display">${amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <h3 className="font-display text-xl text-white mb-4">Historial de Servicios</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Fecha</th>
                {isAdmin && <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Barbero</th>}
                <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Servicio</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Cliente</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Total</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">{isAdmin ? "Barbero (60%)" : "Tu Parte"}</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Barbería (40%)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.slice(0, 20).map((record) => (
                <tr key={record.id} className="border-b border-white/5 hover:bg-surface-high/30">
                  <td className="py-3 px-4 text-text-secondary">{record.date}</td>
                  {isAdmin && <td className="py-3 px-4 text-white">{record.barberName}</td>}
                  <td className="py-3 px-4 text-white">{record.serviceName}</td>
                  <td className="py-3 px-4 text-text-secondary">{record.clientName}</td>
                  <td className="py-3 px-4 text-white text-right">${record.totalAmount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-green-400 text-right">${record.barberShare.toFixed(2)}</td>
                  <td className="py-3 px-4 text-blue-400 text-right">${record.barberiaShare.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No hay servicios registrados en el período seleccionado
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 w-full max-w-md">
            <h2 className="font-display text-2xl text-white mb-6">Registrar Servicio</h2>
            <form onSubmit={handleRegisterService} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Servicio</label>
                <select 
                  className="input-surgical bg-transparent w-full"
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  required
                >
                  <option value="">Seleccionar servicio...</option>
                  {SERVICES.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - ${s.price}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Cliente (opcional)</label>
                <input 
                  type="text" 
                  className="input-surgical bg-transparent w-full"
                  placeholder="Nombre del cliente"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-outline text-text-secondary hover:bg-surface-high transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-surgical flex items-center justify-center gap-2"
                >
                  <Check size={18} /> Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
