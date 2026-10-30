// Estado de la aplicación y cálculos derivados (plan, cumplimiento, dominio, puntos, insignias).
import { Api } from "./api.js";
import { QUIZ, HALLU } from "./catalog.js";
import { DAY, parseDate, fmtDate } from "./util.js";

export const S = { user: null, profile: null, courses: [], profiles: [], mastery: [], training: [], team: null, members: [] };
export const ctx = { render: () => {} };
export const COLORS = ["c-violet", "c-claude", "c-mint", "c-sky", "c-rose", "c-sun"];

export async function loadAll() {
  const [courses, profiles, mastery, training, team, members] = await Promise.all([
    S.courses.length ? S.courses : Api.courses(), Api.profiles(), Api.mastery(), Api.training(), Api.myTeam(), Api.teamMembers()
  ]);
  Object.assign(S, { courses, profiles, mastery, training, team, members });
  S.profile = profiles.find(p => p.id === S.user.id) || S.profile;
}

// IAs que puede elegir un equipo y competencias que permiten comparar cursos entre IAs
export const AIS = { claude: { name: "Claude", c: "#d97757" }, chatgpt: { name: "ChatGPT", c: "#10a37f" }, copilot: { name: "Copilot", c: "#3b8cf0" }, gemini: { name: "Gemini", c: "#8b5cf6" } };
export const TOPICS = { fundamentos: "Fundamentos", criterio: "Criterio y uso responsable", colaboracion: "Colaboración", negocio: "Negocio", avanzado: "Avanzado (técnico)", proyecto: "Proyecto de área", automatizacion: "Automatización", certificacion: "Certificación" };
const TOPIC_ORDER = Object.keys(TOPICS);
export const aiName = ai => (AIS[ai] || { name: "Común" }).name;
// El equipo decide las IAs; sin equipo, cada persona en su perfil
export function aisFor(p) {
  const list = S.team && (!p.id || S.members.some(m => m.user_id === p.id)) ? S.team.ais : p.ais; // sin id = vista previa propia
  const set = list && list.length ? list : ["claude"];
  return Object.keys(AIS).filter(a => set.includes(a));
}
// Plan = cursos de las IAs elegidas + comunes, ordenados por competencia para avanzar en paralelo
export function planFor(p) {
  const track = p.profile_type === "tecnico" ? "tecnico" : "general", ais = aisFor(p);
  return S.courses.filter(c => (c.track === "todos" || c.track === track) && (c.ai === "comun" || ais.includes(c.ai)))
    .sort((a, b) => TOPIC_ORDER.indexOf(a.topic) - TOPIC_ORDER.indexOf(b.topic) || ais.indexOf(a.ai) - ais.indexOf(b.ai) || a.sort - b.sort)
    .map(c => ({ ...c, hours: Number(c.hours), modules: c.modules || [] }));
}
// Cursos equivalentes: misma competencia, otra IA
export const equivalents = (c, plan) => c.ai === "comun" ? [] : plan.filter(x => x.topic === c.topic && x.ai !== c.ai && x.ai !== "comun");
export function schedule(p) {
  const H = Number(p.hours_per_week) || 1, start = parseDate(p.start_date); let cum = 0;
  return planFor(p).map(c => { const a = cum; cum += c.hours;
    return { ...c, startAt: new Date(start.getTime() + a / H * 7 * DAY), endAt: new Date(start.getTime() + cum / H * 7 * DAY), cumHours: cum }; });
}

export function mastery(p) {
  const rows = S.mastery.filter(m => m.user_id === p.id), key = r => r.course_id + ":" + r.module_idx;
  const passed = new Set(rows.map(key)), perfect = new Set(rows.filter(r => r.perfect).map(key));
  const xp = rows.reduce((a, r) => a + r.xp, 0), hours = rows.reduce((a, r) => a + Number(r.hours_credited), 0);
  const byCourse = {}; let total = 0, done = 0;
  planFor(p).forEach(c => { const n = c.modules.length; if (!n) return;
    const k = c.modules.filter((_, i) => passed.has(c.id + ":" + i)).length;
    byCourse[c.id] = { n, k, pct: Math.round(k / n * 100), verified: k === n }; total += n; done += k; });
  const verified = Object.entries(byCourse).filter(([, v]) => v.verified).map(([id]) => id);
  return { rows, passed, perfect, xp, hours, byCourse, total, done, pct: total ? Math.round(done / total * 100) : 0, verified };
}

// El avance se mide con las horas que acreditó el servidor al aprobar módulos (no se registran a mano)
export function metrics(p) {
  const plan = schedule(p), total = plan.length ? plan[plan.length - 1].cumHours : 0, ms = mastery(p);
  const now = new Date(), start = parseDate(p.start_date), weeks = Math.max(0, (now - start) / (7 * DAY));
  const actual = ms.hours, expected = Math.min(total, weeks * Number(p.hours_per_week)), diff = actual - expected;
  let status = { k: "ok", t: "Al día", say: "¡Vas al día!" };
  if (now < start) status = { k: "vio", t: "Inicia " + fmtDate(start), say: "¡Ya casi empezamos!" };
  else if (diff >= 0.5) status = { k: "ok", t: "Adelantado", say: "¡Vas adelantado!" };
  else if (diff < -1) status = { k: "bad", t: "Atrasado", say: "¡Tú puedes ponerte al día!" };
  const ws = new Date(now.getTime() - ((now.getDay() + 6) % 7) * DAY); ws.setHours(0, 0, 0, 0);
  const thisWeek = ms.rows.filter(r => new Date(r.passed_at) >= ws).reduce((a, r) => a + Number(r.hours_credited), 0);
  const active = new Set(ms.rows.map(r => Math.floor((new Date(r.passed_at) - start) / (7 * DAY))));
  let streak = 0; for (let w = Math.floor(weeks); w >= 0 && active.has(w); w--) streak++;
  const compliance = expected > 0 ? Math.round(actual / expected * 100) : 100;
  return { plan, total, actual, expected, status, thisWeek, streak, compliance, ms,
    end: plan.length ? plan[plan.length - 1].endAt : start, weekIndex: Math.max(0, Math.floor(weeks)) };
}

export function training(p) {
  const t = S.training.filter(x => x.user_id === p.id);
  const best = act => { const m = {}; t.filter(x => x.activity === act).forEach(x => { if (!m[x.item_id] || x.score > m[x.item_id].score) m[x.item_id] = x; }); return Object.values(m); };
  const quiz = best("quiz"), hallu = best("hallu"), prompt = best("prompt"), challenges = [...new Map(t.filter(x => x.activity === "challenge").map(x => [x.item_id, x])).values()];
  const quizScore = quiz.reduce((a, x) => a + Math.min(x.score, x.max_score), 0);
  const cap = x => Math.min(x.score, x.max_score);
  const practice = quiz.reduce((a, x) => a + cap(x), 0) * 10 + hallu.reduce((a, x) => a + cap(x), 0) * 15 + prompt.reduce((a, x) => a + cap(x), 0) * 5 + challenges.length * 30;
  return { quiz, hallu, prompt, quizScore, challenges, points: practice + mastery(p).xp };
}

export function badges(p) {
  const m = metrics(p), tr = training(p);
  return [
    { t: "Primer módulo", on: m.ms.done > 0 }, { t: "Racha de 3 semanas", on: m.streak >= 3 },
    { t: "Mitad de ruta", on: m.ms.total > 0 && m.ms.done >= m.ms.total / 2 }, { t: "Curso verificado", on: m.ms.verified.length > 0 },
    { t: "Mente maestra", on: m.ms.total > 0 && m.ms.done === m.ms.total }, { t: "Quiz 80%", on: tr.quizScore >= Math.ceil(QUIZ.length * .8) },
    { t: "Detective", on: tr.hallu.length >= HALLU.length && tr.hallu.every(h => h.score === h.max_score) },
    { t: "Prompt pro", on: tr.prompt.some(x => x.score === x.max_score) }, { t: "Retador", on: tr.challenges.length >= 3 }
  ];
}
