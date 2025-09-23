const { webcrypto } = require('crypto');

const fallback = (() => {
  let counter = 0;
  return {
    randomUUID: () => `00000000-0000-0000-0000-${(counter++).toString().padStart(12, '0')}`
  };
})();

const cryptoImpl = globalThis.crypto || webcrypto || fallback;

if (!cryptoImpl.randomUUID) {
  let counter = 0;
  cryptoImpl.randomUUID = () => `00000000-0000-0000-0000-${(counter++).toString().padStart(12, '0')}`;
}

Object.defineProperty(globalThis, 'crypto', {
  value: cryptoImpl,
  configurable: true,
  writable: true
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: cryptoImpl,
    configurable: true,
    writable: true
  });
}
