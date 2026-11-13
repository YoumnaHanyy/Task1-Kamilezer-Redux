
import { useEffect } from 'react';

import {
  toggleSeat,
  undoSelection,
  clearSelection,
  holdSeats,
  releaseSeats,
  confirmBooking,
  tick,
  restoreBookings,
  selectBookingSummary,
  selectSeatStatus,
  selectBestAvailableSeats,
  type Booking,
} from './features/seatsSlice';

import { useAppDispatch, useAppSelector } from './app/store';

import './style.css';

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEATS_PER_ROW = 8;
const STORAGE_KEY = 'cinema-confirmed-bookings';

export default function App() {
  const dispatch = useAppDispatch();

  const seats = useAppSelector((state) => state.seats);
  const summary = useAppSelector(selectBookingSummary);

  // Restore confirmed bookings.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          dispatch(restoreBookings(parsed as Booking[]));
        }
      }
    } catch {
      // Ignore invalid saved data.
    }
  }, [dispatch]);

  // Persist confirmed bookings.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(seats.bookings)
      );
    } catch {
      // Continue if localStorage is unavailable.
    }
  }, [seats.bookings]);

  // Simulated clock: expire holds every second.
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(tick(Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const getStatus = (id: string) =>
    selectSeatStatus({ seats }, id);

  const handleHold = () => {
    if (seats.selected.length === 0) return;

    dispatch(holdSeats([...seats.selected]));
  };

  const handleBestAvailable = () => {
    const count = Math.max(1, seats.selected.length || 2);

    const bestSeats = selectBestAvailableSeats(
      { seats },
      count
    );

    if (bestSeats.length === 0) {
      alert('No adjacent seats are available for this group.');
      return;
    }

    dispatch(clearSelection());

    bestSeats.forEach((id) => {
      dispatch(toggleSeat(id));
    });
  };

  const formatTime = (expiresAt: number) => {
    const remaining = Math.max(
      0,
      Math.ceil((expiresAt - Date.now()) / 1000)
    );

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const subtotal = summary.subtotal;
  const discount = summary.discount;
  const total = summary.total;

  return (
    <main className="container">
      <header className="page-header">
        <p className="eyebrow">
          Redux Toolkit · Challenge 09 · Hard
        </p>

        <h1>Interactive Seat Reservation</h1>

        <p className="subtitle">
          Choose your seats and reserve your cinema experience.
        </p>
      </header>

      <section className="panel cinema-panel">
        <div className="screen">
          <span>SCREEN</span>
        </div>

        <div className="seat-legend">
          <div>
            <span className="legend-seat available"></span>
            Available
          </div>

          <div>
            <span className="legend-seat selected"></span>
            Selected
          </div>

          <div>
            <span className="legend-seat held"></span>
            Held
          </div>

          <div>
            <span className="legend-seat booked"></span>
            Booked
          </div>

          <div>
            <span className="legend-seat unavailable"></span>
            Unavailable
          </div>
        </div>

        <div className="seat-grid">
          {ROWS.map((row) => (
            <div className="seat-row" key={row}>
              <span className="row-label">{row}</span>

              {Array.from(
                { length: SEATS_PER_ROW },
                (_, index) => {
                  const id = `${row}${index + 1}`;
                  const status = getStatus(id);

                  return (
                    <button
                      key={id}
                      className={`seat ${status}`}
                      disabled={
                        status === 'booked' ||
                        status === 'unavailable' ||
                        status === 'held'
                      }
                      onClick={() => dispatch(toggleSeat(id))}
                      title={`${id} - ${status}`}
                    >
                      {index + 1}
                    </button>
                  );
                }
              )}
            </div>
          ))}
        </div>

        <div className="screen-note">
          All eyes this way
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Your Selection</h2>
            <p>
              Select up to {seats.maxSeats} adjacent seats in one row.
            </p>
          </div>

          <span className="seat-count">
            {seats.selected.length} / {seats.maxSeats}
          </span>
        </div>

        <div className="selected-list">
          {seats.selected.length > 0
            ? seats.selected.join(', ')
            : 'No seats selected'}
        </div>

        <div className="action-buttons">
          <button
            className="secondary-btn"
            disabled={seats.selectionHistory.length === 0}
            onClick={() => dispatch(undoSelection())}
          >
            Undo
          </button>

          <button
            className="secondary-btn"
            onClick={() => dispatch(clearSelection())}
            disabled={seats.selected.length === 0}
          >
            Clear Selection
          </button>

          <button
            className="secondary-btn"
            onClick={handleBestAvailable}
          >
            Best Available
          </button>

          <button
            className="primary-btn"
            onClick={handleHold}
            disabled={seats.selected.length === 0}
          >
            Hold Seats (2 min)
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Booking Summary</h2>

        <div className="summary-row">
          <span>Selected Seats</span>
          <strong>{summary.count}</strong>
        </div>

        <div className="summary-row">
          <span>Seat Price</span>
          <strong>EGP 100</strong>
        </div>

        <div className="summary-row">
          <span>Subtotal</span>
          <strong>EGP {subtotal.toFixed(2)}</strong>
        </div>

        <div className="summary-row discount">
          <span>Group Discount</span>
          <strong>- EGP {discount.toFixed(2)}</strong>
        </div>

        <div className="summary-total">
          <span>Total</span>
          <strong>EGP {total.toFixed(2)}</strong>
        </div>

        <p className="pricing-note">
          3–4 seats: 10% discount. 5–6 seats: 15% discount.
        </p>
      </section>

      <section className="panel">
        <h2>Active Holds</h2>

        {seats.holds.length === 0 ? (
          <p className="empty-text">No active seat holds.</p>
        ) : (
          seats.holds.map((hold, index) => (
            <div className="hold-item" key={hold.seatIds.join('-')}>
              <div>
                <strong>{hold.seatIds.join(', ')}</strong>
                <p>
                  Expires in: {formatTime(hold.expiresAt)}
                </p>
              </div>

              <div className="hold-actions">
                <button
                  className="primary-btn"
                  onClick={() => dispatch(confirmBooking(index))}
                >
                  Confirm Booking
                </button>

                <button
                  className="danger-btn"
                  onClick={() => dispatch(releaseSeats(hold.seatIds))}
                >
                  Release
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <h2>Confirmed Bookings</h2>

        {seats.bookings.length === 0 ? (
          <p className="empty-text">
            No confirmed bookings yet.
          </p>
        ) : (
          seats.bookings.map((booking) => (
            <div className="booking-item" key={booking.id}>
              <div>
                <strong>Booking #{booking.id.slice(0, 8)}</strong>
                <p>Seats: {booking.seats.join(', ')}</p>
                <small>
                  {new Date(booking.createdAt).toLocaleString()}
                </small>
              </div>

              <strong>
                EGP {booking.total.toFixed(2)}
              </strong>
            </div>
          ))
        )}
      </section>
    </main>
  );
}