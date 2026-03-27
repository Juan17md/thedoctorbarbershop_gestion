"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type Client } from "@/lib/types";
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
import { Plus, Pencil, Trash2, Phone, Mail, User, Check, Search } from "lucide-react";

export default function ClientesPage() {
  const { userRole } = useAuth();
  const [clientes, setClientes] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", notes: "" });

  useEffect(() => {
    let q;
    if (userRole?.role === "admin") {
      q = query(collection(db, "clients"), orderBy("name"));
    } else {
      q = query(collection(db, "clients"), where("createdBy", "==", userRole?.uid), orderBy("name"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Client[];
      setClientes(data);
    });
    return () => unsubscribe();
  }, [userRole?.role, userRole?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientData = {
      ...formData,
      createdAt: new Date(),
      createdBy: userRole?.uid || ""
    };

    if (editingId) {
      await updateDoc(doc(db, "clients", editingId), formData);
    } else {
      await addDoc(collection(db, "clients"), clientData);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", phone: "", email: "", notes: "" });
  };

  const handleEdit = (cliente: Client) => {
    setFormData({ name: cliente.name, phone: cliente.phone, email: cliente.email || "", notes: cliente.notes || "" });
    setEditingId(cliente.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este cliente?")) {
      await deleteDoc(doc(db, "clients", id));
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">Clientes</h1>
          <p className="text-text-secondary mt-1">Gestiona los clientes de la barbería</p>
        </div>
        <button 
          onClick={() => { setIsModalOpen(true); setEditingId(null); setFormData({ name: "", phone: "", email: "", notes: "" }); }}
          className="btn-surgical flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        <input 
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          className="input-surgical bg-surface pl-12 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline">
              <th className="text-left py-4 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Cliente</th>
              <th className="text-left py-4 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Teléfono</th>
              <th className="text-left py-4 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Email</th>
              <th className="text-left py-4 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Notas</th>
              <th className="text-right py-4 px-4 text-xs text-text-muted uppercase tracking-wider font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.map((cliente) => (
              <tr key={cliente.id} className="border-b border-white/5 hover:bg-surface-high/30 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surgical-red/20 flex items-center justify-center">
                      <User size={18} className="text-surgical-red" />
                    </div>
                    <span className="font-medium text-white">{cliente.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-text-secondary">{cliente.phone}</td>
                <td className="py-4 px-4 text-text-secondary">{cliente.email || "-"}</td>
                <td className="py-4 px-4 text-text-secondary max-w-xs truncate">{cliente.notes || "-"}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(cliente)} className="p-2 text-text-muted hover:text-surgical-red transition-colors">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(cliente.id)} className="p-2 text-text-muted hover:text-surgical-red transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredClientes.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No hay clientes registrados
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 w-full max-w-md">
            <h2 className="font-display text-2xl text-white mb-6">
              {editingId ? "Editar Cliente" : "Nuevo Cliente"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Nombre</label>
                <input 
                  type="text" 
                  className="input-surgical bg-transparent w-full"
                  placeholder="Juan Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Teléfono</label>
                <input 
                  type="tel" 
                  className="input-surgical bg-transparent w-full"
                  placeholder="+57 300 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Email (opcional)</label>
                <input 
                  type="email" 
                  className="input-surgical bg-transparent w-full"
                  placeholder="juan@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Notas (opcional)</label>
                <textarea 
                  className="input-surgical bg-transparent w-full h-24 resize-none"
                  placeholder="Notas sobre el cliente..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
