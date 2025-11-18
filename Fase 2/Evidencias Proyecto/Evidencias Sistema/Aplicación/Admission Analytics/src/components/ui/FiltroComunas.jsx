import React, { useState, useEffect } from "react";

const FiltroComunas = ({ data = [], onFilterChange }) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  // Manejar búsqueda
  const handleSearchChange = (e) => setSearch(e.target.value);

  // Manejar selección
  const handleSelect = (id) => {
    let newSelected = [...selected];
    if (newSelected.includes(id)) {
      newSelected = newSelected.filter((x) => x !== id);
    } else {
      newSelected.push(id);
    }
    setSelected(newSelected);
  };

  // Avisar al padre cada vez que cambian los filtros
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(selected);
    }
  }, [selected]);

  // Filtrar comunas por texto
  const filteredData = data.filter((comuna) =>
    comuna.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col bg-white shadow-lg rounded-xl w-72 h-[500px] border border-gray-200 overflow-hidden">
      {/* Header fijo con buscador */}
      <div className="p-4 bg-purple-600 text-white sticky top-0 z-10">
        <h2 className="text-lg font-semibold mb-2">Filtrar Comunas</h2>
        <input
          type="text"
          placeholder="Buscar comuna..."
          value={search}
          onChange={handleSearchChange}
          className="w-full p-2 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>

      {/* Lista desplazable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredData.length === 0 ? (
          <p className="text-gray-500 text-sm text-center mt-4">
            No se encontraron comunas.
          </p>
        ) : (
          filteredData.map((comuna) => (
            <label
              key={comuna.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-purple-50 cursor-pointer transition"
            >
              <input
                type="checkbox"
                checked={selected.includes(comuna.id)}
                onChange={() => handleSelect(comuna.id)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-800">{comuna.nombre}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
};

export default FiltroComunas;
