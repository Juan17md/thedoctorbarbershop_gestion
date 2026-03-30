"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserRole {
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: "admin" | "barber";
}

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: data.name || firebaseUser.email?.split("@")[0] || "Usuario",
              phone: data.phone || "",
              role: data.role || "barber",
            });
          } else {
            setUserRole({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: firebaseUser.email?.split("@")[0] || "Usuario",
              phone: "",
              role: "barber",
            });
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.email?.split("@")[0] || "Usuario",
            phone: "",
            role: "barber",
          });
        }
      } else {
        setUserRole(null);
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
