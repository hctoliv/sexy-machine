// página de categoria: puxa a coleção ao vivo da loja e filtra/ordena no navegador
const params = new URLSearchParams(location.search);
const handle = params.get('c') || 'all';
const PAGE = 24;
const state = {
  sort: params.get('sort') || '',
  sizes: new Set((params.get('size') || '').split(',').filter(Boolean)),
  price: params.get('price') || '',
  sale: params.get('sale') === '1',
  soldout: params.get('esgotados') === '1',
  shown: PAGE,
};
let products = [];

/* onde essa categoria mora no menu */
const group = MENU.find(m => m.c === handle || m.items?.some(([, h]) => h === handle));
const menuTitle = VIRTUAL[handle]?.[0] || (group?.c === handle ? group.t : group?.items?.find(([, h]) => h === handle)?.[0]);

function setTitle(title) {
  $('[data-title]').textContent = title;
  $('[data-crumb]').textContent = title;
  document.title = `${title} | Sexy Machine`;
}
setTitle(handle === 'all' ? 'Sexy Machine: tudo' : menuTitle || ' ');
if (group && group.c !== handle) {
  $('[data-crumb-group]').innerHTML = group.c ? `<a href="${colUrl(group.c)}">${group.t}</a>` : group.t;
}
if (group?.items) {
  $('[data-chips]').innerHTML = (group.c ? [[`Tudo em ${group.t}`, group.c]] : []).concat(group.items)
    .filter(([, h], i, a) => a.findIndex(x => x[1] === h) === i)
    .map(([t, h]) => `<a href="${colUrl(h)}" class="chip${h === handle ? ' is-on' : ''}">${t}</a>`).join('');
  $('.chip.is-on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

/* filtros e ordem */
const priceRange = () => state.price ? state.price.split('-').map(Number) : null;
function visible() {
  const range = priceRange();
  let list = products.filter(p =>
    (state.soldout || p.avail) &&
    (!state.sale || p.c) &&
    (!range || (p.p >= range[0] && p.p < range[1])) &&
    (!state.sizes.size || p.sizes.some(s => state.sizes.has(s))));
  const by = {
    new: (a, b) => (b.date || '').localeCompare(a.date || ''),
    'price-asc': (a, b) => a.p - b.p,
    'price-desc': (a, b) => b.p - a.p,
    off: (a, b) => (b.c ? 1 - b.p / b.c : 0) - (a.c ? 1 - a.p / a.c : 0),
    az: (a, b) => a.t.localeCompare(b.t, 'pt-BR'),
  }[state.sort];
  if (by) list = [...list].sort(by);
  return list;
}

function syncUrl() {
  const q = new URLSearchParams({ c: handle });
  if (state.sort) q.set('sort', state.sort);
  if (state.sizes.size) q.set('size', [...state.sizes].join(','));
  if (state.price) q.set('price', state.price);
  if (state.sale) q.set('sale', '1');
  if (state.soldout) q.set('esgotados', '1');
  history.replaceState(null, '', '?' + q);
}

function render() {
  const list = visible();
  const shown = list.slice(0, state.shown);
  const grid = $('[data-grid]');
  if (!products.some(p => p.avail) && !state.soldout) {
    grid.innerHTML = '<div class="col-empty"><p class="h3">Nada por aqui agora</p><p>Essa categoria tá sem produto disponível no momento.</p><a class="btn" href="colecao.html?c=sexy-machine">Ver novidades</a></div>';
  } else if (!list.length) {
    grid.innerHTML = '<div class="col-empty"><p class="h3">Nada com esses filtros</p><p>Tira algum filtro pra ver mais produtos.</p><button class="btn" data-clear>Limpar filtros</button></div>';
  } else {
    renderGrid(grid, shown);
  }
  $('[data-count]').textContent = `${list.length} ${list.length === 1 ? 'produto' : 'produtos'}`;
  $('[data-apply]').textContent = `Ver ${list.length} ${list.length === 1 ? 'produto' : 'produtos'}`;
  const more = $('[data-more]');
  more.hidden = list.length <= PAGE;
  $('[data-more-label]').textContent = `Mostrando ${shown.length} de ${list.length}`;
  $('[data-more-bar]').style.width = (shown.length / list.length * 100) + '%';
  $('[data-more-btn]').hidden = shown.length >= list.length;

  // filtros ativos em pílulas
  const pills = [];
  state.sizes.forEach(s => pills.push([`Tamanho ${s}`, 'size', s]));
  if (state.price) {
    const [a, b] = priceRange();
    pills.push([b > 9999 ? `Acima de ${brl(a)}` : a ? `${brl(a)} a ${brl(b)}` : `Até ${brl(b)}`, 'price']);
  }
  if (state.sale) pills.push(['Só promoção', 'sale']);
  if (state.soldout) pills.push(['Com esgotados', 'soldout']);
  $('[data-active]').innerHTML = pills.map(([t, k, v]) =>
    `<button class="pill" data-rm="${k}" data-v="${v || ''}">${t}<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`).join('')
    + (pills.length > 1 ? '<button class="pill pill--clear" data-clear>Limpar tudo</button>' : '');
  syncUrl();
}

function buildSizeFilter() {
  const ORDER = ['RN', 'PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3', 'G4', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'M0', 'M1', 'M2', 'M3', 'M4'];
  const all = [...new Set(products.filter(p => p.avail).flatMap(p => p.sizes))];
  const rank = s => { const i = ORDER.indexOf(s.toUpperCase()); return i < 0 ? 100 + (parseFloat(s) || 0) : i; };
  all.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'pt-BR', { numeric: true }));
  const box = $('[data-f-sizes]');
  box.closest('.filter').hidden = !all.length;
  box.innerHTML = all.slice(0, 30).map(s => `<button class="${state.sizes.has(s) ? 'is-on' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('');
}

function syncControls() {
  $('[data-sort]').value = state.sort;
  $$('[data-f-price] input').forEach(i => i.checked = i.value === state.price);
  $('[data-f-sale]').checked = state.sale;
  $('[data-f-soldout]').checked = state.soldout;
  $$('[data-f-sizes] button').forEach(b => b.classList.toggle('is-on', state.sizes.has(b.dataset.size)));
}

const update = () => { state.shown = PAGE; syncControls(); render(); };
$('[data-sort]').addEventListener('change', e => { state.sort = e.target.value; update(); });
$('[data-f-price]').addEventListener('change', e => { state.price = e.target.value; update(); });
$('[data-f-sale]').addEventListener('change', e => { state.sale = e.target.checked; update(); });
$('[data-f-soldout]').addEventListener('change', e => { state.soldout = e.target.checked; update(); });
$('[data-f-sizes]').addEventListener('click', e => {
  const b = e.target.closest('[data-size]');
  if (!b) return;
  const s = b.dataset.size;
  state.sizes.has(s) ? state.sizes.delete(s) : state.sizes.add(s);
  update();
});
document.addEventListener('click', e => {
  if (e.target.closest('[data-clear]')) {
    Object.assign(state, { sizes: new Set(), price: '', sale: false, soldout: false });
    update();
  }
  const rm = e.target.closest('[data-rm]');
  if (rm) {
    const k = rm.dataset.rm;
    if (k === 'size') state.sizes.delete(rm.dataset.v);
    else if (k === 'price') state.price = '';
    else state[k] = false;
    update();
  }
});
$('[data-more-btn]').addEventListener('click', () => { state.shown += PAGE; render(); });

/* carga */
(async () => {
  try {
    const virtual = VIRTUAL[handle] || (handle === 'all' && VIRTUAL.sm);
    const path = virtual || handle === 'all' ? '/products.json' : `/collections/${handle}/products.json`;
    const [meta, all] = await Promise.all([
      virtual || handle === 'all' ? null : fetch(`${SHOP}/collections/${handle}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetchAll(path),
    ]);
    const list = virtual ? all.filter(virtual[1]) : all;
    if (!virtual && handle !== 'all' && !meta?.collection && !list.length) {
      setTitle('Categoria não encontrada');
      $('[data-count]').textContent = '';
      $('[data-grid]').innerHTML = '<div class="col-empty"><p>Esse link não leva a nenhuma categoria da loja.</p><a class="btn" href="colecao.html?c=sm">Ver toda a Sexy Machine</a></div>';
      return;
    }
    if (meta?.collection) {
      setTitle(meta.collection.title);
      const desc = (meta.collection.body_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      $('[data-desc]').textContent = desc.length > 220 ? desc.slice(0, 217) + '...' : desc;
    }
    products = list;
    buildSizeFilter();
    syncControls();
    render();
  } catch {
    $('[data-count]').textContent = '';
    $('[data-grid]').innerHTML = `<div class="col-empty"><p class="h3">Não deu pra carregar essa categoria</p><p>Tenta de novo ou abre direto na loja.</p><a class="btn" href="${SHOP}/collections/${handle}">Abrir na loja</a></div>`;
  }
})();
