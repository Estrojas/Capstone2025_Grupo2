import React, { useRef, useState } from "react";

const NAME_MAX = 60;
// Permite letras Unicode, marcas combinadas, espacios y apóstrofe
const nameRegex = /^[\p{L}\p{M} ']{2,60}$/u;

const normalizeName = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFC")
    .replace(/[^\p{L}\p{M} ']/gu, "") // deja solo letras, espacios y '
    .replace(/ {2,}/g, " ") // colapsa espacios múltiples
    .trim()
    .slice(0, NAME_MAX); // limita longitud

const isNullOrEmpty = (value) =>
  value === "" || value === null || value === "undefined";

export default function UserForm({ campusList = [], areaList = [] }) {
  const formRef = useRef(null);

  const [alert, setAlert] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showAlert = (msg, type = "success") => {
    setAlert({ message: msg, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formRef.current) return;

    setAlert(null);
    setIsSubmitting(true);

    const fd = new FormData(formRef.current);
    const areaIdValue = fd.get("area_id");
    const campusIdValue = fd.get("campus_id");

    const names = normalizeName(fd.get("names"));
    const lastName1 = normalizeName(fd.get("last_name_1"));
    const lastName2 = normalizeName(fd.get("last_name_2"));

    const payload = {
      names,
      last_name_1: lastName1,
      last_name_2: lastName2 || "",

      email: fd.get("email"),
      password: fd.get("password"),

      role: fd.get("role") || "user",
      status: fd.get("status") || "active",

      area_id: isNullOrEmpty(areaIdValue) ? null : Number(areaIdValue),
      campus_id: isNullOrEmpty(campusIdValue) ? null : Number(campusIdValue),
    };

    // Validaciones
    if (!nameRegex.test(payload.names)) {
      showAlert(
        "El campo Nombres es inválido. Solo se permiten letras y espacios.",
        "error"
      );
      setIsSubmitting(false);
      return;
    }

    if (!nameRegex.test(payload.last_name_1)) {
      showAlert(
        "El campo Apellido paterno es inválido. Solo se permiten letras y espacios.",
        "error"
      );
      setIsSubmitting(false);
      return;
    }

    if (payload.last_name_2 && !nameRegex.test(payload.last_name_2)) {
      showAlert(
        "El campo Apellido materno es inválido. Solo se permiten letras y espacios.",
        "error"
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const msg = data?.message || "No se pudo crear el usuario";
        showAlert(msg, "error");
        return;
      }

      showAlert("Usuario creado con éxito", "success");
      formRef.current.reset();
      window.location.reload();
    } catch (err) {
      showAlert(
        "Error de red: " + (err?.message || String(err)),
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {alert && (
        <div
          className={
            "p-3 rounded-lg mb-3 " +
            (alert.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800")
          }
        >
          {alert.message}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="names"
          placeholder="Nombres"
          required
          className="border p-2 w-full rounded"
          maxLength={60}
          pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü ']{2,60}"
        />
        <input
          type="text"
          name="last_name_1"
          placeholder="Apellido paterno"
          required
          className="border p-2 w-full rounded"
          maxLength={60}
          pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü ']{2,60}"
        />
        <input
          type="text"
          name="last_name_2"
          placeholder="Apellido materno (opcional)"
          className="border p-2 w-full rounded"
          maxLength={60}
          pattern="[A-Za-zÁÉÍÓÚáéíóúÑñÜü ']{2,60}"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="border p-2 w-full rounded"
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña (mín. 6)"
          required
          minLength={6}
          className="border p-2 w-full rounded"
        />

        <select name="role" required className="border p-2 w-full rounded">
          <option value="user">Usuario</option>
          <option value="admin">Administrador</option>
          <option value="manager">Manager</option>
        </select>

        <select name="status" required className="border p-2 w-full rounded">
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>

        <select name="area_id" className="border p-2 w-full rounded">
          <option value="">Seleccionar Área</option>
          {areaList.map((a) => (
            <option key={a.area_id} value={a.area_id}>
              {a.area_name}
            </option>
          ))}
        </select>

        <select name="campus_id" className="border p-2 w-full rounded">
          <option value="">Seleccionar Campus</option>
          {campusList.map((c) => (
            <option key={c.campus_id} value={c.campus_id}>
              {c.campus_name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-4 py-2 rounded align-center w-full hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting ? "Creando..." : "Crear Usuario"}
        </button>
      </form>
    </div>
  );
}
