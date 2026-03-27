"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type BankAccount, type BankTransaction, BARBERS } from "@/lib/types";
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
  deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, Mail, Lock, Save, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Check, Trash2, Pencil, Scissors, Shield, Users } from "lucide-react";

interface BarberUser {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "barber";
  createdAt?: Date;
}

export default function PerfilPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [barbers, setBarbers] = useState<BarberUser[]>([]);
  const [isNewBarberModalOpen, setIsNewBarberModalOpen] = useState(false);
  const [newBarberData, setNewBarberData] = useState({ email: "", password: "", name: "", role: "barber" });

  useEffect(() => {
    if (userRole) {
      const timer = setTimeout(() => {
        setFormData(prev => {
          if (prev.name === userRole.name && prev.email === userRole.email) return prev;
          return { name: userRole.name, email: userRole.email };
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [userRole]);

  useEffect(() => {
    if (!userRole?.uid) return;
    
    const bankRef = doc(db, "bank", userRole.uid);
    const unsubscribeBank = onSnapshot(bankRef, (docSnap) => {
      if (docSnap.exists()) {
        setBankAccount({
          id: docSnap.id,
          ...docSnap.data(),
          lastUpdated: docSnap.data().lastUpdated?.toDate()
        } as BankAccount);
      } else {
        setBankAccount(null);
      }
    });

    const q = query(
      collection(db, "bank_transactions"), 
      where("userId", "==", userRole.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as BankTransaction[];
      setTransactions(data);
    });

    return () => {
      unsubscribeBank();
      unsubscribeTransactions();
    };
  }, [userRole?.uid]);

  // Cargar barberos para admin
  useEffect(() => {
    if (!isAdmin) return;
    
    const q = query(collection(db, "users"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as BarberUser[];
      setBarbers(data);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleSaveProfile = async () => {
    if (!userRole?.uid) return;
    try {
      await updateDoc(doc(db, "users", userRole.uid), {
        name: formData.name
      });
      setIsEditing(false);
      alert("Perfil actualizado");
    } catch (error) {
      console.error("Error guardando perfil:", error);
    }
  };

  const handleWithdraw = async () => {
    if (!userRole?.uid || !bankAccount || withdrawAmount <= 0) return;
    if (withdrawAmount > bankAccount.balance) {
      alert("No tienes suficiente saldo");
      return;
    }

    try {
      await updateDoc(doc(db, "bank", userRole.uid), {
        balance: bankAccount.balance - withdrawAmount,
        totalPaid: bankAccount.totalPaid + withdrawAmount,
        lastUpdated: new Date()
      });

      await addDoc(collection(db, "bank_transactions"), {
        userId: userRole.uid,
        userName: userRole.name,
        type: "withdrawal",
        amount: withdrawAmount,
        description: "Retiro de ganancias",
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date()
      });

      setIsWithdrawModalOpen(false);
      setWithdrawAmount(0);
      alert("Retiro realizado exitosamente");
    } catch (error) {
      console.error("Error al procesar retiro:", error);
    }
  };

  const handleDeleteBarber = async (uid: string) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      await deleteDoc(doc(db, "users", uid));
    } catch (error) {
      console.error("Error eliminando usuario:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">Perfil</h1>
          <p className="text-text-secondary mt-1">
            {isAdmin ? "Gestiona tu información y usuarios" : "Gestiona tu información personal y finanzas"}
          </p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="btn-surgical"
          >
            Editar Perfil
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-full bg-surgical-red/20 flex items-center justify-center">
              <User size={40} className="text-surgical-red" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-white">{userRole?.name}</h2>
              <p className="text-text-secondary">{isAdmin ? "Administrador" : "Barbero"}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Nombre</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text"
                  className="input-surgical bg-surface pl-12 w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="email"
                  className="input-surgical bg-surface pl-12 w-full"
                  value={formData.email}
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="password"
                  className="input-surgical bg-surface pl-12 w-full"
                  placeholder="••••••••"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-4 mt-6">
                <button 
                  onClick={() => { setIsEditing(false); setFormData({ name: userRole?.name || "", email: userRole?.email || "" }); }}
                  className="flex-1 px-4 py-3 rounded-xl border border-outline text-text-secondary hover:bg-surface-high transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex-1 btn-surgical flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Guardar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Banca / Banco */}
        {!isAdmin && (
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl text-white flex items-center gap-2">
                <Wallet size={20} className="text-surgical-red" />
                Tu Banca
              </h3>
              <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                disabled={!bankAccount || bankAccount.balance <= 0}
                className="btn-surgical text-sm disabled:opacity-50"
              >
                Retirar
              </button>
            </div>

            {bankAccount ? (
              <div className="space-y-4">
                <div className="bg-surface-high/50 p-6 rounded-xl">
                  <p className="text-text-secondary text-sm">Balance Disponible</p>
                  <p className="font-display text-4xl text-white">${bankAccount.balance.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/10 p-4 rounded-xl">
                    <p className="text-text-secondary text-xs">Total Ganado</p>
                    <p className="font-display text-xl text-green-400">${bankAccount.totalEarned.toFixed(2)}</p>
                  </div>
                  <div className="bg-red-500/10 p-4 rounded-xl">
                    <p className="text-text-secondary text-xs">Total Retirado</p>
                    <p className="font-display text-xl text-red-400">${bankAccount.totalPaid.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <p>No tienes cuenta bancaria registrada.</p>
                <p className="text-sm mt-2">Registra tu primer servicio para comenzar.</p>
              </div>
            )}

            {transactions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-text-secondary text-sm mb-3">Historial Reciente</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-surface-high/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        {t.type === "earning" ? (
                          <ArrowUpRight size={16} className="text-green-400" />
                        ) : (
                          <ArrowDownRight size={16} className="text-red-400" />
                        )}
                        <div>
                          <p className="text-white text-sm">{t.description}</p>
                          <p className="text-text-muted text-xs">{t.date}</p>
                        </div>
                      </div>
                      <span className={t.type === "earning" ? "text-green-400" : "text-red-400"}>
                        {t.type === "earning" ? "+" : "-"}${t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gestión de Barberos (Admin) */}
      {isAdmin && (
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-xl text-white flex items-center gap-2">
              <Users size={20} className="text-surgical-red" />
              Gestión de Barberos
            </h3>
            <button 
              onClick={() => setIsNewBarberModalOpen(true)}
              className="btn-surgical flex items-center gap-2"
            >
              <Plus size={18} /> Nuevo Barbero
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbers.map((barber) => (
              <div key={barber.uid} className="bg-surface-high/50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surgical-red/20 flex items-center justify-center">
                      <User size={18} className="text-surgical-red" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{barber.name}</p>
                      <p className="text-text-muted text-xs">{barber.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {barber.role === "admin" ? (
                      <Shield size={16} className="text-surgical-red" />
                    ) : (
                      <Scissors size={16} className="text-text-muted" />
                    )}
                    <button 
                      onClick={() => handleDeleteBarber(barber.uid)}
                      className="p-2 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className={`text-xs px-2 py-1 rounded ${barber.role === "admin" ? "bg-surgical-red/20 text-surgical-red" : "bg-blue-500/20 text-blue-400"}`}>
                    {barber.role === "admin" ? "Administrador" : "Barbero"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {barbers.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              No hay barberos registrados
            </div>
          )}
        </div>
      )}

      {/* Modal de retiro */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 w-full max-w-md">
            <h2 className="font-display text-2xl text-white mb-6">Retirar Ganancias</h2>
            <div className="mb-6">
              <p className="text-text-secondary text-sm mb-2">Balance disponible</p>
              <p className="font-display text-2xl text-white">${bankAccount?.balance.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Monto a retirar</label>
              <input 
                type="number"
                className="input-surgical bg-transparent w-full"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-4 mt-6">
              <button 
                type="button" 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-outline text-text-secondary hover:bg-surface-high transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleWithdraw}
                className="flex-1 btn-surgical flex items-center justify-center gap-2"
              >
                <Check size={18} /> Confirmar Retiro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de nuevo barbero */}
      {isNewBarberModalOpen && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 w-full max-w-md">
            <h2 className="font-display text-2xl text-white mb-6">Nuevo Barbero</h2>
            <p className="text-text-secondary text-sm mb-4">
              Para crear un nuevo usuario, primero crea el usuario en Firebase Authentication y luego completa su perfil aquí.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Nombre</label>
                <input 
                  type="text"
                  className="input-surgical bg-transparent w-full"
                  placeholder="Nombre del barbero"
                  value={newBarberData.name}
                  onChange={(e) => setNewBarberData({ ...newBarberData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Email</label>
                <input 
                  type="email"
                  className="input-surgical bg-transparent w-full"
                  placeholder="email@ejemplo.com"
                  value={newBarberData.email}
                  onChange={(e) => setNewBarberData({ ...newBarberData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Rol</label>
                <select 
                  className="input-surgical bg-transparent w-full"
                  value={newBarberData.role}
                  onChange={(e) => setNewBarberData({ ...newBarberData, role: e.target.value })}
                >
                  <option value="barber">Barbero</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button 
                type="button" 
                onClick={() => setIsNewBarberModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-outline text-text-secondary hover:bg-surface-high transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (!newBarberData.name || !newBarberData.email) {
                    alert("Completa todos los campos");
                    return;
                  }
                  alert("Para crear usuarios, usa Firebase Console o implementa registro con email/password");
                  setIsNewBarberModalOpen(false);
                }}
                className="flex-1 btn-surgical flex items-center justify-center gap-2"
              >
                <Check size={18} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
