# Instrucciones para Copilot en The Doctor Barber Shop

## 1. Tipo de proyecto y estructura
- Next.js App Router (`src/app/*`). No es página con router antiguo.
- `src/app/layout.tsx` envuelve con `AuthProvider` y `Toaster`; `src/app/dashboard/layout.tsx` envuelve con `DashboardLayout`.
- UI con Tailwind v4 y componentes shadcn (`src/components/ui/*`).
- Estado/auth de usuario en `src/context/AuthContext.tsx` usando `onAuthStateChanged`.

## 2. Integración Firebase
- SDK cliente: `src/lib/firebase.ts` (`auth`, `db`), usa variables `NEXT_PUBLIC_FIREBASE_*`.
- SDK admin: `src/lib/firebaseAdmin.ts`, usa `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- Ruta de API de ejemplo: `src/app/api/barbers/route.ts` valida token y rol con `adminAuth.verifyIdToken`.
- Firestore colección de datos principal: `users`, `bank`, etc.

## 3. Flujo de datos y auth
- `AuthProvider` obtiene y expone `user` y `userRole` de Firestore, luego se consume en `DashboardLayout` y páginas.
- `DashboardLayout` muestra spinner de carga mientras `loading=true`.
- APIs protegidas via `Authorization: Bearer <token>`, sin middleware global de Next.js.

## 4. Convenciones del proyecto
- TypeScript estricto con interfaces explícitas (`UserRole`, `AuthContextType`).
- Rutas/componentes en español (`citas`, `clientes`, `servicios`, `personal`, `historial`, etc.).
- `"use client"` en componentes que usan hooks de React y Firebase (Auth + estado). Ej: `AuthContext.tsx`, `DashboardLayout.tsx`.
- Mapeo de errores con `toSpanishUserMessage` en `src/lib/error-messages.ts`.

## 5. Flujos de desarrollador
- Desarrollo: `npm run dev`.
- Producción/local prod: `npm run build` y luego `npm run start`.
- Lint: `npm run lint`.
- No hay script de tests en `package.json` actualmente.

## 6. Puntos clave para cambios frecuentes
- Páginas del dashboard: `src/app/dashboard/*` (subrutas `citas`, `clientes`, `finanzas`, etc.).
- Layout de dashboard e interfaz: `src/components/DashboardLayout.tsx`, `Sidebar.tsx`, `Header.tsx`, `Footer.tsx`.
- API: `src/app/api/barbers/route.ts` y posiblemente nuevas rutas en `app/api`.
- Auth: `src/lib/firebase.ts`, `src/lib/firebaseAdmin.ts`, `src/context/AuthContext.tsx`.

## 7. Comportamientos que no romper
- Validación de admin/barber en `users.role` de Firestore.
- Creación de barbero: crear Auth user + doc `users` con `role` + doc `bank` con inicialización de saldo.
- Mantener strings UI en español y rutas en español.

## 8. Riesgos comunes
- Cambiar el flujo de verificación de token en `src/app/api/barbers/route.ts` puede romper permisos de admin.
- `FIREBASE_PRIVATE_KEY` debe procesarse con `.replace(/\\n/g, '\n')` en `src/lib/firebaseAdmin.ts`.
- `AuthContext` coloca fallback `role: "barber"` si no encuentra el documento de usuario.

> Revisa estas instrucciones y dime si necesitas detalles de alguna ruta, payload API o convenciones de naming para iterar.