// página de produto: puxa o produto ao vivo da loja (/products/<handle>.js)
const handle = new URLSearchParams(location.search).get('p') || '';
const money = cents => brl(cents / 100);
const https = src => (src.startsWith('//') ? 'https:' : '') + src;
let data, picked = [];
const qty = 1;

/* de onde a pessoa veio: categoria no breadcrumb e no "ver mais" */
const fromCol = (() => {
  try {
    const ref = new URL(document.referrer);
    return ref.origin === location.origin ? ref.searchParams.get('c') : null;
  } catch { return null; }
})();
if (fromCol && fromCol !== 'all') {
  const name = MENU.flatMap(m => [[m.t, m.c], ...(m.items || [])]).find(([, h]) => h === fromCol)?.[0];
  if (name) $('[data-crumb-col]').innerHTML = `<a href="${colUrl(fromCol)}">${name}</a>`;
  $('[data-related-link]').href = colUrl(fromCol);
}

/* descrição da loja só com as tags de texto */
function cleanHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const OK = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'H2', 'H3', 'H4']);
  const walk = node => [...node.childNodes].map(n => {
    if (n.nodeType === 3) return esc(n.textContent);
    if (n.nodeType !== 1) return '';
    const inner = walk(n);
    if (!OK.has(n.tagName)) return inner;
    const tag = /^H\d$/.test(n.tagName) ? 'h4' : n.tagName.toLowerCase();
    return tag === 'br' ? '<br>' : `<${tag}>${inner}</${tag}>`;
  }).join('');
  return walk(doc.body).replace(/<p>\s*<\/p>/g, '');
}

/* variação escolhida */
const matches = (v, sel) => sel.every((val, i) => val == null || v['option' + (i + 1)] === val);
const current = () => data.variants.find(v => matches(v, picked));

function renderOptions() {
  $('[data-options]').innerHTML = data.options.map((o, i) => {
    const name = o.name || 'Opção';
    if (name === 'Title' && o.values.length === 1) return '';
    return `<div class="pdp__opt">
      <p class="eyebrow">${esc(name)} — <b>${esc(picked[i] ?? '')}</b></p>
      <div class="sizes">${o.values.map(val => {
        const test = picked.map((p, j) => j === i ? val : p);
        const ok = data.variants.some(v => v.available && matches(v, test));
        return `<button class="${picked[i] === val ? 'is-on' : ''}${ok ? '' : ' is-out'}" data-opt="${i}" data-val="${esc(val)}">${esc(val)}</button>`;
      }).join('')}</div>
    </div>`;
  }).join('');
}

function renderVariant() {
  const v = current();
  const price = v ? v.price : data.price;
  const compare = v ? v.compare_at_price : data.compare_at_price;
  const off = compare > price ? Math.round((1 - price / compare) * 100) : 0;
  $('[data-price]').innerHTML = off
    ? `<p class="price is-sale"><b>${money(price)}</b><s>${money(compare)}</s><span class="card__badge">${off}% OFF</span></p>`
    : `<p class="price"><b>${money(price)}</b></p>`;
  const ok = v?.available;
  $('[data-add-pdp]').disabled = !ok;
  $('[data-add-pdp]').textContent = ok ? 'Adicionar ao carrinho' : 'Esgotado';
  $('[data-stock]').textContent = ok ? 'Em estoque, pronto pra envio' : v ? 'Essa combinação acabou. Tenta outro tamanho.' : '';
  $('[data-stock]').classList.toggle('is-out', !ok);
  $('[data-buy-now]').href = ok ? `${SHOP}/cart/${v.id}:${qty}` : STORE + handle;
  $('[data-buy-now]').classList.toggle('is-disabled', !ok);
  $('[data-buybar-price]').textContent = money(price);
  renderSpecs(v);
}

function renderSpecs(v) {
  const rows = [['Marca', data.vendor], ['Tipo', data.type], ['Código', v?.sku]].filter(([, x]) => x);
  $('[data-specs]').innerHTML = rows.map(([k, x]) => `<dt>${k}</dt><dd>${esc(x)}</dd>`).join('');
}

// rolagem animada à mão: o smooth nativo trava com scroll-snap em alguns Chromes
function slideTo(el, left) {
  const from = el.scrollLeft, dist = left - from, t0 = performance.now(), dur = 450;
  el.style.scrollSnapType = 'none';
  const step = now => {
    const k = Math.min(1, (now - t0) / dur);
    el.scrollLeft = from + dist * (1 - Math.pow(1 - k, 3));
    if (k < 1) requestAnimationFrame(step); else el.style.scrollSnapType = '';
  };
  requestAnimationFrame(step);
}

function renderGallery() {
  const imgs = data.images.slice(0, 12).map(https);
  const g = $('[data-gallery]');
  g.innerHTML = imgs.map((src, i) =>
    `<figure class="pdp__img"><img src="${cdn(src, 1100)}" alt="${i ? '' : esc(data.title)}" ${i ? 'loading="lazy"' : ''}></figure>`).join('');
  const thumbs = $('[data-thumbs]');
  thumbs.innerHTML = imgs.length > 1 ? imgs.map((src, i) =>
    `<button class="${i ? '' : 'is-on'}" data-thumb="${i}" aria-label="Foto ${i + 1}"><img src="${cdn(src, 160)}" alt="" loading="lazy"></button>`).join('') : '';
  const counter = $('[data-counter]');
  counter.hidden = imgs.length < 2;
  counter.innerHTML = imgs.map((_, i) => `<i class="${i ? '' : 'is-on'}"></i>`).join('');
  // a foto principal desliza; miniaturas e bolinhas acompanham
  const mark = i => {
    $$('i', counter).forEach((d, n) => d.classList.toggle('is-on', n === i));
    $$('[data-thumb]', thumbs).forEach((t, n) => t.classList.toggle('is-on', n === i));
  };
  g.addEventListener('scroll', () => mark(Math.round(g.scrollLeft / g.clientWidth)), { passive: true });
  thumbs.addEventListener('click', e => {
    const t = e.target.closest('[data-thumb]');
    if (!t) return;
    slideTo(g, +t.dataset.thumb * g.clientWidth);
    mark(+t.dataset.thumb);
  });
}

/* interações */
$('[data-options]').addEventListener('click', e => {
  const b = e.target.closest('[data-opt]');
  if (!b) return;
  picked[+b.dataset.opt] = b.dataset.val;
  // se a combinação não existe, pega a primeira disponível com o valor escolhido
  if (!current()?.available) {
    const alt = data.variants.find(v => v.available && v['option' + (+b.dataset.opt + 1)] === b.dataset.val);
    if (alt) picked = data.options.map((_, i) => alt['option' + (i + 1)]);
  }
  $('[data-hint]').textContent = '';
  renderOptions(); renderVariant();
});
function addCurrent() {
  const v = current();
  if (!v?.available) { $('[data-hint]').textContent = 'Escolhe um tamanho disponível'; return; }
  const p = byHandle(handle);
  const label = data.options.length === 1 && data.options[0].name === 'Title' ? '' : v.title;
  addToCart({ ...p, p: v.price / 100 }, label, qty, v.id);
  open('cart');
}
$('[data-add-pdp]').addEventListener('click', addCurrent);
$('[data-buybar-go]').addEventListener('click', addCurrent);

/* barra de compra fixa aparece quando o botão principal sai da tela */
const buyBox = $('.pdp__buy'), buybar = $('[data-buybar]');
const syncBuybar = () => buybar.classList.toggle('is-on', !!data && buyBox.getBoundingClientRect().bottom < 0);
addEventListener('scroll', syncBuybar, { passive: true });

/* relacionados: mesmo tipo de produto no catálogo publicado */
async function renderRelated() {
  loadSearch();
  const all = await searchIndex;
  const pool = all.filter(p => p.avail && p.h !== handle);
  const same = pool.filter(p => p.type && p.type === data.type);
  const near = pool.filter(p => p.type?.split(' ')[0] === data.type?.split(' ')[0]);
  // a linha é pequena: completa com o resto da Sexy Machine
  const list = [...new Set([...same, ...near, ...pool])].slice(0, 4);
  if (!list.length) return;
  $('[data-related-wrap]').hidden = false;
  io.observe($('[data-related-wrap] .reveal'));
  renderGrid($('[data-related]'), list);
}

/* carga */
(async () => {
  try {
    const r = await fetch(`${SHOP}/products/${encodeURIComponent(handle)}.js`);
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
  } catch {
    $('.pdp').innerHTML = `<div class="col-empty"><p class="h3">Produto não encontrado</p><p>Ele pode ter saído da loja.</p><a class="btn" href="colecao.html?c=sexy-machine">Ver novidades</a></div>`;
    $('[data-crumb]').textContent = 'Produto não encontrado';
    return;
  }
  document.title = `${data.title} | Sexy Machine`;
  $('[data-title]').textContent = data.title;
  $('[data-crumb]').textContent = data.title;
  $('[data-buybar-title]').textContent = data.title;
  const share = encodeURIComponent(location.href), txt = encodeURIComponent(data.title);
  $('[data-share=facebook]').href = `https://www.facebook.com/sharer/sharer.php?u=${share}`;
  $('[data-share=x]').href = `https://twitter.com/intent/tweet?text=${txt}&url=${share}`;
  $('[data-share=whatsapp]').href = `https://api.whatsapp.com/send?text=${txt}%20${share}`;
  $('[data-desc]').innerHTML = cleanHTML(data.description || '') || '<p>Sem descrição.</p>';

  const first = data.variants.find(v => v.available) || data.variants[0];
  picked = data.options.map((_, i) => first['option' + (i + 1)]);
  const sizeIdx = data.options.findIndex(o => /tamanho|size/i.test(o.name));
  const avail = data.variants.filter(v => v.available);
  register([{
    t: data.title, h: handle, p: data.price / 100, c: data.compare_at_price > data.price ? data.compare_at_price / 100 : null,
    sizes: sizeIdx < 0 ? [] : [...new Set(avail.map(v => v['option' + (sizeIdx + 1)]))],
    imgs: data.images.slice(0, 2).map(s => cdn(https(s), 700)), avail: avail.length > 0, type: data.type,
  }]);

  renderGallery();
  renderOptions();
  renderVariant();
  renderRelated();
})();
