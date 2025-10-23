// Esperamos a que todo el HTML esté cargado antes de ejecutar el script
document.addEventListener("DOMContentLoaded", () => {
    // Importamos el cliente solo si necesitamos operaciones directas (mantener por si acaso), pero la autenticación la hacemos via API.
    // importamos Supabase desde el window object o un script global si es necesario
    const supabaseBrowser = (window as any).supabaseBrowser; 

    // Obtención y tipado de elementos DOM
    const form = document.getElementById("login-form") as HTMLFormElement | null;
    const btn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    const errorBox = document.getElementById("login-error") as HTMLElement | null;
    const errorMsg = document.getElementById("error-message") as HTMLElement | null;
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const passwordInput = document.getElementById("password") as HTMLInputElement | null; // Añadido para mejor manejo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Helpers
    function showError(message: string) {
        if (!errorMsg || !errorBox) return;
        errorMsg.textContent = message;
        errorBox.classList.remove("hidden"); // Asegurar que es visible
        
        // Clases de visibilidad
        errorBox.classList.remove("opacity-0", "translate-y-1");
        errorBox.classList.add("opacity-100", "translate-y-0", "transition-all", "duration-300", "ease-in-out");
    }

    function hideError() {
        if (!errorMsg || !errorBox) return;
        
        // Clases de ocultación con transición
        errorBox.classList.remove("opacity-100", "translate-y-0");
        errorBox.classList.add("opacity-0", "translate-y-1", "transition-all", "duration-300", "ease-in-out");
        
        setTimeout(() => {
            errorMsg.textContent = "";
            errorBox.classList.add("hidden");
        }, 300); // Espera la duración de la animación
    }

    // Validaciones de input
    emailInput?.addEventListener("input", () => {
        // Si el correo no cumple con el formato, mostramos error de UX
        const email = emailInput.value.trim().toLowerCase();

        if (email.length > 0 && !emailRegex.test(email)) {
            showError("Formato de correo inválido.");
        } else {
            hideError();
        }
    });

    // Manejos de submit
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault(); // ¡Ahora sí se va a ejecutar!
            if (!errorBox || !errorMsg || !emailInput || !passwordInput || !btn) return;

            hideError();
            btn.disabled = true; // Deshabilitar al inicio

            const email = emailInput.value.trim().toLowerCase();
            const password = passwordInput.value;
            
            // validaciones previas antes de enviar al servidor
            if (!email || !password) {
                showError("Por favor complete todos los campos.");
                btn.disabled = false;
                return;
            }
            // validación del formato del correo
            if (!emailRegex.test(email)) {
                showError("Formato de correo inválido. Ejemplo: persona@duocuc.cl");
                btn.disabled = false;
                return;
            }

            try {
                // Esto usa el endpoint que creamos en login POST
                const res = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });
                
                const apiResponse: { ok?: boolean; message?: string; next?: string } = await res.json();

                if (!res.ok || !apiResponse.ok) {
                    const message = apiResponse.message || "Credenciales inválidas o error de servidor.";
                    throw new Error(message);
                }

                // next del JSON para redirigir
                if (apiResponse.next) {
                    window.location.href = apiResponse.next; // Esto te lleva a "/dashboard"
                } else {
                    // Fallback por si el JSON no trae 'next'
                    window.location.href = "/dashboard";
                }

            } catch (err) {
                // Muestra el mensaje visualmente
                const message = err instanceof Error ? err.message: "Error desconocido, inténtelo nuevamente.";
                showError(message)
            } finally {
                // Reactiva el botón
                if (btn) btn.disabled = false;
            }
        });
    }});