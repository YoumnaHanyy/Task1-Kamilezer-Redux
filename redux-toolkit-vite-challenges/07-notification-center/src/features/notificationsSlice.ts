import {
  createSlice,
  createEntityAdapter,
  createSelector,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { RootState } from '../app/store';

// ==================== TYPES ====================

export type Priority = 'low' | 'medium' | 'high';
export type Category = 'system' | 'task' | 'message' | 'reminder';

export type Notice = {
  id: string;
  text: string;
  read: boolean;
  archived: boolean;
  createdAt: number;
  priority: Priority;
  category: Category;
  snoozedUntil: number | null;
};

type NotificationsExtraState = {
  priorityFilter: 'all' | Priority;
  categoryFilter: 'all' | Category;
  showArchived: boolean;
};

const notificationsAdapter = createEntityAdapter<Notice>({
  sortComparer: (a, b) => b.createdAt - a.createdAt,
});

const initialState = notificationsAdapter.getInitialState<NotificationsExtraState>({
  priorityFilter: 'all',
  categoryFilter: 'all',
  showArchived: false,
});

// ==================== SLICE ====================

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,

  reducers: {
    // Generate a notification with a unique ID.
    generate: {
      reducer(state, action: PayloadAction<Notice>) {
        notificationsAdapter.addOne(state, action.payload);
      },

      prepare(payload?: Partial<Notice>) {
        const categories: Category[] = [
          'system',
          'task',
          'message',
          'reminder',
        ];

        const priorities: Priority[] = [
          'low',
          'medium',
          'high',
        ];

        const category =
          payload?.category ??
          categories[Math.floor(Math.random() * categories.length)];

        const priority =
          payload?.priority ??
          priorities[Math.floor(Math.random() * priorities.length)];

        return {
          payload: {
            id: payload?.id ?? nanoid(),
            text: payload?.text ?? 'A new local notification was generated.',
            read: false,
            archived: false,
            createdAt: payload?.createdAt ?? Date.now(),
            priority,
            category,
            snoozedUntil: null,
          } satisfies Notice,
        };
      },
    },

    // Mark one notification as read.
    markRead(state, action: PayloadAction<string>) {
      const notice = state.entities[action.payload];

      if (notice) {
        notice.read = true;
      }
    },

    // Mark one notification as unread.
    markUnread(state, action: PayloadAction<string>) {
      const notice = state.entities[action.payload];

      if (notice) {
        notice.read = false;
      }
    },

    // Mark all notifications as read.
    markAllRead(state) {
      Object.values(state.entities).forEach((notice) => {
        if (notice) {
          notice.read = true;
        }
      });
    },

    // Archive a notification.
    archiveNotice(state, action: PayloadAction<string>) {
      const notice = state.entities[action.payload];

      if (notice) {
        notice.archived = true;
      }
    },

    // Restore an archived notification.
    restoreNotice(state, action: PayloadAction<string>) {
      const notice = state.entities[action.payload];

      if (notice) {
        notice.archived = false;
      }
    },

    // Delete one notification.
    deleteNotice(state, action: PayloadAction<string>) {
      notificationsAdapter.removeOne(state, action.payload);
    },

    // Delete all archived notifications.
    deleteArchived(state) {
      const ids = Object.values(state.entities)
        .filter((notice) => notice?.archived)
        .map((notice) => notice!.id);

      notificationsAdapter.removeMany(state, ids);
    },

    // Filter by priority.
    setPriorityFilter(
      state,
      action: PayloadAction<'all' | Priority>
    ) {
      state.priorityFilter = action.payload;
    },

    // Filter by category.
    setCategoryFilter(
      state,
      action: PayloadAction<'all' | Category>
    ) {
      state.categoryFilter = action.payload;
    },

    // Switch between active and archived notifications.
    setShowArchived(state, action: PayloadAction<boolean>) {
      state.showArchived = action.payload;
    },

    // Snooze a notification until a specific timestamp.
    snoozeNotice(
      state,
      action: PayloadAction<{ id: string; until: number }>
    ) {
      const notice = state.entities[action.payload.id];

      if (notice) {
        notice.snoozedUntil = action.payload.until;
      }
    },

    // Tick checks whether snoozed notifications should return.
    tick(state, action: PayloadAction<number>) {
      Object.values(state.entities).forEach((notice) => {
        if (
          notice?.snoozedUntil !== null &&
          notice?.snoozedUntil !== undefined &&
          notice.snoozedUntil <= action.payload
        ) {
          notice.snoozedUntil = null;
        }
      });
    },

    // Restore persisted data safely.
    restoreNotifications(
      state,
      action: PayloadAction<Notice[]>
    ) {
      const uniqueNotices = new Map<string, Notice>();

      action.payload.forEach((notice) => {
        if (
          notice &&
          typeof notice.id === 'string' &&
          notice.id.length > 0 &&
          typeof notice.text === 'string' &&
          typeof notice.createdAt === 'number' &&
          ['low', 'medium', 'high'].includes(notice.priority) &&
          ['system', 'task', 'message', 'reminder'].includes(notice.category)
        ) {
          uniqueNotices.set(notice.id, {
            ...notice,
            read: Boolean(notice.read),
            archived: Boolean(notice.archived),
            snoozedUntil:
              typeof notice.snoozedUntil === 'number'
                ? notice.snoozedUntil
                : null,
          });
        }
      });

      notificationsAdapter.setAll(
        state,
        Array.from(uniqueNotices.values())
      );
    },
  },
});

// ==================== ACTIONS ====================

export const {
  generate,
  markRead,
  markUnread,
  markAllRead,
  archiveNotice,
  restoreNotice,
  deleteNotice,
  deleteArchived,
  setPriorityFilter,
  setCategoryFilter,
  setShowArchived,
  snoozeNotice,
  tick,
  restoreNotifications,
} = notificationsSlice.actions;

// ==================== ADAPTER SELECTORS ====================

export const notificationSelectors =
  notificationsAdapter.getSelectors<RootState>(
    (state) => state.notifications
  );

export const selectAllNotifications =
  notificationSelectors.selectAll;

export const selectNotificationById =
  notificationSelectors.selectById;

// ==================== FILTER SELECTORS ====================

export const selectNotificationFilters = (state: RootState) => ({
  priority: state.notifications.priorityFilter,
  category: state.notifications.categoryFilter,
  showArchived: state.notifications.showArchived,
});

export const selectVisibleNotifications = createSelector(
  [selectAllNotifications, selectNotificationFilters],
  (notifications, filters) => {
    return notifications.filter((notice) => {
      const matchesPriority =
        filters.priority === 'all' ||
        notice.priority === filters.priority;

      const matchesCategory =
        filters.category === 'all' ||
        notice.category === filters.category;

      const matchesArchive =
        notice.archived === filters.showArchived;

      return (
        matchesPriority &&
        matchesCategory &&
        matchesArchive
      );
    });
  }
);

export const selectUnreadCount = createSelector(
  [selectAllNotifications],
  (notifications) =>
    notifications.filter(
      (notice) => !notice.read && !notice.archived
    ).length
);

export const selectActiveCount = createSelector(
  [selectAllNotifications],
  (notifications) =>
    notifications.filter((notice) => !notice.archived).length
);

export const selectArchivedCount = createSelector(
  [selectAllNotifications],
  (notifications) =>
    notifications.filter((notice) => notice.archived).length
);

// ==================== GROUP BY DAY ====================

export const selectGroupedNotifications = createSelector(
  [selectVisibleNotifications],
  (notifications) => {
    const groups: Record<string, Notice[]> = {};

    notifications.forEach((notice) => {
      const date = new Date(notice.createdAt);
      const day = date.toLocaleDateString();

      if (!groups[day]) {
        groups[day] = [];
      }

      groups[day].push(notice);
    });

    return groups;
  }
);

export default notificationsSlice.reducer;