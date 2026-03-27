"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type InventoryItem } from "@/lib/types";
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
import { Plus, Pencil, Trash2, Package, AlertTriangle, Check, XCircle } from "lucide-react";

export default function InventarioPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [formData, setFormData] = useState({ name: "", quantity: 0, minQuantity: 5, unit: "unidades", price: 0 });

  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate()
      })) as InventoryItem[];
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemData = {
      ...formData,
      addedAt: new Date(),
      addedBy: userRole?.uid || ""
    };

    if (editingId) {
      await updateDoc(doc(db, "inventory", editingId), formData);
    } else {
      await addDoc(collection(db, "inventory"), itemData);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", quantity: 0, minQuantity: 5, unit: "unidades", price: 0 });
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({ name: item.name, quantity: item.quantity, minQuantity: item.minQuantity, unit: item.unit, price: item.price });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar este producto?")) {
      await deleteDoc(doc(db, "inventory", id));
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return "out";
    if (item.quantity <= item.minQuantity) return "low";
    return "ok";
  };

  const filteredItems = items.filter(item => {
    const status = getStockStatus(item);
    if (filter === "all") return true;
    if (filter === "low") return status === "low";
    if (filter === "out") return status === "out";
    return true;
  });

  const lowStockCount = items.filter(i => getStockStatus(i) === "low").length;
  const outOfStockCount = items.filter(i => getStockStatus(i) === "out").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-urban-header text-text-primary">INVENTARIO</h1>
          <p className="text-text-muted mt-1 text-sm font-medium">Control de stock y suministros</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setIsModalOpen(true); setEditingId(null); setFormData({ name: "", quantity: 0, minQuantity: 5, unit: "unidades", price: 0 }); }}
            className="btn-primary"
          >
            <Plus size={20} className="mr-2" /> NUEVO PRODUCTO
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium p-6 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
              <Package size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Productos</p>
              <p className="font-display text-5xl text-white tracking-tight leading-none">{items.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card-premium p-6 border-amber-500/20 bg-amber-500/3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <AlertTriangle size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Stock Bajo</p>
              <p className="font-display text-5xl text-white tracking-tight leading-none">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="card-premium p-6 border-red-500/20 bg-red-500/3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <XCircle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Agotados</p>
              <p className="font-display text-5xl text-white tracking-tight leading-none">{outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "low", "out"] as const).map((f) => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-2 rounded-md font-display text-[13px] font-bold tracking-widest uppercase transition-all border ${
              filter === f 
                ? "bg-primary text-white border-primary shadow-red-glow" 
                : "bg-surface-high text-text-muted border-white/5 hover:border-primary/30 hover:text-white"
            }`}
          >
            {f === "all" ? `Todos (${items.length})` : f === "low" ? `Bajo (${lowStockCount})` : `Agotado (${outOfStockCount})`}
          </button>
        ))}
      </div>

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-surface-low/30">
                <th className="text-left py-4 px-6 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Producto</th>
                <th className="text-left py-4 px-6 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Cantidad</th>
                <th className="text-left py-4 px-6 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Mínimo</th>
                <th className="text-left py-4 px-6 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Unidad</th>
                <th className="text-left py-4 px-6 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Precio</th>
                <th className="text-left py-4 px-6 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Estado</th>
                {isAdmin && <th className="text-right py-4 px-6 text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const status = getStockStatus(item);
                return (
                  <tr key={item.id} className="border-b border-white/2 hover:bg-white/1 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-medium text-text-primary tracking-wide">{item.name}</span>
                    </td>
                    <td className="py-4 px-6 text-text-secondary font-display text-xl tracking-tighter">{item.quantity}</td>
                    <td className="py-4 px-6 text-text-muted">{item.minQuantity}</td>
                    <td className="py-4 px-6 text-text-secondary italic text-xs">{item.unit}</td>
                    <td className="py-4 px-6 text-text-primary font-display text-xl tracking-widest">${item.price.toFixed(2)}</td>
                    <td className="py-4 px-6">
                      {status === "out" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 font-display text-[11px] font-bold uppercase tracking-widest border border-red-500/20">
                          <XCircle size={10} /> AGOTADO
                        </span>
                      )}
                      {status === "low" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 font-display text-[11px] font-bold uppercase tracking-widest border border-amber-500/20">
                          <AlertTriangle size={10} /> STOCK BAJO
                        </span>
                      )}
                      {status === "ok" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-display text-[11px] font-bold uppercase tracking-widest border border-emerald-500/20">
                          <Check size={10} /> DISPONIBLE
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(item)} className="p-2 text-text-muted hover:text-primary transition-colors">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-text-muted hover:text-primary transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="text-center py-24 text-text-muted uppercase tracking-[0.3em] text-[10px] font-bold opacity-50">
              No se encontraron productos
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">
              {editingId ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Nombre del Producto</label>
                <input 
                  type="text" 
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                  placeholder="Ej: Cuchillas Derby"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Cantidad</label>
                  <input 
                    type="number" 
                    className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 outline-none"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Mínimo</label>
                  <input 
                    type="number" 
                    className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 outline-none"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Unidad</label>
                  <input 
                    type="text" 
                    className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 outline-none"
                    placeholder="Unidades"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Precio</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 outline-none font-display tracking-widest"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                  />
                </div>
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
                  className="flex-1 btn-primary"
                >
                  {editingId ? "GUARDAR" : "CREAR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
