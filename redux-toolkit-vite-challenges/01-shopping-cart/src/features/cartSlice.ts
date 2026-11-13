import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  color: string;
  size: string;
  unitPrice: number;
  quantity: number;
  stock: number;
  giftWrap: boolean;
};

export type CartState = {
  items: CartItem[];
  coupon: string | null;
  shippingMethod: "standard" | "express";
  lastRemoved: CartItem | null;
  message: string;
};

export type NewCartItem = Omit<CartItem, "key" | "giftWrap">;

const STORAGE_KEY = "advanced-shopping-cart";

const seedItems: CartItem[] = [
  {
    key: "shirt-blue-m",
    productId: "shirt",
    name: "Blue Shirt",
    color: "Blue",
    size: "M",
    unitPrice: 25,
    quantity: 1,
    stock: 8,
    giftWrap: false,
  },
];

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.key === "string" &&
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.color === "string" &&
    typeof item.size === "string" &&
    typeof item.giftWrap === "boolean" &&
    typeof item.unitPrice === "number" &&
    Number.isFinite(item.unitPrice) &&
    item.unitPrice >= 0 &&
    typeof item.stock === "number" &&
    Number.isInteger(item.stock) &&
    item.stock >= 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    item.quantity <= item.stock
  );
}

function isValidCartState(value: unknown): value is CartState {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;

  return (
    Array.isArray(data.items) &&
    data.items.every(isValidCartItem) &&
    (data.coupon === null ||
      data.coupon === "SAVE10" ||
      data.coupon === "FLAT20") &&
    (data.shippingMethod === "standard" ||
      data.shippingMethod === "express") &&
    (data.lastRemoved === null || isValidCartItem(data.lastRemoved)) &&
    typeof data.message === "string"
  );
}

function loadCartState(): CartState | undefined {
  try {
    if (typeof window === "undefined") return undefined;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return undefined;

    const parsed: unknown = JSON.parse(saved);
    return isValidCartState(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

const initialState: CartState = loadCartState() ?? {
  items: seedItems,
  coupon: null,
  shippingMethod: "standard",
  lastRemoved: null,
  message: "",
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<NewCartItem>) {
      const product = action.payload;

      if (
        !product.productId.trim() ||
        !product.name.trim() ||
        !product.color.trim() ||
        !product.size.trim() ||
        !Number.isInteger(product.quantity) ||
        product.quantity < 1 ||
        !Number.isInteger(product.stock) ||
        product.stock < 1 ||
        product.quantity > product.stock ||
        !Number.isFinite(product.unitPrice) ||
        product.unitPrice < 0
      ) {
        state.message = "Invalid product information or quantity.";
        return;
      }

      const key =
        `${product.productId}-${product.color}-${product.size}`.toLowerCase();

      const existing = state.items.find((item) => item.key === key);

      if (existing) {
        const nextQuantity = existing.quantity + product.quantity;

        if (nextQuantity > existing.stock) {
          state.message = "Not enough stock available.";
          return;
        }

        existing.quantity = nextQuantity;
      } else {
        state.items.push({
          ...product,
          key,
          giftWrap: false,
        });
      }

      state.lastRemoved = null;
      state.message = "Product added to cart.";
    },

    removeItem(state, action: PayloadAction<string>) {
      const item = state.items.find((product) => product.key === action.payload);
      if (!item) return;

      state.lastRemoved = { ...item };
      state.items = state.items.filter((product) => product.key !== action.payload);
      state.message = "Product removed. You can undo this action.";
    },

    updateQuantity(
      state,
      action: PayloadAction<{ key: string; quantity: number }>
    ) {
      const item = state.items.find((product) => product.key === action.payload.key);
      if (!item) return;

      const { quantity } = action.payload;

      if (!Number.isInteger(quantity) || quantity < 1) {
        state.message = "Quantity must be at least 1.";
        return;
      }

      if (quantity > item.stock) {
        state.message = "You reached the available stock limit.";
        return;
      }

      if (quantity === item.quantity) return;

      item.quantity = quantity;
      state.lastRemoved = null;
      state.message = "";
    },

    applyCoupon(state, action: PayloadAction<string>) {
      const code = action.payload.trim().toUpperCase();

      if (code !== "SAVE10" && code !== "FLAT20") {
        state.message = "Invalid coupon. Try SAVE10 or FLAT20.";
        return;
      }

      state.coupon = code;
      state.lastRemoved = null;
      state.message = `${code} applied successfully.`;
    },

    removeCoupon(state) {
      if (!state.coupon) return;

      state.coupon = null;
      state.lastRemoved = null;
      state.message = "Coupon removed.";
    },

    changeShipping(state, action: PayloadAction<"standard" | "express">) {
      if (state.shippingMethod === action.payload) return;

      state.shippingMethod = action.payload;
      state.lastRemoved = null;
      state.message = "";
    },

    undoRemove(state) {
      if (!state.lastRemoved) {
        state.message = "There is nothing to undo.";
        return;
      }

      const removed = state.lastRemoved;
      const existing = state.items.find((item) => item.key === removed.key);

      if (existing) {
        const restoredQuantity = existing.quantity + removed.quantity;

        if (restoredQuantity > existing.stock) {
          state.message = "Cannot undo because the stock limit would be exceeded.";
          return;
        }

        existing.quantity = restoredQuantity;
      } else {
        if (removed.quantity > removed.stock) {
          state.message = "Cannot restore this item because stock is unavailable.";
          return;
        }

        state.items.push({ ...removed });
      }

      state.lastRemoved = null;
      state.message = "Removal undone.";
    },

    toggleGiftWrap(state, action: PayloadAction<string>) {
      const item = state.items.find((product) => product.key === action.payload);
      if (!item) return;

      item.giftWrap = !item.giftWrap;
      state.lastRemoved = null;
      state.message = "";
    },

    clearCart(state) {
      if (state.items.length === 0) return;

      state.items = [];
      state.lastRemoved = null;
      state.message = "Cart cleared.";
    },
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  applyCoupon,
  removeCoupon,
  changeShipping,
  undoRemove,
  toggleGiftWrap,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;

// Selectors
export type RootState = {
  cart: CartState;
};

export const selectItems = (state: RootState) => state.cart.items;

export const selectSubtotal = createSelector(
  [selectItems],
  (items) =>
    items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
);

export const selectDiscount = createSelector(
  [selectSubtotal, (state: RootState) => state.cart.coupon],
  (subtotal, coupon) => {
    if (coupon === "SAVE10") return subtotal * 0.1;
    if (coupon === "FLAT20") return Math.min(20, subtotal);
    return 0;
  }
);

export const selectShipping = createSelector(
  [selectSubtotal, (state: RootState) => state.cart.shippingMethod, selectItems],
  (subtotal, method, items) => {
    if (items.length === 0) return 0;
    if (method === "express") return 15;
    return subtotal >= 100 ? 0 : 8;
  }
);

export const selectTotal = createSelector(
  [selectSubtotal, selectDiscount, selectShipping],
  (subtotal, discount, shipping) =>
    Math.max(0, subtotal - discount + shipping)
);
