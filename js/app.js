// Ruta de Dominio IA · aplicación principal: acceso, primer ingreso, ruta, equipo y perfil.
import { Api, Auth } from "./api.js";
import { AV } from "./avatar.js";
import { S, ctx, COLORS, AIS, TOPICS, aiName, aisFor, planFor, equivalents, loadAll, schedule, metrics, mastery, training, badges } from "./state.js";
import { viewDemuestra, wireDemuestra, DEM, BADGE } from "./lesson.js";
import { viewEntrenar, wireEntrenar } from "./training.js";
import { $, esc, fmtDate, isoDate, h1, firstName, initials, toast, niceError, initTheme } from "./util.js";

initTheme();
const avatarOf = (p, size) => p && p.avatar ? AV.svg(p.avatar, size) : `<div class="silhouette" style="width:${size}px;height:${size}px;font-size:${size / 3}px">${esc(initials(p?.display_name))}</div>`;
const BADGE_COLORS = ["#6c5ce7", "#d97757", "#21b47e", "#3b8cf0", "#f2557f", "#c98a00"];
const aiTag = ai => `<span class="aitag" style="--ai:${(AIS[ai] || { c: "var(--muted)" }).c}">${esc(aiName(ai))}</span>`;
const aiPicker = (name, selected) => `<div class="aipick">${Object.entries(AIS).map(([k, a]) => `<label style="--ai:${a.c}"><input type="checkbox" name="${name}" value="${k}" ${selected.includes(k) ? "checked" : ""}><span>${a.name}</span></label>`).join("")}</div>`;
const picked = (root, name) => [...root.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
// Dominio por IA: porcentaje de módulos aprobados en los cursos de cada IA
function masteryByAi(p) {
  const ms = mastery(p), out = {};
  planFor(p).forEach(c => { const b = ms.byCourse[c.id]; if (!b || c.ai === "comun") return; const o = out[c.ai] || (out[c.ai] = { n: 0, k: 0 }); o.n += b.n; o.k += b.k; });
  return aisFor(p).map(ai => ({ ai, pct: out[ai] && out[ai].n ? Math.round(out[ai].k / out[ai].n * 100) : 0 }));
}

// ---------------- Acceso ----------------
const AU = { tab: "in", recovery: false };
function viewAuth() {
  const t = AU.recovery ? "new" : AU.tab;
  return `<section class="banner"><div class="stack"><span class="kicker">Propuesta de Capacitación · Proyectos 2026–2027</span>
      <h1>Domina la IA con <span class="underline" style="color:#fff">Claude</span>, módulo por módulo</h1>
      <p>Define tu reto semanal, demuestra lo que sabes en lecciones cortas y gana insignias. Crea un equipo o únete al de tu empresa.</p></div>
    <div class="ava">${AV.svg(AV.PRESETS[0].a, 220)}<span class="bubble">¡Bienvenido!</span></div></section>
  <section class="authbox card stack">
    ${t === "new" ? "" : `<div class="tabs" role="tablist"><button class="tab" type="button" role="tab" data-au="in" aria-selected="${t === "in"}">Iniciar sesión</button><button class="tab" type="button" role="tab" data-au="up" aria-selected="${t === "up"}">Crear cuenta</button></div>`}
    ${t === "in" ? `<form id="f-in" class="stack" novalidate><label for="in-email">Correo</label><input id="in-email" type="email" autocomplete="email" required maxlength="254">
        <label for="in-pass">Contraseña</label><input id="in-pass" type="password" autocomplete="current-password" required maxlength="72">
        <button class="btn primary" type="submit">Entrar</button><button class="linkbtn" type="button" data-au="reset">Olvidé mi contraseña</button></form>` : ""}
    ${t === "up" ? `<form id="f-up" class="stack" novalidate><label for="up-name">Tu nombre</label><input id="up-name" type="text" autocomplete="name" required minlength="2" maxlength="60">
        <label for="up-email">Correo</label><input id="up-email" type="email" autocomplete="email" required maxlength="254">
        <label for="up-pass">Contraseña (mínimo 10 caracteres)</label><input id="up-pass" type="password" autocomplete="new-password" required minlength="10" maxlength="72">
        <label for="up-pass2">Repite la contraseña</label><input id="up-pass2" type="password" autocomplete="new-password" required minlength="10" maxlength="72">
        <button class="btn primary" type="submit">Crear mi cuenta</button><p class="small muted" style="margin:0">Te enviaremos un correo para confirmar tu cuenta.</p></form>` : ""}
    ${t === "reset" ? `<form id="f-reset" class="stack" novalidate><h3>Recupera tu contraseña</h3><label for="rs-email">Correo</label><input id="rs-email" type="email" autocomplete="email" required maxlength="254">
        <button class="btn primary" type="submit">Enviarme el enlace</button><button class="linkbtn" type="button" data-au="in">Volver</button></form>` : ""}
    ${t === "new" ? `<form id="f-new" class="stack" novalidate><h3>Crea una contraseña nueva</h3><label for="nw-pass">Contraseña nueva (mínimo 10 caracteres)</label><input id="nw-pass" type="password" autocomplete="new-password" required minlength="10" maxlength="72">
        <button class="btn primary" type="submit">Guardar contraseña</button></form>` : ""}
    <p id="au-msg" class="small" role="status" style="margin:0"></p>
  </section>`;
}
function wireAuth(v) {
  const msg = (t, bad) => { const m = $("#au-msg", v); m.textContent = t; m.style.color = bad ? "var(--bad)" : "var(--ok)"; };
  const busy = (f, on) => f.querySelectorAll("button,input").forEach(x => (x.disabled = on));
  v.addEventListener("click", e => { const b = e.target.closest("[data-au]"); if (b) { AU.tab = b.dataset.au; render(); } });
  const on = (id, fn) => { const f = $(id, v); if (f) f.addEventListener("submit", async e => { e.preventDefault(); busy(f, true); try { await fn(f); } catch (err) { msg(niceError(err), true); } busy(f, false); }); };
  on("#f-in", async () => { const email = $("#in-email").value.trim(), pass = $("#in-pass").value;
    if (!email || !pass) return msg("Escribe tu correo y contraseña.", true);
    await Auth.signIn(email, pass); });
  on("#f-up", async () => {
    const name = $("#up-name").value.trim(), email = $("#up-email").value.trim(), p1 = $("#up-pass").value, p2 = $("#up-pass2").value;
    if (name.length < 2) return msg("Escribe tu nombre.", true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg("Escribe un correo válido.", true);
    if (p1.length < 10) return msg("La contraseña debe tener al menos 10 caracteres.", true);
    if (p1 !== p2) return msg("Las contraseñas no coinciden.", true);
    const r = await Auth.signUp(email, p1, name);
    if (r.session) return; // confirmación de correo desactivada: entra directo
    msg("¡Listo! Revisa tu correo y abre el enlace para confirmar tu cuenta.");
  });
  on("#f-reset", async () => { const email = $("#rs-email").value.trim(); if (!email) return msg("Escribe tu correo.", true);
    await Auth.resetPassword(email); msg("Si el correo está registrado, te enviamos un enlace para cambiar la contraseña."); });
  on("#f-new", async () => { const p = $("#nw-pass").value; if (p.length < 10) return msg("Mínimo 10 caracteres.", true);
    await Auth.updatePassword(p); AU.recovery = false; toast("Contraseña actualizada"); start(); });
}

// ---------------- Primer ingreso: avatar y reto ----------------
const ED = { step: 1, avatar: null, reto: null, name: "" };
function editorHTML(btnLabel) {
  const a = ED.avatar, O = AV.OPTIONS;
  const sw = (k, colorOf) => `<div class="opt-row"><span class="lbl">${AV.LABELS[k]}</span><div class="opts">${O[k].map(v => colorOf
    ? `<button class="sw" type="button" data-av="${k}" data-v="${v}" aria-pressed="${a[k] === v}" aria-label="${AV.LABELS[k]}: ${AV.PRETTY(v)}" style="background:${colorOf(v)}"></button>`
    : `<button class="o" type="button" data-av="${k}" data-v="${v}" aria-pressed="${a[k] === v}">${AV.PRETTY(v)}</button>`).join("")}</div></div>`;
  return `<div class="editor"><div class="prev"><div id="av-prev">${AV.svg(a, 240)}</div><button class="btn primary" type="button" data-act="av-next">${btnLabel}</button></div>
    <div class="stack"><div class="opt-row"><span class="lbl">Elige una base</span><div class="presets">${AV.PRESETS.map(p => `<button type="button" data-preset="${p.id}" aria-label="${esc(p.label)}">${AV.svg(p.a, 72)}</button>`).join("")}</div></div>
      ${sw("skin", v => AV.SKIN[v][0])}${sw("hairStyle")}${sw("hairColor", v => AV.HAIR[v][0])}${sw("streak")}${sw("eyes", v => AV.EYES[v])}${sw("beard")}${sw("glasses")}${sw("outfit", v => AV.OUTFIT[v].c)}${sw("bg", v => v)}</div></div>`;
}
function retoHTML(label, showBack) {
  const r = ED.reto;
  return `<form id="f-reto" class="two" novalidate><div class="stack">
    <div class="stack"><label for="r-name">Tu nombre</label><input id="r-name" type="text" required minlength="2" maxlength="60" value="${esc(ED.name)}"></div>
    <div class="stack"><label for="r-type">Tu perfil</label><select id="r-type"><option value="general" ${r.profile_type === "general" ? "selected" : ""}>General: proyecto de área en lugar de cursos técnicos</option><option value="tecnico" ${r.profile_type === "tecnico" ? "selected" : ""}>Técnico: incluye cursos de código, agentes y API</option></select></div>
    <div class="stack"><span class="lbl-t">IAs que vas a aprender</span>${S.team ? `<p class="small muted" style="margin:0">Las elige quien administra tu equipo: ${aisFor(S.profile).map(aiTag).join(" ")}</p>` : aiPicker("r-ai", r.ais || ["claude"])}</div>
    <div class="stack"><label for="r-hours">Horas por semana: <span id="r-hv" style="color:var(--claude)">${h1(r.hours_per_week)} h</span></label><input id="r-hours" type="range" min="1" max="12" step="0.5" value="${r.hours_per_week}"></div>
    <div class="stack"><label for="r-start">Fecha de inicio</label><input id="r-start" type="date" value="${r.start_date}" min="2024-01-01" max="2099-12-31" required></div>
    <div class="row">${showBack ? `<button class="btn" type="button" data-act="av-back">← Avatar</button>` : ""}<button class="btn primary" type="submit">${label}</button></div></div>
    <div class="course c-violet" id="r-prev" aria-live="polite"></div></form>`;
}
function paintRetoPreview() {
  const r = ED.reto, sc = schedule(r), total = sc.length ? sc[sc.length - 1].cumHours : 0;
  $("#r-prev").innerHTML = `<span class="kicker">Con este reto</span><h2>Terminas el ${fmtDate(sc[sc.length - 1].endAt)}</h2>
    <p>${sc.length} cursos · ${h1(total)} horas · unas ${Math.ceil(total / r.hours_per_week)} semanas.</p>
    <ul class="list">${sc.slice(0, 4).map(c => `<li><b>${esc(c.name)}</b><span class="small muted">Listo el ${fmtDate(c.endAt)}</span></li>`).join("")}<li class="small muted">… y ${Math.max(0, sc.length - 4)} cursos más.</li></ul>
    <p class="small" style="margin:0">Tus horas se suman solas cada vez que apruebas un módulo en <b>Demuestra</b>.</p>`;
}
function wireEditor(v, onNext) {
  v.addEventListener("click", e => {
    const p = e.target.closest("[data-preset]"); if (p) { ED.avatar = AV.sanitize(AV.PRESETS.find(x => x.id === p.dataset.preset).a); v.querySelectorAll("[data-av]").forEach(b => b.setAttribute("aria-pressed", ED.avatar[b.dataset.av] === b.dataset.v)); $("#av-prev").innerHTML = AV.svg(ED.avatar, 240); return; }
    const o = e.target.closest("[data-av]"); if (o) { ED.avatar = AV.sanitize({ ...ED.avatar, [o.dataset.av]: o.dataset.v }); v.querySelectorAll(`[data-av="${o.dataset.av}"]`).forEach(b => b.setAttribute("aria-pressed", b === o)); $("#av-prev").innerHTML = AV.svg(ED.avatar, 240); return; }
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "av-next") onNext();
    if (a.dataset.act === "av-back") { ED.step = 1; render(); }
  });
}
function wireReto(v, onSaved) {
  const f = $("#f-reto", v);
  const read = () => { ED.name = $("#r-name").value.trim(); ED.reto = { profile_type: $("#r-type").value, hours_per_week: Number($("#r-hours").value), start_date: $("#r-start").value || isoDate(new Date()), ais: S.team ? ED.reto.ais : picked(f, "r-ai") }; $("#r-hv").textContent = h1(ED.reto.hours_per_week) + " h"; };
  f.addEventListener("input", () => { read(); paintRetoPreview(); }); paintRetoPreview();
  f.addEventListener("submit", async e => { e.preventDefault(); read();
    if (ED.name.length < 2) return toast("Escribe tu nombre (mínimo 2 letras).");
    if (!ED.reto.ais.length) return toast("Elige al menos una IA.");
    try { await Api.saveProfile(S.user.id, { display_name: ED.name, avatar: AV.sanitize(ED.avatar), ...ED.reto, configured: true }); await loadAll(); onSaved(); }
    catch (err) { toast(niceError(err)); } });
}
function viewOnboard() {
  return `<section class="stack center"><div class="steps" style="justify-content:center"><span class="${ED.step === 1 ? "on" : ""}">1 · Tu avatar</span><span class="${ED.step === 2 ? "on" : ""}">2 · Tu reto</span></div>
    <h1>${ED.step === 1 ? `¡Hola, ${esc(firstName(ED.name))}! Crea tu avatar` : "Configura tu reto semanal"}</h1>
    <p class="muted" style="margin:0">${ED.step === 1 ? "Elige una base y ajústala a tu estilo." : "Tú decides cuántas horas inviertes por semana. Te medimos contra ese compromiso."}</p></section>
  <section class="card">${ED.step === 1 ? editorHTML("Listo, siguiente →") : retoHTML("¡Empezar mi ruta!", true)}</section>`;
}
function wireOnboard(v) {
  if (ED.step === 1) wireEditor(v, () => { ED.step = 2; render(); });
  else { wireEditor(v, () => {}); wireReto(v, () => { toast("¡Tu ruta está lista!"); location.hash = "#ruta"; render(); }); }
}

// ---------------- Mi ruta ----------------
function viewRuta() {
  const p = S.profile, m = metrics(p), ms = m.ms, now = new Date();
  const pct = m.total ? Math.min(100, m.actual / m.total * 100) : 0, exp = m.total ? Math.min(100, m.expected / m.total * 100) : 0;
  const nowIdx = m.plan.findIndex(c => !(ms.byCourse[c.id] || {}).verified), ais = aisFor(p);
  return `<section class="banner"><div class="stack"><span class="kicker">Hola, ${esc(firstName(p.display_name))} · reto de ${h1(p.hours_per_week)} h por semana</span>
      <h1>Tu ruta termina el ${fmtDate(m.end)}</h1>
      <div class="meter" role="img" aria-label="Avance ${Math.round(pct)}%"><i style="width:${pct}%"></i><u style="left:calc(${exp}% - 2px)"></u></div>
      <p class="small">Barra amarilla: ${h1(m.actual)} h demostradas · Marca blanca: ${h1(m.expected)} h que deberías llevar hoy</p>
      <div class="chips"><span class="chip">${m.status.t}</span><span class="chip">${m.compliance}% de cumplimiento</span><a class="btn sun small" href="#demuestra">Demostrar un módulo</a></div></div>
    <div class="ava">${AV.svg(p.avatar, 220)}<span class="bubble">${m.status.say}</span></div></section>
  <section class="tiles">
    <div class="tile" style="--t:var(--violet);--t-soft:var(--violet-soft)"><span>Esta semana</span><b>${h1(m.thisWeek)} / ${h1(p.hours_per_week)} h</b></div>
    <div class="tile" style="--t:var(--mint);--t-soft:var(--mint-soft)"><span>Módulos dominados</span><b>${ms.done} / ${ms.total}</b></div>
    <div class="tile" style="--t:var(--claude);--t-soft:var(--claude-soft)"><span>Insignias de curso</span><b>${ms.verified.length}</b></div>
    <div class="tile" style="--t:var(--sky);--t-soft:var(--sky-soft)"><span>Puntos</span><b>${training(p).points}</b></div></section>
  ${ms.verified.length ? `<section class="card stack"><h3>Mis insignias</h3><div class="badges">${m.plan.filter(c => ms.verified.includes(c.id)).map((c, i) => BADGE(BADGE_COLORS[i % BADGE_COLORS.length], "Domina " + c.name)).join("")}</div></section>` : ""}
  <section class="stack"><h2>Tu plan, curso por curso</h2><div class="grid2">${m.plan.map((c, i) => {
    const b = ms.byCourse[c.id] || { k: 0, n: 0, pct: 0 }, hrs = c.hours * (b.n ? b.k / b.n : 0), isNow = i === nowIdx, late = !b.verified && c.endAt < now;
    return `<article class="course ${COLORS[i % COLORS.length]} ${b.verified ? "done" : ""} ${isNow ? "now" : ""}">
      <div class="hd"><span class="num">${b.verified ? "★" : i + 1}</span><div class="stack" style="gap:4px"><span class="org">${aiTag(c.ai)} ${esc(c.org)}</span><h3>${esc(c.name)}</h3></div></div>
      <div class="tags"><span class="tag">${fmtDate(c.startAt)} → ${fmtDate(c.endAt)}</span><span class="tag">${h1(c.hours)} h</span>
        ${b.verified ? `<span class="pill ok">★ Insignia ganada</span>` : late ? `<span class="pill bad">Debía terminar</span>` : isNow ? `<span class="pill acc">En curso</span>` : ""}</div>
      <p><b>Al terminar sabrás:</b> ${esc(c.learn)}</p>
      ${(eq => eq.length ? `<p class="small" style="margin:0"><b>Equivale a:</b> ${eq.map(x => `${esc(x.name)} (${esc(aiName(x.ai))})`).join(" · ")}</p>` : "")(equivalents(c, m.plan))}
      <details><summary>Ver módulos</summary><p class="small muted" style="margin-top:6px">${esc(c.detail)}</p><ul>${c.modules.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>
      <div class="meter" role="img" aria-label="Dominio ${b.pct}%"><i style="width:${b.pct}%"></i></div>
      <div class="ft"><span class="small"><b>Dominio ${b.pct}%</b> · ${b.k}/${b.n} módulos · ${h1(hrs)} h</span>
        <div class="row">${c.url ? `<a class="btn white small" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Ir al curso</a>` : ""}<button class="btn small primary" data-demo="${c.id}" type="button">${b.verified ? "Repasar" : "Demuéstralo"}</button></div></div></article>`; }).join("")}</div></section>
  ${ais.length > 1 ? equivTable(m.plan, ms, ais) : `<section class="card stack"><h3>¿Tu equipo usa otra IA?</h3><p class="muted small" style="margin:0">Hay rutas para Claude, ChatGPT, Copilot y Gemini. ${S.team ? "Quien administra tu equipo puede elegir varias en la sección Equipo" : "Puedes elegir varias en Mi perfil"} y verás qué curso de una IA equivale al de otra.</p></section>`}`;
}
// Equivalencias: cada fila es una competencia; cada columna, una IA
function equivTable(plan, ms, ais) {
  const topics = Object.keys(TOPICS).filter(t => plan.some(c => c.topic === t && c.ai !== "comun"));
  const cell = (t, ai) => plan.filter(c => c.topic === t && c.ai === ai).map(c => { const b = ms.byCourse[c.id] || { pct: 0 };
    return `<div class="eqc"><b>${esc(c.name)}</b><span class="small muted">${b.verified ? "★ Dominado" : "Dominio " + b.pct + "%"}</span></div>`; }).join("") || `<span class="small muted">—</span>`;
  return `<section class="card stack"><h3>Equivalencias entre IAs</h3><p class="muted small" style="margin:0">Los cursos de una misma fila desarrollan la misma competencia en cada IA. Si ya dominas uno, el equivalente te costará menos.</p>
    <div class="tablebox"><table class="eqt"><thead><tr><th>Competencia</th>${ais.map(ai => `<th>${aiTag(ai)}</th>`).join("")}</tr></thead><tbody>
    ${topics.map(t => `<tr><th scope="row">${esc(TOPICS[t])}</th>${ais.map(ai => `<td>${cell(t, ai)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}
function wireRuta(v) { v.addEventListener("click", e => { const d = e.target.closest("[data-demo]"); if (d) { DEM.course = d.dataset.demo; location.hash = "#demuestra"; } }); }

// ---------------- Equipo ----------------
function viewEquipo() {
  if (!S.team) return `<section class="stack"><span class="kicker">Equipo</span><h1>Aprende en equipo</h1><p class="muted" style="margin:0">Crea un equipo para tu área o empresa, o únete a uno con el código que te compartieron.</p></section>
    <section class="two"><form id="f-create" class="card stack" novalidate><h2>Crear un equipo</h2><label for="t-name">Nombre del equipo</label><input id="t-name" type="text" required minlength="2" maxlength="60" placeholder="Ej.: Proyectos 2026">
        <button class="btn primary" type="submit">Crear equipo</button><p class="small muted" style="margin:0">Recibirás un código para invitar a otras personas.</p></form>
      <form id="f-join" class="card stack" novalidate><h2>Unirme a un equipo</h2><label for="t-code">Código de invitación</label><input id="t-code" type="text" required maxlength="10" autocomplete="off" placeholder="Ej.: 4F9A2C7B1E" style="text-transform:uppercase;letter-spacing:.12em">
        <button class="btn primary" type="submit">Unirme</button></form></section>`;
  const isOwner = S.team.owner_id === S.user.id;
  const people = S.members.map(mm => S.profiles.find(p => p.id === mm.user_id)).filter(Boolean)
    .map(p => ({ p, x: p.configured ? metrics(p) : null, tr: training(p), byAi: masteryByAi(p), role: (S.members.find(mm => mm.user_id === p.id) || {}).role })).sort((a, b) => (b.x ? b.x.ms.pct : -1) - (a.x ? a.x.ms.pct : -1));
  const multi = S.team.ais.length > 1;
  return `<section class="banner" style="background:linear-gradient(135deg,#3b8cf0,#2563c9)"><div class="stack"><span class="kicker">Equipo</span><h1>${esc(S.team.name)}</h1>
      <p>${people.length} ${people.length === 1 ? "persona" : "personas"}. Cada quien se mide contra su propio reto; el dominio se demuestra en lecciones calificadas.</p>
      <div class="chips"><span class="chip">Código de invitación: <b class="code">${esc(S.team.invite_code)}</b></span><button class="btn white small" data-act="copy" type="button">Copiar código</button>
        ${isOwner ? `<button class="btn white small" data-act="regen" type="button">Cambiar código</button>` : ""}</div></div></section>
  ${isOwner ? `<form id="f-ais" class="card stack" novalidate><h2>IAs que aprende el equipo</h2><p class="muted small" style="margin:0">Elige una o varias. Cada IA suma su propia ruta y, si eliges varias, todos verán qué cursos son equivalentes entre ellas.</p>
      ${aiPicker("t-ai", S.team.ais)}<div class="row"><button class="btn primary" type="submit">Guardar IAs</button></div></form>`
    : `<section class="card stack"><h3>IAs que aprende el equipo</h3><div class="row">${aisFor(S.profile).map(aiTag).join(" ")}</div><p class="small muted" style="margin:0">Las elige quien administra el equipo.</p></section>`}
  <section class="team">${people.map(({ p, x, tr, byAi, role }) => {
    if (!x) return `<div class="card member"><div class="hd">${avatarOf(p, 64)}<div class="nm">${esc(p.display_name)}</div></div><span class="pill vio">Aún no configura su reto</span></div>`;
    const pct = x.total ? Math.min(100, x.actual / x.total * 100) : 0, exp = x.total ? Math.min(100, x.expected / x.total * 100) : 0;
    return `<div class="card member"><div class="hd">${AV.svg(p.avatar, 64)}<div><div class="nm">${esc(p.display_name)}${role === "owner" ? ` <span class="pill vio">Admin</span>` : ""}</div><div class="small muted">${p.profile_type === "tecnico" ? "Técnico" : "General"} · ${h1(p.hours_per_week)} h/semana</div></div></div>
      <div class="row"><span class="pill ${x.status.k}">${x.status.t}</span><span class="pill">${x.compliance}% cumplimiento</span></div>
      <div class="meter" style="width:100%"><i style="width:${pct}%"></i><u style="left:calc(${exp}% - 2px)"></u></div>
      <div class="small"><b>Dominio ${x.ms.pct}%</b> · ${x.ms.done}/${x.ms.total} módulos · ${x.ms.verified.length} insignias</div>
      ${multi ? `<div class="row">${byAi.map(a => `<span class="aitag" style="--ai:${AIS[a.ai].c}">${esc(aiName(a.ai))} ${a.pct}%</span>`).join("")}</div>` : ""}
      <div class="small muted">${h1(x.actual)} de ${h1(x.total)} h · termina ${fmtDate(x.end)} · ${tr.points} puntos</div>
      <div class="badges">${badges(p).filter(b => b.on).map(b => `<span class="badge on">★ ${b.t}</span>`).join("") || `<span class="small muted">Sin insignias todavía</span>`}</div></div>`; }).join("")}</section>
  <section class="card stack"><h3>Tabla del equipo</h3><div class="tablebox"><table><thead><tr><th>#</th><th>Persona</th><th class="num">Reto</th><th class="num">Horas demostradas</th><th class="num">Esperado</th><th class="num">Cumplimiento</th><th class="num">Dominio</th>${multi ? aisFor(S.profile).map(ai => `<th class="num">${esc(aiName(ai))}</th>`).join("") : ""}<th class="num">Puntos</th></tr></thead><tbody>
    ${people.filter(r => r.x).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.p.display_name)}</td><td class="num">${h1(r.p.hours_per_week)} h/sem</td><td class="num">${h1(r.x.actual)}</td><td class="num">${h1(r.x.expected)}</td><td class="num">${r.x.compliance}%</td><td class="num">${r.x.ms.pct}%</td>${multi ? r.byAi.map(a => `<td class="num">${a.pct}%</td>`).join("") : ""}<td class="num">${r.tr.points}</td></tr>`).join("")}</tbody></table></div></section>
  <section class="row"><button class="btn" data-act="leave" type="button">Salir del equipo</button></section>`;
}
function wireEquipo(v) {
  const f1 = $("#f-create", v), f2 = $("#f-join", v), f3 = $("#f-ais", v);
  if (f3) f3.addEventListener("submit", async e => { e.preventDefault(); const ais = picked(f3, "t-ai"); if (!ais.length) return toast("Elige al menos una IA.");
    try { await Api.setTeamAis(ais); await loadAll(); toast("IAs del equipo guardadas"); render(); } catch (err) { toast(niceError(err)); } });
  if (f1) f1.addEventListener("submit", async e => { e.preventDefault(); const n = $("#t-name").value.trim(); if (n.length < 2) return toast("Escribe un nombre de al menos 2 letras.");
    try { await Api.createTeam(n); await loadAll(); toast("¡Equipo creado! Comparte el código."); render(); } catch (err) { toast(niceError(err)); } });
  if (f2) f2.addEventListener("submit", async e => { e.preventDefault(); const c = $("#t-code").value.trim().toUpperCase(); if (!/^[0-9A-F]{10}$/.test(c)) return toast("El código tiene 10 caracteres (números y letras A-F).");
    try { const r = await Api.joinTeam(c); await loadAll(); toast("Te uniste a " + r.name); render(); } catch (err) { toast(niceError(err)); } });
  v.addEventListener("click", async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    if (b.dataset.act === "copy") { try { await navigator.clipboard.writeText(S.team.invite_code); toast("Código copiado"); } catch (err) { toast("Código: " + S.team.invite_code); } }
    if (b.dataset.act === "regen") { if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "¿Seguro? El código anterior dejará de servir"; return; }
      try { await Api.regenerateInvite(); await loadAll(); toast("Código nuevo listo"); render(); } catch (err) { toast(niceError(err)); } }
    if (b.dataset.act === "leave") { if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "¿Seguro que quieres salir?"; return; }
      try { await Api.leaveTeam(); await loadAll(); toast("Saliste del equipo"); render(); } catch (err) { toast(niceError(err)); } }
  });
}

// ---------------- Mi perfil ----------------
function viewPerfil() {
  return `<section class="stack"><span class="kicker">Mi perfil</span><h1>Tu avatar y tu reto</h1><p class="muted" style="margin:0">Si cambias tus horas, la página recalcula las fechas de cada curso.</p></section>
    <section class="card">${editorHTML("Guardar avatar")}</section>
    <section class="card stack"><h2>Tu reto semanal</h2>${retoHTML("Guardar cambios", false)}</section>
    <section class="card stack"><h3>Tu cuenta</h3><p class="muted small" style="margin:0">${esc(S.user.email)}</p><div class="row"><button class="btn" data-act="logout" type="button">Cerrar sesión</button></div></section>`;
}
function wirePerfil(v) {
  wireEditor(v, async () => { try { await Api.saveProfile(S.user.id, { avatar: AV.sanitize(ED.avatar) }); await loadAll(); toast("Avatar guardado"); render(); } catch (err) { toast(niceError(err)); } });
  wireReto(v, () => { toast("Cambios guardados"); render(); });
  v.addEventListener("click", async e => { if (e.target.closest("[data-act='logout']")) { await Auth.signOut(); } });
}

// ---------------- Enrutador ----------------
const VIEWS = { ruta: [viewRuta, wireRuta], demuestra: [viewDemuestra, wireDemuestra], entrenar: [viewEntrenar, wireEntrenar], equipo: [viewEquipo, wireEquipo], perfil: [viewPerfil, wirePerfil] };
function mount(html, wire) { const old = $("#view"), v = old.cloneNode(false); old.replaceWith(v); v.innerHTML = html; if (wire) wire(v); }
function render() {
  const p = S.profile;
  $("#nav").hidden = !(p && p.configured); $("#b-me").hidden = !p;
  if (!S.user || AU.recovery) { mount(viewAuth(), wireAuth); return; }
  if (!p) { mount(`<div class="card center"><p class="muted">Cargando…</p></div>`); return; }
  $("#b-me").innerHTML = `${p.avatar ? AV.svg(p.avatar, 34) : ""}<span>${esc(firstName(p.display_name))}</span>`;
  if (!p.configured) { mount(viewOnboard(), wireOnboard); return; }
  const key = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : "ruta";
  document.querySelectorAll("#nav a").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + key ? "page" : "false"));
  if (key === "perfil") { ED.avatar = AV.sanitize(p.avatar); ED.reto = { profile_type: p.profile_type, hours_per_week: Number(p.hours_per_week), start_date: p.start_date, ais: p.ais || ["claude"] }; ED.name = p.display_name; }
  mount(VIEWS[key][0](), VIEWS[key][1]);
}
ctx.render = render;

let booting = false;
async function start() {
  if (booting) return; booting = true;
  try {
    const session = await Auth.session();
    S.user = session ? session.user : null; S.profile = null;
    if (S.user) {
      S.profile = await Api.myProfile(S.user.id);
      await loadAll();
      if (!S.profile.configured) { ED.step = 1; ED.name = S.profile.display_name; ED.avatar = AV.sanitize(S.profile.avatar); ED.reto = { profile_type: "general", hours_per_week: 3.5, start_date: isoDate(new Date()), ais: S.profile.ais || ["claude"] }; }
    }
  } catch (err) { toast(niceError(err)); }
  booting = false; render(); window.scrollTo(0, 0);
}
Auth.onChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") { AU.recovery = true; S.user = session?.user || null; render(); return; }
  if (event === "SIGNED_IN" && (!S.user || S.user.id !== session.user.id)) start();
  if (event === "SIGNED_OUT") { history.replaceState(null, "", location.pathname); AU.tab = "in"; S.user = null; S.profile = null; Object.assign(S, { profiles: [], mastery: [], training: [], team: null, members: [] }); render(); }
});
window.addEventListener("hashchange", () => { if (S.profile && S.profile.configured) { render(); window.scrollTo(0, 0); $("#view").focus({ preventScroll: true }); } });
$("#b-me").addEventListener("click", () => { location.hash = "#perfil"; });
start();
