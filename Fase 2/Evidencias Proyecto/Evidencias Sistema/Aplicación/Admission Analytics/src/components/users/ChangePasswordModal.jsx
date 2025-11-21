import { useState } from "react";

export default function ChangePasswordModal({ open, onClose, userId }) {
    // si no está abierto, no renderizamos nada
    if (!open) return null;

    const [newPassword, setNewPassword] = useState(""); // nueva contraseña
    const [confirmPassword, setConfirmPassword] = useState(""); // confirmación
    const [isSubmitting, setIsSubmitting] = useState(false); // estado de envío
    const [message, setMessage] = useState(""); // mensaje de estado
    const [status, setStatus] = useState("idle"); // estado de éxito/error

    async function handleSubmit(e) {
        e.preventDefault(); // prevenimos el envío por defecto

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
            setStatus("idle");
            setMessage("Actualizando contraseña...");

            const payload = { password: newPassword };

            // si viene userId, lo mandamos para cambiar la contraseña de este usuario
            if (userId) {
                payload.user_id = userId;
            }

            const res = await fetch("/api/auth/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data?.ok) {
                const msg = data?.message || "No se pudo cambiar la contraseña.";
                setStatus("error");
                setMessage(`Error al cambiar contraseña: ${msg}`);
                return;
            }

            // estados de exito
            setStatus("success");
            setMessage("Contraseña actualizada correctamente.");

            // limpiamos y cerramos
            setNewPassword("");
            setConfirmPassword("");
            setTimeout(() => { handleClose() }, 10); // cerramos después de un breve retraso

        } catch (err) {
            console.error("Error al cambiar contraseña:", err);
            setStatus("error");
            setMessage("Error al conectar con el servidor.");

        } finally {
            setIsSubmitting(false);
        }
    }

    function handleClose() {
        // opcional, reset local al cerrar manualmente
        setNewPassword("");
        setConfirmPassword("");
        setMessage("");
        setStatus("idle");
        onClose?.();
    }

    const messageColor =
        status === "success" ? "text-green-600" :
        status === "error" ? "text-red-600" :
        "text-black";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            {/* Caja del modal */}
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Cambiar contraseña</h2>
                    <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"/>
                    </div>

                    {/* Mensaje del estado */}
                    {message && (<p className={`text-sm text-center ${messageColor}`}>{message}</p>)}

                    <div className="flex gap-3 mt-2">
                        <button type="button" onClick={handleClose}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg border border-gray-300">
                            Cancelar
                        </button>

                        <button type="submit" disabled={isSubmitting}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-2 px-4 rounded-lg">
                            {isSubmitting ? "Actualizando..." : "Confirmar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
