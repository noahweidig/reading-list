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

// --- styles ---
const css = `
:root{--bg:#faf9f7;--fg:#1c1b1a;--muted:#8a8681;--line:#e8e5e0;--card:#fff;--accent:#9a6b3f;--shadow:0 1px 2px rgba(28,27,26,.04),0 8px 24px rgba(28,27,26,.06)}
@media(prefers-color-scheme:dark){:root{--bg:#161514;--fg:#eceae6;--muted:#8f8a83;--line:#2b2926;--card:#1e1d1b;--accent:#c99a68;--shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.35)}}
*{margin:0;box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font:16px/1.7 "Georgia",serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:880px;margin:0 auto;padding:4rem 1.5rem 6rem}
a{color:inherit;text-decoration:none}
.eyebrow{font-family:system-ui,sans-serif;font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}
h1.site{font-size:2.6rem;font-weight:400;letter-spacing:-.02em;margin:.4rem 0 .6rem}
.tagline{color:var(--muted);font-style:italic;margin-bottom:4rem}
.section{margin-top:3.5rem}
.section h2{font-family:system-ui,sans-serif;font-size:.78rem;letter-spacing:.2em;text-transform:uppercase;font-weight:600;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:.7rem;margin-bottom:1.6rem;display:flex;justify-content:space-between}
.section h2 .n{font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.1rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:1.5rem 1.4rem;display:flex;flex-direction:column;gap:.35rem;transition:transform .18s,box-shadow .18s}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.card .t{font-size:1.22rem;line-height:1.3;letter-spacing:-.01em}
.card .st{color:var(--muted);font-style:italic;font-size:.92rem;line-height:1.4}
.card .a{font-family:system-ui,sans-serif;font-size:.8rem;color:var(--muted);margin-top:.5rem}
.badges{display:flex;gap:.45rem;margin-top:.9rem;font-family:system-ui,sans-serif;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase}
.badge{border:1px solid var(--line);border-radius:99px;padding:.18rem .6rem;color:var(--muted)}
.badge.reading{color:var(--accent);border-color:var(--accent)}
.back{font-family:system-ui,sans-serif;font-size:.8rem;letter-spacing:.06em;color:var(--muted);display:inline-block;margin-bottom:3rem}
.back:hover{color:var(--fg)}
.book h1{font-size:2.4rem;font-weight:400;letter-spacing:-.02em;line-height:1.15;margin:.5rem 0 .2rem}
.book .sub{font-size:1.25rem;font-style:italic;color:var(--muted);margin-bottom:1rem}
.meta{font-family:system-ui,sans-serif;font-size:.85rem;color:var(--muted);display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:1rem 0;margin:1.6rem 0 2.5rem}
.meta b{color:var(--fg);font-weight:600}
.thoughts h2,.thoughts h3{font-weight:500;letter-spacing:-.01em;margin:2rem 0 .8rem}
.thoughts p{margin-bottom:1.1rem}
.thoughts blockquote{border-left:2px solid var(--accent);padding-left:1.2rem;color:var(--muted);font-style:italic;margin:1.4rem 0}
.thoughts ul{padding-left:1.3rem;margin-bottom:1.1rem}
.empty{color:var(--muted);font-style:italic}
footer{margin-top:5rem;padding-top:1.5rem;border-top:1px solid var(--line);font-family:system-ui,sans-serif;font-size:.75rem;color:var(--muted)}
`;

const page = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${css}</style></head>
<body><div class="wrap">${body}<footer>Built from markdown · one file per book</footer></div></body></html>`;

const badge = b => `<div class="badges">
<span class="badge ${b.status}">${b.status === 'reading' ? '● Reading' : 'Read'}</span>
<span class="badge">${b.meta.format === 'audiobook' ? '🎧 Audiobook' : '📖 Physical'}</span></div>`;

function card(b) {
  return `<a class="card" href="${b.slug}.html">
<div class="t">${esc(b.meta.title)}</div>
${b.meta.subtitle ? `<div class="st">${esc(b.meta.subtitle)}</div>` : ''}
<div class="a">${esc(b.meta.author || '')}${b.meta.narrator ? ` · read by ${esc(b.meta.narrator)}` : ''}</div>
${badge(b)}</a>`;
}

function bookPage(b) {
  const m = b.meta;
  const rows = [
    ['Author', m.author],
    ['Format', m.format === 'audiobook' ? 'Audiobook' : 'Physical book'],
    ['Narrator', m.narrator],
    ['Status', b.status === 'reading' ? 'Currently reading' : 'Read'],
  ].filter(r => r[1]).map(([k, v]) => `<span>${k} <b>${esc(v)}</b></span>`).join('');
  const thoughts = b.body.trim()
    ? `<div class="thoughts">${md(b.body)}</div>`
    : `<p class="empty">No thoughts written yet.</p>`;
  return page(`${m.title} · Shelf`, `<a class="back" href="index.html">← All books</a>
<div class="book"><span class="eyebrow">${b.status === 'reading' ? 'Currently reading' : 'Finished'}</span>
<h1>${esc(m.title)}</h1>
${m.subtitle ? `<div class="sub">${esc(m.subtitle)}</div>` : ''}
<div class="meta">${rows}</div>
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

const section = (label, list) => list.length ? `<div class="section">
<h2><span>${label}</span><span class="n">${list.length}</span></h2>
<div class="grid">${list.map(card).join('\n')}</div></div>` : '';

const reading = books.filter(b => b.status === 'reading');
const read = books.filter(b => b.status !== 'reading');

fs.writeFileSync(path.join(OUT, 'index.html'), page('Shelf · Reading Journal',
  `<span class="eyebrow">A reading journal</span><h1 class="site">Shelf</h1>
<p class="tagline">Books I'm reading, books I've finished, and what I thought of them.</p>
${section('Currently Reading', reading)}${section('Read', read)}`));

for (const b of books) fs.writeFileSync(path.join(OUT, `${b.slug}.html`), bookPage(b));
console.log(`Built ${books.length} books -> dist/`);
