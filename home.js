$$('[data-products]').forEach(g => renderGrid(g, CATALOG[g.dataset.products]));

/* slideshow */
(() => {
  const root = $('.slideshow');
  const slides = $$('.slide', root);
  const dots = $$('.slideshow__dots button', root);
  const MS = 6000;
  root.style.setProperty('--slide-ms', MS + 'ms');
  let i = 0, timer, paused = false;
  const go = n => {
    slides[i].classList.remove('is-on'); dots[i].classList.remove('is-on');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('is-on');
    void dots[i].offsetWidth;
    dots[i].classList.add('is-on');
  };
  const play = () => { clearInterval(timer); timer = setInterval(() => !paused && go(i + 1), MS); };
  dots.forEach((d, n) => d.addEventListener('click', () => { go(n); play(); }));
  $('.slideshow__pause', root).addEventListener('click', e => {
    paused = !paused;
    root.classList.toggle('is-paused', paused);
    $$('.slide img', root).forEach(img => img.style.animationPlayState = paused ? 'paused' : '');
    e.currentTarget.innerHTML = paused
      ? '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>';
    e.currentTarget.setAttribute('aria-label', paused ? 'Tocar slideshow' : 'Pausar slideshow');
  });
  play();
})();

/* abas de coleção */
const TAB_CTA = {
  rose: ['Ver tops e macaquinho', 'sm-tops'],
  black: ['Ver tops e macaquinho', 'sm-tops'],
  ollive: ['Ver shorts', 'sm-shorts'],
};
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  if (b.classList.contains('is-on')) return;
  $$('.tabs button').forEach(x => x.classList.toggle('is-on', x === b));
  const grid = $('.tab-grid');
  grid.classList.add('is-swapping');
  setTimeout(() => {
    renderGrid(grid, CATALOG[b.dataset.tab]);
    grid.classList.remove('is-swapping');
    const [label, col] = TAB_CTA[b.dataset.tab];
    const cta = $('#tab-cta');
    cta.textContent = label;
    cta.href = colUrl(col);
  }, 300);
}));

/* trilho de categorias: setas no desktop */
$$('.rail').forEach(rail => {
  const track = $('.rail__track', rail);
  $$('[data-rail]', rail).forEach(b => b.addEventListener('click', () =>
    track.scrollBy({ left: +b.dataset.rail * track.clientWidth * .8, behavior: 'smooth' })));
});

/* parallax da faixa de imagem */
(() => {
  const sec = $('.feature-media'), bg = $('.feature-media__bg');
  const tick = () => {
    const r = sec.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      bg.style.transform = `translate3d(0, ${p * -12}%, 0)`;
    }
  };
  addEventListener('scroll', () => requestAnimationFrame(tick), { passive: true });
  tick();
})();

/* contagem Bad Friday */
(() => {
  const clock = $('.countdown__clock');
  const end = new Date(clock.dataset.deadline).getTime();
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    $('[data-cd=d]').textContent = pad(d);
    $('[data-cd=h]').textContent = pad(h);
    $('[data-cd=m]').textContent = pad(m);
    $('[data-cd=s]').textContent = pad(s);
  };
  tick(); setInterval(tick, 1000);
})();

$('[data-copy]').addEventListener('click', e => {
  navigator.clipboard?.writeText(e.currentTarget.dataset.copy).catch(() => {});
  toast('Cupom ESQUENTABLACK copiado');
});
