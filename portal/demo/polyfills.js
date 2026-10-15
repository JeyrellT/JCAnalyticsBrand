// APIs que usan el backend y la interfaz pero que faltan en Safari/iOS < 17.4.

function define(target, name, fn) {
  if (typeof target[name] === 'function') return;
  Object.defineProperty(target, name, { value: fn, writable: true, configurable: true, enumerable: false });
}

define(Map, 'groupBy', function groupBy(items, keyOf) {
  const map = new Map();
  let index = 0;
  for (const item of items) {
    const key = keyOf(item, index++);
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
});

define(Object, 'groupBy', function groupBy(items, keyOf) {
  const out = Object.create(null);
  let index = 0;
  for (const item of items) {
    const key = keyOf(item, index++);
    (out[key] ??= []).push(item);
  }
  return out;
});
