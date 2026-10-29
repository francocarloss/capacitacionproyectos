(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CFG = window.RUTA_CONFIG || {};
const DEMO = !(CFG.SUPABASE_URL && CFG.SUPABASE_KEY);
const sb = DEMO ? null : window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, { auth: { persistSession: false } });
const DAY = 86400000;
const AV = window.AVATAR;
const COLORS = ["c-violet", "c-claude", "c-mint", "c-sky", "c-rose", "c-sun"];

const local = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("ruta-ia:" + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("ruta-ia:" + k, JSON.stringify(v)); } catch (e) {} }
};
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 2600); }
const fmtDate = d => d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
const parseDate = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const h1 = n => (Math.round(n * 10) / 10).toLocaleString("es");
const firstName = n => n.split(" ")[0];
const initials = n => { const w = n.split(" "); return (w[0][0] + (w[2] || w[1] || "")[0]).toUpperCase(); };

// ---------------- Tema día / noche ----------------
const SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>`;
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
function paintTheme() { const b = $("#b-theme"); b.innerHTML = isDark() ? SUN : MOON; b.setAttribute("aria-label", isDark() ? "Cambiar a modo día" : "Cambiar a modo noche"); }
$("#b-theme").addEventListener("click", () => { const t = isDark() ? "light" : "dark"; document.documentElement.dataset.theme = t; local.set("theme", t); try { localStorage.setItem("ruta-ia:theme", t); } catch (e) {} paintTheme(); });
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paintTheme);
paintTheme();

// ---------------- Datos (Supabase o demostración) ----------------
const Store = {
  async members() {
    if (DEMO) { const m = local.get("members", null); return m || window.TEAM.map(name => ({ name, configured: false, profile_type: "general" })); }
    const { data, error } = await sb.from("members").select("*"); if (error) throw error; return data;
  },
  async saveMember(m) {
    if (DEMO) { const all = (await Store.members()).map(x => x.name === m.name ? { ...x, ...m } : x); local.set("members", all); return; }
    const { name, ...rest } = m; const { error } = await sb.from("members").update({ ...rest, updated_at: new Date().toISOString() }).eq("name", name); if (error) throw error;
  },
  async logs() { if (DEMO) return local.get("logs", []); const { data, error } = await sb.from("progress_logs").select("*").order("log_date", { ascending: false }); if (error) throw error; return data; },
  async addLog(l) { if (DEMO) { const a = local.get("logs", []); a.unshift({ ...l, id: Date.now() }); local.set("logs", a); return; } const { error } = await sb.from("progress_logs").insert(l); if (error) throw error; },
  async delLog(id) { if (DEMO) { local.set("logs", local.get("logs", []).filter(x => x.id !== id)); return; } const { error } = await sb.from("progress_logs").delete().eq("id", id); if (error) throw error; },
  async statuses() { if (DEMO) return local.get("status", []); const { data, error } = await sb.from("course_status").select("*"); if (error) throw error; return data; },
  async setStatus(s) { if (DEMO) { const a = local.get("status", []).filter(x => !(x.member === s.member && x.course_id === s.course_id)); a.push(s); local.set("status", a); return; } const { error } = await sb.from("course_status").upsert(s); if (error) throw error; },
  async training() { if (DEMO) return local.get("training", []); const { data, error } = await sb.from("training_results").select("*"); if (error) throw error; return data; },
  async addTraining(t) { if (DEMO) { const a = local.get("training", []); a.push({ ...t, created_at: new Date().toISOString() }); local.set("training", a); return; } const { error } = await sb.from("training_results").insert(t); if (error) throw error; }
};
const S = { me: local.get("me", null), members: [], logs: [], statuses: [], training: [] };
const meM = () => S.members.find(m => m.name === S.me);
async function loadAll() { [S.members, S.logs, S.statuses, S.training] = await Promise.all([Store.members(), Store.logs(), Store.statuses(), Store.training()]); }

// ---------------- Cálculos ----------------
const planFor = p => window.COURSES.filter(c => c.track === "todos" || c.track === (p.profile_type === "tecnico" ? "tecnico" : "general"));
function schedule(p) {
  const H = Number(p.hours_per_week) || 1, start = parseDate(p.start_date); let cum = 0;
  return planFor(p).map(c => { const a = cum; cum += c.hours; return { ...c, startAt: new Date(start.getTime() + a / H * 7 * DAY), endAt: new Date(start.getTime() + cum / H * 7 * DAY), cumHours: cum }; });
}
function metrics(p) {
  const plan = schedule(p), total = plan.length ? plan[plan.length - 1].cumHours : 0;
  const logs = S.logs.filter(l => l.member === p.name), done = new Set(S.statuses.filter(s => s.member === p.name && s.status === "completado").map(s => s.course_id));
  const actual = logs.reduce((a, l) => a + Number(l.hours), 0), now = new Date(), start = parseDate(p.start_date);
  const weeks = Math.max(0, (now - start) / (7 * DAY)), expected = Math.min(total, weeks * Number(p.hours_per_week)), diff = actual - expected;
  let status = { k: "ok", t: "Al día", say: "¡Vas al día!" };
  if (now < start) status = { k: "vio", t: "Inicia " + fmtDate(start), say: "¡Ya casi empezamos!" };
  else if (diff >= 1) status = { k: "ok", t: "Adelantado", say: "¡Vas adelantado!" };
  else if (diff < -1) status = { k: "bad", t: "Atrasado", say: "¡Tú puedes ponerte al día!" };
  const ws = new Date(now.getTime() - ((now.getDay() + 6) % 7) * DAY); ws.setHours(0, 0, 0, 0);
  const thisWeek = logs.filter(l => parseDate(l.log_date) >= ws).reduce((a, l) => a + Number(l.hours), 0);
  const active = new Set(logs.map(l => Math.floor((parseDate(l.log_date) - start) / (7 * DAY))));
  let streak = 0; for (let w = Math.floor(weeks); w >= 0 && active.has(w); w--) streak++;
  const compliance = expected > 0 ? Math.round(actual / expected * 100) : 100;
  return { plan, total, actual, expected, done, status, thisWeek, streak, compliance, logs, end: plan.length ? plan[plan.length - 1].endAt : start, weekIndex: Math.max(0, Math.floor(weeks)) };
}
const courseHours = (p, id) => S.logs.filter(l => l.member === p.name && l.course_id === id).reduce((a, l) => a + Number(l.hours), 0);
function training(p) {
  const t = S.training.filter(x => x.member === p.name);
  const best = act => { const m = {}; t.filter(x => x.activity === act).forEach(x => { if (!m[x.item_id] || x.score > m[x.item_id].score) m[x.item_id] = x; }); return Object.values(m); };
  const quiz = best("quiz"), hallu = best("hallu"), prompt = best("prompt"), challenges = t.filter(x => x.activity === "challenge");
  const quizScore = quiz.reduce((a, x) => a + x.score, 0);
  const points = quizScore * 10 + hallu.reduce((a, x) => a + x.score, 0) * 15 + prompt.reduce((a, x) => a + x.score, 0) * 5 + challenges.length * 30;
  return { quiz, hallu, prompt, quizScore, points, challenges };
}
function badges(p) {
  const m = metrics(p), tr = training(p);
  return [
    { t: "Primer paso", on: m.logs.length > 0 }, { t: "Racha de 3 semanas", on: m.streak >= 3 },
    { t: "Mitad de ruta", on: m.total > 0 && m.actual >= m.total / 2 }, { t: "Ruta completa", on: m.plan.length > 0 && m.plan.every(c => m.done.has(c.id)) },
    { t: "Quiz 80%", on: tr.quizScore >= Math.ceil(window.QUIZ.length * .8) },
    { t: "Detective", on: tr.hallu.length >= window.HALLU.length && tr.hallu.every(h => h.score === h.max_score) },
    { t: "Prompt pro", on: tr.prompt.some(x => x.score === x.max_score) }, { t: "Retador", on: tr.challenges.length >= 3 }
  ];
}
const avatarOf = (m, size) => m && m.avatar ? AV.svg(m.avatar, size) : `<div class="silhouette" style="width:${size}px;height:${size}px;font-size:${size / 3}px">${initials(m.name)}</div>`;

// ---------------- Pantallas ----------------
function viewWho() {
  return `${DEMO ? `<div class="demo">Modo demostración: los datos se guardan solo en este navegador.</div>` : ""}
  <section class="banner"><div class="stack"><span class="kicker">Propuesta de Capacitación · Proyectos 2026–2027</span>
    <h1>Tu ruta para dominar la IA con <span class="underline" style="color:#fff">Claude</span></h1>
    <p>Elige tu nombre para entrar. Define tu reto de horas por semana, registra tu avance y entrena con retos didácticos.</p></div>
    <div class="ava">${AV.svg(AV.PRESETS[0].a, 220)}<span class="bubble">¡Hola, equipo!</span></div></section>
  <section class="stack"><h2 class="center">¿Quién eres?</h2>
    <div class="people">${S.members.map(m => `<button class="person" type="button" data-who="${esc(m.name)}">${avatarOf(m, 120)}<span class="nm">${esc(m.name)}</span>
      ${m.configured ? `<span class="pill ${metrics(m).status.k}">${metrics(m).status.t}</span>` : `<span class="pill vio">Crear mi avatar</span>`}</button>`).join("")}</div></section>`;
}

const ED = { step: 1, avatar: null, reto: null };
function viewOnboard() {
  const m = meM();
  return `<section class="stack center"><div class="steps" style="justify-content:center"><span class="${ED.step === 1 ? "on" : ""}">1 · Tu avatar</span><span class="${ED.step === 2 ? "on" : ""}">2 · Tu reto</span></div>
    <h1>${ED.step === 1 ? `¡Hola, ${esc(firstName(m.name))}! Crea tu avatar` : "Configura tu reto semanal"}</h1>
    <p class="muted" style="margin:0">${ED.step === 1 ? "Elige una base y ajústala a tu estilo." : "Tú decides cuántas horas inviertes por semana. Te medimos contra ese compromiso."}</p></section>
  <section class="card">${ED.step === 1 ? editorHTML() : retoHTML(m)}</section>`;
}
function editorHTML() {
  const a = ED.avatar, O = AV.OPTIONS;
  const sw = (k, vals, colorOf) => `<div class="opt-row"><label>${AV.LABELS[k]}</label><div class="opts">${vals.map(v => colorOf
    ? `<button class="sw" type="button" data-av="${k}" data-v="${v}" aria-pressed="${a[k] === v}" aria-label="${AV.PRETTY(v)}" style="background:${colorOf(v)}"></button>`
    : `<button class="o" type="button" data-av="${k}" data-v="${v}" aria-pressed="${a[k] === v}">${AV.PRETTY(v)}</button>`).join("")}</div></div>`;
  return `<div class="editor"><div class="prev"><div id="av-prev">${AV.svg(a, 240)}</div><button class="btn primary" type="button" data-act="av-next">Listo, siguiente →</button></div>
    <div class="stack"><div class="opt-row"><label>Elige una base</label><div class="presets">${AV.PRESETS.map(p => `<button type="button" data-preset="${p.id}" aria-label="${esc(p.label)}" aria-pressed="false">${AV.svg(p.a, 72)}</button>`).join("")}</div></div>
      ${sw("skin", O.skin, v => AV.SKIN[v][0])}${sw("hairStyle", O.hairStyle)}${sw("hairColor", O.hairColor, v => AV.HAIR[v][0])}${sw("streak", O.streak)}
      ${sw("eyes", O.eyes, v => AV.EYES[v])}${sw("beard", O.beard)}${sw("glasses", O.glasses)}${sw("outfit", O.outfit, v => AV.OUTFIT[v].c)}${sw("bg", O.bg, v => v)}</div></div>`;
}
function retoHTML(m) {
  const r = ED.reto;
  return `<form id="f-reto" class="two"><div class="stack">
    <div class="stack"><label for="r-type">Tu perfil</label><select id="r-type"><option value="general" ${r.profile_type === "general" ? "selected" : ""}>General: proyecto de área en lugar de cursos técnicos</option><option value="tecnico" ${r.profile_type === "tecnico" ? "selected" : ""}>Técnico: incluye Claude Code, MCP y API</option></select></div>
    <div class="stack"><label for="r-hours">Horas por semana: <span id="r-hv" style="color:var(--claude)">${h1(r.hours_per_week)} h</span></label><input id="r-hours" type="range" min="1" max="12" step="0.5" value="${r.hours_per_week}"></div>
    <div class="stack"><label for="r-start">Fecha de inicio</label><input id="r-start" type="date" value="${r.start_date}" required></div>
    <div class="row">${ED.from === "perfil" ? "" : `<button class="btn" type="button" data-act="av-back">← Avatar</button>`}<button class="btn primary" type="submit">${m.configured ? "Guardar cambios" : "¡Empezar mi ruta!"}</button></div></div>
    <div class="course c-violet" id="r-prev"></div></form>`;
}
function paintRetoPreview() {
  const r = ED.reto, sc = schedule(r), total = sc[sc.length - 1].cumHours;
  $("#r-prev").innerHTML = `<span class="kicker">Con este reto</span><h2>Terminas el ${fmtDate(sc[sc.length - 1].endAt)}</h2>
    <p>${sc.length} cursos · ${h1(total)} horas · unas ${Math.ceil(total / r.hours_per_week)} semanas.</p>
    <ul class="list">${sc.slice(0, 4).map(c => `<li><b>${esc(c.name)}</b><span class="small muted">Listo el ${fmtDate(c.endAt)}</span></li>`).join("")}<li class="small muted">… y ${sc.length - 4} cursos más.</li></ul>`;
}
function wireOnboard(v) {
  if (ED.step === 2) {
    const f = $("#f-reto", v), upd = () => { ED.reto = { profile_type: $("#r-type").value, hours_per_week: Number($("#r-hours").value), start_date: $("#r-start").value || isoDate(new Date()) }; $("#r-hv").textContent = h1(ED.reto.hours_per_week) + " h"; paintRetoPreview(); };
    f.addEventListener("input", upd); paintRetoPreview();
    f.addEventListener("submit", async e => { e.preventDefault(); upd();
      try { await Store.saveMember({ name: S.me, avatar: ED.avatar, ...ED.reto, configured: true }); await loadAll(); toast("¡Listo! Tu ruta está lista"); location.hash = "#ruta"; render(); }
      catch (err) { toast("No se pudo guardar: " + err.message); } });
  }
  v.addEventListener("click", e => {
    const p = e.target.closest("[data-preset]"); if (p) { ED.avatar = { ...AV.PRESETS.find(x => x.id === p.dataset.preset).a }; render(); return; }
    const o = e.target.closest("[data-av]"); if (o) { ED.avatar[o.dataset.av] = o.dataset.v; v.querySelectorAll(`[data-av="${o.dataset.av}"]`).forEach(b => b.setAttribute("aria-pressed", b === o)); $("#av-prev").innerHTML = AV.svg(ED.avatar, 240); return; }
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "av-next") { if (ED.from === "perfil") { saveAvatarOnly(); return; } ED.step = 2; render(); }
    if (a.dataset.act === "av-back") { ED.step = 1; render(); }
  });
}
async function saveAvatarOnly() { try { await Store.saveMember({ name: S.me, avatar: ED.avatar }); await loadAll(); toast("Avatar guardado"); render(); } catch (err) { toast("No se pudo guardar: " + err.message); } }

function viewRuta() {
  const p = meM(), m = metrics(p), now = new Date();
  const pct = m.total ? Math.min(100, m.actual / m.total * 100) : 0, exp = m.total ? Math.min(100, m.expected / m.total * 100) : 0;
  const nowIdx = m.plan.findIndex(c => !m.done.has(c.id));
  return `<section class="banner"><div class="stack"><span class="kicker">Hola, ${esc(firstName(p.name))} · reto de ${h1(p.hours_per_week)} h por semana</span>
      <h1>Tu ruta termina el ${fmtDate(m.end)}</h1>
      <div class="meter"><i style="width:${pct}%"></i><u style="left:calc(${exp}% - 2px)"></u></div>
      <p class="small">Barra amarilla: ${h1(m.actual)} h registradas · Marca blanca: ${h1(m.expected)} h que deberías llevar hoy</p>
      <div class="chips"><span class="chip">${m.status.t}</span><span class="chip">${m.compliance}% de cumplimiento</span><a class="btn sun small" href="#registrar">Registrar avance</a></div></div>
    <div class="ava">${AV.svg(p.avatar, 220)}<span class="bubble">${m.status.say}</span></div></section>
  <section class="tiles">
    <div class="tile" style="--t:var(--violet);--t-soft:var(--violet-soft)"><span>Esta semana</span><b>${h1(m.thisWeek)} / ${h1(p.hours_per_week)} h</b></div>
    <div class="tile" style="--t:var(--mint);--t-soft:var(--mint-soft)"><span>Cursos</span><b>${m.done.size} / ${m.plan.length}</b></div>
    <div class="tile" style="--t:var(--claude);--t-soft:var(--claude-soft)"><span>Racha</span><b>${m.streak} sem.</b></div>
    <div class="tile" style="--t:var(--sky);--t-soft:var(--sky-soft)"><span>Puntos</span><b>${training(p).points}</b></div></section>
  <section class="stack"><h2>Tu plan, curso por curso</h2><div class="grid2">${m.plan.map((c, i) => {
    const hrs = courseHours(p, c.id), done = m.done.has(c.id), isNow = i === nowIdx, late = !done && c.endAt < now, cp = Math.min(100, hrs / c.hours * 100);
    return `<article class="course ${COLORS[i % COLORS.length]} ${done ? "done" : ""} ${isNow ? "now" : ""}">
      <div class="hd"><span class="num">${done ? "✓" : i + 1}</span><div class="stack" style="gap:4px"><span class="org">${esc(c.org)}</span><h3>${esc(c.name)}</h3></div></div>
      <div class="tags"><span class="tag">${fmtDate(c.startAt)} → ${fmtDate(c.endAt)}</span><span class="tag">${h1(c.hours)} h${c.est ? " est." : ""}</span>
        ${done ? `<span class="pill ok">Completado</span>` : late ? `<span class="pill bad">Debía terminar</span>` : isNow ? `<span class="pill acc">En curso</span>` : ""}</div>
      <p><b>Al terminar sabrás:</b> ${esc(c.learn)}</p>
      <details><summary>Ver módulos</summary><p class="small muted" style="margin-top:6px">${esc(c.detail)}</p><ul>${c.modules.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>
      <div class="meter"><i style="width:${cp}%"></i></div>
      <div class="ft"><span class="small"><b>${h1(hrs)}</b> de ${h1(c.hours)} h registradas</span>
        <div class="row">${c.url ? `<a class="btn white small" href="${c.url}" target="_blank" rel="noopener">Ir al curso</a>` : ""}<button class="btn small ${done ? "" : "primary"}" data-toggle="${c.id}" type="button">${done ? "Reabrir" : "Marcar completado"}</button></div></div></article>`; }).join("")}</div></section>
  <section class="two"><div class="card stack"><h3>Cursos que ya no necesitas llevar</h3><p class="muted small" style="margin:0">Tu ruta se basa en Claude: estos cursos de otras plataformas cubren lo mismo.</p>
      <ul class="list">${window.SKIPPED.map(s => `<li><b class="strike">${esc(s.name)}</b><span class="small muted">${esc(s.why)}</span></li>`).join("")}</ul></div>
    <div class="card stack"><h3>Opcionales</h3><ul class="list">${window.OPTIONAL.map(s => `<li><b>${esc(s.name)}</b><span class="small muted">${esc(s.why)}</span></li>`).join("")}</ul></div></section>`;
}
function wireRuta(v) {
  v.addEventListener("click", async e => {
    const b = e.target.closest("[data-toggle]"); if (!b) return;
    const id = b.dataset.toggle, cur = S.statuses.find(s => s.member === S.me && s.course_id === id), done = cur && cur.status === "completado";
    try { await Store.setStatus({ member: S.me, course_id: id, status: done ? "en_curso" : "completado", completed_at: done ? null : isoDate(new Date()) }); await loadAll(); render(); toast(done ? "Curso reabierto" : "¡Curso completado!"); }
    catch (err) { toast("No se pudo guardar: " + err.message); }
  });
}

function viewRegistrar() {
  const p = meM(), plan = planFor(p), mine = S.logs.filter(l => l.member === p.name), name = id => (window.COURSES.find(c => c.id === id) || { name: id }).name;
  return `<section class="two"><form id="f-log" class="card stack"><span class="kicker">Registrar avance</span><h2>¿Cuánto estudiaste hoy?</h2>
      <div class="stack"><label for="l-course">Curso</label><select id="l-course">${plan.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
      <div class="row"><div class="stack" style="flex:1;min-width:150px"><label for="l-date">Fecha</label><input id="l-date" type="date" value="${isoDate(new Date())}" required></div>
        <div class="stack" style="flex:1;min-width:150px"><label for="l-hours">Horas</label><input id="l-hours" type="number" min="0.25" max="24" step="0.25" value="1" required></div></div>
      <div class="stack"><label for="l-note">¿Qué aprendiste o aplicaste?</label><textarea id="l-note" placeholder="Ej.: Terminé el módulo de Projects y armé uno con los manuales de mi área."></textarea></div>
      <div class="stack"><label for="l-ev">Enlace de evidencia (opcional)</label><input id="l-ev" type="url" placeholder="Certificado, captura o documento"></div>
      <button class="btn primary" type="submit">Guardar avance</button></form>
    <div class="card stack"><h3>Mis registros</h3>${mine.length ? `<div class="tablebox"><table><thead><tr><th>Fecha</th><th>Curso</th><th class="num">Horas</th><th></th></tr></thead><tbody>
      ${mine.map(l => `<tr><td>${fmtDate(parseDate(l.log_date))}</td><td><b>${esc(name(l.course_id))}</b>${l.note ? `<div class="small muted">${esc(l.note)}</div>` : ""}${l.evidence_url ? `<a class="small" href="${esc(l.evidence_url)}" target="_blank" rel="noopener">Evidencia</a>` : ""}</td><td class="num">${h1(l.hours)}</td><td><button class="btn small" data-del="${l.id}" type="button">Borrar</button></td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted">Aún no tienes registros. Cada vez que estudies, anota tus horas aquí: así se mide tu reto.</p>`}</div></section>`;
}
function wireRegistrar(v) {
  $("#f-log", v).addEventListener("submit", async e => {
    e.preventDefault();
    const l = { member: S.me, course_id: $("#l-course").value, log_date: $("#l-date").value, hours: Number($("#l-hours").value), note: $("#l-note").value.trim() || null, evidence_url: $("#l-ev").value.trim() || null };
    try { await Store.addLog(l); if (!S.statuses.find(s => s.member === S.me && s.course_id === l.course_id)) await Store.setStatus({ member: S.me, course_id: l.course_id, status: "en_curso", completed_at: null });
      await loadAll(); render(); toast("¡Avance guardado!"); } catch (err) { toast("No se pudo guardar: " + err.message); }
  });
  v.addEventListener("click", async e => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "¿Seguro?"; return; }
    try { await Store.delLog(Number(b.dataset.del)); await loadAll(); render(); toast("Registro borrado"); } catch (err) { toast("No se pudo borrar: " + err.message); }
  });
}

function viewEquipo() {
  const conf = S.members.filter(m => m.configured).map(m => ({ m, x: metrics(m), tr: training(m) })).sort((a, b) => b.x.compliance - a.x.compliance);
  return `<section class="stack"><span class="kicker">Equipo</span><h1>¿Cómo vamos?</h1><p class="muted" style="margin:0">Cada persona se mide contra su propio reto: cumplimiento = horas registradas ÷ horas que debería llevar hoy.</p></section>
  <section class="team">${S.members.map(m => {
    if (!m.configured) return `<div class="card member"><div class="hd">${avatarOf(m, 64)}<div class="nm">${esc(m.name)}</div></div><span class="pill vio">Aún no configura su reto</span></div>`;
    const x = metrics(m), tr = training(m), pct = x.total ? Math.min(100, x.actual / x.total * 100) : 0, exp = x.total ? Math.min(100, x.expected / x.total * 100) : 0;
    return `<div class="card member"><div class="hd">${AV.svg(m.avatar, 64)}<div><div class="nm">${esc(m.name)}</div><div class="small muted">${m.profile_type === "tecnico" ? "Técnico" : "General"} · ${h1(m.hours_per_week)} h/semana</div></div></div>
      <div class="row"><span class="pill ${x.status.k}">${x.status.t}</span><span class="pill">${x.compliance}%</span></div>
      <div class="meter" style="width:100%"><i style="width:${pct}%"></i><u style="left:calc(${exp}% - 2px)"></u></div>
      <div class="small muted">${h1(x.actual)} de ${h1(x.total)} h · ${x.done.size}/${x.plan.length} cursos · termina ${fmtDate(x.end)}</div>
      <div class="small"><b>${tr.points}</b> puntos · racha de ${x.streak} sem.</div>
      <div class="badges">${badges(m).filter(b => b.on).map(b => `<span class="badge on">★ ${b.t}</span>`).join("") || `<span class="small muted">Sin insignias todavía</span>`}</div></div>`; }).join("")}</section>
  ${conf.length ? `<section class="card stack"><h3>Tabla de cumplimiento</h3><div class="tablebox"><table><thead><tr><th>#</th><th>Persona</th><th class="num">Reto</th><th class="num">Horas</th><th class="num">Esperado</th><th class="num">Cumplimiento</th><th class="num">Puntos</th></tr></thead><tbody>
    ${conf.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.m.name)}</td><td class="num">${h1(r.m.hours_per_week)} h/sem</td><td class="num">${h1(r.x.actual)}</td><td class="num">${h1(r.x.expected)}</td><td class="num">${r.x.compliance}%</td><td class="num">${r.tr.points}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
}

function viewPerfil() {
  const m = meM();
  return `<section class="stack"><span class="kicker">Mi perfil</span><h1>Tu avatar y tu reto</h1><p class="muted" style="margin:0">Si cambias tus horas, la página recalcula las fechas de cada curso.</p></section>
    <section class="card">${editorHTML().replace("Listo, siguiente →", "Guardar avatar")}</section>
    <section class="card stack"><h2>Tu reto semanal</h2>${retoHTML(m)}</section>`;
}

// ---------------- Entrenamiento ----------------
const TR = { tab: "quiz", qi: 0, qAns: null, qScore: 0, hi: 0, hMarks: new Set(), hDone: false, pi: 0, ci: 0, flipped: false };
function viewEntrenar() {
  const p = meM(), tr = training(p), bs = badges(p);
  const tabs = [["quiz", "Quiz"], ["hallu", "Detecta la alucinación"], ["prompt", "Laboratorio de prompts"], ["cards", "Tarjetas"], ["reto", "Reto de la semana"]];
  return `<section class="banner" style="background:linear-gradient(135deg,#21b47e,#14936a)"><div class="stack"><span class="kicker">Entrenamiento</span><h1>Practica lo que vas aprendiendo</h1>
      <p>Cada actividad suma puntos e insignias. Llevas <b>${tr.points} puntos</b> y ${bs.filter(b => b.on).length} de 8 insignias.</p>
      <div class="badges">${bs.map(b => `<span class="chip" style="${b.on ? "background:#fff;color:#14936a" : ""}">${b.on ? "★ " : ""}${b.t}</span>`).join("")}</div></div>
    <div class="ava">${AV.svg(p.avatar, 180)}<span class="bubble">¡A entrenar!</span></div></section>
  <div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button class="tab" role="tab" type="button" data-tab="${k}" aria-selected="${TR.tab === k}">${t}</button>`).join("")}</div>
  <section class="card stack" id="tr-body">${trBody(metrics(p))}</section>`;
}
function trBody(m) {
  if (TR.tab === "quiz") {
    const Q = window.QUIZ;
    if (TR.qi >= Q.length) return `<span class="kicker">Resultado</span><div class="score">${TR.qScore} / ${Q.length}</div><p>${TR.qScore >= Q.length * .8 ? "¡Excelente! Ganaste la insignia Quiz 80%." : "Repasa las explicaciones y vuelve a intentarlo: necesitas 8 de 10."}</p><div><button class="btn primary" data-act="q-restart" type="button">Repetir quiz</button></div>`;
    const q = Q[TR.qi];
    return `<span class="kicker">Pregunta ${TR.qi + 1} de ${Q.length}</span><h2>${esc(q.q)}</h2>
      <div class="opts-q">${q.o.map((o, i) => `<button class="opt ${TR.qAns !== null ? (i === q.a ? "right" : i === TR.qAns ? "wrong" : "") : ""}" data-act="q-ans" data-i="${i}" type="button" ${TR.qAns !== null ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
      ${TR.qAns !== null ? `<div class="explain pop">${TR.qAns === q.a ? "<b>¡Correcto!</b> " : "<b>No exactamente.</b> "}${esc(q.e)}</div><div><button class="btn primary" data-act="q-next" type="button">${TR.qi === Q.length - 1 ? "Ver resultado" : "Siguiente →"}</button></div>` : ""}`;
  }
  if (TR.tab === "hallu") {
    const h = window.HALLU[TR.hi], bad = h.sentences.filter(s => s.bad).length;
    return `<span class="kicker">Caso ${TR.hi + 1} de ${window.HALLU.length} · ${esc(h.title)}</span>
      <div class="explain"><b>Se le pidió a la IA:</b> ${esc(h.ask)}</div>
      <p style="margin:0">La IA respondió esto. <b>Toca las ${bad} frases que no están respaldadas por la información dada.</b></p>
      <div class="stack">${h.sentences.map((s, i) => { let cls = TR.hMarks.has(i) ? "marked" : ""; if (TR.hDone) cls = s.bad ? (TR.hMarks.has(i) ? "hit" : "miss") : (TR.hMarks.has(i) ? "miss" : "");
        return `<button class="sent ${cls}" data-act="h-mark" data-i="${i}" type="button" ${TR.hDone ? "disabled" : ""}>${esc(s.t)}${TR.hDone && (s.why || s.note) ? `<span class="small muted" style="display:block">${esc(s.why || s.note)}</span>` : ""}</button>`; }).join("")}</div>
      <div>${TR.hDone ? `<button class="btn primary" data-act="h-next" type="button">${TR.hi === window.HALLU.length - 1 ? "Empezar de nuevo" : "Siguiente caso →"}</button>` : `<button class="btn primary" data-act="h-check" type="button">Revisar</button>`}</div>`;
  }
  if (TR.tab === "prompt") {
    const c = window.PROMPT_LAB[TR.pi];
    return `<span class="kicker">Caso ${TR.pi + 1} de ${window.PROMPT_LAB.length}</span><h2>Mejora este prompt: “${esc(c.weak)}”</h2><p class="muted" style="margin:0"><b>Situación:</b> ${esc(c.context)}</p>
      <div class="two"><div class="stack"><label for="p-text">Tu prompt mejorado</label><textarea id="p-text" style="min-height:210px" placeholder="Escribe aquí tu versión…"></textarea>
        <div class="row"><button class="btn primary" data-act="p-save" type="button">Guardar intento</button><button class="btn" data-act="p-next" type="button">Otro caso</button></div></div>
        <div class="stack"><h3>Lista de revisión</h3><ul class="rubric" id="p-rub">${window.RUBRIC.map(r => `<li data-r="${r.id}">${r.label}</li>`).join("")}</ul>
          <div class="score" id="p-score">0 / ${window.RUBRIC.length}</div><p class="small muted" style="margin:0">Pista: ${esc(c.tip)} Después pruébalo en Claude y compara con el prompt original.</p></div></div>`;
  }
  if (TR.tab === "cards") {
    const [f, b] = window.CARDS[TR.ci];
    return `<span class="kicker">Tarjeta ${TR.ci + 1} de ${window.CARDS.length} · toca para voltear</span>
      <div class="flip ${TR.flipped ? "on" : ""}" data-act="c-flip" role="button" tabindex="0" aria-label="Voltear tarjeta"><div class="in"><div class="f">${esc(f)}</div><div class="b">${esc(b)}</div></div></div>
      <div class="row"><button class="btn" data-act="c-prev" type="button">← Anterior</button><button class="btn primary" data-act="c-next" type="button">Siguiente →</button></div>`;
  }
  const w = Math.min(window.CHALLENGES.length - 1, m.weekIndex), mine = training(meM()).challenges, doneThis = mine.find(x => x.item_id === "w" + (w + 1));
  return `<span class="kicker">Semana ${w + 1} de tu ruta</span><h2>${esc(window.CHALLENGES[w])}</h2>
    ${doneThis ? `<div class="explain"><b>Reto entregado.</b> ${esc(doneThis.payload?.text || "")}</div>` : `<div class="stack"><label for="r-text">¿Qué hiciste y qué resultado obtuviste?</label><textarea id="r-text" placeholder="Cuéntalo en 2 o 3 frases. Si mediste tiempo, anótalo."></textarea><div><button class="btn primary" data-act="r-save" type="button">Entregar reto (+30 puntos)</button></div></div>`}
    ${mine.length ? `<h3>Retos entregados</h3><ul class="list">${mine.map(x => `<li><b>Semana ${esc(x.item_id.slice(1))}</b><span class="small muted">${esc(x.payload?.text || "")}</span></li>`).join("")}</ul>` : ""}`;
}
const scorePrompt = txt => window.RUBRIC.filter(r => r.re.test(txt) && txt.trim().length > 25);
function wireEntrenar(v) {
  const rer = () => { $("#tr-body", v).innerHTML = trBody(metrics(meM())); if (TR.tab === "prompt") wireP(); };
  const wireP = () => { const ta = $("#p-text", v); if (!ta) return; ta.addEventListener("input", () => { const ok = new Set(scorePrompt(ta.value).map(r => r.id)); v.querySelectorAll("#p-rub li").forEach(li => li.classList.toggle("ok", ok.has(li.dataset.r))); $("#p-score", v).textContent = `${ok.size} / ${window.RUBRIC.length}`; }); };
  wireP();
  const save = async t => { try { await Store.addTraining({ member: S.me, ...t }); await loadAll(); } catch (err) { toast("No se pudo guardar: " + err.message); } };
  v.addEventListener("keydown", e => { if (e.target.closest("[data-act='c-flip']") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); TR.flipped = !TR.flipped; e.target.closest(".flip").classList.toggle("on", TR.flipped); } });
  v.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]"); if (t) { TR.tab = t.dataset.tab; render(); return; }
    const a = e.target.closest("[data-act]"); if (!a) return; const act = a.dataset.act;
    if (act === "q-ans") { TR.qAns = Number(a.dataset.i); const ok = TR.qAns === window.QUIZ[TR.qi].a; if (ok) TR.qScore++; await save({ activity: "quiz", item_id: "q" + TR.qi, score: ok ? 1 : 0, max_score: 1, payload: { answer: TR.qAns } }); rer(); }
    if (act === "q-next") { TR.qi++; TR.qAns = null; TR.qi >= window.QUIZ.length ? render() : rer(); }
    if (act === "q-restart") { TR.qi = 0; TR.qAns = null; TR.qScore = 0; rer(); }
    if (act === "h-mark") { const i = Number(a.dataset.i); TR.hMarks.has(i) ? TR.hMarks.delete(i) : TR.hMarks.add(i); rer(); }
    if (act === "h-check") { const h = window.HALLU[TR.hi], bad = h.sentences.map((s, i) => s.bad ? i : -1).filter(i => i >= 0);
      const score = Math.max(0, bad.filter(i => TR.hMarks.has(i)).length - [...TR.hMarks].filter(i => !h.sentences[i].bad).length); TR.hDone = true;
      await save({ activity: "hallu", item_id: "h" + TR.hi, score, max_score: bad.length, payload: { marks: [...TR.hMarks] } }); toast(score === bad.length ? "¡Las encontraste todas!" : `Encontraste ${score} de ${bad.length}`); render(); }
    if (act === "h-next") { TR.hi = (TR.hi + 1) % window.HALLU.length; TR.hMarks = new Set(); TR.hDone = false; rer(); }
    if (act === "p-save") { const txt = $("#p-text", v).value; if (txt.trim().length < 26) { toast("Escribe un prompt más completo"); return; } const ok = scorePrompt(txt);
      await save({ activity: "prompt", item_id: "p" + TR.pi, score: ok.length, max_score: window.RUBRIC.length, payload: { text: txt } }); toast(`Guardado: ${ok.length} de ${window.RUBRIC.length} criterios`); render(); }
    if (act === "p-next") { TR.pi = (TR.pi + 1) % window.PROMPT_LAB.length; rer(); }
    if (act === "c-flip") { TR.flipped = !TR.flipped; a.classList.toggle("on", TR.flipped); }
    if (act === "c-next" || act === "c-prev") { TR.ci = (TR.ci + (act === "c-next" ? 1 : -1) + window.CARDS.length) % window.CARDS.length; TR.flipped = false; rer(); }
    if (act === "r-save") { const txt = $("#r-text", v).value.trim(); if (txt.length < 10) { toast("Cuéntanos un poco más de tu resultado"); return; }
      await save({ activity: "challenge", item_id: "w" + (Math.min(window.CHALLENGES.length - 1, metrics(meM()).weekIndex) + 1), score: 1, max_score: 1, payload: { text: txt } }); toast("¡Reto entregado! +30 puntos"); render(); }
  });
}

// ---------------- Enrutador ----------------
const VIEWS = { ruta: [viewRuta, wireRuta], registrar: [viewRegistrar, wireRegistrar], entrenar: [viewEntrenar, wireEntrenar], equipo: [viewEquipo, null],
  perfil: [viewPerfil, v => { ED.from = "perfil"; ED.step = 2; wireOnboard(v); ED.step = 1; }] };
function mount(html, wire) { const old = $("#view"), v = old.cloneNode(false); old.replaceWith(v); v.innerHTML = html; if (wire) wire(v); }
function render() {
  const m = S.me && meM();
  $("#nav").hidden = !(m && m.configured); $("#b-me").hidden = !m;
  if (!m) { S.me = null; mount(viewWho(), v => v.addEventListener("click", e => { const b = e.target.closest("[data-who]"); if (!b) return; S.me = b.dataset.who; local.set("me", S.me); start(); })); return; }
  $("#b-me").innerHTML = `${m.avatar ? AV.svg(m.avatar, 34) : ""}<span>${esc(firstName(m.name))} · Cambiar</span>`;
  if (!m.configured) { mount(viewOnboard(), wireOnboard); return; }
  const key = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : "ruta";
  document.querySelectorAll("#nav a").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + key ? "page" : "false"));
  if (key === "perfil") { ED.avatar = { ...(m.avatar || AV.PRESETS[0].a) }; ED.reto = { profile_type: m.profile_type, hours_per_week: Number(m.hours_per_week), start_date: m.start_date }; }
  ED.from = key === "perfil" ? "perfil" : null;
  mount(VIEWS[key][0](), VIEWS[key][1]);
}
function start() {
  const m = meM();
  if (m && !m.configured) { ED.step = 1; ED.from = null; ED.avatar = { ...(m.avatar || AV.PRESETS[0].a) }; ED.reto = { profile_type: "general", hours_per_week: 3.5, start_date: isoDate(new Date()) }; }
  render(); window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
$("#b-me").addEventListener("click", () => { S.me = null; local.set("me", null); location.hash = ""; render(); });
(async () => { try { await loadAll(); } catch (err) { mount(`<div class="card"><h2>No se pudo conectar</h2><p class="muted">${esc(err.message)}</p></div>`); return; } start(); })();
})();
