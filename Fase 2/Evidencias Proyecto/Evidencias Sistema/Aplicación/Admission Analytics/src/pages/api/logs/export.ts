import type { APIRoute } from "astro";
import { getSupabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import * as XLSX from "xlsx"; 

const supabaseAdmin = getSupabaseAdmin();

const toBool = (value: string | null): boolean => value === "true" || value === "1"; // convierte string a boolean

// parseo de csv
const parseToCSV = (value: unknown): string => {
  const str = String(value ?? "");
  const parsed = str.replace(/"/g, '""'); // parseo de comillas dobles
  return `"${parsed}"`; // retorna valor entre comillas
};

export const GET: APIRoute = async ({ url }) =>{
  const searchParams = url.searchParams; // obtenemos parametros de busqueda

  const format = (searchParams.get("format") ?? "csv").toLowerCase(); // formato de exportacion
  const action = searchParams.get("action"); // filtro de accion
  const performed_by_email = searchParams.get("performed_by_email"); // filtro de email
  const start = searchParams.get("start"); // filtro de fecha desde
  const end = searchParams.get("end"); // filtro de fecha hasta
  const exportAll = toBool(searchParams.get("all")); // exportacion de todos los registros

  let query = supabaseAdmin.from("logs").select("*");

  // aplicamos filtros
  if (action) {
    query = query.ilike("action", `%${action}%`); // ilike para busqueda parcial
  }

  // filtro por email
  if (performed_by_email) {
    query = query.ilike("performed_by_email", `%${performed_by_email}%`);
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

  const { data: logs, error } = await query

  if (error) {
    console.error("[export] Error fetching logs:", error);
    return new Response(JSON.stringify({ error: error.message }), 
    { status: 500 , headers: { "Content-Type": "application/json" } });
  }

  const rows = (logs ?? []).map((l) => ({
    ID: l.log_id,
    Fecha: l.created_at,
    Accion: l.action ?? "",
    UsuarioEmail: l.user_email ?? "",
    UsuarioNombre: l.user_full_name ?? "",
    IP: l.ip_address ?? "",
    UserAgent: l.user_agent ?? "",
    EjecutadoPor: l.performed_by_email ?? "",
    // 👇 Aquí va la magia: incluimos `details` serializado
    Detalles:
      typeof l.details === "object"
        ? JSON.stringify(l.details)
        : l.details ?? "",
  }));

  const today = new Date().toISOString().slice(0, 10);
  const baseFilename = `Registros_Admission_Analytics_${today}`;

  if (format === "csv") {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [
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

    const csvContent: string[] = [];

    csvContent.push(headers.map(parseToCSV).join(","));

    for (const row of rows){
      csvContent.push(headers.map(h => parseToCSV(
        (row as Record<string, unknown>)[h])).join(","));
    }

    const csv = csvContent.join("\r\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${baseFilename}.csv"`,
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
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${baseFilename}.xlsx"`,
        },
      });
    }
      return new Response(JSON.stringify({ error: "formato no soportado" }), 
      { status: 400, headers: { "Content-Type": "application/json" } });
    }
