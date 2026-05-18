import { beforeEach } from 'vitest'

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key) {
      return store.get(String(key)) ?? null
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key) {
      store.delete(String(key))
    },
    setItem(key, value) {
      store.set(String(key), String(value))
    },
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: createMemoryStorage(),
  writable: true,
})

beforeEach(() => {
  globalThis.localStorage.clear()
})
