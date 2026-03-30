# 💈 The Doctor Barber Shop | Ecosistema de Gestión Interna

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_Store-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)

**The Doctor Barber Shop Gestión** es una plataforma administrativa de alto rendimiento diseñada bajo la estética *Surgical Edge*. Centraliza la operación completa de una barbería moderna, permitiendo un control milimétrico sobre las finanzas, el personal y la experiencia del cliente en un entorno robusto y escalable.

## 🎯 Vista General

Optimizar el flujo de trabajo diario a través de un panel inteligente segmentado por roles. Los **Administradores** obtienen una visión global del negocio (360°), mientras que los **Barberos** acceden a herramientas de autogestión para su rendimiento y objetivos.

La plataforma está orientada a:

- Control de reservas y agenda milimétrica.
- Seguimiento de ingresos y distribución automatizada de ganancias.
- Consulta de estadísticas avanzadas y métricas de rendimiento.
- Gestión integral de clientes, personal y servicios.
- Visualización de historial operativo con auditoría.
- Acceso segmentado por roles (Admin/Barbero).

## Características principales

- **Autenticación y control de acceso por roles**
  - Vista administrativa
  - Vista para barberos

- **Dashboard operativo**
  - Resumen de ingresos diarios, semanales y mensuales
  - Métricas de servicios realizados
  - Visualización de rendimiento por barbero

- **Gestión financiera**
  - Registro de servicios realizados
  - Cálculo y distribución de ganancias
  - Seguimiento de ingresos para barbería y barberos

- **Reservas y agenda**
  - Consulta de citas agendadas
  - Gestión de reservas
  - Endpoints para operaciones sobre reservas

- **Módulos del sistema**
  - Actas
  - Citas
  - Clientes
  - Estadísticas
  - Finanzas
  - Historial
  - Inventario
  - Objetivos
  - Perfil
  - Personal
  - Reservas
  - Servicios

## 🛠️ Stack Tecnológico de Vanguardia

### 💻 Frontend & UI
- **Next.js 16 (App Router)** & **React 19**: Lógica de vanguardia para una experiencia SPA fluida.
- **TypeScript**: Tipado estricto para un mantenimiento robusto.
- **Tailwind CSS 4**: Arquitectura de diseño de última generación con CSS nativo.
- **Framer Motion**: Animaciones fluidas para una interfaz premium.
- **shadcn/ui** & **Lucide React**: Componentes de alta calidad y set de iconos consistente.

### ⚙️ Backend & Infraestructura
- **API Routes**: Endpoints optimizados para operaciones críticas.
- **Firebase Standard & Admin**: Autenticación persistente y base de datos NoSQL en tiempo real.

### 🧪 Utilidades de Ingeniería
- **React Hook Form** + **Zod**: Validación de esquemas y formularios de alta precisión.
- **Recharts**: Representación visual de datos financieros y métricas.
- **date-fns**: Manejo profesional de tiempos y cronologías.
- **Sonner**: Sistema de notificaciones elegante y no intrusivo.

## Arquitectura del proyecto

La aplicación utiliza la estructura basada en `App Router` de Next.js y organiza sus módulos principales dentro de `src/app`.

```bash
src/
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── login/
│   └── page.tsx
├── components/
├── context/
└── lib/
```

### Estructura destacada
- `src/app/dashboard/` contiene los módulos principales del panel de gestión
- `src/app/api/` expone endpoints para reservas y barberos
- `src/context/` centraliza el manejo de autenticación
- `src/lib/` agrupa tipos, utilidades e integración con Firebase
- `src/components/` contiene componentes reutilizables de interfaz

## Experiencia del sistema

El sistema contempla dos enfoques principales dentro del dashboard:

### Administrador
Permite supervisar la operación completa del negocio:

- Ingresos del día, semana y mes
- Top de barberos
- Servicios recientes
- Distribución de ganancias por barbero
- Visión global del rendimiento del negocio

### Barbero
Ofrece una experiencia centrada en la operación individual:

- Consulta de ingresos propios
- Revisión de reservas
- Acceso a estadísticas personales
- Seguimiento de objetivos
- Historial de servicios realizados

## Instalación y ejecución local

### 1. Clonar el repositorio
```bash
git clone <TU_REPOSITORIO>
cd the_doctor_barber_gestion
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Ejecutar el entorno de desarrollo
```bash
npm run dev
```

La aplicación estará disponible en:

```bash
http://localhost:3000
```

## Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Configuración esperada

Para ejecutar correctamente el proyecto, se requiere configurar las credenciales y variables relacionadas con Firebase según el entorno local o de despliegue.

Dependiendo de tu implementación, es posible que necesites definir:

- Credenciales de cliente de Firebase
- Credenciales administrativas para Firebase Admin
- Configuración de Firestore
- Reglas e índices asociados

## 🚩 Estado del Proyecto

Proyecto en desarrollo activo bajo los más altos estándares de calidad UI/UX (*Surgical Edge Design*). Enfocado en construir una solución sólida, escalable y visualmente impactante para la administración de barberías de gama alta.

## ✍️ Autor

Desarrollado con dedicación por **[Juan17md](https://github.com/Juan17md)**.

---
*The Doctor Barber Shop - Engineering for Excellence.*
