import '@testing-library/jest-dom/vitest'

const store = new Map<string, string>()

const localStorageMock: Storage = {
	getItem: (key) => (store.has(key) ? store.get(key)! : null),
	setItem: (key, value) => {
		store.set(key, String(value))
	},
	removeItem: (key) => {
		store.delete(key)
	},
	clear: () => {
		store.clear()
	},
	key: (index) => Array.from(store.keys())[index] ?? null,
	get length() {
		return store.size
	},
}

Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	configurable: true,
})

