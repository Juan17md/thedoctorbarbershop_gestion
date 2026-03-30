"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord, SERVICES, type Service } from "@/lib/types";
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
import { DollarSign, Users, Wallet, Plus, Check } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Select } from "@/components/ui";

interface Transaccion {
  id: string;
  tipo: "acta" | "gasto";
  concepto: string;
  monto: number;
  fechaString: string;
}

const normalizarNombreServicio = (nombre: string) => nombre.trim().toLowerCase();

export default function FinanzasPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Service[]>(SERVICES);
  const [periodFilter, setPeriodFilter] = useState<"day" | "week" | "month">("day");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ serviceId: "", clientName: "" });

  useEffect(() => {
    if (!userRole?.uid) {
      return;
    }

    const consulta = isAdmin
      ? query(collection(db, "finances"), orderBy("date", "desc"))
      : query(
          collection(db, "finances"),
          where("barberId", "==", userRole.uid),
          orderBy("date", "desc")
        );

    const unsubscribe = onSnapshot(consulta, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
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

  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serviciosPersonalizados = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Service[];

      const serviciosBase = [...SERVICES];
      const nombresBase = new Set(
        serviciosBase.map((servicio) => normalizarNombreServicio(servicio.name))
      );

      const serviciosExtra = serviciosPersonalizados.filter(
        (servicio) => !nombresBase.has(normalizarNombreServicio(servicio.name))
      );

      setServiciosDisponibles([...serviciosBase, ...serviciosExtra]);
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
    const service = serviciosDisponibles.find(s => s.id === formData.serviceId);
    if (!service) return;

    const totalAmount = service.price;
    const barberShareAmount = totalAmount * 0.6;
    const barberiaShareAmount = totalAmount * 0.4;
    const date = new Date().toISOString().split("T")[0];

    // 1. Crear registro financiero
    await addDoc(collection(db, "finances"), {
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2 animate-fade-in-up">
        <div className="flex flex-wrap gap-4 items-center delay-children-1">
          <div className="flex bg-surface-high rounded-lg p-1 border border-white/5">
            <button 
              onClick={() => setPeriodFilter("day")}
              className={`px-4 py-2 rounded-md font-display text-[13px] font-bold tracking-widest uppercase transition-all ${periodFilter === "day" ? "bg-primary/15 text-white border border-primary shadow-red-glow" : "text-text-secondary hover:text-white border border-transparent"}`}
            >
              Hoy
            </button>
            <button 
              onClick={() => setPeriodFilter("week")}
              className={`px-4 py-2 rounded-md font-display text-[13px] font-bold tracking-widest uppercase transition-all ${periodFilter === "week" ? "bg-primary/15 text-white border border-primary shadow-red-glow" : "text-text-secondary hover:text-white border border-transparent"}`}
            >
              Semana
            </button>
            <button 
              onClick={() => setPeriodFilter("month")}
              className={`px-4 py-2 rounded-md font-display text-[13px] font-bold tracking-widest uppercase transition-all ${periodFilter === "month" ? "bg-primary/15 text-white border border-primary shadow-red-glow" : "text-text-secondary hover:text-white border border-transparent"}`}
            >
              Mes
            </button>
          </div>

          {periodFilter === "day" && (
            <DatePicker
              value={selectedDate}
              onChange={(v) => setSelectedDate(v)}
              placeholder="Seleccionar fecha"
            />
          )}
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary text-sm py-2.5 px-6 whitespace-nowrap"
        >
          <Plus size={18} /> Registrar Servicio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up delay-children-1">
        <div className="card-premium p-6 border-l-4 border-l-primary/80">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={24} className="text-primary" />
            <span className="text-text-secondary font-display text-sm tracking-widest uppercase">Servicios (Total)</span>
          </div>
          <p className="font-display text-4xl text-white mt-4">${totalRevenue.toFixed(2)}</p>
        </div>
        
        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users size={24} className="text-blue-400" />
            <span className="text-text-secondary font-display text-sm tracking-widest uppercase">{isAdmin ? "Para Barberos (60%)" : "Tu Parte (60%)"}</span>
          </div>
          <p className="font-display text-4xl text-white mt-4">${barberShare.toFixed(2)}</p>
        </div>

        <div className="card-premium p-6">
          <div className="flex items-center gap-3 mb-2">
            <Wallet size={24} className="text-emerald-400" />
            <span className="text-text-secondary font-display text-sm tracking-widest uppercase">Para Barbería (40%)</span>
          </div>
          <p className="font-display text-4xl text-white mt-4">${barberiaShare.toFixed(2)}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          <div className="card-premium p-6 border-l-4 border-l-emerald-500/80">
            <p className="text-text-secondary font-display text-sm tracking-widest uppercase mb-4">Ingresos (Actas)</p>
            <p className="font-display text-3xl text-white">${ingresos.toFixed(2)}</p>
          </div>
          <div className="card-premium p-6 border-l-4 border-l-red-500/80">
            <p className="text-text-secondary font-display text-sm tracking-widest uppercase mb-4">Egresos (Gastos)</p>
            <p className="font-display text-3xl text-white">${egresos.toFixed(2)}</p>
          </div>
          <div className="card-premium p-6 border-l-4 border-primary">
            <p className="text-text-secondary font-display text-sm tracking-widest uppercase mb-4">Balance Neto</p>
            <p className="font-display text-3xl text-white">${(ingresos - egresos).toFixed(2)}</p>
          </div>
        </div>
      )}

      {Object.keys(revenueByService).length > 0 && (
        <div className="card-premium overflow-hidden animate-fade-in-up">
          <div className="p-6 border-b border-white/5">
            <h3 className="font-display text-xl text-white tracking-widest uppercase">Ganancias por Servicio</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Servicio</TableHead>
                  <TableHead>Citas</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(revenueByService).map(([service, amount]) => (
                  <TableRow key={service}>
                    <TableCell className="text-white text-sm font-medium">{service}</TableCell>
                    <TableCell className="text-text-secondary text-sm">{serviceCount[service]}</TableCell>
                    <TableCell className="text-primary font-display text-lg tracking-wider">${amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="card-premium overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-display text-xl text-white tracking-widest uppercase">Historial de Servicios</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                {isAdmin && <TableHead>Barbero</TableHead>}
                <TableHead>Servicio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead align="right">{isAdmin ? "Barbero (60%)" : "Tu Parte"}</TableHead>
                <TableHead align="right">Barbería (40%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.slice(0, 20).map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-text-secondary text-sm">{record.date}</TableCell>
                  {isAdmin && <TableCell className="text-white text-sm font-medium">{record.barberName}</TableCell>}
                  <TableCell className="text-white text-sm font-medium">{record.serviceName}</TableCell>
                  <TableCell className="text-text-secondary text-sm">{record.clientName}</TableCell>
                  <TableCell className="text-white text-right font-display tracking-widest">${record.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-emerald-400 text-right font-display tracking-widest">${record.barberShare.toFixed(2)}</TableCell>
                  <TableCell className="text-blue-400 text-right font-display tracking-widest">${record.barberiaShare.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Wallet size={48} className="text-surface-highest mb-4" />
            <p className="text-sm font-display tracking-widest uppercase">No hay servicios en el período seleccionado</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">Registrar Servicio</h2>
            <form onSubmit={handleRegisterService} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Servicio</label>
                <Select
                  options={serviciosDisponibles.map(s => ({ value: s.id, label: `$${s.price.toFixed(2)} - ${s.name}` }))}
                  value={formData.serviceId}
                  onChange={(val: string) => setFormData({ ...formData, serviceId: val })}
                  placeholder="Seleccionar servicio..."
                  className="bg-void/50 border-white/10 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Cliente (opcional)</label>
                <input 
                  type="text" 
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                  placeholder="Nombre del cliente"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary text-sm py-3"
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
