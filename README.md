# Ruta de Dominio IA

Página de estudios del equipo para la **Propuesta de Capacitación · Proyectos 2026–2027**, con un plan basado en Claude.

Página publicada: https://francocarloss.github.io/capacitacionproyectos/

## Cómo funciona

1. Cada persona entra eligiendo su nombre.
2. La primera vez crea su **avatar estilo anime** y configura su **reto**: horas por semana, perfil (general o técnico) y fecha de inicio.
3. La página calcula cuándo termina cada curso con ese reto y mide el cumplimiento: horas registradas ÷ horas que debería llevar hoy.

## Secciones

- **Mi ruta:** el plan curso por curso, con fechas, horas y estado.
- **Registrar:** horas por curso, con nota y enlace de evidencia.
- **Entrenamiento:** quiz, *Detecta la alucinación*, laboratorio de prompts, tarjetas y reto de la semana, con puntos e insignias.
- **Equipo:** tablero de cumplimiento de las 5 personas.
- **Mi perfil:** cambiar el avatar o el reto.

Tiene modo día y modo noche (botón del sol o la luna).

## Base de datos (Supabase)

- **Proyecto:** `capacitacion-proyectos`.
- **Esquema:** `supabase/schema.sql`.
- **Tablas:** `members`, `progress_logs`, `course_status` y `training_results`.

La página usa la clave publicable. Las reglas de la base de datos (RLS) permiten leer y registrar avances solo de los 5 integrantes. No se pueden crear integrantes nuevos.

> Como el acceso es solo eligiendo el nombre, cualquier persona con el enlace podría registrar avances a nombre de otra. Es una decisión de simplicidad para un equipo interno.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html`, `styles.css` | Estructura y diseño |
| `app.js` | Lógica: acceso, cálculo del plan, registro, entrenamiento y tablero |
| `avatar.js` | Generador de avatares anime en SVG |
| `data.js` | Cursos, equipo y contenido del entrenamiento (las horas "est." son estimadas) |
| `config.js` | Conexión a Supabase |
