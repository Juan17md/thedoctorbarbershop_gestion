"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type Objective, BARBERS } from "@/lib/types";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Pencil, Trash2, Target, Check, Calendar, TrendingUp } from "lucide-react";

export default function ObjetivosPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [objetivos, setObjetivos] = useState<Objective[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "weekly" | "monthly">("all");
  const [formData, setFormData] = useState({
    type: "weekly" as "weekly" | "monthly",
    targetAmount: 0,
    barberoId: "",
    startDate: "",
    endDate: ""
  });

  useEffect(() => {
    let q;
    if (isAdmin) {
      q = query(collection(db, "objectives"), orderBy("endDate", "desc"));
    } else {
      q = query(collection(db, "objectives"), where("barberoId", "==", userRole?.uid), orderBy("endDate", "desc"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate()
      })) as Objective[];
      setObjetivos(data);
    });
    return () => unsubscribe();
  }, [isAdmin, userRole?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const objectiveData = {
      ...formData,
      currentAmount: 0,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      barberoId: formData.barberoId || null,
      createdAt: new Date()
    };

    if (editingId) {
      await updateDoc(doc(db, "objectives", editingId), {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate)
      });
    } else {
      await addDoc(collection(db, "objectives"), objectiveData);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ type: "weekly", targetAmount: 0, barberoId: "", startDate: "", endDate: "" });
  };

  const handleEdit = (obj: Objective) => {
    setFormData({
      type: obj.type,
      targetAmount: obj.targetAmount,
      barberoId: obj.barberoId || "",
      startDate: obj.startDate ? obj.startDate.toISOString().split("T")[0] : "",
      endDate: obj.endDate ? obj.endDate.toISOString().split("T")[0] : ""
    });
    setEditingId(obj.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este objetivo?")) {
      await deleteDoc(doc(db, "objectives", id));
    }
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const filteredObjetivos = objetivos.filter(obj => {
    if (filter === "all") return true;
    return obj.type === filter;
  });

  const getBarberName = (barberoId?: string) => {
    if (!barberoId) return "Barbería (General)";
    const barber = BARBERS.find(b => b.uid === barberoId);
    return barber?.name || "Desconocido";
  };

  const getProgress = (obj: Objective) => {
    if (obj.targetAmount === 0) return 0;
    return Math.min(100, Math.round((obj.currentAmount / obj.targetAmount) * 100));
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "-";
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">Objetivos</h1>
          <p className="text-text-secondary mt-1">Gestiona los objetivos semanales y mensuales</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setEditingId(null); setFormData({ type: "weekly", targetAmount: 0, barberoId: "", startDate: "", endDate: "" }); }}
          className="btn-surgical flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Objetivo
        </button>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === "all" ? "bg-surgical-red text-white" : "bg-surface-high text-text-secondary hover:text-white"}`}
        >
          Todos ({objetivos.length})
        </button>
        <button 
          onClick={() => setFilter("weekly")}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === "weekly" ? "bg-surgical-red text-white" : "bg-surface-high text-text-secondary hover:text-white"}`}
        >
          Semanales ({objetivos.filter(o => o.type === "weekly").length})
        </button>
        <button 
          onClick={() => setFilter("monthly")}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === "monthly" ? "bg-surgical-red text-white" : "bg-surface-high text-text-secondary hover:text-white"}`}
        >
          Mensuales ({objetivos.filter(o => o.type === "monthly").length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredObjetivos.map((obj) => {
          const progress = getProgress(obj);
          return (
            <div key={obj.id} className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${obj.type === "weekly" ? "bg-surgical-red/20 text-surgical-red" : "bg-blue-500/20 text-blue-500"}`}>
                    {obj.type === "weekly" ? "Semanal" : "Mensual"}
                  </span>
                  <h3 className="font-display text-xl text-white mt-2">{getBarberName(obj.barberoId)}</h3>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(obj)} className="p-2 text-text-muted hover:text-surgical-red transition-colors">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(obj.id)} className="p-2 text-text-muted hover:text-surgical-red transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">Meta: ${obj.targetAmount}</span>
                  <span className="text-text-secondary text-sm">Actual: ${obj.currentAmount}</span>
                </div>
                <div className="h-2 bg-surface-high rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-surgical-red"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-text-muted">
                    <Calendar size={14} />
                    <span>{formatDate(obj.startDate)} - {formatDate(obj.endDate)}</span>
                  </div>
                  <span className={`${progress >= 100 ? "text-green-500" : "text-surgical-red"} font-medium`}>
                    {progress}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredObjetivos.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          No hay objetivos registrados
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 w-full max-w-md">
            <h2 className="font-display text-2xl text-white mb-6">
              {editingId ? "Editar Objetivo" : "Nuevo Objetivo"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Tipo de Objetivo</label>
                <select 
                  className="input-surgical bg-transparent w-full"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "weekly" | "monthly" })}
                >
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
              
              {isAdmin && (
                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Barbero (opcional - leave empty for barbería general)</label>
                  <select 
                    className="input-surgical bg-transparent w-full"
                    value={formData.barberoId}
                    onChange={(e) => setFormData({ ...formData, barberoId: e.target.value })}
                  >
                    <option value="">Barbería (General)</option>
                    {BARBERS.map(barber => (
                      <option key={barber.uid} value={barber.uid}>{barber.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Monto Objetivo ($)</label>
                <input 
                  type="number" 
                  className="input-surgical bg-transparent w-full"
                  placeholder="100"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Fecha Inicio</label>
                  <input 
                    type="date" 
                    className="input-surgical bg-transparent w-full"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Fecha Fin</label>
                  <input 
                    type="date" 
                    className="input-surgical bg-transparent w-full"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
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
                  <Check size={18} /> {editingId ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
