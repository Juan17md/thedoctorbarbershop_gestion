import { z } from "zod";
import * as admin from "firebase-admin";
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import type { Reserva, ReservaEstado, ReservaPayload, UserRole } from "@/lib/types";

export const RESERVA_ESTADOS = ["pendiente", "confirmada", "completada", "cancelada"] as const;

const reservaEstadoSchema = z.enum(RESERVA_ESTADOS, {
  error: () => ({ message: "El estado de la reserva no es válido." }),
});

const stringRequerido = (campo: string) =>
  z
    .string()
    .trim()
    .min(1, `El campo "${campo}" es obligatorio.`);

const reservaPayloadSchema = z.object({
  barberId: stringRequerido("barberId"),
  barberName: stringRequerido("barberName"),
  serviceId: stringRequerido("serviceId"),
  serviceName: stringRequerido("serviceName"),
  fecha: stringRequerido("fecha"),
  hora: stringRequerido("hora"),
  clienteNombre: stringRequerido("clienteNombre"),
  clienteTelefono: stringRequerido("clienteTelefono"),
  estado: reservaEstadoSchema.default("pendiente"),
  notas: z.string().trim().max(1000, "Las notas no pueden superar los 1000 caracteres.").optional().or(z.literal("")),
});

export interface UsuarioAutenticado {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function convertirTimestamp(valor: unknown): string | null {
  if (!valor) {
    return null;
  }

  if (typeof valor === "string") {
    return valor;
  }

  if (valor instanceof Date) {
    return valor.toISOString();
  }

  if (typeof valor === "object" && valor !== null) {
    if ("toDate" in valor && typeof valor.toDate === "function") {
      return valor.toDate().toISOString();
    }

    if ("_seconds" in valor && typeof valor._seconds === "number") {
      return new Date(valor._seconds * 1000).toISOString();
    }

    if ("seconds" in valor && typeof valor.seconds === "number") {
      return new Date(valor.seconds * 1000).toISOString();
    }
  }

  return null;
}

function valorTexto(...valores: unknown[]): string {
  for (const valor of valores) {
    if (typeof valor === "string" && valor.trim()) {
      return valor.trim();
    }
  }

  return "";
}

export function normalizarReservaDocumento(
  snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData | undefined }
): Reserva {
  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    barberId: valorTexto(data.barberId, data.barberoId, data.creadoPorUid),
    barberName: valorTexto(data.barberName, data.barbero, data.barber),
    serviceId: valorTexto(data.serviceId, data.servicioId, data.serviceName, data.servicio),
    serviceName: valorTexto(data.serviceName, data.servicio, data.service),
    fecha: valorTexto(data.fecha, data.date),
    hora: valorTexto(data.hora, data.time),
    clienteNombre: valorTexto(data.clienteNombre, data.cliente_nombre, data.clientName),
    clienteTelefono: valorTexto(data.clienteTelefono, data.cliente_telefono, data.clientPhone),
    estado: normalizarEstado(data.estado),
    notas: valorTexto(data.notas, data.notes) || undefined,
    creadoAt: convertirTimestamp(data.creadoAt) ?? "",
    actualizadoAt: convertirTimestamp(data.actualizadoAt) ?? convertirTimestamp(data.creadoAt) ?? "",
    creadoPorUid: valorTexto(data.creadoPorUid, data.barberId, data.barberoId),
    creadoPorRol: normalizarRol(data.creadoPorRol),
    barbero: valorTexto(data.barbero, data.barberName, data.barber),
    servicio: valorTexto(data.servicio, data.serviceName, data.service),
    cliente_nombre: valorTexto(data.cliente_nombre, data.clienteNombre, data.clientName),
    cliente_telefono: valorTexto(data.cliente_telefono, data.clienteTelefono, data.clientPhone),
  };
}

export function normalizarEstado(estado: unknown): ReservaEstado {
  if (typeof estado === "string" && RESERVA_ESTADOS.includes(estado as ReservaEstado)) {
    return estado as ReservaEstado;
  }

  return "pendiente";
}

function normalizarRol(rol: unknown): UserRole {
  return rol === "admin" ? "admin" : "barber";
}

export async function autenticarUsuario(request: Request): Promise<UsuarioAutenticado> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError("No autorizado. Debes iniciar sesión.", 401);
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data() ?? {};

    return {
      uid: decodedToken.uid,
      email: decodedToken.email ?? "",
      role: normalizarRol(userData.role),
      name: valorTexto(userData.name, decodedToken.name, decodedToken.email?.split("@")[0], "Usuario"),
      phone: valorTexto(userData.phone),
    };
  } catch (error) {
    console.error("Error al verificar el token:", error);
    throw new ApiError("No autorizado. Tu sesión no es válida.", 401);
  }
}

export function validarPayloadReserva(payload: unknown): ReservaPayload {
  const resultado = reservaPayloadSchema.safeParse(payload);

  if (!resultado.success) {
    const primerError = resultado.error.issues[0];
    throw new ApiError(primerError?.message ?? "Datos de la reserva inválidos.", 400);
  }

  return {
    ...resultado.data,
    estado: resultado.data.estado ?? "pendiente",
    notas: resultado.data.notas?.trim() || undefined,
  };
}

export function validarPermisoReserva(usuario: UsuarioAutenticado, barberId: string) {
  if (usuario.role === "admin") {
    return;
  }

  if (usuario.uid !== barberId) {
    throw new ApiError("No autorizado para gestionar esta reserva.", 403);
  }
}

export async function obtenerReservaPorId(id: string) {
  const doc = await adminDb.collection("reservas").doc(id).get();

  if (!doc.exists) {
    throw new ApiError("Reserva no encontrada.", 404);
  }

  return doc;
}

export async function construirDocumentoReserva(
  payload: ReservaPayload,
  usuario: UsuarioAutenticado,
  existente?: DocumentData
) {
  validarPermisoReserva(usuario, payload.barberId);

  const ahora = admin.firestore.FieldValue.serverTimestamp();

  return {
    barberId: payload.barberId,
    barberName: payload.barberName,
    serviceId: payload.serviceId,
    serviceName: payload.serviceName,
    fecha: payload.fecha,
    hora: payload.hora,
    clienteNombre: payload.clienteNombre,
    clienteTelefono: payload.clienteTelefono,
    estado: payload.estado,
    notas: payload.notas ?? "",
    actualizadoAt: ahora,
    ...(existente
      ? {}
      : {
          creadoAt: ahora,
          creadoPorUid: usuario.uid,
          creadoPorRol: usuario.role,
        }),
    barbero: payload.barberName,
    servicio: payload.serviceName,
    cliente_nombre: payload.clienteNombre,
    cliente_telefono: payload.clienteTelefono,
    ...(existente
      ? {
          creadoPorUid: valorTexto(existente.creadoPorUid, usuario.uid),
          creadoPorRol: normalizarRol(existente.creadoPorRol ?? usuario.role),
          creadoAt: existente.creadoAt ?? ahora,
        }
      : {}),
  };
}