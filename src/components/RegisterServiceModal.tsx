"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type Service, SERVICES } from "@/lib/types";
import {
  collection,
  addDoc,
  query,
  orderBy,
  where,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, Loader2, X } from "lucide-react";
import { Select } from "@/components/ui";
import { getLocalDateString } from "@/lib/utils";

interface RegisterServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const normalizarNombreServicio = (nombre: string) => nombre.trim().toLowerCase();

export default function RegisterServiceModal({ isOpen, onClose }: RegisterServiceModalProps) {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Service[]>(SERVICES);
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({ serviceId: "", clientName: "", barberId: "" });
  const [montoPersonalizado, setMontoPersonalizado] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name as string,
      }));
      setBarbers(data);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const service = serviciosDisponibles.find((s) => s.id === formData.serviceId);
    if (!service) return;

    const finalBarberId = isAdmin ? formData.barberId || userRole?.uid : userRole?.uid;
    const finalBarber =
      isAdmin && formData.barberId
        ? barbers.find((b) => b.id === formData.barberId) || userRole
        : userRole;

    if (!finalBarberId || !finalBarber) {
      alert("Debes seleccionar un barbero");
      return;
    }

    setIsSubmitting(true);
    try {
      const totalAmount = montoPersonalizado ? parseFloat(montoPersonalizado) : service.price;
      if (!totalAmount || totalAmount <= 0) {
        alert("El monto a cobrar es inválido");
        setIsSubmitting(false);
        return;
      }
      const barberShareAmount = totalAmount * 0.6;
      const barberiaShareAmount = totalAmount * 0.4;
      const date = getLocalDateString();

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
        createdAt: new Date(),
      });

      const barberBankRef = doc(db, "bank", finalBarberId || "");
      const barberBankDoc = await getDoc(barberBankRef);
      if (barberBankDoc.exists()) {
        await updateDoc(barberBankRef, {
          balance: increment(barberShareAmount),
          totalEarned: increment(barberShareAmount),
          lastUpdated: new Date(),
        });
      } else {
        await setDoc(barberBankRef, {
          userId: finalBarberId,
          userName: finalBarber.name,
          balance: barberShareAmount,
          totalEarned: barberShareAmount,
          totalPaid: 0,
          lastUpdated: new Date(),
        });
      }

      await addDoc(collection(db, "bank_transactions"), {
        userId: finalBarberId,
        userName: finalBarber.name,
        type: "earning",
        amount: barberShareAmount,
        description: `Servicio: ${service.name}`,
        date,
        createdAt: new Date(),
      });

      const barberiaBankRef = doc(db, "bank", "barbershop");
      const barberiaBankDoc = await getDoc(barberiaBankRef);
      if (barberiaBankDoc.exists()) {
        await updateDoc(barberiaBankRef, {
          balance: increment(barberiaShareAmount),
          totalEarned: increment(barberiaShareAmount),
          lastUpdated: new Date(),
        });
      } else {
        await setDoc(barberiaBankRef, {
          userId: "barbershop",
          userName: "The Doctor Barber Shop",
          balance: barberiaShareAmount,
          totalEarned: barberiaShareAmount,
          totalPaid: 0,
          lastUpdated: new Date(),
        });
      }

      await addDoc(collection(db, "bank_transactions"), {
        userId: "barbershop",
        userName: "The Doctor Barber Shop",
        type: "earning",
        amount: barberiaShareAmount,
        description: `Servicio: ${service.name} (${finalBarber.name})`,
        date,
        createdAt: new Date(),
      });

      try {
        let objectivesQuery;
        if (isAdmin) {
          objectivesQuery = query(collection(db, "objectives"));
        } else {
          objectivesQuery = query(
            collection(db, "objectives"),
            where("barberoId", "==", finalBarberId)
          );
        }

        const objectivesSnapshot = await getDocs(objectivesQuery);
        const now = new Date();

        for (const objDoc of objectivesSnapshot.docs) {
          const objData = objDoc.data();
          const endDate = objData.endDate?.toDate();

          if (endDate && endDate >= now) {
            const isBarberObjective =
              objData.barberoId && objData.barberoId === finalBarberId;
            const isGeneralObjective = !objData.barberoId;

            if (isBarberObjective || isGeneralObjective) {
              const currentAmount = objData.currentAmount || 0;
              const newAmount = isBarberObjective
                ? currentAmount + barberShareAmount
                : currentAmount + totalAmount;

              await updateDoc(doc(db, "objectives", objDoc.id), {
                currentAmount: newAmount,
              });
            }
          }
        }
      } catch (objError) {
        console.error("Error al actualizar objetivos:", objError);
      }

      onClose();
      setFormData({ serviceId: "", clientName: "", barberId: "" });
      setMontoPersonalizado("");
    } catch (error) {
      console.error("Error al registrar el servicio:", error);
      alert("Hubo un error al registrar el servicio. Por favor intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-3xl text-white tracking-widest uppercase">
            Registrar Servicio
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleRegisterService} className="space-y-6">
          {isAdmin && (
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                Barbero
              </label>
              <Select
                options={barbers.map((b) => ({ value: b.id, label: b.name }))}
                value={formData.barberId}
                onChange={(val: string) => setFormData({ ...formData, barberId: val })}
                placeholder="Elegir barbero..."
                className="bg-void/50 border-white/10 rounded-md"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
              Servicio
            </label>
            <Select
              options={serviciosDisponibles.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              value={formData.serviceId}
              onChange={(val: string) => {
                setFormData({ ...formData, serviceId: val });
                const servicio = serviciosDisponibles.find((s) => s.id === val);
                if (servicio) setMontoPersonalizado(servicio.price.toFixed(2));
              }}
              placeholder="Seleccionar servicio..."
              className="bg-void/50 border-white/10 rounded-md"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
              Monto a Cobrar
            </label>
            <div className="w-full bg-void/50 border border-emerald-500/20 rounded-md px-4 py-4 text-emerald-400 font-display text-2xl tracking-wider text-center">
              {montoPersonalizado ? `$${parseFloat(montoPersonalizado).toFixed(2)}` : "$0.00"}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
              Cliente (opcional)
            </label>
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
              onClick={() => {
                onClose();
                setFormData({ serviceId: "", clientName: "", barberId: "" });
                setMontoPersonalizado("");
              }}
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
                <>
                  <Loader2 size={18} className="animate-spin" /> Registrando...
                </>
              ) : (
                <>
                  <Check size={18} /> Registrar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
