/*
 * LRU memoize
 */

export default function lruMemoize<T extends (...args: any[]) => any = (...args: any[]) => any>(
  fn: T,
  hashFn: (...args: Parameters<T>) => string,
  maxResultsCached = -1
): (...args: Parameters<T>) => ReturnType<T> {
  /* 
  function memoization, with user-provided hash.  hashFn must return a
  key which will be unique as a Map key (ie, obeys "sameValueZero" algorithm
  as defined in the JS spec).  For more info on hash key, see:
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#Key_equality
  */
  const cache = new Map();
  const wrap = function wrap(...args: Parameters<T>): ReturnType<T> {
    const key = hashFn(...args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);

    if (maxResultsCached > -1 && cache.size > maxResultsCached) {
      /* Least recent insertion deletion */
      cache.delete(cache.keys().next().value);
    }

    return result;
  };

  wrap.clear = function clear() {
    /* clear memoization cache */
    cache.clear();
  };

  return wrap;
}
