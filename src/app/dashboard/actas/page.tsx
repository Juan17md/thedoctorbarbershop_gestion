"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, FileText, Loader2, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";

interface Transaccion {
  id: string;
  tipo: "acta" | "gasto";
  concepto: string;
  especialista: string;
  monto: number;
  estado: string;
  fechaString: string;
  creadoAt: unknown;
}

export default function ActasGastosPage() {
  const [activeTab, setActiveTab] = useState<"actas" | "gastos">("actas");
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevaData, setNuevaData] = useState({ concepto: "", especialista: "", monto: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "transacciones"), orderBy("creadoAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaccion[];
      setTransacciones(datos);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCrearRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "transacciones"), {
        tipo: activeTab,
        concepto: nuevaData.concepto,
        especialista: activeTab === "actas" ? nuevaData.especialista : "Operativo",
        monto: Number(nuevaData.monto),
        estado: "Pagado",
        fechaString: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        creadoAt: serverTimestamp(),
      });
      setModalAbierto(false);
      setNuevaData({ concepto: "", especialista: "", monto: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const datosFiltrados = transacciones.filter(
    (t) => (t.tipo + "s") === activeTab
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up stagger-1">
        <div>
          <h1 className="font-display text-4xl text-text-primary tracking-wide">
            GESTIÓN DE <span className="text-surgical-red italic">ACTAS Y GASTOS</span>
          </h1>
          <p className="text-text-muted mt-2 text-sm leading-relaxed max-w-xl">
            Registra y administra los egresos operativos (Gastos) y los pagos por
            servicios realizados por los especialistas (Actas).
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setModalAbierto(true)}
            className="btn-surgical shrink-0 text-sm py-2.5 flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Nuevo Registro</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline animate-fade-in-up stagger-2">
        <button
          onClick={() => setActiveTab("actas")}
          className={`px-8 py-4 font-display text-xl transition-all ${
            activeTab === "actas"
              ? "text-surgical-red border-b-2 border-surgical-red bg-surgical-red/5"
              : "text-text-secondary hover:text-white"
          }`}
        >
          Actas (Servicios)
        </button>
        <button
          onClick={() => setActiveTab("gastos")}
          className={`px-8 py-4 font-display text-xl transition-all ${
            activeTab === "gastos"
              ? "text-surgical-red border-b-2 border-surgical-red bg-surgical-red/5"
              : "text-text-secondary hover:text-white"
          }`}
        >
          Gastos (Operacionales)
        </button>
      </div>

      {/* Data Table Area */}
      <div className="glass-card overflow-hidden animate-fade-in-up stagger-3">
        <div className="overflow-x-auto min-h-[300px]">
          {cargando ? (
            <div className="flex flex-col items-center justify-center p-20 text-text-muted">
              <Loader2 size={32} className="animate-spin text-surgical-red mb-4" />
              <p className="text-sm tracking-widest uppercase">Cargando registros...</p>
            </div>
          ) : datosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-text-muted">
              <FileText size={48} className="text-surface-bright mb-4" />
              <p className="text-sm tracking-widest uppercase">No hay registros de {activeTab}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-high border-b border-outline text-text-muted text-xs uppercase tracking-widest">
                  <th className="p-4 font-medium">ID / Ref</th>
                  <th className="p-4 font-medium">Hora</th>
                  <th className="p-4 font-medium">Concepto</th>
                  <th className="p-4 font-medium">Responsable</th>
                  <th className="p-4 font-medium text-right">Monto</th>
                  <th className="p-4 font-medium text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {datosFiltrados.map((t, i) => (
                  <tr key={t.id} className="hover:bg-surface-high/50 transition-colors group cursor-pointer">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors
                          ${activeTab === 'actas' ? 'bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white' : 'bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white'}`}>
                          <FileText size={14} />
                        </div>
                        <span className="text-sm font-medium">#{t.id.slice(0,6).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{t.fechaString}</td>
                    <td className="p-4 text-sm">{t.concepto}</td>
                    <td className="p-4 text-sm">{t.especialista}</td>
                    <td className={`p-4 font-display text-lg text-right ${activeTab === 'actas' ? 'text-green-500' : 'text-red-500'}`}>
                      ${t.monto.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {t.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Nuevo Registro */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 relative border-t-2 border-t-surgical-red">
            <button 
              onClick={() => setModalAbierto(false)} 
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="font-display text-3xl mb-6">
              NUEVO <span className="text-surgical-red italic">{activeTab.toUpperCase()}</span>
            </h3>

            <form onSubmit={handleCrearRegistro} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-text-secondary mb-2">Concepto</label>
                <input 
                  type="text" 
                  required 
                  className="input-surgical"
                  placeholder={activeTab === 'actas' ? 'Corte de Cabello' : 'Insumos de limpieza'}
                  value={nuevaData.concepto}
                  onChange={e => setNuevaData({...nuevaData, concepto: e.target.value})}
                />
              </div>

              {activeTab === "actas" && (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-text-secondary mb-2">Responsable / Especialista</label>
                  <select 
                    required 
                    className="input-surgical"
                    value={nuevaData.especialista}
                    onChange={e => setNuevaData({...nuevaData, especialista: e.target.value})}
                  >
                    <option value="" className="bg-surface-high">Selecciona un barbero</option>
                    <option value="Eduardo" className="bg-surface-high">Eduardo</option>
                    <option value="Franyer" className="bg-surface-high">Franyer</option>
                    <option value="Brayan" className="bg-surface-high">Brayan</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-widest text-text-secondary mb-2">Monto ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  className="input-surgical"
                  placeholder="0.00"
                  value={nuevaData.monto || ''}
                  onChange={e => setNuevaData({...nuevaData, monto: Number(e.target.value)})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setModalAbierto(false)}
                  className="w-full py-3 rounded-xl border border-outline text-text-muted hover:text-white transition-colors uppercase tracking-widest text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full btn-surgical py-3 flex justify-center items-center uppercase tracking-widest text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
