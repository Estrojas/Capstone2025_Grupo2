import React, { useState, useEffect } from "react";

const EditarVisita = ({ isOpen, onClose, onSuccess, visitaId }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [visitaData, setVisitaData] = useState(null);
    const [formData, setFormData] = useState({
        fecha_visita: "",
        inscritos: ""
    });

    const [errors, setErrors] = useState({});

    // Cargar datos de la visita cuando se abre el modal
    useEffect(() => {
        
        if (isOpen && visitaId) {
            fetchVisitaData();
        }
    }, [isOpen, visitaId]);

    const fetchVisitaData = async () => {
        
        setIsLoading(true);
        try {
            const response = await fetch(`/api/visitas/get/${visitaId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) throw new Error("Error al cargar datos de la visita");

            const data = await response.json();

            setVisitaData(data.visita);
            
            // Formatear fecha para el input date (YYYY-MM-DD)
            const fechaISO = new Date(data.visita.fecha_visita).toISOString().split('T')[0];
            
            setFormData({
                fecha_visita: fechaISO,
                inscritos: data.visita.inscritos
            });
        } catch (error) {
            console.error("Error al cargar visita:", error);
            alert("Error al cargar los datos de la visita");
            handleClose();
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        // Limpiar error del campo
        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fecha_visita) {
            newErrors.fecha_visita = "La fecha de visita es obligatoria";
        }

        if (!formData.inscritos || formData.inscritos < 0) {
            newErrors.inscritos = "El número de inscritos debe ser mayor o igual a 0";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`https://update-visitas-128706908211.southamerica-west1.run.app`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: visitaId,
                    fecha_visita: new Date(formData.fecha_visita).toISOString(),
                    inscritos: parseInt(formData.inscritos)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al actualizar visita");
            }

            

            // Llamar a onSuccess para actualizar la lista
            if (onSuccess) {
                onSuccess();
            }

            // Cerrar modal y resetear formulario
            handleClose();
        } catch (error) {
            console.error("❌ Error al actualizar visita:", error);
            alert(`Error al actualizar la visita: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            fecha_visita: "",
            inscritos: ""
        });
        setVisitaData(null);
        setErrors({});
        setIsLoading(true);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        Editar Visita a Colegio
                    </h2>
                </div>

                {/* Body */}
                {isLoading ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                        Cargando datos...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="px-6 py-4">
                        {/* Información del Colegio (No editable) */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Colegio
                            </label>
                            <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
                                <div className="font-medium text-gray-900">
                                    {visitaData?.nom_col}
                                </div>
                                <div className="text-xs text-gray-500 flex gap-2 mt-1">
                                    <span>RBD: {visitaData?.rbd}</span>
                                    {visitaData?.nom_com && (
                                        <>
                                            <span>•</span>
                                            <span>{visitaData.nom_com}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                El colegio no puede ser modificado
                            </p>
                        </div>

                        {/* Fecha de Visita */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha de Visita <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="fecha_visita"
                                value={formData.fecha_visita}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border ${
                                    errors.fecha_visita ? "border-red-500" : "border-gray-300"
                                } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                            />
                            {errors.fecha_visita && (
                                <p className="text-red-500 text-xs mt-1">{errors.fecha_visita}</p>
                            )}
                        </div>

                        {/* Inscritos */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número de Inscritos <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="inscritos"
                                value={formData.inscritos}
                                onChange={handleInputChange}
                                min="0"
                                placeholder="Ej: 25"
                                className={`w-full px-3 py-2 border ${
                                    errors.inscritos ? "border-red-500" : "border-gray-300"
                                } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                            />
                            {errors.inscritos && (
                                <p className="text-red-500 text-xs mt-1">{errors.inscritos}</p>
                            )}
                        </div>

                        {/* Footer con botones */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EditarVisita;