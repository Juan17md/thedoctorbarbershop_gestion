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
import { db, auth } from "@/lib/firebase";
import { User, Mail, Lock, Save, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Check, Trash2, Pencil, Scissors, Shield, Users, Phone, Loader2 } from "lucide-react";
import { Select } from "@/components/ui";
import { getLocalDateString } from "@/lib/utils";

interface BarberUser {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  role: "admin" | "barber";
  createdAt?: Date;
}

export default function PerfilPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [barbers, setBarbers] = useState<BarberUser[]>([]);
  const [isNewBarberModalOpen, setIsNewBarberModalOpen] = useState(false);
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [deletingBarberId, setDeletingBarberId] = useState<string | null>(null);
  const [newBarberData, setNewBarberData] = useState({ email: "", password: "", name: "", phone: "", role: "barber" });
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (userRole) {
      const timer = setTimeout(() => {
        setFormData(prev => {
          if (prev.name === userRole.name && prev.email === userRole.email && prev.phone === (userRole.phone || "")) return prev;
          return { name: userRole.name, email: userRole.email, phone: userRole.phone || "" };
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
          lastUpdated: docSnap.data().lastUpdated?.toDate ? docSnap.data().lastUpdated.toDate() : docSnap.data().lastUpdated ? new Date(docSnap.data().lastUpdated) : undefined
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
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt ? new Date(doc.data().createdAt) : undefined
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
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt ? new Date(doc.data().createdAt) : undefined
      })) as BarberUser[];
      setBarbers(data);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleSaveProfile = async () => {
    if (!userRole?.uid) return;
    try {
      await updateDoc(doc(db, "users", userRole.uid), {
        name: formData.name,
        phone: formData.phone
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
        date: getLocalDateString(),
        createdAt: new Date()
      });

      setIsWithdrawModalOpen(false);
      setWithdrawAmount(0);
      alert("Retiro realizado exitosamente");
    } catch (error) {
      console.error("Error al procesar retiro:", error);
    }
  };

  const handleDeleteBarber = (uid: string) => {
    setDeletingBarberId(uid);
  };

  const confirmDeleteBarber = async () => {
    if (!deletingBarberId || !auth.currentUser) return;
    setEliminando(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const respuesta = await fetch("/api/barbers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ uid: deletingBarberId })
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        alert(datos.error || "Error al eliminar el usuario");
        return;
      }
      setDeletingBarberId(null);
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      alert("Error al eliminar el usuario");
    } finally {
      setEliminando(false);
    }
  };

  const handleEditBarber = (barber: BarberUser) => {
    setNewBarberData({ 
      email: barber.email, 
      password: "", 
      name: barber.name, 
      phone: barber.phone || "", 
      role: barber.role 
    });
    setEditingBarberId(barber.uid);
    setIsNewBarberModalOpen(true);
  };

  const handleSaveBarber = async () => {
    if (!newBarberData.name || !newBarberData.email) {
      setErrorMensaje("Nombre y email son obligatorios");
      return;
    }
    if (!editingBarberId && !newBarberData.password) {
      setErrorMensaje("La contraseña es obligatoria para nuevos usuarios");
      return;
    }
    if (!editingBarberId && newBarberData.password.length < 6) {
      setErrorMensaje("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setGuardando(true);
    setErrorMensaje(null);

    try {
      if (editingBarberId) {
        await updateDoc(doc(db, "users", editingBarberId), {
          name: newBarberData.name,
          phone: newBarberData.phone,
          role: newBarberData.role
        });
      } else {
        if (!auth.currentUser) {
          setErrorMensaje("No se pudo autenticar. Recarga la página.");
          return;
        }
        const token = await auth.currentUser.getIdToken();
        const respuesta = await fetch("/api/barbers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            email: newBarberData.email,
            password: newBarberData.password,
            name: newBarberData.name,
            phone: newBarberData.phone,
            role: newBarberData.role
          })
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) {
          setErrorMensaje(datos.error || "Error al crear el usuario");
          return;
        }
      }
      setIsNewBarberModalOpen(false);
      setEditingBarberId(null);
      setNewBarberData({ email: "", password: "", name: "", phone: "", role: "barber" });
      setErrorMensaje(null);
    } catch (error) {
      console.error("Error guardando barbero:", error);
      setErrorMensaje("Error inesperado al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end w-full">
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="btn-primary w-full sm:w-auto py-3 sm:py-2.5"
          >
            Editar Perfil
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-premium p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <User size={40} className="text-primary" />
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
                  className="input-premium bg-surface pl-12 w-full"
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
                  className="input-premium bg-surface pl-12 w-full"
                  value={formData.email}
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="tel"
                  className="input-premium bg-surface pl-12 w-full"
                  placeholder="+58 412 1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="password"
                  className="input-premium bg-surface pl-12 w-full"
                  placeholder="••••••••"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button 
                  onClick={() => { setIsEditing(false); setFormData({ name: userRole?.name || "", email: userRole?.email || "", phone: userRole?.phone || "" }); }}
                  className="flex-1 px-4 py-3.5 rounded-xl border border-white/10 text-text-secondary hover:bg-surface-high transition-colors text-sm uppercase tracking-widest font-bold"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex-1 btn-primary py-3.5 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                >
                  <Save size={18} /> Guardar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Banca / Banco */}
        {!isAdmin && (
          <div className="card-premium p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="font-display text-xl text-white flex items-center gap-2">
                <Wallet size={20} className="text-primary" />
                Tu Banca
              </h3>
              <button 
                onClick={() => setIsWithdrawModalOpen(true)}
                disabled={!bankAccount || bankAccount.balance <= 0}
                className="btn-primary w-full sm:w-auto text-xs py-3 sm:py-2 disabled:opacity-50 uppercase tracking-widest"
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
        <div className="card-premium p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h3 className="font-display text-xl text-white flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Gestión de Barberos
            </h3>
            <button 
              onClick={() => { setEditingBarberId(null); setNewBarberData({ email: "", password: "", name: "", phone: "", role: "barber" }); setIsNewBarberModalOpen(true); }}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 py-3 sm:py-2.5 text-xs uppercase tracking-widest"
            >
              <Plus size={18} /> Nuevo Barbero
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbers.map((barber) => (
              <div key={barber.uid} className="bg-surface-high/50 p-5 rounded-xl border border-white/5 hover:border-primary/20 transition-all group">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/10">
                      <User size={20} className="text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-display text-base text-white truncate tracking-wide">{barber.name}</p>
                      <p className="text-text-muted text-[11px] truncate opacity-80">{barber.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    {barber.role === "admin" ? (
                      <Shield size={16} className="text-primary" />
                    ) : (
                      <Scissors size={16} className="text-text-muted" />
                    )}
                    <button 
                      onClick={() => handleEditBarber(barber)}
                      className="p-2 text-text-muted hover:text-primary transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteBarber(barber.uid)}
                      className="p-2 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className={`text-xs px-2 py-1 rounded ${barber.role === "admin" ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-400"}`}>
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
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-6 sm:p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">Retirar Ganancias</h2>
            <div className="mb-6">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Balance disponible</p>
              <p className="font-display text-4xl text-white">${bankAccount?.balance.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Monto a retirar</label>
              <input 
                type="number"
                className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none font-display tracking-widest"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
              <button 
                type="button" 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
              >
                Cancelar
              </button>
              <button 
                onClick={handleWithdraw}
                className="flex-1 btn-primary"
              >
                CONFIRMAR RETIRO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de nuevo barbero */}
      {isNewBarberModalOpen && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-6 sm:p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">{editingBarberId ? "Editar Usuario" : "Nuevo Barbero"}</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Nombre</label>
                <input 
                  type="text"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                  placeholder="Nombre del barbero"
                  value={newBarberData.name}
                  onChange={(e) => setNewBarberData({ ...newBarberData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Email</label>
                <input 
                  type="email"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="email@ejemplo.com"
                  value={newBarberData.email}
                  onChange={(e) => setNewBarberData({ ...newBarberData, email: e.target.value })}
                  disabled={!!editingBarberId}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Teléfono</label>
                <input 
                  type="tel"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                  placeholder="+58 412 1234567"
                  value={newBarberData.phone}
                  onChange={(e) => setNewBarberData({ ...newBarberData, phone: e.target.value })}
                />
              </div>
              {!editingBarberId && (
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Contraseña</label>
                  <input 
                    type="password"
                    className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                    placeholder="Mínimo 6 caracteres"
                    value={newBarberData.password}
                    onChange={(e) => setNewBarberData({ ...newBarberData, password: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Rol</label>
                <Select
                  options={[
                    { value: "barber", label: "Barbero" },
                    { value: "admin", label: "Administrador" }
                  ]}
                  value={newBarberData.role}
                  onChange={(val) => setNewBarberData({ ...newBarberData, role: val })}
                  placeholder="Seleccionar rol..."
                  className="bg-void/50 border-white/10 rounded-md"
                />
              </div>
            </div>

            {errorMensaje && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {errorMensaje}
              </div>
            )}

            <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
              <button 
                type="button" 
                onClick={() => { setIsNewBarberModalOpen(false); setErrorMensaje(null); }}
                className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveBarber}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
                disabled={guardando}
              >
                {guardando ? (
                  <><Loader2 size={16} className="animate-spin" /> Procesando...</>
                ) : (
                  editingBarberId ? "GUARDAR" : "CREAR"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingBarberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
          <div className="card-premium w-full max-w-sm p-8 relative flex flex-col items-center text-center border-t-2 border-t-red-500 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-red-500 border border-red-500/20">
              <Trash2 size={24} />
            </div>
            <h3 className="font-display text-2xl mb-2 text-white tracking-wider">¿ELIMINAR <span className="text-red-500">USUARIO</span>?</h3>
            <p className="text-text-muted text-sm mb-8 font-body">Esta acción no se puede deshacer y el usuario perderá acceso permanentemente.</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setDeletingBarberId(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-text-muted hover:bg-surface-high hover:text-white transition-all font-bold text-xs tracking-widest uppercase"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteBarber}
                className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 hover:border-red-500 hover:shadow-red-glow font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                disabled={eliminando}
              >
                {eliminando ? (
                  <><Loader2 size={14} className="animate-spin" /> Eliminando...</>
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
