"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  CalendarDays,
  FileText,
  Wallet, 
  LogOut,
  Menu,
  Package,
  Target,
  BarChart3,
  Scissors,
  ChevronLeft
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
      router.push("/login");
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const navItems = [
    { name: "Resumen", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "barber"] },
    { name: "Reservas", path: "/dashboard/reservas", icon: CalendarDays, roles: ["admin", "barber"] },
    { name: "Servicios", path: "/dashboard/servicios", icon: Scissors, roles: ["admin", "barber"] },
    { name: "Inventario", path: "/dashboard/inventario", icon: Package, roles: ["admin"] },
    { name: "Finanzas", path: "/dashboard/finanzas", icon: Wallet, roles: ["admin", "barber"] },
    { name: "Estadísticas", path: "/dashboard/estadisticas", icon: BarChart3, roles: ["admin", "barber"] },
    { name: "Objetivos", path: "/dashboard/objetivos", icon: Target, roles: ["admin", "barber"] },
    { name: "Administración", path: "/dashboard/actas", icon: FileText, roles: ["admin"] },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(userRole?.role || "barber")
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase">Cargando Sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex text-text-primary relative overflow-hidden font-body">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-void/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen z-50
        bg-surface/80 backdrop-blur-xl border-r border-border-subtle flex flex-col
        transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.1)
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${sidebarCollapsed ? "w-20" : "w-64"}
      `}>
        {/* Logo */}
        <div className="h-24 flex items-center justify-between px-5 border-b border-white/5">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? "justify-center w-full" : ""}`}>
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary-dark via-primary to-primary-dark flex items-center justify-center shadow-red-strong border border-white/10">
              <span className="font-display text-white text-xl tracking-tighter">TD</span>
            </div>
            {!sidebarCollapsed && (
              <div className="animate-fade-in">
                <h1 className="font-hero text-2xl tracking-widest leading-none">THE DOCTOR</h1>
                <p className="text-[9px] text-text-muted tracking-[0.4em] uppercase leading-none mt-1.5 font-bold">B A R B E R</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-white/5 transition-all"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-6 space-y-1 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <button 
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`
                  w-full flex items-center gap-4 rounded-lg transition-all duration-300 group
                  ${sidebarCollapsed ? "justify-center px-4 py-4" : "px-4 py-3"}
                  ${isActive 
                    ? "glass-premium text-primary border-r-2 border-primary bg-primary/5 shadow-red-glow" 
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }
                `}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon size={isActive ? 20 : 18} className={isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"} />
                {!sidebarCollapsed && (
                  <span className={`font-display text-[15px] font-bold tracking-widest uppercase transition-all duration-300 ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Area */}
        <div className="p-4 border-t border-white/5 mt-auto">
          {sidebarCollapsed ? (
            <div className="flex flex-col gap-4 items-center">
              <div className="w-10 h-10 rounded-full bg-surface-high border border-white/5 flex items-center justify-center text-primary font-display">
                {user?.email?.[0].toUpperCase()}
              </div>
              <button 
                onClick={handleLogout}
                className="p-3 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-high border border-white/5 shadow-lg">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display border border-primary/20 shadow-inner">
                  {user?.email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[13px] font-bold text-white truncate uppercase tracking-wider">{userRole?.name || "Premium User"}</p>
                  <p className="text-[10px] text-primary font-bold tracking-widest uppercase opacity-80">{userRole?.role || 'Barber'}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-display text-[13px] tracking-widest uppercase text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
              >
                <LogOut size={14} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className="h-24 glass-premium sticky top-0 z-20 flex items-center justify-between px-8 border-b border-white/5">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-3 rounded-xl bg-surface-high text-text-muted hover:text-white transition-all border border-white/5 shadow-md"
            >
              <Menu size={20} />
            </button>
            <div className="animate-fade-in-up">
              <h2 className="text-urban-header text-text-primary tracking-tighter leading-none">
                {navItems.find(item => item.path === pathname)?.name || "DASHBOARD"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden lg:flex flex-col items-end">
              <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long' })}
              </p>
              <p className="text-xs text-white font-medium tracking-wide">
                {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <div className="h-10 w-px bg-white/5 hidden md:block" />

            <div className="hidden md:flex items-center gap-3 border border-white/5 rounded-full pl-3 pr-4 py-1.5 bg-void/50 backdrop-blur-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10B981] animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">ONLINE</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-8 lg:p-12 max-w-7xl mx-auto w-full animate-fade-in">
            {children}
          </div>
          
          {/* Footer sutil */}
          <footer className="p-8 text-center border-t border-white/5">
            <p className="text-[9px] text-text-muted uppercase tracking-[0.4em] font-bold">The Doctor Barber Shop — Premium Management System</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
