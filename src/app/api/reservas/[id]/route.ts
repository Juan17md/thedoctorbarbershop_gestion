import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  ApiError,
  autenticarUsuario,
  construirDocumentoReserva,
  normalizarReservaDocumento,
  obtenerReservaPorId,
  validarPayloadReserva,
  validarPermisoReserva,
} from "@/lib/reservas";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const usuario = await autenticarUsuario(request);
    const { id } = await context.params;
    const doc = await obtenerReservaPorId(id);
    const reserva = normalizarReservaDocumento(doc);

    validarPermisoReserva(usuario, reserva.barberId);

    return NextResponse.json({ reserva });
  } catch (error) {
    console.error("Error al obtener reserva:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Error al obtener la reserva." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const usuario = await autenticarUsuario(request);
    const { id } = await context.params;
    const body = await request.json();
    const payload = validarPayloadReserva(body);
    const doc = await obtenerReservaPorId(id);
    const existente = doc.data() ?? {};
    const reservaExistente = normalizarReservaDocumento(doc);

    validarPermisoReserva(usuario, reservaExistente.barberId);
    validarPermisoReserva(usuario, payload.barberId);

    const documento = await construirDocumentoReserva(payload, usuario, existente);

    await adminDb.collection("reservas").doc(id).set(documento, { merge: true });

    const actualizada = await adminDb.collection("reservas").doc(id).get();

    return NextResponse.json({
      mensaje: "Reserva actualizada correctamente.",
      reserva: normalizarReservaDocumento(actualizada),
    });
  } catch (error) {
    console.error("Error al actualizar reserva:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Error al actualizar la reserva." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const usuario = await autenticarUsuario(request);
    const { id } = await context.params;
    const doc = await obtenerReservaPorId(id);
    const reserva = normalizarReservaDocumento(doc);

    validarPermisoReserva(usuario, reserva.barberId);

    await adminDb.collection("reservas").doc(id).delete();

    return NextResponse.json({
      mensaje: "Reserva eliminada correctamente.",
      id,
    });
  } catch (error) {
    console.error("Error al eliminar reserva:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Error al eliminar la reserva." }, { status: 500 });
  }
}