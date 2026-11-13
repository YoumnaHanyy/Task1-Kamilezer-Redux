import {
  createEntityAdapter,
  createSlice,
  createSelector,
  nanoid,
  type PayloadAction,
} from '@reduxjs/toolkit';

export type Revision = {
  id: string;
  title: string;
  text: string;
  date: string;
};

export type Note = {
  id: string;
  title: string;
  text: string;
  revision: number;
  history: Revision[];
  tags: string[];
  pinned: boolean;
  archived: boolean;
  saved: boolean;
  updatedAt: string;
};

type NotesExtraState = {
  saveQueue: string[];
  archiveCopies: Note[];
  conflictId: string | null;
  search: string;
  tagFilter: string;
};

const notesAdapter = createEntityAdapter<Note>({
  sortComparer: (a, b) => {
    if (a.pinned !== b.pinned) {
      return Number(b.pinned) - Number(a.pinned);
    }

    return b.updatedAt.localeCompare(a.updatedAt);
  },
});

const firstNote: Note = {
  id: 'n1',
  title: 'Welcome',
  text: 'Build a local-first note manager.',
  revision: 1,
  history: [],
  tags: ['welcome'],
  pinned: true,
  archived: false,
  saved: true,
  updatedAt: new Date().toISOString(),
};

const initialState = notesAdapter.getInitialState<NotesExtraState>({
  saveQueue: [],
  archiveCopies: [],
  conflictId: null,
  search: '',
  tagFilter: 'all',
});

notesAdapter.addOne(initialState, firstNote);

const notesSlice = createSlice({
  name: 'notes',
  initialState,

  reducers: {
    addNote: {
      reducer(state, action: PayloadAction<Note>) {
        notesAdapter.addOne(state, action.payload);
        state.saveQueue.push(action.payload.id);
      },

      prepare() {
        const id = nanoid();

        return {
          payload: {
            id,
            title: 'Untitled note',
            text: '',
            revision: 1,
            history: [],
            tags: [],
            pinned: false,
            archived: false,
            saved: false,
            updatedAt: new Date().toISOString(),
          } satisfies Note,
        };
      },
    },

    updateNote(
      state,
      action: PayloadAction<{
        id: string;
        title: string;
        text: string;
      }>
    ) {
      const note = state.entities[action.payload.id];

      if (!note) return;

      if (
        note.title === action.payload.title &&
        note.text === action.payload.text
      ) {
        return;
      }

      note.history.unshift({
        id: nanoid(),
        title: note.title,
        text: note.text,
        date: note.updatedAt,
      });

      note.history = note.history.slice(0, 10);
      note.title = action.payload.title;
      note.text = action.payload.text;
      note.revision += 1;
      note.saved = false;
      note.updatedAt = new Date().toISOString();

      if (!state.saveQueue.includes(note.id)) {
        state.saveQueue.push(note.id);
      }
    },

    deleteNote(state, action: PayloadAction<string>) {
      notesAdapter.removeOne(state, action.payload);

      state.saveQueue = state.saveQueue.filter(
        (id) => id !== action.payload
      );

      state.archiveCopies = state.archiveCopies.filter(
        (note) => note.id !== action.payload
      );

      if (state.conflictId === action.payload) {
        state.conflictId = null;
      }
    },

    togglePin(state, action: PayloadAction<string>) {
      const note = state.entities[action.payload];

      if (!note) return;

      note.pinned = !note.pinned;
      note.saved = false;
      note.updatedAt = new Date().toISOString();

      if (!state.saveQueue.includes(note.id)) {
        state.saveQueue.push(note.id);
      }
    },

    toggleArchive(state, action: PayloadAction<string>) {
      const note = state.entities[action.payload];

      if (!note) return;

      note.archived = !note.archived;
      note.saved = false;
      note.updatedAt = new Date().toISOString();

      if (!state.saveQueue.includes(note.id)) {
        state.saveQueue.push(note.id);
      }
    },

    addTag(
      state,
      action: PayloadAction<{ id: string; tag: string }>
    ) {
      const note = state.entities[action.payload.id];
      const tag = action.payload.tag.trim().toLowerCase();

      if (!note || !tag || note.tags.includes(tag)) return;

      note.tags.push(tag);
      note.saved = false;
      note.updatedAt = new Date().toISOString();

      if (!state.saveQueue.includes(note.id)) {
        state.saveQueue.push(note.id);
      }
    },

    removeTag(
      state,
      action: PayloadAction<{ id: string; tag: string }>
    ) {
      const note = state.entities[action.payload.id];

      if (!note) return;

      note.tags = note.tags.filter(
        (tag) => tag !== action.payload.tag
      );

      note.saved = false;
      note.updatedAt = new Date().toISOString();

      if (!state.saveQueue.includes(note.id)) {
        state.saveQueue.push(note.id);
      }
    },

    restoreRevision(
      state,
      action: PayloadAction<{
        id: string;
        revisionId: string;
      }>
    ) {
      const note = state.entities[action.payload.id];

      if (!note) return;

      const oldRevision = note.history.find(
        (revision) => revision.id === action.payload.revisionId
      );

      if (!oldRevision) return;

      note.history.unshift({
        id: nanoid(),
        title: note.title,
        text: note.text,
        date: note.updatedAt,
      });

      note.history = note.history.slice(0, 10);
      note.title = oldRevision.title;
      note.text = oldRevision.text;
      note.revision += 1;
      note.saved = false;
      note.updatedAt = new Date().toISOString();

      if (!state.saveQueue.includes(note.id)) {
        state.saveQueue.push(note.id);
      }
    },

    syncToArchive(state) {
      state.saveQueue.forEach((id) => {
        const note = state.entities[id];

        if (!note) return;

        const copy = {
          ...note,
          history: [...note.history],
          tags: [...note.tags],
        };

        const existingIndex = state.archiveCopies.findIndex(
          (item) => item.id === id
        );

        if (existingIndex >= 0) {
          state.archiveCopies[existingIndex] = copy;
        } else {
          state.archiveCopies.push(copy);
        }

        note.saved = true;
      });

      state.saveQueue = [];
    },

    simulateArchiveEdit(
      state,
      action: PayloadAction<{ id: string; text: string }>
    ) {
      const localNote = state.entities[action.payload.id];

      const archiveNote = state.archiveCopies.find(
        (note) => note.id === action.payload.id
      );

      if (!localNote || !archiveNote) return;

      archiveNote.text = action.payload.text;
      archiveNote.revision += 1;
      archiveNote.updatedAt = new Date().toISOString();

      if (archiveNote.text !== localNote.text) {
        state.conflictId = localNote.id;
      }
    },

    resolveConflict(
      state,
      action: PayloadAction<{
        id: string;
        strategy: 'local' | 'archive' | 'merge';
      }>
    ) {
      const localNote = state.entities[action.payload.id];

      const archiveNote = state.archiveCopies.find(
        (note) => note.id === action.payload.id
      );

      if (!localNote || !archiveNote) return;

      if (action.payload.strategy === 'archive') {
        localNote.history.unshift({
          id: nanoid(),
          title: localNote.title,
          text: localNote.text,
          date: localNote.updatedAt,
        });

        localNote.history = localNote.history.slice(0, 10);
        localNote.title = archiveNote.title;
        localNote.text = archiveNote.text;
        localNote.revision += 1;
        localNote.updatedAt = new Date().toISOString();
        localNote.saved = true;
        state.saveQueue = state.saveQueue.filter(
          (id) => id !== localNote.id
        );
      }

      if (action.payload.strategy === 'merge') {
        localNote.history.unshift({
          id: nanoid(),
          title: localNote.title,
          text: localNote.text,
          date: localNote.updatedAt,
        });

        localNote.history = localNote.history.slice(0, 10);
        localNote.text =
          `${localNote.text}\n\n--- Archived version ---\n\n${archiveNote.text}`;
        localNote.revision += 1;
        localNote.saved = false;
        localNote.updatedAt = new Date().toISOString();

        if (!state.saveQueue.includes(localNote.id)) {
          state.saveQueue.push(localNote.id);
        }
      }

      if (action.payload.strategy === 'local') {
        archiveNote.title = localNote.title;
        archiveNote.text = localNote.text;
        archiveNote.revision = localNote.revision;
        archiveNote.updatedAt = localNote.updatedAt;
        localNote.saved = true;

        state.saveQueue = state.saveQueue.filter(
          (id) => id !== localNote.id
        );
      }

      state.conflictId = null;
    },

    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },

    setTagFilter(state, action: PayloadAction<string>) {
      state.tagFilter = action.payload;
    },

    importNotes(state, action: PayloadAction<Note[]>) {
      action.payload.forEach((note) => {
        const valid =
          note &&
          typeof note.id === 'string' &&
          typeof note.title === 'string' &&
          typeof note.text === 'string' &&
          typeof note.revision === 'number' &&
          Array.isArray(note.history) &&
          Array.isArray(note.tags);

        if (!valid) return;

        const importedNote: Note = {
          ...note,
          history: note.history.slice(0, 10),
          tags: [...note.tags],
          pinned: Boolean(note.pinned),
          archived: Boolean(note.archived),
          saved: false,
          updatedAt: note.updatedAt || new Date().toISOString(),
        };

        notesAdapter.upsertOne(state, importedNote);

        if (!state.saveQueue.includes(note.id)) {
          state.saveQueue.push(note.id);
        }
      });
    },

    restoreNotes(state, action: PayloadAction<Note[]>) {
      const validNotes = action.payload.filter(
        (note) =>
          note &&
          typeof note.id === 'string' &&
          typeof note.title === 'string' &&
          typeof note.text === 'string' &&
          typeof note.revision === 'number' &&
          Array.isArray(note.history) &&
          Array.isArray(note.tags)
      );

      notesAdapter.setAll(
        state,
        validNotes.map((note) => ({
          ...note,
          history: note.history.slice(0, 10),
          tags: [...note.tags],
        }))
      );

      state.saveQueue = [];
    },

    resetNotes() {
      return initialState;
    },
  },
});

export const {
  addNote,
  updateNote,
  deleteNote,
  togglePin,
  toggleArchive,
  addTag,
  removeTag,
  restoreRevision,
  syncToArchive,
  simulateArchiveEdit,
  resolveConflict,
  setSearch,
  setTagFilter,
  importNotes,
  restoreNotes,
  resetNotes,
} = notesSlice.actions;

type NotesRootState = {
  notes: typeof initialState;
};

const adapterSelectors = notesAdapter.getSelectors(
  (state: NotesRootState) => state.notes
);

export const selectAllNotes = adapterSelectors.selectAll;
export const selectNoteById = adapterSelectors.selectById;

export const selectVisibleNotes = createSelector(
  [selectAllNotes, (state: NotesRootState) => state.notes.search,
    (state: NotesRootState) => state.notes.tagFilter],
  (notes, search, tagFilter) =>
    notes
      .filter((note) => !note.archived)
      .filter((note) => {
        const query = search.toLowerCase().trim();

        return (
          !query ||
          note.title.toLowerCase().includes(query) ||
          note.text.toLowerCase().includes(query)
        );
      })
      .filter(
        (note) =>
          tagFilter === 'all' || note.tags.includes(tagFilter)
      )
);

export const selectArchivedNotes = createSelector(
  [selectAllNotes],
  (notes) => notes.filter((note) => note.archived)
);

export const selectNoteTags = createSelector(
  [selectAllNotes],
  (notes) => [...new Set(notes.flatMap((note) => note.tags))].sort()
);

export const selectUnsavedCount = createSelector(
  [(state: NotesRootState) => state.notes.saveQueue],
  (queue) => queue.length
);

export default notesSlice.reducer;