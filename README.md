# Ruta de Dominio IA

Página de estudios del equipo para la **Propuesta de Capacitación · Proyectos 2026–2027**, con un plan basado en Claude.

Cada persona configura su reto (horas por semana y fecha de inicio). La página calcula cuándo termina cada curso y mide el avance contra ese compromiso. Los avances se guardan en Supabase.

## Qué incluye

- **Mi ruta:** el plan curso por curso, con las fechas calculadas según tu reto, las horas registradas y el estado de cada curso.
- **Registrar:** horas por curso, con nota y enlace de evidencia.
- **Entrenamiento:** quiz, *Detecta la alucinación*, laboratorio de prompts, tarjetas de repaso y reto de la semana, con puntos e insignias.
- **Equipo:** el cumplimiento de cada persona (horas registradas ÷ horas que debería llevar hoy).
- **Mi reto:** cambiar las horas por semana, el perfil o la fecha de inicio.

Si `config.js` está vacío, la página funciona en **modo demostración** y guarda los datos solo en el navegador.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y pulsa **Run**.
3. En **Authentication → Users → Invite user**, invita el correo de cada una de las 5 personas.
4. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**. Así solo entran las personas invitadas.
5. En **Authentication → URL Configuration**, pon la dirección de GitHub Pages (paso 2) en **Site URL** y en **Redirect URLs**.
6. En **Project Settings → API**, copia la **Project URL** y la **anon public key** en `config.js`.

> Nunca pongas la **service_role key** en este repositorio.

### 2. GitHub Pages

1. Sube estos archivos a un repositorio de GitHub.
2. Ve a **Settings → Pages → Build and deployment**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. La página queda en `https://<usuario>.github.io/<repositorio>/`.

### 3. Primer ingreso

Cada persona escribe su correo y recibe un enlace de acceso. Al entrar por primera vez:

1. Elige su nombre. Cada nombre solo puede elegirse una vez.
2. Elige su perfil: **General** o **Técnico**.
3. Define sus horas por semana y su fecha de inicio.

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de la página |
| `styles.css` | Estilos (tema claro y oscuro) |
| `app.js` | Lógica: acceso, cálculo del plan, registro, entrenamiento y tablero |
| `data.js` | Catálogo de cursos, equipo y contenido del entrenamiento |
| `config.js` | Conexión a Supabase |
| `supabase/schema.sql` | Tablas y reglas de seguridad |

Las horas marcadas como **est.** en `data.js` son estimadas, porque el proveedor no publica la duración exacta. Se pueden ajustar ahí.
