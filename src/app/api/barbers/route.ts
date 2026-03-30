import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { toSpanishUserMessage } from "@/lib/error-messages";
import * as admin from "firebase-admin";

// Verificar si el usuario que hace la solicitud es admin
async function isAdmin(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    
    if (userDoc.exists && userDoc.data()?.role === "admin") {
      return true;
    }
  } catch (error) {
    console.error("Error verifying admin:", error);
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const isAdminUser = await isAdmin(request);
    if (!isAdminUser) {
      return NextResponse.json({ error: "No autorizado. Solo los administradores pueden crear usuarios." }, { status: 403 });
    }

    const { email, password, name, phone, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const phoneNormalized =
      typeof phone === "string" ? phone.trim() : "";

    // Validar rol (solo "barber" o "admin")
    const rolValido = role === "admin" ? "admin" : "barber";

    const emailNormalized = email.trim().toLowerCase();

    // 1. Crear usuario en Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: emailNormalized,
      password,
      displayName: name,
    });

    // 2. Crear documento de usuario en Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      email: emailNormalized,
      name,
      phone: phoneNormalized,
      role: rolValido,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Crear cuenta bancaria inicial en Firestore
    await adminDb.collection("bank").doc(userRecord.uid).set({
      userId: userRecord.uid,
      userName: name,
      balance: 0,
      totalEarned: 0,
      totalPaid: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name,
        role: rolValido
      }
    });

  } catch (error: unknown) {
    console.error("Error al crear barbero:", error);
    return NextResponse.json(
      { error: toSpanishUserMessage(error, "Error al crear el usuario") },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const isAdminUser = await isAdmin(request);
    if (!isAdminUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: "Falta el ID del usuario" }, { status: 400 });
    }

    // 1. Delete from Firebase Auth
    await adminAuth.deleteUser(uid);

    // 2. Delete main Firestore docs
    await adminDb.collection("users").doc(uid).delete();
    await adminDb.collection("bank").doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error al eliminar barbero:", error);
    return NextResponse.json({ error: "Error al eliminar el usuario" }, { status: 500 });
  }
}
