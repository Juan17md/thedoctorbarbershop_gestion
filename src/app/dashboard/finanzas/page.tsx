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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  DollarSign, 
  Users, 
  Wallet, 
  Plus, 
  Check, 
  Scissors, 
  TrendingUp,
  Pencil,
  Trash2,
  X,
  Loader2
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Select } from "@/components/ui";
import { getLocalDateString, getStartOfWeekString, getStartOfMonthString } from "@/lib/utils";

interface Transaccion {
  id: string;
  tipo: "acta" | "gasto";
  concepto: string;
  monto: number;
  fechaString: string;
  creadoAt?: any;
}

const normalizarNombreServicio = (nombre: string) => nombre.trim().toLowerCase();

export default function FinanzasPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Service[]>(SERVICES);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [periodFilter, setPeriodFilter] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ serviceId: "", clientName: "", barberId: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actualizar la fecha seleccionada automáticamente a medianoche si el filtro es "hoy"
  useEffect(() => {
    const timer = setInterval(() => {
      const today = getLocalDateString();
      if (periodFilter === "day" && selectedDate !== today) {
        // Solo actualizamos si el usuario no ha cambiado manualmente la fecha
        // (En este caso, setSelectedDate se usa tanto para el 'Hoy' por defecto como para el DatePicker)
        // Para simplificar y cumplir el requerimiento de "limpieza automática", 
        // si es un nuevo día, reseteamos a ese día.
        setSelectedDate(today);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [periodFilter, selectedDate]);


  // Estado para Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<FinancialRecord | null>(null);

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

  useEffect(() => {
    if (!isAdmin) return;
    
    const consulta = query(
      collection(db, "users"), 
      where("role", "==", "barber"),
      orderBy("name")
    );
    const unsubscribe = onSnapshot(consulta, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBarbers(data);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const getFilteredRecords = () => {
    const startOfWeek = getStartOfWeekString();
    const startOfMonth = getStartOfMonthString();
    
    return records.filter(record => {
      if (periodFilter === "day") {
        return record.date === selectedDate;
      } else if (periodFilter === "week") {
        return record.date >= startOfWeek;
      } else if (periodFilter === "month") {
        return record.date >= startOfMonth;
      }
      return true;
    });
  };

  const filteredRecords = getFilteredRecords();

  const totalRevenue = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + r.totalAmount, 0);
  const barberShare = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + r.barberShare, 0);
  const barberiaShare = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + r.barberiaShare, 0);

  // Global totals for Balance Neto
  const globalBarberiaShare = records.reduce((sum: number, r: FinancialRecord) => sum + r.barberiaShare, 0);

  const globalIngresos = transacciones
    .filter((t) => t.tipo === "acta")
    .reduce((acc: number, curr: Transaccion) => acc + curr.monto, 0);

  const globalEgresos = transacciones
    .filter((t) => t.tipo === "gasto")
    .reduce((acc: number, curr: Transaccion) => acc + curr.monto, 0);

  // Filtered transactions for period cards
  const getFilteredTransacciones = () => {
    const startOfWeek = getStartOfWeekString();
    const startOfMonth = getStartOfMonthString();
    
    return transacciones.filter(t => {
      // Usar la fecha de creación normalizada a Venezuela
      let txDate: Date;
      if (t.creadoAt?.toDate) {
        txDate = t.creadoAt.toDate();
      } else if (t.creadoAt instanceof Date) {
        txDate = t.creadoAt;
      } else {
        return true;
      }

      const txDateStr = getLocalDateString(txDate);

      if (periodFilter === "day") {
        return txDateStr === selectedDate;
      } else if (periodFilter === "week") {
        return txDateStr >= startOfWeek;
      } else if (periodFilter === "month") {
        return txDateStr >= startOfMonth;
      }
      return true;
    });
  };

  const filteredTransacciones = getFilteredTransacciones();

  const ingresos = filteredTransacciones
    .filter((t) => t.tipo === "acta")
    .reduce((acc: number, curr: Transaccion) => acc + curr.monto, 0);

  const egresos = filteredTransacciones
    .filter((t) => t.tipo === "gasto")
    .reduce((acc: number, curr: Transaccion) => acc + curr.monto, 0);

  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const service = serviciosDisponibles.find(s => s.id === formData.serviceId);
    if (!service) return;

    // Determinar barbero (el seleccionado por admin o el actual)
    const finalBarberId = isAdmin ? (formData.barberId || userRole?.uid) : userRole?.uid;
    const finalBarber = isAdmin && formData.barberId 
      ? (barbers.find(b => b.id === formData.barberId) || userRole)
      : userRole;

    if (!finalBarberId) {
      alert("Debes seleccionar un barbero");
      return;
    }

    setIsSubmitting(true);
    try {
      const totalAmount = service.price;
      const barberShareAmount = totalAmount * 0.6;
      const barberiaShareAmount = totalAmount * 0.4;
      const date = getLocalDateString();

      // 1. Crear registro financiero
      await addDoc(collection(db, "finances"), {
        serviceId: service.id,
        serviceName: service.name,
        barberId: finalBarberId,
        barberName: finalBarber.name,
        clientName: formData.clientName || "Cliente",
        totalAmount,
        barberShare: barberShareAmount,
        barberiaShare: barberiaShareAmount,
        date,
        createdAt: new Date()
      });

      // 2. Actualizar banco del barbero
      const barberBankRef = doc(db, "bank", finalBarberId || "");
      const barberBankDoc = await getDoc(barberBankRef);
      if (barberBankDoc.exists()) {
        await updateDoc(barberBankRef, {
          balance: increment(barberShareAmount),
          totalEarned: increment(barberShareAmount),
          lastUpdated: new Date()
        });
      } else {
        await setDoc(barberBankRef, {
          userId: finalBarberId,
          userName: finalBarber.name,
          balance: barberShareAmount,
          totalEarned: barberShareAmount,
          totalPaid: 0,
          lastUpdated: new Date()
        });
      }

      // 3. Agregar transacción al historial del banco del barbero
      await addDoc(collection(db, "bank_transactions"), {
        userId: finalBarberId,
        userName: finalBarber.name,
        type: "earning",
        amount: barberShareAmount,
        description: `Servicio: ${service.name}`,
        date,
        createdAt: new Date()
      });

      // 4. Actualizar banco de la barbería (admin/barbershop)
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
        description: `Servicio: ${service.name} (${finalBarber.name})`,
        date,
        createdAt: new Date()
      });

      // 6. Actualizar objetivos automáticamente
      try {
        let objectivesQuery;
        if (isAdmin) {
          objectivesQuery = query(collection(db, "objectives"));
        } else {
          objectivesQuery = query(collection(db, "objectives"), where("barberoId", "==", finalBarberId));
        }
        
        const objectivesSnapshot = await getDocs(objectivesQuery);
        const now = new Date();
        
        for (const objDoc of objectivesSnapshot.docs) {
          const objData = objDoc.data();
          const endDate = objData.endDate?.toDate();
          
          // Solo actualizar si el objetivo está vigente
          if (endDate && endDate >= now) {
            const isBarberObjective = objData.barberoId && objData.barberoId === finalBarberId;
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
      } catch (objError) {
        console.error("Error al actualizar objetivos:", objError);
      }

    } catch (error) {
      console.error("Error al registrar el servicio:", error);
      alert("Hubo un error al registrar el servicio. Por favor intenta nuevamente.");
    } finally {
      // Siempre cerrar el modal y limpiar el form al final, incluso si hay error
      setIsSubmitting(false);
      setIsModalOpen(false);
      setFormData({ serviceId: "", clientName: "", barberId: "" });
    }
  };

  const handleDelete = async (record: FinancialRecord) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro? Se revertirán los saldos de ganancias asociados.")) return;

    try {
      // 1. Revertir saldo del barbero
      const barberBankRef = doc(db, "bank", record.barberId);
      const barberBankDoc = await getDoc(barberBankRef);
      if (barberBankDoc.exists()) {
        await updateDoc(barberBankRef, {
          balance: increment(-record.barberShare),
          totalEarned: increment(-record.barberShare),
          lastUpdated: new Date()
        });
      }

      // 2. Transacción de reversión del barbero
      await addDoc(collection(db, "bank_transactions"), {
        userId: record.barberId,
        userName: record.barberName,
        type: "deduction",
        amount: record.barberShare,
        description: `Eliminación/Reversión: ${record.serviceName}`,
        date: getLocalDateString(),
        createdAt: new Date()
      });

      // 3. Revertir saldo de barbería
      const barberiaBankRef = doc(db, "bank", "barbershop");
      const barberiaBankDoc = await getDoc(barberiaBankRef);
      if (barberiaBankDoc.exists()) {
        await updateDoc(barberiaBankRef, {
          balance: increment(-record.barberiaShare),
          totalEarned: increment(-record.barberiaShare),
          lastUpdated: new Date()
        });
      }

      // 4. Transacción de reversión de barbería
      await addDoc(collection(db, "bank_transactions"), {
        userId: "barbershop",
        userName: "The Doctor Barber Shop",
        type: "deduction",
        amount: record.barberiaShare,
        description: `Eliminación/Reversión: ${record.serviceName} (${record.barberName})`,
        date: getLocalDateString(),
        createdAt: new Date()
      });

      // 5. Ajustar objetivos (si aplican)
      try {
        const now = new Date();
        const objectivesQuery = query(collection(db, "objectives"));
        const objectivesSnapshot = await getDocs(objectivesQuery);
        
        for (const objDoc of objectivesSnapshot.docs) {
          const objData = objDoc.data();
          const endDate = objData.endDate?.toDate();
          if (endDate && endDate >= now) {
            const isBarberObjective = objData.barberoId && objData.barberoId === record.barberId;
            const isGeneralObjective = !objData.barberoId;
            
            if (isBarberObjective || isGeneralObjective) {
              const amountToDeduct = isBarberObjective ? record.barberShare : record.totalAmount;
              await updateDoc(doc(db, "objectives", objDoc.id), {
                currentAmount: increment(-amountToDeduct)
              });
            }
          }
        }
      } catch (objError) {
        console.error("Error revirtiendo objetivos:", objError);
      }

      // 6. Eliminar el documento de finances
      await deleteDoc(doc(db, "finances", record.id));

    } catch (error) {
      console.error("Error al eliminar el registro:", error);
      alert("Hubo un error al eliminar.");
    }
  };

  const openEditModal = (record: FinancialRecord) => {
    setRecordToEdit(record);
    setFormData({
      serviceId: record.serviceId,
      clientName: record.clientName,
      barberId: record.barberId
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!recordToEdit) return;

    if (!formData.serviceId || (isAdmin && !formData.barberId)) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    const selService = serviciosDisponibles.find(s => s.id === formData.serviceId);
    if (!selService) return;

    setIsSubmitting(true);

    const finalBarberId = isAdmin ? formData.barberId : recordToEdit.barberId;
    const finalBarber = isAdmin && formData.barberId 
      ? (barbers.find(b => b.id === formData.barberId) || { name: recordToEdit.barberName })
      : { name: recordToEdit.barberName };
    
    const finalBarberName = finalBarber.name;

    const newTotalAmount = selService.price;
    const newBarberShare = newTotalAmount * 0.6;
    const newBarberiaShare = newTotalAmount * 0.4;
    
    try {
      // Si cambia el monto o el barbero, hacemos reversiones de banco
      if (finalBarberId !== recordToEdit.barberId || newTotalAmount !== recordToEdit.totalAmount) {
        // --- 1. REVERTIR LO ANTIGUO ---
        const oldBarberBankRef = doc(db, "bank", recordToEdit.barberId);
        const oldBarberBankDoc = await getDoc(oldBarberBankRef);
        if (oldBarberBankDoc.exists()) {
          await updateDoc(oldBarberBankRef, { 
            balance: increment(-recordToEdit.barberShare), 
            totalEarned: increment(-recordToEdit.barberShare) 
          });
        }
        await addDoc(collection(db, "bank_transactions"), { 
          userId: recordToEdit.barberId, 
          userName: recordToEdit.barberName, 
          type: "deduction", 
          amount: recordToEdit.barberShare, 
          description: `Ajuste (Edición de registro): Reversión ${recordToEdit.serviceName}`, 
          date: getLocalDateString(), 
          createdAt: new Date() 
        });

        const oldBarberiaBankRef = doc(db, "bank", "barbershop");
        const oldBarberiaBankDoc = await getDoc(oldBarberiaBankRef);
        if (oldBarberiaBankDoc.exists()) {
          await updateDoc(oldBarberiaBankRef, { 
            balance: increment(-recordToEdit.barberiaShare), 
            totalEarned: increment(-recordToEdit.barberiaShare) 
          });
        }
        await addDoc(collection(db, "bank_transactions"), { 
          userId: "barbershop", 
          userName: "The Doctor Barber Shop", 
          type: "deduction", 
          amount: recordToEdit.barberiaShare, 
          description: `Ajuste (Edición): Reversión ${recordToEdit.serviceName} (${recordToEdit.barberName})`, 
          date: getLocalDateString(), 
          createdAt: new Date() 
        });

        // --- 2. APLICAR LO NUEVO ---
        const newBarberBankRef = doc(db, "bank", finalBarberId);
        const newBarberBankDoc = await getDoc(newBarberBankRef);
        if (newBarberBankDoc.exists()) {
          await updateDoc(newBarberBankRef, { balance: increment(newBarberShare), totalEarned: increment(newBarberShare) });
        } else {
          // rare case if barber has no bank
        }
        await addDoc(collection(db, "bank_transactions"), { 
          userId: finalBarberId, 
          userName: finalBarberName, 
          type: "earning", 
          amount: newBarberShare, 
          description: `Ajuste (Nuevo): ${selService.name}`, 
          date: getLocalDateString(), 
          createdAt: new Date() 
        });

        await updateDoc(oldBarberiaBankRef, { balance: increment(newBarberiaShare), totalEarned: increment(newBarberiaShare) });
        await addDoc(collection(db, "bank_transactions"), { 
          userId: "barbershop", 
          userName: "The Doctor Barber Shop", 
          type: "earning", 
          amount: newBarberiaShare, 
          description: `Ajuste (Nuevo): ${selService.name} (${finalBarberName})`, 
          date: getLocalDateString(), 
          createdAt: new Date() 
        });
        
        // --- 3. AJUSTE DE OBJETIVOS ---
        try {
          const now = new Date();
          const objectivesQuery = query(collection(db, "objectives"));
          const objectivesSnapshot = await getDocs(objectivesQuery);
          
          for (const objDoc of objectivesSnapshot.docs) {
            const objData = objDoc.data();
            const endDate = objData.endDate?.toDate();
            
            if (endDate && endDate >= now) {
              const isOldBarberObj = objData.barberoId === recordToEdit.barberId;
              const isNewBarberObj = objData.barberoId === finalBarberId;
              const isGeneralObj = !objData.barberoId;
              
              const oldDeduct = isOldBarberObj ? recordToEdit.barberShare : recordToEdit.totalAmount;
              const newAdd = isNewBarberObj ? newBarberShare : newTotalAmount;

              let diff = 0;
              if (isGeneralObj) {
                diff = newAdd - oldDeduct;
                await updateDoc(doc(db, "objectives", objDoc.id), {
                  currentAmount: increment(diff)
                });
              } else {
                if (isOldBarberObj && !isNewBarberObj) {
                  await updateDoc(doc(db, "objectives", objDoc.id), {
                    currentAmount: increment(-oldDeduct)
                  });
                } else if (!isOldBarberObj && isNewBarberObj) {
                  await updateDoc(doc(db, "objectives", objDoc.id), {
                    currentAmount: increment(newAdd)
                  });
                } else if (isOldBarberObj && isNewBarberObj) {
                  diff = newAdd - oldDeduct;
                  await updateDoc(doc(db, "objectives", objDoc.id), {
                    currentAmount: increment(diff)
                  });
                }
              }
            }
          }
        } catch (objErr) {
          console.log("Error ajustando objetivos", objErr);
        }
      }

      // --- 4. ACTUALIZAR FINANCE RECORD ---
      await updateDoc(doc(db, "finances", recordToEdit.id), {
        serviceId: selService.id,
        serviceName: selService.name,
        barberId: finalBarberId,
        barberName: finalBarberName,
        clientName: formData.clientName,
        totalAmount: newTotalAmount,
        barberShare: newBarberShare,
        barberiaShare: newBarberiaShare,
      });

      setIsEditModalOpen(false);
      setRecordToEdit(null);
      setFormData({ serviceId: "", clientName: "", barberId: "" });

    } catch (err) {
      console.error("Error al actualizar:", err);
      alert("Hubo un problema guardando la edición.");
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="space-y-6 pb-10">
      {/* Cabecera Desktop */}
      <div className="hidden lg:flex justify-between items-center mb-0">
        <div>
          <h1 className="font-display text-4xl text-white tracking-widest uppercase">Finanzas</h1>
          <p className="text-text-muted text-[10px] tracking-[0.3em] font-bold mt-1 opacity-70">CENTRO DE CONTROL Y RENDIMIENTO</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 px-6 py-3 text-xs tracking-[0.2em] font-bold uppercase shadow-red-strong hover:-translate-y-0.5 transition-all"
        >
          <Plus size={16} /> Registrar Servicio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
        {/* Card Filtros Período (Bento Style) */}
        <div className="card-premium p-6 flex flex-col justify-between border-l-4 border-l-primary/40 md:col-span-1 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] mb-0.5">Control de Periodos</p>
              <h2 className="font-display text-xl text-white tracking-widest uppercase">Rendimiento</h2>
            </div>
            
            <div className="flex bg-void/50 rounded-lg p-0.5 border border-white/5 w-full sm:w-auto h-fit">
              <button 
                onClick={() => setPeriodFilter("day")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-display text-[11px] font-bold tracking-widest uppercase transition-all ${periodFilter === "day" ? "bg-primary/20 text-white border border-primary/30 shadow-red-glow" : "text-text-secondary hover:text-white"}`}
              >
                Hoy
              </button>
              <button 
                onClick={() => setPeriodFilter("week")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-display text-[11px] font-bold tracking-widest uppercase transition-all ${periodFilter === "week" ? "bg-primary/20 text-white border border-primary/30 shadow-red-glow" : "text-text-secondary hover:text-white"}`}
              >
                Semana
              </button>
              <button 
                onClick={() => setPeriodFilter("month")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md font-display text-[11px] font-bold tracking-widest uppercase transition-all ${periodFilter === "month" ? "bg-primary/20 text-white border border-primary/30 shadow-red-glow" : "text-text-secondary hover:text-white"}`}
              >
                Mes
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {periodFilter === "day" && (
              <div className="w-full sm:w-64">
                <DatePicker
                  value={selectedDate}
                  onChange={(v) => setSelectedDate(v)}
                  placeholder="Seleccionar fecha"
                />
              </div>
            )}
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="lg:hidden btn-primary text-xs py-3 w-full flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Registrar Servicio
            </button>

            <div className="hidden lg:flex items-center gap-2 text-text-muted/60">
              <TrendingUp size={14} className="text-emerald-500" />
              <p className="text-[10px] uppercase font-bold tracking-widest">Punto de control financiero activo</p>
            </div>
          </div>
        </div>

        {/* Card Servicios Count */}
        <div className="card-premium p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-void/50 border border-white/5 flex items-center justify-center text-primary shadow-inner">
              <Scissors size={24} />
            </div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Servicios</p>
          </div>
          <div className="mt-auto">
            <p className="font-display text-5xl text-white font-bold tracking-tighter leading-none">{filteredRecords.length}</p>
            <p className="text-[9px] text-text-muted uppercase tracking-widest font-bold mt-2 flex items-center gap-1">
              <TrendingUp size={10} className="text-emerald-500" /> Total Realizados
            </p>
          </div>
        </div>

        {/* Card Ingreso Barbero (60%) / Tu Parte */}
        <div className="card-premium p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <DollarSign size={24} />
            </div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">{isAdmin ? "Ingreso Barberos" : "Tu Parte"}</p>
          </div>
          <div className="mt-auto">
            <p className="font-display text-5xl text-white font-bold tracking-tighter leading-none">${barberShare.toFixed(2).split('.')[0]}<span className="text-2xl opacity-50">.{barberShare.toFixed(2).split('.')[1]}</span></p>
            <p className="text-[9px] text-text-muted uppercase tracking-widest font-bold mt-2">60% de Comisiones</p>
          </div>
        </div>
        {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up col-span-full">
          <div className="card-premium p-6 border-l-4 border-l-emerald-500/80">
            <p className="text-text-secondary font-display text-[10px] tracking-widest uppercase mb-3 font-bold opacity-60">Ingresos (Actas)</p>
            <p className="font-display text-3xl text-white font-bold tracking-tight leading-none">${ingresos.toFixed(2)}</p>
          </div>
          <div className="card-premium p-6 border-l-4 border-l-red-500/80">
            <p className="text-text-secondary font-display text-[10px] tracking-widest uppercase mb-3 font-bold opacity-60">Egresos (Gastos)</p>
            <p className="font-display text-3xl text-white font-bold tracking-tight leading-none">${egresos.toFixed(2)}</p>
          </div>
          <div className="card-premium p-6 border-l-4 border-l-primary">
            <p className="text-text-secondary font-display text-[10px] tracking-widest uppercase mb-3 font-bold opacity-60">Barbería (40%)</p>
            <p className="font-display text-3xl text-white font-bold tracking-tight leading-none">${barberiaShare.toFixed(2)}</p>
          </div>
          <div className="card-premium p-6 border-l-4 border-l-primary-light bg-linear-to-br from-primary/10 to-transparent">
            <p className="text-text-secondary font-display text-[10px] tracking-widest uppercase mb-3 font-bold opacity-60">Balance Neto</p>
            <p className="font-display text-3xl text-white font-bold tracking-tight leading-none">
              ${(globalIngresos + globalBarberiaShare - globalEgresos).toFixed(2).split('.')[0]}<span className="text-xl opacity-50">.{(globalIngresos + globalBarberiaShare - globalEgresos).toFixed(2).split('.')[1]}</span>
            </p>
          </div>
        </div>
      )}
      </div>

      {Object.keys(revenueByService).length > 0 && (
        <div className="card-premium overflow-hidden animate-fade-in-up max-w-5xl mx-auto lg:mx-0">
          <div className="p-5 border-b border-white/5 bg-white/1">
            <h3 className="font-display text-lg text-white tracking-widest uppercase">Ganancias por Servicio</h3>
          </div>
          
          {/* Vista Escritorio (Tabla) */}
          <div className="hidden md:block overflow-x-auto">
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

          {/* Vista Móvil (Tarjetas) */}
          <div className="md:hidden divide-y divide-white/5">
            {Object.entries(revenueByService).map(([service, amount]) => (
              <div key={service} className="p-5 flex justify-between items-center bg-void/20">
                <div>
                  <p className="text-white font-medium text-sm tracking-wide">{service}</p>
                  <p className="text-text-muted text-[10px] uppercase font-bold mt-1">{serviceCount[service]} cita{serviceCount[service] !== 1 ? "s" : ""}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg text-primary tracking-widest">${amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-premium overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-display text-xl text-white tracking-widest uppercase">Historial de Servicios</h3>
        </div>

        {/* Vista Escritorio (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
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
                <TableHead align="center">Acciones</TableHead>
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
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(record)}
                        className="p-1.5 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Vista Móvil (Tarjetas PREMIUM) */}
        <div className="md:hidden divide-y divide-white/5">
          {filteredRecords.slice(0, 20).map((record) => (
            <div key={record.id} className="p-5 space-y-4 bg-void/10 hover:bg-void/30 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-base tracking-wide">{record.clientName}</p>
                    <span className="text-[10px] text-text-muted opacity-50 px-2 py-0.5 border border-white/10 rounded uppercase">{record.date}</span>
                  </div>
                  <p className="text-primary text-[10px] sm:text-xs uppercase tracking-[0.15em] font-bold">{record.serviceName}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-display text-2xl text-white tracking-widest leading-none">${record.totalAmount.toFixed(2)}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(record)}
                      className="p-1.5 text-text-muted hover:text-white transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(record)}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid 60/40 Directo (Admin) */}
              {isAdmin ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-[9px] uppercase tracking-widest text-emerald-300 font-bold mb-1">Barbero (60%)</p>
                    <p className="font-display text-lg text-emerald-400">${record.barberShare.toFixed(2)}</p>
                    <p className="text-[8px] text-text-muted/60 mt-0.5 truncate">{record.barberName}</p>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-[9px] uppercase tracking-widest text-blue-300 font-bold mb-1">Barbería (40%)</p>
                    <p className="font-display text-lg text-blue-400">${record.barberiaShare.toFixed(2)}</p>
                    <p className="text-[8px] text-text-muted/60 mt-0.5">Admin Shop</p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold">Tu Parte (60%)</p>
                  </div>
                  <p className="font-display text-xl text-emerald-400">${record.barberShare.toFixed(2)}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Wallet size={48} className="text-surface-highest mb-4" />
            <p className="text-sm font-display tracking-widest uppercase">No hay servicios registrados</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">Registrar Servicio</h2>
            <form onSubmit={handleRegisterService} className="space-y-6">
              {isAdmin && (
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Barbero</label>
                  <Select
                    options={barbers.map(b => ({ value: b.id, label: b.name }))}
                    value={formData.barberId}
                    onChange={(val: string) => setFormData({ ...formData, barberId: val })}
                    placeholder="Elegir barbero..."
                    className="bg-void/50 border-white/10 rounded-md"
                  />
                </div>
              )}
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
                  onClick={() => { setIsModalOpen(false); setFormData({ serviceId: "", clientName: "", barberId: "" }); }}
                  className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 btn-primary text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Registrando...</>
                  ) : (
                    <><Check size={18} /> Registrar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">Editar Registro</h2>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {isAdmin && (
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Barbero</label>
                  <Select
                    options={barbers.map(b => ({ value: b.id, label: b.name }))}
                    value={formData.barberId}
                    onChange={(val: string) => setFormData({ ...formData, barberId: val })}
                    placeholder="Elegir barbero..."
                    className="bg-void/50 border-white/10 rounded-md"
                  />
                </div>
              )}
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
                  onClick={() => { setIsEditModalOpen(false); setRecordToEdit(null); setFormData({ serviceId: "", clientName: "", barberId: "" }); }}
                  className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 btn-primary text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Guardando...</>
                  ) : (
                    <><Check size={18} /> Guardar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
