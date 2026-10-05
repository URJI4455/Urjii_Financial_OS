/**
 * Tiny DOM helpers. Text is ALWAYS inserted as text nodes (never innerHTML), so user-entered names
 * and notes can never inject markup.
 * Layer: ui.
 */

const PROPERTY_KEYS = new Set(['value', 'checked', 'disabled', 'hidden', 'selected', 'open']);
const SVG_NS = 'http://www.w3.org/2000/svg';
let counter = 0;

export const uid = (prefix = 'id') => `${prefix}-${++counter}`;

const flatten = (items) => items.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false);

export function append(parent, ...children) {
  for (const child of flatten(children)) parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return parent;
}

export function render(parent, ...children) {
  parent.replaceChildren();
  return append(parent, ...children);
}

/** h('button', { class: 'button', onClick: fn, 'aria-label': 'Close' }, 'Text', childNode) */
export function h(tag, props, ...children) {
  const isProps = props !== null && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props);
  const attributes = isProps ? props : {};
  const content = isProps ? children : [props, ...children];
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') element.className = value;
    else if (key === 'dataset') Object.assign(element.dataset, value);
    else if (/^on[A-Z]/.test(key) && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (PROPERTY_KEYS.has(key)) element[key] = value;
    else element.setAttribute(key, value === true ? '' : String(value));
  }
  return append(element, content);
}

export function svg(tag, attributes = {}, ...children) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  for (const child of children) element.append(child);
  return element;
}

export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
