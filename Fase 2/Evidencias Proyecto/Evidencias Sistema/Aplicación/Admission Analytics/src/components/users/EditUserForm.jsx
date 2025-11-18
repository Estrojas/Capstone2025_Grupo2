import { useState, useEffect } from "react";
import { navigate } from "astro:transitions/client"; 
import ChangePasswordModal from "./ChangePasswordModal";

/**
 * Formulario de edición de usuario
 * @param {object} props - Propiedades del componente
 * @param {object} props.userData - Datos completos del usuario obtenidos desde el servidor
 * @param {Array<{campus_id: (string|number), campus_name: string}>} props.campusList - Lista de campus
 * @param {Array<{area_id: (string|number), area_name: string}>} props.areaList - Lista de áreas
 */


// Estados iniciales del formulario
function initializeFormData(data) {
    return {
        names: data?.names || "",
        last_name_1: data?.last_name_1 || "",
        last_name_2: data?.last_name_2 || "",
        status: data?.status || "active",
        area_id: String(data?.area_id || ""), 
        campus_id: String(data?.campus_id || ""), 
    };
}


export default function EditUserForm(props) {
    const { userData, campusList, areaList } = props;
    const [formData, setFormData] = useState(initializeFormData(userData));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [showPassModal, setShowPassModal] = useState(false);

    // Normalización y validación de nombres
    const Name_Max = 60;
    // Permite letras Unicode, marcas combinadas, espacios y apóstrofe
    const Name_Regex = /^[\p{L}\p{M} ']{2,60}$/u;

    const Norm_Name = (s) => (s ?? "")
            .toString()
            .normalize("NFC")
            // deja solo letras, espacios y apóstrofe
            .replace(/[^\p{L}\p{M} ']/gu, "")
            // colapsa espacios múltiples a uno solo
            .replace(/ {2,}/g, " ")
            .trim()
            .slice(0, Name_Max);

    // Carga de datos iniciales
    useEffect(() => {
        if (userData && !isSubmitting) {
            setFormData(initializeFormData(userData));
        }
    }, [userData]); 

    // Maneja cambios en los inputs
    function handleChange(e) { 
        const { name, value } = e.target;
        if (name === "names" || name === "last_name_1" || name === "last_name_2") {
            setFormData((prev) => ({ ...prev, [name]: Norm_Name(value) }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
        setMessage("");
        }

    // Enviar datos actualizados 
    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("Actualizando usuario...");
        setIsSubmitting(true); 

        if(!userData?.user_id){
            setMessage("Error: ID de usuario no disponible.");
            setIsSubmitting(false);
            return;
        }

        if (!Name_Regex.test(formData.names)) {
            setMessage("Error: Nombre inválido.");
            setIsSubmitting(false);
            return;
        }
        
        if (!Name_Regex.test(formData.last_name_1)) {
            setMessage("Error: Apellido paterno inválido.");
            setIsSubmitting(false);
            return;
        }

        if (!Name_Regex.test(formData.last_name_2)) {
            setMessage("Error: Apellido materno inválido.");
            setIsSubmitting(false);
            return;
        }

        try {
            const payload = {
                user_id: userData.user_id,
                names: formData.names,
                last_name_1: formData.last_name_1,
                last_name_2: formData.last_name_2,
                status: formData.status,
                // Conversión a Number/Null
                area_id: formData.area_id !== "" ? Number(formData.area_id) : null,
                campus_id: formData.campus_id !== "" ? Number(formData.campus_id) : null,
            };

            const response = await fetch(`/api/users/${userData.user_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error("PUT error:", result);
                const errorMsg = result?.errors ? "Error de validación: Revise los campos." : (result?.message || result?.error || "Desconocido");
                setMessage(`Error al actualizar: ${errorMsg}`);
            } else {
                setMessage("Usuario actualizado correctamente.");
            }
        } catch (error) {
            console.error("Error al conectar:",error);
            setMessage("Error al conectar con el servidor.");
        }finally{
            setIsSubmitting(false);
        }
    }

    if (!userData)
        return <p className="text-center text-gray-500">Cargando datos iniciales...</p>;


    return (
        <div className="max-w-3xl mx-auto mt-8">
            <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-2x4 sm:p-8 w-lg mx-auto mt-8">
            {/* Nombre */}
                <div className="mb-4">
                    <label htmlFor="names" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre 
                    </label>
                    <input id="names" type="text" name="names" value={formData.names} onChange={handleChange} required
                            maxLength={60} pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü '’]{2,60}"
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                </div>

                {/* Apellido Paterno */}
                <div className="mb-4">
                    <label htmlFor="last_name_1" className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido Paterno 
                    </label>
                    <input id="last_name_1" type="text" name="last_name_1" value={formData.last_name_1} onChange={handleChange} required
                            maxLength={60} pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü '’]{2,60}"
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                </div>

                {/* Apellido Materno */}
                <div className="mb-4">
                    <label htmlFor="last_name_2" className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido Materno
                    </label>
                    <input id="last_name_2" type="text" name="last_name_2" value={formData.last_name_2} onChange={handleChange}
                            maxLength={60} pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü '’]{2,60}"
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                </div>

                {/* Estado */}
                <div className="mb-4">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Estado 
                    </label>
                    <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                    >
                    <option value="">Seleccione un estado...</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    {/* Agrega más opciones si hay, ej. "suspendido" */}
                    </select>
                </div>
                
                {/* Área */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                    <select
                        name="area_id"
                        value={formData.area_id}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-xl"
                    >
                        <option value="">Sin área</option>
                        {areaList.map((a) => (
                            <option key={a.area_id} value={a.area_id}>{a.area_name}</option>
                        ))}
                    </select>
                </div>

                {/* Campus */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                    <select
                        name="campus_id"
                        value={formData.campus_id}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-xl"
                    >
                        <option value="">Sin campus</option>
                        {campusList.map((c) => (
                            <option key={c.campus_id} value={c.campus_id}>{c.campus_name}</option>
                        ))}
                    </select>
                </div>

                {/* Contenedor de botones */}
                <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 mt-6">
                    <button
                        type="button"
                        onClick={() => { navigate('/'); }}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-colors focus:ring-2 focus:ring-gray-500 focus:outline-none border border-gray-300"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowPassModal(true)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        Cambiar contraseña
                    </button>


                    <button
                        type="submit"
                        disabled={isSubmitting} 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors focus:ring-2 focus:ring-green-500 focus:outline-none"
                    >
                        {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>

                {message && <p className={`mt-3 text-center text-sm font-medium ${message.startsWith('!!!') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
            </form>

            <ChangePasswordModal
                open={showPassModal}
                onClose={() => setShowPassModal(false)}
            />
        </div>
    );
}