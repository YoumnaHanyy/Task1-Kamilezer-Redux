
import {
  createSlice,
  createSelector,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit';

export type Booking = {
  id: string;
  seats: string[];
  total: number;
  createdAt: number;
};

export type SeatState = {
  selected: string[];
  booked: string[];
  unavailable: string[];
  holds: {
    seatIds: string[];
    expiresAt: number;
  }[];
  maxSeats: number;
  selectionHistory: string[][];
  bookings: Booking[];
};

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEATS_PER_ROW = 8;
const SEAT_PRICE = 100;

const initialState: SeatState = {
  selected: [],
  booked: ['A3', 'B4'],
  unavailable: ['A8', 'C4', 'F1'],
  holds: [],
  maxSeats: 6,
  selectionHistory: [],
  bookings: [],
};

function getRow(id: string) {
  return id.charAt(0);
}

function getSeatNumber(id: string) {
  return Number(id.slice(1));
}

function isUnavailable(state: SeatState, id: string) {
  return (
    state.booked.includes(id) ||
    state.unavailable.includes(id) ||
    state.holds.some((hold) => hold.seatIds.includes(id))
  );
}

function areAdjacent(seats: string[], newSeat: string) {
  const allSeats = [...seats, newSeat];

  if (allSeats.length === 0) return true;

  const row = getRow(allSeats[0]);

  if (!allSeats.every((seat) => getRow(seat) === row)) {
    return false;
  }

  const numbers = allSeats
    .map(getSeatNumber)
    .sort((a, b) => a - b);

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] - numbers[i - 1] !== 1) {
      return false;
    }
  }

  return true;
}

function calculatePrice(seats: string[]) {
  const count = seats.length;
  const subtotal = count * SEAT_PRICE;

  let discount = 0;

  if (count >= 5) {
    discount = 0.15;
  } else if (count >= 3) {
    discount = 0.10;
  }

  return {
    subtotal,
    discount: subtotal * discount,
    total: subtotal * (1 - discount),
  };
}

export const seatsSlice = createSlice({
  name: 'seats',
  initialState,

  reducers: {
    toggleSeat(state, action: PayloadAction<string>) {
      const id = action.payload;

      if (isUnavailable(state, id)) return;

      // Deselect an already selected seat.
      if (state.selected.includes(id)) {
        state.selectionHistory.push([...state.selected]);

        state.selected = state.selected.filter(
          (seat) => seat !== id
        );

        return;
      }

      if (state.selected.length >= state.maxSeats) return;

      // All selected seats must be adjacent in the same row.
      if (!areAdjacent(state.selected, id)) return;

      state.selectionHistory.push([...state.selected]);
      state.selected.push(id);
    },

    undoSelection(state) {
      const previous = state.selectionHistory.pop();

      if (previous) {
        state.selected = previous;
      }
    },

    clearSelection(state) {
      state.selected = [];
      state.selectionHistory = [];
    },

    holdSeats: {
      reducer(
        state,
        action: PayloadAction<{
          seatIds: string[];
          now: number;
        }>
      ) {
        const { seatIds, now } = action.payload;

        if (
          seatIds.length === 0 ||
          seatIds.length > state.maxSeats ||
          seatIds.some((id) => isUnavailable(state, id)) ||
          !areAdjacent(seatIds.slice(0, -1), seatIds[seatIds.length - 1])
        ) {
          return;
        }

        if (
          seatIds.length !== state.selected.length ||
          !seatIds.every((id) => state.selected.includes(id))
        ) {
          return;
        }

        state.holds.push({
          seatIds: [...seatIds],
          expiresAt: now + 2 * 60 * 1000,
        });

        state.selected = [];
        state.selectionHistory = [];
      },

      prepare(seatIds: string[]) {
        return {
          payload: {
            seatIds,
            now: Date.now(),
          },
        };
      },
    },

    releaseSeats(state, action: PayloadAction<string[]>) {
      const idsToRelease = action.payload;

      state.holds = state.holds.filter(
        (hold) =>
          !hold.seatIds.some((id) => idsToRelease.includes(id))
      );
    },

    confirmBooking: {
      reducer(
        state,
        action: PayloadAction<{
          holdIndex: number;
          now: number;
          bookingId: string;
        }>
      ) {
        const { holdIndex, now, bookingId } = action.payload;
        const hold = state.holds[holdIndex];

        if (!hold || hold.expiresAt <= now) return;

        const seats = [...hold.seatIds];

        if (seats.some((id) => state.booked.includes(id))) return;

        const price = calculatePrice(seats);

        state.booked.push(...seats);

        state.bookings.unshift({
          id: bookingId,
          seats,
          total: price.total,
          createdAt: now,
        });

        state.holds.splice(holdIndex, 1);
      },

      prepare(holdIndex: number) {
        return {
          payload: {
            holdIndex,
            now: Date.now(),
            bookingId: nanoid(),
          },
        };
      },
    },

    tick(state, action: PayloadAction<number>) {
      const now = action.payload;

      state.holds = state.holds.filter(
        (hold) => hold.expiresAt > now
      );
    },

    restoreBookings(state, action: PayloadAction<Booking[]>) {
      const validBookings = action.payload.filter(
        (booking) =>
          booking &&
          typeof booking.id === 'string' &&
          Array.isArray(booking.seats) &&
          typeof booking.total === 'number'
      );

      state.bookings = validBookings;

      const restoredSeats = validBookings.flatMap(
        (booking) => booking.seats
      );

      state.booked = Array.from(
        new Set([...initialState.booked, ...restoredSeats])
      );
    },

    resetReservation(state) {
      state.selected = [];
      state.holds = [];
      state.selectionHistory = [];
    },
  },
});

export const {
  toggleSeat,
  undoSelection,
  clearSelection,
  holdSeats,
  releaseSeats,
  confirmBooking,
  tick,
  restoreBookings,
  resetReservation,
} = seatsSlice.actions;

// Selectors
const selectSeatsState = (state: { seats: SeatState }) => state.seats;

export const selectSelectedSeats = createSelector(
  [selectSeatsState],
  (seats) => seats.selected
);

export const selectAvailableSeats = createSelector(
  [selectSeatsState],
  (seats) => {
    const result: string[] = [];

    ROWS.forEach((row) => {
      for (let number = 1; number <= SEATS_PER_ROW; number++) {
        const id = `${row}${number}`;

        if (
          !seats.booked.includes(id) &&
          !seats.unavailable.includes(id) &&
          !seats.holds.some((hold) => hold.seatIds.includes(id))
        ) {
          result.push(id);
        }
      }
    });

    return result;
  }
);

export const selectBookingSummary = createSelector(
  [selectSelectedSeats],
  (selected) => ({
    seats: selected,
    count: selected.length,
    ...calculatePrice(selected),
  })
);

export const selectBestAvailableSeats = (
  state: { seats: SeatState },
  count: number
) => {
  const available = selectAvailableSeats(state);

  for (const row of ROWS) {
    const rowSeats = available
      .filter((id) => getRow(id) === row)
      .map(getSeatNumber)
      .sort((a, b) => a - b);

    for (let i = 0; i <= rowSeats.length - count; i++) {
      const group = rowSeats.slice(i, i + count);

      if (
        group.length === count &&
        group.every((number, index) =>
          index === 0 || number - group[index - 1] === 1
        )
      ) {
        return group.map((number) => `${row}${number}`);
      }
    }
  }

  return [];
};

export const selectSeatStatus = (
  state: { seats: SeatState },
  id: string
) => {
  const seats = state.seats;

  if (seats.booked.includes(id)) return 'booked';
  if (seats.unavailable.includes(id)) return 'unavailable';

  if (seats.holds.some((hold) => hold.seatIds.includes(id))) {
    return 'held';
  }

  if (seats.selected.includes(id)) return 'selected';

  return 'available';
};

export default seatsSlice.reducer;