import { Bar } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TopColegiosChartPrueba = () => {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comunas, setComunas] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const labelInsideBarPlugin = {
    id: 'labelOutsideBar',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();

      chart.data.labels.forEach((_, index) => {
        // Calcular el total de todas las datasets para esta barra
        const total = chart.data.datasets.reduce((sum, dataset) => sum + dataset.data[index], 0);

        // Obtener la última barra (la más alta) para posicionar el texto
        const lastDatasetIndex = chart.data.datasets.length - 1;
        const lastBar = chart.getDatasetMeta(lastDatasetIndex).data[index];

        if (lastBar) {
          const position = lastBar.tooltipPosition();

          // Configurar el estilo del texto
          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          // Dibujar el total justo por encima de la barra
          ctx.fillText(total + " Matriculas", position.x + 10, position.y);

          
        }
        // Dibujar el valor en cada segmento de la barra
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          
          meta.data.forEach((bar, index) => {
            const value = dataset.data[index];

            if (value > 0) {
              // Obtener las dimensiones de la barra
              const { x, y, base } = bar;
              const width = x - base;
              const centerX = base + width / 2; // Centro horizontal del segmento
              
              ctx.fillStyle = 'white';
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              // Dibujar el valor en el centro del segmento
              ctx.fillText(value, centerX, y);
            }
          });
        });
      });

      ctx.restore();
    },
  };

  const options = {
    indexAxis: 'y', // Barras horizontales
    responsive: true,
    layout: {
      padding: {
        right: 150, // Espacio extra a la derecha para las leyendas
        left: 10,
        top: 10,
        bottom: 10
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'white',
        },
      },
      title: {
        display: true,
        text: 'Top 10 Colegios con Matrículas por Nivel',
        color: 'white',
      },
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        title: { display: true, text: 'Cantidad de Alumnos', color: 'white' },
        ticks: { color: 'white' },
      },
      y: {
        stacked: true,
        title: { display: true, text: 'Colegios', color: 'white' },
        ticks: { color: 'white' },
      },
    },
  };
    // Cargar comunas
    useEffect(() => {
      async function fetchComunas() {
        try {
          const response = await fetch("http://127.0.0.1:8000/comunas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cod_region: 5 })
          });
  
          if (!response.ok) throw new Error("Error al cargar comunas");
  
          const data = await response.json();
          setComunas(data.comunas);
        } catch (error) {
          console.error("Error al buscar comunas:", error);
        }
      }
  
      fetchComunas();
    }, []);

    /*Cargar Datos del Grafico */

  // Cargar datos del gráfico (se ejecuta cuando cambian las comunas seleccionadas)
  useEffect(() => {
    let isMounted = true;

    async function fetchChartData() {
      try {
        setIsLoading(true);
        
        // Construir el body del request
        const requestBody = {
          agno: 2024,
          cod_region: 5
        };

        // Si hay comunas seleccionadas, agregarlas al body
        if (seleccionadas.length > 0) {
          requestBody.cod_com = seleccionadas;
        }

        console.log("Llamando a API con:", requestBody);

        const response = await fetch("http://127.0.0.1:8000/top_establecimientos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        const initialData = await response.json();
        console.log("Datos recibidos:", initialData);

        if (isMounted && initialData.top_10) {
          const formattedData = {
            labels: initialData.top_10.map(item => item.NOM_RBD),
            datasets: [
              {
                label: '1° Medio',
                data: initialData.top_10.map(item => item['1']),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
              },
              {
                label: '2° Medio',
                data: initialData.top_10.map(item => item['2']),
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
              },
              {
                label: '3° Medio',
                data: initialData.top_10.map(item => item['3']),
                backgroundColor: 'rgba(255, 206, 86, 0.7)',
              },
              {
                label: '4° Medio',
                data: initialData.top_10.map(item => item['4']),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
              }
            ]
          };

          setChartData(formattedData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchChartData();

    return () => {
      isMounted = false;
    };
  }, [seleccionadas])

  const toggleSeleccion = (codCom) => {
    console.log("Toggling comuna:", codCom);
    setSeleccionadas(prev => {
      if (prev.includes(codCom)) {
        return prev.filter(x => x !== codCom);
      } else {
        return [...prev, codCom];
      }
    });
  };

  const limpiarFiltros = () => {
    setSeleccionadas([]);
    setBusqueda("");
  };

  const comunasFiltradas = comunas.filter(c =>
    c.NOM_COM.toLowerCase().includes(busqueda.toLowerCase())
  );


  return (
    <div style={{ display: 'flex', gap: '24px', padding: '16px', alignItems: 'flex-start', width: '100%' }}>
      
      {/* Filtro de Comunas */}
      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        width: '288px',
        height: '384px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          backgroundColor: '#4b5563',
          color: 'white',
          flexShrink: 0,
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            Filtrar Comunas
          </h2>

          <input
            type="text"
            placeholder="Buscar comuna..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              color: '#1f2937',
              borderRadius: '6px',
              border: 'none',
              outline: 'none',
              marginBottom: '8px'
            }}
          />

          <button
            onClick={limpiarFiltros}
            style={{
              width: '100%',
              backgroundColor: 'white',
              color: '#374151',
              fontWeight: '600',
              padding: '6px 0',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
          >
            Limpiar filtros
          </button>
        </div>

        {/* Lista de comunas */}
        <div style={{
          overflowY: 'auto',
          flex: 1,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {comunasFiltradas.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', marginTop: '16px' }}>
              No se encontraron comunas.
            </p>
          ) : (
            comunasFiltradas.map(c => (
              <label
                key={c.COD_COM}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  height: '40px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#faf5ff'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <input
                  type="checkbox"
                  value={c.COD_COM}
                  checked={seleccionadas.includes(c.COD_COM)}
                  onChange={() => toggleSeleccion(c.COD_COM)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: '#1f2937' }}>{c.NOM_COM}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Gráfico */}
      <div style={{ flex: 1, height: '600px' }}>
        {isLoading ? (
          <p style={{ color: "white", textAlign: "center" }}>Cargando gráfico...</p>
        ) : !chartData ? (
          <p style={{ color: "white", textAlign: "center" }}>No hay datos disponibles</p>
        ) : (
          <Bar data={chartData} options={options} plugins={[labelInsideBarPlugin]} />
        )}
      </div>
      
    </div>
  );
};

export default TopColegiosChartPrueba;