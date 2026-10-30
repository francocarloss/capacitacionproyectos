// Contenido de práctica de la sección Entrenamiento.
// Los cursos (por IA y competencia) y las preguntas de "Demuestra" viven en la base de datos.

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
