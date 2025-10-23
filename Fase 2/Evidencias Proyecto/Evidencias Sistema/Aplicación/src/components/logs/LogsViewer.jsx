import React, { useEffect, useState } from 'react';

// Estado por defecto de filtros
const initialFiltersState = {
    action: '',
    performed_by: '',
    date_from: '',
    date_to: '',
};

export default function LogsViewer() {
    const [logs, setLogs] = useState([]); // array de logs
    const [meta, setMeta] = useState({ actions: [], users: [] }); // acciones y usuarios para dropdowns
    const [filters, setFilters] = useState(initialFiltersState);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [totalLogs, setTotalLogs] = useState(0);
    const [openRowId, setOpenRowId] = useState(null);

  // cargar metadatos
    useEffect(() => {
        fetch('/api/logs/meta')
            .then((res) => res.json())
            .then((data) => setMeta(data))
            .catch((err) => console.error('Error cargando metadatos:', err));
        }, []);

  // cargar primera página
    useEffect(() => {
        fetchLogs(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

    const fetchLogs = async (pageNum = 1, currentFilters = filters) => {
        setIsLoading(true);
        setOpenRowId(null);
        const query = new URLSearchParams();

        if (currentFilters.action) query.append('action', currentFilters.action);
        if (currentFilters.performed_by) query.append('performed_by', currentFilters.performed_by);
        if (currentFilters.date_from) query.append('date_from', currentFilters.date_from);
        if (currentFilters.date_to) query.append('date_to', currentFilters.date_to);
        query.append('page', pageNum.toString());

        try {
                const res = await fetch(`/api/logs?${query.toString()}`);
                const data = await res.json();
                setLogs(data.logs || []);
                setTotalPages(data.totalPages || 1);
                setPage(pageNum);
                setTotalLogs(data.totalLogs || 0);
            } catch (err) {
                console.error('Error al obtener logs:', err);
                setLogs([]);
            } finally {
                setIsLoading(false);
            }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters({ ...filters, [name]: value });
        };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchLogs(1, filters);
        };

    const handleResetDates = () => {
        const newFilters = { ...filters, date_from: '', date_to: '' };
        setFilters(newFilters);
        fetchLogs(1, newFilters);
        };

    const handleResetAll = () => {
        setFilters(initialFiltersState);
        fetchLogs(1, initialFiltersState);
        };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchLogs(newPage, filters);
        }
        };

    const handleRowClick = (logId) => {
        setOpenRowId(openRowId === logId ? null : logId);
        };

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
        <h1 className="text-2xl font-bold mb-4">Registros de Actividad</h1>
        
        {/* El formulario de filtros. onSubmit llama a handleSearch. */}
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end mb-6 pb-4 border-b">
            {/* Dropdown de Acción */}
            <div>
            <label className="block text-sm font-medium text-gray-700">Acción</label>
            <select name="action" value={filters.action} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                <option value="">Todas</option>
                {/* Mapea los datos de 'meta.actions' para crear las opciones del select. */}
                {meta.actions?.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            </div>

            {/* Dropdown de Ejecutado por */}
            <div>
            <label className="block text-sm font-medium text-gray-700">Ejecutado por</label>
            <select name="performed_by" value={filters.performed_by} onChange={handleFilterChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                <option value="">Todos</option>
                {meta.users?.map((u) => <option key={u.email} value={u.email}>{u.email}</option>)}
            </select>
            </div>

            {/* Inputs de Fecha */}
            <div>
            <label className="block text-sm font-medium text-gray-700">Desde</label>
            <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700">Hasta</label>
            <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
            </div>
            
            {/* Botones de Acción */}
            <div className="flex items-end gap-2">
            {/* usamos tipo boton para no enviar el formulario y luego lo reseteamos */}
            <button type="button" onClick={handleResetDates} title="Restablecer fechas" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm">
                Limpiar Fechas
            </button>
            <button type="button" onClick={handleResetAll} title="Restablecer todos los filtros" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm">
                Limpiar Todo
            </button>
            {/* Este botón hace que active los filtros del formulario. */}
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Buscar
            </button>
            </div>
        </form>

        {/* Tabla de resultados */}
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
                // Si está cargando, muestra una fila con el mensaje "Cargando...".
                <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
                ) : logs.length > 0 ? (
                // Si no está cargando y hay logs, mapea el array de logs para crear una fila <tr> por cada uno.
                logs.map((log) => (
                    <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-100 cursor-pointer"onClick={() => handleRowClick(log.id)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.action}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user_full_name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user_email || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.performed_by_email || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ip_address || '-'}</td>
                    </tr>
                    
                    {/* Se muestra solo si openRowId es igual al id de este log. */}
                    {openRowId === log.id && (
                        <tr className="bg-gray-50">
                        {/* colSpan="6" hace que esta celda ocupe el ancho de las 6 columnas de la tabla. */}
                        <td colSpan={6} className="p-4">
                            <h4 className="font-bold text-md mb-2">Detalles del Registro:</h4>
                            {renderDetails(log.details)}
                        </td>
                        </tr>
                    )}
                    </React.Fragment>
                ))
                ) : (
                // Si no está cargando y no hay logs, muestra un mensaje indicándolo.
                <tr><td colSpan={6} className="text-center py-4 text-gray-500">No se encontraron registros.</td></tr>
                )}
            </tbody>
            </table>
        </div>
        
        {/* Controles de paginación y conteo total no cambian */}
        <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-gray-700">Total de registros: <strong>{totalLogs}</strong>
            </span>
            <div className="flex items-center gap-4">
                <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="border rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                <span>Página {page} de {totalPages}</span>
                <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="border rounded px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
            </div>
        </div>
        </div>
);
};


