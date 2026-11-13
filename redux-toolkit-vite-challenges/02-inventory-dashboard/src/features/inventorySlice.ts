import {
  createEntityAdapter,
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import type { RootState } from '../app/store';

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  openingStock: number;
  threshold: number;
  unitCost: number;
  archived: boolean;
};

export type LedgerEvent = {
  id: string;
  productId: string;
  delta: number;
  reason: string;
  createdAt: string;
  reversesEventId?: string;
};


const STORAGE_KEY = 'inventory-stock-ledger-v1';
const SCHEMA_VERSION = 1;

export const productsAdapter = createEntityAdapter<Product>({
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

const seedProducts: Product[] = [
  { id: 'p1', sku: 'SKU-001', name: 'Keyboard', category: 'Accessories', openingStock: 8, threshold: 3, unitCost: 45, archived: false },
  { id: 'p2', sku: 'SKU-002', name: 'Wireless Mouse', category: 'Accessories', openingStock: 2, threshold: 5, unitCost: 18, archived: false },
  { id: 'p3', sku: 'SKU-003', name: 'Monitor', category: 'Electronics', openingStock: 12, threshold: 4, unitCost: 220, archived: false },
];



function isValidProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const p = value as Product;
  return typeof p.id === 'string' && p.id.length > 0
    && typeof p.sku === 'string' && p.sku.trim().length > 0
    && typeof p.name === 'string' && p.name.trim().length > 0
    && typeof p.category === 'string' && p.category.trim().length > 0
    && Number.isInteger(p.openingStock) && p.openingStock >= 0
    && Number.isInteger(p.threshold) && p.threshold >= 0
    && Number.isFinite(p.unitCost) && p.unitCost >= 0
    && typeof p.archived === 'boolean';
}

function isValidLedgerEvent(value: unknown): value is LedgerEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as LedgerEvent;
  return typeof e.id === 'string' && e.id.length > 0
    && typeof e.productId === 'string' && e.productId.length > 0
    && Number.isInteger(e.delta) && e.delta !== 0
    && typeof e.reason === 'string' && e.reason.trim().length > 0
    && typeof e.createdAt === 'string';
}

function buildState(products: Product[], ledger: LedgerEvent[], message = '') {
  return {
    ...productsAdapter.getInitialState(),
    ...productsAdapter.setAll(productsAdapter.getInitialState(), products),
    ledger,
    message,
  };
}

function validateInventoryPayload(data: unknown): data is { schemaVersion: number; products: Product[]; ledger: LedgerEvent[] } {
  if (!data || typeof data !== 'object') return false;
  const d = data as { schemaVersion?: number; products?: unknown; ledger?: unknown };
  if (d.schemaVersion !== SCHEMA_VERSION || !Array.isArray(d.products) || !Array.isArray(d.ledger)) return false;
  if (!d.products.every(isValidProduct) || !d.ledger.every(isValidLedgerEvent)) return false;
  const ids = new Set<string>();
  const skus = new Set<string>();
  for (const p of d.products) {
    if (ids.has(p.id) || skus.has(p.sku.trim().toLowerCase())) return false;
    ids.add(p.id);
    skus.add(p.sku.trim().toLowerCase());
  }
  const productIds = new Set(d.products.map(p => p.id));
  if (!d.ledger.every(e => productIds.has(e.productId))) return false;
  return true;
}

function loadSavedState() {
  try {
    if (typeof localStorage === 'undefined') return buildState(seedProducts, []);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildState(seedProducts, []);
    const parsed: unknown = JSON.parse(raw);
    if (!validateInventoryPayload(parsed)) return buildState(seedProducts, []);
    return buildState(parsed.products, parsed.ledger);
  } catch {
    return buildState(seedProducts, []);
  }
}

const initialState = loadSavedState();

export type InventoryState = ReturnType<typeof buildState>;

function getProductStock(state: InventoryState, productId: string) {
  const product = state.entities[productId];
  if (!product) return 0;
  return product.openingStock + state.ledger
    .filter(event => event.productId === productId)
    .reduce((sum, event) => sum + event.delta, 0);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    addProduct: {
      reducer(state, action: PayloadAction<Product>) {
        const product = action.payload;
        const duplicate = Object.values(state.entities).some(
          p => p?.sku.trim().toLowerCase() === product.sku.trim().toLowerCase(),
        );
        if (duplicate) {
          state.message = `SKU "${product.sku}" already exists.`;
          return;
        }
        productsAdapter.addOne(state, product);
        state.message = 'Product added successfully.';
      },
      prepare(input: Omit<Product, 'id' | 'archived'> & { id?: string }) {
        return { payload: { ...input, id: input.id ?? makeId(), archived: false } };
      },
    },
    renameProduct(state, action: PayloadAction<{ id: string; name: string }>) {
      const product = state.entities[action.payload.id];
      const name = action.payload.name.trim();
      if (!product || !name) {
        state.message = 'Enter a valid product name.';
        return;
      }
      productsAdapter.updateOne(state, { id: product.id, changes: { name } });
      state.message = 'Product renamed.';
    },
    archiveProduct(state, action: PayloadAction<string>) {
      const product = state.entities[action.payload];
      if (!product) return;
      productsAdapter.updateOne(state, { id: product.id, changes: { archived: true } });
      state.message = 'Product archived.';
    },
    unarchiveProduct(state, action: PayloadAction<string>) {
      const product = state.entities[action.payload];
      if (!product) return;
      productsAdapter.updateOne(state, { id: product.id, changes: { archived: false } });
      state.message = 'Product restored.';
    },
    stockIn: {
      reducer(state, action: PayloadAction<{ productId: string; quantity: number; reason: string; id: string }>) {
        const { productId, quantity, reason, id } = action.payload;
        const product = state.entities[productId];
        if (!product || product.archived || !Number.isInteger(quantity) || quantity <= 0 || !reason.trim()) {
          state.message = 'Invalid stock-in event.';
          return;
        }
        state.ledger.push({ id, productId, delta: quantity, reason: reason.trim(), createdAt: new Date().toISOString() });
        state.message = `${quantity} unit(s) added to stock.`;
      },
      prepare(payload: { productId: string; quantity: number; reason: string }) {
        return { payload: { ...payload, id: makeId() } };
      },
    },
    stockOut: {
      reducer(state, action: PayloadAction<{ productId: string; quantity: number; reason: string; id: string }>) {
        const { productId, quantity, reason, id } = action.payload;
        const product = state.entities[productId];
        if (!product || product.archived || !Number.isInteger(quantity) || quantity <= 0 || !reason.trim()) {
          state.message = 'Invalid stock-out event.';
          return;
        }
        const available = getProductStock(state, productId);
        if (quantity > available) {
          state.message = `Not enough stock. Available: ${available}.`;
          return;
        }
        state.ledger.push({ id, productId, delta: -quantity, reason: reason.trim(), createdAt: new Date().toISOString() });
        state.message = `${quantity} unit(s) removed from stock.`;
      },
      prepare(payload: { productId: string; quantity: number; reason: string }) {
        return { payload: { ...payload, id: makeId() } };
      },
    },
    undoLatestStockEvent(state) {
      const latest = state.ledger[state.ledger.length - 1];
      if (!latest) {
        state.message = 'There is no stock event to undo.';
        return;
      }
      const product = state.entities[latest.productId];
      if (!product) {
        state.message = 'Cannot undo: product no longer exists.';
        return;
      }
      const currentStock = getProductStock(state, latest.productId);
      const compensatingDelta = -latest.delta;
      if (currentStock + compensatingDelta < 0) {
        state.message = 'Undo rejected because it would create negative stock.';
        return;
      }
      state.ledger.push({
        id: makeId(),
        productId: latest.productId,
        delta: compensatingDelta,
        reason: `Undo: ${latest.reason}`,
        createdAt: new Date().toISOString(),
        reversesEventId: latest.id,
      });
      state.message = 'Latest stock event was reversed with a compensating event.';
    },
    clearMessage(state) {
      state.message = '';
    },
    importInventory(state, action: PayloadAction<unknown>) {
      if (!validateInventoryPayload(action.payload)) {
        state.message = 'Import rejected: invalid JSON schema or data.';
        return;
      }
      const products = action.payload.products;
      const ledger = action.payload.ledger;
      const stockByProduct = new Map(products.map(p => [p.id, p.openingStock]));
      for (const event of ledger) {
        const next = (stockByProduct.get(event.productId) ?? 0) + event.delta;
        if (next < 0) {
          state.message = 'Import rejected: ledger would create negative stock.';
          return;
        }
        stockByProduct.set(event.productId, next);
      }
      productsAdapter.setAll(state, products);
      state.ledger = ledger;
      state.message = 'Inventory imported successfully.';
    },
  },
});

export const {
  addProduct, renameProduct, archiveProduct, unarchiveProduct,
  stockIn, stockOut, undoLatestStockEvent, clearMessage, importInventory,
} = inventorySlice.actions;

const adapterSelectors = productsAdapter.getSelectors<RootState>(state => state.inventory);
export const selectProductEntities = adapterSelectors.selectEntities;
export const selectAllProducts = adapterSelectors.selectAll;
export const selectActiveProducts = createSelector(selectAllProducts, products => products.filter(p => !p.archived));
export const selectCategories = createSelector(selectAllProducts, products => [...new Set(products.map(p => p.category))].sort());
export const selectProductStock = (state: RootState, productId: string) => {
  const product = state.inventory.entities[productId];
  if (!product) return 0;
  return product.openingStock + state.inventory.ledger
    .filter(event => event.productId === productId)
    .reduce((sum, event) => sum + event.delta, 0);
};
export const selectLowStockProducts = createSelector(
  [selectActiveProducts, (state: RootState) => state.inventory.ledger],
  (products, ledger) => products.filter(product => {
    const stock = product.openingStock + ledger
      .filter(event => event.productId === product.id)
      .reduce((sum, event) => sum + event.delta, 0);
    return stock <= product.threshold;
  }),
);
export const selectFilteredProducts = createSelector(
  [
    selectActiveProducts,
    (_: RootState, filters: { category: string; search: string; sort: string }) => filters,
    (state: RootState) => state.inventory.ledger,
  ],
  (products, filters, ledger) => {
    const filtered = products.filter(product => {
      const categoryMatch = filters.category === 'All' || product.category === filters.category;
      const query = filters.search.trim().toLowerCase();
      const searchMatch = !query || product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    }).map(product => ({
      ...product,
      availableStock: product.openingStock + ledger
        .filter(event => event.productId === product.id)
        .reduce((sum, event) => sum + event.delta, 0),
    }));
    if (filters.sort === 'stock-asc') filtered.sort((a, b) => a.availableStock - b.availableStock);
    else if (filters.sort === 'stock-desc') filtered.sort((a, b) => b.availableStock - a.availableStock);
    else if (filters.sort === 'name-desc') filtered.sort((a, b) => b.name.localeCompare(a.name));
    else filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  },
);
export const selectInventoryValuationByCategory = createSelector(
  [selectActiveProducts, (state: RootState) => state.inventory.ledger],
  (products, ledger) => {
    const report: Record<string, { units: number; valuation: number }> = {};
    for (const product of products) {
      const stock = product.openingStock + ledger
        .filter(event => event.productId === product.id)
        .reduce((sum, event) => sum + event.delta, 0);
      if (!report[product.category]) report[product.category] = { units: 0, valuation: 0 };
      report[product.category].units += stock;
      report[product.category].valuation += stock * product.unitCost;
    }
    return report;
  },
);

export function exportInventory(state: RootState) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    products: selectAllProducts(state),
    ledger: state.inventory.ledger,
  };
}

export function isValidImport(data: unknown) {
  return validateInventoryPayload(data);
}

export default inventorySlice.reducer;