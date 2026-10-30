// Entrenamiento: quiz, "Detecta la alucinación", laboratorio de prompts, tarjetas y reto semanal.
// Son prácticas: suman puntos, pero el dominio oficial lo da "Demuestra".
import { Api } from "./api.js";
import { AV } from "./avatar.js";
import { QUIZ, HALLU, PROMPT_LAB, RUBRIC, CARDS, CHALLENGES } from "./catalog.js";
import { S, ctx, metrics, training, badges, loadAll } from "./state.js";
import { $, esc, toast, niceError } from "./util.js";

const TR = { tab: "quiz", qi: 0, qAns: null, qScore: 0, hi: 0, hMarks: new Set(), hDone: false, pi: 0, ci: 0, flipped: false };
const scorePrompt = txt => RUBRIC.filter(r => r.re.test(txt) && txt.trim().length > 25);

export function viewEntrenar() {
  const p = S.profile, tr = training(p), bs = badges(p);
  const tabs = [["quiz", "Quiz"], ["hallu", "Detecta la alucinación"], ["prompt", "Laboratorio de prompts"], ["cards", "Tarjetas"], ["reto", "Reto de la semana"]];
  return `<section class="banner" style="background:linear-gradient(135deg,#21b47e,#14936a)"><div class="stack"><span class="kicker">Entrenamiento</span><h1>Practica lo que vas aprendiendo</h1>
      <p>Llevas <b>${tr.points} puntos</b> y ${bs.filter(b => b.on).length} de ${bs.length} insignias.</p>
      <div class="badges">${bs.map(b => `<span class="chip" style="${b.on ? "background:#fff;color:#14936a" : ""}">${b.on ? "★ " : ""}${b.t}</span>`).join("")}</div></div>
    <div class="ava">${AV.svg(p.avatar, 180)}<span class="bubble">¡A entrenar!</span></div></section>
  <div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button class="tab" role="tab" type="button" data-tab="${k}" aria-selected="${TR.tab === k}">${t}</button>`).join("")}</div>
  <section class="card stack" id="tr-body">${body()}</section>`;
}

function body() {
  if (TR.tab === "quiz") {
    if (TR.qi >= QUIZ.length) return `<span class="kicker">Resultado</span><div class="score">${TR.qScore} / ${QUIZ.length}</div><p>${TR.qScore >= QUIZ.length * .8 ? "¡Excelente! Ganaste la insignia Quiz 80%." : "Repasa las explicaciones y vuelve a intentarlo: necesitas 8 de 10."}</p><div><button class="btn primary" data-act="q-restart" type="button">Repetir quiz</button></div>`;
    const q = QUIZ[TR.qi];
    return `<span class="kicker">Pregunta ${TR.qi + 1} de ${QUIZ.length}</span><h2>${esc(q.q)}</h2>
      <div class="opts-q">${q.o.map((o, i) => `<button class="opt ${TR.qAns !== null ? (i === q.a ? "right" : i === TR.qAns ? "wrong" : "") : ""}" data-act="q-ans" data-i="${i}" type="button" ${TR.qAns !== null ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
      ${TR.qAns !== null ? `<div class="explain pop">${TR.qAns === q.a ? "<b>¡Correcto!</b> " : "<b>No exactamente.</b> "}${esc(q.e)}</div><div><button class="btn primary" data-act="q-next" type="button">${TR.qi === QUIZ.length - 1 ? "Ver resultado" : "Siguiente →"}</button></div>` : ""}`;
  }
  if (TR.tab === "hallu") {
    const h = HALLU[TR.hi], bad = h.sentences.filter(s => s.bad).length;
    return `<span class="kicker">Caso ${TR.hi + 1} de ${HALLU.length} · ${esc(h.title)}</span>
      <div class="explain"><b>Se le pidió a la IA:</b> ${esc(h.ask)}</div>
      <p style="margin:0">La IA respondió esto. <b>Toca las ${bad} frases que no están respaldadas por la información dada.</b></p>
      <div class="stack">${h.sentences.map((s, i) => { let cls = TR.hMarks.has(i) ? "marked" : ""; if (TR.hDone) cls = s.bad ? (TR.hMarks.has(i) ? "hit" : "miss") : (TR.hMarks.has(i) ? "miss" : "");
        return `<button class="sent ${cls}" data-act="h-mark" data-i="${i}" type="button" ${TR.hDone ? "disabled" : ""}>${esc(s.t)}${TR.hDone && (s.why || s.note) ? `<span class="small muted" style="display:block">${esc(s.why || s.note)}</span>` : ""}</button>`; }).join("")}</div>
      <div>${TR.hDone ? `<button class="btn primary" data-act="h-next" type="button">${TR.hi === HALLU.length - 1 ? "Empezar de nuevo" : "Siguiente caso →"}</button>` : `<button class="btn primary" data-act="h-check" type="button">Revisar</button>`}</div>`;
  }
  if (TR.tab === "prompt") {
    const c = PROMPT_LAB[TR.pi];
    return `<span class="kicker">Caso ${TR.pi + 1} de ${PROMPT_LAB.length}</span><h2>Mejora este prompt: “${esc(c.weak)}”</h2><p class="muted" style="margin:0"><b>Situación:</b> ${esc(c.context)}</p>
      <div class="two"><div class="stack"><label for="p-text">Tu prompt mejorado</label><textarea id="p-text" maxlength="1500" style="min-height:210px" placeholder="Escribe aquí tu versión…"></textarea>
        <div class="row"><button class="btn primary" data-act="p-save" type="button">Guardar intento</button><button class="btn" data-act="p-next" type="button">Otro caso</button></div></div>
        <div class="stack"><h3>Lista de revisión</h3><ul class="rubric" id="p-rub">${RUBRIC.map(r => `<li data-r="${r.id}">${r.label}</li>`).join("")}</ul>
          <div class="score" id="p-score">0 / ${RUBRIC.length}</div><p class="small muted" style="margin:0">Pista: ${esc(c.tip)} Después pruébalo en Claude y compara con el prompt original.</p></div></div>`;
  }
  if (TR.tab === "cards") {
    const [f, b] = CARDS[TR.ci];
    return `<span class="kicker">Tarjeta ${TR.ci + 1} de ${CARDS.length} · toca para voltear</span>
      <div class="flip ${TR.flipped ? "on" : ""}" data-act="c-flip" role="button" tabindex="0" aria-label="Voltear tarjeta"><div class="in"><div class="f">${esc(f)}</div><div class="b">${esc(b)}</div></div></div>
      <div class="row"><button class="btn" data-act="c-prev" type="button">← Anterior</button><button class="btn primary" data-act="c-next" type="button">Siguiente →</button></div>`;
  }
  const w = Math.min(CHALLENGES.length - 1, metrics(S.profile).weekIndex), mine = training(S.profile).challenges, doneThis = mine.find(x => x.item_id === "w" + (w + 1));
  return `<span class="kicker">Semana ${w + 1} de tu ruta</span><h2>${esc(CHALLENGES[w])}</h2>
    ${doneThis ? `<div class="explain"><b>Reto entregado.</b> ${esc(doneThis.payload?.text || "")}</div>` : `<div class="stack"><label for="r-text">¿Qué hiciste y qué resultado obtuviste?</label><textarea id="r-text" maxlength="1500" placeholder="Cuéntalo en 2 o 3 frases. Si mediste tiempo, anótalo."></textarea><div><button class="btn primary" data-act="r-save" type="button">Entregar reto (+30 puntos)</button></div></div>`}
    ${mine.length ? `<h3>Retos entregados</h3><ul class="list">${mine.map(x => `<li><b>Semana ${esc(x.item_id.slice(1))}</b><span class="small muted">${esc(x.payload?.text || "")}</span></li>`).join("")}</ul>` : ""}`;
}

export function wireEntrenar(v) {
  const rer = () => { $("#tr-body", v).innerHTML = body(); if (TR.tab === "prompt") wireP(); };
  const wireP = () => { const ta = $("#p-text", v); if (!ta) return; ta.addEventListener("input", () => { const ok = new Set(scorePrompt(ta.value).map(r => r.id)); v.querySelectorAll("#p-rub li").forEach(li => li.classList.toggle("ok", ok.has(li.dataset.r))); $("#p-score", v).textContent = `${ok.size} / ${RUBRIC.length}`; }); };
  wireP();
  const save = async t => { try { await Api.addTraining(t); await loadAll(); return true; } catch (err) { toast(niceError(err)); return false; } };
  v.addEventListener("keydown", e => { const f = e.target.closest("[data-act='c-flip']"); if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); TR.flipped = !TR.flipped; f.classList.toggle("on", TR.flipped); } });
  v.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]"); if (t) { TR.tab = t.dataset.tab; ctx.render(); return; }
    const a = e.target.closest("[data-act]"); if (!a) return; const act = a.dataset.act;
    if (act === "q-ans") { TR.qAns = Number(a.dataset.i); const ok = TR.qAns === QUIZ[TR.qi].a; if (ok) TR.qScore++; rer(); await save({ activity: "quiz", item_id: "q" + TR.qi, score: ok ? 1 : 0, max_score: 1 }); }
    if (act === "q-next") { TR.qi++; TR.qAns = null; TR.qi >= QUIZ.length ? ctx.render() : rer(); }
    if (act === "q-restart") { TR.qi = 0; TR.qAns = null; TR.qScore = 0; rer(); }
    if (act === "h-mark") { const i = Number(a.dataset.i); TR.hMarks.has(i) ? TR.hMarks.delete(i) : TR.hMarks.add(i); rer(); }
    if (act === "h-check") { const h = HALLU[TR.hi], bad = h.sentences.map((s, i) => s.bad ? i : -1).filter(i => i >= 0);
      const score = Math.max(0, bad.filter(i => TR.hMarks.has(i)).length - [...TR.hMarks].filter(i => !h.sentences[i].bad).length); TR.hDone = true;
      await save({ activity: "hallu", item_id: "h" + TR.hi, score, max_score: bad.length }); toast(score === bad.length ? "¡Las encontraste todas!" : `Encontraste ${score} de ${bad.length}`); ctx.render(); }
    if (act === "h-next") { TR.hi = (TR.hi + 1) % HALLU.length; TR.hMarks = new Set(); TR.hDone = false; rer(); }
    if (act === "p-save") { const txt = $("#p-text", v).value; if (txt.trim().length < 26) { toast("Escribe un prompt más completo"); return; } const ok = scorePrompt(txt);
      if (await save({ activity: "prompt", item_id: "p" + TR.pi, score: ok.length, max_score: RUBRIC.length, payload: { text: txt.slice(0, 1500) } })) toast(`Guardado: ${ok.length} de ${RUBRIC.length} criterios`); ctx.render(); }
    if (act === "p-next") { TR.pi = (TR.pi + 1) % PROMPT_LAB.length; rer(); }
    if (act === "c-flip") { TR.flipped = !TR.flipped; a.classList.toggle("on", TR.flipped); }
    if (act === "c-next" || act === "c-prev") { TR.ci = (TR.ci + (act === "c-next" ? 1 : -1) + CARDS.length) % CARDS.length; TR.flipped = false; rer(); }
    if (act === "r-save") { const txt = $("#r-text", v).value.trim(); if (txt.length < 10) { toast("Cuéntanos un poco más de tu resultado"); return; }
      const w = Math.min(CHALLENGES.length - 1, metrics(S.profile).weekIndex) + 1;
      if (await save({ activity: "challenge", item_id: "w" + w, score: 1, max_score: 1, payload: { text: txt.slice(0, 1500) } })) toast("¡Reto entregado! +30 puntos"); ctx.render(); }
  });
}
