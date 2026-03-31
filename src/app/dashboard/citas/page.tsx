"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { SERVICES, BARBERS } from "@/lib/types";
import { 
  collection, 
  addDoc, 
  onSnapshot,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, Clock, User, Plus, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { getLocalDateString } from "@/lib/utils";

const TIME_SLOTS = [
  "09:00", "09:45", "10:30", "11:15", "12:00", "12:45", 
  "13:30", "14:15", "15:00", "15:45", "16:30", "17:15", "18:00"
];

interface BlockedTime {
  id: string;
  barberId: string;
  date: string;
  time: string;
}

export default function CitasPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ barberId: "", serviceId: "", clientName: "", clientPhone: "", time: "" });

  useEffect(() => {
    if (!userRole?.uid) return;
    let q;
    if (isAdmin) {
      q = query(collection(db, "blocked_times"), orderBy("date", "desc"));
    } else {
      q = query(collection(db, "blocked_times"), where("barberId", "==", userRole?.uid), orderBy("date", "desc"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlockedTime[];
      setBlockedTimes(data);
    });
    return () => unsubscribe();
  }, [isAdmin, userRole?.uid]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
      days.push(new Date(year, month, -startPadding + i + 1));
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const isBlocked = (date: Date, time: string) => {
    const dateStr = getLocalDateString(date);
    return blockedTimes.some(bt => bt.date === dateStr && bt.time === time && (isAdmin || bt.barberId === userRole?.uid));
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleBlockTime = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "blocked_times"), {
      barberId: userRole?.uid,
      date: getLocalDateString(selectedDate),
      time: formData.time,
      createdAt: new Date()
    });
    setIsModalOpen(false);
    setFormData({ ...formData, time: "" });
  };

  const handleCancelBlock = async (id: string) => {
    await import("firebase/firestore").then(({ deleteDoc, doc }) => 
      deleteDoc(doc(db, "blocked_times", id))
    );
  };

  return (
    <div className="space-y-6">
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-premium p-6">
          <div className="flex items-center justify-end mb-6">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-surface-high rounded-lg transition-colors">
              <ChevronLeft className="text-text-secondary" />
            </button>
            <h2 className="font-display text-xl text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={handleNextMonth} className="p-2 hover:bg-surface-high rounded-lg transition-colors">
              <ChevronRight className="text-text-secondary" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(day => (
              <div key={day} className="text-center text-xs text-text-muted uppercase py-2">{day}</div>
            ))}
            {days.map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isSelected = day.toDateString() === selectedDate.toDateString();
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    p-2 text-sm rounded-lg transition-all
                    ${!isCurrentMonth ? "text-text-muted/30" : ""}
                    ${isSelected ? "bg-primary text-white" : "hover:bg-surface-high"}
                    ${isToday && !isSelected ? "border border-primary" : ""}
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-premium p-6">
          <h3 className="font-display text-xl text-white mb-4">
            {selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          
          <div className="space-y-2 mb-6">
            <p className="text-text-secondary text-sm">Horarios disponibles</p>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(time => {
                const blocked = isBlocked(selectedDate, time);
                return (
                  <button
                    key={time}
                    onClick={() => { if (!blocked) { setFormData({ ...formData, time, barberId: userRole?.uid || "", serviceId: "", clientName: "", clientPhone: "" }); setIsModalOpen(true); } }}
                    disabled={blocked}
                    className={`
                      px-2 py-2 text-xs rounded-lg transition-all
                      ${blocked ? "bg-red-500/20 text-red-500 cursor-not-allowed" : "bg-surface-high text-text-secondary hover:text-white hover:bg-primary/20"}
                    `}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-outline pt-4">
            <p className="text-text-secondary text-sm mb-3">Horarios bloqueados</p>
            <div className="space-y-2">
              {blockedTimes
                .filter(bt => bt.date === getLocalDateString(selectedDate) && (isAdmin || bt.barberId === userRole?.uid))
                .map(bt => (
                  <div key={bt.id} className="flex items-center justify-between bg-red-500/10 p-3 rounded-lg">
                    <span className="text-red-400 text-sm">{bt.time}</span>
                    <button onClick={() => handleCancelBlock(bt.id)} className="text-text-muted hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              {blockedTimes.filter(bt => bt.date === getLocalDateString(selectedDate)).length === 0 && (
                <p className="text-text-muted text-sm">No hay horarios bloqueados</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
          <div className="card-premium w-full max-w-md p-8 relative border-t-2 border-t-primary border-primary/20">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="font-display text-3xl mb-6">
              BLOQUEAR <span className="text-primary italic">HORARIO</span>
            </h3>
            <form onSubmit={handleBlockTime} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Hora</label>
                <input 
                  type="text"
                  className="w-full bg-surface-high border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors font-body text-sm"
                  value={formData.time}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Fecha</label>
                <input 
                  type="text"
                  className="w-full bg-surface-high border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors font-body text-sm"
                  value={selectedDate.toLocaleDateString("es-ES")}
                  disabled
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 rounded-xl border border-outline text-text-muted hover:text-white transition-colors uppercase tracking-widest text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full btn-primary py-3 flex justify-center items-center uppercase tracking-widest text-xs font-bold gap-2"
                >
                  <Check size={16} /> Bloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
