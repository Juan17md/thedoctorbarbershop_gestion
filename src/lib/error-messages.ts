/**
 * Convierte errores técnicos (p. ej. Firebase en inglés) en mensajes legibles en español para el usuario.
 */

const DEFAULT_ERROR =
  "Ha ocurrido un error. Inténtalo de nuevo o más tarde.";

const FIREBASE_CODE_TO_ES: Record<string, string> = {
  "auth/email-already-exists":
    "Este correo electrónico ya está registrado.",
  "auth/email-already-in-use":
    "Este correo electrónico ya está registrado.",
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/invalid-password": "La contraseña no es válida.",
  "auth/weak-password":
    "La contraseña es demasiado débil. Usa al menos 6 caracteres.",
  "auth/user-not-found": "No se encontró el usuario.",
  "auth/user-disabled": "Esta cuenta está deshabilitada.",
  "auth/operation-not-allowed": "Esta operación no está permitida.",
  "auth/too-many-requests":
    "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  "auth/network-request-failed":
    "Error de red. Comprueba tu conexión.",
  "auth/internal-error":
    "Error interno del servicio. Inténtalo más tarde.",
  "auth/invalid-credential": "Credenciales incorrectas.",
  "auth/wrong-password": "Contraseña incorrecta.",
};

function extractCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const o = error as Record<string, unknown>;
  if (typeof o.code === "string") return o.code;
  const info = o.errorInfo;
  if (info && typeof info === "object" && "code" in info) {
    const c = (info as { code?: string }).code;
    if (typeof c === "string") return c;
  }
  return undefined;
}

function translateEnglishMessage(message: string): string | null {
  const m = message.toLowerCase();

  if (
    m.includes("email") &&
    (m.includes("already") || m.includes("exist") || m.includes("in use"))
  ) {
    return "Este correo electrónico ya está registrado.";
  }
  if (m.includes("password") && (m.includes("least") || m.includes("6"))) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (m.includes("invalid email") || m.includes("malformed")) {
    return "El correo electrónico no es válido.";
  }
  if (m.includes("network") || m.includes("fetch failed")) {
    return "Error de red. Comprueba tu conexión.";
  }
  if (m.includes("permission") || m.includes("denied")) {
    return "No tienes permiso para realizar esta acción.";
  }

  return null;
}

function looksLikeSpanish(text: string): boolean {
  if (/[áéíóúñ¿¡]/.test(text)) return true;
  return /\b(no|error|sesión|correo|usuario|válid|autoriz|faltan|eliminar|crear|perfil|retiro|contraseña|campos)\b/i.test(
    text
  );
}

/**
 * Mensaje seguro en español para toasts o UI.
 * Respeta mensajes que ya vienen en español (p. ej. desde la API).
 */
export function toSpanishUserMessage(error: unknown, fallback = DEFAULT_ERROR): string {
  const code = extractCode(error);
  if (code && FIREBASE_CODE_TO_ES[code]) {
    return FIREBASE_CODE_TO_ES[code];
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!message) return fallback;

  const fromPatterns = translateEnglishMessage(message);
  if (fromPatterns) return fromPatterns;

  if (looksLikeSpanish(message)) return message;

  return fallback;
}
