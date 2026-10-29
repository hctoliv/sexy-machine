// linha Sexy Machine dentro de badboy.com.br (29/10/2026). "c" = handle da coleção, aberta em colecao.html.
// Handles que começam com "sm" não existem na loja: saem do catálogo inteiro filtrado por nome (VIRTUAL)
const MENU = [
  { t: 'Novidades', c: 'sexy-machine' },
  {
    t: 'Roupas', c: 'sm',
    items: [
      ['Tops e macaquinho', 'sm-tops'], ['Shorts', 'sm-shorts'], ['Baby tees', 'sm-tees'],
      ['Conjuntos de moletom', 'sm-conjuntos'],
    ],
    promo: [['img/rose-3.jpg', 'Soft Rose', 'sm-tops'], ['img/tee-1.jpg', 'Baby tees', 'sm-tees']],
  },
  {
    t: 'Acessórios', c: 'sm-acessorios',
    items: [['Óculos de sol', 'sm-oculos'], ['Bonés e gorros', 'sm-bones']],
    promo: [['img/bone.jpg', 'Boné Bubblegum', 'sm-bones']],
  },
  { t: 'Final sale', c: 'sm-sale', sale: true },
  {
    t: 'Bad Boy',
    items: [['Bad Girl', 'bad-girl'], ['Linha fitness', 'fitness'], ['Feminino completo', 'bad-girl'], ['Masculino', 'bad-boy']],
  },
];

const isSM = p => /sexy.?machine|\bsm\b/i.test(p.t + ' ' + p.h);
const VIRTUAL = {
  sm: ['Sexy Machine: tudo', isSM],
  'sm-tops': ['Tops e macaquinho', p => isSM(p) && /\btop|macaquinho|jaqueta/i.test(p.t + ' ' + p.h)],
  'sm-shorts': ['Shorts', p => isSM(p) && /shorts/i.test(p.t)],
  'sm-tees': ['Baby tees', p => isSM(p) && /baby tee/i.test(p.t)],
  'sm-conjuntos': ['Conjuntos de moletom', p => isSM(p) && /conjunto/i.test(p.t)],
  'sm-acessorios': ['Acessórios', p => isSM(p) && /óculos|oculos|bon[eé]|gorro/i.test(p.t)],
  'sm-oculos': ['Óculos de sol', p => isSM(p) && /óculos|oculos/i.test(p.t)],
  'sm-bones': ['Bonés e gorros', p => isSM(p) && /bon[eé]|gorro/i.test(p.t)],
  'sm-sale': ['Final sale', p => isSM(p) && p.c],
};
