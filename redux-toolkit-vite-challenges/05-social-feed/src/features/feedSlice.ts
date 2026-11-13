import {
  createSlice,
  createEntityAdapter,
  createSelector,
  type PayloadAction,
  type EntityState,
} from '@reduxjs/toolkit';

import type { RootState } from '../app/store';

// ========================
// Types
// ========================

export type User = {
  id: string;
  name: string;
};

export type Post = {
  id: string;
  authorId: string;
  author: string;
  text: string;
  createdAt: string;
};

export type Comment = {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  author: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type FeedFilters = {
  savedOnly: boolean;
  likedOnly: boolean;
  authorId: string;
  keyword: string;
};

type FeedSnapshot = {
  posts: EntityState<Post, string>;
  comments: EntityState<Comment, string>;
  reactions: Record<string, string[]>;
  bookmarks: Record<string, string[]>;
  currentUserId: string;
};

type FeedState = FeedSnapshot & {
  filters: FeedFilters;
  commentSort: 'newest' | 'oldest';
  past: FeedSnapshot[];
  future: FeedSnapshot[];
  error: string | null;
};

const postsAdapter = createEntityAdapter<Post>();
const commentsAdapter = createEntityAdapter<Comment>();

// ========================
// Starter Data
// ========================

const seedPosts: Post[] = [
  {
    id: 'p1',
    authorId: 'u1',
    author: 'Alex',
    text: 'Redux Toolkit makes state management easier!',
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'p2',
    authorId: 'u2',
    author: 'Sarah',
    text: 'Working on my new React project. Any tips?',
    createdAt: '2026-11-02T11:00:00.000Z',
  },
  {
    id: 'p3',
    authorId: 'u3',
    author: 'John',
    text: 'Today I learned about createEntityAdapter.',
    createdAt: '2026-11-03T12:00:00.000Z',
  },
];

const seedComments: Comment[] = [
  {
    id: 'c1',
    postId: 'p1',
    parentId: null,
    authorId: 'u2',
    author: 'Sarah',
    text: 'Absolutely! It is very useful.',
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
  },
  {
    id: 'c2',
    postId: 'p1',
    parentId: 'c1',
    authorId: 'u3',
    author: 'John',
    text: 'I agree with you!',
    createdAt: '2026-11-01T13:00:00.000Z',
    updatedAt: '2026-11-01T13:00:00.000Z',
  },
  {
    id: 'c3',
    postId: 'p2',
    parentId: null,
    authorId: 'u1',
    author: 'Alex',
    text: 'Start with small components.',
    createdAt: '2026-11-02T13:00:00.000Z',
    updatedAt: '2026-11-02T13:00:00.000Z',
  },
];

const seedReactions: Record<string, string[]> = {
  p1: ['u2', 'u3'],
  p2: ['u1'],
  p3: [],
};

const seedBookmarks: Record<string, string[]> = {
  p1: ['u1'],
  p2: [],
  p3: [],
};

// ========================
// Persistence
// ========================

const STORAGE_KEY = 'social-feed-state';

function loadSavedState(): FeedSnapshot | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return null;

    const parsed = JSON.parse(saved);

    if (
      !parsed.posts ||
      !parsed.comments ||
      !parsed.reactions ||
      !parsed.bookmarks
    ) {
      return null;
    }

    return parsed as FeedSnapshot;
  } catch {
    return null;
  }
}

const savedState =
  typeof localStorage !== 'undefined' ? loadSavedState() : null;

// ========================
// Initial State
// ========================

const initialSnapshot: FeedSnapshot = {
  posts: postsAdapter.getInitialState(),
  comments: commentsAdapter.getInitialState(),
  reactions: seedReactions,
  bookmarks: seedBookmarks,
  currentUserId: 'u1',
};

postsAdapter.setAll(initialSnapshot.posts, seedPosts);
commentsAdapter.setAll(initialSnapshot.comments, seedComments);

const initialState: FeedState = {
  ...(savedState ?? initialSnapshot),
  filters: {
    savedOnly: false,
    likedOnly: false,
    authorId: 'all',
    keyword: '',
  },
  commentSort: 'newest',
  past: [],
  future: [],
  error: null,
};

// ========================
// Journal Helpers
// ========================

function cloneSnapshot(state: FeedState): FeedSnapshot {
  return JSON.parse(
    JSON.stringify({
      posts: state.posts,
      comments: state.comments,
      reactions: state.reactions,
      bookmarks: state.bookmarks,
      currentUserId: state.currentUserId,
    }),
  ) as FeedSnapshot;
}

function recordOperation(state: FeedState) {
  state.past.push(cloneSnapshot(state));

  if (state.past.length > 20) {
    state.past.shift();
  }

  state.future = [];
  state.error = null;
}

function restoreSnapshot(
  state: FeedState,
  snapshot: FeedSnapshot,
) {
  postsAdapter.setAll(state.posts, Object.values(snapshot.posts.entities).filter(Boolean) as Post[]);
  commentsAdapter.setAll(state.comments, Object.values(snapshot.comments.entities).filter(Boolean) as Comment[]);

  state.reactions = snapshot.reactions;
  state.bookmarks = snapshot.bookmarks;
  state.currentUserId = snapshot.currentUserId;
}

function getCurrentUserName(userId: string): string {
  const users: Record<string, string> = {
    u1: 'Alex',
    u2: 'Sarah',
    u3: 'John',
  };

  return users[userId] ?? 'Unknown User';
}

function getUserPostIds(
  reactions: Record<string, string[]>,
  userId: string,
): string[] {
  return Object.keys(reactions).filter((postId) =>
    reactions[postId]?.includes(userId),
  );
}

// ========================
// Slice
// ========================

export const feedSlice = createSlice({
  name: 'feed',
  initialState,

  reducers: {
    // --------------------
    // Like / Unlike
    // --------------------

    toggleLike(state, action: PayloadAction<string>) {
      const postId = action.payload;

      if (!state.posts.entities[postId]) {
        state.error = 'Post does not exist.';
        return;
      }

      recordOperation(state);

      const userId = state.currentUserId;
      const users = state.reactions[postId] ?? [];

      if (users.includes(userId)) {
        state.reactions[postId] = users.filter(
          (id) => id !== userId,
        );
      } else {
        state.reactions[postId] = [...users, userId];
      }
    },

    // --------------------
    // Bookmark
    // --------------------

    toggleBookmark(state, action: PayloadAction<string>) {
      const postId = action.payload;

      if (!state.posts.entities[postId]) {
        state.error = 'Post does not exist.';
        return;
      }

      recordOperation(state);

      const userId = state.currentUserId;
      const users = state.bookmarks[postId] ?? [];

      if (users.includes(userId)) {
        state.bookmarks[postId] = users.filter(
          (id) => id !== userId,
        );
      } else {
        state.bookmarks[postId] = [...users, userId];
      }
    },

    // --------------------
    // Add Comment
    // --------------------

    addComment(
      state,
      action: PayloadAction<{
        postId: string;
        text: string;
        parentId?: string | null;
      }>,
    ) {
      const { postId, text, parentId = null } = action.payload;

      if (!state.posts.entities[postId]) {
        state.error = 'Cannot comment on a missing post.';
        return;
      }

      if (!text.trim()) {
        state.error = 'Comment cannot be empty.';
        return;
      }

      if (parentId) {
        const parent = state.comments.entities[parentId];

        if (!parent || parent.postId !== postId) {
          state.error = 'Invalid parent comment.';
          return;
        }
      }

      recordOperation(state);

      const now = new Date().toISOString();

      commentsAdapter.addOne(state.comments, {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        postId,
        parentId,
        authorId: state.currentUserId,
        author: getCurrentUserName(state.currentUserId),
        text: text.trim(),
        createdAt: now,
        updatedAt: now,
      });
    },

    // --------------------
    // Edit Comment
    // --------------------

    editComment(
      state,
      action: PayloadAction<{
        commentId: string;
        text: string;
      }>,
    ) {
      const { commentId, text } = action.payload;
      const comment = state.comments.entities[commentId];

      if (!comment) {
        state.error = 'Comment does not exist.';
        return;
      }

      if (comment.authorId !== state.currentUserId) {
        state.error = 'You can only edit your own comments.';
        return;
      }

      if (!text.trim()) {
        state.error = 'Comment cannot be empty.';
        return;
      }

      recordOperation(state);

      comment.text = text.trim();
      comment.updatedAt = new Date().toISOString();
    },

    // --------------------
    // Delete Comment
    // --------------------

    deleteComment(
      state,
      action: PayloadAction<string>,
    ) {
      const comment = state.comments.entities[action.payload];

      if (!comment) {
        state.error = 'Comment does not exist.';
        return;
      }

      if (comment.authorId !== state.currentUserId) {
        state.error = 'You can only delete your own comments.';
        return;
      }

      recordOperation(state);

      // Delete the selected comment and all its nested replies.
      const idsToDelete = [comment.id];

      for (let i = 0; i < idsToDelete.length; i++) {
        const currentId = idsToDelete[i];

        for (const child of Object.values(state.comments.entities)) {
          if (child?.parentId === currentId) {
            idsToDelete.push(child.id);
          }
        }
      }

      commentsAdapter.removeMany(state.comments, idsToDelete);
    },

    // --------------------
    // Switch User
    // --------------------

    switchUser(state, action: PayloadAction<string>) {
      const allowedUsers = ['u1', 'u2', 'u3'];

      if (!allowedUsers.includes(action.payload)) {
        state.error = 'Invalid user.';
        return;
      }

      if (state.currentUserId === action.payload) return;

      recordOperation(state);
      state.currentUserId = action.payload;
    },

    // --------------------
    // Filters
    // --------------------

    setFilters(
      state,
      action: PayloadAction<Partial<FeedFilters>>,
    ) {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
    },

    resetFilters(state) {
      state.filters = {
        savedOnly: false,
        likedOnly: false,
        authorId: 'all',
        keyword: '',
      };
    },

    setCommentSort(
      state,
      action: PayloadAction<'newest' | 'oldest'>,
    ) {
      state.commentSort = action.payload;
    },

    clearError(state) {
      state.error = null;
    },

    // --------------------
    // Undo
    // --------------------

    undo(state) {
      if (state.past.length === 0) {
        state.error = 'Nothing to undo.';
        return;
      }

      const previous = state.past.pop()!;
      state.future.unshift(cloneSnapshot(state));

      restoreSnapshot(state, previous);
      state.error = null;
    },

    // --------------------
    // Redo
    // --------------------

    redo(state) {
      if (state.future.length === 0) {
        state.error = 'Nothing to redo.';
        return;
      }

      const next = state.future.shift()!;
      state.past.push(cloneSnapshot(state));

      if (state.past.length > 20) {
        state.past.shift();
      }

      restoreSnapshot(state, next);
      state.error = null;
    },
  },
});

// ========================
// Actions
// ========================

export const {
  toggleLike,
  toggleBookmark,
  addComment,
  editComment,
  deleteComment,
  switchUser,
  setFilters,
  resetFilters,
  setCommentSort,
  clearError,
  undo,
  redo,
} = feedSlice.actions;

// ========================
// Entity Selectors
// ========================

const postSelectors = postsAdapter.getSelectors<RootState>(
  (state) => state.feed.posts,
);

const commentSelectors = commentsAdapter.getSelectors<RootState>(
  (state) => state.feed.comments,
);

export const selectAllPosts = postSelectors.selectAll;
export const selectAllComments = commentSelectors.selectAll;
export const selectPostById = postSelectors.selectById;
export const selectCommentById = commentSelectors.selectById;

export const selectCurrentUserId = (state: RootState) =>
  state.feed.currentUserId;

export const selectFilters = (state: RootState) =>
  state.feed.filters;

export const selectError = (state: RootState) =>
  state.feed.error;

export const selectCanUndo = (state: RootState) =>
  state.feed.past.length > 0;

export const selectCanRedo = (state: RootState) =>
  state.feed.future.length > 0;

// ========================
// Reaction Selectors
// ========================

export const selectPostReactionCount = (
  state: RootState,
  postId: string,
) => state.feed.reactions[postId]?.length ?? 0;

export const selectIsPostLiked = (
  state: RootState,
  postId: string,
) =>
  (state.feed.reactions[postId] ?? []).includes(
    state.feed.currentUserId,
  );

export const selectIsPostSaved = (
  state: RootState,
  postId: string,
) =>
  (state.feed.bookmarks[postId] ?? []).includes(
    state.feed.currentUserId,
  );

// ========================
// Comments Selectors
// ========================

export const selectCommentsForPost = createSelector(
  [
    selectAllComments,
    (_: RootState, postId: string) => postId,
    (state: RootState) => state.feed.commentSort,
  ],
  (comments, postId, sort) => {
    return comments
      .filter((comment) => comment.postId === postId)
      .sort((a, b) =>
        sort === 'newest'
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  },
);

// ========================
// Feed Filter Selector
// ========================

export const selectFilteredPosts = createSelector(
  [
    selectAllPosts,
    (state: RootState) => state.feed.filters,
    (state: RootState) => state.feed.currentUserId,
    (state: RootState) => state.feed.reactions,
    (state: RootState) => state.feed.bookmarks,
  ],
  (posts, filters, userId, reactions, bookmarks) => {
    return posts.filter((post) => {
      const matchesSaved =
        !filters.savedOnly ||
        (bookmarks[post.id] ?? []).includes(userId);

      const matchesLiked =
        !filters.likedOnly ||
        (reactions[post.id] ?? []).includes(userId);

      const matchesAuthor =
        filters.authorId === 'all' ||
        post.authorId === filters.authorId;

      const matchesKeyword =
        !filters.keyword.trim() ||
        post.text
          .toLowerCase()
          .includes(filters.keyword.trim().toLowerCase());

      return (
        matchesSaved &&
        matchesLiked &&
        matchesAuthor &&
        matchesKeyword
      );
    });
  },
);

export default feedSlice.reducer;