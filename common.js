// partes comuns da home e da página de categoria
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const SHOP = 'https://badboy.com.br';
const STORE = SHOP + '/products/';
const colUrl = h => 'colecao.html?c=' + encodeURIComponent(h);
const pdpUrl = h => 'produto.html?p=' + encodeURIComponent(h);
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/* registro de produtos: os do catálogo fixo da home e os que chegam ao vivo da loja */
const PRODUCTS = new Map();
const register = list => list.forEach(p => PRODUCTS.set(p.h, p));
const byHandle = h => PRODUCTS.get(h);
if (typeof CATALOG !== 'undefined') Object.values(CATALOG).forEach(register);

const cdn = (src, w) => src.split('?')[0] + '?width=' + w;
// converte um produto do products.json da Shopify pro formato dos cards
function fromShopify(p) {
  const avail = p.variants.filter(v => v.available);
  const pool = avail.length ? avail : p.variants;
  const price = Math.min(...pool.map(v => +v.price));
  const compare = Math.max(0, ...pool.map(v => +(v.compare_at_price || 0)));
  const sizeIdx = p.options.findIndex(o => /tamanho|size/i.test(o.name));
  const sizes = sizeIdx < 0 ? [] : [...new Set(avail.map(v => v['option' + (sizeIdx + 1)]))];
  // id da variação por tamanho, pra mandar o carrinho direto pro checkout da loja
  const vids = {};
  avail.forEach(v => { const k = sizeIdx < 0 ? '' : v['option' + (sizeIdx + 1)]; if (!(k in vids)) vids[k] = v.id; });
  return {
    t: p.title, h: p.handle, p: price, c: compare > price ? compare : null, sizes,
    imgs: p.images.slice(0, 2).map(i => cdn(i.src, 700)),
    avail: avail.length > 0, date: p.published_at, type: p.product_type, vids,
  };
}
async function fetchAll(path) {
  const out = [];
  for (let page = 1; page < 12; page++) {
    const r = await fetch(`${SHOP}${path}${path.includes('?') ? '&' : '?'}limit=250&page=${page}`);
    if (!r.ok) throw new Error(r.status);
    const { products } = await r.json();
    out.push(...products.map(fromShopify));
    if (products.length < 250) break;
  }
  register(out);
  return out;
}

/* cards */
function priceHTML(p) {
  return p.c
    ? `<p class="price is-sale"><b>${brl(p.p)}</b><s>${brl(p.c)}</s></p>`
    : `<p class="price"><b>${brl(p.p)}</b></p>`;
}
function cardHTML(p) {
  const off = p.c ? Math.round((1 - p.p / p.c) * 100) : 0;
  const soldOut = p.avail === false;
  return `<article class="card${soldOut ? ' is-soldout' : ''}">
    <a href="${pdpUrl(p.h)}" class="card__media">
      ${soldOut ? '<span class="card__badge card__badge--out">Esgotado</span>' : off ? `<span class="card__badge">${off}% OFF</span>` : ''}
      ${p.imgs[0] ? `<img src="${p.imgs[0]}" alt="${esc(p.t)}" loading="lazy">` : ''}
      ${p.imgs[1] ? `<img src="${p.imgs[1]}" alt="" loading="lazy">` : ''}
    </a>
    ${soldOut ? '' : `<button class="card__quick" data-quick="${p.h}">Compra<br>rápida</button>`}
    <div class="card__info">
      <a href="${pdpUrl(p.h)}" class="card__title">${esc(p.t)}</a>
      ${priceHTML(p)}
      ${p.sizes.length > 1 ? `<p class="card__sizes">${p.sizes.slice(0, 8).join(' · ')}</p>` : ''}
    </div>
  </article>`;
}

/* entrada no scroll */
const io = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { threshold: .08 });
function renderGrid(grid, list) {
  grid.innerHTML = list.map(cardHTML).join('');
  $$('.card', grid).forEach((c, i) => { c.style.transitionDelay = `${(i % 8) * 70}ms`; io.observe(c); });
}
$$('.reveal').forEach(el => io.observe(el));

/* menu: megamenu no desktop, sanfona no celular */
(() => {
  const nav = $('.header__nav');
  nav.innerHTML = MENU.map(m => {
    const cls = m.sale ? ' class="is-sale"' : '';
    if (!m.items) return `<a href="${colUrl(m.c)}"${cls}>${m.t}</a>`;
    const cols = [];
    for (let i = 0; i < m.items.length; i += 7) cols.push(m.items.slice(i, i + 7));
    return `<div class="mega">
      <a class="mega__trigger"${cls} href="${m.c ? colUrl(m.c) : '#'}">${m.t} <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></a>
      <div class="mega__panel">
        ${cols.map((col, i) => `<div class="mega__links">
          <p class="eyebrow">${i ? '&nbsp;' : m.t}</p>
          ${col.map(([t, h]) => `<a href="${colUrl(h)}">${t}</a>`).join('')}
        </div>`).join('')}
        <div class="mega__promos">${(m.promo || []).map(([src, t, h]) => `<a class="mega__promo" href="${colUrl(h)}"><img src="${src}" alt="" loading="lazy"><span>${t}</span></a>`).join('')}</div>
      </div>
    </div>`;
  }).join('');

  $('.drawer__nav').innerHTML = MENU.map(m => {
    const cls = m.sale ? ' is-sale' : '';
    if (!m.items) return `<a href="${colUrl(m.c)}" class="${cls}">${m.t}</a>`;
    return `<details class="drawer__group">
      <summary class="${cls}">${m.t}<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></summary>
      <div>${m.c ? `<a href="${colUrl(m.c)}">Ver tudo</a>` : ''}${m.items.map(([t, h]) => `<a href="${colUrl(h)}">${t}</a>`).join('')}</div>
    </details>`;
  }).join('');

  const header = $('#header');
  $$('.mega').forEach(mega => {
    mega.addEventListener('mouseenter', () => header.classList.add('is-mega'));
    mega.addEventListener('mouseleave', () => header.classList.remove('is-mega'));
  });
  const onScroll = () => header.classList.toggle('is-solid', scrollY > 60 || document.body.classList.contains('page-solid'));
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* barra de aviso girando */
(() => {
  const ps = $$('.announce__track p');
  let i = 0;
  setInterval(() => {
    const cur = ps[i];
    cur.classList.replace('is-on', 'is-out');
    setTimeout(() => cur.classList.remove('is-out'), 500);
    i = (i + 1) % ps.length;
    ps[i].classList.add('is-on');
  }, 4200);
})();

/* toast */
const toast = msg => {
  const t = $('.toast');
  t.textContent = msg; t.classList.add('is-on');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('is-on'), 2400);
};

/* camadas: menu, busca, compra rápida, carrinho */
const scrim = $('.scrim');
let openLayer = null;
function open(id) {
  close();
  openLayer = $('#' + id);
  openLayer.classList.add('is-on');
  openLayer.setAttribute('aria-hidden', 'false');
  if (id !== 'search') scrim.classList.add('is-on');
  document.body.classList.add('is-locked');
  if (id === 'search') { setTimeout(() => $('#search input').focus(), 300); loadSearch(); }
  if (id === 'cart') renderCart();
}
function close() {
  if (!openLayer) return;
  openLayer.classList.remove('is-on');
  openLayer.setAttribute('aria-hidden', 'true');
  scrim.classList.remove('is-on');
  document.body.classList.remove('is-locked');
  openLayer = null;
}
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]');
  if (o) { e.preventDefault(); open(o.dataset.open); return; }
  if (e.target.closest('[data-close]')) close();
  if (e.target.id === 'quick') close();
});
addEventListener('keydown', e => e.key === 'Escape' && close());

/* busca: carrega o catálogo publicado da loja na primeira abertura */
let searchIndex = null;
function loadSearch() {
  if (searchIndex) return;
  searchIndex = fetchAll('/products.json').then(l => l.filter(isSM)).catch(() => [...PRODUCTS.values()]);
}
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
$('#search input').addEventListener('input', async e => {
  const q = norm(e.target.value.trim());
  const box = $('.search__results');
  if (q.length < 2) { box.innerHTML = ''; return; }
  const all = await searchIndex;
  if (norm(e.target.value.trim()) !== q) return;
  const words = q.split(/\s+/);
  const hits = all.filter(p => p.avail !== false && words.every(w => norm(p.t).includes(w))).slice(0, 12);
  box.innerHTML = hits.length
    ? hits.map(p => `<a href="${pdpUrl(p.h)}"><img src="${p.imgs[0] || ''}" alt="" loading="lazy">${esc(p.t)}<b>${brl(p.p)}</b></a>`).join('')
    : '<p class="search__none">Nada encontrado. Tenta outra palavra.</p>';
});

/* compra rápida */
document.addEventListener('click', e => {
  const q = e.target.closest('[data-quick]');
  if (!q) return;
  const p = byHandle(q.dataset.quick);
  $('#quick .modal__media').innerHTML = p.imgs.map(s => `<img src="${s}" alt="${esc(p.t)}">`).join('');
  $('#quick .modal__info').innerHTML = `
    <p class="eyebrow">Sexy Machine</p>
    <h3>${esc(p.t)}</h3>
    ${priceHTML(p)}
    ${p.sizes.length ? `<p class="eyebrow">Tamanho</p><div class="sizes">${p.sizes.map(s => `<button>${s}</button>`).join('')}</div>` : ''}
    <p class="modal__hint"></p>
    <button class="btn btn--block" data-add="${p.h}">Adicionar ao carrinho</button>
    <a class="link" href="${pdpUrl(p.h)}">Ver detalhes do produto</a>`;
  if (p.sizes.length === 1) $('#quick .sizes button').classList.add('is-on');
  open('quick');
});
$('#quick').addEventListener('click', e => {
  const s = e.target.closest('.sizes button');
  if (s) {
    $$('#quick .sizes button').forEach(b => b.classList.toggle('is-on', b === s));
    $('#quick .modal__hint').textContent = '';
  }
  const add = e.target.closest('[data-add]');
  if (add) {
    const p = byHandle(add.dataset.add);
    const size = $('#quick .sizes button.is-on')?.textContent || '';
    if (p.sizes.length && !size) { $('#quick .modal__hint').textContent = 'Escolhe o tamanho primeiro'; return; }
    addToCart(p, size);
    open('cart');
  }
});

/* carrinho da prévia: guarda no navegador pra sobreviver à troca de página */
let cart = [];
try { cart = JSON.parse(localStorage.getItem('sm-cart')) || []; } catch { cart = []; }
const saveCart = () => { try { localStorage.setItem('sm-cart', JSON.stringify(cart)); } catch {} };
function updateBadge(bump) {
  const badge = $('.cart-count');
  const n = cart.reduce((s, l) => s + l.qty, 0);
  badge.textContent = n;
  badge.hidden = !n;
  if (bump) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
}
function addToCart(p, size, qty = 1, vid = p.vids?.[size]) {
  const line = cart.find(l => l.h === p.h && l.size === size);
  line ? line.qty += qty : cart.push({ h: p.h, size, qty, t: p.t, p: p.p, img: p.imgs[0], vid });
  saveCart(); updateBadge(true);
}
function renderCart() {
  const box = $('.cart__items');
  box.innerHTML = cart.length ? cart.map((l, i) => `<div class="cart-line">
      <img src="${l.img}" alt="">
      <div><h4>${esc(l.t)}</h4>${l.size ? `<p>Tamanho ${l.size}</p>` : ''}
        <div class="qty"><button data-q="${i}" data-d="-1" aria-label="Menos">−</button><span>${l.qty}</span><button data-q="${i}" data-d="1" aria-label="Mais">+</button></div>
      </div>
      <p class="price"><b>${brl(l.p * l.qty)}</b></p>
    </div>`).join('') : '<p class="cart__empty">Seu carrinho tá vazio.</p>';
  $('[data-subtotal]').textContent = brl(cart.reduce((s, l) => s + l.p * l.qty, 0));
  // link permanente de carrinho da Shopify: leva os itens pro checkout da Bad Boy
  const ready = cart.length && cart.every(l => l.vid);
  $('.cart__foot .btn').href = ready ? `${SHOP}/cart/${cart.map(l => l.vid + ':' + l.qty).join(',')}` : SHOP + '/cart';
  updateBadge();
}
$('.cart__items').addEventListener('click', e => {
  const b = e.target.closest('[data-q]');
  if (!b) return;
  const l = cart[b.dataset.q];
  l.qty += +b.dataset.d;
  if (l.qty < 1) cart.splice(b.dataset.q, 1);
  saveCart(); renderCart();
});
updateBadge();
