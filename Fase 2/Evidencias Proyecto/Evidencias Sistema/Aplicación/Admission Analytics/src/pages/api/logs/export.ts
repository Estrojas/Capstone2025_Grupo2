import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import * as XLSX from "xlsx"; 

const supabaseAdmin = getSupabaseAdmin();

const toBool = (value: string | null): boolean => value === "true" || value === "1"; // convierte string a boolean

// parseo de csv
const parseToCSV = (value: unknown): string => {
  const str = String(value ?? ""); // convertir a string
  const parsed = str.replace(/"/g, '""'); // parseo de comillas dobles
  return `"${parsed}"`; // retorna valor entre comillas
};

const formatDateTime = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso); // crear objeto fecha
  if (Number.isNaN(d.getTime())) return ""; // si no es fecha valida

  const dd = String(d.getDate()).padStart(2, "0"); // dia con dos digitos
  const mm = String(d.getMonth() + 1).padStart(2, "0"); // meses empiezan en 0
  const yyyy = d.getFullYear();                         // año completo
  const hh = String(d.getHours()).padStart(2, "0"); // horas con dos digitos
  const mi = String(d.getMinutes()).padStart(2, "0"); // minutos con dos digitos
  const ss = String(d.getSeconds()).padStart(2, "0");// segundos con dos digitos

  return `${dd}-${mm}-${yyyy} ${hh}:${mi}:${ss}`; //formato final
}

export const GET: APIRoute = async ({ url }) =>{
  const searchParams = url.searchParams; // obtenemos parametros de busqueda
  const format = (searchParams.get("format") ?? "csv").toLowerCase(); // formato de exportacion
  const rawAction = searchParams.get("action"); // filtro de accion
  const rawPerformed = searchParams.get("performed_by_email"); // filtro de email
  const start = searchParams.get("start"); // filtro de fecha desde
  const end = searchParams.get("end"); // filtro de fecha hasta
  const exportAll = toBool(searchParams.get("all")); // exportacion de todos los registros

  const action = rawAction ? rawAction.replace(/\+/g, " ").trim() : "";
  const performed_by_email = rawPerformed ? rawPerformed.trim() : "";

  let query = supabaseAdmin.from("logs").select("*"); // consulta inicial

  // aplicamos filtros
  if (action) {
    query = query.eq("action", action); // ilike para busqueda parcial
  }

  // filtro por email
  if (performed_by_email) {
    query = query.ilike("performed_by_email", `%${performed_by_email}%`); // ilike para busqueda parcial
  }
  // filtro por rango de fechas
  if (start) {
    query = query.gte("created_at", start);
  }
  // filtro fecha hasta
  if (end) {
    query = query.lte("created_at", end);
  }

  // si no se exporta todo
  if (!exportAll) {
    query = query.limit(1000); // limitamos a 1000 registros
  }

  const { data: logs, error } = await query // ejecutamos consulta

  if (error) {
    console.error("[export] Error fetching logs:", error);
    return new Response(JSON.stringify({ error: error.message }), 
    { status: 500 , headers: { "Content-Type": "application/json" } });
  }

  const rows = (logs ?? []).map((l) => ({
    ID: l.log_id,
    Fecha: formatDateTime(l.created_at),
    Accion: l.action ?? "",
    UsuarioEmail: l.user_email ?? "",
    UsuarioNombre: l.user_full_name ?? "",
    IP: l.ip_address ?? "",
    UserAgent: l.user_agent ?? "",
    EjecutadoPor: l.performed_by_email ?? "",
    Detalles:
      typeof l.details === "object" // si es objeto lo convertimos a string
        ? JSON.stringify(l.details) // retorna string JSON
        : l.details ?? "", // si no es objeto retornamos como string (o vacio)
  }));

  const today = new Date().toISOString().slice(0, 10);
  const baseFilename = `Registros_Admission_Analytics_${today}`;

  if (format === "csv") {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [ // si no hay filas, usamos estos headers
      "ID",
      "Fecha",
      "Accion",
      "UsuarioEmail",
      "UsuarioNombre",
      "IP",
      "UserAgent",
      "EjecutadoPor",
      "Detalles",
    ];

    // construir contenido CSV
    const csvContent: string[] = []; 
    csvContent.push(headers.map(parseToCSV).join(",")); // fila de headers

    for (const row of rows){
      csvContent.push(headers.map(h => parseToCSV( // fila de datos para cada header
        (row as Record<string, unknown>)[h])).join(",")); // unir con comas
    }

    const csv = csvContent.join("\r\n"); // unir filas con saltos de linea
    const utf = "\uFEFF" + csv; // añadir UTF-8

    return new Response(utf, {
      status: 200,
      headers: {
        "Content-Type": "text/csv", // tipo de contenido CSV
        "Content-Disposition": `attachment; filename="${baseFilename}.csv"`, // forzar descarga con nombre de archivo
      },
    });
  }

    if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rows); // generamos hoja de calculo
      const workbook = XLSX.utils.book_new(); // generamos libro de excel
      XLSX.utils.book_append_sheet(workbook, worksheet, "Logs"); // añadimos hoja al libro

      const xlsData = XLSX.write(workbook, { bookType: "xlsx", type: "array" }); // escribimos libro con los datos
      return new Response(xlsData, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // tipo de contenido xlsx
          "Content-Disposition": `attachment; filename="${baseFilename}.xlsx"`, // forzar descarga con nombre de archivo
        },
      });
    }
    // en caso de que el formato no sea soportado
    return new Response(JSON.stringify({ error: "formato no soportado" }), 
    { status: 400, headers: { "Content-Type": "application/json" } });
    }
