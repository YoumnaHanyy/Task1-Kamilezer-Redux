import { useEffect, useState } from 'react';

import {
  nextStep,
  previousStep,
  updateDraft,
  placeOrder,
  resetCheckout,
  updateConfirmation,
  restoreCheckout,
  type Draft,
} from './features/checkoutSlice';

import { useAppDispatch, useAppSelector } from './app/store';

import './style.css';

const STORAGE_KEY = 'checkout-draft';

export default function App() {
  const dispatch = useAppDispatch();

  const checkout = useAppSelector((state) => state.checkout);

  const [hydrated, setHydrated] = useState(false);

  const { step, draft, errors, completed, visited, orderHistory } = checkout;

  // Restore saved checkout data.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        dispatch(restoreCheckout(JSON.parse(saved)));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }

    setHydrated(true);
  }, [dispatch]);

  // Save non-sensitive checkout data.
  useEffect(() => {
    if (!hydrated) return;

    const data = {
      step: checkout.step,
      draft: checkout.draft,
      visited: checkout.visited,
      confirmationText: checkout.confirmationText,
      orderHistory: checkout.orderHistory,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Continue if localStorage is unavailable.
    }
  }, [checkout, hydrated]);

  const updateField = (field: keyof Draft, value: string | boolean) => {
    dispatch(updateDraft({ [field]: value }));
  };

  const handlePlaceOrder = () => {
    dispatch(placeOrder());
  };

  const handleReset = () => {
    dispatch(resetCheckout());
  };

  const steps = [
    'Contact',
    draft.delivery === 'pickup' ? 'Pickup Location' : 'Shipping',
    'Preferences',
    'Review',
  ];

  const renderError = (field: keyof Draft) => {
    if (!errors[field]) return null;

    return <small className="error">{errors[field]}</small>;
  };

  return (
    <main className="container">
      <header className="page-header">
        <p className="eyebrow">Redux Toolkit · Challenge 08 · Medium–Hard</p>
        <h1>Multi-Step Checkout Wizard</h1>
        <p className="subtitle">
          Complete your order in a few simple steps.
        </p>
      </header>

      {!completed && (
        <>
          <nav className="stepper">
            {steps.map((name, index) => (
              <div
                className={`step-item ${
                  step === index ? 'active' : ''
                } ${visited[index] ? 'visited' : ''}`}
                key={name}
              >
                <span className="step-number">{index + 1}</span>
                <span>{name}</span>
              </div>
            ))}
          </nav>

          <section className="panel">
            {step === 0 && (
              <>
                <h2>Contact Information</h2>
                <p className="section-description">
                  Enter your contact details.
                </p>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                  {renderError('name')}
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="example@email.com"
                  />
                  {renderError('email')}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2>Delivery Method</h2>
                <p className="section-description">
                  Choose how you want to receive your order.
                </p>

                <div className="delivery-options">
                  <label className="option-card">
                    <input
                      type="radio"
                      name="delivery"
                      checked={draft.delivery === 'shipping'}
                      onChange={() => {
                        updateField('delivery', 'shipping');
                      }}
                    />
                    <div>
                      <strong>Shipping</strong>
                      <p>Deliver the order to your address.</p>
                    </div>
                  </label>

                  <label className="option-card">
                    <input
                      type="radio"
                      name="delivery"
                      checked={draft.delivery === 'pickup'}
                      onChange={() => {
                        updateField('delivery', 'pickup');
                      }}
                    />
                    <div>
                      <strong>Pickup</strong>
                      <p>Collect your order from a pickup location.</p>
                    </div>
                  </label>
                </div>

                {draft.delivery === 'shipping' ? (
                  <div className="form-fields">
                    <div className="form-group">
                      <label>Street Address</label>
                      <input
                        value={draft.address}
                        onChange={(e) =>
                          updateField('address', e.target.value)
                        }
                        placeholder="Enter your address"
                      />
                      {renderError('address')}
                    </div>

                    <div className="form-group">
                      <label>City</label>
                      <input
                        value={draft.city}
                        onChange={(e) =>
                          updateField('city', e.target.value)
                        }
                        placeholder="Enter your city"
                      />
                      {renderError('city')}
                    </div>

                    <div className="form-group">
                      <label>Postal Code</label>
                      <input
                        value={draft.postalCode}
                        onChange={(e) =>
                          updateField('postalCode', e.target.value)
                        }
                        placeholder="Enter postal code"
                      />
                      {renderError('postalCode')}
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Pickup Location</label>
                    <select
                      value={draft.pickupLocation}
                      onChange={(e) =>
                        updateField('pickupLocation', e.target.value)
                      }
                    >
                      <option value="">Choose a location</option>
                      <option value="Downtown Branch">
                        Downtown Branch
                      </option>
                      <option value="Maadi Branch">Maadi Branch</option>
                      <option value="New Cairo Branch">
                        New Cairo Branch
                      </option>
                    </select>
                    {renderError('pickupLocation')}
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <h2>Preferences</h2>
                <p className="section-description">
                  Customize your order.
                </p>

                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={draft.giftWrap}
                    onChange={(e) =>
                      updateField('giftWrap', e.target.checked)
                    }
                  />
                  <span>Add gift wrapping</span>
                </label>

                <div className="form-group">
                  <label>Delivery Note (Optional)</label>
                  <textarea
                    rows={4}
                    value={draft.deliveryNote}
                    onChange={(e) =>
                      updateField('deliveryNote', e.target.value)
                    }
                    placeholder="Any special instructions?"
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2>Review Your Order</h2>
                <p className="section-description">
                  Check your information before placing your order.
                </p>

                <div className="review-section">
                  <h3>Contact</h3>
                  <p>Name: {draft.name}</p>
                  <p>Email: {draft.email}</p>
                </div>

                <div className="review-section">
                  <h3>Delivery</h3>
                  <p>Method: {draft.delivery}</p>

                  {draft.delivery === 'shipping' ? (
                    <>
                      <p>Address: {draft.address}</p>
                      <p>City: {draft.city}</p>
                      <p>Postal Code: {draft.postalCode}</p>
                    </>
                  ) : (
                    <p>Pickup Location: {draft.pickupLocation}</p>
                  )}
                </div>

                <div className="review-section">
                  <h3>Preferences</h3>
                  <p>Gift Wrap: {draft.giftWrap ? 'Yes' : 'No'}</p>
                  <p>Note: {draft.deliveryNote || 'None'}</p>
                </div>

                <button
                  className="place-order-btn"
                  onClick={handlePlaceOrder}
                >
                  Place Order
                </button>
              </>
            )}

            <div className="navigation">
              <button
                className="secondary-btn"
                onClick={() => dispatch(previousStep())}
                disabled={step === 0}
              >
                Back
              </button>

              {step < 3 && (
                <button
                  className="primary-btn"
                  onClick={() => dispatch(nextStep())}
                >
                  Continue
                </button>
              )}
            </div>
          </section>
        </>
      )}

      {completed && (
        <section className="panel success-panel">
          <div className="success-icon">✓</div>
          <h2>Order Placed Successfully!</h2>

          <p>{checkout.confirmationText}</p>

          <div className="form-group confirmation-editor">
            <label>Edit Confirmation Message</label>
            <textarea
              rows={3}
              value={checkout.confirmationText}
              onChange={(e) =>
                dispatch(updateConfirmation(e.target.value))
              }
            />
          </div>

          <button className="primary-btn" onClick={handleReset}>
            Start New Checkout
          </button>
        </section>
      )}

      <section className="panel history-panel">
        <h2>Order History</h2>

        {orderHistory.length === 0 ? (
          <p className="empty-text">No orders have been placed yet.</p>
        ) : (
          orderHistory.map((order) => (
            <div className="history-item" key={order.id}>
              <div>
                <strong>Order #{order.id.slice(0, 8)}</strong>
                <p>{order.draft.name}</p>
                <small>
                  {new Date(order.createdAt).toLocaleString()}
                </small>
              </div>

              <span className="order-status">Completed</span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}