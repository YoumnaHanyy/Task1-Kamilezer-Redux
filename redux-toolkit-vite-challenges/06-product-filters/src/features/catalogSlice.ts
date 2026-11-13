import {
  createSlice,
  createSelector,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { RootState } from '../app/store';

// ==================== TYPES ====================

export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  rating: number;
  stock: number;
};

export type SortOption =
  | 'default'
  | 'price-low'
  | 'price-high'
  | 'rating-high'
  | 'name';

export type CatalogFilters = {
  query: string;
  categories: string[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
  minRating: number;
  availability: 'all' | 'in-stock' | 'out-of-stock';
  sort: SortOption;
};

type CatalogState = {
  products: Product[];
  filters: CatalogFilters;
  page: number;
  pageSize: number;
};

// ==================== MOCK DATA ====================

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Trail Shoes',
    category: 'Shoes',
    brand: 'Peak',
    price: 90,
    rating: 4.5,
    stock: 4,
  },
  {
    id: '2',
    name: 'Daypack',
    category: 'Bags',
    brand: 'Path',
    price: 55,
    rating: 4.2,
    stock: 0,
  },
  {
    id: '3',
    name: 'Running Shoes',
    category: 'Shoes',
    brand: 'SportX',
    price: 120,
    rating: 4.8,
    stock: 12,
  },
  {
    id: '4',
    name: 'Leather Backpack',
    category: 'Bags',
    brand: 'Peak',
    price: 150,
    rating: 4.7,
    stock: 5,
  },
  {
    id: '5',
    name: 'Cotton T-Shirt',
    category: 'Clothing',
    brand: 'Urban',
    price: 25,
    rating: 4.1,
    stock: 20,
  },
  {
    id: '6',
    name: 'Sports Jacket',
    category: 'Clothing',
    brand: 'SportX',
    price: 85,
    rating: 4.6,
    stock: 0,
  },
  {
    id: '7',
    name: 'Hiking Boots',
    category: 'Shoes',
    brand: 'Peak',
    price: 180,
    rating: 4.9,
    stock: 3,
  },
  {
    id: '8',
    name: 'Travel Bag',
    category: 'Bags',
    brand: 'Path',
    price: 75,
    rating: 3.9,
    stock: 8,
  },
  {
    id: '9',
    name: 'Casual Hoodie',
    category: 'Clothing',
    brand: 'Urban',
    price: 65,
    rating: 4.3,
    stock: 6,
  },
  {
    id: '10',
    name: 'Walking Shoes',
    category: 'Shoes',
    brand: 'SportX',
    price: 70,
    rating: 4.0,
    stock: 0,
  },
];

// ==================== DEFAULT FILTERS ====================

export const defaultFilters: CatalogFilters = {
  query: '',
  categories: [],
  brands: [],
  minPrice: 0,
  maxPrice: 500,
  minRating: 0,
  availability: 'all',
  sort: 'default',
};

// ==================== INITIAL STATE ====================

const initialState: CatalogState = {
  products: initialProducts,
  filters: defaultFilters,
  page: 1,
  pageSize: 6,
};

// ==================== SLICE ====================

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,

  reducers: {
    // Update any filters and reset pagination.
    setFilters(
      state,
      action: PayloadAction<Partial<CatalogFilters>>
    ) {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };

      state.page = 1;
    },

    // Restore filters from URL.
    restoreFilters(
      state,
      action: PayloadAction<Partial<CatalogFilters>>
    ) {
      state.filters = {
        ...defaultFilters,
        ...action.payload,
      };

      state.page = 1;
    },

    // Change current page.
    setPage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },

    // Change products per page.
    setPageSize(state, action: PayloadAction<number>) {
      state.pageSize = Math.max(1, action.payload);
      state.page = 1;
    },

    // Reset all filters.
    resetFilters(state) {
      state.filters = { ...defaultFilters };
      state.page = 1;
    },
  },
});

// ==================== ACTIONS ====================

export const {
  setFilters,
  restoreFilters,
  setPage,
  setPageSize,
  resetFilters,
} = catalogSlice.actions;

// ==================== BASIC SELECTORS ====================

export const selectProducts = (state: RootState) =>
  state.catalog.products;

export const selectFilters = (state: RootState) =>
  state.catalog.filters;

export const selectPage = (state: RootState) =>
  state.catalog.page;

export const selectPageSize = (state: RootState) =>
  state.catalog.pageSize;

// ==================== FILTERED PRODUCTS ====================

export const selectFilteredProducts = createSelector(
  [selectProducts, selectFilters],
  (products, filters) => {
    let result = [...products];

    // Keyword search
    if (filters.query.trim()) {
      const keyword = filters.query.toLowerCase().trim();

      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(keyword) ||
          product.brand.toLowerCase().includes(keyword) ||
          product.category.toLowerCase().includes(keyword)
      );
    }

    // Multiple categories
    if (filters.categories.length > 0) {
      result = result.filter((product) =>
        filters.categories.includes(product.category)
      );
    }

    // Multiple brands
    if (filters.brands.length > 0) {
      result = result.filter((product) =>
        filters.brands.includes(product.brand)
      );
    }

    // Price range
    result = result.filter(
      (product) =>
        product.price >= filters.minPrice &&
        product.price <= filters.maxPrice
    );

    // Minimum rating
    result = result.filter(
      (product) => product.rating >= filters.minRating
    );

    // Availability
    if (filters.availability === 'in-stock') {
      result = result.filter((product) => product.stock > 0);
    }

    if (filters.availability === 'out-of-stock') {
      result = result.filter((product) => product.stock === 0);
    }

    // Sorting
    switch (filters.sort) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;

      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;

      case 'rating-high':
        result.sort((a, b) => b.rating - a.rating);
        break;

      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;

      default:
        break;
    }

    return result;
  }
);

// ==================== PAGINATION ====================

export const selectTotalPages = createSelector(
  [selectFilteredProducts, selectPageSize],
  (products, pageSize) =>
    Math.max(1, Math.ceil(products.length / pageSize))
);

export const selectPaginatedProducts = createSelector(
  [selectFilteredProducts, selectPage, selectPageSize],
  (products, page, pageSize) => {
    const start = (page - 1) * pageSize;

    return products.slice(start, start + pageSize);
  }
);

export const selectResultCount = createSelector(
  [selectFilteredProducts],
  (products) => products.length
);

// ==================== FACET COUNTS ====================

// Counts for each category, considering all other filters
// except the currently selected categories.
export const selectCategoryCounts = createSelector(
  [selectProducts, selectFilters],
  (products, filters) => {
    const otherFilters = {
      ...filters,
      categories: [],
    };

    const counts: Record<string, number> = {};

    for (const product of products) {
      const matchesKeyword =
        !otherFilters.query ||
        product.name
          .toLowerCase()
          .includes(otherFilters.query.toLowerCase()) ||
        product.brand
          .toLowerCase()
          .includes(otherFilters.query.toLowerCase()) ||
        product.category
          .toLowerCase()
          .includes(otherFilters.query.toLowerCase());

      const matchesBrand =
        otherFilters.brands.length === 0 ||
        otherFilters.brands.includes(product.brand);

      const matchesPrice =
        product.price >= otherFilters.minPrice &&
        product.price <= otherFilters.maxPrice;

      const matchesRating =
        product.rating >= otherFilters.minRating;

      const matchesAvailability =
        otherFilters.availability === 'all' ||
        (otherFilters.availability === 'in-stock' &&
          product.stock > 0) ||
        (otherFilters.availability === 'out-of-stock' &&
          product.stock === 0);

      if (
        matchesKeyword &&
        matchesBrand &&
        matchesPrice &&
        matchesRating &&
        matchesAvailability
      ) {
        counts[product.category] =
          (counts[product.category] || 0) + 1;
      }
    }

    return counts;
  }
);

export default catalogSlice.reducer;