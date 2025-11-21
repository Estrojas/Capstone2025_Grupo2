import { useState } from "react";

export default function DeleteUserButton({ userId, onDeleted }) {
    const [loading, setLoading] = useState(false); // estado de carga

    const handleDelete = async () => {
        // Confirmación de seguridad
        if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
        if (loading) return; // prevenir múltiples clicks

        setLoading(true);

        try {
            const res = await fetch(`/api/users/${userId}`, { method: "DELETE", });
            const data = await res.json();

            if (!res.ok) {
                alert("Error al eliminar: " + data?.message);
                return;
            }

            alert("Usuario eliminado correctamente");
            if (onDeleted) onDeleted(); // refresca lista en el padre
            
        } catch (error) {
            alert("Error al conectar al servidor. Verifique la conexión.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // clases condicionales para el botón
    const baseClasses = "px-3 py-1 rounded text-white transition-colors";
    const enabledClasses = "bg-red-900 hover:bg-red-600 cursor-pointer";
    const loadingClasses = "bg-red-700 cursor-wait opacity-75";

    return (
        <button onClick={handleDelete} className={`${baseClasses} ${loading ? loadingClasses : enabledClasses}`}>
            {loading ? "Eliminando..." : "Eliminar"}
        </button>
    );
}