import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  ApiError,
  autenticarUsuario,
  construirDocumentoReserva,
  normalizarReservaDocumento,
  validarPayloadReserva,
} from "@/lib/reservas";

export async function GET(request: Request) {
  try {
    const usuario = await autenticarUsuario(request);

    let query: FirebaseFirestore.Query = adminDb.collection("reservas");

    if (usuario.role === "barber") {
      query = query.where("barberId", "==", usuario.uid);
    }

    const snapshot = await query.get();
    const reservas = snapshot.docs
      .map((doc) => normalizarReservaDocumento(doc))
      .filter((reserva) => (usuario.role === "admin" ? true : reserva.barberId === usuario.uid))
      .sort((a, b) => {
        const fechaA = a.creadoAt || "";
        const fechaB = b.creadoAt || "";
        return fechaA < fechaB ? 1 : -1;
      });

    return NextResponse.json({ reservas });
  } catch (error) {
    console.error("Error al listar reservas:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Error al obtener las reservas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await autenticarUsuario(request);
    const body = await request.json();
    const payload = validarPayloadReserva(body);
    const documento = await construirDocumentoReserva(payload, usuario);

    const docRef = await adminDb.collection("reservas").add(documento);
    const creada = await docRef.get();

    return NextResponse.json(
      {
        mensaje: "Reserva creada correctamente.",
        reserva: normalizarReservaDocumento(creada),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear reserva:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Error al crear la reserva." }, { status: 500 });
  }
}