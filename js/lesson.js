// "Demuestra tu aprendizaje": ruta de módulos estilo Duolingo y lección calificada en el servidor.
import { Api } from "./api.js";
import { AV } from "./avatar.js";
import { S, ctx, COLORS, AIS, aiName, aisFor, planFor, mastery, loadAll } from "./state.js";
import { $, esc, shuffle, toast, niceError } from "./util.js";

export const DEM = { course: null };
const TROPHY = `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/></svg>`;
const LOCK = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
const HEART = on => `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.3C1 8 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 6 3.5 4.5 7.2C19.5 16.4 12 21 12 21Z" fill="${on ? "#ff4b6e" : "var(--line)"}"/></svg>`;
export const BADGE = (color, label) => `<span class="cbadge" style="--b:${color}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>${esc(label)}</span>`;

export function viewDemuestra() {
  const p = S.profile, ms = mastery(p), courses = planFor(p).filter(c => ms.byCourse[c.id]), multi = aisFor(p).length > 1;
  const tag = ai => `<span class="aitag" style="--ai:${(AIS[ai] || { c: "var(--muted)" }).c}">${esc(aiName(ai))}</span>`;
  if (!DEM.course || !courses.find(c => c.id === DEM.course)) DEM.course = (courses.find(c => ms.byCourse[c.id].k && !ms.byCourse[c.id].verified) || courses.find(c => !ms.byCourse[c.id].verified) || courses[0]).id;
  const ci = courses.findIndex(c => c.id === DEM.course), c = courses[ci], b = ms.byCourse[c.id];
  const col = COLORS[planFor(p).findIndex(x => x.id === c.id) % COLORS.length];
  const next = c.modules.findIndex((_, i) => !ms.passed.has(c.id + ":" + i));
  return `<section class="banner" style="background:linear-gradient(135deg,#ff9a5c,#d9653f)"><div class="stack"><span class="kicker">Demuestra tu aprendizaje</span>
      <h1>¿Cuánto sabes de verdad?</h1><p>Cada módulo es una lección de 3 preguntas con 3 vidas, calificada en el servidor. Para aprobar, acierta al menos 2 a la primera. Al aprobarla sumas las horas de estudio de ese módulo. Domina todos los módulos de un curso y ganas su <b>insignia</b>.</p>
      <div class="chips"><span class="chip">${ms.done} de ${ms.total} módulos</span><span class="chip">${ms.verified.length} insignias</span><span class="chip">${ms.xp} XP</span></div></div>
    <div class="ava">${AV.svg(p.avatar, 190)}<span class="bubble">${ms.done ? "¡Sigue así!" : "¡Demuestra lo que sabes!"}</span></div></section>
  <div class="cpick" role="tablist" aria-label="Cursos">${courses.map(x => { const v = ms.byCourse[x.id]; return `<button type="button" role="tab" aria-selected="${x.id === c.id}" class="cchip ${x.id === c.id ? "on" : ""}" data-course="${esc(x.id)}" style="--pct:${v.pct}">
      <span class="ring"><span>${v.verified ? "★" : v.pct + "%"}</span></span><span>${multi && x.ai !== "comun" ? `<small class="cai" style="--ai:${AIS[x.ai].c}">${esc(aiName(x.ai))}</small>` : ""}${esc(x.name)}</span></button>`; }).join("")}</div>
  <section class="pathbox ${col}">
    <div class="pathhead"><span class="org">${tag(c.ai)} ${esc(c.org)}</span><h2>${esc(c.name)}</h2><p class="muted" style="margin:0">${b.k} de ${b.n} módulos dominados</p><div class="meter"><i style="width:${b.pct}%"></i></div></div>
    <div class="path">${c.modules.map((name, i) => { const id = c.id + ":" + i, ok = ms.passed.has(id), pf = ms.perfect.has(id), open = i === 0 || ms.passed.has(c.id + ":" + (i - 1)), isNext = i === next;
      return `<div class="pnode" style="--x:${Math.round(Math.sin(i * 1.15) * 26)}%">${isNext ? `<span class="go">¡EMPIEZA!</span>` : ""}
        <button type="button" class="pbtn ${ok ? "ok" : open ? "open" : "lock"} ${isNext ? "next" : ""}" data-lesson="${i}" ${open ? "" : "disabled"} aria-label="Módulo ${i + 1}: ${esc(name)}${ok ? " (dominado)" : open ? "" : " (bloqueado)"}">${ok ? (pf ? "★" : "✓") : open ? i + 1 : LOCK}</button>
        <span class="plabel">${esc(name)}${ok ? `<small>${pf ? "Perfecto" : "Dominado"} · repasar</small>` : ""}</span></div>`; }).join("")}
      <div class="pnode" style="--x:0%"><span class="trophy ${b.verified ? "on" : ""}">${TROPHY}</span><span class="plabel">${b.verified ? "¡Insignia ganada!" : "Gana la insignia del curso"}</span></div></div>
    <div class="row" style="justify-content:space-between">${ci > 0 ? `<button class="btn" data-course="${esc(courses[ci - 1].id)}" type="button">← ${esc(courses[ci - 1].name)}</button>` : "<span></span>"}
      ${ci < courses.length - 1 ? `<button class="btn" data-course="${esc(courses[ci + 1].id)}" type="button">${esc(courses[ci + 1].name)} →</button>` : ""}</div>
  </section>`;
}
export function wireDemuestra(v) {
  v.addEventListener("click", e => {
    const c = e.target.closest("[data-course]"); if (c) { DEM.course = c.dataset.course; ctx.render(); return; }
    const l = e.target.closest("[data-lesson]"); if (l && !l.disabled) startLesson(DEM.course, Number(l.dataset.lesson));
  });
}

// ---------- Lección ----------
const L = {};
let wired = false;
async function startLesson(courseId, mi) {
  const ov = overlay(); ov.hidden = false; document.body.style.overflow = "hidden";
  ov.innerHTML = `<div class="lbody center"><p class="muted">Preparando tu lección…</p></div>`;
  try {
    const r = await Api.startLesson(courseId, mi);
    const qs = r.questions.map(q => ({ id: q.id, prompt: q.prompt, opts: shuffle(q.options.map((t, i) => ({ t, i }))), first: true }));
    Object.assign(L, { courseId, mi, session: r.session_id, queue: qs, idx: 0, hearts: r.hearts, firstOk: 0, total: qs.length, sel: null, fb: null, combo: 0, done: null, busy: false });
    paint();
  } catch (err) { ov.innerHTML = `<div class="lbody center"><h2>No se pudo iniciar</h2><p class="muted">${esc(niceError(err))}</p><button class="btn primary" type="button" data-l="close">Volver</button></div>`; }
}
function overlay() {
  let ov = $("#lesson");
  if (!ov) { ov = document.createElement("div"); ov.id = "lesson"; ov.className = "lesson"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Lección"); document.body.appendChild(ov); }
  if (!wired) { wired = true; wire(ov); }
  return ov;
}
function close() { const ov = $("#lesson"); if (ov) ov.hidden = true; document.body.style.overflow = ""; ctx.render(); }
function focusIn(ov) {
  if (ov.contains(document.activeElement)) return;
  const f = ov.querySelector("button:not([disabled]), [href], input, textarea"); if (f) f.focus({ preventScroll: true });
}
function paint() {
  const ov = $("#lesson"), c = planFor(S.profile).find(x => x.id === L.courseId), me = S.profile;
  const prog = Math.round(Math.min(L.idx, L.queue.length) / L.queue.length * 100);
  const top = `<div class="lstop"><button class="iconbtn" type="button" data-l="close" aria-label="Salir de la lección">✕</button><div class="meter lmeter"><i style="width:${L.done ? 100 : prog}%"></i></div>
    <div class="hearts" aria-label="${L.hearts} vidas">${[0, 1, 2].map(i => HEART(i < L.hearts)).join("")}</div></div>`;
  if (L.done) {
    const d = L.done, win = d.passed;
    ov.innerHTML = `${top}<div class="lbody center pop"><div class="ava">${AV.svg(me.avatar, 170)}</div>
      <h1>${win ? (d.perfect ? "¡Perfecto!" : "¡Módulo dominado!") : d.hearts > 0 ? "¡Casi lo logras!" : "Te quedaste sin vidas"}</h1>
      <p class="muted">${esc(c.name)} · ${esc(c.modules[L.mi])}</p>
      <div class="lstats"><div class="tile" style="--t:var(--sun);--t-soft:var(--sun-soft)"><span>XP</span><b>+${d.xp || 0}</b></div>
        <div class="tile" style="--t:var(--mint);--t-soft:var(--mint-soft)"><span>Horas</span><b>+${Number(d.hours || 0).toLocaleString("es")}</b></div>
        <div class="tile" style="--t:var(--rose);--t-soft:var(--rose-soft)"><span>Precisión</span><b>${Math.round((d.first_ok || 0) / (d.total || 1) * 100)}%</b></div></div>
      <p>${win ? (Number(d.hours) > 0 ? "Se sumaron automáticamente a tu reto las horas de estudio de este módulo." : "Repasaste un módulo que ya dominabas.") : (d.hearts > 0 ? `Para dominar el módulo necesitas acertar al menos ${d.need || Math.max(1, (d.total || 3) - 1)} preguntas a la primera. ` : "") + "Repasa el módulo en el curso y vuelve a intentarlo. ¡Tú puedes!"}</p>
      ${L.newBadge ? `<div class="explain pop">Ganaste la insignia <b>${esc(c.name)}</b>. ¡Demostraste que dominas el curso!</div>` : ""}
      <div class="row" style="justify-content:center">${win ? `<button class="btn primary" type="button" data-l="close">Continuar</button>` : `<button class="btn" type="button" data-l="close">Salir</button><button class="btn primary" type="button" data-l="retry">Intentar de nuevo</button>`}</div></div>`;
    ov.querySelector(".lbody .btn.primary").focus({ preventScroll: true });
    return;
  }
  const q = L.queue[L.idx], fb = L.fb;
  ov.innerHTML = `${top}<div class="lbody"><div class="lq"><div class="mascot">${AV.svg(me.avatar, 86)}<span class="say">${q.first ? (L.combo >= 2 ? `¡${L.combo} seguidas!` : "Tú puedes") : "Repasemos esta"}</span></div>
      <div class="stack" style="gap:6px"><span class="kicker">${esc(c.modules[L.mi])}</span><h2>${esc(q.prompt)}</h2></div></div>
    <div class="lopts">${q.opts.map((o, k) => `<button type="button" class="lopt ${L.sel === k ? "sel" : ""} ${fb ? (o.i === fb.answer_idx ? "right" : L.sel === k ? "wrong" : "") : ""}" data-opt="${k}" ${fb || L.busy ? "disabled" : ""}><kbd>${k + 1}</kbd>${esc(o.t)}</button>`).join("")}</div></div>
  <div class="lfoot ${fb ? (fb.correct ? "good" : "badf") : ""}"><div class="lfin">
    ${fb ? `<div class="stack" style="gap:4px"><h3>${fb.correct ? "¡Excelente!" : fb.answer_idx == null ? "Esa no es la respuesta" : "Respuesta correcta: " + esc((q.opts.find(o => o.i === fb.answer_idx) || {}).t)}</h3><p style="margin:0">${fb.explanation ? esc(fb.explanation) : "Esta pregunta volverá al final de la lección."}</p></div><button class="btn ${fb.correct ? "mintb" : "roseb"}" type="button" data-l="next">Continuar</button>`
      : `<span class="muted small">Elige una respuesta</span><button class="btn primary" type="button" data-l="check" ${L.sel === null || L.busy ? "disabled" : ""}>${L.busy ? "Revisando…" : "Comprobar"}</button>`}</div></div>`;
  if (fb) ov.querySelector("[data-l='next']").focus({ preventScroll: true });
  else if (L.sel !== null) { const s = ov.querySelector(`[data-opt="${L.sel}"]`); if (s) s.focus({ preventScroll: true }); }
  else focusIn(ov);
}
async function check() {
  if (L.sel === null || L.fb || L.busy) return;
  const q = L.queue[L.idx]; L.busy = true; paint();
  try {
    const r = await Api.checkAnswer(L.session, q.id, q.opts[L.sel].i);
    L.fb = r; L.hearts = r.hearts;
    if (r.correct) { L.combo++; if (q.first) L.firstOk++; } else { L.combo = 0; L.queue.push({ ...q, first: false, opts: shuffle(q.opts) }); }
  } catch (err) { toast(niceError(err)); }
  L.busy = false; paint();
}
async function next() {
  if (!L.fb) return;
  const failed = L.fb.failed; L.idx++; L.sel = null; L.fb = null;
  if (failed || L.idx >= L.queue.length) { await finish(); return; }
  paint();
}
async function finish() {
  L.busy = true;
  $("#lesson").querySelector(".lbody").innerHTML = `<div class="center stack"><p class="muted">Calculando tu resultado…</p></div>`;
  try {
    const before = mastery(S.profile).byCourse[L.courseId];
    L.done = await Api.finishLesson(L.session);
    await loadAll();
    const after = mastery(S.profile).byCourse[L.courseId];
    L.newBadge = after && after.verified && !(before && before.verified);
  } catch (err) { L.done = { passed: false, xp: 0, hours: 0, first_ok: L.firstOk, total: L.total }; toast(niceError(err)); }
  L.busy = false; paint();
}
function wire(ov) {
  ov.addEventListener("click", e => {
    const o = e.target.closest("[data-opt]"); if (o && !L.fb && !L.busy) { L.sel = Number(o.dataset.opt); paint(); return; }
    const b = e.target.closest("[data-l]"); if (!b) return;
    const a = b.dataset.l;
    if (a === "close") close(); else if (a === "retry") startLesson(L.courseId, L.mi); else if (a === "check") check(); else if (a === "next") next();
  });
  document.addEventListener("keydown", e => {
    if (ov.hidden) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab") { // mantener el foco dentro del diálogo
      const f = [...ov.querySelectorAll("button:not([disabled]), [href], input, textarea")]; if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (!ov.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    if (L.done || !L.queue) return;
    const q = L.queue[L.idx];
    if (/^[1-6]$/.test(e.key) && q && !L.fb && Number(e.key) <= q.opts.length) { L.sel = Number(e.key) - 1; paint(); return; }
    if (e.key === "Enter") { e.preventDefault(); L.fb ? next() : check(); }
  });
}
