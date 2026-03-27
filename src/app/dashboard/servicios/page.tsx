"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { SERVICES, type Service } from "@/lib/types";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Pencil, Trash2, Clock, DollarSign, Check } from "lucide-react";

export default function ServiciosPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [servicios, setServicios] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: 0, duration: 45, description: "" });

  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];
      setServicios(data.length > 0 ? data : SERVICES);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateDoc(doc(db, "services", editingId), formData);
    } else {
      await addDoc(collection(db, "services"), formData);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", price: 0, duration: 45, description: "" });
  };

  const handleEdit = (servicio: Service) => {
    setFormData({ name: servicio.name, price: servicio.price, duration: servicio.duration, description: servicio.description || "" });
    setEditingId(servicio.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este servicio?")) {
      await deleteDoc(doc(db, "services", id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">Servicios</h1>
          <p className="text-text-secondary mt-1">Gestiona los servicios y precios de la barbería</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setIsModalOpen(true); setEditingId(null); setFormData({ name: "", price: 0, duration: 45, description: "" }); }}
            className="btn-surgical flex items-center gap-2"
          >
            <Plus size={18} /> Nuevo Servicio
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicios.map((servicio) => (
          <div key={servicio.id} className="glass-card p-6 hover:border-surgical-red/30 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-white">{servicio.name}</h3>
                {servicio.description && (
                  <p className="text-text-secondary text-sm mt-1">{servicio.description}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(servicio)} className="p-2 text-text-muted hover:text-surgical-red transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(servicio.id)} className="p-2 text-text-muted hover:text-surgical-red transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-1 text-surgical-red">
                <DollarSign size={18} />
                <span className="font-display text-2xl">${servicio.price}</span>
              </div>
              <div className="flex items-center gap-1 text-text-muted">
                <Clock size={16} />
                <span className="text-sm">{servicio.duration} min</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 w-full max-w-md">
            <h2 className="font-display text-2xl text-white mb-6">
              {editingId ? "Editar Servicio" : "Nuevo Servicio"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Nombre del Servicio</label>
                <input 
                  type="text" 
                  className="input-surgical bg-transparent w-full"
                  placeholder="Corte de Cabello Simple"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Precio ($)</label>
                  <input 
                    type="number" 
                    className="input-surgical bg-transparent w-full"
                    placeholder="7"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Duración (min)</label>
                  <input 
                    type="number" 
                    className="input-surgical bg-transparent w-full"
                    placeholder="45"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Descripción (opcional)</label>
                <input 
                  type="text" 
                  className="input-surgical bg-transparent w-full"
                  placeholder="Detalles del servicio..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
