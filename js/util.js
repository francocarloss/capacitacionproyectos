// Utilidades compartidas: escape de HTML, fechas, avisos y tema día/noche.
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const DAY = 86400000;
export const fmtDate = d => d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
export const parseDate = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
export const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const h1 = n => (Math.round(n * 10) / 10).toLocaleString("es");
export const firstName = n => String(n || "").trim().split(/\s+/)[0] || "";
export const initials = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const local = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("ruta-ia:" + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("ruta-ia:" + k, JSON.stringify(v)); } catch (e) {} }
};

export function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 3200);
}

// Traduce errores técnicos a mensajes claros para la persona
export function niceError(err) {
  const m = String(err?.message || err || "");
  if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/Email not confirmed/i.test(m)) return "Confirma tu correo con el enlace que te enviamos antes de entrar.";
  if (/User already registered/i.test(m)) return "Ya existe una cuenta con ese correo. Inicia sesión.";
  if (/rate limit|too many/i.test(m)) return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  if (/JWT|session/i.test(m)) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  return m.replace(/^.*?ERROR:\s*/, "") || "Ocurrió un error inesperado.";
}

const SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>`;
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
export function initTheme() {
  const b = $("#b-theme");
  const paint = () => { b.innerHTML = isDark() ? SUN : MOON; b.setAttribute("aria-label", isDark() ? "Cambiar a modo día" : "Cambiar a modo noche"); };
  b.addEventListener("click", () => { const t = isDark() ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("ruta-ia:theme", t); } catch (e) {} paint(); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paint);
  paint();
}
