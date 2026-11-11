import { PAGES, DEFAULT_PAGE } from './config.js';
import { setCurrentPage } from './state.js';

let current = null; // { id, unmount }
let ctx = null;
const pages = {};

export function registerPage(id, module) { pages[id] = module; }

export function navigate(id) {
  if (location.hash !== `#/${id}`) location.hash = `#/${id}`;
  else render(); // aynı sayfa: yeniden çizim
}

const parse = () => {
  const id = location.hash.replace(/^#\/?/, '');
  return PAGES[id] ? id : DEFAULT_PAGE;
};

function render(initial = false) {
  const id = parse();
  const { view, main, navbar } = ctx;
  current?.unmount?.(); // olay dinleyicileri/abonelikler temizlenir
  view.replaceChildren();
  view.classList.remove('view--enter');
  void view.offsetWidth; // animasyonu yeniden tetikle
  view.classList.add('view--enter');
  current = { id, unmount: pages[id].mount(view) };
  setCurrentPage(id);
  navbar.setActive(id);
  document.title = `${PAGES[id].label} · Orvyn`;
  if (!initial) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
}

export function startRouter(context) {
  ctx = context;
  window.addEventListener('hashchange', () => render());
  render(true);
}

