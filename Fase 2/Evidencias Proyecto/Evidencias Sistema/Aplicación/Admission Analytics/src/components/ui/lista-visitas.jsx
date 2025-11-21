import React, { useEffect, useState } from "react";
import RegistroVisitas from "./RegistroVisitas";
import EditarVisita from './EditarVisita';

// Estado por defecto de filtros
const initialFiltersState = {
    colegio: "",
    region: "",
    comuna: "",
    date_from: "",
    date_to: "",
};

// Lista de regiones de Chile
const regiones = [
    { cod_region: 15, nombre: "Arica y Parinacota" },
    { cod_region: 1, nombre: "Tarapacá" },
    { cod_region: 2, nombre: "Antofagasta" },
    { cod_region: 3, nombre: "Atacama" },
    { cod_region: 4, nombre: "Coquimbo" },
    { cod_region: 5, nombre: "Valparaíso" },
    { cod_region: 13, nombre: "Metropolitana" },
    { cod_region: 6, nombre: "O'Higgins" },
    { cod_region: 7, nombre: "Maule" },
    { cod_region: 16, nombre: "Ñuble" },
    { cod_region: 8, nombre: "Biobío" },
    { cod_region: 9, nombre: "La Araucanía" },
    { cod_region: 14, nombre: "Los Ríos" },
    { cod_region: 10, nombre: "Los Lagos" },
    { cod_region: 11, nombre: "Aysén" },
    { cod_region: 12, nombre: "Magallanes" }
];

export default function ListaVisitas() {
    const [visitas, setVisitas] = useState([]);
    const [colegios, setColegios] = useState([]);
    const [comunas, setComunas] = useState([]);
    const [filters, setFilters] = useState(initialFiltersState);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [totalVisitas, setTotalVisitas] = useState(0);
    const [openRowId, setOpenRowId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [visitaToEdit, setVisitaToEdit] = useState(null);


    // Cargar colegios para filtro cuando cambian región o comuna
    useEffect(() => {
        async function fetchColegios() {
            try {
                const body = {};
                
                if (filters.region) body.cod_region = parseInt(filters.region);
                if (filters.comuna) body.cod_com = parseInt(filters.comuna);

                const response = await fetch("https://api-fastapi-128706908211.southamerica-west1.run.app/colegios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });

                if (!response.ok) throw new Error("Error al cargar colegios");

                const data = await response.json();
                setColegios(data.colegios || []);
            } catch (error) {
                console.error("Error al cargar colegios:", error);
                setColegios([]);
            }
        }
        
        fetchColegios();
    }, [filters.region, filters.comuna]);

    // Cargar comunas cuando cambia la región
    useEffect(() => {
        async function fetchComunas() {
            if (!filters.region) {
                setComunas([]);
                return;
            }

            try {
                const response = await fetch("https://api-fastapi-128706908211.southamerica-west1.run.app/comunas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cod_region: parseInt(filters.region) })
                });

                if (!response.ok) throw new Error("Error al cargar comunas");

                const data = await response.json();
                setComunas(data.comunas || []);
            } catch (error) {
                console.error("Error al buscar comunas:", error);
                setComunas([]);
            }
        }

        fetchComunas();
    }, [filters.region]);

    // Función reutilizable para traer visitas
    const fetchVisitas = async (pageNum = 1, appliedFilters) => {
        const currentFilters = appliedFilters ?? filters;

        setIsLoading(true);
        setOpenRowId(null);

        try {
            const response = await fetch("/api/visitas/list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    RBD: currentFilters.colegio || null,
                    region: currentFilters.region || null,
                    comuna: currentFilters.comuna || null,
                    date_from: currentFilters.date_from || null,
                    date_to: currentFilters.date_to || null,
                    page: pageNum,
                    limit: 10
                })
            });

            if (!response.ok) {
                console.error("[VisitasViewer] Respuesta HTTP no OK:", response.status, response.statusText);
                throw new Error("Error al obtener visitas");
            }

            const data = await response.json();
            

            setVisitas(data.visitas || []);
            setTotalPages(data.totalPages || 1);
            setPage(pageNum);
            setTotalVisitas(data.totalVisitas || 0);
        } catch (err) {
            console.error("[VisitasViewer] Error al obtener visitas:", err);
            setVisitas([]);
            setTotalPages(1);
            setTotalVisitas(0);
            alert("Error al cargar las visitas. Por favor intente nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    // Cargar primera página sin filtros al montar
    useEffect(() => {
        fetchVisitas(1, initialFiltersState);
    }, []);

    // Manejadores de UI
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        
        if (name === "region") {
            setFilters((prev) => ({ 
                ...prev, 
                [name]: value.trim ? value.trim() : value,
                comuna: "",
                colegio: ""
            }));
        } 
        else if (name === "comuna") {
            setFilters((prev) => ({ 
                ...prev, 
                [name]: value.trim ? value.trim() : value,
                colegio: ""
            }));
        } 
        else {
            setFilters((prev) => ({ ...prev, [name]: value.trim ? value.trim() : value }));
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchVisitas(1);
    };

    const handleResetDates = () => {
        const newFilters = { ...filters, date_from: "", date_to: "" };
        setFilters(newFilters);
        fetchVisitas(1, newFilters);
    };

    const handleResetAll = () => {
        setFilters(initialFiltersState);
        fetchVisitas(1, initialFiltersState);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchVisitas(newPage);
        }
    };

    const handleRowClick = (visitaId) => {
        setOpenRowId((prev) => (prev === visitaId ? null : visitaId));
    };

    const handleAddVisita = () => {
        setIsModalOpen(true);
    };
    const handleModalClose = () => {
        setIsModalOpen(false);
    };
    
    const handleVisitaSuccess = () => {
        // Recargar la lista de visitas
        fetchVisitas(1);
    };
    const handleEditVisita = (visitaId) => {
        setVisitaToEdit(visitaId);
        setIsEditModalOpen(true);
    };
    const handleEditModalClose = () => {
        setIsEditModalOpen(false);
        setVisitaToEdit(null);
    };
    const handleEditSuccess = () => {
        fetchVisitas(page);
    };

    // Render de detalles seguros
    const renderDetails = (details) => {
        if (!details || Object.keys(details).length === 0) {
            return <p className="text-gray-500 text-sm">No hay detalles adicionales para este registro.</p>;
        }
        return (
            <pre className="bg-gray-800 text-white p-4 rounded-md text-sm overflow-x-auto">
                {JSON.stringify(details, null, 2)}
            </pre>
        );
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Registros de Visitas a Establecimientos</h1>
                <button
                    onClick={handleAddVisita}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    ✚ Agregar Visita a Colegio
                </button>
            </div>

            {/* Filtros */}
            <form onSubmit={handleSearch} className="mb-6 pb-4 border-b">
                {/* Primera fila: Región, Comuna, Colegio */}
                <div className="flex flex-wrap gap-4 items-end mb-4">
                    {/* Región */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700">Región</label>
                        <select
                            name="region"
                            value={filters.region}
                            onChange={handleFilterChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="">Todas</option>
                            {regiones.map((r) => (
                                <option key={r.cod_region} value={r.cod_region}>
                                    {r.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Comuna */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700">Comuna</label>
                        <select
                            name="comuna"
                            value={filters.comuna}
                            onChange={handleFilterChange}
                            disabled={!filters.region || comunas.length === 0}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">
                                {!filters.region ? "Seleccione región primero" : "Todas"}
                            </option>
                            {comunas.map((c) => (
                                <option key={c.COD_COM} value={c.COD_COM}>
                                    {c.NOM_COM}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Colegio */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700">Colegio</label>
                        <select
                            name="colegio"
                            value={filters.colegio}
                            onChange={handleFilterChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="">Todos</option>
                            {colegios.map((c) => (
                                <option key={c.RBD} value={c.RBD}>
                                    {c.NOM_RBD}
                                </option>
                            ))}
                        </select>
                        {colegios.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {colegios.length} colegio(s) disponible(s)
                            </p>
                        )}
                    </div>
                </div>

                {/* Segunda fila: Fechas y Acciones */}
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Desde */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Desde</label>
                        <input
                            type="date"
                            name="date_from"
                            value={filters.date_from}
                            onChange={handleFilterChange}
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                    </div>

                    {/* Hasta */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hasta</label>
                        <input
                            type="date"
                            name="date_to"
                            value={filters.date_to}
                            onChange={handleFilterChange}
                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                    </div>

                    {/* Acciones */}
                    <div className="flex items-end gap-2 ml-auto">
                        <button
                            type="button"
                            onClick={handleResetDates}
                            title="Restablecer fechas"
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm"
                        >
                            Limpiar Fechas
                        </button>
                        <button
                            type="button"
                            onClick={handleResetAll}
                            title="Restablecer todos los filtros"
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm"
                        >
                            Limpiar Todo
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
                        >
                            Buscar
                        </button>
                    </div>
                </div>
            </form>

            {/* Tabla */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Fecha de Visita
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Colegio
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Inscritos
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <td colSpan={3} className="text-center py-6">
                                <div className="flex justify-center items-center space-x-3">
                                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-gray-600 text-sm">Cargando...</span>
                                </div>
                            </td>
                        ) : visitas.length > 0 ? (
                            visitas.map((visita) => (
                                <tr
                                    key={visita.id_visita}
                                    className="hover:bg-gray-100"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(visita.fecha_visita + "T00:00:00").toLocaleString('es-CL', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        <div>{visita.nom_col}</div>
                                        {visita.comuna && (
                                            <div className="text-xs text-gray-500">
                                                {visita.nom_com} • RBD: {visita.RBD}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {visita.inscritos}
                                    </td>
                                    {/*Boton que entrega el Id de visita para modificarla */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button
                                            onClick={() => handleEditVisita(visita.id_visita)}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="text-center py-4 text-gray-500">
                                    No se encontraron visitas registradas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación y totales */}
            <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-700">
                    Total de visitas: <strong>{totalVisitas}</strong>
                </span>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="border rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Anterior
                    </button>
                    <span>
                        Página {page} de {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="border rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Siguiente
                    </button>
                </div>
            </div>

            {/* Modal de registro */}
            <RegistroVisitas 
                isOpen={isModalOpen} 
                onClose={handleModalClose}
                onSuccess={handleVisitaSuccess}
            />
            {/* Modal de Edicion*/}
            <EditarVisita 
                isOpen={isEditModalOpen} 
                onClose={handleEditModalClose}
                onSuccess={handleEditSuccess}
                visitaId={visitaToEdit}
            />
        </div>
    );
}