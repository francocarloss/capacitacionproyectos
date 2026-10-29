// Avatares estilo anime dibujados en SVG a partir de unas pocas opciones.
(() => {
"use strict";
const SKIN = { clara: ["#f9dcc4", "#eebfa0"], media: ["#efc39f", "#d9a37c"], morena: ["#d9a079", "#bf8259"], canela: ["#c08458", "#a06a43"], oscura: ["#8d5a3b", "#71452b"] };
const HAIR = { negro: ["#1d1b24", "#3b3748"], castano_oscuro: ["#3b2418", "#5c3a28"], castano: ["#6b4226", "#8f5c37"], castano_claro: ["#a0703f", "#c8955c"], rubio: ["#d9b26a", "#efd28f"], rojo: ["#8e2f22", "#b9483a"] };
const EYES = { cafe: "#5a3420", oscuro: "#2b1c14", miel: "#a8682a", verde: "#3f7a4a", azul: "#3a6ea8" };
const OUTFIT = { saco_azul: { c: "#24304f", shirt: "#ffffff", kind: "saco" }, saco_gris: { c: "#4a5163", shirt: "#ffffff", kind: "saco" },
  sueter_verde: { c: "#2f5d46", shirt: "#18181f", kind: "zip" }, sueter_morado: { c: "#6c4fd6", shirt: "#ffd84d", kind: "zip" },
  camisa_blanca: { c: "#f3f4f8", shirt: "#d6dbe6", kind: "camisa" }, blusa_coral: { c: "#ff8a6b", shirt: "#ffd6c9", kind: "camisa" } };
const BG = ["#ffd9c7", "#d9f2e4", "#dfe7ff", "#efe3ff", "#fff1c2", "#ffdbe6"];

const OPTIONS = {
  skin: Object.keys(SKIN), hairStyle: ["peinado_atras", "corto_lateral", "corto_puntas", "largo_lacio", "largo_ondas", "melena", "cola"],
  hairColor: Object.keys(HAIR), eyes: Object.keys(EYES), beard: ["ninguna", "candado", "corta", "completa"],
  glasses: ["no", "redondos", "rectos"], outfit: Object.keys(OUTFIT), bg: BG, streak: ["no", "si"]
};
const LABELS = { skin: "Piel", hairStyle: "Peinado", hairColor: "Color de cabello", eyes: "Ojos", beard: "Barba", glasses: "Lentes", outfit: "Ropa", bg: "Fondo", streak: "Canas" };
const PRETTY = s => String(s).replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

const PRESETS = [
  { id: "carlos", label: "Cabello hacia atrás y barba", a: { skin: "morena", hairStyle: "peinado_atras", hairColor: "negro", streak: "si", eyes: "cafe", beard: "candado", glasses: "no", outfit: "sueter_verde", bg: "#d9f2e4" } },
  { id: "p1", label: "Cabello largo castaño claro", a: { skin: "clara", hairStyle: "largo_lacio", hairColor: "castano_claro", streak: "no", eyes: "miel", beard: "ninguna", glasses: "no", outfit: "saco_azul", bg: "#dfe7ff" } },
  { id: "p2", label: "Corto con barba", a: { skin: "media", hairStyle: "corto_lateral", hairColor: "negro", streak: "no", eyes: "oscuro", beard: "completa", glasses: "no", outfit: "saco_azul", bg: "#efe3ff" } },
  { id: "p3", label: "Corto peinado de lado", a: { skin: "media", hairStyle: "corto_lateral", hairColor: "castano_oscuro", streak: "no", eyes: "cafe", beard: "ninguna", glasses: "no", outfit: "saco_azul", bg: "#fff1c2" } },
  { id: "p4", label: "Melena castaño oscuro", a: { skin: "morena", hairStyle: "largo_ondas", hairColor: "castano_oscuro", streak: "no", eyes: "cafe", beard: "ninguna", glasses: "no", outfit: "saco_azul", bg: "#ffdbe6" } },
  { id: "p5", label: "Puntas y lentes", a: { skin: "canela", hairStyle: "corto_puntas", hairColor: "castano", streak: "no", eyes: "miel", beard: "ninguna", glasses: "redondos", outfit: "sueter_morado", bg: "#ffd9c7" } }
];

function hairBack(st, c) {
  const f = c[0];
  if (st === "largo_lacio") return `<path d="M56 92 C52 50 76 30 100 30 C124 30 148 50 144 92 L150 176 C128 186 72 186 50 176 Z" fill="${f}"/>`;
  if (st === "largo_ondas") return `<path d="M56 90 C50 48 76 30 100 30 C126 30 150 48 144 90 C150 110 140 122 148 140 C156 158 140 172 128 172 L72 172 C60 172 44 158 52 140 C60 122 50 110 56 90 Z" fill="${f}"/>`;
  if (st === "melena") return `<path d="M58 92 C54 52 78 32 100 32 C122 32 146 52 142 92 L144 138 C130 146 70 146 56 138 Z" fill="${f}"/>`;
  if (st === "cola") return `<path d="M128 70 C160 80 162 130 146 158 C140 136 140 112 128 96 Z" fill="${f}"/>`;
  return "";
}
function hairFront(st, c, streak) {
  const [f, l] = c;
  const shine = `<path d="M84 46 C94 40 112 40 122 46" stroke="${l}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`;
  const gray = streak === "si" ? `<path d="M80 52 C96 40 120 40 132 56" stroke="#c9ccd6" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/><path d="M70 66 C80 54 96 50 108 50" stroke="#c9ccd6" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>` : "";
  let p = "";
  if (st === "peinado_atras") p = `<path d="M62 94 C58 70 62 50 76 38 C90 26 116 24 132 36 C144 46 146 66 138 92 C136 80 132 72 126 66 C128 60 124 56 118 58 C110 54 100 56 92 60 C84 62 76 66 70 74 C66 80 64 86 62 94 Z" fill="${f}"/><path d="M70 74 C78 54 98 42 120 44 C130 46 136 52 138 60" stroke="${l}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".55"/><path d="M82 62 C92 50 108 46 122 50" stroke="${l}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".45"/>`;
  else if (st === "corto_lateral") p = `<path d="M62 92 C58 56 78 34 102 34 C128 34 146 54 138 92 C136 76 130 66 120 62 C104 70 84 72 70 66 C66 74 63 84 62 92 Z" fill="${f}"/><path d="M118 40 C112 52 106 60 96 66" stroke="${l}" stroke-width="2.5" fill="none" opacity=".6"/>`;
  else if (st === "corto_puntas") p = `<path d="M62 92 C56 60 70 40 80 40 L82 28 L92 38 L100 24 L108 38 L120 28 L120 42 C136 46 146 62 138 92 C134 76 126 68 116 64 L110 72 L104 64 L96 72 L90 64 L82 72 C72 74 66 82 62 92 Z" fill="${f}"/>`;
  else if (st === "cola") p = `<path d="M64 86 C64 56 82 38 100 38 C120 38 136 56 136 86 C128 68 116 60 100 62 C88 60 72 68 64 86 Z" fill="${f}"/>${shine}`;
  else p = `<path d="M62 92 C62 56 82 38 100 38 C120 38 138 56 138 92 C132 74 122 64 108 60 C110 68 104 74 96 74 C84 70 72 76 62 92 Z" fill="${f}"/><path d="M62 92 C58 110 60 126 64 140 C66 120 66 104 70 92 Z" fill="${f}"/><path d="M138 92 C142 110 140 126 136 140 C134 120 134 104 130 92 Z" fill="${f}"/>${shine}`;
  return p + gray;
}
function beard(kind, c) {
  const f = c[0];
  if (kind === "candado") return `<path d="M87 120 C92 115.5 108 115.5 113 120 C106 118.5 94 118.5 87 120 Z" fill="${f}" stroke="${f}" stroke-width="2.6" stroke-linejoin="round"/><path d="M86 122 C84 128 86 134 88 136 M114 122 C116 128 114 134 112 136" stroke="${f}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M90 131 C94 142 106 142 110 131 C104 135 96 135 90 131 Z" fill="${f}"/><path d="M74 114 C78 130 88 141 100 143 C112 141 122 130 126 114" stroke="${f}" stroke-width="2" fill="none" opacity=".3"/>`;
  if (kind === "corta") return `<path d="M70 108 C72 128 86 142 100 143 C114 142 128 128 130 108 C126 124 114 132 100 132 C86 132 74 124 70 108 Z" fill="${f}" opacity=".4"/><path d="M88 121 C94 117 106 117 112 121" stroke="${f}" stroke-width="3" fill="none" opacity=".6"/>`;
  if (kind === "completa") return `<path d="M68 100 C68 128 84 146 100 148 C116 146 132 128 132 100 C128 116 120 124 114 124 C110 120 90 120 86 124 C80 124 72 116 68 100 Z" fill="${f}"/><path d="M86 122 C92 117 108 117 114 122" stroke="${f}" stroke-width="4" fill="none"/>`;
  return "";
}
function eye(cx, color, mirror) {
  const s = mirror ? -1 : 1;
  return `<g transform="translate(${cx} 100)">
    <path d="M-9.5 -1 C-9.5 -10 9.5 -10 9.5 -1 C9.5 8 4.5 12 0 12 C-4.5 12 -9.5 8 -9.5 -1 Z" fill="#fff"/>
    <ellipse cy="2" rx="7.4" ry="9.6" fill="${color}"/>
    <ellipse cy="-2.5" rx="7.4" ry="4.6" fill="#000" opacity=".22"/>
    <ellipse cy="2.5" rx="4" ry="5.6" fill="#14101c"/>
    <circle cx="${-3.2 * s}" cy="-3" r="3" fill="#fff"/><circle cx="${3.4 * s}" cy="5" r="1.4" fill="#fff"/>
    <path d="M${-6 * s} -9.5 C${2 * s} -11.5 ${8 * s} -9 ${11.5 * s} -4" stroke="#1d1b24" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M${-9 * s} -4 C${-8 * s} -7 ${-7 * s} -8.5 ${-6 * s} -9.5" stroke="#1d1b24" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M${11 * s} -4.5 l${3.5 * s} -2.5" stroke="#1d1b24" stroke-width="2.4" stroke-linecap="round"/></g>`;
}
function outfit(o) {
  const d = OUTFIT[o] || OUTFIT.saco_azul;
  const body = `<path d="M34 200 C36 168 60 152 100 150 C140 152 164 168 166 200 Z" fill="${d.c}"/>`;
  if (d.kind === "saco") return body + `<path d="M86 151 L100 182 L114 151 Z" fill="${d.shirt}"/><path d="M84 151 L100 184 L92 200 L74 160 Z" fill="#000" opacity=".22"/><path d="M116 151 L100 184 L108 200 L126 160 Z" fill="#000" opacity=".22"/>`;
  if (d.kind === "zip") return body + `<path d="M88 150 L100 166 L112 150 Z" fill="${d.shirt}"/><path d="M80 146 C84 158 92 164 100 166 C108 164 116 158 120 146 L126 152 C120 164 110 172 100 174 C90 172 80 164 74 152 Z" fill="${d.c}" stroke="#000" stroke-opacity=".18" stroke-width="1.5"/><path d="M100 174 L100 200" stroke="#c9ccd6" stroke-width="2"/>`;
  return body + `<path d="M84 150 L100 168 L116 150 L112 147 L100 160 L88 147 Z" fill="${d.shirt}"/>`;
}

let UID = 0;
function avatarSVG(a, size = 120) {
  const cid = "avc" + (++UID);
  a = Object.assign({}, PRESETS[0].a, a || {});
  const sk = SKIN[a.skin] || SKIN.media, hc = HAIR[a.hairColor] || HAIR.negro, ec = EYES[a.eyes] || EYES.cafe;
  const glasses = a.glasses === "redondos" ? `<g fill="none" stroke="#2a2733" stroke-width="2.4"><circle cx="84" cy="100" r="14"/><circle cx="116" cy="100" r="14"/><path d="M98 99 L102 99"/></g>`
    : a.glasses === "rectos" ? `<g fill="none" stroke="#2a2733" stroke-width="2.4"><rect x="69" y="89" width="30" height="22" rx="6"/><rect x="101" y="89" width="30" height="22" rx="6"/></g>` : "";
  const thickBrow = a.beard !== "ninguna" || ["peinado_atras", "corto_lateral", "corto_puntas"].includes(a.hairStyle);
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar">
    <defs><clipPath id="${cid}"><circle cx="100" cy="100" r="100"/></clipPath></defs>
    <circle cx="100" cy="100" r="100" fill="${a.bg || BG[0]}"/>
    <g clip-path="url(#${cid})"><g transform="translate(100 112) scale(1.13) translate(-100 -100)">
    ${hairBack(a.hairStyle, hc)}
    ${outfit(a.outfit)}
    <rect x="88" y="128" width="24" height="26" rx="8" fill="${sk[1]}"/>
    <ellipse cx="64" cy="100" rx="6" ry="9" fill="${sk[1]}"/><ellipse cx="136" cy="100" rx="6" ry="9" fill="${sk[1]}"/>
    <path d="M64 88 C64 58 80 44 100 44 C120 44 136 58 136 88 C136 114 122 134 100 144 C78 134 64 114 64 88 Z" fill="${sk[0]}"/>
    <ellipse cx="78" cy="116" rx="7" ry="4" fill="#ff7b8a" opacity=".28"/><ellipse cx="122" cy="116" rx="7" ry="4" fill="#ff7b8a" opacity=".28"/>
    ${eye(81, ec, false)}${eye(119, ec, true)}
    <path d="M72 ${thickBrow ? 80 : 81} C77 ${thickBrow ? 75 : 76} 88 ${thickBrow ? 74 : 75} 94 77" stroke="${hc[0]}" stroke-width="${thickBrow ? 4.4 : 3}" fill="none" stroke-linecap="round"/>
    <path d="M106 77 C112 ${thickBrow ? 74 : 75} 123 ${thickBrow ? 75 : 76} 128 ${thickBrow ? 80 : 81}" stroke="${hc[0]}" stroke-width="${thickBrow ? 4.4 : 3}" fill="none" stroke-linecap="round"/>
    <path d="M100 106 L97 114 L102 114" stroke="${sk[1]}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M91 124 C96 129 104 129 109 124" stroke="#9c3d3d" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${beard(a.beard, hc)}
    ${glasses}
    ${hairFront(a.hairStyle, hc, a.streak)}
    </g></g></svg>`;
}

window.AVATAR = { svg: avatarSVG, OPTIONS, LABELS, PRESETS, PRETTY, SKIN, HAIR, EYES, OUTFIT };
})();
