import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export type Delivery = 'shipping' | 'pickup';

export type Draft = {
  name: string;
  email: string;
  delivery: Delivery;
  address: string;
  city: string;
  postalCode: string;
  pickupLocation: string;
  giftWrap: boolean;
  deliveryNote: string;
};

export type CheckoutErrors = Record<string, string>;

export type Order = {
  id: string;
  createdAt: number;
  draft: Draft;
};

export type CheckoutState = {
  step: number;
  draft: Draft;
  visited: boolean[];
  errors: CheckoutErrors;
  completed: boolean;
  confirmationText: string;
  orderHistory: Order[];
};

const initialState: CheckoutState = {
  step: 0,

  draft: {
    name: '',
    email: '',
    delivery: 'shipping',
    address: '',
    city: '',
    postalCode: '',
    pickupLocation: '',
    giftWrap: false,
    deliveryNote: '',
  },

  visited: [true, false, false, false],
  errors: {},
  completed: false,
  confirmationText: 'Thank you! Your order has been placed successfully.',
  orderHistory: [],
};

function validateStep(state: CheckoutState, step: number): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const draft = state.draft;

  if (step === 0) {
    if (!draft.name.trim()) {
      errors.name = 'Name is required.';
    }

    if (!draft.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      errors.email = 'Enter a valid email address.';
    }
  }

  if (step === 1) {
    if (draft.delivery === 'shipping') {
      if (!draft.address.trim()) {
        errors.address = 'Address is required.';
      }

      if (!draft.city.trim()) {
        errors.city = 'City is required.';
      }

      if (!draft.postalCode.trim()) {
        errors.postalCode = 'Postal code is required.';
      }
    } else {
      if (!draft.pickupLocation.trim()) {
        errors.pickupLocation = 'Choose a pickup location.';
      }
    }
  }

  return errors;
}

function validateAll(state: CheckoutState): CheckoutErrors {
  return {
    ...validateStep(state, 0),
    ...validateStep(state, 1),
  };
}

export const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,

  reducers: {
    updateDraft(state, action: PayloadAction<Partial<Draft>>) {
      state.draft = {
        ...state.draft,
        ...action.payload,
      };

      state.completed = false;

      // Remove errors for fields that are being edited.
      Object.keys(action.payload).forEach((key) => {
        delete state.errors[key];
      });
    },

    nextStep(state) {
      const currentErrors = validateStep(state, state.step);

      state.errors = {
        ...state.errors,
        ...currentErrors,
      };

      if (Object.keys(currentErrors).length > 0) {
        return;
      }

      if (state.step < 3) {
        state.step += 1;
        state.visited[state.step] = true;
      }
    },

    previousStep(state) {
      if (state.step > 0) {
        state.step -= 1;
        state.visited[state.step] = true;
      }
    },

    goToStep(state, action: PayloadAction<number>) {
      const target = action.payload;

      if (
        target >= 0 &&
        target < 4 &&
        state.visited[target] &&
        target < state.step
      ) {
        state.step = target;
      }
    },

    validateCurrentStep(state) {
      state.errors = validateStep(state, state.step);
    },

    placeOrder: {
      reducer(state, action: PayloadAction<{ id: string; createdAt: number }>) {
        if (state.completed) {
          return;
        }

        const errors = validateAll(state);

        if (Object.keys(errors).length > 0) {
          state.errors = errors;

          if (errors.name || errors.email) {
            state.step = 0;
          } else {
            state.step = 1;
          }

          return;
        }

        state.errors = {};
        state.completed = true;

        state.orderHistory.unshift({
          id: action.payload.id,
          createdAt: action.payload.createdAt,
          draft: { ...state.draft },
        });
      },

      prepare() {
        return {
          payload: {
            id: nanoid(),
            createdAt: Date.now(),
          },
        };
      },
    },

    updateConfirmation(state, action: PayloadAction<string>) {
      state.confirmationText = action.payload;
    },

    resetCheckout(state) {
      state.step = 0;
      state.draft = { ...initialState.draft };
      state.visited = [true, false, false, false];
      state.errors = {};
      state.completed = false;
      state.confirmationText = initialState.confirmationText;
    },

    restoreCheckout(
      state,
      action: PayloadAction<Partial<CheckoutState>>
    ) {
      const saved = action.payload;

      if (saved.draft) {
        state.draft = {
          ...initialState.draft,
          ...saved.draft,
        };
      }

      if (
        typeof saved.step === 'number' &&
        saved.step >= 0 &&
        saved.step <= 3
      ) {
        state.step = saved.step;
      }

      if (Array.isArray(saved.visited)) {
        state.visited = [
          true,
          Boolean(saved.visited[1]),
          Boolean(saved.visited[2]),
          Boolean(saved.visited[3]),
        ];
      }

      if (saved.confirmationText) {
        state.confirmationText = saved.confirmationText;
      }

      if (Array.isArray(saved.orderHistory)) {
        state.orderHistory = saved.orderHistory;
      }

      // Do not restore an old completed checkout as an active submission.
      state.completed = false;
      state.errors = {};
    },
  },
});

export const {
  updateDraft,
  nextStep,
  previousStep,
  goToStep,
  validateCurrentStep,
  placeOrder,
  updateConfirmation,
  resetCheckout,
  restoreCheckout,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;