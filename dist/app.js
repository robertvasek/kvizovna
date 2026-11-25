'use strict';

const icons = {
  mark: '<path d="M4 7h7M4 13l5 5L20 6"/>',
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-6h6v6"/>',
  book: '<path d="M12 7v14M3 4h4a5 5 0 0 1 5 4 5 5 0 0 1 5-4h4v14h-4a5 5 0 0 0-5 3 5 5 0 0 0-5-3H3z"/>',
  chart: '<path d="M3 3v18h18M8 16v-3m5 3V8m5 8V5"/>',
  plane: '<path d="M17 21v-8l4 2V12l-4-3V5a2 2 0 1 0-4 0v4l-8 3v3l8-2v8l-2 1h8z" transform="translate(-1 -1)"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  moon: '<path d="M20.9 13.35A9 9 0 1 1 10.65 3.1a7 7 0 0 0 10.25 10.25Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  next: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  outward: '<path d="M7 17 17 7M7 7h10v10"/>',
  file: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6m-6 4h6m-6 4h4"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  upload: '<path d="M4 16v4h16v-4M12 16V4m-5 5 5-5 5 5"/>',
};
function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
}
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const STORAGE = 'kvizovna-v1';
const source = 'https://ctu.gov.cz/sites/default/files/obsah/2025_09_OFL_otazky.pdf';
const topics = {A:'Radiokomunikační předpisy', B:'Radiokomunikační provoz', C:'Elektrotechnika a radiotechnika'};
const ofl = {
  id:'ofl', title:'OFL · Radiotelefonista', questions: window.OFL_ROWS.map(([id, text, correct, ...wrong]) => ({
    id, text, topic:topics[id[0]], options:[correct, ...wrong], correct:[0],
  })),
};
const defaults = {sets:[], active:'ofl', stats:{}, history:[], session:null, theme:'light'};
let data;
let storageAvailable = true;
try {
  data = {...defaults, ...JSON.parse(localStorage.getItem(STORAGE) || '{}')};
} catch {
  data = {...defaults};
}
let page = 'home';
let menuOpen = false;
let bankFilter = {term:'', topic:''};
let draft = {title:'', text:''};
let resultId = null;
let activeDialog = null;
const demo = [
  'Která planeta je nejblíže Slunci? | Merkur | Venuše | Mars',
  '',
  'Které hodnoty jsou prvočísla?',
  '+ 2',
  '- 4',
  '+ 7',
  '- 9',
  '',
  'Jaká je značka pro kyslík? | O',
].join('\n');

function save() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(data));
  } catch {
    storageAvailable = false;
  }
}

function currentSet() {
  return findSet(data.active) || ofl;
}
function findSet(id) {
  return id === ofl.id ? ofl : data.sets.find(set => set.id === id);
}
function statsFor(set) {
  return data.stats[set.id] || {};
}
function mistakes(set) {
  const stats = statsFor(set);
  return set.questions.filter(q => stats[q.id]?.last === false);
}
function groups(set) {
  const byTopic = new Map();
  set.questions.forEach(q => byTopic.set(q.topic, (byTopic.get(q.topic) || 0) + 1));
  return [...byTopic];
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
}
function percent(n, total) {
  return total ? Math.round(100 * n / total) : 0;
}
function countText(n) {
  return n + ' ' + (n === 1 ? 'otázka' : n >= 2 && n <= 4 ? 'otázky' : 'otázek');
}
function makeButton(label, action, {name, style = '', value, disabled = false, id} = {}) {
  return '<button type="button" class="button ' + style + '" data-action="' + action + '"' +
    (value === undefined ? '' : ' data-value="' + escapeHtml(value) + '"') +
    (id ? ' id="' + id + '"' : '') + (disabled ? ' disabled' : '') + '>' +
    (name ? icon(name) : '') + '<span>' + label + '</span></button>';
}
function section(title, link = '') {
  return '<div class="section-header"><h2>' + title + '</h2>' + link + '</div>';
}
function nav(label, name, action, value, active, count) {
  const attrs = (value ? ' data-value="' + escapeHtml(value) + '"' : '') + (active ? ' aria-current="page"' : '');
  const mark = action === 'set' ? '<span class="set-icon">' + icon(name) + '</span>' : icon(name);
  return '<button class="nav-button" data-action="' + action + '"' + attrs + '>' + mark +
    '<span>' + escapeHtml(label) + '</span>' + (count ? '<span class="nav-count">' + count + '</span>' : '') + '</button>';
}

function render() {
  const set = currentSet();
  const dark = data.theme === 'dark';
  document.documentElement.dataset.theme = data.theme;
  const captions = {home:'Přehled',bank:'Otázky',history:'Historie',import:'Nová sada',quiz:'Procvičování',result:'Výsledek'};
  if (page === 'quiz' && data.session?.mode === 'test') captions.quiz = 'Test';
  const content = {home, bank, history, import:importPage, quiz, result}[page](set);
  app.innerHTML = '<div class="shell' + (menuOpen ? ' menu-open' : '') + '">' +
    '<button class="mobile-shade" aria-label="Zavřít nabídku" data-action="menu"></button>' +
    '<aside class="sidebar" id="sidebar"><nav aria-label="Hlavní navigace">' +
    '<a href="#prehled" data-action="go" data-value="home" class="brand"><span class="brand-mark">' + icon('mark') + '</span>Kvízovna</a>' +
    '<div class="nav-group">' + nav('Přehled','home','go','home',page === 'home') +
    nav('Banka otázek','book','go','bank',page === 'bank') + nav('Historie','chart','go','history',page === 'history') + '</div>' +
    '<div class="nav-group"><p class="nav-label">Moje sady</p>' +
    [ofl, ...data.sets].map(item => nav(item.id === 'ofl' ? 'OFL · Letecké rádio' : item.title,
      item.id === 'ofl' ? 'plane' : 'file', 'set', item.id, item.id === set.id, item.questions.length)).join('') +
    nav('Přidat sadu','plus','go','import',page === 'import') + '</div></nav>' +
    '<div class="sidebar-bottom">' + nav(dark ? 'Světlý režim' : 'Tmavý režim',dark ? 'sun' : 'moon','theme') + '</div></aside>' +
    '<div><header class="topbar"><div class="crumbs">' +
    '<button class="icon-button menu-button" data-action="menu" aria-label="Otevřít nabídku" aria-controls="sidebar" aria-expanded="' + menuOpen + '">' + icon('menu') + '</button>' +
    '<span class="home-crumb">Kvízovna</span><span class="crumb-arrow">' + icon('chevron') + '</span><strong>' + captions[page] + '</strong></div>' +
    '<div class="top-actions">' + makeButton('Nová sada','go',{name:'plus',value:'import',style:'ghost'}) +
    '</div></header><main id="content" class="main" tabindex="-1">' + content +
    (!storageAvailable ? '<p class="form-note error" role="status">Prohlížeč nepovolil uložení. Změny platí do zavření stránky.</p>' : '') +
    '</main></div></div>';
  if (page === 'quiz') updateTimer();
}
function go(next) {
  menuOpen = false;
  page = next;
  render();
  window.scrollTo(0, 0);
  document.querySelector('#content').focus({preventScroll:true});
}
function modeCard(title, description, name, color, action) {
  return '<button class="panel mode-card" data-action="' + action + '"><span class="tint ' + color + '">' +
    icon(name) + '</span><span class="corner-arrow">' + icon('outward') + '</span><h3>' + title + '</h3><p>' + description + '</p></button>';
}
function home(set) {
  const isOfl = set.id === 'ofl';
  const learned = set.questions.filter(q => statsFor(set)[q.id]?.last === true).length;
  const toRepeat = mistakes(set).length;
  const running = data.session;
  return '<section class="hero">' + (isOfl ? '<img class="hero-image" src="letiste.jpg" alt="" fetchpriority="high">' : '') +
    '<div class="hero-copy"><span class="hero-tag">' + icon(isOfl ? 'plane' : 'book') +
    (isOfl ? 'Příprava na zkoušku OFL' : countText(set.questions.length)) + '</span><h1>' +
    (isOfl ? 'Letecká radiotelefonie' : escapeHtml(set.title)) + '</h1><p>' +
    (isOfl ? 'Procvič si otázky ČTÚ a vyzkoušej si písemnou zkoušku nanečisto.' : 'Procvič si vlastní otázky a sleduj svůj pokrok.') +
    '</p><div class="button-row">' + makeButton('Spustit test','setup-test',{name:'file',style:'primary'}) +
    makeButton('Procvičovat','setup-drill',{name:'bolt'}) + '</div></div></section>' +
    (running ? '<div class="panel resume"><div><strong>Rozpracovaná sada</strong><p>' + escapeHtml(findSet(running.setId)?.title) + ' · ' +
    (running.mode === 'test' ? 'Test' : 'Dril') + ' · otázka ' + (running.index + 1) + ' z ' + running.items.length + '</p></div>' +
    makeButton('Pokračovat','resume',{name:'next'}) + '</div>' : '') +
    '<div class="mode-heading">' + section('Jak chceš trénovat?') + '</div><div class="mode-grid">' +
    modeCard('Test nanečisto',isOfl ? 'Simulace na 60 minut nebo kratší test.' : 'Namíchej si otázky. Výsledek uvidíš po odevzdání.','file','green','setup-test') +
    modeCard('Dril otázek','Zpětná vazba hned po každé odpovědi.','bolt','orange','setup-drill') +
    modeCard('Opakování chyb',toRepeat ? 'K zopakování · ' + countText(toRepeat) : 'Vrať se k otázkám, ve kterých chybuješ.','repeat','blue','mistakes') + '</div>' +
    '<div class="dashboard-grid"><section class="panel dash-panel">' + section('Tematické okruhy') + '<div class="topic-list">' +
    groups(set).map(([topic, count], i) => '<button class="topic-row" data-action="topic" data-value="' + escapeHtml(topic) +
    '"><span class="topic-key">' + (isOfl ? 'ABC'[i] : icon('book')) + '</span><span>' + escapeHtml(topic) +
    '</span><small>' + countText(count) + '</small>' + icon('chevron') + '</button>').join('') + '</div></section>' +
    '<section class="panel dash-panel">' + section('Můj pokrok') + '<div class="progress-body">' +
    ring(percent(learned,set.questions.length)) + '<div class="progress-info"><strong>' + learned + ' z ' +
    set.questions.length + ' otázek zvládnuto</strong><p>' + (toRepeat ? 'K zopakování · ' + countText(toRepeat) : 'Podle posledních odpovědí') +
    '</p><button class="text-button" data-action="go" data-value="history">Zobrazit historii ' + icon('next') + '</button></div></div></section></div>' +
    (isOfl ? '<p class="source"><a href="' + source + '" target="_blank" rel="noopener">Otázky ČTÚ · verze 09/2025</a> · Chybné možnosti jsou doplněné pro trénink.</p>' : '');
}
function ring(pct) {
  return '<div class="ring" style="--pct:' + pct + '%"><span>' + pct + ' %</span></div>';
}
function pageHeader(title, detail) {
  return '<div class="page-header"><div><h1>' + title + '</h1>' + (detail ? '<p>' + detail + '</p>' : '') + '</div></div>';
}
function searchable(s) {
  return String(s).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('cs');
}
function correctText(q) {
  return q.correct.map(i => q.options[i]).join(' · ');
}
function bank(set) {
  return pageHeader('Banka otázek', escapeHtml(set.title) + ' · ' + countText(set.questions.length)) +
    '<div class="filters"><input class="search-input" id="search" type="search" aria-label="Vyhledat otázku" placeholder="Hledat podle textu nebo čísla…" value="' +
    escapeHtml(bankFilter.term) + '"><select class="search-input" id="bank-topic" aria-label="Filtrovat podle okruhu">' +
    topicOptions(set, bankFilter.topic) + '</select></div><div id="bank-list">' + bankList(set) + '</div>';
}
function bankList(set) {
  const term = searchable(bankFilter.term.trim());
  const matches = set.questions.filter(q => (!bankFilter.topic || q.topic === bankFilter.topic) &&
    searchable([q.id,q.text,q.topic,correctText(q)].join(' ')).includes(term));
  if (!matches.length) return '<div class="panel empty"><h3>Žádné výsledky</h3><p>Zkus jiný výraz nebo okruh.</p></div>';
  return '<p class="muted" aria-live="polite">' + countText(matches.length) + '</p><div class="bank-list">' +
    matches.map(q => '<details class="panel bank-item"><summary><span class="tag">' + escapeHtml(q.id) +
    '</span> ' + escapeHtml(q.text) + '</summary><p><strong>Správná odpověď</strong> · ' + escapeHtml(correctText(q)) +
    '</p></details>').join('') + '</div>';
}
function history() {
  const rows = data.history;
  return pageHeader('Historie', 'Výsledky dokončených testů a drilů v tomto prohlížeči.') +
    (rows.length ? '<div class="history-list">' + rows.map(row => {
      const date = new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeStyle:'short'}).format(row.ended);
      return '<button class="panel history-row" data-action="result" data-value="' + escapeHtml(row.id) +
      '"><span class="tint ' + (row.mode === 'test' ? 'green' : 'orange') + '">' + icon(row.mode === 'test' ? 'file' : 'bolt') +
      '</span><span class="history-text"><strong>' + escapeHtml(row.title) + '</strong><small>' + escapeHtml(row.label) + ' · ' + date +
      '</small></span><strong>' + percent(row.correct,row.total) + ' %</strong>' + icon('chevron') + '</button>';
    }).join('') + '</div>' : '<div class="panel empty"><h3>Zatím tu nejsou žádné výsledky</h3><p>Po dokončení prvního testu nebo drilu se výsledek objeví tady.</p>' +
    makeButton('Zpět na přehled','go',{name:'back',value:'home'}) + '</div>');
}

function importPage() {
  return '<div class="narrow">' + pageHeader('Nová sada otázek', 'Vlož otázky s odpověďmi nebo nahraj soubor a začni procvičovat.') +
    '<form id="import-form" class="panel form-panel"><label class="field">Název sady<input id="set-title" required maxlength="80" placeholder="Např. Zeměpis" value="' +
    escapeHtml(draft.title) + '"></label><label class="field">Otázky<textarea id="set-input" required placeholder="Otázka | správná odpověď | chybná odpověď | chybná odpověď">' +
    escapeHtml(draft.text) + '</textarea><small>První odpověď za svislítkem je správná. Pro více správných odpovědí použij zápis s + a −.</small></label>' +
    '<div class="button-row"><label class="button ghost file-label" for="file-input" tabindex="0">' + icon('upload') +
    'Nahrát TXT, CSV nebo JSON</label><input type="file" id="file-input" accept=".txt,.csv,.json,text/plain,text/csv,application/json" hidden>' +
    makeButton('Vložit ukázku','demo') + '</div><details class="format-help"><summary>Podporované formáty a příklady</summary>' +
    '<p>U krátkého zápisu použij jeden řádek pro každou otázku. Dvojice otázka a odpověď funguje jako otázka s volným textem. Pro zápis s + a − odděl otázky prázdným řádkem.</p><pre>' +
    escapeHtml(demo) + '</pre><p>CSV podporuje záhlaví <code>otázka;správná;chybná1;chybná2</code> a také anglické <code>question;correct;wrong1;wrong2</code>.</p>' +
    '<p>JSON může být pole otázek nebo objekt s názvem <code>title</code> a polem <code>questions</code>. Správné možnosti se číslují od nuly.</p>' +
    '<pre>[{"question":"Která čísla jsou sudá?","topic":"Počty","options":["2","3","4"],"correctIndices":[0,2]}]</pre></details>' +
    '<div id="import-note" hidden class="form-note" role="status"></div><div class="button-row">' +
    '<button class="button primary" type="submit">' + icon('plus') + ' Vytvořit sadu</button></div></form></div>';
}
function parseCSV(raw, delimiter) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (quoted && raw[i+1] === '"') { value += '"'; i++; }
      else if (quoted || !value.trim()) quoted = !quoted;
      else value += ch;
    } else if (ch === delimiter && !quoted) {
      row.push(value.trim()); value = '';
    } else if (ch === '\n' && !quoted) {
      if (value.trim() || row.length) rows.push([...row,value.trim()]);
      row = []; value = '';
    } else value += ch;
  }
  if (quoted) throw new Error('V souboru CSV chybí uzavírací uvozovky.');
  if (value.trim() || row.length) rows.push([...row,value.trim()]);
  return rows;
}
function parseInput(raw) {
  const text = raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  if (!text) throw new Error('Přidej alespoň jednu otázku.');
  let rows, title;
  if (/^[\[{]/.test(text)) {
    let json;
    try { json = JSON.parse(text); } catch { throw new Error('JSON se nepodařilo přečíst. Zkontroluj zápis podle ukázky.'); }
    rows = Array.isArray(json) ? json : json.questions;
    title = json.title;
    if (!Array.isArray(rows)) throw new Error('V JSON použij pole otázek nebo objekt s polem questions.');
  } else if (/^(otázka|otazka|question)[;,]/i.test(text)) {
    const delimiter = text.match(/^(?:otázka|otazka|question)([;,])/i)[1];
    rows = parseCSV(text, delimiter).slice(1).map(([question,...options]) => ({question,options:options.filter(Boolean),correctIndices:[0]}));
  } else {
    rows = text.split(/\n[ \t]*\n+/).flatMap(block => {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      if (lines.length > 1 && /^[+−-]\s+/.test(lines[1])) {
        if (lines.slice(1).some(line => !/^[+−-]\s+/.test(line))) throw new Error('Před každou možností v bloku použij + nebo −.');
        return [{question:lines[0],options:lines.slice(1).map(line => line.slice(1).trim()),
          correctIndices:lines.slice(1).flatMap((line, i) => line.startsWith('+') ? [i] : [])}];
      }
      return lines.map(line => {
        const [question,...options] = line.split('|').map(cell => cell.trim());
        return {question, options, correctIndices:[0]};
      });
    });
  }
  if (!rows.length) throw new Error('V importu chybí otázky.');
  if (rows.length > 1000) throw new Error('Jedna sada může mít nejvýše 1 000 otázek.');
  return {title, questions:rows.map((item,i) => {
    const q = item?.question ?? item?.text;
    const options = item?.options ?? (typeof item?.answer === 'string' ? [item.answer] : null);
    const correct = item?.correctIndices ?? (typeof item?.answer === 'string' && !item?.options ? [0] : null);
    const valid = value => typeof value === 'string' && value.trim() && value.length <= 3000;
    if (!valid(q) || !Array.isArray(options) || !options.length || options.length > 12 ||
      !options.every(valid) || new Set(options.map(answerToken)).size !== options.length ||
      !Array.isArray(correct) || !correct.length || new Set(correct).size !== correct.length ||
      !correct.every(index => Number.isInteger(index) && index >= 0 && index < options.length)) {
      throw new Error('Otázka ' + (i + 1) + ' potřebuje text, 1–12 různých odpovědí a označení správné odpovědi.');
    }
    return {id:String(i+1),text:q.trim(),topic:typeof item.topic === 'string' ? item.topic.trim().slice(0,100) || 'Obecné' : 'Obecné',
      options:options.map(o => o.trim()),correct};
  })};
}
function importNote(message, error = false) {
  const note = document.querySelector('#import-note');
  note.hidden = false;
  note.classList.toggle('error', error);
  note.textContent = message;
}

function topicOptions(set, selected = '') {
  return '<option value="">Všechny okruhy</option>' + groups(set).map(([topic]) => '<option value="' +
    escapeHtml(topic) + '"' + (topic === selected ? ' selected' : '') + '>' + escapeHtml(topic) + '</option>').join('');
}
function openDialog(title, body) {
  if (dialog.open) dialog.close();
  dialog.innerHTML = '<div class="dialog-inner"><div class="dialog-head"><h2 id="dialog-title">' + title +
    '</h2><button class="icon-button" data-action="dismiss" aria-label="Zavřít">' + icon('close') + '</button></div>' + body + '</div>';
  dialog.setAttribute('aria-labelledby','dialog-title');
  dialog.showModal();
}
function setup(mode, topic = '') {
  const set = currentSet();
  const simulation = mode === 'test' && set.id === 'ofl';
  activeDialog = mode;
  openDialog(mode === 'test' ? 'Nastavení testu' : 'Nastavení drilu',
    '<form id="setup-form">' + (simulation ?
      '<label class="radio-row"><input type="radio" name="format" value="simulation" checked><span><strong>Simulace OFL</strong>' +
      '<small>80 otázek · 60 min · alespoň 90 % v každém okruhu</small></span></label>' +
      '<label class="radio-row"><input type="radio" name="format" value="custom"><span><strong>Vlastní délka testu</strong>' +
      '<small>Vyber okruh a počet otázek. Test je bez časového limitu.</small></span></label>' : '') +
    '<div id="setup-custom"' + (simulation ? ' hidden' : '') +
    '><label class="field">Okruh<select id="setup-topic">' + topicOptions(set, topic) +
    '</select></label><label class="field">Počet otázek<select id="setup-limit"></select></label></div>' +
    (data.session ? '<p class="form-note">Nová série nahradí rozpracovanou. Dokončené výsledky jsou v historii.</p>' : '') +
    '<div class="button-row">' + makeButton('Zrušit','dismiss') + '<button type="submit" class="button primary">' +
    (mode === 'test' ? 'Začít test' : 'Začít dril') + ' ' + icon('next') + '</button></div></form>');
  updateLimits();
}
function updateLimits() {
  const topic = document.querySelector('#setup-topic').value;
  const count = currentSet().questions.filter(q => !topic || q.topic === topic).length;
  const values = [5,10,20,40,80].filter(v => v < count);
  const defaultValue = Math.min(count, activeDialog === 'test' ? 20 : 10);
  const limit = document.querySelector('#setup-limit');
  const previous = Number(limit.value);
  const selection = values.includes(previous) || previous === count ? previous : defaultValue;
  limit.innerHTML = [...values,count].map(v => '<option value="' + v + '"' + (v === selection ? ' selected' : '') +
    '>' + (v === count ? 'Všechny (' + count + ')' : v) + '</option>').join('');
}
function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i],result[j]] = [result[j],result[i]];
  }
  return result;
}
function start(mode, set, questions, {simulation = false, label} = {}) {
  const now = Date.now();
  data.session = {
    id: globalThis.crypto?.randomUUID?.() || now.toString(36) + Math.random().toString(36).slice(2),
    setId:set.id, mode, index:0, label:label || (mode === 'test' ? 'Vlastní test' : 'Dril otázek'), simulation,
    deadline: simulation ? now + 60*60*1000 : null,
    items: questions.map(q => ({id:q.id, order:shuffled(q.options.map((_,i) => i)), answer:q.options.length === 1 ? '' : [], checked:false})),
  };
  if (dialog.open) dialog.close();
  save();
  go('quiz');
}
function startMistakes(set, questions) {
  if (!questions.length) {
    openDialog('Opakování chyb', '<p class="muted">Jakmile některou otázku zodpovíš špatně, objeví se tady k zopakování.</p>' +
      '<div class="button-row">' + makeButton('Zavřít','dismiss') + makeButton('Začít procvičovat','setup-drill',{style:'primary',name:'bolt'}) + '</div>');
    return;
  }
  if (data.session) {
    openDialog('Začít opakování chyb?', '<p class="muted">Tato série nahradí rozpracovanou.</p><div class="button-row">' +
      makeButton('Zrušit','dismiss') + makeButton('Začít','confirm-mistakes',{style:'primary'}) + '</div>');
    return;
  }
  start('drill',set,shuffled(questions),{label:'Opakování chyb'});
}
function answerToken(value) {
  return searchable(value).trim().replace(/\s+/g,' ').replace(/[.!?]+$/,'');
}
function answered(item) {
  return typeof item.answer === 'string' ? Boolean(item.answer.trim()) : item.answer.length > 0;
}
function correctAnswer(q, item) {
  if (!answered(item)) return false;
  if (typeof item.answer === 'string') return answerToken(item.answer) === answerToken(q.options[0]);
  return item.answer.length === q.correct.length && q.correct.every(i => item.answer.includes(i));
}
function quiz() {
  const s = data.session;
  const set = s && findSet(s.setId);
  if (!set) return pageHeader('Rozpracovaná sada', '') + makeButton('Zpět','go',{value:'home'});
  const item = s.items[s.index];
  const q = set.questions.find(question => question.id === item.id);
  const test = s.mode === 'test';
  const free = q.options.length === 1;
  const selection = !free && q.correct.length > 1;
  const checked = item.checked;
  const isCorrect = checked && correctAnswer(q,item);
  const timer = s.deadline ? '<span id="timer" class="timer" role="timer" aria-label="Zbývající čas">' + icon('clock') + '<span></span></span>' : '';
  const options = free ? '<input type="text" class="answer-input" id="answer-text" aria-label="Tvoje odpověď" autocomplete="off" maxlength="3000" placeholder="Napiš svou odpověď…" value="' +
    escapeHtml(item.answer) + '"' + (checked ? ' readonly' : '') + '>' :
    '<div class="options" role="group" aria-label="Možnosti odpovědi">' + item.order.map((option,i) => {
      const chosen = item.answer.includes(option);
      const right = checked && q.correct.includes(option);
      const wrong = checked && chosen && !right;
      return '<button type="button" class="option' + (right ? ' correct' : wrong ? ' incorrect' : '') +
        '" data-action="answer" data-value="' + option + '" aria-pressed="' + chosen +
        '"' + (checked ? ' aria-disabled="true"' : '') + '><span class="letter">' + String.fromCharCode(65+i) +
        '</span><span>' + escapeHtml(q.options[option]) + '</span>' + (right ? icon('check') : wrong ? icon('close') : '') + '</button>';
    }).join('') + '</div>';
  return '<div class="quiz-top">' + makeButton('Přehled','go',{value:'home',style:'ghost',name:'back'}) +
    '<div class="button-row">' + timer + (test ? makeButton('Odevzdat','finish',{style:'ghost'}) : '') + '</div></div>' +
    '<div class="quiz-layout' + (test ? '' : ' drill') + '"><div><section class="panel quiz-card">' +
    '<div class="quiz-meta"><span class="tag">' + escapeHtml(q.topic) + (set.id === 'ofl' ? ' · ' + q.id : '') +
    '</span><small>Otázka ' + (s.index+1) + ' / ' + s.items.length + '</small></div>' +
    '<h1 id="question" tabindex="-1">' + escapeHtml(q.text) + '</h1><p class="muted">' +
    (free ? 'Napiš odpověď vlastními slovy co nejblíže zápisu v sadě.' : selection ? 'Označ všechny správné možnosti.' : 'Vyber jednu odpověď.') +
    '</p>' + options +
    (checked ? '<div class="feedback' + (isCorrect ? '' : ' bad') + '" role="status"><strong>' +
    (isCorrect ? 'Správně' : 'Správná odpověď') + '</strong>' + (isCorrect ? '' : '<p>' + escapeHtml(correctText(q)) + '</p>') + '</div>' : '') +
    '<div class="quiz-actions"><div>' + (test ? makeButton('Předchozí','previous',{name:'back',disabled:s.index === 0}) : '') + '</div>' +
    makeButton(test ? s.index === s.items.length - 1 ? 'Odevzdat test' : 'Další otázka' : !checked ? 'Zkontrolovat' :
      s.index === s.items.length - 1 ? 'Zobrazit výsledek' : 'Další otázka','advance',
      {style:'primary',name:!test && !checked ? 'check' : 'next',disabled:!test && !checked && !answered(item),id:'advance'}) +
    '</div></section>' + (!free ? '<p class="shortcuts"><kbd>A</kbd>–<kbd>' +
    String.fromCharCode(64 + q.options.length) + '</kbd> výběr · <kbd>Enter</kbd> pokračovat</p>' : '') + '</div>' +
    (test ? '<aside class="panel quiz-aside">' + quizAside(s) + '</aside>' : '') + '</div>';
}
function quizAside(s) {
  const answeredCount = s.items.filter(answered).length;
  return '<h2>Otázky testu</h2><small>' + answeredCount + ' z ' + s.items.length +
    ' zodpovězeno</small><div class="bar"><span style="width:' + percent(answeredCount,s.items.length) + '%"></span></div>' +
    '<div class="jump-grid">' + s.items.map((entry,i) => '<button class="jump' + (answered(entry) ? ' answered' : '') +
    '" data-action="jump" data-value="' + i + '" aria-label="Otázka ' + (i+1) + (answered(entry) ? ', zodpovězená' : '') +
    '"' + (i === s.index ? ' aria-current="step"' : '') + '>' + (i+1) + '</button>').join('') + '</div>';
}
function updateTimer() {
  const s = data.session;
  if (!s?.deadline) return;
  const timer = document.querySelector('#timer');
  if (!timer) return;
  const left = Math.max(0, Math.ceil((s.deadline - Date.now())/1000));
  if (!left) {
    queueMicrotask(() => { if (data.session?.id === s.id) finish(true); });
    return;
  }
  timer.lastElementChild.textContent = String(Math.floor(left/60)).padStart(2,'0') + ':' + String(left%60).padStart(2,'0');
  timer.classList.toggle('urgent',left <= 300);
}
function mark(q, set, item) {
  const stats = data.stats[set.id] ||= {};
  stats[q.id] = {last:correctAnswer(q,item)};
}
function currentQuestion() {
  const s = data.session;
  const set = findSet(s.setId);
  const item = s.items[s.index];
  return [s,set,item,set.questions.find(q => q.id === item.id)];
}
function jump(index) {
  const s = data.session;
  if (index < 0 || index >= s.items.length || index === s.index) return;
  s.index = index;
  save();
  render();
  document.querySelector('#question').focus({preventScroll:true});
}
function selectAnswer(i) {
  const [, , item, q] = currentQuestion();
  if (item.checked || typeof item.answer === 'string' || !item.order.includes(i)) return;
  const isSelected = item.answer.includes(i);
  item.answer = isSelected ? item.answer.filter(value => value !== i) : q.correct.length === 1 ? [i] : [...item.answer,i];
  save();
  render();
  document.querySelector('[data-action="answer"][data-value="' + i + '"]').focus({preventScroll:true});
}
function advance() {
  const [s,set,item,q] = currentQuestion();
  if (s.mode === 'drill' && !item.checked) {
    if (!answered(item)) return;
    item.checked = true;
    mark(q,set,item);
    save();
    render();
    document.querySelector('#advance').focus({preventScroll:true});
  } else if (s.index < s.items.length - 1) {
    jump(s.index+1);
  } else if (s.mode === 'test') {
    confirmFinish();
  } else {
    finish(false);
  }
}
function confirmFinish() {
  const unanswered = data.session.items.filter(item => !answered(item)).length;
  openDialog('Odevzdat test?', '<p class="muted">' +
    (unanswered ? 'Bez odpovědi · ' + countText(unanswered) + '. Přeskočené otázky se započítají jako nesprávné.' :
      'Odpovědi jsou vyplněné. Po odevzdání uvidíš výsledek.') + '</p><div class="button-row">' +
    makeButton('Zpět k otázkám','dismiss') + makeButton('Odevzdat','submit-test',{style:'primary'}) + '</div>');
}
function finish(expired) {
  const s = data.session;
  if (!s) return;
  const set = findSet(s.setId);
  const byId = new Map(set.questions.map(q => [q.id,q]));
  const counts = new Map();
  let correct = 0;
  const missed = [];
  for (const item of s.items) {
    const q = byId.get(item.id);
    const right = correctAnswer(q,item);
    const topic = counts.get(q.topic) || {topic:q.topic, correct:0, total:0};
    topic.total++;
    if (right) { correct++; topic.correct++; }
    counts.set(q.topic,topic);
    if (s.mode === 'test') mark(q,set,item);
    if (!right) missed.push({id:q.id, answer:typeof item.answer === 'string' ? item.answer : item.answer.map(i => q.options[i]).join(' · ')});
  }
  const entry = {id:s.id, setId:s.setId, title:set.title, mode:s.mode, label:s.label, correct, total:s.items.length,
    byTopic:[...counts.values()], missed, expired, simulation:s.simulation, ended:Date.now()};
  data.history.unshift(entry);
  data.history = data.history.slice(0,100);
  data.session = null;
  resultId = entry.id;
  if (dialog.open) dialog.close();
  save();
  go('result');
}
function result() {
  const entry = data.history.find(row => row.id === resultId);
  if (!entry) return history();
  const set = findSet(entry.setId);
  const pct = percent(entry.correct,entry.total);
  const passed = entry.simulation && entry.byTopic.every(row => row.correct * 10 >= row.total * 9);
  const detail = entry.correct + ' správně z ' + entry.total;
  return '<div class="narrow"><section class="panel form-panel"><div class="result-head">' + ring(pct) +
    '<div><small>' + escapeHtml(entry.label) + ' · ' + escapeHtml(entry.title) + '</small><h1>' +
    (entry.simulation ? passed ? 'Písemná část splněna' : 'Písemná část nesplněna' : 'Hotovo') +
    '</h1><p>' + detail + (entry.expired ? ' · čas vypršel' : '') + '</p></div></div>' +
    '<div class="result-topics">' + entry.byTopic.map(({topic, correct, total}) =>
      '<div class="result-topic"><span>' + escapeHtml(topic) + '</span><strong class="' +
      (entry.simulation && correct * 10 < total * 9 ? 'bad-text' : 'good-text') + '">' + correct + '/' + total +
      ' · ' + percent(correct,total) + ' %</strong></div>').join('') + '</div><div class="button-row">' +
    (entry.missed.length ? makeButton('Procvičit chyby','retry-result',{name:'repeat',style:'primary'}) : '') +
    makeButton('Přejít na přehled','go',{value:'home'}) + '</div></section>' +
    (entry.missed.length ? '<div class="details-heading">' + section('Otázky k zopakování') + '</div><div class="bank-list">' +
    entry.missed.map(row => {
      const q = set.questions.find(question => question.id === row.id);
      return '<details class="panel bank-item"><summary>' + escapeHtml(q.text) + '</summary><p class="bad-text"><strong>Tvoje odpověď</strong> · ' +
        escapeHtml(row.answer || 'Bez odpovědi') + '</p><p><strong>Správná odpověď</strong> · ' + escapeHtml(correctText(q)) + '</p></details>';
    }).join('') + '</div>' : '') + '</div>';
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  event.preventDefault();
  const value = button.dataset.value;
  const set = currentSet();
  switch (button.dataset.action) {
    case 'go':
      if (value === 'bank') bankFilter = {term:'',topic:''};
      go(value); break;
    case 'set':
      data.active = value; save(); go('home'); break;
    case 'menu':
      menuOpen = !menuOpen; render();
      document.querySelector(menuOpen ? '.brand' : '.menu-button').focus(); break;
    case 'theme':
      data.theme = data.theme === 'dark' ? 'light' : 'dark'; save(); render();
      document.querySelector('[data-action="theme"]').focus({preventScroll:true}); break;
    case 'topic': setup('drill',value); break;
    case 'setup-test': setup('test'); break;
    case 'setup-drill': setup('drill'); break;
    case 'mistakes':
      resultId = null;
      startMistakes(set,mistakes(set)); break;
    case 'confirm-mistakes': {
      const entry = data.history.find(row => row.id === resultId);
      const owner = entry ? findSet(entry.setId) : set;
      const questions = entry ? owner.questions.filter(q => entry.missed.some(row => row.id === q.id)) : mistakes(owner);
      start('drill',owner,shuffled(questions),{label:'Opakování chyb'}); break;
    }
    case 'resume':
      data.active = data.session.setId; save(); go('quiz'); break;
    case 'demo':
      draft = {title:draft.title || 'Ukázková sada',text:demo}; render();
      document.querySelector('#set-input').focus(); break;
    case 'dismiss': dialog.close(); break;
    case 'answer': selectAnswer(Number(value)); break;
    case 'advance': advance(); break;
    case 'previous': jump(data.session.index-1); break;
    case 'jump': jump(Number(value)); break;
    case 'finish': confirmFinish(); break;
    case 'submit-test': finish(false); break;
    case 'result': resultId = value; go('result'); break;
    case 'retry-result': {
      const entry = data.history.find(row => row.id === resultId);
      const owner = findSet(entry.setId);
      data.active = owner.id;
      startMistakes(owner,owner.questions.filter(q => entry.missed.some(row => row.id === q.id))); break;
    }
  }
});

document.addEventListener('submit', event => {
  const form = event.target;
  if (form.id === 'import-form') {
    event.preventDefault();
    try {
      const imported = parseInput(draft.text);
      const title = draft.title.trim() || (typeof imported.title === 'string' ? imported.title.trim().slice(0,80) : '');
      if (!title) throw new Error('Zadej název sady.');
      const id = 'set-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36));
      data.sets.push({id,title,questions:imported.questions});
      data.active = id;
      draft = {title:'',text:''};
      save();
      go('home');
    } catch (error) { importNote(error.message,true); }
  }
  if (form.id === 'setup-form') {
    event.preventDefault();
    const set = currentSet();
    const simulation = new FormData(form).get('format') === 'simulation';
    if (simulation) {
      const quota = [20,40,20];
      const questions = Object.values(topics).flatMap((topic,i) => shuffled(set.questions.filter(q => q.topic === topic)).slice(0,quota[i]));
      start('test',set,questions,{simulation:true,label:'Simulace OFL'});
    } else {
      const topic = form.querySelector('#setup-topic').value;
      const count = Number(form.querySelector('#setup-limit').value);
      const questions = shuffled(set.questions.filter(q => !topic || q.topic === topic)).slice(0,count);
      start(activeDialog,set,questions);
    }
  }
});
document.addEventListener('input', event => {
  const {id,value} = event.target;
  if (id === 'set-title') draft.title = value;
  if (id === 'set-input') draft.text = value;
  if (id === 'search') {
    bankFilter.term = value;
    document.querySelector('#bank-list').innerHTML = bankList(currentSet());
  }
  if (id === 'answer-text') {
    const [s, , item] = currentQuestion();
    if (item.checked) return;
    item.answer = value;
    if (s.mode === 'drill') document.querySelector('#advance').disabled = !answered(item);
    if (s.mode === 'test') document.querySelector('.quiz-aside').innerHTML = quizAside(s);
    save();
  }
});
document.addEventListener('change', async event => {
  const {id,name,value} = event.target;
  if (id === 'bank-topic') {
    bankFilter.topic = value;
    document.querySelector('#bank-list').innerHTML = bankList(currentSet());
  }
  if (id === 'setup-topic') updateLimits();
  if (name === 'format') document.querySelector('#setup-custom').hidden = value === 'simulation';
  if (id === 'file-input') {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      importNote('Soubor může mít nejvýše 2 MB.',true);
      return;
    }
    try {
      const content = await file.text();
      if (page !== 'import') return;
      const parsed = parseInput(content);
      draft.text = content;
      draft.title ||= (typeof parsed.title === 'string' && parsed.title.trim() || file.name.replace(/\.[^.]+$/,'')).slice(0,80);
      render();
      importNote('Načteno · ' + countText(parsed.questions.length) + '.');
    } catch (error) {
      if (page === 'import') importNote(error.message,true);
    }
  }
});
document.addEventListener('keydown', event => {
  if (menuOpen && event.key === 'Escape') {
    menuOpen = false; render(); document.querySelector('.menu-button').focus(); return;
  }
  if (event.target.matches('.file-label') && ['Enter',' '].includes(event.key)) {
    event.preventDefault(); document.querySelector('#file-input').click(); return;
  }
  if (dialog.open || page !== 'quiz' || !data.session || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key;
  if (key === 'Enter' && (event.target.matches('#answer-text, .option') || !event.target.matches('button, a, input, textarea, select'))) {
    event.preventDefault(); advance(); return;
  }
  if (event.target.matches('input, textarea, select')) return;
  if (/^[a-l]$/i.test(key)) {
    const [, , item] = currentQuestion();
    const option = item.order[key.toUpperCase().charCodeAt(0)-65];
    if (option !== undefined) { event.preventDefault(); selectAnswer(option); }
  }
});

function tick() {
  if (data.session?.deadline && Date.now() >= data.session.deadline) finish(true);
  else if (page === 'quiz') updateTimer();
}
setInterval(tick,1000);
document.addEventListener('visibilitychange',() => { if (!document.hidden) tick(); });
render();
tick();
