import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import readline from "readline/promises";

// Cargar variables de entorno desde .env.local si existe
if (fs.existsSync(".env.local")) {
  const envFile = fs.readFileSync(".env.local", "utf8");
  envFile.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\n--- Configuración de Nuevo Administrador ---");

  try {
    const name = await rl.question("Ingrese el Nombre: ");
    const email = await rl.question("Ingrese el Correo Electrónico: ");
    const password = await rl.question("Ingrese la Contraseña: ");

    if (!name || !email || !password) {
      console.error("\nError: Todos los campos son obligatorios.");
      process.exit(1);
    }

    console.log(`\nIniciando creación de usuario ${email}...`);
    
    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log(`Usuario creado exitosamente con UID: ${user.uid}`);

    console.log("Asignando rol de 'admin' en Firestore...");
    
    // Guardar datos en la colección 'users'
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      role: "admin",
      createdAt: new Date().toISOString()
    });

    console.log("\n✅ ¡Éxito! El usuario ha sido creado y su rol 'admin' ha sido asignado correctamente.");
    rl.close();
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Error durante el proceso:");
    if (error.code === 'auth/email-already-in-use') {
      console.error("El correo ya está registrado en Firebase.");
    } else if (error.code === 'auth/invalid-email') {
      console.error("El formato del correo electrónico no es válido.");
    } else if (error.code === 'auth/weak-password') {
      console.error("La contraseña es muy débil (mínimo 6 caracteres).");
    } else {
      console.error("Mensaje de error:", error.message);
    }
    rl.close();
    process.exit(1);
  }
}

main();
