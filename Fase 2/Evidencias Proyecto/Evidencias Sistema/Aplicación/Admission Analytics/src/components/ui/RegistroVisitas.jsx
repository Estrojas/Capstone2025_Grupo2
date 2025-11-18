import React, { useState, useEffect } from "react";

const RegistroVisitas = ({ isOpen, onClose, onSuccess }) => {
    const [busquedaColegio, setBusquedaColegio] = useState("");
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [colegios, setColegios] = useState([]); 
    const [colegiosFiltrados, setColegiosFiltrados] = useState([]); 
    
    const [formData, setFormData] = useState({
        colegio_rbd: "",
        colegio_nombre: "",
        colegio_comuna: "",
        fecha_visita: "",
        inscritos: "",
        nom_comuna: "",
        region: ""
    });

    const [errors, setErrors] = useState({});

    // Cargar todos los colegios al abrir el modal
    useEffect(() => {
        if (isOpen) {
            fetchColegios();
        }
    }, [isOpen]);

    // Filtrar colegios según búsqueda - AGREGAR VALIDACIÓN
    useEffect(() => {
        try {
            // Asegurarse de que colegios sea un array válido
            if (!Array.isArray(colegios)) {
                console.log("Colegios no es un array válido");
                setColegiosFiltrados([]);
                setMostrarSugerencias(false);
                return;
            }

            if (busquedaColegio.length >= 2) {
                const filtrados = colegios.filter(c => {
                    // Validar que el objeto colegio tenga las propiedades necesarias
                    if (!c || !c.NOM_RBD) return false;
                    
                    const nombreMatch = c.NOM_RBD.toLowerCase().includes(busquedaColegio.toLowerCase());
                    const rbdMatch = c.RBD ? c.RBD.toString().includes(busquedaColegio) : false;
                    
                    return nombreMatch || rbdMatch;
                });
                
                setColegiosFiltrados(filtrados.slice(0, 10));
                setMostrarSugerencias(true);
            } else {
                setColegiosFiltrados([]);
                setMostrarSugerencias(false);
            }
        } catch (error) {
            console.error("Error al filtrar colegios:", error);
            setColegiosFiltrados([]);
            setMostrarSugerencias(false);
        }
    }, [busquedaColegio, colegios]);

    const fetchColegios = async () => {
        try {
            const response = await fetch("https://api-fastapi-128706908211.southamerica-west1.run.app/colegiosAll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            });

            if (!response.ok) throw new Error("Error al cargar colegios");

            const data = await response.json();
            setColegios(data.colegios || []);
        } catch (error) {
            console.error("Error al cargar colegios:", error);
        }
    };

    const handleSelectColegio = (colegio) => {
        setFormData({
            ...formData,
            colegio_rbd: colegio.RBD,
            colegio_nombre: colegio.NOM_RBD,
            colegio_comuna: colegio.COD_COM || "",
            nom_comuna: colegio.NOM_COM || "",
            region: colegio.COD_REG || ""
        });
        setBusquedaColegio(colegio.NOM_RBD);
        setMostrarSugerencias(false);
        setErrors({ ...errors, colegio_rbd: "" });
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

    const handleBusquedaColegioChange = (e) => {
        const value = e.target.value;
        setBusquedaColegio(value);
        
        // Si se borra la búsqueda, limpiar el colegio seleccionado
        if (value === "") {
            setFormData({
                ...formData,
                colegio_rbd: "",
                colegio_nombre: ""
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};
    
        if (!formData.colegio_rbd) {
            newErrors.colegio_rbd = "Debe seleccionar un colegio";
        }
    
        if (!formData.fecha_visita) {
            newErrors.fecha_visita = "La fecha de visita es obligatoria";
        } else {
            const fechaVisita = new Date(formData.fecha_visita);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
            
            if (fechaVisita > hoy) {
                newErrors.fecha_visita = "La fecha de visita no puede ser mayor a hoy";
            }
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
            const response = await fetch("https://visitas-128706908211.southamerica-west1.run.app", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rbd: formData.colegio_rbd,
                    nombre_colegio: formData.colegio_nombre,
                    comuna: formData.colegio_comuna,
                    fecha_visita: new Date(formData.fecha_visita).toISOString(),
                    inscritos: parseInt(formData.inscritos),
                    nom_com: formData.nom_comuna,
                    region: formData.region
                    
                })
            });
    
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.error || "Error al guardar visita");
            }
    
            console.log("✅ Visita guardada exitosamente:", data);
    
            // Llamar a onSuccess para actualizar la lista
            if (onSuccess) {
                onSuccess();
            }
    
            // Cerrar modal y resetear formulario
            handleClose();
        } catch (error) {
            console.error("Error al guardar visita:", error);
            alert(`Error al guardar la visita: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            colegio_rbd: "",
            colegio_nombre: "",
            fecha_visita: "",
            inscritos: ""
        });
        setBusquedaColegio("");
        setErrors({});
        setMostrarSugerencias(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div 
                className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 my-8 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        Registrar Visita a Colegio
                    </h2>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="px-6 py-4">
                    {/* Búsqueda de Colegio */}
                    <div className="mb-4 relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Colegio <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={busquedaColegio}
                            onChange={handleBusquedaColegioChange}
                            onFocus={() => busquedaColegio.length >= 2 && setMostrarSugerencias(true)}
                            placeholder="Buscar por nombre o RBD..."
                            className={`w-full px-3 py-2 border ${
                                errors.colegio_rbd ? "border-red-500" : "border-gray-300"
                            } rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        />
                        {errors.colegio_rbd && (
                            <p className="text-red-500 text-xs mt-1">{errors.colegio_rbd}</p>
                        )}

                        {/* Sugerencias de colegios */}
                        {mostrarSugerencias && colegiosFiltrados.length > 0 && (
                            <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {colegiosFiltrados.map((colegio) => (
                                    <div
                                        key={colegio.RBD}
                                        onClick={() => handleSelectColegio(colegio)}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                                    >
                                        <div className="font-medium text-gray-900">
                                            {colegio.NOM_RBD}
                                        </div>
                                        <div className="text-xs text-gray-500 flex gap-2">
                                            <span>RBD: {colegio.RBD}</span>
                                            {colegio.NOM_COM && (
                                                <>
                                                    <span>•</span>
                                                    <span>{colegio.NOM_COM}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {mostrarSugerencias && busquedaColegio.length >= 2 && colegiosFiltrados.length === 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500 text-sm">
                                No se encontraron colegios
                            </div>
                        )}

                        {formData.colegio_rbd && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-md">
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Seleccionado:</span>{" "}
                                    {formData.colegio_nombre}
                                </p>
                                <p className="text-xs text-gray-500">RBD: {formData.colegio_rbd}</p>
                            </div>
                        )}
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
                            className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Guardando..." : "Registrar Visita"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistroVisitas;