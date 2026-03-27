import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

// Load env vars
const envFile = fs.readFileSync(".env.local", "utf8");
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
});

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

async function createAdmin() {
  const email = "juan9182morales@gmail.com"; // Added @gmail.com since firebase requires a valid email
  const password = "Jamd-1707";
  const name = "Juan";

  try {
    console.log(`Creando usuario ${email}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log(`Usuario creado exitosamente con UID: ${user.uid}`);

    console.log("Asignando rol de 'admin' en Firestore...");
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      role: "admin",
      createdAt: new Date().toISOString()
    });
    console.log("Usuario guardado en Firestore correctamente.");
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
        console.log("El usuario ya existe. Intentando actualizar el rol a admin.");
        // We can't log in to update without credentials if we don't know the UID,
        // but if it exists, let's just ask the user or authenticate
    }
    console.error("Error completo:", error);
    process.exit(1);
  }
}

createAdmin();
