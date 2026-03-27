"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type BankAccount, type FinancialRecord } from "@/lib/types";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Scissors, Edit2, Shield, MoreVertical, Users, DollarSign, TrendingUp, Calendar } from "lucide-react";

interface BarberWithStats {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "barber";
  totalServices: number;
  totalRevenue: number;
  balance: number;
}

export default function PersonalPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [barbers, setBarbers] = useState<BarberWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    // Cargar usuarios
    const usersQuery = query(collection(db, "users"), orderBy("name"));
    
    const unsubscribe = onSnapshot(usersQuery, async (usersSnapshot) => {
      const barbersData: BarberWithStats[] = [];
      
      for (const docSnap of usersSnapshot.docs) {
        const userData = docSnap.data();
        const uid = docSnap.id;
        
        // Obtener servicios del barbero
        const servicesQuery = query(
          collection(db, "finances"),
          where("barberId", "==", uid)
        );
        
        // Obtener banco del barbero
        const bankRef = doc(db, "bank", uid);
        const bankSnap = await getDoc(bankRef);
        const bankData = bankSnap.exists() ? bankSnap.data() : null;
        
        barbersData.push({
          uid,
          name: userData.name || "Sin nombre",
          email: userData.email || "",
          role: userData.role || "barber",
          totalServices: 0,
          totalRevenue: bankData ? (bankData.totalEarned || 0) : 0,
          balance: bankData ? (bankData.balance || 0) : 0
        });
      }
      
      setBarbers(barbersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Obtener servicios por barbero
  useEffect(() => {
    if (!isAdmin || barbers.length === 0) return;

    const financesQuery = query(collection(db, "finances"), orderBy("date", "desc"));
    
    const unsubscribe = onSnapshot(financesQuery, (snapshot) => {
      const servicesByBarber = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        if (!acc[data.barberId]) {
          acc[data.barberId] = 0;
        }
        acc[data.barberId]++;
        return acc;
      }, {} as Record<string, number>);

      setBarbers(prev => prev.map(b => ({
        ...b,
        totalServices: servicesByBarber[b.uid] || 0
      })));
    });

    return () => unsubscribe();
  }, [isAdmin, barbers.length]);

  if (!isAdmin) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl text-text-primary tracking-wide">
            MI <span className="text-surgical-red italic">PERFIL</span>
          </h1>
          <p className="text-text-muted mt-2 text-sm">
            Tu información como barbero.
          </p>
        </div>

        <div className="glass-card p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-surgical-red/20 flex items-center justify-center">
              <span className="font-display text-3xl text-surgical-red">
                {userRole?.name?.[0] || "U"}
              </span>
            </div>
            <div>
              <h2 className="font-display text-2xl text-white">{userRole?.name}</h2>
              <p className="text-text-secondary">Barbero</p>
            </div>
          </div>
          <p className="text-text-muted">Dirígete a la sección de Perfil para más opciones.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surgical-red animate-pulse font-display text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-text-primary tracking-wide">
            GESTIÓN DE <span className="text-surgical-red italic">ESPECIALISTAS</span>
          </h1>
          <p className="text-text-muted mt-2 text-sm">
            Administra los perfiles del equipo y visualiza su rendimiento.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbers.map((barber, i) => (
          <div key={barber.uid} className="glass-card overflow-hidden group hover:shadow-[0_0_20px_rgba(230,0,0,0.1)] transition-all hover:-translate-y-1">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-full bg-surgical-red/20 text-surgical-red flex items-center justify-center font-display text-2xl shadow-red-glow">
                  {barber.name[0]}
                </div>
                <button className="text-text-muted hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div>
                <h3 className="font-display text-3xl text-text-primary mb-1 group-hover:text-white transition-colors">
                  {barber.name}
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-sm bg-surface-high border border-white/5 mb-4 text-surgical-red-light">
                  {barber.role === "admin" && <Shield size={10} className="text-surgical-red animate-pulse" />}
                  {barber.role === "admin" ? "Administrador" : "Barbero"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-outline">
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1 border-b border-outline pb-1 font-medium">Servicios</p>
                  <p className="font-display text-2xl text-white">{barber.totalServices}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1 border-b border-outline pb-1 font-medium">Ganancias</p>
                  <p className="font-display text-2xl text-green-400">${barber.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-lowest border-t border-white/5 flex justify-between items-center group-hover:bg-surgical-red/5 transition-colors">
              <button className="text-[10px] text-text-secondary hover:text-white uppercase tracking-widest font-bold transition-colors flex items-center gap-2">
                <Edit2 size={12} /> Editar Perfil
              </button>
              <span className="text-xs text-text-muted">
                Saldo: ${barber.balance.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {barbers.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Users size={48} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No hay barberos registrados</p>
          <p className="text-text-muted text-sm mt-2">Crea usuarios desde Firebase Authentication</p>
        </div>
      )}

      <div className="glass-card p-8">
        <h3 className="font-display text-2xl text-text-primary mb-6 flex items-center gap-3">
          <Shield className="text-surgical-red" />
          Configuración de Comisiones
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Comisión Barbero (60%)</label>
              <div className="flex items-center gap-4">
                <input type="number" defaultValue={60} className="input-surgical max-w-[120px]" readOnly />
                <span className="text-xl text-text-muted">%</span>
              </div>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Este porcentaje se asigna automáticamente al barbero por cada servicio realizado.
              El 40% restante va directo a la barbería.
            </p>
          </div>
          
          <div className="flex flex-col justify-end">
            <div className="bg-surface-high/50 p-4 rounded-lg">
              <p className="text-text-secondary text-sm mb-2">Distribución actual</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-3 bg-green-500 rounded-full" style={{ width: "60%" }} />
                  <p className="text-xs text-green-400 mt-1">Barbero: 60%</p>
                </div>
                <div className="flex-1">
                  <div className="h-3 bg-blue-500 rounded-full" style={{ width: "40%" }} />
                  <p className="text-xs text-blue-400 mt-1">Barbería: 40%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
