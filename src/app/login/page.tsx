"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Scissors, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      document.cookie = `firebase-token=${token}; path=/; max-age=3600`;
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      console.error(err);
      setError("Credenciales inválidas. Por favor, inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-void flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-muted border border-primary/20 mb-6 glow-red-sm">
            <Scissors className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <p className="text-primary text-xs tracking-[0.4em] uppercase font-medium mb-3">
            Sistema de Gestión
          </p>
          <h1 className="font-display text-5xl text-text-primary tracking-wide">
            The Doctor
          </h1>
          <p className="text-text-muted text-sm mt-2 font-body">
            Barbería Premium
          </p>
        </div>

        {/* Login Card */}
        <div className="card-elevated p-8 animate-fade-in-up delay-200">
          <h2 className="font-display text-2xl text-text-primary mb-2">
            Bienvenido
          </h2>
          <p className="text-text-muted text-sm mb-8">
            Ingresa tus credenciales para acceder al sistema
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">
                Email
              </label>
              <input 
                type="email" 
                className="input-premium"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <input 
                type="password" 
                className="input-premium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-gold w-full py-3 mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-muted mt-8 animate-fade-in delay-400">
          © {new Date().getFullYear()} The Doctor Barber Shop. Todos los derechos reservados.
        </p>
      </div>
    </main>
  );
}
