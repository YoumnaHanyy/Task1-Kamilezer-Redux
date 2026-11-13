import { useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from './app/store';

import {
  setFilters,
  restoreFilters,
  setPage,
  setPageSize,
  resetFilters,
  selectFilters,
  selectPaginatedProducts,
  selectFilteredProducts,
  selectPage,
  selectPageSize,
  selectTotalPages,
  selectResultCount,
  selectCategoryCounts,
  type CatalogFilters,
  type SortOption,
} from './features/catalogSlice';

import './style.css';

// ==================== URL HELPERS ====================

function readFiltersFromURL(): Partial<CatalogFilters> {
  const params = new URLSearchParams(window.location.search);

  const availability = params.get('availability');
  const sort = params.get('sort');

  const minPrice = Number(params.get('minPrice'));
  const maxPrice = Number(params.get('maxPrice'));
  const minRating = Number(params.get('minRating'));

  return {
    query: params.get('query') || '',
    categories: params.getAll('category'),
    brands: params.getAll('brand'),

    minPrice: Number.isFinite(minPrice) && params.has('minPrice')
      ? Math.max(0, minPrice)
      : 0,

    maxPrice: Number.isFinite(maxPrice) && params.has('maxPrice')
      ? Math.max(0, maxPrice)
      : 500,

    minRating: Number.isFinite(minRating) && params.has('minRating')
      ? Math.min(5, Math.max(0, minRating))
      : 0,

    availability:
      availability === 'in-stock' ||
      availability === 'out-of-stock'
        ? availability
        : 'all',

    sort:
      sort === 'price-low' ||
      sort === 'price-high' ||
      sort === 'rating-high' ||
      sort === 'name'
        ? sort
        : 'default',
  };
}

function writeFiltersToURL(filters: CatalogFilters) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set('query', filters.query);
  }

  filters.categories.forEach((category) => {
    params.append('category', category);
  });

  filters.brands.forEach((brand) => {
    params.append('brand', brand);
  });

  if (filters.minPrice !== 0) {
    params.set('minPrice', String(filters.minPrice));
  }

  if (filters.maxPrice !== 500) {
    params.set('maxPrice', String(filters.maxPrice));
  }

  if (filters.minRating !== 0) {
    params.set('minRating', String(filters.minRating));
  }

  if (filters.availability !== 'all') {
    params.set('availability', filters.availability);
  }

  if (filters.sort !== 'default') {
    params.set('sort', filters.sort);
  }

  const queryString = params.toString();

  const newURL = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  window.history.pushState({}, '', newURL);
}

// ==================== APP ====================

export default function App() {
  const dispatch = useAppDispatch();

  const filters = useAppSelector(selectFilters);
  const products = useAppSelector(selectPaginatedProducts);
  const allFilteredProducts = useAppSelector(selectFilteredProducts);

  const page = useAppSelector(selectPage);
  const pageSize = useAppSelector(selectPageSize);
  const totalPages = useAppSelector(selectTotalPages);
  const resultCount = useAppSelector(selectResultCount);
  const categoryCounts = useAppSelector(selectCategoryCounts);

  const firstRender = useRef(true);
  const skipNextURLUpdate = useRef(false);

  const categories = ['Shoes', 'Bags', 'Clothing'];
  const brands = ['Peak', 'Path', 'SportX', 'Urban'];

  // ==================== RESTORE URL ON FIRST LOAD ====================

  useEffect(() => {
    dispatch(restoreFilters(readFiltersFromURL()));
  }, [dispatch]);

  // ==================== SYNC FILTERS TO URL ====================

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (skipNextURLUpdate.current) {
      skipNextURLUpdate.current = false;
      return;
    }

    writeFiltersToURL(filters);
  }, [filters]);

  // ==================== BACK / FORWARD NAVIGATION ====================

  useEffect(() => {
    function handlePopState() {
      skipNextURLUpdate.current = true;
      dispatch(restoreFilters(readFiltersFromURL()));
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [dispatch]);

  // ==================== FILTER HANDLERS ====================

  function toggleCategory(category: string) {
    const updated = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];

    dispatch(setFilters({ categories: updated }));
  }

  function toggleBrand(brand: string) {
    const updated = filters.brands.includes(brand)
      ? filters.brands.filter((item) => item !== brand)
      : [...filters.brands, brand];

    dispatch(setFilters({ brands: updated }));
  }

  function handleReset() {
    dispatch(resetFilters());
  }

  // ==================== UI ====================

  return (
    <main className="container catalog-container">

      {/* HEADER */}

      <header className="catalog-header">
        <p className="eyebrow">
          REDUX TOOLKIT Â· CHALLENGE 06
        </p>

        <h1>Product Catalog</h1>

        <p className="subtitle">
          Find the right products using advanced filters.
        </p>
      </header>

      {/* SEARCH */}

      <section className="panel catalog-search">
        <input
          type="search"
          placeholder="Search products, brands or categories..."
          value={filters.query}
          onChange={(event) =>
            dispatch(setFilters({ query: event.target.value }))
          }
        />
      </section>

      <div className="catalog-layout">

        {/* SIDEBAR FILTERS */}

        <aside className="panel filter-sidebar">
          <div className="filter-heading">
            <h2>Filters</h2>

            <button
              type="button"
              className="text-button"
              onClick={handleReset}
            >
              Reset all
            </button>
          </div>

          {/* CATEGORY */}

          <div className="filter-group">
            <h3>Category</h3>

            {categories.map((category) => (
              <label className="filter-option" key={category}>
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => toggleCategory(category)}
                />

                <span>{category}</span>

                <small>{categoryCounts[category] || 0}</small>
              </label>
            ))}
          </div>

          {/* BRAND */}

          <div className="filter-group">
            <h3>Brand</h3>

            {brands.map((brand) => (
              <label className="filter-option" key={brand}>
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                />

                <span>{brand}</span>
              </label>
            ))}
          </div>

          {/* PRICE RANGE */}

          <div className="filter-group">
            <h3>Price Range</h3>

            <div className="price-inputs">
              <label>
                <span>Min ($)</span>

                <input
                  type="number"
                  min="0"
                  value={filters.minPrice}
                  onChange={(event) => {
                    const value = Math.max(
                      0,
                      Number(event.target.value)
                    );

                    dispatch(
                      setFilters({
                        minPrice: Math.min(value, filters.maxPrice),
                      })
                    );
                  }}
                />
              </label>

              <label>
                <span>Max ($)</span>

                <input
                  type="number"
                  min="0"
                  value={filters.maxPrice}
                  onChange={(event) => {
                    const value = Math.max(
                      0,
                      Number(event.target.value)
                    );

                    dispatch(
                      setFilters({
                        maxPrice: Math.max(value, filters.minPrice),
                      })
                    );
                  }}
                />
              </label>
            </div>
          </div>

          {/* RATING */}

          <div className="filter-group">
            <h3>Minimum Rating</h3>

            <select
              value={filters.minRating}
              onChange={(event) =>
                dispatch(
                  setFilters({
                    minRating: Number(event.target.value),
                  })
                )
              }
            >
              <option value="0">All Ratings</option>
              <option value="3">3+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="4.5">4.5+ Stars</option>
            </select>
          </div>

          {/* AVAILABILITY */}

          <div className="filter-group">
            <h3>Availability</h3>

            <select
              value={filters.availability}
              onChange={(event) =>
                dispatch({
                  type: 'catalog/setFilters',
                  payload: {
                    availability: event.target.value as
                      CatalogFilters['availability'],
                  },
                })
              }
            >
              <option value="all">All Products</option>
              <option value="in-stock">In Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </aside>

        {/* PRODUCTS AREA */}

        <section className="catalog-results">

          {/* TOOLBAR */}

          <div className="panel results-toolbar">
            <div>
              <h2>Products</h2>

              <p>
                Showing {products.length} of {resultCount} products
              </p>
            </div>

            <div className="sort-control">
              <label htmlFor="sort-products">Sort by</label>

              <select
                id="sort-products"
                value={filters.sort}
                onChange={(event) =>
                  dispatch(
                    setFilters({
                      sort: event.target.value as SortOption,
                    })
                  )
                }
              >
                <option value="default">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating-high">Highest Rating</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* PRODUCT GRID */}

          {products.length === 0 ? (
            <div className="panel empty-products">
              <div className="empty-icon">âŒ•</div>

              <h2>No products found</h2>

              <p>
                Try changing your filters or search keyword.
              </p>

              <button type="button" onClick={handleReset}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    <span>{product.category}</span>
                    <div>ðŸ›ï¸</div>
                  </div>

                  <div className="product-details">
                    <div className="product-brand">
                      {product.brand}
                    </div>

                    <h3>{product.name}</h3>

                    <div className="product-rating">
                      <span>â˜…</span>
                      {product.rating.toFixed(1)}
                    </div>

                    <div className="product-bottom">
                      <strong>${product.price.toFixed(2)}</strong>

                      <span
                        className={
                          product.stock > 0
                            ? 'in-stock'
                            : 'out-stock'
                        }
                      >
                        {product.stock > 0
                          ? `${product.stock} in stock`
                          : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* PAGINATION */}

          <div className="pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => dispatch(setPage(page - 1))}
            >
              â† Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => dispatch(setPage(page + 1))}
            >
              Next â†’
            </button>
          </div>

          {/* PAGE SIZE */}

          <div className="page-size">
            <label htmlFor="page-size">Products per page</label>

            <select
              id="page-size"
              value={pageSize}
              onChange={(event) =>
                dispatch(setPageSize(Number(event.target.value)))
              }
            >
              <option value="3">3</option>
              <option value="6">6</option>
              <option value="9">9</option>
            </select>
          </div>
        </section>
      </div>

      {/* DEBUG INFO */}

      <section className="panel debug-panel">
        <h3>Active URL</h3>

        <code>
          {window.location.pathname + window.location.search}
        </code>

        <p>
          Filters are stored in the URL. Try refreshing the page or
          using your browser's Back and Forward buttons.
        </p>
      </section>
    </main>
  );
}