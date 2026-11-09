/**
 * Minimal DOM builder.
 *
 * `el('button', { class: 'btn', onclick: fn }, 'Label')`
 *
 * Props: `class`, `style` (object; `--custom` properties supported), `on*`
 * functions become event listeners, `html` sets innerHTML (only ever pass
 * trusted, app-generated markup), `value` sets the property, `true` becomes an
 * empty attribute, and `null`/`false` are skipped. Children may be nodes,
 * strings, numbers or nested arrays; `null`/`false` children are skipped.
 *
 * @param {string} tag
 * @param {Record<string, any> | null} [props]
 * @param {...any} kids
 * @returns {HTMLElement}
 */
export function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) n.style.setProperty(sk, sv);
        else n.style[sk] = sv;
      }
    } else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'value') n.value = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
  return n;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Builds an <svg> from trusted, app-generated markup.
 * @param {string} viewBox
 * @param {string} inner
 * @param {string} [cls]
 */
export function svg(viewBox, inner, cls) {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', viewBox);
  if (cls) s.setAttribute('class', cls);
  s.innerHTML = inner;
  return s;
}
