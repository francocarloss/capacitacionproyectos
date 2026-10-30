// Catálogo de cursos (datos de presentación) y contenido de práctica.
// Las horas oficiales y las preguntas de "Demuestra" viven en la base de datos.
// Las horas marcadas con est:true son estimaciones (el proveedor no publica la duración exacta).



// track: "todos" | "tecnico" | "general" (general = reemplazo para perfiles no técnicos)
export const COURSES = [
  { id: "c101", name: "Claude 101", org: "Anthropic Academy", track: "todos", hours: 3.5, est: false,
    detail: "13 lecciones (~2.5 h) + 1 h de práctica en tu trabajo diario.",
    url: "https://anthropic.skilljar.com/",
    learn: "Redactar, resumir y analizar documentos con Claude, y organizar el trabajo en Projects.",
    modules: ["Primeros pasos con Claude", "Conversaciones y archivos", "Projects para el trabajo diario", "Buenas prácticas de uso"] },
  { id: "fluency", name: "AI Fluency: Framework & Foundations", org: "Anthropic Academy", track: "todos", hours: 4, est: true,
    detail: "Marco de las 4D: Delegación, Descripción, Discernimiento y Diligencia.",
    url: "https://anthropic.skilljar.com/",
    learn: "Decidir qué delegar a la IA, dar instrucciones claras y revisar con criterio lo que entrega.",
    modules: ["Delegación", "Descripción", "Discernimiento", "Diligencia"] },
  { id: "cowork", name: "Introduction to Claude Cowork", org: "Anthropic Academy", track: "todos", hours: 2, est: true,
    detail: "Ruta Claude for Work: Claude en equipo.",
    url: "https://anthropic.skilljar.com/",
    learn: "Compartir proyectos y flujos con Claude entre compañeros de área.",
    modules: ["Claude en equipo", "Proyectos compartidos", "Flujos entre áreas"] },
  { id: "smb", name: "AI Fluency for Small Businesses", org: "Anthropic Academy", track: "todos", hours: 2.5, est: true,
    detail: "IA aplicada a operaciones, soporte y marketing.",
    url: "https://anthropic.skilljar.com/",
    learn: "Aplicar Claude a atención de clientes, soporte y campañas.",
    modules: ["Operaciones diarias", "Soporte y tickets", "Marketing y ventas"] },
  { id: "code101", name: "Claude Code 101", org: "Anthropic Academy", track: "tecnico", hours: 3, est: false,
    detail: "12 lecciones (~1.5 h) + 1.5 h de práctica.",
    url: "https://anthropic.skilljar.com/",
    learn: "Pedirle a Claude que escriba, corrija y ejecute scripts que automatizan tareas.",
    modules: ["Instalar y configurar", "Pedirle cambios al código", "Ejecutar y corregir scripts"] },
  { id: "mcp", name: "Introduction to Model Context Protocol", org: "Anthropic Academy", track: "tecnico", hours: 3, est: false,
    detail: "10 lecciones (~1 h) + 2 h de práctica.",
    url: "https://anthropic.skilljar.com/",
    learn: "Conectar Claude con el CRM, ERP o bases de datos de la empresa.",
    modules: ["Tools", "Resources", "Prompts", "Servidores y clientes MCP"] },
  { id: "api", name: "Building with the Claude API", org: "Anthropic Academy", track: "tecnico", hours: 6, est: true,
    detail: "Construir aplicaciones con la API (el uso de la API se paga aparte).",
    url: "https://anthropic.skilljar.com/",
    learn: "Integrar Claude en sistemas propios: chatbots, extracción de datos y agentes.",
    modules: ["Llamadas a la API", "Uso de herramientas", "Extracción de datos", "Agentes"] },
  { id: "proyecto", name: "Proyecto de área con Claude", org: "Interno", track: "general", hours: 6, est: true,
    detail: "Reemplaza Claude Code, MCP y API para perfiles no técnicos.",
    url: "",
    learn: "Llevar dos procesos reales de tu área a un flujo de trabajo con Claude y documentar el ahorro de tiempo.",
    modules: ["Elegir 2 procesos repetitivos", "Diseñar el flujo con Claude", "Medir el tiempo antes y después", "Presentar el resultado"] },
  { id: "n8n1", name: "n8n Essentials: Your First Workflows", org: "n8n Academy", track: "todos", hours: 3, est: true,
    detail: "Level 1 gratuito.",
    url: "https://learn.n8n.io/",
    learn: "Crear tu primera automatización, por ejemplo de correo a hoja de cálculo con IA.",
    modules: ["Navegar el editor", "Estructura de datos", "Nodos y flujos"] },
  { id: "n8n2", name: "n8n Level 2: Working with Data", org: "n8n Academy", track: "todos", hours: 4, est: false,
    detail: "~2 h de curso + 2 h construyendo una automatización de tu área.",
    url: "https://docs.n8n.io/courses/level-two",
    learn: "Mover datos entre sistemas y manejar errores en tus automatizaciones.",
    modules: ["XML y HTML", "Fechas y archivos", "Manejo de errores"] },
  { id: "prep", name: "Preparación examen Claude Certified Associate", org: "Interno", track: "todos", hours: 6, est: true,
    detail: "Repaso de los 7 dominios del CCAO-F y simulacros en la sección Entrenamiento.",
    url: "",
    learn: "Dominar evaluación de respuestas, integración en flujos, gobierno, prompting, selección de modelo, gestión de conocimiento y optimización.",
    modules: ["Evaluación y validación (21%)", "Integración en flujos (16%)", "Gobierno y riesgo (15%)", "Prompting (14%)", "Producto y modelo (12%)", "Gestión de conocimiento (12%)", "Optimización (10%)"] }

];

export const SKIPPED = [
  { name: "OpenAI · AI Foundations", why: "Lo cubren Claude 101 y AI Fluency (instrucciones claras, contexto y revisión de respuestas)." },
  { name: "OpenAI · Applied AI Foundations", why: "Lo cubren AI Fluency y Claude Cowork (llevar una tarea real del puesto a la IA)." },
  { name: "Google AI Essentials", why: "Prompting, uso responsable y productividad ya están en AI Fluency y Claude 101." },
  { name: "DeepLearning.AI · Generative AI for Everyone", why: "Los fundamentos de IA generativa ya están en AI Fluency." },
  { name: "OpenAI · Agents and Workflows", why: "Para perfiles técnicos lo cubren Claude API y MCP; para el resto, n8n." }
];
export const OPTIONAL = [
  { name: "Examen oficial Claude Certified Associate (CCAO-F)", why: "60 preguntas en 120 min, USD 99. Requiere que la empresa sea Claude Partner. Tu preparación es el curso de repaso de esta ruta." },
  { name: "Microsoft AB-730 AI Business Professional", why: "Solo si el equipo trabaja con Microsoft 365 Copilot. ~USD 165." },
  { name: "Google Cloud Generative AI Leader", why: "Opcional para líderes que definan la estrategia de IA. ~USD 99." }
];

// ---------- Entrenamiento ----------
export const QUIZ = [
  { q: "Vas a pedirle a Claude un resumen de un contrato para tu jefe. ¿Qué agrega más valor al prompt?",
    o: ["Escribir 'resume esto' en mayúsculas", "Decir para quién es, qué decisiones debe tomar y el formato deseado", "Pedir que lo haga lo más largo posible", "Pegar el contrato dos veces"], a: 1,
    e: "El contexto (quién lo leerá, para qué) y el formato son lo que más mejora el resultado. Es el principio de Descripción de AI Fluency." },
  { q: "Claude te da una cifra de ventas que no reconoces. ¿Qué haces?",
    o: ["La uso, la IA no se equivoca", "Le pido la fuente y la verifico contra el dato original", "La redondeo", "Borro la conversación"], a: 1,
    e: "Discernimiento: los modelos pueden inventar datos con seguridad. Toda cifra que vayas a usar se verifica contra la fuente." },
  { q: "¿Qué tarea es mejor NO delegar por completo a la IA?",
    o: ["Primer borrador de un correo", "Lluvia de ideas para un evento", "Aprobar un pago a un proveedor", "Resumir notas de una reunión"], a: 2,
    e: "Delegación: las decisiones con consecuencias legales o financieras quedan en manos de una persona; la IA puede preparar la información." },
  { q: "¿Para qué sirven los Projects en Claude?",
    o: ["Para jugar", "Para guardar instrucciones y documentos que Claude usa en todas las conversaciones de ese proyecto", "Para borrar el historial", "Para pagar menos"], a: 1,
    e: "Un Project mantiene el contexto (archivos e instrucciones) para que no tengas que repetirlo en cada chat." },
  { q: "Antes de pegar información en Claude, ¿qué revisas primero?",
    o: ["Que no tenga faltas de ortografía", "Que no incluya datos sensibles que la política de la empresa prohíba compartir", "Que sea corta", "Que esté en inglés"], a: 1,
    e: "Diligencia y gobierno: respeta la política de datos de la empresa, incluso con herramientas aprobadas." },
  { q: "¿Qué es MCP (Model Context Protocol)?",
    o: ["Un modelo nuevo de Claude", "Un estándar para conectar Claude con herramientas y datos externos", "Un tipo de licencia", "Una red social"], a: 1,
    e: "MCP define herramientas (tools), recursos (resources) y prompts para que Claude trabaje con tus sistemas." },
  { q: "En n8n, ¿qué es un 'nodo'?",
    o: ["Un usuario", "Un paso del flujo: leer un correo, llamar a Claude, escribir en una hoja", "Un error", "Una contraseña"], a: 1,
    e: "Un flujo de n8n es una cadena de nodos; cada uno hace una acción y le pasa los datos al siguiente." },
  { q: "El dominio con más peso en el examen Claude Certified Associate es…",
    o: ["Selección de producto y modelo", "Evaluación y validación de respuestas", "Optimización", "Configuración"], a: 1,
    e: "Evaluación y validación de respuestas pesa 21%: detectar alucinaciones, sesgos y cuándo se necesita revisión humana." },
  { q: "Pediste un análisis y Claude respondió algo general. ¿Cuál es el mejor siguiente paso?",
    o: ["Rendirte", "Iterar: dar más contexto, un ejemplo del resultado esperado y criterios concretos", "Repetir el mismo prompt", "Cambiar de computadora"], a: 1,
    e: "Iterar con contexto y ejemplos es la técnica más efectiva para mejorar una respuesta." },
  { q: "¿Qué indicador muestra mejor el impacto de la IA en tu área?",
    o: ["Cuántos chats abriste", "Tiempo ahorrado por tarea medido antes y después", "Cuántas palabras escribió Claude", "Cuántos colores tiene el reporte"], a: 1,
    e: "Mide el tiempo (o errores) antes y después en un proceso real: es lo que se presenta a dirección." }
];

export const HALLU = [
  { title: "Reporte de ventas",
    ask: "Resume las ventas del trimestre a partir de este dato: Q3 vendimos 1,240 unidades, 8% más que Q2.",
    sentences: [
      { t: "En el tercer trimestre se vendieron 1,240 unidades.", bad: false },
      { t: "Esto representa un crecimiento de 8% respecto al trimestre anterior.", bad: false },
      { t: "El crecimiento se debió principalmente a la nueva campaña en redes sociales.", bad: true, why: "El dato original no dice la causa: la IA la inventó." },
      { t: "En Q2 se vendieron aproximadamente 1,148 unidades.", bad: false, note: "Es un cálculo correcto (1,240 / 1.08 ≈ 1,148)." },
      { t: "Es el mejor trimestre en la historia de la empresa.", bad: true, why: "No hay datos históricos en la pregunta: afirmación sin fuente." }
    ] },
  { title: "Política de vacaciones",
    ask: "Según el reglamento interno adjunto (15 días hábiles al año, solicitud con 10 días de anticipación), ¿cómo pido vacaciones?",
    sentences: [
      { t: "Tienes derecho a 15 días hábiles de vacaciones al año.", bad: false },
      { t: "Debes solicitarlas con al menos 10 días de anticipación.", bad: false },
      { t: "La solicitud se aprueba automáticamente en 24 horas.", bad: true, why: "El reglamento no menciona aprobación automática ni plazos de respuesta." },
      { t: "Los días no usados se pagan en efectivo al final del año.", bad: true, why: "No aparece en el texto; podría contradecir la política real." }
    ] },
  { title: "Cita de un curso",
    ask: "¿Qué cubre el curso Claude 101 de Anthropic Academy?",
    sentences: [
      { t: "Enseña a usar Claude para tareas de trabajo diarias.", bad: false },
      { t: "Cubre las funciones principales de Claude.", bad: false },
      { t: "Al terminarlo recibes un título universitario reconocido por el Ministerio de Educación.", bad: true, why: "Anthropic Academy da un certificado de finalización, no un título universitario." },
      { t: "Es gratuito y se hace a tu ritmo.", bad: false }
    ] }
];

export const PROMPT_LAB = [
  { weak: "hazme un correo", context: "Tienes que avisar a un cliente que su pedido llega 3 días tarde.",
    tip: "Indica a quién va, qué pasó, el tono y qué quieres que haga el cliente." },
  { weak: "analiza esto", context: "Tienes una tabla de quejas de clientes del último mes y quieres saber qué corregir primero.",
    tip: "Di qué datos tiene la tabla, qué decisión vas a tomar y en qué formato quieres el resultado." },
  { weak: "dame ideas", context: "Necesitas actividades para capacitar a tu área en IA en 30 minutos semanales.",
    tip: "Define la audiencia, el tiempo, la cantidad de ideas y cómo quieres que se presenten." }
];
export const RUBRIC = [
  { id: "rol", label: "Rol o contexto de quién pide", re: /(soy|eres|act[úu]a|como (un|una)|mi (área|equipo|puesto)|trabajo en)/i },
  { id: "aud", label: "Para quién es el resultado", re: /(cliente|jefe|gerente|equipo|direcci[óo]n|audiencia|lector|para (el|la|los|las|mi))/i },
  { id: "obj", label: "Objetivo o decisión", re: /(objetivo|para (decidir|saber|que)|necesito|quiero que|meta|prop[óo]sito)/i },
  { id: "fmt", label: "Formato de salida", re: /(tabla|lista|vi[ñn]etas|p[áa]rrafo|puntos|resumen de|formato|columnas|pasos)/i },
  { id: "lim", label: "Límites (largo, tono, plazo)", re: /(m[áa]ximo|m[íi]nimo|palabras|l[íi]neas|tono|formal|amable|breve|corto|\d+\s*(ideas|puntos|minutos|d[íi]as))/i },
  { id: "dato", label: "Datos concretos del caso", re: /(\d|pedido|tabla|queja|fecha|producto|proceso)/i }
];

export const CARDS = [
  ["Delegación", "Decidir qué parte del trabajo hace la IA y qué parte haces tú."],
  ["Descripción", "Explicar con claridad la tarea, el contexto y el formato que esperas."],
  ["Discernimiento", "Evaluar con criterio lo que la IA entrega antes de usarlo."],
  ["Diligencia", "Usar la IA de forma responsable, transparente y segura."],
  ["Alucinación", "Información falsa que el modelo presenta como cierta."],
  ["Project (Claude)", "Espacio con instrucciones y archivos que Claude usa en todas sus conversaciones."],
  ["Prompt", "La instrucción que le das a la IA."],
  ["Iterar", "Mejorar el resultado en varias rondas, agregando contexto o ejemplos."],
  ["MCP", "Estándar para conectar Claude con herramientas y datos externos."],
  ["Tool use", "Capacidad de Claude de usar herramientas (buscar, calcular, consultar sistemas)."],
  ["Nodo (n8n)", "Un paso de una automatización: leer, transformar o enviar datos."],
  ["Revisión humana", "Una persona valida el resultado cuando el riesgo o el impacto es alto."]
];

export const CHALLENGES = [
  "Usa Claude para redactar 3 correos reales de tu semana. Anota cuánto tiempo te ahorraste.",
  "Crea un Project en Claude con los documentos de tu área y úsalo en 2 conversaciones.",
  "Toma una respuesta de Claude y encuentra al menos un dato que tuviste que verificar.",
  "Comparte un flujo de trabajo con Claude con un compañero y pídele retroalimentación.",
  "Aplica Claude a un caso de servicio al cliente o de marketing de tu área.",
  "Identifica 2 procesos repetitivos de tu área que se puedan automatizar.",
  "Diseña (en papel) cómo Claude se conectaría con un sistema de la empresa.",
  "Construye tu primera automatización en n8n, aunque sea sencilla.",
  "Mejora tu automatización: agrega manejo de errores y pruébala con datos reales.",
  "Mide el tiempo de un proceso antes y después de usar IA.",
  "Responde los 10 quizzes del Entrenamiento con al menos 80%.",
  "Presenta al equipo tu mejor caso de uso en 5 minutos."
];
