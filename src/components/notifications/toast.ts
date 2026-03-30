import { toast as sonnerToast } from "sonner";

/** Mensajes reutilizables alineados con el panel (perfil, banca, usuarios). */
export const toastMessages = {
  profileUpdated: "Perfil actualizado",
  profileSaveError: "No se pudo guardar el perfil",
  insufficientBalance: "No tienes suficiente saldo",
  withdrawalError: "No se pudo procesar el retiro",
  withdrawalSuccess: "Retiro realizado exitosamente",
  userDeleted: "Usuario eliminado correctamente",
  deleteUserError: "Error al eliminar el usuario",
  newBarberSuccess: "Usuario creado exitosamente",
  createUserError: "Error al crear el usuario",
  fillAllFields: "Completa todos los campos",
  passwordMinLength: "La contraseña debe tener al menos 6 caracteres",
  notAuthenticated: "Sesión no válida. Vuelve a iniciar sesión.",
} as const;

export { toSpanishUserMessage } from "@/lib/error-messages";

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  warning: (message: string) => sonnerToast.warning(message),
  info: (message: string) => sonnerToast.info(message),
  message: sonnerToast.message,
  promise: sonnerToast.promise,
};
