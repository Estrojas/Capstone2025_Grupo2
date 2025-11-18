import { useState } from "react";

export default function ChangePasswordModal({ open, onClose }) {
    // si no está abierto, no renderizamos nada
    if (!open) return null;

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();

        // validaciones básicas
        if (newPassword.length < 6) {
        setMessage("La contraseña debe tener al menos 6 caracteres.");
        return;
        }

        if (newPassword !== confirmPassword) {
        setMessage("Las contraseñas no coinciden.");
        return;
        }

        try {
            setIsSubmitting(true);
            setMessage("Actualizando contraseña...");

            const res = await fetch("/api/auth/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPassword }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data?.ok) {
                const msg = data?.message || "No se pudo cambiar la contraseña.";
                setMessage(`Error al cambiar contraseña: ${msg}`);
                return;
            }

            setStatus("success");
            setMessage("Contraseña actualizada correctamente.");

            // limpiamos y cerramos después de un pequeño tiempo, o al tiro
            setNewPassword("");
            setConfirmPassword("");

            // si quieres que se cierre inmediatamente:
            // onClose?.();
            setTimeout(() =>  handleClose(), 10);

        } catch (err) {
            console.error("Error al cambiar contraseña:", err);
            setMessage("Error al conectar con el servidor.");
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleClose() {
        // opcional: reset local al cerrar manualmente
        setNewPassword("");
        setConfirmPassword("");
        setMessage("");
        onClose?.();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        {/* Caja del modal */}
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
                Cambiar contraseña
            </h2>
            <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
            >
                ✕
            </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
                </label>
                <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                minLength={6}
                required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
                </label>
                <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                minLength={6}
                required
                />
            </div>

            {message && (
                <p className="text-sm text-center text-gray-700">{message}</p>
            )}

            <div className="flex gap-3 mt-2">
                <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg border border-gray-300"
                >
                Cancelar
                </button>
                <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2 px-4 rounded-lg"
                >
                {isSubmitting ? "Actualizando..." : "Confirmar"}
                </button>
            </div>
            </form>
        </div>
        </div>
  );
}
