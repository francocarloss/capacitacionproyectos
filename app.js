(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CFG = window.RUTA_CONFIG || {};
const DEMO = !(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
const sb = DEMO ? null : window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const DAY = 86400000;

function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 2600); }
const fmtDate = d => d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
const parseDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const h1 = n => (Math.round(n * 10) / 10).toLocaleString("es");
const initials = n => n.split(" ").filter(Boolean).slice(0, 1).concat(n.split(" ").slice(2, 3)).map(w => w[0]).join("").toUpperCase();
const firstName = n => n.split(" ")[0];

// ---------------- Almacenamiento (Supabase o demostración local) ----------------
const local = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("ruta-ia:" + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("ruta-ia:" + k, JSON.stringify(v)); } catch (e) {} }
};
const Store = {
  async session() {
    if (DEMO) { const n = local.get("demoUser", null); return n ? { id: "demo-" + window.TEAM.indexOf(n), demoName: n } : null; }
    const { data } = await sb.auth.getSession(); return data.session ? { id: data.session.user.id, email: data.session.user.email } : null;
  },
  async profiles() {
    if (DEMO) return local.get("profiles", []);
    const { data, error } = await sb.from("profiles").select("*"); if (error) throw error; return data;
  },
  async saveProfile(p) {
    if (DEMO) { const all = local.get("profiles", []).filter(x => x.id !== p.id); all.push(p); local.set("profiles", all); return; }
    const { error } = await sb.from("profiles").upsert({ ...p, updated_at: new Date().toISOString() }); if (error) throw error;
  },
  async logs() {
    if (DEMO) return local.get("logs", []);
    const { data, error } = await sb.from("progress_logs").select("*").order("log_date", { ascending: false }); if (error) throw error; return data;
  },
  async addLog(l) {
    if (DEMO) { const all = local.get("logs", []); all.unshift({ ...l, id: Date.now() }); local.set("logs", all); return; }
    const { error } = await sb.from("progress_logs").insert(l); if (error) throw error;
  },
  async delLog(id) {
    if (DEMO) { local.set("logs", local.get("logs", []).filter(x => x.id !== id)); return; }
    const { error } = await sb.from("progress_logs").delete().eq("id", id); if (error) throw error;
  },
  async statuses() {
    if (DEMO) return local.get("status", []);
    const { data, error } = await sb.from("course_status").select("*"); if (error) throw error; return data;
  },
  async setStatus(s) {
    if (DEMO) { const all = local.get("status", []).filter(x => !(x.user_id === s.user_id && x.course_id === s.course_id)); all.push(s); local.set("status", all); return; }
    const { error } = await sb.from("course_status").upsert(s); if (error) throw error;
  },
  async training() {
    if (DEMO) return local.get("training", []);
    const { data, error } = await sb.from("training_results").select("*"); if (error) throw error; return data;
  },
  async addTraining(t) {
    if (DEMO) { const all = local.get("training", []); all.push({ ...t, created_at: new Date().toISOString() }); local.set("training", all); return; }
    const { error } = await sb.from("training_results").insert(t); if (error) throw error;
  }
};

// ---------------- Estado ----------------
const S = { me: null, profile: null, profiles: [], logs: [], statuses: [], training: [] };
async function loadAll() {
  [S.profiles, S.logs, S.statuses, S.training] = await Promise.all([Store.profiles(), Store.logs(), Store.statuses(), Store.training()]);
  S.profile = S.profiles.find(p => p.id === S.me.id) || null;
}

// ---------------- Cálculo del plan ----------------
function planFor(p) { return window.COURSES.filter(c => c.track === "todos" || c.track === (p.profile_type === "tecnico" ? "tecnico" : "general")); }
function schedule(p) {
  const H = Number(p.hours_per_week) || 1, start = parseDate(p.start_date);
  let cum = 0;
  return planFor(p).map(c => {
    const a = cum; cum += c.hours;
    return { ...c, startAt: new Date(start.getTime() + (a / H) * 7 * DAY), endAt: new Date(start.getTime() + (cum / H) * 7 * DAY), cumHours: cum };
  });
}
function metrics(p) {
  const plan = schedule(p), total = plan.length ? plan[plan.length - 1].cumHours : 0;
  const logs = S.logs.filter(l => l.user_id === p.id), st = S.statuses.filter(s => s.user_id === p.id);
  const done = new Set(st.filter(s => s.status === "completado").map(s => s.course_id));
  const actual = logs.reduce((a, l) => a + Number(l.hours), 0);
  const now = new Date(), start = parseDate(p.start_date);
  const weeks = Math.max(0, (now - start) / (7 * DAY));
  const expected = Math.min(total, weeks * Number(p.hours_per_week));
  const expectedCourses = plan.filter(c => c.endAt <= now).length;
  const diff = actual - expected;
  let status = { k: "ok", t: "Al día" };
  if (now < start) status = { k: "acc", t: "Inicia " + fmtDate(start) };
  else if (diff >= 1) status = { k: "ok", t: "Adelantado" };
  else if (diff < -1) status = { k: "bad", t: "Atrasado" };
  const weekStart = new Date(now.getTime() - ((now.getDay() + 6) % 7) * DAY); weekStart.setHours(0, 0, 0, 0);
  const thisWeek = logs.filter(l => parseDate(l.log_date) >= weekStart).reduce((a, l) => a + Number(l.hours), 0);
  const weeksActive = new Set(logs.map(l => { const d = parseDate(l.log_date); return Math.floor((d - start) / (7 * DAY)); }));
  let streak = 0; for (let w = Math.floor(weeks); w >= 0 && weeksActive.has(w); w--) streak++;
  const end = plan.length ? plan[plan.length - 1].endAt : start;
  const compliance = expected > 0 ? Math.round(actual / expected * 100) : 100;
  return { plan, total, actual, expected, expectedCourses, done, status, thisWeek, streak, end, compliance, logs, weekIndex: Math.max(0, Math.floor(weeks)) };
}
function courseHours(p, id) { return S.logs.filter(l => l.user_id === p.id && l.course_id === id).reduce((a, l) => a + Number(l.hours), 0); }
function training(p) {
  const t = S.training.filter(x => x.user_id === p.id);
  const best = (act) => { const m = {}; t.filter(x => x.activity === act).forEach(x => { if (!m[x.item_id] || x.score > m[x.item_id].score) m[x.item_id] = x; }); return Object.values(m); };
  const quiz = best("quiz"), hallu = best("hallu"), prompt = best("prompt");
  const quizScore = quiz.reduce((a, x) => a + x.score, 0);
  const points = quizScore * 10 + hallu.reduce((a, x) => a + x.score, 0) * 15 + prompt.reduce((a, x) => a + x.score, 0) * 5 + t.filter(x => x.activity === "challenge").length * 30;
  return { t, quiz, hallu, prompt, quizScore, points, challenges: t.filter(x => x.activity === "challenge") };
}
function badges(p) {
  const m = metrics(p), tr = training(p);
  return [
    { t: "Primer paso", on: m.logs.length > 0 },
    { t: "Racha de 3 semanas", on: m.streak >= 3 },
    { t: "Mitad de ruta", on: m.actual >= m.total / 2 && m.total > 0 },
    { t: "Ruta completa", on: m.plan.length > 0 && m.plan.every(c => m.done.has(c.id)) },
    { t: "Quiz 80%", on: tr.quizScore >= Math.ceil(window.QUIZ.length * .8) },
    { t: "Detective", on: tr.hallu.length >= window.HALLU.length && tr.hallu.every(h => h.score === h.max_score) },
    { t: "Prompt pro", on: tr.prompt.some(x => x.score === x.max_score) },
    { t: "Retador", on: tr.challenges.length >= 3 }
  ];
}

// ---------------- Pantallas ----------------
function show(id) { ["v-login", "v-setup", "v-app"].forEach(v => ($("#" + v).hidden = v !== id)); }

function setupForm(p) {
  const taken = new Set(S.profiles.filter(x => x.id !== S.me.id).map(x => x.full_name));
  const cur = p || { full_name: S.me.demoName || "", profile_type: "general", hours_per_week: 3.5, start_date: isoDate(new Date()) };
  return `
    <div class="stack"><label for="s-name">Tu nombre</label>
      <select id="s-name" required ${p ? "disabled" : ""}>${window.TEAM.map(n => `<option ${n === cur.full_name ? "selected" : ""} ${taken.has(n) ? "disabled" : ""}>${esc(n)}</option>`).join("")}</select></div>
    <div class="stack"><label for="s-type">Perfil</label>
      <select id="s-type"><option value="general" ${cur.profile_type === "general" ? "selected" : ""}>General: proyecto de área en lugar de cursos técnicos</option>
      <option value="tecnico" ${cur.profile_type === "tecnico" ? "selected" : ""}>Técnico: incluye Claude Code, MCP y API</option></select></div>
    <div class="stack"><label for="s-hours">Horas que te comprometes a invertir por semana: <b id="s-hv">${h1(cur.hours_per_week)} h</b></label>
      <input id="s-hours" type="range" min="1" max="12" step="0.5" value="${cur.hours_per_week}"></div>
    <div class="stack"><label for="s-start">Fecha de inicio</label><input id="s-start" type="date" value="${cur.start_date}" required></div>
    <div class="card" style="background:var(--accent-soft);border-color:var(--accent)" id="s-preview"></div>
    <button class="btn primary" type="submit">${p ? "Guardar mi reto" : "Empezar mi ruta"}</button>`;
}
function wireSetup(form, p) {
  const upd = () => {
    const tmp = { profile_type: $("#s-type", form).value, hours_per_week: Number($("#s-hours", form).value), start_date: $("#s-start", form).value || isoDate(new Date()) };
    $("#s-hv", form).textContent = h1(tmp.hours_per_week) + " h";
    const sc = schedule(tmp), total = sc[sc.length - 1].cumHours, weeks = Math.ceil(total / tmp.hours_per_week);
    $("#s-preview", form).innerHTML = `<p class="eyebrow">Con este reto</p><h3>Terminas el ${fmtDate(sc[sc.length - 1].endAt)}</h3>
      <p class="muted" style="margin:6px 0 0">${sc.length} cursos · ${h1(total)} horas en total · unas ${weeks} semanas. Claude 101 queda listo el ${fmtDate(sc[0].endAt)}.</p>`;
  };
  form.addEventListener("input", upd); upd();
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const prof = { id: S.me.id, full_name: p ? p.full_name : $("#s-name", form).value, profile_type: $("#s-type", form).value,
      hours_per_week: Number($("#s-hours", form).value), start_date: $("#s-start", form).value };
    try { await Store.saveProfile(prof); await loadAll(); toast("Reto guardado"); boot(); }
    catch (err) { toast(err.message?.includes("duplicate") ? "Ese nombre ya lo eligió otra persona" : "No se pudo guardar: " + err.message); }
  });
}

function viewRuta() {
  const p = S.profile, m = metrics(p), now = new Date();
  const pct = m.total ? Math.min(100, m.actual / m.total * 100) : 0, exp = m.total ? Math.min(100, m.expected / m.total * 100) : 0;
  let nowIdx = m.plan.findIndex(c => !m.done.has(c.id));
  return `
  <section class="hero">
    <div class="card stack">
      <p class="eyebrow">Hola, ${esc(firstName(p.full_name))}</p>
      <h1>Tu ruta termina el ${fmtDate(m.end)}</h1>
      <p class="muted" style="margin:0">Con tu reto de <b>${h1(p.hours_per_week)} h por semana</b> desde el ${fmtDate(parseDate(p.start_date))}. <a href="#reto">Cambiar mi reto</a></p>
      <div class="meter" aria-label="Avance"><i style="width:${pct}%"></i><u style="left:calc(${exp}% - 1px)"></u></div>
      <div class="legend"><span>Barra: horas registradas (${h1(m.actual)} h)</span><span>Marca: lo que deberías llevar hoy (${h1(m.expected)} h)</span></div>
    </div>
    <div class="stats">
      <div class="stat"><span>Estado</span><b><span class="pill ${m.status.k}">${m.status.t}</span></b></div>
      <div class="stat"><span>Cumplimiento</span><b>${m.compliance}%</b></div>
      <div class="stat"><span>Esta semana</span><b>${h1(m.thisWeek)} / ${h1(p.hours_per_week)} h</b></div>
      <div class="stat"><span>Cursos</span><b>${m.done.size} / ${m.plan.length}</b></div>
    </div>
  </section>
  <section class="stack">
    <h2>Tu plan, curso por curso</h2>
    <div class="route">${m.plan.map((c, i) => {
      const hrs = courseHours(p, c.id), done = m.done.has(c.id), isNow = i === nowIdx, late = !done && c.endAt < now;
      return `<article class="step ${done ? "done" : isNow ? "now" : ""}">
        <span class="num">${done ? "✓" : i + 1}</span>
        <div><h3>${esc(c.name)} <span class="pill">${esc(c.org)}</span></h3>
          <div class="dates">${fmtDate(c.startAt)} → ${fmtDate(c.endAt)} · ${h1(c.hours)} h${c.est ? " est." : ""}</div>
          <p class="learn"><b>Al terminar sabrás:</b> ${esc(c.learn)}</p>
          <details><summary>Módulos y detalle</summary><p class="small muted" style="margin:6px 0 0">${esc(c.detail)}</p><ul>${c.modules.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>
        </div>
        <div class="side">
          ${done ? `<span class="pill ok">Completado</span>` : late ? `<span class="pill bad">Debía terminar</span>` : isNow ? `<span class="pill acc">En curso</span>` : `<span class="pill">Pendiente</span>`}
          <span class="small muted">${h1(hrs)} de ${h1(c.hours)} h registradas</span>
          <div class="row">${c.url ? `<a class="btn small" href="${c.url}" target="_blank" rel="noopener">Ir al curso</a>` : ""}
          <button class="btn small ${done ? "ghost" : "primary"}" data-toggle="${c.id}" type="button">${done ? "Reabrir" : "Marcar completado"}</button></div>
        </div></article>`; }).join("")}</div>
  </section>
  <section class="two">
    <div class="card stack"><h3>Cursos que ya no necesitas llevar</h3><p class="muted small" style="margin:0">Basamos la ruta en Claude; estos cursos de otras plataformas cubren lo mismo.</p>
      <ul class="list">${window.SKIPPED.map(s => `<li><b class="strike">${esc(s.name)}</b><span class="small muted">${esc(s.why)}</span></li>`).join("")}</ul></div>
    <div class="card stack"><h3>Opcionales</h3><ul class="list">${window.OPTIONAL.map(s => `<li><b>${esc(s.name)}</b><span class="small muted">${esc(s.why)}</span></li>`).join("")}</ul></div>
  </section>`;
}
function wireRuta(v) {
  v.addEventListener("click", async e => {
    const b = e.target.closest("[data-toggle]"); if (!b) return;
    const id = b.dataset.toggle, cur = S.statuses.find(s => s.user_id === S.me.id && s.course_id === id);
    const done = cur && cur.status === "completado";
    try { await Store.setStatus({ user_id: S.me.id, course_id: id, status: done ? "en_curso" : "completado", completed_at: done ? null : isoDate(new Date()) });
      await loadAll(); render(); toast(done ? "Curso reabierto" : "¡Curso completado!"); } catch (err) { toast("No se pudo guardar: " + err.message); }
  });
}

function viewRegistrar() {
  const p = S.profile, plan = planFor(p), mine = S.logs.filter(l => l.user_id === p.id);
  const name = id => (window.COURSES.find(c => c.id === id) || { name: id }).name;
  return `
  <section class="two">
    <form id="f-log" class="card stack">
      <p class="eyebrow">Registrar avance</p><h2>¿Cuánto estudiaste?</h2>
      <div class="stack"><label for="l-course">Curso</label><select id="l-course">${plan.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
      <div class="row"><div class="stack" style="flex:1;min-width:140px"><label for="l-date">Fecha</label><input id="l-date" type="date" value="${isoDate(new Date())}" required></div>
        <div class="stack" style="flex:1;min-width:140px"><label for="l-hours">Horas</label><input id="l-hours" type="number" min="0.25" max="24" step="0.25" value="1" required></div></div>
      <div class="stack"><label for="l-note">¿Qué aprendiste o aplicaste?</label><textarea id="l-note" placeholder="Ej.: Terminé el módulo de Projects y armé uno con los manuales de mi área."></textarea></div>
      <div class="stack"><label for="l-ev">Enlace de evidencia (opcional)</label><input id="l-ev" type="url" placeholder="Certificado, captura o documento"></div>
      <button class="btn primary" type="submit">Guardar avance</button>
    </form>
    <div class="card stack"><h3>Mis registros</h3>
      ${mine.length ? `<div class="tablebox"><table><thead><tr><th>Fecha</th><th>Curso</th><th class="num">Horas</th><th></th></tr></thead><tbody>
      ${mine.map(l => `<tr><td>${fmtDate(parseDate(l.log_date))}</td><td>${esc(name(l.course_id))}${l.note ? `<div class="small muted">${esc(l.note)}</div>` : ""}${l.evidence_url ? `<a class="small" href="${esc(l.evidence_url)}" target="_blank" rel="noopener">Evidencia</a>` : ""}</td><td class="num">${h1(l.hours)}</td><td><button class="btn ghost small" data-del="${l.id}" type="button" aria-label="Borrar registro">Borrar</button></td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted">Aún no tienes registros. Cada vez que estudies, anota aquí las horas: así se mide tu reto.</p>`}
    </div>
  </section>`;
}
function wireRegistrar(v) {
  $("#f-log", v).addEventListener("submit", async e => {
    e.preventDefault();
    const l = { user_id: S.me.id, course_id: $("#l-course").value, log_date: $("#l-date").value, hours: Number($("#l-hours").value), note: $("#l-note").value.trim() || null, evidence_url: $("#l-ev").value.trim() || null };
    try { await Store.addLog(l); const cur = S.statuses.find(s => s.user_id === S.me.id && s.course_id === l.course_id);
      if (!cur) await Store.setStatus({ user_id: S.me.id, course_id: l.course_id, status: "en_curso", completed_at: null });
      await loadAll(); render(); toast("Avance guardado"); } catch (err) { toast("No se pudo guardar: " + err.message); }
  });
  v.addEventListener("click", async e => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "¿Confirmar?"; return; }
    try { await Store.delLog(Number(b.dataset.del)); await loadAll(); render(); toast("Registro borrado"); } catch (err) { toast("No se pudo borrar: " + err.message); }
  });
}

function viewEquipo() {
  const rows = window.TEAM.map(n => S.profiles.find(p => p.full_name === n) ? { n, p: S.profiles.find(p => p.full_name === n) } : { n, p: null });
  const ranked = rows.filter(r => r.p).map(r => ({ ...r, m: metrics(r.p), tr: training(r.p) })).sort((a, b) => b.m.compliance - a.m.compliance);
  return `
  <section class="stack"><p class="eyebrow">Equipo</p><h1>¿Cómo vamos?</h1>
    <p class="muted" style="margin:0">Cada persona se mide contra su propio reto: cumplimiento = horas registradas ÷ horas que debería llevar hoy.</p></section>
  <section class="team">${rows.map(r => {
    if (!r.p) return `<div class="card member"><div class="row"><span class="av">${initials(r.n)}</span><div class="nm">${esc(r.n)}</div></div><p class="muted small" style="margin:0">Aún no configura su reto.</p></div>`;
    const m = metrics(r.p), tr = training(r.p), pct = m.total ? Math.min(100, m.actual / m.total * 100) : 0, exp = m.total ? Math.min(100, m.expected / m.total * 100) : 0;
    return `<div class="card member"><div class="row"><span class="av">${initials(r.n)}</span><div><div class="nm">${esc(r.n)}</div><div class="small muted">${r.p.profile_type === "tecnico" ? "Técnico" : "General"} · ${h1(r.p.hours_per_week)} h/semana</div></div></div>
      <div class="row"><span class="pill ${m.status.k}">${m.status.t}</span><span class="pill">${m.compliance}% cumplimiento</span></div>
      <div class="meter"><i style="width:${pct}%"></i><u style="left:calc(${exp}% - 1px)"></u></div>
      <div class="small muted">${h1(m.actual)} de ${h1(m.total)} h · ${m.done.size}/${m.plan.length} cursos · termina ${fmtDate(m.end)}</div>
      <div class="small"><b>${tr.points}</b> puntos de entrenamiento · racha ${m.streak} sem.</div>
      <div class="badges">${badges(r.p).filter(b => b.on).map(b => `<span class="badge on">${b.t}</span>`).join("") || `<span class="small muted">Sin insignias todavía</span>`}</div></div>`; }).join("")}</section>
  ${ranked.length ? `<section class="card stack"><h3>Tabla de cumplimiento</h3><div class="tablebox"><table><thead><tr><th>#</th><th>Persona</th><th class="num">Reto</th><th class="num">Horas</th><th class="num">Esperado</th><th class="num">Cumplimiento</th><th class="num">Puntos</th></tr></thead><tbody>
    ${ranked.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.n)}</td><td class="num">${h1(r.p.hours_per_week)} h/sem</td><td class="num">${h1(r.m.actual)}</td><td class="num">${h1(r.m.expected)}</td><td class="num">${r.m.compliance}%</td><td class="num">${r.tr.points}</td></tr>`).join("")}
  </tbody></table></div></section>` : ""}`;
}

function viewReto() {
  return `<section class="narrow" style="padding-block:0"><p class="eyebrow">Mi reto</p><h1>Ajusta tu compromiso</h1>
    <p class="muted">Si cambias tus horas, la página recalcula las fechas de cada curso. Tu cumplimiento se mide desde tu fecha de inicio con el reto actual.</p>
    <form id="f-setup2" class="card stack">${setupForm(S.profile)}</form></section>`;
}

// ---------------- Entrenamiento ----------------
const TR = { tab: "quiz", qi: 0, qAns: null, qScore: 0, hi: 0, hMarks: new Set(), hDone: false, pi: 0, ci: 0, flipped: false };
function viewEntrenar() {
  const tr = training(S.profile), m = metrics(S.profile);
  const tabs = [["quiz", "Quiz"], ["hallu", "Detecta la alucinación"], ["prompt", "Laboratorio de prompts"], ["cards", "Tarjetas"], ["reto", "Reto de la semana"]];
  return `<section class="hero"><div class="stack"><p class="eyebrow">Entrenamiento</p><h1>Practica lo que vas aprendiendo</h1>
    <p class="muted" style="margin:0">Cada actividad suma puntos e insignias. Los resultados se guardan en tu perfil.</p></div>
    <div class="stats"><div class="stat"><span>Puntos</span><b>${tr.points}</b></div><div class="stat"><span>Insignias</span><b>${badges(S.profile).filter(b => b.on).length} / 8</b></div></div></section>
  <div class="badges">${badges(S.profile).map(b => `<span class="badge ${b.on ? "on" : ""}">${b.on ? "★ " : ""}${b.t}</span>`).join("")}</div>
  <div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button class="tab" role="tab" type="button" data-tab="${k}" aria-selected="${TR.tab === k}">${t}</button>`).join("")}</div>
  <section class="card stack" id="tr-body">${trBody(m)}</section>`;
}
function trBody(m) {
  if (TR.tab === "quiz") {
    const Q = window.QUIZ;
    if (TR.qi >= Q.length) return `<p class="eyebrow">Resultado</p><div class="score">${TR.qScore} / ${Q.length}</div><p>${TR.qScore >= Q.length * .8 ? "¡Excelente! Ganaste la insignia Quiz 80%." : "Repasa las explicaciones y vuelve a intentarlo: necesitas 8 de 10."}</p><button class="btn primary" data-act="q-restart" type="button">Repetir quiz</button>`;
    const q = Q[TR.qi];
    return `<p class="eyebrow">Pregunta ${TR.qi + 1} de ${Q.length}</p><h2>${esc(q.q)}</h2>
      <div class="opts">${q.o.map((o, i) => `<button class="opt ${TR.qAns !== null ? (i === q.a ? "right" : i === TR.qAns ? "wrong" : "") : ""}" data-act="q-ans" data-i="${i}" type="button" ${TR.qAns !== null ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
      ${TR.qAns !== null ? `<div class="explain">${TR.qAns === q.a ? "<b>¡Correcto!</b> " : "<b>No exactamente.</b> "}${esc(q.e)}</div><div><button class="btn primary" data-act="q-next" type="button">${TR.qi === Q.length - 1 ? "Ver resultado" : "Siguiente"}</button></div>` : ""}`;
  }
  if (TR.tab === "hallu") {
    const h = window.HALLU[TR.hi], bad = h.sentences.filter(s => s.bad).length;
    return `<p class="eyebrow">Caso ${TR.hi + 1} de ${window.HALLU.length} · ${esc(h.title)}</p>
      <div class="explain"><b>Se le pidió a la IA:</b> ${esc(h.ask)}</div>
      <p style="margin:0">La IA respondió lo siguiente. <b>Toca las ${bad} frases que no están respaldadas por la información dada.</b></p>
      <div class="stack">${h.sentences.map((s, i) => {
        let cls = TR.hMarks.has(i) ? "marked" : ""; if (TR.hDone) cls = s.bad ? (TR.hMarks.has(i) ? "hit" : "miss") : (TR.hMarks.has(i) ? "miss" : "");
        return `<button class="sent ${cls}" data-act="h-mark" data-i="${i}" type="button" ${TR.hDone ? "disabled" : ""}>${esc(s.t)}${TR.hDone && (s.why || s.note) ? `<span class="small muted" style="display:block">${esc(s.why || s.note)}</span>` : ""}</button>`; }).join("")}</div>
      <div class="row">${TR.hDone ? `<button class="btn primary" data-act="h-next" type="button">${TR.hi === window.HALLU.length - 1 ? "Empezar de nuevo" : "Siguiente caso"}</button>` : `<button class="btn primary" data-act="h-check" type="button">Revisar</button>`}</div>`;
  }
  if (TR.tab === "prompt") {
    const c = window.PROMPT_LAB[TR.pi];
    return `<p class="eyebrow">Caso ${TR.pi + 1} de ${window.PROMPT_LAB.length}</p><h2>Mejora este prompt: “${esc(c.weak)}”</h2>
      <p class="muted" style="margin:0"><b>Situación:</b> ${esc(c.context)}</p>
      <div class="two"><div class="stack"><label for="p-text">Tu prompt mejorado</label><textarea id="p-text" style="min-height:200px" placeholder="Escribe aquí tu versión…"></textarea>
        <div class="row"><button class="btn primary" data-act="p-save" type="button">Guardar intento</button><button class="btn" data-act="p-next" type="button">Otro caso</button></div></div>
        <div class="stack"><h3>Lista de revisión</h3><ul class="rubric" id="p-rub">${window.RUBRIC.map(r => `<li data-r="${r.id}">${r.label}</li>`).join("")}</ul>
          <div class="score" id="p-score">0 / ${window.RUBRIC.length}</div><p class="small muted" style="margin:0">Pista: ${esc(c.tip)}</p>
          <p class="small muted" style="margin:0">Después, pruébalo en Claude y compara la respuesta con la del prompt original.</p></div></div>`;
  }
  if (TR.tab === "cards") {
    const [f, b] = window.CARDS[TR.ci];
    return `<p class="eyebrow">Tarjeta ${TR.ci + 1} de ${window.CARDS.length} · toca para voltear</p>
      <div class="flip ${TR.flipped ? "on" : ""}" data-act="c-flip" role="button" tabindex="0" aria-label="Voltear tarjeta"><div class="in"><div class="f">${esc(f)}</div><div class="b">${esc(b)}</div></div></div>
      <div class="row"><button class="btn" data-act="c-prev" type="button">← Anterior</button><button class="btn primary" data-act="c-next" type="button">Siguiente →</button></div>`;
  }
  const w = Math.min(window.CHALLENGES.length - 1, m.weekIndex), mine = training(S.profile).challenges;
  const doneThis = mine.find(x => x.item_id === "w" + (w + 1));
  return `<p class="eyebrow">Semana ${w + 1} de tu ruta</p><h2>${esc(window.CHALLENGES[w])}</h2>
    ${doneThis ? `<div class="explain"><b>Reto entregado.</b> ${esc(doneThis.payload?.text || "")}</div>` : `
    <div class="stack"><label for="r-text">¿Qué hiciste y qué resultado obtuviste?</label><textarea id="r-text" placeholder="Cuenta tu resultado en 2 o 3 frases. Si mediste tiempo, anótalo."></textarea>
    <div><button class="btn primary" data-act="r-save" type="button">Entregar reto (+30 puntos)</button></div></div>`}
    ${mine.length ? `<h3>Retos entregados</h3><ul class="list">${mine.map(x => `<li><b>Semana ${esc(x.item_id.slice(1))}</b><span class="small muted">${esc(x.payload?.text || "")}</span></li>`).join("")}</ul>` : ""}`;
}
function scorePrompt(txt) { return window.RUBRIC.filter(r => r.re.test(txt) && txt.trim().length > 25); }
function wireEntrenar(v) {
  const body = () => $("#tr-body", v);
  const rerender = () => { body().innerHTML = trBody(metrics(S.profile)); if (TR.tab === "prompt") wirePrompt(); };
  const wirePrompt = () => { const ta = $("#p-text", v); if (!ta) return; ta.addEventListener("input", () => {
    const ok = new Set(scorePrompt(ta.value).map(r => r.id)); v.querySelectorAll("#p-rub li").forEach(li => li.classList.toggle("ok", ok.has(li.dataset.r)));
    $("#p-score", v).textContent = `${ok.size} / ${window.RUBRIC.length}`; }); };
  wirePrompt();
  const save = async t => { try { await Store.addTraining({ user_id: S.me.id, ...t }); await loadAll(); } catch (err) { toast("No se pudo guardar: " + err.message); } };
  v.addEventListener("keydown", e => { if (e.target.closest("[data-act='c-flip']") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); TR.flipped = !TR.flipped; rerender(); } });
  v.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]"); if (t) { TR.tab = t.dataset.tab; render(); return; }
    const a = e.target.closest("[data-act]"); if (!a) return; const act = a.dataset.act;
    if (act === "q-ans") { TR.qAns = Number(a.dataset.i); const q = window.QUIZ[TR.qi]; const ok = TR.qAns === q.a; if (ok) TR.qScore++;
      await save({ activity: "quiz", item_id: "q" + TR.qi, score: ok ? 1 : 0, max_score: 1, payload: { answer: TR.qAns } }); rerender(); }
    if (act === "q-next") { TR.qi++; TR.qAns = null; if (TR.qi >= window.QUIZ.length) render(); else rerender(); }
    if (act === "q-restart") { TR.qi = 0; TR.qAns = null; TR.qScore = 0; rerender(); }
    if (act === "h-mark") { const i = Number(a.dataset.i); TR.hMarks.has(i) ? TR.hMarks.delete(i) : TR.hMarks.add(i); rerender(); }
    if (act === "h-check") { const h = window.HALLU[TR.hi]; const bad = h.sentences.map((s, i) => s.bad ? i : -1).filter(i => i >= 0);
      const hits = bad.filter(i => TR.hMarks.has(i)).length, falsePos = [...TR.hMarks].filter(i => !h.sentences[i].bad).length;
      const score = Math.max(0, hits - falsePos); TR.hDone = true;
      await save({ activity: "hallu", item_id: "h" + TR.hi, score, max_score: bad.length, payload: { marks: [...TR.hMarks] } });
      toast(score === bad.length ? "¡Las encontraste todas!" : `Encontraste ${score} de ${bad.length}`); render(); }
    if (act === "h-next") { TR.hi = (TR.hi + 1) % window.HALLU.length; TR.hMarks = new Set(); TR.hDone = false; rerender(); }
    if (act === "p-save") { const txt = $("#p-text", v).value; const ok = scorePrompt(txt);
      if (txt.trim().length < 26) { toast("Escribe un prompt más completo"); return; }
      await save({ activity: "prompt", item_id: "p" + TR.pi, score: ok.length, max_score: window.RUBRIC.length, payload: { text: txt } }); toast(`Guardado: ${ok.length} de ${window.RUBRIC.length} criterios`); render(); }
    if (act === "p-next") { TR.pi = (TR.pi + 1) % window.PROMPT_LAB.length; rerender(); }
    if (act === "c-flip") { TR.flipped = !TR.flipped; a.classList.toggle("on", TR.flipped); }
    if (act === "c-next" || act === "c-prev") { TR.ci = (TR.ci + (act === "c-next" ? 1 : -1) + window.CARDS.length) % window.CARDS.length; TR.flipped = false; rerender(); }
    if (act === "r-save") { const txt = $("#r-text", v).value.trim(); if (txt.length < 10) { toast("Cuéntanos un poco más de tu resultado"); return; }
      const w = Math.min(window.CHALLENGES.length - 1, metrics(S.profile).weekIndex);
      await save({ activity: "challenge", item_id: "w" + (w + 1), score: 1, max_score: 1, payload: { text: txt } }); toast("¡Reto entregado! +30 puntos"); render(); }
  });
}

// ---------------- Enrutador ----------------
const VIEWS = { ruta: [viewRuta, wireRuta], registrar: [viewRegistrar, wireRegistrar], entrenar: [viewEntrenar, wireEntrenar], equipo: [viewEquipo, null], reto: [viewReto, v => wireSetup($("#f-setup2", v), S.profile)] };
function render() {
  const key = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : "ruta";
  document.querySelectorAll("#nav a").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + key ? "page" : "false"));
  const old = $("#view"), v = old.cloneNode(false); old.replaceWith(v);
  v.innerHTML = VIEWS[key][0](); if (VIEWS[key][1]) VIEWS[key][1](v);
}
window.addEventListener("hashchange", () => { if (S.profile) { render(); window.scrollTo(0, 0); } });

async function boot() {
  $("#demo").hidden = !DEMO;
  S.me = await Store.session();
  if (!S.me) {
    show("v-login");
    if (DEMO) { $("#f-login").hidden = true; $("#f-demo").hidden = false; $("#demo-name").innerHTML = window.TEAM.map(n => `<option>${esc(n)}</option>`).join(""); }
    return;
  }
  try { await loadAll(); } catch (err) { toast("No se pudo cargar la información: " + err.message); return; }
  if (!S.profile) { show("v-setup"); const f = $("#f-setup"); f.innerHTML = setupForm(null); wireSetup(f, null); return; }
  $("#who-name").textContent = S.profile.full_name;
  show("v-app"); render();
}

$("#f-login").addEventListener("submit", async e => {
  e.preventDefault(); const email = $("#login-email").value.trim(), msg = $("#login-msg");
  msg.textContent = "Enviando…";
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false } });
  msg.textContent = error ? "No se pudo enviar el enlace. Verifica que tu correo esté invitado al proyecto." : "Listo: revisa tu correo y abre el enlace para entrar.";
});
$("#f-demo").addEventListener("submit", e => { e.preventDefault(); local.set("demoUser", $("#demo-name").value); boot(); });
$("#b-logout").addEventListener("click", async () => { if (DEMO) local.set("demoUser", null); else await sb.auth.signOut(); S.profile = null; boot(); });
if (sb) sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_IN" && !S.profile) boot(); });
boot();
})();
