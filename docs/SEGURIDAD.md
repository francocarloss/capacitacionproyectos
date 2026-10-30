# Seguridad · Ruta de Dominio IA

Responsable: SISO (`.claude/agents/siso.md`). Este documento resume las amenazas, los controles y el estado de las pruebas.

## Controles implementados

| Amenaza | Control |
|---|---|
| Ver las respuestas de Demuestra | La tabla `questions` no tiene políticas RLS, así que nadie la lee desde la web. `start_lesson` envía preguntas sin respuesta y `check_answer` revela la respuesta solo después de contestar. |
| Falsear dominio u horas | La calificación, las vidas, el desbloqueo y las horas viven en `lesson_sessions` y `module_mastery`, que solo se escriben mediante RPC. Repetir el cierre de una lección no duplica horas. |
| Elegir IAs del equipo | Solo quien administra el equipo puede cambiarlas, mediante `set_team_ais`, que valida la lista con `valid_ais()`. |
| Saltar módulos | `start_lesson` exige haber aprobado el módulo anterior. |
| Ver datos de otros equipos | Las políticas RLS usan `is_teammate()`: solo ves lo tuyo y lo de tu equipo. |
| Editar a otros o escalar privilegios | `profiles` solo permite actualizar tu fila y columnas concretas. Equipos y membresías solo cambian mediante RPC con validaciones. |
| Adivinar códigos de equipo | Son 10 caracteres hexadecimales aleatorios (unos 1.1 billones de combinaciones) y cada intento fallido espera 0.5 s. |
| Abuso | Hay un límite de 60 lecciones por hora y 5 equipos creados por día, y el tamaño de cada campo está limitado. |
| XSS | Todo dato se escapa con `esc()`. El avatar se valida contra listas cerradas (`sanitizeAvatar`) y la CSP no permite scripts en línea. |
| Scripts de terceros alterados | supabase-js tiene versión fija y verificación de integridad (SRI). |
| Clickjacking y fugas de referencia | En Netlify: `frame-ancestors 'none'`, `X-Frame-Options`, `Referrer-Policy` y HSTS. |
| Secretos en el código | El frontend solo usa la clave publicable. El banco de preguntas está en `.gitignore`. |

## Pruebas

- `supabase/3_prueba_seguridad.sql`: 26 casos. **Resultado: 26 de 26 pasan.**
- **Auditoría del SISO (v3):** se verificaron 13 controles. Hubo 4 hallazgos:
  - **H-01 (medio):** se podían inflar los puntos de práctica.
  - **H-02 (bajo):** las respuestas de un módulo se pueden descubrir sacrificando vidas, porque cada módulo tiene un banco fijo de 3 preguntas.
  - **H-03 (bajo):** la base de datos no saneaba el nombre ni el avatar.
  - **H-04 (bajo):** no se podía borrar la práctica propia.

  H-01, H-03 y H-04 se corrigen con la primera sección de `supabase/7_multi_ia.sql` (reemplaza a `6_endurecimiento_siso.sql`) y con el tope de puntos en `js/state.js`. **Pendiente:** esa sección borra filas inválidas, así que debe ejecutarse desde el SQL Editor; la parte multi-IA ya está aplicada. H-02 queda en el roadmap: ampliar el banco a 6 o más preguntas por módulo.
- **QA de punta a punta (v3):** sin defectos bloqueantes ni altos. Se corrigieron:
  - desplazamiento horizontal de Demuestra en celular;
  - foco atrapado dentro de la lección;
  - indicador mientras se calcula el resultado;
  - foco al cambiar de vista;
  - limpieza de la dirección al cerrar sesión.

- **Auditoría del SISO (v4 multi-IA):** 16 controles verificados, sin hallazgos críticos ni altos. Con `supabase/9_correcciones_siso_v4.sql` (aplicado) se corrigieron:
  - aprobar sin saber, porque la respuesta se revelaba al fallar: ahora hay que acertar a la primera todas las preguntas menos una, y la respuesta no se muestra mientras la lección sigue activa;
  - sesiones cerradas que se volvían a procesar;
  - IAs repetidas en `ais`;
  - formato de `courses` (URL https, `modules` como arreglo, `id` seguro);
  - lecciones de cursos fuera de la ruta;
  - nombres con `<` o `>` al registrarse.

  También se rotaron 2 preguntas que coincidían con el historial público. Queda pendiente igualar la longitud de las opciones: hoy la respuesta correcta suele ser la más larga.

## Pendientes de configuración (panel de Supabase, Authentication)

1. **Sign In / Providers → Email:** mantener **Confirm email** activo y poner la longitud mínima de contraseña en **10**.
2. **Attack Protection:** activar la **protección contra contraseñas filtradas** (requiere plan Pro) y CAPTCHA si aparecen registros abusivos.
3. **URL Configuration:** en **Site URL** poner `https://francocarloss.github.io/capacitacionproyectos/`. En **Redirect URLs** agregar esa misma dirección y, cuando exista, la de Netlify.
4. **SMTP:** configurar un proveedor propio. El correo de Supabase por defecto solo envía a miembros de la organización y con límites muy bajos.

## Riesgos aceptados

- Las preguntas originales estuvieron en el historial público de Git (versión anterior). **Mitigación:** ampliar y rotar el banco de preguntas, y migrar a un repositorio privado al pasar a Netlify.
- Las prácticas de Entrenamiento se califican en el navegador. Solo dan puntos, no dominio ni horas.
- GitHub Pages no permite cabeceras HTTP propias. La CSP va como `<meta>`; la protección contra iframes se completa en Netlify.
