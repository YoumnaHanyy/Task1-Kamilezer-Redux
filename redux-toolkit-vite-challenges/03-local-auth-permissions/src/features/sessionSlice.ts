import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../app/store';

export type Role = 'admin' | 'editor' | 'viewer';
export type Permission = 'read' | 'create' | 'update' | 'delete';

export type DemoUser = {
  id: string;
  name: string;
  role: Role;
};

export type SessionStatus = 'loggedOut' | 'active' | 'expired';

type SessionState = {
  user: DemoUser | null;
  status: SessionStatus;
  minutesRemaining: number;
  deniedActions: string[];
};

export const SESSION_LENGTH_MINUTES = 15;

export const DEMO_USERS: DemoUser[] = [
  { id: 'demo-admin', name: 'Alex Admin', role: 'admin' },
  { id: 'demo-editor', name: 'Evan Editor', role: 'editor' },
  { id: 'demo-viewer', name: 'Victoria Viewer', role: 'viewer' },
];

export const initialState: SessionState = {
  user: null,
  status: 'loggedOut',
  minutesRemaining: SESSION_LENGTH_MINUTES,
  deniedActions: [],
};

const permissionsByRole: Record<Role, Permission[]> = {
  admin: ['read', 'create', 'update', 'delete'],
  editor: ['read', 'create', 'update'],
  viewer: ['read'],
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,

  reducers: {
    loginAs(state, action: PayloadAction<Role>) {
      const user = DEMO_USERS.find(
        (item) => item.role === action.payload
      );

      if (!user) return;

      state.user = user;
      state.status = 'active';
      state.minutesRemaining = SESSION_LENGTH_MINUTES;
      state.deniedActions = [];
    },

    logout(state) {
      state.user = null;
      state.status = 'loggedOut';
      state.minutesRemaining = SESSION_LENGTH_MINUTES;
      state.deniedActions = [];
    },

    tick(state) {
      if (state.status !== 'active') return;

      if (state.minutesRemaining <= 1) {
        state.minutesRemaining = 0;
        state.status = 'expired';
        state.user = null;
      } else {
        state.minutesRemaining -= 1;
      }
    },

    recordPermissionDenied(state, action: PayloadAction<string>) {
      if (state.deniedActions.length >= 20) {
        state.deniedActions.shift();
      }

      state.deniedActions.push(action.payload);
    },

    clearDeniedActions(state) {
      state.deniedActions = [];
    },
  },
});

export const {
  loginAs,
  logout,
  tick,
  recordPermissionDenied,
  clearDeniedActions,
} = sessionSlice.actions;

// Selectors
export const selectSession = (state: RootState) => state.session;

export const selectCurrentUser = (state: RootState) =>
  state.session.user;

export const selectSessionStatus = (state: RootState) =>
  state.session.status;

export const selectMinutesRemaining = (state: RootState) =>
  state.session.minutesRemaining;

export const selectDeniedActions = (state: RootState) =>
  state.session.deniedActions;

// Check user permissions
export const selectCan = (permission: Permission) =>
  createSelector(
    [selectCurrentUser],
    (user) =>
      user
        ? permissionsByRole[user.role].includes(permission)
        : false
  );

// Check authentication
export const selectIsAuthenticated = createSelector(
  [selectSessionStatus, selectCurrentUser],
  (status, user) => status === 'active' && user !== null
);

export default sessionSlice.reducer;