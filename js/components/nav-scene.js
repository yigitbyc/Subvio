/**
 * Navigasyon sahnesi (SVG, bağımlılıksız). Gerçek perspektif projeksiyonu kullanır:
 *   ekran_y = ufuk + K / d,   ekran_x = merkez + (X - kameraX) / d
 * Kamera ilerlemesi seans ilerlemesine bağlıdır (setProgress). Seans durunca sahne de durur.
 * Yalnızca transform/attribute güncellenir; DOM yeniden oluşturulmaz.
 */
import { clamp } from '../utils/dom.js';

const NS = 'http://www.w3.org/2000/svg';
const H = 600; //          viewBox yüksekliği (genişlik, kap oranına göre hesaplanır)
const HORIZON = 228;
const K = 380; //          yer düzleminin kamera yüksekliği katsayısı
const ROAD = 240; //       yol yarı genişliği (orta çizgi X=0)
const CAM_X = 120; //      kamera sağ şeridin ortasında
const NEAR = 0.6;
const FAR = 16;
const CAR_D = 1.25; //     aracın kameraya uzaklığı
const SPEED = 0.9; //      dünya birimi / saniye (sahne akış hızı)
const LOOP = FAR - NEAR;

const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mod = (n, m) => ((n % m) + m) % m;

export function createNavScene(container) {
  const svg = el('svg', { class: 'nav-scene', viewBox: `0 0 400 ${H}`, preserveAspectRatio: 'xMidYMid slice', role: 'img', 'aria-label': 'Yolda ilerleyen araç: odaklanma yolculuğu' });
  container.append(svg);

  let W = 400;
  let cx = 200;
  let progress = 0;
  let durationSeconds = 1500;
  let braking = true;
  let items = [];
  let dashes = [];
  let lastOrder = '';
  let refs = {};

  const px = (X, d) => cx + (X - CAM_X) / d;
  const py = (d) => HORIZON + K / d;
  const quad = (x1, x2, d1, d2) => `${px(x1, d1)},${py(d1)} ${px(x2, d1)},${py(d1)} ${px(x2, d2)},${py(d2)} ${px(x1, d2)},${py(d2)}`;

  /* ---------- Sahne nesneleri (d=1 ölçeğinde, orijin = zemin) ---------- */
  function tree(r) {
    const h = 160 + r() * 90;
    const g = el('g');
    el('rect', { x: -5, y: -h * 0.4, width: 10, height: h * 0.4, fill: '#1c1511' }, g);
    const tones = ['#10211a', '#14281d', '#0e1c16'];
    [[0, -h * 0.62, h * 0.24], [-h * 0.13, -h * 0.5, h * 0.19], [h * 0.13, -h * 0.5, h * 0.19], [0, -h * 0.82, h * 0.17]]
      .forEach(([x, y, rad], i) => el('circle', { cx: x, cy: y, r: rad, fill: tones[i % 3] }, g));
    return { g, w: h * 0.6 };
  }

  function building(r, wMin, wMax, hMin, hMax) {
    const w = wMin + r() * (wMax - wMin);
    const h = hMin + r() * (hMax - hMin);
    const g = el('g');
    el('rect', { x: -w / 2, y: -h, width: w, height: h, fill: '#141418' }, g);
    el('rect', { x: -w / 2, y: -h, width: w, height: 8, fill: '#1d1d23' }, g);
    el('rect', { x: -w / 2 + 8, y: -h + 20, width: w - 16, height: h - 28, fill: 'url(#ns-win)' }, g);
    const cols = Math.max(1, Math.floor((w - 16) / 34));
    const rows = Math.max(1, Math.floor((h - 28) / 44));
    for (let i = 0; i < Math.min(8, cols * rows); i++) {
      el('rect', { x: -w / 2 + 8 + Math.floor(r() * cols) * 34 + 9, y: -h + 20 + Math.floor(r() * rows) * 44 + 11, width: 16, height: 22, rx: 2, fill: '#FF8A32', opacity: (0.45 + r() * 0.4).toFixed(2) }, g);
    }
    return { g, w };
  }

  function lamp() {
    const g = el('g');
    el('rect', { x: -2.5, y: -200, width: 5, height: 200, fill: '#2a2a30' }, g);
    el('circle', { cx: 0, cy: -204, r: 46, fill: 'url(#ns-lamp)' }, g);
    el('rect', { x: -9, y: -208, width: 18, height: 7, rx: 3, fill: '#ffc58f' }, g);
    return { g, w: 20 };
  }

  function build() {
    svg.replaceChildren();
    items = []; dashes = []; lastOrder = '';
    cx = W / 2;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const defs = el('defs', {}, svg);
    const grad = (id, stops, attrs = {}, tag = 'linearGradient') => {
      const g = el(tag, { id, ...attrs }, defs);
      stops.forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a ?? 1 }, g));
    };
    grad('ns-sky', [[0, '#050507'], [0.5, '#130e0e'], [0.82, '#3b2012'], [1, '#8a4515']], { x1: 0, y1: 0, x2: 0, y2: 1 });
    grad('ns-ground', [[0, '#17110d'], [1, '#0a0c0b']], { x1: 0, y1: 0, x2: 0, y2: 1 });
    grad('ns-road', [[0, '#2a2a2e'], [1, '#121214']], { x1: 0, y1: 0, x2: 0, y2: 1 });
    grad('ns-glow', [[0, '#FF8A32', 0.55], [1, '#FF8A32', 0]], {}, 'radialGradient');
    grad('ns-lamp', [[0, '#FFB070', 0.5], [1, '#FF8A32', 0]], {}, 'radialGradient');
    grad('ns-red', [[0, '#ff4a3d', 0.9], [1, '#ff4a3d', 0]], {}, 'radialGradient');
    grad('ns-beam', [[0, '#FF8A32', 0], [1, '#FF8A32', 0.5]], { x1: 0, y1: 0, x2: 0, y2: 1 });
    grad('ns-fog', [[0, '#8a4515', 0.4], [1, '#8a4515', 0]], { x1: 0, y1: 0, x2: 0, y2: 1 });
    grad('ns-vignette', [[0.55, '#000', 0], [1, '#000', 0.55]], {}, 'radialGradient');
    const pat = el('pattern', { id: 'ns-win', width: 34, height: 44, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { x: 9, y: 11, width: 16, height: 22, rx: 2, fill: '#1e1e25' }, pat);

    el('rect', { width: W, height: HORIZON + 2, fill: 'url(#ns-sky)' }, svg);
    el('ellipse', { cx, cy: HORIZON, rx: W * 0.65, ry: 130, fill: 'url(#ns-glow)' }, svg);

    // Uzak şehir silueti (sabit)
    const r0 = rng(11);
    for (let x = -10; x < W + 10; x += 12 + r0() * 14) {
      const w = 14 + r0() * 22;
      const h = 8 + r0() * 38;
      el('rect', { x, y: HORIZON + 1 - h, width: w, height: h, fill: '#0e0d10' }, svg);
    }

    el('rect', { y: HORIZON, width: W, height: H - HORIZON, fill: 'url(#ns-ground)' }, svg);
    // Yol, kaldırım ve kenar çizgileri
    const dFar = 60;
    el('polygon', { points: quad(-ROAD - 46, ROAD + 46, NEAR * 0.8, dFar), fill: '#18181b' }, svg);
    el('polygon', { points: quad(-ROAD, ROAD, NEAR * 0.8, dFar), fill: 'url(#ns-road)' }, svg);
    el('polygon', { points: quad(-ROAD + 6, -ROAD + 16, NEAR * 0.8, dFar), fill: '#c9c9ce', opacity: 0.55 }, svg);
    el('polygon', { points: quad(ROAD - 16, ROAD - 6, NEAR * 0.8, dFar), fill: '#c9c9ce', opacity: 0.55 }, svg);

    // Orta çizgi (dinamik)
    const count = Math.ceil(LOOP / 1.2) + 1;
    refs.dashLoop = count * 1.2;
    for (let k = 0; k < count; k++) dashes.push({ k, node: el('polygon', { fill: '#d9d9dd', opacity: 0.8 }, svg) });

    // Yol kenarı: ağaç, bina, lamba
    const gScenery = el('g', {}, svg);
    const r = rng(42);
    const rows = [
      { edge: 300, spacing: 1.5, make: () => (r() < 0.8 ? tree(r) : null), jitter: 50 },
      { edge: 560, spacing: 2.4, make: () => (r() < 0.55 ? building(r, 150, 260, 260, 520) : tree(r)), jitter: 0 },
      { edge: 1000, spacing: 3.2, make: () => building(r, 260, 480, 480, 900), jitter: 0 },
    ];
    for (const side of [-1, 1]) {
      rows.forEach((row) => {
        const n = Math.ceil(LOOP / row.spacing);
        for (let i = 0; i < n; i++) {
          const o = row.make();
          if (!o) continue;
          const bw = o.w;
          const X = side * (row.edge + (row.jitter ? r() * row.jitter : bw / 2));
          items.push({ ...o, X, z: i * row.spacing + r() * 0.5, hw: bw / 2, node: o.g });
          gScenery.append(o.g);
        }
      });
      const n = Math.ceil(LOOP / 3.2);
      for (let i = 0; i < n; i++) {
        const o = lamp();
        items.push({ ...o, X: side * (ROAD + 24), z: i * 3.2 + (side > 0 ? 0 : 1.6), hw: 20, node: o.g });
        gScenery.append(o.g);
      }
    }
    refs.scenery = gScenery;
    items.forEach((it, i) => { it.idx = i; });

    el('rect', { y: HORIZON - 6, width: W, height: 120, fill: 'url(#ns-fog)' }, svg);

    // Varış çizgisi + hedef iğnesi (dünya koordinatında)
    refs.finish = el('polygon', { fill: '#f2f2f4', opacity: 0.85 }, svg);
    refs.pin = el('g', {}, svg);
    el('rect', { x: -5, y: -380, width: 10, height: 380, fill: 'url(#ns-beam)' }, refs.pin);
    const pinHead = el('g', { transform: 'translate(0 -400)' }, refs.pin);
    el('circle', { r: 110, fill: 'url(#ns-glow)' }, pinHead);
    el('path', { d: 'M0 0C-28 -30 -42 -52 -42 -72A42 42 0 1 1 42 -72C42 -52 28 -30 0 0Z', fill: '#FF8A32' }, pinHead);
    el('circle', { cy: -72, r: 15, fill: '#0A0A0B' }, pinHead);

    // Araç (arkadan görünüm)
    refs.car = el('g', {}, svg);
    el('ellipse', { cy: -4, rx: 78, ry: 12, fill: '#000', opacity: 0.55 }, refs.car);
    const body = el('g', {}, refs.car);
    el('rect', { x: -58, y: -24, width: 18, height: 22, rx: 5, fill: '#08080a' }, body);
    el('rect', { x: 40, y: -24, width: 18, height: 22, rx: 5, fill: '#08080a' }, body);
    el('path', { d: 'M-46 -80 L-38 -124 Q-36 -130 -28 -130 H28 Q36 -130 38 -124 L46 -80Z', fill: '#26262c' }, body);
    el('path', { d: 'M-38 -84 L-31 -120 H31 L38 -84Z', fill: '#0d1013' }, body);
    el('path', { d: 'M-31 -120 H-8 L-20 -84 H-38Z', fill: '#fff', opacity: 0.05 }, body);
    el('rect', { x: -66, y: -82, width: 132, height: 58, rx: 14, fill: '#2e2e35' }, body);
    el('rect', { x: -66, y: -82, width: 132, height: 3, rx: 1.5, fill: '#fff', opacity: 0.14 }, body);
    el('rect', { x: -70, y: -34, width: 140, height: 18, rx: 8, fill: '#1c1c21' }, body);
    el('rect', { x: -19, y: -52, width: 38, height: 14, rx: 2, fill: '#d2d2d6' }, body);
    refs.tail = el('g', {}, body);
    for (const sx of [-1, 1]) {
      el('rect', { x: sx < 0 ? -62 : 32, y: -70, width: 30, height: 12, rx: 4, fill: '#d6392e' }, refs.tail);
      el('circle', { cx: sx * 47, cy: -64, r: 34, fill: 'url(#ns-red)' }, refs.tail);
    }

    el('rect', { width: W, height: H, fill: 'url(#ns-vignette)' }, svg);
    refs.rail = null;
    render();
  }

  /* ---------- Çizim ---------- */
  function render() {
    const cam = progress * durationSeconds * SPEED;

    // Orta çizgi
    for (const dash of dashes) {
      const d1 = NEAR + mod(dash.k * 1.2 - cam, refs.dashLoop);
      dash.node.setAttribute('points', quad(-7, 7, d1, d1 + 0.55));
      dash.node.setAttribute('opacity', clamp((FAR + 4 - d1) / 6, 0, 1) * 0.8);
    }

    // Yol kenarı nesneleri (kaydırmalı sonsuz döngü, uzakta belirip yakında kaybolur)
    const visible = [];
    for (const it of items) {
      const d = NEAR + mod(it.z - cam - NEAR, LOOP);
      const s = 1 / d;
      const sx = cx + (it.X - CAM_X) * s;
      if (sx + it.hw * s < -30 || sx - it.hw * s > W + 30) {
        it.node.setAttribute('visibility', 'hidden');
        continue;
      }
      it.node.setAttribute('visibility', 'visible');
      it.node.setAttribute('transform', `translate(${sx.toFixed(2)} ${(HORIZON + K * s).toFixed(2)}) scale(${s.toFixed(4)})`);
      it.node.setAttribute('opacity', Math.min(1, (FAR - d) / 5, (d - NEAR) / 0.35).toFixed(3));
      it.d = d;
      visible.push(it);
    }
    visible.sort((a, b) => b.d - a.d); // uzaktan yakına
    const order = visible.map((v) => v.idx).join(',');
    if (order !== lastOrder) { // göreli sıra yalnızca döngü atlamasında değişir
      lastOrder = order;
      visible.forEach((v) => refs.scenery.append(v.node));
    }

    // Varış: dünyada sabit nokta; seans bitiminde araçla buluşur.
    const dDest = CAR_D + (1 - progress) * durationSeconds * SPEED;
    const dPin = Math.min(dDest, FAR * 0.92);
    const sp = 1 / dPin;
    refs.pin.setAttribute('transform', `translate(${px(0, dPin)} ${py(dPin)}) scale(${sp})`);
    refs.pin.setAttribute('opacity', progress >= 1 ? 1 : Math.min(1, (FAR + 2 - dPin) / 3));
    if (dDest < FAR) refs.finish.setAttribute('points', quad(-ROAD + 16, ROAD - 16, dDest, dDest + 0.4));
    else refs.finish.setAttribute('points', '0,0 0,0 0,0');

    // Araç: sabit kamera pozisyonunda, ilerlemeye bağlı hafif salınım
    const bob = braking ? 0 : Math.sin(cam * 7) * 1.4;
    refs.car.setAttribute('transform', `translate(${cx} ${py(CAR_D) + bob}) scale(${1 / CAR_D})`);
    refs.tail.setAttribute('opacity', braking ? 1 : 0.5);
  }

  const observer = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (!width || !height) return;
    const next = Math.round(H * clamp(width / height, 0.45, 2.8));
    if (next !== W) { W = next; build(); }
  });
  observer.observe(container);
  build();

  return {
    /** progress: 0..1, duration: seans süresi (sn), isBraking: duruyor mu */
    update(p, duration, isBraking) {
      progress = clamp(p, 0, 1);
      durationSeconds = duration;
      braking = isBraking;
      render();
    },
    destroy() { observer.disconnect(); svg.remove(); },
  };
}
