import { useState } from "react";
import {
  addItem,
  applyCoupon,
  changeShipping,
  clearCart,
  removeCoupon,
  removeItem,
  toggleGiftWrap,
  undoRemove,
  updateQuantity,
  selectDiscount,
  selectItems,
  selectShipping,
  selectSubtotal,
  selectTotal,
} from "./features/cartSlice";
import { useAppDispatch, useAppSelector } from "./app/store";
import "./style.css";

export default function App() {
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectItems);
  const subtotal = useAppSelector(selectSubtotal);
  const discount = useAppSelector(selectDiscount);
  const shipping = useAppSelector(selectShipping);
  const total = useAppSelector(selectTotal);

  const coupon = useAppSelector((state) => state.cart.coupon);
  const shippingMethod = useAppSelector((state) => state.cart.shippingMethod);
  const lastRemoved = useAppSelector((state) => state.cart.lastRemoved);
  const message = useAppSelector((state) => state.cart.message);

  const [couponInput, setCouponInput] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const formatPrice = (value: number) => `$${value.toFixed(2)}`;

  function addSampleProduct(
    productId: string,
    name: string,
    color: string,
    size: string,
    unitPrice: number,
    stock: number
  ) {
    dispatch(
      addItem({
        productId,
        name,
        color,
        size,
        unitPrice,
        quantity: 1,
        stock,
      })
    );
  }

  function toggleSelected(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((selected) => selected !== key)
        : [...current, key]
    );
  }

  function removeSelected() {
    selectedKeys.forEach((key) => dispatch(removeItem(key)));
    setSelectedKeys([]);
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">REDUX TOOLKIT · CHALLENGE 01</p>
          <h1>Advanced Shopping Cart</h1>
          <p className="muted">A local shopping cart with variants, coupons and undo.</p>
        </div>
        <button className="button button-light" onClick={() => dispatch(clearCart())}>
          Clear Cart
        </button>
      </header>

      <section className="product-panel panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LOCAL PRODUCTS</p>
            <h2>Choose a product</h2>
          </div>
          <span className="muted small">No API or backend</span>
        </div>

        <div className="product-grid">
          <article className="product-card">
            <div className="product-image shirt-image">T-SHIRT</div>
            <h3>Blue Shirt · M</h3>
            <p className="muted">Stock: 8 · $25.00</p>
            <button
              className="button"
              onClick={() =>
                addSampleProduct("shirt", "Blue Shirt", "Blue", "M", 25, 8)
              }
            >
              Add Blue / M
            </button>
          </article>

          <article className="product-card">
            <div className="product-image red-image">T-SHIRT</div>
            <h3>Red Shirt · M</h3>
            <p className="muted">Stock: 5 · $30.00</p>
            <button
              className="button"
              onClick={() =>
                addSampleProduct("shirt", "Red Shirt", "Red", "M", 30, 5)
              }
            >
              Add Red / M
            </button>
          </article>

          <article className="product-card">
            <div className="product-image pants-image">PANTS</div>
            <h3>Black Pants · L</h3>
            <p className="muted">Stock: 4 · $40.00</p>
            <button
              className="button"
              onClick={() =>
                addSampleProduct("pants", "Black Pants", "Black", "L", 40, 4)
              }
            >
              Add Black / L
            </button>
          </article>
        </div>
      </section>

      <div className="content-grid">
        <section className="panel cart-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR ITEMS</p>
              <h2>Shopping Cart ({items.reduce((sum, item) => sum + item.quantity, 0)})</h2>
            </div>
            {selectedKeys.length > 0 && (
              <button className="button button-danger" onClick={removeSelected}>
                Remove selected ({selectedKeys.length})
              </button>
            )}
          </div>

          {message && <p className="message" role="status">{message}</p>}

          {lastRemoved && (
            <div className="undo-banner">
              <span>Removed {lastRemoved.name} ({lastRemoved.color} / {lastRemoved.size})</span>
              <button className="button button-light" onClick={() => dispatch(undoRemove())}>
                Undo
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="empty-state">
              <h3>Your cart is empty</h3>
              <p className="muted">Add a product to get started.</p>
            </div>
          ) : (
            <div className="cart-list">
              {items.map((item) => (
                <article className="cart-item" key={item.key}>
                  <input
                    aria-label={`Select ${item.name}`}
                    type="checkbox"
                    checked={selectedKeys.includes(item.key)}
                    onChange={() => toggleSelected(item.key)}
                  />

                  <div className="item-details">
                    <h3>{item.name}</h3>
                    <p className="muted">
                      {item.color} · Size {item.size} · {formatPrice(item.unitPrice)}
                    </p>
                    <p className="small muted">Available stock: {item.stock}</p>

                    <label className="gift-label">
                      <input
                        type="checkbox"
                        checked={item.giftWrap}
                        onChange={() => dispatch(toggleGiftWrap(item.key))}
                      />
                      Gift wrap
                    </label>
                  </div>

                  <div className="quantity-control">
                    <button
                      className="quantity-button"
                      aria-label={`Decrease ${item.name}`}
                      disabled={item.quantity <= 1}
                      onClick={() =>
                        dispatch(updateQuantity({
                          key: item.key,
                          quantity: item.quantity - 1,
                        }))
                      }
                    >
                      −
                    </button>
                    <strong>{item.quantity}</strong>
                    <button
                      className="quantity-button"
                      aria-label={`Increase ${item.name}`}
                      disabled={item.quantity >= item.stock}
                      onClick={() =>
                        dispatch(updateQuantity({
                          key: item.key,
                          quantity: item.quantity + 1,
                        }))
                      }
                    >
                      +
                    </button>
                  </div>

                  <div className="item-total">
                    <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                    <button
                      className="text-button"
                      onClick={() => dispatch(removeItem(item.key))}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="panel summary-panel">
          <p className="eyebrow">ORDER DETAILS</p>
          <h2>Summary</h2>

          <form
            className="coupon-form"
            onSubmit={(event) => {
              event.preventDefault();
              dispatch(applyCoupon(couponInput));
            }}
          >
            <label htmlFor="coupon">Coupon code</label>
            <div className="coupon-row">
              <input
                id="coupon"
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value)}
                placeholder="SAVE10 or FLAT20"
              />
              <button className="button" type="submit">Apply</button>
            </div>
            {coupon && (
              <button
                type="button"
                className="text-button"
                onClick={() => dispatch(removeCoupon())}
              >
                Remove {coupon}
              </button>
            )}
          </form>

          <div className="shipping-options">
            <p className="field-label">Shipping method</p>
            <label>
              <input
                type="radio"
                name="shipping"
                checked={shippingMethod === "standard"}
                onChange={() => dispatch(changeShipping("standard"))}
              />
              Standard · $8 (free over $100)
            </label>
            <label>
              <input
                type="radio"
                name="shipping"
                checked={shippingMethod === "express"}
                onChange={() => dispatch(changeShipping("express"))}
              />
              Express · $15
            </label>
          </div>

          <div className="summary-lines">
            <div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
            <div><span>Discount</span><strong className="discount">−{formatPrice(discount)}</strong></div>
            <div><span>Shipping</span><strong>{formatPrice(shipping)}</strong></div>
            <div className="grand-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
          </div>

          <p className="small muted">
            SAVE10 gives 10% off. FLAT20 gives up to $20 off.
          </p>
        </aside>
      </div>
    </main>
  );
}
