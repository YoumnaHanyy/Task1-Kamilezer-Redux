import { useMemo, useState, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import './style.css';
import {
  addProduct, archiveProduct, exportInventory, importInventory, renameProduct,
  selectCategories, selectFilteredProducts, selectInventoryValuationByCategory,
  selectLowStockProducts, selectProductStock, stockIn, stockOut,
  undoLatestStockEvent, unarchiveProduct,
} from './features/inventorySlice';
import type { RootState } from './app/store';

export default function App() {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectCategories);
  const lowStock = useAppSelector(selectLowStockProducts);
  const ledger = useAppSelector((state: RootState) => state.inventory.ledger);
  const message = useAppSelector((state: RootState) => state.inventory.message);
  const allProducts = useAppSelector((state: RootState) => Object.values(state.inventory.entities).filter(Boolean));
  const valuation = useAppSelector(selectInventoryValuationByCategory);

  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
  const filters = useMemo(() => ({ category, search, sort }), [category, search, sort]);
  const products = useAppSelector((state: RootState) => selectFilteredProducts(state, filters));

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [newCategory, setNewCategory] = useState('Accessories');
  const [openingStock, setOpeningStock] = useState('0');
  const [threshold, setThreshold] = useState('3');
  const [unitCost, setUnitCost] = useState('0');
  const [eventProduct, setEventProduct] = useState('p1');
  const [eventQuantity, setEventQuantity] = useState('1');
  const [eventReason, setEventReason] = useState('Stock adjustment');
  const [renameValues, setRenameValues] = useState<Record<string, string>>({});
  const [importText, setImportText] = useState('');

  function handleAddProduct(event: FormEvent) {
    event.preventDefault();
    dispatch(addProduct({
      name, sku, category: newCategory,
      openingStock: Number(openingStock), threshold: Number(threshold), unitCost: Number(unitCost),
    }));
    setName(''); setSku('');
  }

  function handleExport() {
    const payload = exportInventory({ inventory: {
      ids: allProducts.map(p => p!.id),
      entities: Object.fromEntries(allProducts.map(p => [p!.id, p])),
      ledger, message,
    } } as RootState);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'inventory-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(event: FormEvent) {
    event.preventDefault();
    try { dispatch(importInventory(JSON.parse(importText))); }
    catch { alert('Please enter valid JSON.'); }
  }

  return (
    <main className="container">
      <header className="hero">
        <div>
          <p className="eyebrow">REDUX TOOLKIT · CHALLENGE 02</p>
          <h1>Inventory <span>&</span> Stock Ledger</h1>
          <p className="subtitle">A local inventory dashboard with an immutable stock movement history.</p>
        </div>
        <button className="secondary" onClick={handleExport}>Export JSON ↓</button>
      </header>

      {message && <div className="notice" role="status">{message}</div>}

      <section className="stats">
        <article className="stat-card"><span>Products</span><strong>{allProducts.length}</strong></article>
        <article className="stat-card"><span>Low stock alerts</span><strong className="warning-text">{lowStock.length}</strong></article>
        <article className="stat-card"><span>Ledger events</span><strong>{ledger.length}</strong></article>
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">CATALOG</p><h2>Products</h2></div></div>
        <div className="toolbar">
          <input placeholder="Search name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option>All</option>{categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option>
            <option value="stock-asc">Stock: low to high</option><option value="stock-desc">Stock: high to low</option>
          </select>
        </div>
        <div className="table-wrap"><table>
          <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Available</th><th>Threshold</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map(product => <tr key={product.id}>
              <td><strong>{product.name}</strong></td><td>{product.sku}</td><td>{product.category}</td>
              <td><strong>{product.availableStock}</strong></td><td>{product.threshold}</td>
              <td>{product.availableStock <= product.threshold ? <span className="pill low">Low stock</span> : <span className="pill good">In stock</span>}</td>
              <td className="actions">
                <button className="small" onClick={() => dispatch(stockIn({ productId: product.id, quantity: 1, reason: 'Quick stock-in' }))}>+1</button>
                <button className="small" onClick={() => dispatch(stockOut({ productId: product.id, quantity: 1, reason: 'Quick stock-out' }))}>−1</button>
                <button className="small secondary" onClick={() => dispatch(archiveProduct(product.id))}>Archive</button>
              </td>
            </tr>)}
            {products.length === 0 && <tr><td colSpan={7} className="empty">No products match your filters.</td></tr>}
          </tbody>
        </table></div>
      </section>

      <div className="two-columns">
        <section className="panel">
          <p className="eyebrow">NEW ITEM</p><h2>Add product</h2>
          <form className="form-grid" onSubmit={handleAddProduct}>
            <label>Product name<input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Headphones" /></label>
            <label>SKU<input required value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. SKU-004" /></label>
            <label>Category<input required value={newCategory} onChange={e => setNewCategory(e.target.value)} /></label>
            <label>Opening stock<input type="number" min="0" step="1" required value={openingStock} onChange={e => setOpeningStock(e.target.value)} /></label>
            <label>Low-stock threshold<input type="number" min="0" step="1" required value={threshold} onChange={e => setThreshold(e.target.value)} /></label>
            <label>Unit cost<input type="number" min="0" step="0.01" required value={unitCost} onChange={e => setUnitCost(e.target.value)} /></label>
            <button className="primary" type="submit">Add product</button>
          </form>
        </section>

        <section className="panel">
          <p className="eyebrow">STOCK MOVEMENT</p><h2>Record event</h2>
          <form className="form-grid" onSubmit={e => {
            e.preventDefault();
            dispatch(stockIn({ productId: eventProduct, quantity: Number(eventQuantity), reason: eventReason }));
          }}>
            <label>Product<select value={eventProduct} onChange={e => setEventProduct(e.target.value)}>
              {allProducts.filter(p => p && !p.archived).map(p => <option key={p!.id} value={p!.id}>{p!.name}</option>)}
            </select></label>
            <label>Quantity<input type="number" min="1" step="1" value={eventQuantity} onChange={e => setEventQuantity(e.target.value)} /></label>
            <label>Reason<input value={eventReason} onChange={e => setEventReason(e.target.value)} required /></label>
            <div className="button-row">
              <button className="primary" type="submit">Stock in</button>
              <button className="secondary" type="button" onClick={() => dispatch(stockOut({ productId: eventProduct, quantity: Number(eventQuantity), reason: eventReason }))}>Stock out</button>
            </div>
          </form>
          <button className="text-button" onClick={() => dispatch(undoLatestStockEvent())}>↶ Undo latest stock event</button>
        </section>
      </div>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">ATTENTION</p><h2>Low-stock alerts</h2></div></div>
        {lowStock.length ? <div className="alert-list">{lowStock.map(p => <div key={p.id}><strong>{p.name}</strong><span>{selectProductStock({ inventory: { ids: allProducts.map(x => x!.id), entities: Object.fromEntries(allProducts.map(x => [x!.id, x])), ledger, message } } as RootState, p.id)} units remaining · threshold {p.threshold}</span></div>)}</div> : <p className="muted">All active products are above their stock thresholds.</p>}
      </section>

      <section className="panel">
        <p className="eyebrow">AUDIT TRAIL</p><h2>Stock ledger</h2>
        {ledger.length ? <div className="table-wrap"><table>
          <thead><tr><th>Time</th><th>Product</th><th>Movement</th><th>Reason</th><th>Reference</th></tr></thead>
          <tbody>{[...ledger].reverse().map(event => <tr key={event.id}>
            <td>{new Date(event.createdAt).toLocaleString()}</td>
            <td>{allProducts.find(p => p?.id === event.productId)?.name ?? 'Unknown'}</td>
            <td className={event.delta > 0 ? 'positive' : 'negative'}>{event.delta > 0 ? '+' : ''}{event.delta}</td>
            <td>{event.reason}</td><td>{event.reversesEventId ? `Undo ${event.reversesEventId.slice(0, 8)}` : '—'}</td>
          </tr>)}</tbody>
        </table></div> : <p className="muted">No stock movements yet.</p>}
      </section>

      <div className="two-columns">
        <section className="panel">
          <p className="eyebrow">ARCHIVE</p><h2>Archived products</h2>
          {allProducts.filter(p => p?.archived).map(p => <div className="archive-row" key={p!.id}><span>{p!.name} · {p!.sku}</span><button className="small secondary" onClick={() => dispatch(unarchiveProduct(p!.id))}>Unarchive</button></div>)}
          {!allProducts.some(p => p?.archived) && <p className="muted">No archived products.</p>}
          <h3>Rename product</h3>
          {allProducts.filter(p => p && !p.archived).map(p => <div className="rename-row" key={p!.id}>
            <input value={renameValues[p!.id] ?? p!.name} onChange={e => setRenameValues(prev => ({ ...prev, [p!.id]: e.target.value }))} />
            <button className="small secondary" onClick={() => dispatch(renameProduct({ id: p!.id, name: renameValues[p!.id] ?? p!.name }))}>Save</button>
          </div>)}
        </section>

        <section className="panel">
          <p className="eyebrow">DATA PORTABILITY</p><h2>Import JSON</h2>
          <form onSubmit={handleImport}>
            <textarea rows={7} value={importText} onChange={e => setImportText(e.target.value)} placeholder={'Paste exported JSON here...'} />
            <button className="primary" type="submit">Validate & import</button>
          </form>
          <p className="hint">Import requires schemaVersion 1, valid products, unique IDs/SKUs, and valid ledger references.</p>
        </section>
      </div>

      <section className="panel">
        <p className="eyebrow">BONUS</p><h2>Inventory by category</h2>
        <div className="valuation-grid">{Object.entries(valuation).map(([key, value]) => <div className="valuation-card" key={key}><span>{key}</span><strong>{value.units} units</strong><small>Inventory value: {value.valuation.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</small></div>)}</div>
      </section>
      <footer>Inventory data is stored locally in this browser. No API calls are made.</footer>
    </main>
  );
}