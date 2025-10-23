import { useState } from "react";

export default function DeleteUserButton({ userId, onDeleted }) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        // Confirmación de seguridad
        if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (!res.ok) {
                const error = await res.json();
                alert("Error al eliminar: " + error?.message);
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

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
            {loading ? "Eliminando..." : "Eliminar"}
        </button>
    );
}