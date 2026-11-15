// Monta o tema Blood Moon: desenha as cenas em pixel art (SVG com animações dentro),
// junta com src/base.css e src/colors.json e grava blood-moon.json e scene.svg.
//
// Uso: node src/build.mjs [caminho-de-um-tema-instalado.json]
// Com o caminho, também atualiza as cores e o CSS desse tema (o nome e o id dele ficam).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 50000; // o T3 aceita até 50.000 caracteres de CSS por tema

// Números "aleatórios" fixos, para a cena sair igual toda vez
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const r = (x, y, w, h, fill, cls) =>
  `<rect x='${x}' y='${y}' width='${w}' height='${h}'${fill ? ` fill='${fill}'` : ''}${cls ? ` class='${cls}'` : ''}/>`;
// Para usar o SVG dentro de url("data:...") no CSS
const encode = (svg) => svg.replace(/%/g, '%25').replace(/#/g, '%23').replace(/"/g, "'");

// ---------- Cena principal (320x180) ----------
const scene = () => {
  const W = 320, H = 180;
  const parts = [];

  // Céu em faixas (degradê "pixelado")
  const sky = [[0, 28, '#050103'], [28, 26, '#070205'], [54, 24, '#0a0307'], [78, 22, '#0e0409'], [100, 20, '#13050b'], [120, 18, '#19060d'], [138, 42, '#200710']];
  for (const [y, h, c] of sky) parts.push(r(0, y, W, h, c));

  // Estrelas
  const stars = [];
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * 115);
    if (Math.hypot(x - 232, y - 52) < 40) continue; // longe da lua
    const big = rnd() < 0.15;
    stars.push(r(x, y, big ? 2 : 1, 1, null, `s s${i % 4}`));
  }
  parts.push(`<g>${stars.join('')}</g>`);

  // Estrela cadente vermelha, de vez em quando
  parts.push(`<g class='shoot'>${r(90, 20, 3, 1, '#ffd0d6')}${r(93, 19, 2, 1, '#ff6a7c')}${r(95, 18, 2, 1, '#ff2a40')}</g>`);

  // Brilho da lua (pulsa)
  const MX = 232, MY = 52, MR = 24;
  parts.push(`<defs><radialGradient id='g'><stop offset='.38' stop-color='#ff1f3d' stop-opacity='.35'/><stop offset='.6' stop-color='#ff1f3d' stop-opacity='.12'/><stop offset='1' stop-color='#ff1f3d' stop-opacity='0'/></radialGradient></defs>`);
  parts.push(`<circle cx='${MX}' cy='${MY}' r='64' fill='url(#g)' class='halo' shape-rendering='auto'/>`);

  // Lua de sangue: pixel a pixel, com sombra e crateras
  const craters = [[-9, -4, 4], [6, 8, 5], [-3, 12, 3], [10, -10, 2.5], [-14, 8, 2.5]];
  const shade = (dx, dy) => {
    const d = Math.hypot(dx, dy);
    if (craters.some(([cx, cy, cr]) => Math.hypot(dx - cx, dy - cy) <= cr)) return d > MR - 1.5 ? '#8a1022' : '#7a0d1f';
    const light = Math.hypot(dx - 9, dy + 10); // luz vindo de cima à direita
    if (d > MR - 1.3 && dx > 2 && dy < -2) return '#ff5a6a'; // borda iluminada
    if (light < 16) return '#e2243b';
    if (light < 28) return '#c0182e';
    if (light < 38) return '#9c1228';
    return '#6e0b1b';
  };
  const moon = [];
  for (let dy = -MR; dy <= MR; dy++) {
    let run = null;
    for (let dx = -MR; dx <= MR + 1; dx++) {
      const inside = dx <= MR && Math.hypot(dx + 0.5, dy + 0.5) <= MR;
      const c = inside ? shade(dx, dy) : null;
      if (run && run.c === c) { run.w++; continue; }
      if (run && run.c) moon.push(r(MX + run.x, MY + dy, run.w, 1, run.c));
      run = { x: dx, w: 1, c };
    }
  }
  parts.push(`<g>${moon.join('')}</g>`);

  // Nuvens escuras passando na frente da lua
  const cloud = (w) => [[6, w - 12], [3, w - 6], [0, w], [4, w - 10]].map(([x, ww], i) => r(x, i * 2, ww, 2)).join('');
  parts.push(`<g class='cl c1'>${cloud(46)}</g><g class='cl c2'>${cloud(34)}</g><g class='cl c3'>${cloud(28)}</g>`);

  // Morcegos: duas poses de asa que se alternam
  const bat = (cls) => `<g class='bat ${cls}'><g class='wu'>${r(0, 0, 2, 1)}${r(1, 1, 2, 1)}${r(3, 1, 1, 2)}${r(4, 1, 2, 1)}${r(5, 0, 2, 1)}</g><g class='wd'>${r(1, 1, 2, 1)}${r(0, 2, 2, 1)}${r(3, 1, 1, 2)}${r(4, 1, 2, 1)}${r(5, 2, 2, 1)}</g></g>`;
  // Cada morcego tem seu caminho; os que saem da torre vêm em bando (deslocados um do outro)
  const off = (dx, dy, inner) => `<g transform='translate(${dx} ${dy})'>${inner}</g>`;
  parts.push(`<g fill='#050102'>${[
    bat('b1'), bat('b2'), bat('b3'), bat('b4'), bat('b5'),
    bat('o1'), bat('o2'), bat('o3'),
    off(0, 0, bat('t1')), off(-6, 4, bat('t2')), off(5, 6, bat('t3')), off(-2, 10, bat('t4')),
  ].join('')}</g>`);

  // Relâmpago: o céu pisca vermelho e um raio aparece por um instante (atrás das montanhas)
  // Cada trecho desce 4px; quando o raio muda de coluna, um degrau liga um trecho ao outro
  const zigzag = (x, y0, steps, len) => {
    let d = '';
    steps.forEach((dx, i) => {
      const y = y0 + i * len;
      d += `M${x} ${y}h1v${len}h-1z`;
      if (dx) d += `M${Math.min(x, x + dx)} ${y + len - 1}h${Math.abs(dx) + 1}v1h-${Math.abs(dx) + 1}z`;
      x += dx;
    });
    return d;
  };
  const zig = [1, 2, -1, 1, 2, 1, -2, 1, 2, -1, 1, 2, 1, -1, 2, 1, 1, -2, 1, 2, 1, -1, 2, 1, 1, 2, -1, 1, 0];
  const branchX = 128 + zig.slice(0, 15).reduce((a, b) => a + b, 0); // onde o raio está na altura do galho
  const bolt = zigzag(128, 0, zig, 4) + zigzag(branchX, 60, [1, 2, 1, 0], 3);
  parts.push(`<rect width='${W}' height='${H}' fill='#ff3b4f' class='flash'/><path fill='#ffe0e4' class='bolt' d='${bolt}'/>`);

  // Montanhas (fundo e frente): um caminho só, em degraus de 4px
  const ridge = (base, a, fa, b, fb, c) => {
    let d = `M0 ${H}`;
    for (let x = 0; x < W; x += 4) d += `V${Math.round(base + a * Math.sin(x / fa) + b * Math.sin(x / fb + 1.3))}h4`;
    return `<path fill='${c}' d='${d}V${H}z'/>`;
  };
  parts.push(ridge(128, 10, 26, 5, 9, '#170509'));

  // Torre em ruínas à esquerda, com janelas vermelhas piscando
  const tower = [
    r(30, 98, 14, 60), r(28, 96, 18, 3), r(28, 93, 3, 3), r(34, 93, 3, 3), r(40, 93, 3, 3), r(44, 92, 2, 4),
    r(46, 112, 10, 46), r(46, 109, 3, 3), r(52, 108, 3, 4), r(22, 118, 8, 40), r(22, 115, 2, 3), r(26, 116, 2, 2),
  ];
  parts.push(`<g fill='#0a0204'>${tower.join('')}</g>`);
  parts.push(r(35, 104, 2, 3, '#ff2a40', 'win w1') + r(35, 116, 2, 3, '#ff2a40', 'win w2') + r(50, 120, 2, 2, '#ff5a36', 'win w3'));

  // Vampiro em pixel art (25x16) em cima da torre: 0 vazio, 1 corpo, 2 borda iluminada, 3 olho
  {
    const GW = 25, GH = 16, OX = 37 - 12, OY = 96 - GH;
    const blank = () => Array.from({ length: GH }, () => Array(GW).fill(0));
    const set = (g, x, y, v) => { if (x >= 0 && x < GW && y >= 0 && y < GH) g[y][x] = v; };
    const mirror = (g, x, y, v) => { set(g, x, y, v); set(g, GW - 1 - x, y, v); };
    const figure = (g) => {
      for (let y = 1; y <= 3; y++) for (let x = 10; x <= 14; x++) set(g, x, y, 1); // cabeça
      mirror(g, 10, 0, 1); // orelhas
      for (let y = 2; y <= 4; y++) mirror(g, 9, y, 1); // gola alta
      for (let y = 4; y <= 14; y++) { const h = y < 11 ? 3 : 4; for (let x = 12 - h; x <= 12 + h; x++) set(g, x, y, 1); } // capa
      for (let x = 8; x <= 16; x += 2) set(g, x, 15, 1); // barra rasgada da capa
      for (let y = 5; y <= 14; y++) set(g, y < 11 ? 15 : 16, y, 2); // lado direito iluminado pela lua
      set(g, 14, 1, 2); set(g, 15, 2, 2);
      set(g, 11, 2, 3); set(g, 13, 2, 3); // olhos
    };
    // Asa aberta: borda de cima sobe até a ponta, a de baixo tem os "dentes" entre os dedos
    const openG = blank();
    const top = [1, 1, 2, 2, 3, 3, 3, 4, 4], bottom = [3, 5, 6, 5, 7, 8, 7, 9, 10];
    for (let c = 0; c <= 8; c++) {
      for (let y = top[c]; y <= bottom[c]; y++) mirror(openG, c, y, 1);
      mirror(openG, c, top[c], 2);
    }
    figure(openG);
    // Asas fechadas: enroladas no corpo como uma capa
    const foldG = blank();
    for (let c = 6; c <= 8; c++) for (let y = 4 + (8 - c); y <= 13 - (8 - c); y++) mirror(foldG, c, y, 1);
    mirror(foldG, 7, 5, 2); mirror(foldG, 8, 4, 2);
    figure(foldG);
    // Junta pixels vizinhos da mesma cor numa linha só
    const paint = (g) => {
      const d = { 1: '', 2: '', 3: '' };
      g.forEach((row, y) => { for (let x = 0; x < GW;) { const v = row[x]; let w = 1; while (x + w < GW && row[x + w] === v) w++; if (v) d[v] += `M${OX + x} ${OY + y}h${w}v1h-${w}z`; x += w; } });
      return `<path fill='#030001' d='${d[1]}'/><path fill='#7a1a2a' d='${d[2]}'/><path class='eyes' fill='#ff3b4f' d='${d[3]}'/>`;
    };
    parts.push(`<defs><radialGradient id='a'><stop offset='0' stop-color='#ff1f3d' stop-opacity='.22'/><stop offset='1' stop-color='#ff1f3d' stop-opacity='0'/></radialGradient></defs>`);
    parts.push(`<circle cx='37' cy='${OY + 6}' r='18' fill='url(#a)' class='aura' shape-rendering='auto'/>`);
    parts.push(`<g class='eyes'><circle cx='37' cy='${OY + 2.5}' r='2.5' fill='#ff1f3d' opacity='.3' shape-rendering='auto'/></g>`); // o grupo pisca, o círculo fica fraco
    parts.push(`<g class='vo'>${paint(openG)}</g><g class='vf'>${paint(foldG)}</g>`);
  }

  parts.push(ridge(148, 7, 18, 4, 7, '#0b0205'));

  // Cemitério: chão plano, cerca de ferro, mausoléu e lápides com a borda iluminada pela lua
  const GY = 163; // linha do chão do cemitério
  const cem = [], lit = [], fence = [];
  parts.push(`<path fill='#0b0205' d='M52 ${H}V170h8v-4h8v-3h184v3h8v4h8V${H}z'/>`);
  parts.push(`<defs><pattern id='f' x='66' y='${GY - 8}' width='4' height='8' patternUnits='userSpaceOnUse'><rect width='1' height='8' fill='#030001'/></pattern></defs>`);
  fence.push(`<rect x='66' y='${GY - 8}' width='191' height='8' fill='url(#f)'/>`); // grades da cerca
  fence.push(r(64, GY - 5, 194, 1), r(64, GY - 2, 194, 1)); // travessas da cerca
  // Mausoléu
  const mx = 150, mtop = GY - 26;
  cem.push(r(mx, mtop + 8, 26, 18), r(mx - 2, mtop + 6, 30, 2), r(mx + 2, mtop + 4, 22, 2), r(mx + 6, mtop + 2, 14, 2), r(mx + 10, mtop, 6, 2), r(mx + 12, mtop - 6, 2, 6), r(mx + 10, mtop - 4, 6, 2));
  lit.push(r(mx + 25, mtop + 8, 1, 18), r(mx + 16, mtop, 1, 2), r(mx + 20, mtop + 2, 1, 2), r(mx + 24, mtop + 4, 1, 2), r(mx + 27, mtop + 6, 1, 2));
  // Lápides: arredondada, cruz e obelisco
  const stone = (x, h) => { cem.push(r(x + 1, GY - h, 4, 1), r(x, GY - h + 1, 6, h - 1)); lit.push(r(x + 5, GY - h + 1, 1, h - 1), r(x + 2, GY - h, 3, 1)); };
  const cross = (x, h) => { cem.push(r(x + 2, GY - h, 2, h), r(x, GY - h + 2, 6, 2)); lit.push(r(x + 3, GY - h, 1, h), r(x + 4, GY - h + 2, 2, 1)); };
  const obel = (x) => { cem.push(r(x + 2, GY - 15, 1, 2), r(x + 1, GY - 13, 3, 11), r(x, GY - 2, 5, 2)); lit.push(r(x + 3, GY - 13, 1, 11)); };
  stone(72, 9); cross(84, 12); stone(96, 7); obel(108); cross(120, 10); stone(132, 10);
  cross(184, 13); stone(196, 8); obel(208); stone(222, 11); cross(236, 9); stone(248, 7);
  cem.push(r(140, GY - 6, 5, 6), r(141, GY - 7, 4, 1), r(142, GY - 8, 3, 1)); // lápide torta
  // Pedras num vermelho-escuro (um pouco mais claras que o chão) e a cerca preta na frente
  parts.push(`<g fill='#24080e'>${cem.join('')}</g><g fill='#7a1a2a'>${lit.join('')}</g><g fill='#030001'>${fence.join('')}</g>`);
  parts.push(r(mx + 10, GY - 10, 6, 10, '#ff1f3d', 'door')); // porta do mausoléu com luz fraca
  parts.push(r(98, GY - 9, 1, 2, '#ff7a3d', 'win w1') + r(226, GY - 13, 1, 2, '#ff7a3d', 'win w3') + r(134, GY - 12, 1, 2, '#ff5a36', 'win w2')); // velas

  // Árvores secas à direita
  const tree = (x, y) => [
    r(x, y, 2, 24), r(x - 4, y + 6, 4, 1), r(x - 6, y + 4, 2, 2), r(x + 2, y + 3, 5, 1), r(x + 6, y, 1, 3),
    r(x - 2, y + 12, 2, 1), r(x + 2, y + 10, 3, 1), r(x + 4, y + 8, 1, 2), r(x, y - 3, 1, 3),
  ].join('');
  parts.push(`<g fill='#050102'>${tree(276, 128)}${tree(296, 136)}${tree(258, 140)}</g>`);

  // Neblina vermelha no chão (duas cópias para dar a volta sem emenda)
  const wisp = (x, y, w) => r(x + 6, y - 1, w - 12, 1) + r(x, y, w, 2) + r(x + 4, y + 2, w - 8, 1);
  const fogBand = (ox) => [wisp(ox, 160, 60), wisp(ox + 92, 165, 76), wisp(ox + 200, 158, 50), wisp(ox + 40, 171, 90), wisp(ox + 236, 168, 70)].join('');
  parts.push(`<g class='fog' fill='#ff1f3d'>${fogBand(0)}${fogBand(320)}</g>`);

  // Brasas subindo do chão
  const embers = [];
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(10 + rnd() * 300), dur = (6 + rnd() * 6).toFixed(1), delay = (-rnd() * 12).toFixed(1);
    const c = rnd() < 0.5 ? '#ff3b2f' : '#ff7a3d';
    embers.push(`<rect x='${x}' y='174' width='1' height='${rnd() < 0.3 ? 2 : 1}' fill='${c}' class='em' style='animation-duration:${dur}s;animation-delay:${delay}s'/>`);
  }
  parts.push(`<g>${embers.join('')}</g>`);

  const style = [
    '.s{fill:#ffd6dc;animation:tw 2.4s ease-in-out infinite}',
    '.s1{animation-duration:1.8s;animation-delay:-.6s;fill:#ff9aa8}',
    '.s2{animation-duration:3.1s;animation-delay:-1.4s}',
    '.s3{animation-duration:2.6s;animation-delay:-2s;fill:#ffb3a0}',
    '@keyframes tw{0%,100%{opacity:1}45%,55%{opacity:.1}}',
    '.halo{animation:pulse 6s ease-in-out infinite}',
    '@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}',
    '.cl{fill:#1a0509;opacity:.92}',
    '.c1{animation:drift 110s linear -40s infinite}.c2{animation:drift 150s linear -95s infinite}.c3{animation:drift 180s linear -20s infinite;opacity:.7}',
    '@keyframes drift{from{transform:translate(-60px,var(--y,0))}to{transform:translate(360px,var(--y,0))}}',
    '.c1{--y:44px}.c2{--y:64px}.c3{--y:28px}',
    '.bat{animation:fly 26s linear infinite}.b2{animation-delay:-9s;animation-duration:31s}.b3{animation-delay:-19s;animation-duration:23s}',
    '@keyframes fly{0%{transform:translate(-20px,70px)}25%{transform:translate(90px,52px)}50%{transform:translate(200px,62px)}75%{transform:translate(270px,40px)}100%{transform:translate(340px,58px)}}',
    '.b2{animation-name:fly2}@keyframes fly2{0%{transform:translate(-20px,40px)}30%{transform:translate(120px,30px)}60%{transform:translate(230px,48px)}100%{transform:translate(340px,36px)}}',
    '.b4{animation:fly3 21s linear -5s infinite}@keyframes fly3{0%{transform:translate(340px,96px)}35%{transform:translate(220px,78px)}70%{transform:translate(110px,92px)}100%{transform:translate(-20px,70px)}}',
    '.b5{animation:fly3 34s linear -22s infinite}',
    // Três morcegos rodando em volta da lua
    '.o1,.o2,.o3{animation:orb 10s linear infinite}.o2{animation-delay:-3.3s}.o3{animation-delay:-6.6s}',
    '@keyframes orb{0%{transform:translate(274px,50px)}12.5%{transform:translate(262px,64px)}25%{transform:translate(229px,70px)}37.5%{transform:translate(196px,64px)}50%{transform:translate(184px,50px)}62.5%{transform:translate(196px,36px)}75%{transform:translate(229px,30px)}87.5%{transform:translate(262px,36px)}100%{transform:translate(274px,50px)}}',
    // Bando que sai da torre de vez em quando
    '.t1,.t2,.t3,.t4{opacity:0;animation:out 22s linear infinite}.t2{animation-delay:-.3s}.t3{animation-delay:-.6s}.t4{animation-delay:-.9s}',
    '@keyframes out{0%,55%{opacity:0;transform:translate(34px,96px)}57%{opacity:1;transform:translate(36px,92px)}75%{transform:translate(110px,60px)}99%{opacity:1;transform:translate(200px,16px)}100%{opacity:0;transform:translate(205px,14px)}}',
    '.vo{animation:vo 5s steps(1) infinite}.vf{opacity:0;animation:vf 5s steps(1) infinite}@keyframes vo{0%,62%{opacity:1}63%,77%{opacity:0}78%,100%{opacity:1}}@keyframes vf{0%,62%{opacity:0}63%,77%{opacity:1}78%,100%{opacity:0}}',
    '.aura{animation:pulse 4s ease-in-out infinite}.eyes{animation:blink 6s steps(1) infinite}@keyframes blink{0%,94%{opacity:1}95%,97%{opacity:0}98%,100%{opacity:1}}',
    '.door{opacity:.25;animation:door 5s ease-in-out infinite}@keyframes door{0%,100%{opacity:.18}50%{opacity:.4}}',
    // Relâmpago a cada ~41 s: dois clarões rápidos
    '.flash{opacity:0;animation:flash 41s linear -30s infinite}.bolt{opacity:0;animation:bolt 41s steps(1) -30s infinite}',
    '@keyframes flash{0%,96%{opacity:0}96.3%{opacity:.2}96.7%{opacity:.03}97.1%{opacity:.15}97.8%,100%{opacity:0}}',
    '@keyframes bolt{0%,96%{opacity:0}96.1%{opacity:1}96.6%{opacity:0}97%{opacity:1}97.5%,100%{opacity:0}}',
    '.wu{animation:flap .35s steps(1) infinite}.wd{animation:flap .35s steps(1) -.175s infinite}',
    '@keyframes flap{0%{opacity:1}50%{opacity:0}}',
    '.win{animation:flick 3s steps(1) infinite}.w2{animation-delay:-1.1s;animation-duration:4.2s}.w3{animation-delay:-2.3s;animation-duration:2.6s}',
    '@keyframes flick{0%,100%{opacity:1}46%{opacity:.35}50%{opacity:1}78%{opacity:.6}80%{opacity:1}}',
    '.shoot{opacity:0;animation:shoot 13s linear infinite}',
    '@keyframes shoot{0%,90%{opacity:0;transform:none}91%{opacity:1}100%{opacity:0;transform:translate(-80px,36px)}}',
    '.fog{opacity:.07;animation:fog 60s linear infinite}@keyframes fog{from{transform:translateX(0)}to{transform:translateX(-320px)}}',
    '.em{opacity:0;animation:rise 8s linear infinite}',
    '@keyframes rise{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}60%{opacity:.8;transform:translate(4px,-55px)}100%{opacity:0;transform:translate(-3px,-95px)}}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}',
  ].join('');

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMid slice' shape-rendering='crispEdges'><style>${style}</style>${parts.join('')}</svg>`;
};

// ---------- Mini-cena do rodapé da barra lateral (64x30) ----------
// Com a barra de ~260px, cada pixel vira ~4px na tela
const mini = () => {
  const p = [];
  p.push(`<path fill='#0b0205' d='M0 30V25h6v-1h22v1h20v-1h16v6z'/>`);
  const st = (x, h) => `M${x + 1} ${26 - h}h3v1h1v${h - 1}h-5v-${h - 1}h1z`;
  const cr = (x, h) => `M${x + 2} ${26 - h}h1v2h2v1h-2v${h - 3}h-1v-${h - 3}h-2v-1h2z`;
  p.push(`<path fill='#2a0a10' d='${st(3, 6)}${cr(13, 8)}${st(24, 5)}${cr(36, 7)}${st(47, 6)}${cr(56, 9)}'/>`);
  p.push(`<path fill='#8a1e30' d='M8 21h1v5h-1zM15 18h1v1h-1zM29 22h1v4h-1zM52 21h1v5h-1zM58 17h1v1h-1z'/>`);
  p.push(`<defs><pattern id='q' y='21' width='3' height='5' patternUnits='userSpaceOnUse'><rect width='1' height='5' fill='#030001'/></pattern></defs><rect y='21' width='64' height='5' fill='url(#q)'/><rect y='23' width='64' height='1' fill='#030001'/>`);
  const bat = (c) => `<g class='m ${c}' fill='#120307'><rect width='2' height='1'/><rect x='1' y='1' width='5' height='1'/><rect x='5' width='2' height='1'/></g>`;
  p.push(bat('m1') + bat('m2') + bat('m3'));
  p.push(`<rect x='26' y='18' width='1' height='2' fill='#ff7a3d' class='c'/>`);
  const style = [
    '.m{animation:mf 24s linear infinite}.m2{animation-delay:-9s;animation-duration:31s}.m3{animation-delay:-17s;animation-duration:20s}',
    '@keyframes mf{0%{transform:translate(-8px,9px)}50%{transform:translate(30px,3px)}100%{transform:translate(72px,10px)}}',
    '.c{animation:cf 2.6s steps(1) infinite}@keyframes cf{0%,100%{opacity:1}40%{opacity:.4}45%{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}',
  ].join('');
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 30' shape-rendering='crispEdges'><style>${style}</style>${p.join('')}</svg>`;
};

// ---------- Junta tudo ----------
const sceneSvg = scene();
const base = readFileSync(join(ROOT, 'src', 'base.css'), 'utf8');
if (!base.includes('__SCENE__') || !base.includes('__MINI__')) throw new Error('base.css precisa de __SCENE__ e __MINI__');
const css = base.replace('__SCENE__', () => encode(sceneSvg)).replace('__MINI__', () => encode(mini()));
if (css.length > LIMIT) throw new Error(`CSS com ${css.length} caracteres passa do limite de ${LIMIT}`);

const { canvas, accent, colors } = JSON.parse(readFileSync(join(ROOT, 'src', 'colors.json'), 'utf8'));
const theme = { version: 1, id: 'blood-moon', name: 'Blood Moon', appearance: 'dark', canvas, accent, colors, css };
writeFileSync(join(ROOT, 'blood-moon.json'), JSON.stringify(theme, null, 2) + '\n');
writeFileSync(join(ROOT, 'scene.svg'), sceneSvg);
console.log(`blood-moon.json: ${css.length} de ${LIMIT} caracteres de CSS`);

// Atualiza um tema já instalado, mantendo o nome e o id dele
const installed = process.argv[2];
if (installed) {
  const t = JSON.parse(readFileSync(installed, 'utf8'));
  Object.assign(t, { canvas, accent, colors, css });
  writeFileSync(installed, JSON.stringify(t, null, 2));
  console.log('tema instalado atualizado:', installed);
}
