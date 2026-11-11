/** Güvenli DOM yardımcıları. Kullanıcı metni her zaman textContent ile eklenir. */
const PROPERTY_ATTRS = new Set(['value', 'checked', 'disabled', 'hidden']);

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(props ?? {})) {
    if (val == null || val === false) continue;
    if (key === 'class') el.className = val;
    else if (key === 'dataset') Object.assign(el.dataset, val);
    else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (PROPERTY_ATTRS.has(key)) el[key] = val;
    else el.setAttribute(key, val === true ? '' : String(val));
  }
  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

