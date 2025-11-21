import React, { useEffect, useState, useMemo } from "react";

// estado inicial de los filtros
const initialFiltersState = {
    action: "", // accion que se realizo
    performed_by: "", // email de quien realizo la accion
    date_from: "", // rango de fecha inicio
    date_to: "", // rango de fecha fin
};


export default function LogsViewer({isAdmin = true} = {}) {
    const [logs, setLogs] = useState([]);   // resultados de la tabla
    const [meta, setMeta] = useState({ actions: [], users: [] }); // selects para acciones y usuarios
    const [filters, setFilters] = useState(initialFiltersState); // filtros actuales
    const [page, setPage] = useState(1); // pagina actual
    const [totalPages, setTotalPages] = useState(1); // conteo de paginas
    const [isLoading, setIsLoading] = useState(true); // loading de la tabla
    const [totalLogs, setTotalLogs] = useState(0); // conteo de logs
    const [openRowId, setOpenRowId] = useState(null); // mostrar detalles del log
    const [isExporting, setIsExporting] = useState(false); // estado de exportacion

    // llamar metadatos de acciones y usuarios
    useEffect(() => {
        fetch("/api/logs/meta")
        .then((res) => res.json()) 
        .then((data) => setMeta(data)) 
        .catch((err) => console.error("[LogsViewer] Error cargando metadatos:", err));
    }, []);

    // función reutilizable para traer logs
    const fetchLogs = async (pageNum = 1, appliedFilters) => {
        const currentFilters = appliedFilters ?? filters; // usa filtros nuevos o los actuales

        setIsLoading(true); // iniciamos la carga
        setOpenRowId(null); // cerramos detalle de log abierto

        const query = new URLSearchParams(); // construimos la query de los filtros

        // si hay filtro lo agregamos
        if (currentFilters.action) 
            query.append("action", currentFilters.action); 
        if (currentFilters.performed_by) 
            query.append("performed_by", currentFilters.performed_by);
        if (currentFilters.date_from) 
            query.append("date_from", currentFilters.date_from);
        if (currentFilters.date_to) 
            query.append("date_to", currentFilters.date_to);

        query.append("page", String(pageNum)); // agregamos la pagina a la query para la paginacion

        const url = `/api/logs?${query.toString()}`; // construimos la url de la peticion

        // // log para debug
        // console.debug("[LogsViewer] fetchLogs: ", url, "filters: ", currentFilters);

        try {
            const res = await fetch(url); // llamamos la peticion a la api
            if (!res.ok) {
                console.error("[LogsViewer] Error de respuesta HTTP:", res.status, res.statusText);
                }
            
            const data = await res.json(); // parseamos la respuesta a json

            // cargamos los datos de la respuesta usando valores por defecto si no vienen
            setLogs(data.logs || []); // array de logs
            setTotalPages(data.totalPages || 1); // total de paginas
            setPage(pageNum); // pagina actual
            setTotalLogs(data.totalLogs || 0); // total de logs

        } catch (err) { // manejamos errores de red u otros
            console.error("[LogsViewer] Error al obtener logs:", err);
            setLogs([]); // limpiamos logs en caso de error
            setTotalPages(1); // reseteamos total de paginas
            setTotalLogs(0); // reseteamos total de logs

        } finally {
            setIsLoading(false); // finalizamos la carga
        }
    };

    // cargamos la pagina con los filtros iniciales
    useEffect(() => {
        fetchLogs(1, initialFiltersState);
        }, []
    );

    // manejamos la actualizacion de los filtros en el estado
    const handleFilterChange = (e) => { // utilizamos evento para obtener name y value 
        const { name, value } = e.target; // extraemos name y value del target
        // Normalizamos pequeños detalles (trim básico) para evitar falsos negativos
        setFilters((prev) => (
            { ...prev // para mantener otros filtros
                , [name]: value.trim // si es string le hacemos trim
                ? value.trim() : value }));  // actualizamos el filtro cambiado
    };

    // manejamos la busqueda con los filtros actuales
    const handleSearch = (e) => {
        e.preventDefault(); // prevenimos submit por defectos
        fetchLogs(1); // usa los filtros actuales del estado
    };

    // manejamos el reseteo de las fechas
    const handleResetDates = () => {
        const newFilters = { ...filters, date_from: "", date_to: "" }; // limpiamos fechas
        setFilters(newFilters); // actualizamos el estado
        fetchLogs(1, newFilters); // traemos logs con los nuevos filtros
    };

    // manejamos el reseteo de todos los filtros
    const handleResetAll = () => {
        setFilters(initialFiltersState); // reseteamos al estado inicial
        fetchLogs(1, initialFiltersState); // traemos logs con los filtros iniciales
    };

    // manejamos el cambio de pagina
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) { // validamos el rango de pagina y no salir de los limites
            fetchLogs(newPage); // traemos logs de la nueva pagina
        }
    };

    // manejamos el click en una fila para mostrar/ocultar detalles
    const handleRowClick = (logId) => {
        setOpenRowId((prev) => (prev === logId ? null : logId)); // previene colapsar si ya esta abierto (solo abre uno a la vez)
    };

    // renderizamos los detalles del log en formato JSON
    const renderDetails = (details) => {
        if (!details || Object.keys(details).length === 0) { // si no hay detalles
            return <p className="text-gray-500 text-sm">No hay detalles adicionales para este registro.</p>;
        }
        return (
            <pre className="bg-gray-800 text-white p-4 rounded-md text-sm overflow-x-auto"> {/* pre para formato monoespaciado */}
                {JSON.stringify(details, null, 2)} {/* indentacion de 2 espacios */}
            </pre> 
        );
    };

    // calculamos fecha para exportar
    const endInclusiveISO = useMemo(() => {
        if (!filters.date_to) { // si no hay fecha fin
            return undefined; // retornamos undefined
        }

        const endDate = new Date(filters.date_to); // creamos variable de fecha fin
        endDate.setHours(23, 59, 59, 999); // ajustamos a fin de dia
        return endDate.toISOString(); // retornamos en formato ISO
    }, [filters.date_to]); // se recalcula solo si cambia date_to

    // var para exportar
    const exportFilters = useMemo(() => ({
        action: filters.action || undefined, // accion o undefined
        performed_by_email: filters.performed_by || undefined, // email
        start: filters.date_from || undefined, // fecha desde
        end: endInclusiveISO, // fecha final del dia o undefined
    
    }),
    [filters.action, filters.performed_by, filters.date_from, endInclusiveISO]);
    
    // url para el export segun el formato
    const exportUrl = (format) => {
        const params = new URLSearchParams();

        Object.entries(exportFilters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                params.append(key, String(value));
            }});

        params.append("format", format); // formato de exportacion
        params.append("all", "1"); // exportar todos los registros que coinciden con los filtros

        return `/api/logs/export?${params.toString()}`; // construimos la url completa
    };

    // manejo del formato
    const handleExport = async (format) => {
        if (!isAdmin) {
            alert("No tienes permisos para exportar los registros.");
            return;
        }

        try {
            setIsExporting(true); // iniciamos la exportacion

            const url = exportUrl(format); // obtenemos la url de exportacion
            const res = await fetch(url, { method: "GET" }); // llamamos la api de exportacion

            if (!res.ok) {
                console.error("[LogsViewer] Error de respuesta HTTP en exportación:", res.status, res.statusText);
                alert("Error al exportar los registros. Por favor, inténtalo de nuevo más tarde.");
                return;
            }

            const blob = await res.blob(); // obtenemos el blob de la respuesta, el blob es un objeto tipo archivo
            const today = new Date().toISOString().slice(0, 10); // fecha actual en formato YYYY-MM-DD
            const filename = `Registros_Admission_Analytics_${today}.${format}`; // nombre del archivo
            const downloadUrl = window.URL.createObjectURL(blob); // creamos una url temporal para descargar el blob
            
            const a = document.createElement("a"); // creamos un elemento anchor
            a.href = downloadUrl; // asignamos la url del blob
            a.download = filename; // asignamos el nombre del archivo
            document.body.appendChild(a); // agregamos el anchor al DOM
            a.click(); // simulamos el click para iniciar la descarga
            a.remove(); // removemos el anchor del DOM
            URL.revokeObjectURL(downloadUrl); // liberamos la url temporal
        
        } catch (err) {
            console.error("[LogsViewer] Error al exportar los registros:", err);
            alert("Error al exportar los registros. Por favor, inténtalo de nuevo más tarde.");
        
        } finally {
            setIsExporting(false); // finalizamos la exportacion
        }};

        


    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Registros de Actividad</h1>

            {/* Exportar registros */}
            <div className="mb-4 flex items-center justify-between gap-4">
                {/* Texto descriptivo */}
                <div className="text-sm">
                    <p className="font-semibold text-gray-800">Exportar registros</p>
                    <p className="text-xs text-gray-500"> Se exportan según los filtros actuales. </p>
                </div>

                {/* Botones */}
                <div className="flex gap-2">
                    <button type="button" onClick={() => handleExport("csv")} disabled={isExporting || isLoading || !isAdmin}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
                    title={!isAdmin ? "Sin permisos para exportar" : "Exportar CSV"}>
                        <svg className="w-4 h-4" viewBox="0 0 548.29 548.291" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <g> <path d="M486.2,196.121h-13.164V132.59c0-0.399-0.064-0.795-0.116-1.2c-0.021-2.52-0.824-5-2.551-6.96L364.656,3.677 c-0.031-0.034-0.064-0.044-0.085-0.075c-0.629-0.707-1.364-1.292-2.141-1.796c-0.231-0.157-0.462-0.286-0.704-0.419 c-0.672-0.365-1.386-0.672-2.121-0.893c-0.199-0.052-0.377-0.134-0.576-0.188C358.229,0.118,357.4,0,356.562,0H96.757 C84.893,0,75.256,9.649,75.256,21.502v174.613H62.093c-16.972,0-30.733,13.756-30.733,30.73v159.81 c0,16.966,13.761,30.736,30.733,30.736h13.163V526.79c0,11.854,9.637,21.501,21.501,21.501h354.777 c11.853,0,21.502-9.647,21.502-21.501V417.392H486.2c16.966,0,30.729-13.764,30.729-30.731v-159.81 C516.93,209.872,503.166,196.121,486.2,196.121z M96.757,21.502h249.053v110.006c0,5.94,4.818,10.751,10.751,10.751h94.973v53.861 H96.757V21.502z M258.618,313.18c-26.68-9.291-44.063-24.053-44.063-47.389c0-27.404,22.861-48.368,60.733-48.368 c18.107,0,31.447,3.811,40.968,8.107l-8.09,29.3c-6.43-3.107-17.862-7.632-33.59-7.632c-15.717,0-23.339,7.149-23.339,15.485 c0,10.247,9.047,14.769,29.78,22.632c28.341,10.479,41.681,25.239,41.681,47.874c0,26.909-20.721,49.786-64.792,49.786 c-18.338,0-36.449-4.776-45.497-9.77l7.38-30.016c9.772,5.014,24.775,10.006,40.264,10.006c16.671,0,25.488-6.908,25.488-17.396 C285.536,325.789,277.909,320.078,258.618,313.18z M69.474,302.692c0-54.781,39.074-85.269,87.654-85.269 c18.822,0,33.113,3.811,39.549,7.149l-7.392,28.816c-7.38-3.084-17.632-5.939-30.491-5.939c-28.822,0-51.206,17.375-51.206,53.099 c0,32.158,19.051,52.4,51.456,52.4c10.947,0,23.097-2.378,30.241-5.238l5.483,28.346c-6.672,3.34-21.674,6.919-41.208,6.919 C98.06,382.976,69.474,348.424,69.474,302.692z M451.534,520.962H96.757v-103.57h354.777V520.962z M427.518,380.583h-42.399 l-51.45-160.536h39.787l19.526,67.894c5.479,19.046,10.479,37.386,14.299,57.397h0.709c4.048-19.298,9.045-38.352,14.526-56.693 l20.487-68.598h38.599L427.518,380.583z" /> </g>
                        </svg>
                        <span>{isExporting ? "Exportando..." : "Exportar CSV"}</span>
                    </button>

                    <button type="button" onClick={() => handleExport("xlsx")} disabled={isExporting || isLoading || !isAdmin}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
                    title={!isAdmin ? "Sin permisos para exportar" : "Exportar XLSX"}>
                        <svg className="w-4 h-4" viewBox="0 0 548.29 548.29" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <g><path d="M486.206,196.121H473.04v-63.525c0-0.396-0.062-0.795-0.109-1.2c-0.021-2.52-0.829-4.997-2.556-6.96L364.657,3.677 c-0.033-0.031-0.064-0.042-0.085-0.075c-0.63-0.704-1.364-1.29-2.143-1.796c-0.229-0.154-0.461-0.283-0.702-0.419 c-0.672-0.365-1.387-0.672-2.121-0.893c-0.2-0.052-0.379-0.134-0.577-0.186C358.23,0.118,357.401,0,356.562,0H96.757 C84.894,0,75.256,9.649,75.256,21.502v174.613H62.092c-16.971,0-30.732,13.756-30.732,30.733v159.812 c0,16.961,13.761,30.731,30.732,30.731h13.164V526.79c0,11.854,9.638,21.501,21.501,21.501h354.776 c11.853,0,21.501-9.647,21.501-21.501V417.392h13.166c16.966,0,30.729-13.764,30.729-30.731V226.854 C516.93,209.872,503.176,196.121,486.206,196.121z M96.757,21.502h249.054v110.006c0,5.94,4.817,10.751,10.751,10.751h94.972 v53.861H96.757V21.502z M314.576,314.661c-21.124-7.359-34.908-19.045-34.908-37.544c0-21.698,18.11-38.297,48.116-38.297 c14.331,0,24.903,3.014,32.442,6.413l-6.411,23.2c-5.091-2.446-14.146-6.037-26.598-6.037s-18.488,5.662-18.488,12.266 c0,8.115,7.171,11.696,23.58,17.921c22.446,8.305,33.013,20,33.013,37.921c0,21.323-16.415,39.435-51.318,39.435 c-14.524,0-28.861-3.769-36.031-7.737l5.843-23.77c7.738,3.958,19.627,7.927,31.885,7.927c13.218,0,20.188-5.47,20.188-13.774 C335.894,324.667,329.858,320.13,314.576,314.661z M265.917,343.9v24.157h-79.439V240.882h28.877V343.9H265.917z M94.237,368.057 H61.411l36.788-64.353l-35.473-62.827h33.021l11.125,23.21c3.774,7.736,6.606,13.954,9.628,21.135h0.367 c3.027-8.115,5.477-13.775,8.675-21.135l10.756-23.21h32.827l-35.848,62.066l37.74,65.103h-33.202l-11.515-23.022 c-4.709-8.855-7.73-15.465-11.316-22.824h-0.375c-2.645,7.359-5.845,13.969-9.811,22.824L94.237,368.057z M451.534,520.968H96.757 V417.392h354.776V520.968z M451.728,368.057l-11.512-23.022c-4.715-8.863-7.733-15.465-11.319-22.825h-0.366 c-2.646,7.36-5.858,13.962-9.827,22.825l-10.551,23.022h-32.836l36.788-64.353l-35.471-62.827h33.02l11.139,23.21 c3.77,7.736,6.593,13.954,9.618,21.135h0.377c3.013-8.115,5.459-13.775,8.671-21.135l10.752-23.21h32.835l-35.849,62.066 l37.733,65.103h-33.202V368.057z" /> </g>
                        </svg>
                        <span>{isExporting ? "Exportando..." : "Exportar XLSX"}</span>
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end mb-6 pb-4 border-b">
                {/* Acción */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Acción</label>
                    <select name="action" value={filters.action} onChange={handleFilterChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="">Todas</option>
                        {meta.actions?.map((a) => (
                        <option key={a} value={a}>
                            {a}
                        </option>
                        ))}
                    </select>
                </div>

                {/* Ejecutado por */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Ejecutado por</label>
                    <select name="performed_by" value={filters.performed_by} onChange={handleFilterChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="">Todos</option>
                        {meta.users?.map((u) => (
                            <option key={u.email} value={u.email}>
                                {u.email}
                            </option>
                            ))}
                    </select>
                </div>

                {/* Fechas */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Desde</label>
                    <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Hasta</label>
                    <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
                </div>

                {/* Botones de limpieza de filtros */}
                <div className="flex items-end gap-2">
                    <button type="button" onClick={handleResetDates} title="Restablecer fechas"
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm">
                        Limpiar Fechas
                    </button>
                    <button type="button" onClick={handleResetAll} title="Restablecer todos los filtros"
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm">
                        Limpiar Todo
                    </button>
                    <button type="submit" disabled={isLoading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60">
                        Buscar
                    </button>
                </div>
            </form>

            {/* Tabla */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario Afectado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Usuario Afectado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ejecutado por</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                        <tr>
                            <td colSpan={6} className="text-center py-4">Cargando...</td>
                        </tr>
                        ) : logs.length > 0 ? (
                        // usamos flatMap para poder insertar filas de detalles despues de cada fila principal
                        logs.flatMap((log) => {
                            const rows = [
                                <tr key={log.log_id} onClick={() => handleRowClick(log.log_id)} className="hover:bg-gray-100 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.action}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user_full_name || "-"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user_email || "-"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.performed_by_email || "-"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ip_address || "-"}</td>
                                </tr>,
                            ];

                            if (openRowId === log.log_id) {
                                rows.push(
                                    <tr key={`${log.log_id}-details`} className="bg-gray-50">
                                        <td colSpan={6} className="p-4">
                                            <h4 className="font-bold text-md mb-2">Detalles del Registro:</h4>
                                            {renderDetails(log.details)}
                                        </td>
                                    </tr>
                                );
                            }

                            return rows;
                        })
                        ) : (
                        <tr>
                            <td colSpan={6} className="text-center py-4 text-gray-500">No se encontraron registros.</td>
                        </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación y totales */}
            <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-700"> Total de registros: <strong>{totalLogs}</strong> </span>
                <div className="flex items-center gap-4">
                    <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                        className="border rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed">
                        Anterior
                    </button>

                    <span>Página {page} de {totalPages}</span>

                    <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                        className="border rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed">
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
}
