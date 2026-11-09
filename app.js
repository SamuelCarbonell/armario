// Armario — PWA personal para organizar el armario. Sin frameworks, sin backend, datos solo en el dispositivo.
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dnum = k => Math.round(new Date(k + 'T12:00').getTime() / 864e5);
const rnd = a => a[(Math.random() * a.length) | 0];
const fmtDay = (k, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(k + 'T12:00').toLocaleDateString('es-ES', o);

/* ---------- IndexedDB (mini wrapper) ---------- */
let _db;
const db = () => (_db ||= new Promise((res, rej) => {
  const r = indexedDB.open('armario', 1);
  r.onupgradeneeded = () => {
    const d = r.result;
    d.createObjectStore('items', { keyPath: 'id' });
    d.createObjectStore('log', { keyPath: 'date' });
    d.createObjectStore('kv');
  };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
}));
async function tx(store, mode, fn) {
  const t = (await db()).transaction(store, mode), req = fn(t.objectStore(store));
  return new Promise((res, rej) => { t.oncomplete = () => res(req?.result); t.onerror = t.onabort = () => rej(t.error); });
}
const idb = {
  all: s => tx(s, 'readonly', st => st.getAll()),
  get: (s, k) => tx(s, 'readonly', st => st.get(k)),
  put: (s, v, k) => tx(s, 'readwrite', st => (k === undefined ? st.put(v) : st.put(v, k))),
  putMany: (s, arr) => tx(s, 'readwrite', st => { arr.forEach(v => st.put(v)); }),
  del: (s, k) => tx(s, 'readwrite', st => st.delete(k)),
  clear: s => tx(s, 'readwrite', st => st.clear()),
};

/* ---------- Datos fijos ---------- */
const CATS = { top: 'Arriba', bottom: 'Abajo', full: 'Entero', outer: 'Abrigo', shoes: 'Calzado', acc: 'Accesorio' };
const NOUN = { top: 'prenda de arriba', bottom: 'prenda de abajo', full: 'mono o vestido', outer: 'chaqueta o abrigo', shoes: 'calzado', acc: 'accesorio' };
const USES = { diario: 'Diario', salir: 'Salir', formal: 'Formal', deporte: 'Deporte', pijama: 'Pijama' };
const ACC = { reloj: 'Reloj', collar: 'Collar', pulsera: 'Pulsera', anillo: 'Anillo', pendientes: 'Pendientes', gafas: 'Gafas', gorra: 'Gorra/sombrero', cinturon: 'Cinturón', bolso: 'Bolso/mochila', bufanda: 'Bufanda', otro: 'Otro' };
const WARM = ['Ligera', 'Media', 'Abrigada'];
const REST_FREE = new Set(['shoes', 'outer', 'acc']); // se pueden repetir sin descanso
// nombre: [r, g, b, neutro]
const COLORS = {
  negro: [25, 25, 25, 1], blanco: [245, 245, 245, 1], gris: [140, 140, 140, 1], beige: [215, 195, 160, 1],
  marrón: [115, 75, 45, 1], marino: [30, 40, 75, 1], vaquero: [80, 110, 150, 1], oliva: [110, 110, 60, 1],
  azul: [50, 100, 190, 0], celeste: [150, 195, 230, 0], verde: [50, 130, 70, 0], rojo: [200, 40, 40, 0],
  burdeos: [110, 20, 40, 0], rosa: [235, 150, 180, 0], naranja: [235, 130, 40, 0], amarillo: [235, 205, 60, 0], morado: [110, 60, 150, 0],
  dorado: [212, 175, 55, 0], plateado: [190, 192, 196, 1],
};
const SEASONS = {
  primavera: { n: 'Primavera', d: 'cálida y clara', fav: ['beige', 'celeste', 'verde', 'naranja', 'amarillo', 'rosa', 'vaquero', 'dorado'], avoid: ['negro', 'burdeos', 'plateado'] },
  verano: { n: 'Verano', d: 'fría y suave', fav: ['celeste', 'rosa', 'gris', 'marino', 'vaquero', 'azul', 'morado', 'plateado'], avoid: ['naranja', 'amarillo', 'negro', 'dorado'] },
  otono: { n: 'Otoño', d: 'cálida y profunda', fav: ['marrón', 'oliva', 'beige', 'naranja', 'burdeos', 'verde', 'dorado'], avoid: ['negro', 'celeste', 'rosa', 'plateado'] },
  invierno: { n: 'Invierno', d: 'fría y con contraste', fav: ['negro', 'blanco', 'marino', 'rojo', 'burdeos', 'azul', 'morado', 'plateado'], avoid: ['beige', 'naranja', 'oliva', 'marrón', 'dorado'] },
};
const QUIZ = [
  { t: 'Tu estilo', f: [['styles', 'Elige los que vayan contigo', ['Streetwear', 'Minimalista', 'Clásico', 'Old money', 'Deportivo', 'Techwear', 'Skater', 'Vintage', 'Urbano elegante', 'Y2K', 'Workwear'], 1], ['fit', '¿Cómo te gusta que te quede la ropa?', ['ajustada', 'regular', 'ancha / oversize']]] },
  { t: 'Tu color', f: [['veins', 'Mira las venas de tu muñeca con luz natural. Se ven…', ['azules o moradas', 'verdes', 'no lo sé']], ['metal', '¿Qué te queda mejor?', ['plata', 'oro', 'los dos']], ['skin', 'Piel', ['muy clara', 'clara', 'media', 'morena', 'oscura']], ['hair', 'Pelo', ['rubio', 'pelirrojo', 'castaño claro', 'castaño oscuro', 'negro', 'canoso']], ['eyes', 'Ojos', ['azules o grises', 'verdes', 'miel', 'marrón claro', 'marrón oscuro']]] },
  { t: 'Tu cuerpo', f: [['build', 'Complexión', ['delgada', 'atlética', 'media', 'robusta']], ['sizeTop', 'Talla de arriba', ['XS', 'S', 'M', 'L', 'XL', 'XXL']]], n: [['height', 'Altura (cm)'], ['weight', 'Peso (kg)'], ['chest', 'Pecho (cm)'], ['waist', 'Cintura (cm)'], ['hips', 'Cadera (cm)'], ['shoe', 'Pie (EU)']] },
];
const WX_ICON = c => (c == null ? '' : c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌦️' : '⛈️');
const TITLES = { hoy: 'Plan', armario: 'Armario', cal: 'Calendario', perfil: 'Perfil' };

/* ---------- Estado ---------- */
const S = {
  items: [], map: new Map(), log: new Map(), plan: new Map(),
  profile: { style: '', avoid: [], photo: null, q: {}, season: '', face: null },
  settings: { key: '', model: 'gemini-flash-latest', loc: { mode: 'gps' }, days: 3, rest: 2 },
  prefs: { item: {}, pair: {} },
  wx: null, tab: 'hoy', filter: 'all', ufilter: 'all', sfilter: 'all', cal: new Date(), queue: [], edit: null, share: null,
};
const byId = id => S.map.get(id);
const reindex = () => { S.map = new Map(S.items.map(i => [i.id, i])); };
const urls = new Map();
const url = (it, full) => {
  const k = it.id + (full ? 'f' : 't');
  if (!urls.has(k)) urls.set(k, URL.createObjectURL(full ? it.img : it.thumb));
  return urls.get(k);
};
const dropUrls = id => { for (const s of 'ft') { const u = urls.get(id + s); if (u) { URL.revokeObjectURL(u); urls.delete(id + s); } } };
const label = i => i.name || (i.cat === 'acc' ? `${ACC[i.sub] || 'accesorio'} ${i.color}` : `${NOUN[i.cat]} color ${i.color}`);
const pk = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const savePlan = () => idb.put('kv', [...S.plan], 'plan');
const saveProfile = () => idb.put('kv', S.profile, 'profile');
const saveSettings = () => idb.put('kv', S.settings, 'settings');

/* ---------- Imágenes ---------- */
function blobToImg(b) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(b), i = new Image();
    i.onload = () => { URL.revokeObjectURL(u); res(i); };
    i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('No se pudo leer la imagen')); };
    i.src = u;
  });
}
function toCanvas(src, max) {
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c;
}
const canvasBlob = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
const pixels = c => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
function alphaFill(c) { // fracción de píxeles opacos
  const d = pixels(toCanvas(c, 48)); let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++;
  return n / (d.length / 4);
}
function trim(c) { // recorta los bordes transparentes
  const { width: w, height: h } = c, d = pixels(c);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return c;
  const p = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04), sx = Math.max(0, x0 - p), sy = Math.max(0, y0 - p);
  const sw = Math.min(w, x1 + p + 1) - sx, sh = Math.min(h, y1 + p + 1) - sy;
  const o = document.createElement('canvas'); o.width = sw; o.height = sh;
  o.getContext('2d').drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh);
  return o;
}
function nearest(r, g, b) {
  let best = 'negro', bd = Infinity;
  for (const k in COLORS) {
    const [R, G, B] = COLORS[k], rm = (r + R) / 2, dr = r - R, dg = g - G, db = b - B;
    const dd = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (dd < bd) { bd = dd; best = k; }
  }
  return best;
}
function dominant(c) {
  const d = pixels(toCanvas(c, 32)), cnt = {};
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { const n = nearest(d[i], d[i + 1], d[i + 2]); cnt[n] = (cnt[n] || 0) + 1; }
  return Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || 'negro';
}
// Sin IA: adivina por la forma (los accesorios suelen tener poca superficie opaca: collares, anillos, gafas…)
function guess(c) {
  const r = c.width / c.height, f = alphaFill(c);
  if (f < 0.32) return { cat: 'acc', sub: 'otro' };
  return { cat: r > 1.25 ? 'shoes' : r < 0.62 ? 'bottom' : 'top' };
}
let bgLib; // quitar fondo en el propio móvil; se descarga solo la primera vez que hace falta
async function removeBg(blob, onP) {
  bgLib ||= import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1/+esm');
  const { removeBackground } = await bgLib;
  return removeBackground(blob, { model: 'isnet_quint8', output: { format: 'image/png' }, progress: (_k, cur, tot) => tot && onP?.(cur / tot) });
}
async function processPhoto(blob, status) {
  let c = toCanvas(await blobToImg(blob), 1024);
  if (alphaFill(c) > 0.95) {
    status('Quitando el fondo… (la primera vez tarda más: descarga el modelo)');
    try {
      const out = await removeBg(await canvasBlob(c, 'image/png'), p => status(`Descargando modelo… ${Math.round(p * 100)}%`));
      c = toCanvas(await blobToImg(out), 1024);
    } catch (e) { console.warn(e); status('No se pudo quitar el fondo; se guarda tal cual.'); }
  }
  c = trim(c);
  const [img, thumb] = await Promise.all([canvasBlob(toCanvas(c, 640), 'image/webp', 0.85), canvasBlob(toCanvas(c, 240), 'image/webp', 0.8)]);
  return { img, thumb, color: dominant(c), ...guess(c) };
}
function drawContain(x, im, X, Y, W, H) {
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, k = Math.min(W / w, H / h);
  x.drawImage(im, X + (W - w * k) / 2, Y + (H - h * k) / 2, w * k, h * k);
}
const b2d = b => (b ? new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }) : null);
const d2b = s => (s ? fetch(s).then(r => r.blob()) : null);

/* ---------- Ubicación y tiempo (Open-Meteo, gratis) ---------- */
const geoloc = () => new Promise(r => navigator.geolocation
  ? navigator.geolocation.getCurrentPosition(p => r(p.coords), () => r(null), { timeout: 8000, maximumAge: 864e5 })
  : r(null));
async function loadWeather(force) {
  const c = await idb.get('kv', 'wx'), L = S.settings.loc, sig = JSON.stringify(L);
  if (!force && c?.sig === sig && Date.now() - c.t < 36e5 && c.days?.length >= S.settings.days) { S.wx = c; return applyWx(); }
  const p = L.mode === 'city' && L.lat != null ? { latitude: L.lat, longitude: L.lon } : await geoloc();
  if (p) try {
    const q = `latitude=${p.latitude.toFixed(2)}&longitude=${p.longitude.toFixed(2)}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=7`;
    const j = await (await fetch('https://api.open-meteo.com/v1/forecast?' + q)).json(), D = j.daily;
    S.wx = {
      t: Date.now(), sig, name: L.mode === 'city' ? L.name : '', now: Math.round(j.current.temperature_2m),
      days: D.time.map((date, k) => ({ date, max: Math.round(D.temperature_2m_max[k]), min: Math.round(D.temperature_2m_min[k]), rain: D.precipitation_probability_max?.[k] ?? 0, code: D.weather_code?.[k] })),
    };
    idb.put('kv', S.wx, 'wx');
  } catch (e) { console.warn(e); }
  S.wx ||= c || null;
  applyWx();
}
const wxDay = k => S.wx?.days?.find(d => d.date === k);
function applyWx() {
  const w = S.wx;
  $('#wx').textContent = w ? `${w.name ? w.name + ' · ' : ''}${w.now}°` : 'sin tiempo';
  // los días planificados sin conocer el tiempo se rehacen ahora
  let changed = false;
  for (const [k, p] of S.plan) if (!p.wx && !p.worn && !p.ai && wxDay(k)) { S.plan.delete(k); changed = true; }
  if (changed) { ensurePlan(); if (S.tab === 'hoy') render(); }
}

/* ---------- Perfil de estilo ---------- */
function calcSeason(q) {
  const warm = (q.veins === 'verdes') + (q.metal === 'oro') - (q.veins === 'azules o moradas') - (q.metal === 'plata');
  const skin = ['muy clara', 'clara', 'media', 'morena', 'oscura'].indexOf(q.skin);
  const hair = { rubio: 0, pelirrojo: 1, canoso: 1, 'castaño claro': 1, 'castaño oscuro': 3, negro: 4 }[q.hair] ?? 2;
  const deep = skin + hair >= 5, contrast = Math.abs(hair - Math.max(0, skin)) >= 3;
  if (warm > 0) return deep ? 'otono' : 'primavera';
  if (warm < 0) return deep || contrast ? 'invierno' : 'verano';
  return contrast ? 'invierno' : deep ? 'otono' : 'verano';
}
function palette() {
  const P = S.profile, s = SEASONS[P.season];
  const ok = a => (a || []).filter(c => COLORS[c]);
  return { fav: P.face?.fav?.length ? ok(P.face.fav) : s?.fav || [], avoid: [...new Set([...(P.face?.avoid?.length ? ok(P.face.avoid) : s?.avoid || []), ...P.avoid])] };
}
function profileText() {
  const P = S.profile, q = P.q || {}, pal = palette(), s = SEASONS[P.season];
  return [
    q.styles?.length && `Estilos: ${q.styles.join(', ')}.`, q.fit && `Le gusta la ropa ${q.fit}.`, P.style && `En sus palabras: ${P.style}.`,
    s && `Colorimetría: ${s.n} (${s.d}). Le favorecen: ${pal.fav.join(', ')}. Evitar: ${pal.avoid.join(', ')}.`,
    P.face?.shape && `Cara ${P.face.shape}.`, P.face?.tips,
    q.height && `Mide ${q.height} cm${q.weight ? `, pesa ${q.weight} kg` : ''}${q.build ? `, complexión ${q.build}` : ''}${q.sizeTop ? `, talla ${q.sizeTop}` : ''}.`,
    (q.chest || q.waist || q.hips) && `Medidas: pecho ${q.chest || '?'} / cintura ${q.waist || '?'} / cadera ${q.hips || '?'} cm.`,
  ].filter(Boolean).join(' ') || 'Sin perfil de estilo todavía.';
}

/* ---------- Motor de outfits (local, sin internet) ---------- */
function usage(skip) { // día (número) en que se usa / se usará cada prenda
  const u = new Map(), add = (k, ids) => { const n = dnum(k); for (const id of ids) (u.get(id) || u.set(id, []).get(id)).push(n); };
  for (const e of S.log.values()) add(e.date, e.ids);
  for (const [k, p] of S.plan) if (k !== skip && !S.log.has(k)) add(k, p.ids);
  return u;
}
// Una prenda puesta el día D descansa hasta D + descanso (también respeta lo ya planificado)
const restFree = i => REST_FREE.has(i.cat) || (i.uses.length === 1 && i.uses[0] === 'pijama'); // los pijamas tampoco descansan
const resting = (i, n, u) => !restFree(i) && (u.get(i.id) || []).some(x => x !== n && Math.abs(x - n) <= S.settings.rest);
function restLeft(i) {
  if (restFree(i)) return 0;
  const t = dnum(dkey()); let m = 0;
  for (const e of S.log.values()) if (e.ids.includes(i.id)) { const n = dnum(e.date); if (n <= t) m = Math.max(m, n + S.settings.rest - t); }
  return m;
}
function pickAcc(pool, occ, t, w) {
  const by = {}; for (const i of pool) (by[i.sub || 'otro'] ||= []).push(i);
  const P = { reloj: 0.7, collar: 0.4, pulsera: 0.35, anillo: 0.4, pendientes: 0.3, cinturon: 0.35, bolso: 0.25, otro: 0.15,
    gafas: w && w.code <= 2 && t > 14 ? 0.5 : 0.05, gorra: occ === 'formal' ? 0 : 0.3, bufanda: t < 10 ? 0.8 : 0 };
  if (occ === 'deporte') for (const k in P) if (k !== 'reloj' && k !== 'gorra') P[k] = 0;
  const out = [];
  for (const k in by) if (Math.random() < (P[k] ?? 0.2) && out.length < 4) out.push(rnd(by[k]).id);
  return out;
}
function score(ids, ctx) {
  let s = Math.random() * 1.5;
  const bold = new Set();
  for (const id of ids) {
    const i = byId(id);
    if (i.cat !== 'acc' && i.cat !== 'shoes') s += Math.abs((i.warmth ?? 1) - ctx.warm) * (i.cat === 'outer' ? 0.5 : 1);
    if (i.cat !== 'acc' && !COLORS[i.color]?.[3]) bold.add(i.color);
    if (ctx.pal.avoid.includes(i.color)) s += i.cat === 'acc' ? 0.5 : 1.5;
    if (ctx.pal.fav.includes(i.color)) s -= 0.7;
    const near = (ctx.u.get(id) || []).filter(x => x !== ctx.n && Math.abs(x - ctx.n) <= 6).length;
    s += near * 0.6; // variedad: penaliza lo usado esa semana
    s -= (S.prefs.item[id] || 0) * 0.6;
  }
  s += bold.size > 2 ? 4 : bold.size === 2 ? 1 : 0;
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) s -= (S.prefs.pair[pk(ids[a], ids[b])] || 0) * 0.8;
  return s;
}
function suggestFor(date, occ, n = 1, exclude = new Set()) {
  const dn = dnum(date), u = usage(date), w = wxDay(date), t = w ? (w.max + w.min) / 2 : 18;
  const free = i => !resting(i, dn, u), P = {};
  for (const k in CATS) P[k] = S.items.filter(i => i.cat === k && i.uses.includes(occ) && free(i));
  if (occ === 'pijama') P.shoes = P.outer = P.acc = [];
  else for (const k of ['shoes', 'outer', 'acc']) if (!P[k].length) P[k] = S.items.filter(i => i.cat === k && i.uses.includes('diario') && free(i));
  const sep = P.top.length && P.bottom.length;
  if (!sep && !P.full.length) return [];
  const ctx = { warm: t < 10 ? 2 : t < 17 ? 1 : 0, pal: palette(), u, n: dn };
  const outerP = occ === 'pijama' ? 0 : t < 14 || (w?.rain >= 60 && t < 22) ? 1 : t < 20 ? 0.5 : 0;
  const cands = [];
  for (let k = 0; k < 300; k++) {
    const ids = [];
    if (P.full.length && (!sep || Math.random() < P.full.length / (P.full.length + P.top.length))) ids.push(rnd(P.full).id);
    else ids.push(rnd(P.top).id, rnd(P.bottom).id);
    if (P.outer.length && Math.random() < outerP) ids.push(rnd(P.outer).id);
    if (P.shoes.length) ids.push(rnd(P.shoes).id);
    ids.push(...pickAcc(P.acc, occ, t, w));
    cands.push({ ids, s: score(ids, ctx) });
  }
  cands.sort((a, b) => a.s - b.s);
  const out = [], keys = new Set(exclude);
  for (const c of cands) {
    const key = c.ids.filter(id => !REST_FREE.has(byId(id).cat)).join();
    if (keys.has(key)) continue;
    keys.add(key); out.push({ ids: c.ids });
    if (out.length === n) break;
  }
  return out;
}
const planDates = () => { const d = new Date(); return Array.from({ length: S.settings.days }, (_, k) => dkey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + k))); };
// Comprueba que un día planificado sigue siendo correcto (prendas existentes, estructura, usos y descanso)
function validDay(k, p) {
  const its = p.ids.map(byId);
  if (!its.length || its.some(i => !i)) return false;
  const c = x => its.filter(i => i.cat === x).length, subs = its.filter(i => i.cat === 'acc').map(i => i.sub);
  if (!((c('top') === 1 && c('bottom') === 1 && !c('full')) || (c('full') === 1 && !c('top') && !c('bottom')))) return false;
  if (c('shoes') > 1 || c('outer') > 1 || c('acc') > 4 || new Set(subs).size !== subs.length) return false;
  if (p.occ === 'pijama' && (c('shoes') || c('outer') || c('acc'))) return false;
  if (p.occ === 'deporte' && subs.some(s => s !== 'reloj' && s !== 'gorra')) return false;
  const n = dnum(k), u = usage(k);
  return its.every(i => !resting(i, n, u) && (!['top', 'bottom', 'full'].includes(i.cat) || i.uses.includes(p.occ)));
}
function regenDay(k, exclude) {
  const old = S.plan.get(k), occ = old?.occ || 'diario';
  S.plan.set(k, { ids: [], occ });
  const s = suggestFor(k, occ, 1, exclude)[0];
  S.plan.set(k, { ids: s?.ids || [], occ, wx: !!wxDay(k) });
}
function ensurePlan(force) {
  const dates = planDates();
  for (const k of [...S.plan.keys()]) if (!dates.includes(k)) S.plan.delete(k);
  if (force) for (const k of dates) if (!S.log.has(k)) S.plan.set(k, { ids: [], occ: S.plan.get(k)?.occ || 'diario' });
  for (const k of dates) {
    const l = S.log.get(k), p = S.plan.get(k);
    if (l) { S.plan.set(k, { ...p, ids: l.ids, occ: p?.occ || 'diario', worn: true }); continue; }
    if (!p || p.worn || !validDay(k, p)) regenDay(k);
  }
  savePlan();
}
function rate(ids, v) {
  for (const id of ids) S.prefs.item[id] = (S.prefs.item[id] || 0) + v;
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) { const k = pk(ids[a], ids[b]); S.prefs.pair[k] = (S.prefs.pair[k] || 0) + v; }
  idb.put('kv', S.prefs, 'prefs');
}
async function wear(ids, date = dkey()) {
  const prev = S.log.get(date), changed = new Set(ids);
  if (prev) for (const id of prev.ids) { const i = byId(id); if (i) { i.wears = Math.max(0, i.wears - 1); changed.add(id); } }
  for (const id of ids) { const i = byId(id); i.wears++; i.last = Math.max(i.last || 0, dnum(date)); }
  const e = { date, ids: [...new Set(ids)] };
  S.log.set(date, e);
  await Promise.all([idb.put('log', e), idb.putMany('items', [...changed].map(byId).filter(Boolean))]);
  ensurePlan(); // los días siguientes se recolocan si chocan con el descanso
}
async function unwear(date) {
  const e = S.log.get(date); if (!e) return;
  S.log.delete(date);
  const its = e.ids.map(byId).filter(Boolean);
  for (const i of its) {
    i.wears = Math.max(0, i.wears - 1); i.last = 0;
    for (const l of S.log.values()) if (l.ids.includes(i.id)) i.last = Math.max(i.last, dnum(l.date));
  }
  const p = S.plan.get(date); if (p) p.worn = false;
  await Promise.all([idb.del('log', date), idb.putMany('items', its)]);
  ensurePlan();
}

/* ---------- IA opcional (Gemini, plan gratuito) ---------- */
async function ai(parts, temperature = 0.4) {
  const { key, model } = S.settings;
  if (!key) throw new Error('Añade la clave gratuita en Perfil → IA');
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', temperature } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Error ${r.status}`);
  return JSON.parse(j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'null');
}
const imgPart = async b => ({ inline_data: { mime_type: b.type || 'image/png', data: (await b2d(b)).split(',')[1] } });
async function aiTag(blob) {
  const r = await ai([await imgPart(blob), { text: `Identifica esta prenda o accesorio. Responde solo JSON:
{"tipo":"top|bottom|full|outer|shoes|acc","sub":"${Object.keys(ACC).join('|')} (solo si tipo es acc, si no null)","nombre":"nombre corto en español, p. ej. 'sudadera gris con capucha' o 'reloj plateado'","color":"uno de: ${Object.keys(COLORS).join(', ')}","usos":["diario|salir|formal|deporte|pijama"],"abrigo":0|1|2}
top=camisetas, camisas, sudaderas, jerséis; bottom=pantalones, faldas, shorts; full=monos, vestidos; outer=chaquetas, abrigos, cazadoras; acc=relojes, collares, pulseras, anillos, pendientes, gafas, gorras, cinturones, bolsos, bufandas.` }], 0.1);
  const o = Array.isArray(r) ? r[0] : r, out = {};
  if (CATS[o?.tipo]) out.cat = o.tipo;
  if (out.cat === 'acc') out.sub = ACC[o.sub] ? o.sub : 'otro';
  if (COLORS[o?.color]) out.color = o.color;
  if (o?.nombre) out.name = String(o.nombre).slice(0, 60);
  const us = (o?.usos || []).filter(x => USES[x]); if (us.length) out.uses = us;
  if ([0, 1, 2].includes(+o?.abrigo)) out.warmth = +o.abrigo;
  return out;
}
async function aiFace(blob) {
  const q = S.profile.q || {};
  const r = await ai([await imgPart(blob), { text: `Eres asesor de imagen. Analiza la cara y el color natural (piel, pelo, ojos) de esta persona. Datos que da: venas ${q.veins || '?'}, le queda mejor ${q.metal || '?'}.
Responde solo JSON: {"estacion":"primavera|verano|otono|invierno","subtono":"cálido|frío|neutro","forma_cara":"ovalada|redonda|cuadrada|alargada|corazón|diamante","colores_favorecen":[elige de: ${Object.keys(COLORS).join(', ')}],"colores_evitar":[misma lista],"consejos":"3 frases en español sobre colores, cuellos, gafas y accesorios que le favorecen"}` }], 0.2);
  if (!SEASONS[r?.estacion]) throw new Error('No se pudo analizar la foto');
  return r;
}
async function aiPlan() {
  const dates = planDates().filter(k => !S.log.has(k)), short = new Map(), t = dnum(dkey());
  const inv = S.items.map(i => {
    const s = i.id.slice(0, 8); short.set(s, i.id);
    const r = restLeft(i);
    return { id: s, tipo: i.cat, sub: i.sub, nombre: label(i), color: i.color, usos: i.uses, abrigo: i.warmth, ...(r ? { libre_desde: dkey(new Date((t + r + 1) * 864e5 + 432e5)) } : {}) };
  });
  const days = dates.map(k => { const w = wxDay(k); return { fecha: k, ocasion: S.plan.get(k)?.occ || 'diario', ...(w ? { min: w.min, max: w.max, lluvia: w.rain } : {}) }; });
  const r = await ai([{ text: `Eres mi estilista personal. Mi perfil: ${profileText()}
Días a planificar: ${JSON.stringify(days)}
Mi armario: ${JSON.stringify(inv)}
Reglas: para cada día, una prenda "top" y una "bottom" (o una "full"), calzado si hay, "outer" si hace fresco o llueve y 0-4 accesorios ("acc") que combinen. Usa solo prendas cuyo "usos" incluya la ocasión del día (calzado, abrigo y accesorios pueden ser de "diario"). En pijama, sin calzado, abrigo ni accesorios. Las prendas top/bottom/full NO se pueden repetir en días separados por ${S.settings.rest} días o menos, ni usarse antes de su "libre_desde". Calzado, abrigos y accesorios sí se pueden repetir.
Responde solo JSON: [{"fecha":"AAAA-MM-DD","ids":["id"],"why":"motivo breve en español"}]` }], 0.8);
  const arr = Array.isArray(r) ? r : r?.plan || Object.values(r || {}).find(Array.isArray) || [];
  let ok = 0;
  for (const k of dates) {
    const o = arr.find(x => x.fecha === k), occ = S.plan.get(k)?.occ || 'diario';
    const ids = [...new Set((o?.ids || []).map(s => short.get(String(s).slice(0, 8))).filter(Boolean))];
    const cats = ids.map(id => byId(id).cat), p = { ids, occ, why: o?.why, ai: true, wx: true };
    if (((cats.includes('top') && cats.includes('bottom')) || cats.includes('full')) && validDay(k, p)) { S.plan.set(k, p); ok++; }
    else regenDay(k);
  }
  savePlan();
  if (!ok) throw new Error('La IA no devolvió un plan válido; usado el plan automático');
}

/* ---------- UI: utilidades ---------- */
const dlg = $('#sheet');
const toastEl = () => $('#toast') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toast', role: 'status' }));
const parkToast = () => { const t = $('#toast'); if (t && dlg.contains(t)) document.body.append(t); };
function sheet(html) { parkToast(); dlg.innerHTML = `<div class="sh">${html}</div>`; if (!dlg.open) dlg.showModal(); }
function closeSheet() { dlg.close(); }
dlg.addEventListener('click', e => { if (e.target === dlg && !S.busy) closeSheet(); });
dlg.addEventListener('close', () => {
  parkToast();
  if (S.share?.url) { URL.revokeObjectURL(S.share.url); S.share = null; }
  if (S.edit) { if (S.edit._new) { URL.revokeObjectURL(S.edit._u); S.queue.length = 0; } S.edit = null; }
});
function toast(m) {
  const t = toastEl();
  (dlg.open ? dlg : document.body).append(t);
  t.textContent = m; t.classList.add('on');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600);
}
function download(f) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(f), download: f.name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4e4);
}
function chips(field, opts, val, { swatch, multi, sub, act = 'chip' } = {}) {
  const e = Array.isArray(opts) ? opts.map((l, i) => [i, l]) : Object.entries(opts);
  const on = k => (multi ? (val || []).map(String).includes(String(k)) : String(k) === String(val));
  return `<div class="chips${sub ? ' sub' : ''}" data-f="${field}"${multi ? ' data-m="1"' : ''}>${e.map(([k, l]) => `<button type="button" data-a="${act}" data-v="${esc(k)}" class="${on(k) ? 'on' : ''}">${swatch ? `<i style="background:rgb(${COLORS[k].slice(0, 3)})"></i>` : ''}${esc(l)}</button>`).join('')}</div>`;
}
const swatches = cs => cs.map(c => `<i class="sw" title="${c}" style="background:rgb(${COLORS[c].slice(0, 3)})"></i>`).join('');
function flat(ids) {
  const its = ids.map(byId).filter(Boolean), im = i => `<img class="a-${i.cat}" src="${url(i, true)}" alt="${esc(label(i))}" decoding="async">`;
  const acc = its.filter(i => i.cat === 'acc');
  return `<div class="flat">${its.filter(i => i.cat !== 'acc').map(im).join('')}${acc.length ? `<div class="a-acc">${acc.map(im).join('')}</div>` : ''}</div>`;
}

/* ---------- Vistas ---------- */
function vHoy() {
  const P = S.profile, today = dkey();
  const intro = !P.q?.styles ? '<section class="card hint"><b>Haz el test de estilo (1 minuto)</b><p class="muted">Tu estilo, tus colores y tus medidas hacen que los outfits sean para ti.</p><button class="pri" data-a="quiz">Empezar</button></section>' : '';
  const days = planDates().map(k => {
    const p = S.plan.get(k) || { ids: [], occ: 'diario' }, w = wxDay(k), isT = k === today;
    const head = `<div class="dh"><b>${isT ? 'Hoy' : k === planDates()[1] ? 'Mañana' : fmtDay(k, { weekday: 'long' })}</b><span class="muted">${fmtDay(k, { day: 'numeric', month: 'short' })}</span><span class="dwx">${w ? `${WX_ICON(w.code)} ${w.min}/${w.max}°${w.rain >= 40 ? ` · ☔${w.rain}%` : ''}` : ''}</span></div>`;
    const occ = p.worn ? '' : chips('occ', USES, p.occ, { sub: true, act: 'occ' }).replace('data-f="occ"', `data-f="occ" data-d="${k}"`);
    const body = p.ids.length ? flat(p.ids) : `<p class="empty">No hay suficientes prendas de ${USES[p.occ].toLowerCase()} libres este día (faltan o están descansando). Añade más en Armario o cambia el uso.</p>`;
    const acts = !p.ids.length ? '' : p.worn
      ? `<div class="acts2"><span class="worn">✔ Puesto</span><button data-a="tryon" data-d="${k}">Pruébatelo</button><button data-a="unwear" data-v="${k}">Deshacer</button></div>`
      : `<div class="acts"><button data-a="like" data-d="${k}" aria-label="Me gusta">👍</button><button data-a="dislike" data-d="${k}" aria-label="No me gusta">👎</button><button data-a="reroll" data-d="${k}" aria-label="Otra idea">🔀</button><button data-a="tryon" data-d="${k}">Pruébatelo</button>${isT ? `<button class="pri" data-a="wear" data-d="${k}">Me lo pongo</button>` : ''}</div>`;
    return `<section class="card">${head}${occ}${body}${p.why ? `<p class="why">${esc(p.why)}</p>` : ''}${acts}</section>`;
  }).join('');
  return `${intro}<div class="row"><button data-a="replan">🔀 Rehacer plan</button>${S.settings.key ? '<button data-a="aiplan">✨ Plan con IA</button>' : ''}</div>${days}`;
}
function vArmario() {
  const cnt = { all: S.items.length }; for (const i of S.items) cnt[i.cat] = (cnt[i.cat] || 0) + 1;
  let list = S.items;
  if (S.filter !== 'all') list = list.filter(i => i.cat === S.filter);
  if (S.ufilter !== 'all') list = list.filter(i => i.uses.includes(S.ufilter));
  if (S.filter === 'acc' && S.sfilter !== 'all') list = list.filter(i => i.sub === S.sfilter);
  const f1 = chips('filter', Object.fromEntries([['all', `Todo ${cnt.all}`], ...Object.entries(CATS).map(([k, l]) => [k, `${l} ${cnt[k] || 0}`])]), S.filter, { sub: true, act: 'filter' });
  const f2 = chips('ufilter', { all: 'Cualquier uso', ...USES }, S.ufilter, { sub: true, act: 'filter' });
  const f3 = S.filter === 'acc' ? chips('sfilter', { all: 'Todos', ...ACC }, S.sfilter, { sub: true, act: 'filter' }) : '';
  return `<div class="filters">${f1}${f2}${f3}</div>
  ${list.length ? `<div class="grid">${list.map(i => { const r = restLeft(i); return `<button class="cell${r ? ' rest' : ''}" data-a="openItem" data-v="${i.id}"><img src="${url(i)}" loading="lazy" decoding="async" alt="${esc(label(i))}">${r ? `<span class="badge">${r}d</span>` : ''}</button>`; }).join('')}</div>
  <p class="muted center">Las prendas atenuadas están descansando (días que faltan). Calzado, abrigos, accesorios y pijamas no descansan.</p>`
    : '<p class="empty">No hay prendas aquí. Pulsa <b>+</b> para añadir.<br><br><small>Truco rápido: en Fotos, mantén pulsada la prenda → <b>Copiar</b> → aquí <b>Pegar recorte</b>. Llega ya sin fondo.</small></p>'}
  <button class="fab" data-a="add" aria-label="Añadir prenda">+</button>`;
}
function vCal() {
  const d = S.cal, y = d.getFullYear(), m = d.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = dkey();
  let cells = '<i></i>'.repeat(first);
  for (let i = 1; i <= days; i++) {
    const k = `${y}-${pad(m + 1)}-${pad(i)}`, e = S.log.get(k), it = e && e.ids.map(byId).find(x => x && x.cat !== 'acc');
    const pl = !e && S.plan.get(k)?.ids.map(byId).find(x => x && x.cat !== 'acc');
    cells += `<button class="day${k === today ? ' now' : ''}${pl ? ' planned' : ''}" data-a="day" data-v="${k}">${it || pl ? `<img src="${url(it || pl)}" alt="">` : ''}<span>${i}</span></button>`;
  }
  const top = S.items.filter(i => i.wears).sort((a, b) => b.wears - a.wears).slice(0, 8);
  const never = S.items.filter(i => !i.wears).length, mon = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return `<div class="calh"><button data-a="mon" data-v="-1" aria-label="Mes anterior">‹</button><b>${mon[0].toUpperCase() + mon.slice(1)}</b><button data-a="mon" data-v="1" aria-label="Mes siguiente">›</button></div>
  <div class="cal">${'LMXJVSD'.split('').map(x => `<small>${x}</small>`).join('')}${cells}</div>
  <section class="card"><h3>Lo que más usas</h3>${top.length ? `<div class="strip">${top.map(i => `<figure><img src="${url(i)}" alt="${esc(label(i))}"><figcaption>${i.wears}×</figcaption></figure>`).join('')}</div>` : '<p class="muted">Marca outfits con «Me lo pongo» y aquí verás tus favoritos.</p>'}
  <p class="muted">${never} prenda${never === 1 ? '' : 's'} sin ponerte todavía.</p></section>`;
}
function vPerfil() {
  const P = S.profile, q = P.q || {}, s = SEASONS[P.season], pal = palette(), L = S.settings.loc;
  if (P.photo && !S.meUrl) S.meUrl = URL.createObjectURL(P.photo);
  const style = q.styles ? `<p><b>${esc(q.styles.join(' · '))}</b>${q.fit ? ` · ropa ${esc(q.fit)}` : ''}</p>
    ${s ? `<p>Colorimetría: <b>${s.n}</b> <span class="muted">(${s.d})</span></p><p class="pal">Te favorecen ${swatches(pal.fav)}</p><p class="pal">Mejor evitar ${swatches(pal.avoid)}</p>` : ''}
    ${q.height ? `<p class="muted">${q.height} cm${q.weight ? ` · ${q.weight} kg` : ''}${q.build ? ` · ${q.build}` : ''}${q.sizeTop ? ` · talla ${q.sizeTop}` : ''}${q.shoe ? ` · pie ${q.shoe}` : ''}</p>` : ''}
    ${P.face ? `<p class="muted">Cara ${esc(P.face.shape || '')}. ${esc(P.face.tips || '')}</p>` : ''}` : '<p class="muted">Aún no has hecho el test.</p>';
  return `<section class="card"><h3>Tu estilo</h3>${style}
    <div class="row"><button class="pri" data-a="quiz">${q.styles ? 'Repetir test' : 'Hacer el test'}</button><button data-a="face" ${S.settings.key ? '' : 'disabled'}>📸 Analizar mi cara</button></div>
    ${S.settings.key ? '' : '<p class="muted">«Analizar mi cara» usa la IA gratuita: añade la clave abajo.</p>'}
    <label>Añade lo que quieras con tus palabras<textarea id="style" rows="2" placeholder="Ej: nada de camisas, me encantan las zapatillas blancas">${esc(P.style)}</textarea></label>
    <h4>Colores que no quieres nunca</h4>${chips('avoid', Object.fromEntries(Object.keys(COLORS).map(k => [k, k])), P.avoid, { swatch: true, multi: true, act: 'avoid' })}</section>
  <section class="card"><h3>Tu foto de cuerpo entero</h3><div class="me">${P.photo ? `<img src="${S.meUrl}" alt="Tu foto">` : '<div class="ph">Sin foto</div>'}
    <div><p class="muted">De pie, de frente, con buena luz y ropa ajustada. Solo se usa para «Pruébatelo».</p><button data-a="photo">${P.photo ? 'Cambiar' : 'Añadir'} foto</button></div></div></section>
  <section class="card"><h3>Ubicación del tiempo</h3>${chips('loc', { gps: 'Automática (GPS)', city: 'Elegir ciudad' }, L.mode, { act: 'locmode' })}
    ${L.mode === 'city' ? `<p class="muted">${L.name ? `Ahora: <b>${esc(L.name)}</b>` : 'Busca tu ciudad:'}</p><div class="row"><input id="city" placeholder="Ciudad" value=""><button data-a="citySearch">Buscar</button></div><div id="cityres" class="list"></div>` : ''}</section>
  <section class="card"><h3>Planificación</h3><h4>Días que planifica</h4>${chips('days', { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 7: '7' }, S.settings.days, { act: 'setnum' })}
    <h4>Días de descanso de una prenda tras usarla</h4>${chips('rest', { 2: '2', 3: '3', 4: '4', 5: '5' }, S.settings.rest, { act: 'setnum' })}</section>
  <section class="card"><h3>IA (opcional y gratis)</h3><p class="muted">Con una clave gratuita de <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>: reconoce solas las prendas y accesorios, analiza tu cara y planifica con tu estilo. La clave se queda en este iPhone.</p>
    <input id="key" type="password" value="${esc(S.settings.key)}" placeholder="Clave API de Gemini" autocomplete="off">
    <input id="model" value="${esc(S.settings.model)}" placeholder="Modelo (gemini-flash-latest)" autocapitalize="off">
    <button data-a="saveSet">Guardar</button></section>
  <section class="card"><h3>Copia de seguridad</h3><p class="muted">Tus datos viven solo en este iPhone. Exporta de vez en cuando.</p>
    <div class="row"><button data-a="export">Exportar</button><button data-a="import">Importar</button></div><p class="muted" id="usage"></p></section>`;
}
function render() {
  if (S.tab === 'hoy') ensurePlan();
  $('#title').textContent = TITLES[S.tab];
  $('#view').innerHTML = { hoy: vHoy, armario: vArmario, cal: vCal, perfil: vPerfil }[S.tab]();
  for (const b of document.querySelectorAll('.tabs button')) b.classList.toggle('on', b.dataset.v === S.tab);
  if (S.tab === 'perfil') navigator.storage?.estimate?.().then(e => { const u = $('#usage'); if (u) u.textContent = `${S.items.length} prendas · ${(e.usage / 1048576).toFixed(1)} MB usados`; });
}
const go = t => { S.tab = t; render(); scrollTo(0, 0); };

/* ---------- Test de estilo ---------- */
function quiz(step) {
  S.qs = step; const st = QUIZ[step], q = S.qd;
  sheet(`<h2>${st.t} <small>${step + 1}/${QUIZ.length}</small></h2>
  ${st.f.map(([k, l, opts, multi]) => `<h4>${l}</h4>${chips(k, Object.fromEntries(opts.map(o => [o, o])), q[k], { multi, act: 'qchip' })}`).join('')}
  ${(st.n || []).length ? `<div class="nums">${st.n.map(([k, l]) => `<label>${l}<input type="number" inputmode="decimal" data-qn="${k}" value="${esc(q[k] ?? '')}"></label>`).join('')}</div><p class="muted">Las medidas son opcionales; sirven para que «Pruébatelo» respete tu cuerpo.</p>` : ''}
  <div class="row">${step ? '<button data-a="qprev">Atrás</button>' : ''}<button class="pri" data-a="qnext">${step === QUIZ.length - 1 ? 'Terminar' : 'Siguiente'}</button></div>`);
}
function readNums() { for (const i of dlg.querySelectorAll('[data-qn]')) S.qd[i.dataset.qn] = i.value ? +i.value : undefined; }

/* ---------- Añadir / editar prendas ---------- */
function addFiles(files) {
  S.queue.push(...[...files].filter(f => !f.type || f.type.startsWith('image/')));
  if (!S.busy && !S.edit) nextQueue();
}
async function nextQueue() {
  const f = S.queue.shift();
  if (!f) { S.edit = null; closeSheet(); return render(); }
  S.busy = true;
  sheet('<h2>Procesando…</h2><p id="st" class="muted">Preparando la foto…</p><div class="spin"></div>');
  const st = t => { const e = $('#st'); if (e) e.textContent = t; };
  try {
    const p = await processPhoto(f, st);
    let d = { ...p, id: crypto.randomUUID(), name: '', warmth: 1, uses: ['diario'], wears: 0, last: 0, created: Date.now() };
    if (S.settings.key) {
      st('Identificando la prenda…');
      try { d = { ...d, ...(await aiTag(p.thumb.size > 30000 ? p.thumb : p.img)), _ai: true }; } catch (e) { console.warn(e); toast('IA: ' + e.message); }
    }
    S.busy = false;
    itemForm({ ...d, _u: URL.createObjectURL(p.img), _new: true });
  } catch (e) { console.error(e); S.busy = false; toast('Esa foto no se pudo procesar'); nextQueue(); }
}
function itemForm(d) {
  S.edit = d;
  const r = d._new ? 0 : restLeft(d);
  sheet(`<h2>${d._new ? 'Nueva prenda' : 'Editar prenda'}${S.queue.length ? ` <small>(quedan ${S.queue.length})</small>` : ''}</h2>
  <img class="prev" src="${d._u}" alt="">
  ${d._ai ? '<p class="muted">✨ Identificada por la IA. Revisa y guarda.</p>' : ''}
  <label>Nombre<input id="f-name" value="${esc(d.name)}" placeholder="Ej: sudadera gris Nike"></label>
  <h4>Tipo</h4>${chips('cat', CATS, d.cat)}
  ${d.cat === 'acc' ? `<h4>Accesorio</h4>${chips('sub', ACC, d.sub)}` : ''}
  <h4>Para qué la usas</h4>${chips('uses', USES, d.uses, { multi: true })}
  <h4>Color</h4>${chips('color', Object.fromEntries(Object.keys(COLORS).map(k => [k, k])), d.color, { swatch: true })}
  ${d.cat === 'acc' || d.cat === 'shoes' ? '' : `<h4>Abrigo</h4>${chips('warmth', WARM, d.warmth)}`}
  ${d._new ? '' : `<p class="muted">Puesta ${d.wears} ${d.wears === 1 ? 'vez' : 'veces'}${r ? ` · descansa ${r} día${r > 1 ? 's' : ''} más` : ''}.</p><button data-a="wearItem">👕 Me la he puesto hoy</button>`}
  <div class="row">${d._new ? '<button data-a="skipItem">Descartar</button>' : '<button class="danger" data-a="delItem">Borrar</button>'}<button class="pri" data-a="saveItem">Guardar</button></div>`);
}
async function saveItem() {
  const d = S.edit; d.name = $('#f-name').value.trim();
  if (d.cat !== 'acc') delete d.sub; else d.sub ||= 'otro';
  const { _u, _new, _ai, ...it } = d;
  if (_new) { URL.revokeObjectURL(_u); S.items.unshift(it); } else S.items[S.items.findIndex(i => i.id === it.id)] = it;
  // con prendas nuevas, se rehacen los días que no has tocado (puestos, con 👍 o de la IA se mantienen)
  if (_new) for (const [k, p] of S.plan) if (!p.worn && !p.liked && !p.ai) S.plan.delete(k);
  reindex(); S.edit = null; ensurePlan();
  await idb.put('items', it);
  if (_new && S.queue.length) return nextQueue();
  closeSheet(); render(); toast('Guardado');
}
async function delItem() {
  const id = S.edit.id;
  if (!confirm('¿Borrar esta prenda?')) return;
  S.items = S.items.filter(i => i.id !== id); reindex(); dropUrls(id);
  delete S.prefs.item[id]; for (const k in S.prefs.pair) if (k.includes(id)) delete S.prefs.pair[k];
  for (const [k, p] of S.plan) if (p.ids.includes(id) && !p.worn) S.plan.delete(k);
  S.edit = null; ensurePlan();
  await Promise.all([idb.del('items', id), idb.put('kv', S.prefs, 'prefs')]);
  closeSheet(); render();
}

/* ---------- Pruébatelo (collage + app de Gemini) ---------- */
async function tryOn(ids) {
  if (!S.profile.photo) { toast('Primero añade tu foto en Perfil'); return go('perfil'); }
  const its = ids.map(byId).filter(Boolean), q = S.profile.q || {};
  sheet('<h2>Preparando…</h2><div class="spin"></div>');
  const W = 1200, H = 900, c = Object.assign(document.createElement('canvas'), { width: W, height: H }), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  const [me, ...imgs] = await Promise.all([blobToImg(S.profile.photo), ...its.map(i => blobToImg(i.img))]);
  drawContain(x, me, 0, 0, 560, H);
  x.fillStyle = '#ddd'; x.fillRect(579, 40, 2, H - 80);
  const cols = its.length > 3 ? 2 : 1, rows = Math.ceil(its.length / cols), cw = (W - 600) / cols, ch = H / rows;
  imgs.forEach((im, k) => drawContain(x, im, 600 + (k % cols) * cw + 12, ((k / cols) | 0) * ch + 12, cw - 24, ch - 24));
  const blob = await canvasBlob(c, 'image/jpeg', 0.88);
  const body = q.height ? ` La persona mide ${q.height} cm${q.weight ? ` y pesa ${q.weight} kg` : ''}${q.build ? `, complexión ${q.build}` : ''}${q.sizeTop ? `, talla ${q.sizeTop}` : ''}: respeta exactamente su cuerpo y proporciones.` : '';
  const fit = q.fit ? ` La ropa debe quedarle ${q.fit}.` : '';
  const prompt = `Edita la foto de la persona de la izquierda para que lleve exactamente estas prendas y accesorios de la derecha: ${its.map(label).join(', ')}. Mantén su cara, pelo, piel, cuerpo y pose.${body}${fit} Respeta colores, estampados y logos de cada prenda. Foto realista de cuerpo entero, fondo neutro y luz natural.`;
  S.share = { blob, prompt, url: URL.createObjectURL(blob) };
  sheet(`<h2>Pruébatelo</h2><img class="collage" src="${S.share.url}" alt="Collage">
  <p class="muted">Pulsa <b>Enviar a Gemini</b> (el texto se copia solo), elige la app de Gemini, pega el texto y envía.</p>
  <textarea readonly rows="4">${esc(prompt)}</textarea>
  <div class="row"><button data-a="copyPrompt">Copiar texto</button><button class="pri" data-a="shareTry">Enviar a Gemini</button></div>`);
}

/* ---------- Copia de seguridad ---------- */
async function exportAll() {
  toast('Preparando copia…');
  const items = await Promise.all(S.items.map(async i => ({ ...i, img: await b2d(i.img), thumb: await b2d(i.thumb) })));
  const data = { v: 1, items, log: [...S.log.values()], profile: { ...S.profile, photo: await b2d(S.profile.photo) }, prefs: S.prefs, settings: { ...S.settings, key: '' } };
  download(new File([JSON.stringify(data)], `armario-${dkey()}.json`, { type: 'application/json' }));
}
async function importAll(file) {
  try {
    const d = JSON.parse(await file.text());
    if (d.v !== 1 || !Array.isArray(d.items)) throw new Error('formato');
    if (!confirm(`Se reemplazará todo por la copia (${d.items.length} prendas). ¿Seguir?`)) return;
    const items = await Promise.all(d.items.map(async i => ({ ...i, img: await d2b(i.img), thumb: await d2b(i.thumb) })));
    const profile = { ...d.profile, photo: await d2b(d.profile?.photo) };
    await Promise.all([idb.clear('items'), idb.clear('log')]);
    await Promise.all([idb.putMany('items', items), idb.putMany('log', d.log || []), idb.put('kv', profile, 'profile'), idb.put('kv', d.prefs || { item: {}, pair: {} }, 'prefs'),
      idb.put('kv', { ...S.settings, ...d.settings, key: S.settings.key }, 'settings'), idb.del('kv', 'plan')]);
    location.reload();
  } catch (e) { console.warn(e); toast('Ese archivo no es una copia válida'); }
}

/* ---------- Acciones (delegación de eventos) ---------- */
const planOf = b => S.plan.get(b.dataset.d);
const otherKeys = k => new Set([S.plan.get(k)?.ids.filter(id => !REST_FREE.has(byId(id)?.cat)).join()]);
const A = {
  tab: b => go(b.dataset.v),
  filter(b) { const f = b.parentElement.dataset.f; S[f] = b.dataset.v; if (f === 'filter') S.sfilter = 'all'; render(); },
  occ(b) { const k = b.parentElement.dataset.d, p = S.plan.get(k); p.occ = b.dataset.v; regenDay(k); savePlan(); render(); },
  replan: () => { ensurePlan(true); render(); toast('Plan rehecho'); },
  async aiplan(b) {
    b.disabled = true; b.textContent = 'Pensando…';
    try { await aiPlan(); toast('Plan hecho con IA'); } catch (e) { toast('IA: ' + e.message); }
    render();
  },
  like: b => { const p = planOf(b); rate(p.ids, 1); p.liked = true; savePlan(); toast('👍 Apuntado: más como este'); },
  dislike: b => { const k = b.dataset.d; rate(planOf(b).ids, -1); regenDay(k, otherKeys(k)); savePlan(); render(); },
  reroll: b => { const k = b.dataset.d; regenDay(k, otherKeys(k)); savePlan(); render(); },
  async wear(b) { const ids = planOf(b).ids; await wear(ids); rate(ids, 0.5); render(); toast(`Apuntado. Esas prendas descansan ${S.settings.rest} días`); },
  tryon: b => tryOn(planOf(b).ids),
  copyPrompt: () => navigator.clipboard.writeText(S.share.prompt).then(() => toast('Texto copiado'), () => toast('No se pudo copiar')),
  async shareTry() {
    const f = new File([S.share.blob], 'outfit.jpg', { type: 'image/jpeg' });
    navigator.clipboard?.writeText(S.share.prompt).catch(() => {});
    if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f] }); } catch (e) { if (e.name !== 'AbortError') download(f); } }
    else download(f);
  },
  add: () => sheet(`<h2>Añadir prenda</h2><p class="muted">Foto de la prenda o accesorio solo, sobre fondo liso. Puedes elegir varias a la vez.${S.settings.key ? ' La IA los identifica sola.' : ''}</p>
    <div class="row"><button class="pri" data-a="pick">📷 Cámara o Fotos</button><button data-a="paste">📋 Pegar recorte</button></div>
    <p class="muted">«Pegar recorte»: en Fotos mantén pulsada la prenda → Copiar. Es lo más rápido: ya viene sin fondo.</p>`),
  pick: () => $('#file').click(),
  async paste() {
    try {
      for (const it of await navigator.clipboard.read()) {
        const t = it.types.find(x => x.startsWith('image/'));
        if (t) return addFiles([await it.getType(t)]);
      }
      toast('No hay ninguna imagen copiada');
    } catch { toast('No se pudo leer el portapapeles'); }
  },
  openItem: b => { const i = byId(b.dataset.v); itemForm({ ...i, uses: [...i.uses], _u: url(i, true) }); },
  chip(b) {
    const g = b.parentElement, f = g.dataset.f, v = b.dataset.v, d = S.edit;
    if (g.dataset.m) {
      const a = d[f], i = a.indexOf(v);
      if (i >= 0 && a.length === 1) return toast('Elige al menos uno');
      i < 0 ? a.push(v) : a.splice(i, 1); b.classList.toggle('on', i < 0);
      return;
    }
    for (const x of g.children) x.classList.toggle('on', x === b);
    d[f] = f === 'warmth' ? +v : v;
    if (f === 'cat') { d.name = $('#f-name').value; if (v === 'acc') d.sub ||= 'otro'; itemForm(d); }
  },
  saveItem, delItem,
  skipItem: () => { URL.revokeObjectURL(S.edit._u); S.edit = null; nextQueue(); },
  async wearItem() {
    const id = S.edit.id, k = dkey(), cur = S.log.get(k)?.ids || [];
    if (cur.includes(id)) return toast('Ya está apuntada hoy');
    await wear([...cur, id], k); closeSheet(); render(); toast(`Apuntada. Descansa ${S.settings.rest} días`);
  },
  mon: b => { S.cal = new Date(S.cal.getFullYear(), S.cal.getMonth() + +b.dataset.v, 1); render(); },
  day(b) {
    const k = b.dataset.v, e = S.log.get(k), p = S.plan.get(k);
    if (!e && !p?.ids.length) return toast('Ese día no tiene outfit');
    sheet(`<h2>${fmtDay(k, { weekday: 'long', day: 'numeric', month: 'long' })}</h2><p class="muted">${e ? 'Lo que te pusiste' : 'Planificado'}</p>${flat((e || p).ids)}
      <div class="row">${e ? `<button class="danger" data-a="unwear" data-v="${k}">Quitar del calendario</button>` : ''}<button data-a="close">Cerrar</button></div>`);
  },
  async unwear(b) { await unwear(b.dataset.v); closeSheet(); render(); },
  close: closeSheet,
  photo: () => $('#pfile').click(),
  avoid(b) {
    const a = S.profile.avoid, v = b.dataset.v, i = a.indexOf(v);
    i < 0 ? a.push(v) : a.splice(i, 1); b.classList.toggle('on', i < 0);
    saveProfile();
  },
  quiz: () => { S.qd = structuredClone(S.profile.q || {}); quiz(0); },
  qchip(b) {
    const g = b.parentElement, f = g.dataset.f, v = b.dataset.v;
    if (g.dataset.m) { const a = (S.qd[f] ||= []), i = a.indexOf(v); i < 0 ? a.push(v) : a.splice(i, 1); b.classList.toggle('on', i < 0); }
    else { S.qd[f] = v; for (const x of g.children) x.classList.toggle('on', x === b); }
  },
  qprev: () => { readNums(); quiz(S.qs - 1); },
  qnext() {
    readNums();
    if (S.qs === 0 && !S.qd.styles?.length) return toast('Elige al menos un estilo');
    if (S.qs < QUIZ.length - 1) return quiz(S.qs + 1);
    S.profile.q = S.qd;
    if (!S.profile.face) S.profile.season = calcSeason(S.qd);
    saveProfile(); ensurePlan(true); closeSheet(); render();
    toast(`¡Listo! Tu colorimetría: ${SEASONS[S.profile.season].n}`);
  },
  face: () => $('#sfile').click(),
  locmode(b) {
    S.settings.loc = b.dataset.v === 'gps' ? { mode: 'gps' } : { mode: 'city', ...(S.settings.loc.mode === 'city' ? S.settings.loc : {}) };
    saveSettings(); render(); if (b.dataset.v === 'gps') loadWeather(true);
  },
  async citySearch() {
    const q = $('#city').value.trim(), box = $('#cityres'); if (!q) return;
    try {
      const j = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=es&format=json`)).json();
      box.innerHTML = (j.results || []).map(r => `<button data-a="setCity" data-lat="${r.latitude}" data-lon="${r.longitude}" data-n="${esc(r.name)}">${esc(r.name)}<small> ${esc([r.admin1, r.country].filter(Boolean).join(', '))}</small></button>`).join('') || '<p class="muted">Sin resultados</p>';
    } catch { toast('Sin conexión'); }
  },
  setCity(b) {
    S.settings.loc = { mode: 'city', name: b.dataset.n, lat: +b.dataset.lat, lon: +b.dataset.lon };
    saveSettings(); for (const [k, p] of S.plan) if (!p.worn) p.wx = false;
    loadWeather(true).then(render); toast(`Ubicación: ${b.dataset.n}`);
  },
  setnum(b) {
    const f = b.parentElement.dataset.f; S.settings[f] = +b.dataset.v; saveSettings();
    for (const x of b.parentElement.children) x.classList.toggle('on', x === b);
    if (f === 'days') loadWeather(); ensurePlan(); render();
  },
  saveSet: () => {
    S.settings.key = $('#key').value.trim(); S.settings.model = $('#model').value.trim() || 'gemini-flash-latest';
    saveSettings(); toast('Guardado'); render();
  },
  export: exportAll,
  import: () => $('#ifile').click(),
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (b && A[b.dataset.a]) { e.preventDefault(); Promise.resolve().then(() => A[b.dataset.a](b, e)).catch(fail); }
});
// red de seguridad: ningún fallo inesperado deja la app colgada
function fail(err) { console.error(err); S.busy = false; toast('Algo ha fallado: ' + (err?.message || err)); if (!dlg.open) render(); }
addEventListener('unhandledrejection', e => fail(e.reason));
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'city') A.citySearch(); });
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'file') { addFiles(t.files); t.value = ''; }
  else if (t.id === 'ifile' && t.files[0]) { importAll(t.files[0]); t.value = ''; }
  else if (t.id === 'style') { S.profile.style = t.value.trim(); saveProfile(); toast('Guardado'); }
  else if (t.id === 'pfile' && t.files[0]) {
    S.profile.photo = await canvasBlob(toCanvas(await blobToImg(t.files[0]), 1280), 'image/jpeg', 0.85); t.value = '';
    if (S.meUrl) { URL.revokeObjectURL(S.meUrl); S.meUrl = null; }
    await saveProfile(); render();
  } else if (t.id === 'sfile' && t.files[0]) {
    const f = t.files[0]; t.value = '';
    sheet('<h2>Analizando tu cara y tu color…</h2><p class="muted">La foto no se guarda.</p><div class="spin"></div>');
    try {
      const r = await aiFace(await canvasBlob(toCanvas(await blobToImg(f), 768), 'image/jpeg', 0.85));
      S.profile.season = r.estacion;
      S.profile.face = { shape: r.forma_cara, tone: r.subtono, fav: r.colores_favorecen, avoid: r.colores_evitar, tips: r.consejos };
      await saveProfile(); ensurePlan(true); closeSheet(); render(); toast(`Colorimetría: ${SEASONS[r.estacion].n}`);
    } catch (err) { closeSheet(); toast('IA: ' + err.message); }
  }
});
document.addEventListener('paste', e => {
  const f = [...(e.clipboardData?.files || [])].filter(x => x.type.startsWith('image/'));
  if (f.length && !e.target.closest?.('input,textarea')) { e.preventDefault(); addFiles(f); }
});

/* ---------- Arranque ---------- */
(async () => {
  const [items, log, profile, settings, prefs, plan] = await Promise.all([idb.all('items'), idb.all('log'), idb.get('kv', 'profile'), idb.get('kv', 'settings'), idb.get('kv', 'prefs'), idb.get('kv', 'plan')]);
  // migración desde la v1 (estilo casual/arreglado/formal → usos)
  const mig = items.filter(i => !i.uses);
  for (const i of mig) { i.uses = i.formal === 2 ? ['formal'] : i.formal === 1 ? ['diario', 'salir'] : ['diario']; delete i.formal; }
  for (const i of items) if (i.last > 1e11) i.last = Math.round(i.last / 864e5);
  if (mig.length) idb.putMany('items', items);
  S.items = items.sort((a, b) => b.created - a.created); reindex();
  for (const l of log) S.log.set(l.date, l);
  Object.assign(S.profile, profile); Object.assign(S.settings, settings); Object.assign(S.prefs, prefs);
  S.plan = new Map(plan || []);
  render();
  loadWeather();
  navigator.storage?.persist?.();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();

// Acceso interno solo para pruebas automáticas (?test en la URL)
if (new URLSearchParams(location.search).has('test')) globalThis.__A = { S, A, aiPlan, ai, ensurePlan, suggestFor, calcSeason, usage, resting, restLeft, planDates, dnum, regenDay, render, label, palette };
