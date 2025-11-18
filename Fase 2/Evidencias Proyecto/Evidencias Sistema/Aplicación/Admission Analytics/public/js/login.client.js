(function () {
  console.debug("[login.client] script cargado");

  function init() {
    console.debug("[login.client] init()");

    const form = document.getElementById("login-form");
    if (!form) {
      console.warn("[login.client] No se encontró #login-form");
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const errorBox = document.getElementById("login-error");
    const errorMsg = document.getElementById("error-message");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function showError(message) {
      if (!errorMsg || !errorBox) return;
      errorMsg.textContent = message;
      errorBox.classList.remove("hidden", "opacity-0", "translate-y-1");
      errorBox.classList.add(
        "opacity-100",
        "translate-y-0",
        "transition-all",
        "duration-300",
        "ease-in-out"
      );
    }

    function hideError() {
      if (!errorMsg || !errorBox) return;
      errorBox.classList.remove("opacity-100", "translate-y-0");
      errorBox.classList.add(
        "opacity-0",
        "translate-y-1",
        "transition-all",
        "duration-300",
        "ease-in-out"
      );
      setTimeout(function () {
        errorMsg.textContent = "";
        errorBox.classList.add("hidden");
      }, 300);
    }

    // Validación en vivo del correo
    if (emailInput) {
      emailInput.addEventListener("input", function () {
        const email = emailInput.value.trim().toLowerCase();
        if (email.length > 0 && !emailRegex.test(email)) {
          showError("Formato de correo inválido.");
        } else {
          hideError();
        }
      });
    }

    // Submit
    form.addEventListener("submit", async function (e) {
      console.debug("[login.client] submit");
      e.preventDefault();

      if (!btn || !emailInput || !passwordInput) {
        console.error("[login.client] Faltan elementos del formulario");
        return;
      }

      hideError();
      btn.disabled = true;

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      if (!email || !password) {
        showError("Por favor complete todos los campos.");
        btn.disabled = false;
        return;
      }

      if (!emailRegex.test(email)) {
        showError("Formato de correo inválido. Ejemplo: persona@duocuc.cl");
        btn.disabled = false;
        return;
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect") || params.get("next");
        const endpoint = redirect
          ? "/api/auth/login?next=" + encodeURIComponent(redirect)
          : "/api/auth/login";

        console.debug("[login.client] fetch", endpoint);

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, password: password }),
        });

        const apiResponse = await res.json();
        console.debug("[login.client] respuesta", apiResponse);

        if (!res.ok || !apiResponse.ok) {
          const message =
            apiResponse.message ||
            "Credenciales inválidas o error de servidor.";
          throw new Error(message);
        }

        const next = apiResponse.next || "/";
        console.debug("[login.client] redirect a", next);
        window.location.href = next;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Error desconocido, inténtelo nuevamente.";
        showError(message);
        console.error("[login.client] error", err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();