#!/usr/bin/env node
// Zero-dependency static site generator: books/*.md -> dist/
const fs = require('fs'), path = require('path');

const SRC = path.join(__dirname, 'books'), OUT = path.join(__dirname, 'dist');

// --- tiny frontmatter + markdown ---
function parse(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  if (m) for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m ? m[2] : raw };
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function md(src) {
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  const out = [];
  let list = false, para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const endList = () => { if (list) { out.push('</ul>'); list = false; } };
  for (const line of src.split('\n')) {
    const t = line.trim();
    if (!t) { flush(); endList(); continue; }
    let h;
    if ((h = t.match(/^(#{1,4})\s+(.*)/))) { flush(); endList(); out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); }
    else if (t.startsWith('> ')) { flush(); endList(); out.push(`<blockquote><p>${inline(t.slice(2))}</p></blockquote>`); }
    else if (t.startsWith('- ')) { flush(); if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(t.slice(2))}</li>`); }
    else para.push(t);
  }
  flush(); endList();
  return out.join('\n');
}

// --- inline SVG icons (stroke follows currentColor) ---
const svg = (paths, extra = '') => `<svg class="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`;
const icons = {
  headphones: svg('<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M3 14a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3z"/><path d="M21 14a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3z"/>'),
  book: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  bookmark: svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
  check: svg('<path d="M20 6L9 17l-5-5"/>'),
  arrowLeft: svg('<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>'),
  mic: svg('<path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v4"/>'),
  menu: svg('<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>', ' width="18" height="18"'),
  user: svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  starPath: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/>',
  sun: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
};

// --- styles ---
const css = `
:root{color-scheme:light;
  --bg:#f6f5f2;--bg2:#efede8;--fg:#191817;--fg2:#3c3a36;--muted:#5b574f;
  --line:#dcd8d0;--line2:#cbc6bc;--card:#ffffff;
  --accent:#a05a1c;--accent-fg:#8a4b12;--accent-soft:rgba(160,90,28,.1);
  --green:#1a7f4b;--green-soft:rgba(26,127,75,.1);
  --glass:rgba(255,255,255,.6);
  --shadow:0 1px 2px rgba(25,24,23,.06),0 10px 30px rgba(25,24,23,.08);
  --shadow-lg:0 2px 4px rgba(25,24,23,.08),0 16px 44px rgba(25,24,23,.14)}
[data-theme=dark]{color-scheme:dark;
  --bg:#121110;--bg2:#181614;--fg:#f3f1ed;--fg2:#d7d3cc;--muted:#a9a49b;
  --line:#2e2b27;--line2:#413d37;--card:#1c1a18;
  --accent:#e0a35f;--accent-fg:#e8b478;--accent-soft:rgba(224,163,95,.12);
  --green:#4cc98a;--green-soft:rgba(76,201,138,.12);
  --glass:rgba(28,26,24,.55);
  --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.45);
  --shadow-lg:0 2px 4px rgba(0,0,0,.5),0 16px 44px rgba(0,0,0,.55)}
*{margin:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--fg);
  font:16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  transition:background .25s ease,color .25s ease}
.wrap{max-width:900px;margin:0 auto;padding:2.2rem 1.5rem 5rem}
a{color:inherit;text-decoration:none}
.ic{flex:none;vertical-align:-2px}

/* glass nav bar */
.top{position:sticky;top:.8rem;z-index:20;display:flex;align-items:center;gap:.6rem;margin-bottom:3.2rem;
  padding:.55rem .8rem;border:1px solid var(--line);border-radius:14px;
  background:var(--glass);backdrop-filter:blur(14px) saturate(1.6);-webkit-backdrop-filter:blur(14px) saturate(1.6);
  box-shadow:var(--shadow)}
.brand{display:inline-flex;align-items:center;gap:.55rem;font-weight:700;letter-spacing:-.01em;color:var(--fg)}
.brand .ic{color:var(--accent);width:18px;height:18px}
.menu{display:flex;align-items:center;gap:.15rem;margin-left:auto}
.menu a{font-size:.86rem;font-weight:600;color:var(--fg2);padding:.35rem .75rem;border-radius:9px;
  transition:color .15s,background .15s}
.menu a:hover{color:var(--accent-fg);background:var(--accent-soft)}
.toggle,.burger{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;flex:none;
  border:1px solid var(--line2);border-radius:10px;background:var(--card);color:var(--fg2);
  cursor:pointer;transition:border-color .15s,color .15s,transform .15s,box-shadow .15s}
.toggle:hover,.burger:hover{color:var(--accent-fg);border-color:var(--accent);transform:translateY(-1px);box-shadow:var(--shadow)}
.toggle svg,.burger svg{display:block}
.burger{display:none}
[data-theme=dark] .toggle .sun{display:none}
:root:not([data-theme=dark]) .toggle .moon{display:none}
@media(max-width:640px){
  .menu{display:none;position:absolute;top:calc(100% + .5rem);left:0;right:0;flex-direction:column;
    align-items:stretch;gap:.15rem;padding:.5rem;border:1px solid var(--line);border-radius:14px;
    background:var(--glass);backdrop-filter:blur(14px) saturate(1.6);-webkit-backdrop-filter:blur(14px) saturate(1.6);
    box-shadow:var(--shadow-lg)}
  .top.open .menu{display:flex}
  .toggle{margin-left:auto}
  .burger{display:inline-flex}
}

/* index header */
.eyebrow{display:inline-flex;align-items:center;gap:.5rem;font-size:.74rem;font-weight:700;
  letter-spacing:.18em;text-transform:uppercase;color:var(--accent-fg)}
.eyebrow::before{content:"";width:22px;height:2px;background:var(--accent);border-radius:2px}
h1.site{font-size:clamp(2.4rem,6vw,3.4rem);font-weight:800;letter-spacing:-.035em;line-height:1.05;margin:.7rem 0 .8rem}
.tagline{color:var(--fg2);font-size:1.08rem;max-width:34rem;margin-bottom:1.6rem}
.stats{display:flex;flex-wrap:wrap;gap:.6rem;margin-bottom:3.6rem}
.stat{display:inline-flex;align-items:center;gap:.5rem;font-size:.82rem;font-weight:600;color:var(--fg2);
  background:var(--card);border:1px solid var(--line);border-radius:99px;padding:.38rem .85rem}
.stat .ic{color:var(--accent-fg)}
.stat b{color:var(--fg);font-weight:800}

/* sections + cards */
.section,#read{scroll-margin-top:5.2rem}
.section{margin-top:3rem}
.section h2{display:flex;align-items:baseline;gap:.7rem;font-size:1.05rem;font-weight:800;
  letter-spacing:-.01em;padding-bottom:.75rem;border-bottom:2px solid var(--line);margin-bottom:1.4rem}
.section h2 .n{font-size:.78rem;font-weight:700;color:var(--accent-fg);background:var(--accent-soft);
  border-radius:99px;padding:.1rem .6rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1rem}
.card{position:relative;background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:1.4rem 1.35rem 1.25rem;display:flex;flex-direction:column;gap:.3rem;overflow:hidden;
  transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.card::after{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--accent);
  transform:scaleY(0);transform-origin:top;transition:transform .2s ease}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg);border-color:var(--line2)}
.card:hover::after{transform:scaleY(1)}
.card .t{font-size:1.14rem;font-weight:700;letter-spacing:-.015em;line-height:1.3}
.card .st{color:var(--fg2);font-size:.9rem;line-height:1.45}
.card .a{display:inline-flex;align-items:center;gap:.45rem;font-size:.84rem;font-weight:600;color:var(--muted);margin-top:.55rem}
.card .a .ic{width:13px;height:13px}
.badges{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.95rem}
.badge{display:inline-flex;align-items:center;gap:.4rem;font-size:.7rem;font-weight:700;
  letter-spacing:.07em;text-transform:uppercase;border:1px solid var(--line2);border-radius:99px;
  padding:.24rem .65rem;color:var(--fg2)}
.badge .ic{width:12px;height:12px}
.badge.reading{color:var(--green);border-color:transparent;background:var(--green-soft)}
.badge.reading .dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:pulse 2s ease-in-out infinite}
.badge.done{color:var(--accent-fg);border-color:transparent;background:var(--accent-soft)}
.badge.want{color:var(--muted)}
.stars{display:flex;gap:.15rem;margin-top:.6rem;color:var(--accent)}
.stars .off{color:var(--line2)}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.8)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

/* book page */
.back{display:inline-flex;align-items:center;gap:.5rem;font-size:.85rem;font-weight:600;color:var(--muted);
  margin-bottom:2.6rem;transition:color .15s,gap .15s}
.back:hover{color:var(--accent-fg)}
.book h1{font-size:clamp(1.9rem,5vw,2.7rem);font-weight:800;letter-spacing:-.03em;line-height:1.12;margin:.7rem 0 .3rem}
.book .sub{font-size:1.15rem;color:var(--fg2);margin-bottom:1.2rem}
.meta{display:flex;flex-wrap:wrap;gap:.7rem;margin:1.8rem 0 2.6rem}
.meta .chip{display:inline-flex;align-items:center;gap:.55rem;background:var(--card);
  border:1px solid var(--line);border-radius:12px;padding:.6rem .95rem;font-size:.84rem;color:var(--muted)}
.meta .chip .ic{color:var(--accent-fg)}
.meta b{color:var(--fg);font-weight:700}
.thoughts{background:var(--card);border:1px solid var(--line);border-radius:16px;
  padding:2rem 2.1rem;box-shadow:var(--shadow)}
.thoughts h2,.thoughts h3{font-weight:750;letter-spacing:-.015em;margin:1.8rem 0 .7rem}
.thoughts h2:first-child,.thoughts h3:first-child,.thoughts p:first-child{margin-top:0}
.thoughts p{margin-bottom:1.05rem;color:var(--fg2)}
.thoughts p:last-child{margin-bottom:0}
.thoughts strong{color:var(--fg)}
.thoughts a{color:var(--accent-fg);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.thoughts blockquote{border-left:3px solid var(--accent);background:var(--accent-soft);
  border-radius:0 10px 10px 0;padding:.9rem 1.2rem;margin:1.3rem 0}
.thoughts blockquote p{color:var(--fg);margin:0}
.thoughts ul{padding-left:1.3rem;margin-bottom:1.05rem;color:var(--fg2)}
.thoughts li{margin-bottom:.35rem}
.thoughts code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em;
  background:var(--bg2);border:1px solid var(--line);border-radius:5px;padding:.1em .35em}
.empty{color:var(--muted);background:var(--card);border:1px dashed var(--line2);
  border-radius:16px;padding:2rem;text-align:center}
footer{margin-top:4.5rem;padding-top:1.4rem;border-top:1px solid var(--line);
  font-size:.8rem;font-weight:500;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem}
`;

// Set theme before first paint (localStorage wins, else OS preference) to avoid a flash.
const themeScript = `<script>(function(){var t=null;try{t=localStorage.getItem('theme')}catch(e){}
if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
document.documentElement.setAttribute('data-theme',t)})();</script>`;
const toggleScript = `<script>document.querySelector('.toggle').addEventListener('click',function(){
var r=document.documentElement,t=r.getAttribute('data-theme')==='dark'?'light':'dark';
r.setAttribute('data-theme',t);try{localStorage.setItem('theme',t)}catch(e){}});
(function(){var n=document.querySelector('.top');
document.querySelector('.burger').addEventListener('click',function(){n.classList.toggle('open')});
n.querySelectorAll('.menu a').forEach(function(a){a.addEventListener('click',function(){n.classList.remove('open')})});})();</script>`;

const topbar = () => `<div class="top">
<a class="brand" href="index.html">${icons.book}<span>Shelf</span></a>
<nav class="menu" aria-label="Sections">
<a href="index.html#reading">Reading</a>
<a href="index.html#read">Read</a>
<a href="index.html#want">Want to Read</a></nav>
<button class="toggle" type="button" aria-label="Toggle light or dark theme" title="Toggle theme">
<span class="sun">${icons.sun}</span><span class="moon">${icons.moon}</span></button>
<button class="burger" type="button" aria-label="Toggle menu" title="Menu">${icons.menu}</button></div>`;

const page = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="icon" href="favicon.svg" type="image/svg+xml">${themeScript}<style>${css}</style></head>
<body><div class="wrap">${topbar()}${body}
<footer><span>Built from markdown, one file per book</span><span>Shelf</span></footer></div>
${toggleScript}</body></html>`;

const badge = b => `<div class="badges">
${b.status === 'reading'
    ? `<span class="badge reading"><span class="dot"></span>Reading</span>`
    : b.status === 'want-to-read'
      ? `<span class="badge want">${icons.bookmark}Want to read</span>`
      : `<span class="badge done">${icons.check}Read</span>`}
<span class="badge">${b.meta.format === 'audiobook' ? `${icons.headphones}Audiobook` : `${icons.book}Physical`}</span></div>`;

const star = on => `<svg class="ic${on ? '' : ' off'}" viewBox="0 0 24 24" width="14" height="14" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">${icons.starPath}</svg>`;
// Star rating (stars: 1-5 in frontmatter) — shown only on finished books.
const stars = b => {
  const n = Math.min(5, Math.round(+b.meta.stars));
  if (b.status !== 'read' || !(n > 0)) return '';
  return `<div class="stars" role="img" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map(i => star(i <= n)).join('')}</div>`;
};

function card(b) {
  return `<a class="card" href="${b.slug}.html">
<div class="t">${esc(b.meta.title)}</div>
${b.meta.subtitle ? `<div class="st">${esc(b.meta.subtitle)}</div>` : ''}
<div class="a">${icons.user}${esc(b.meta.author || '')}${b.meta.narrator ? ` · read by ${esc(b.meta.narrator)}` : ''}</div>
${stars(b)}${badge(b)}</a>`;
}

function bookPage(b) {
  const m = b.meta;
  const chips = [
    [icons.user, 'Author', m.author],
    [m.format === 'audiobook' ? icons.headphones : icons.book, 'Format', m.format === 'audiobook' ? 'Audiobook' : 'Physical book'],
    [icons.mic, 'Narrated by', m.narrator],
    [b.status === 'read' ? icons.check : icons.bookmark, 'Status',
      b.status === 'reading' ? 'Currently reading'
        : b.status === 'want-to-read' ? 'Want to read'
          : (m.date ? `Read in ${m.date}` : 'Read')],
  ].filter(r => r[2]).map(([ic, k, v]) => `<span class="chip">${ic}<span>${k} <b>${esc(v)}</b></span></span>`).join('');
  const thoughts = b.body.trim()
    ? `<div class="thoughts">${md(b.body)}</div>`
    : `<p class="empty">No thoughts written yet.</p>`;
  return page(`${m.title} · Shelf`, `<a class="back" href="index.html">${icons.arrowLeft}All books</a>
<div class="book"><span class="eyebrow">${b.status === 'reading' ? 'Currently reading' : b.status === 'want-to-read' ? 'Want to read' : 'Finished'}</span>
<h1>${esc(m.title)}</h1>
${m.subtitle ? `<div class="sub">${esc(m.subtitle)}</div>` : ''}
<div class="meta">${chips}</div>
${thoughts}</div>`);
}

// --- build ---
const books = fs.readdirSync(SRC).filter(f => f.endsWith('.md')).map(f => {
  const { meta, body } = parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
  const status = (meta.status || 'read').toLowerCase();
  return { slug: f.replace(/\.md$/, ''), meta, body, status };
}).sort((a, b) => a.meta.title.localeCompare(b.meta.title));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'favicon.svg'), path.join(OUT, 'favicon.svg'));

const section = (label, list, id) => list.length ? `<div class="section"${id ? ` id="${id}"` : ''}>
<h2><span>${label}</span><span class="n">${list.length}</span></h2>
<div class="grid">${list.map(card).join('\n')}</div></div>` : '';

const reading = books.filter(b => b.status === 'reading');
const want = books.filter(b => b.status === 'want-to-read');
const read = books.filter(b => b.status !== 'reading' && b.status !== 'want-to-read');

// Group finished books by year read (date: 2026 — or comma-separated for re-reads: 2026, 2023).
const byYear = new Map();
for (const b of read) {
  const years = (b.meta.date || '').split(',').map(s => s.trim()).filter(Boolean);
  for (const y of years.length ? years : ['Earlier']) {
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(b);
  }
}
const yearSections = [...byYear.keys()]
  .sort((a, b) => a === 'Earlier' ? 1 : b === 'Earlier' ? -1 : Number(b) - Number(a))
  .map(y => section(y === 'Earlier' ? 'Read' : `Read in ${y}`, byYear.get(y)))
  .join('');

fs.writeFileSync(path.join(OUT, 'index.html'), page('Shelf · Reading Journal',
  `<span class="eyebrow">A reading journal</span><h1 class="site">Shelf</h1>
<p class="tagline">Books I&rsquo;m reading, books I&rsquo;ve finished, and what I thought of them.</p>
<div class="stats">
<span class="stat">${icons.bookmark}<b>${reading.length}</b> in progress</span>
<span class="stat">${icons.check}<b>${read.length}</b> finished</span>
<span class="stat">${icons.headphones}<b>${books.filter(b => b.status !== 'want-to-read' && b.meta.format === 'audiobook').length}</b> audiobooks</span>
<span class="stat">${icons.book}<b>${want.length}</b> want to read</span>
</div>
${section('Currently Reading', reading, 'reading')}<div id="read">${yearSections}</div>${section('Want to Read', want, 'want')}`));

for (const b of books) fs.writeFileSync(path.join(OUT, `${b.slug}.html`), bookPage(b));
console.log(`Built ${books.length} books -> dist/`);
