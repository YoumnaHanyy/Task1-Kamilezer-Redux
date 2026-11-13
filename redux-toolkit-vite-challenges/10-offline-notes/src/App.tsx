
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

import {
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
  selectVisibleNotes,
  selectArchivedNotes,
  selectNoteTags,
  selectUnsavedCount,
  type Note,
} from './features/notesSlice';

import { useAppDispatch, useAppSelector } from './app/store';
import './style.css';

const STORAGE_KEY = 'offline-notes-manager';

export default function App() {
  const dispatch = useAppDispatch();

  const visibleNotes = useAppSelector(selectVisibleNotes);
  const archivedNotes = useAppSelector(selectArchivedNotes);
  const tags = useAppSelector(selectNoteTags);
  const unsavedCount = useAppSelector(selectUnsavedCount);

  const allNotes = useAppSelector((state) =>
    Object.values(state.notes.entities).filter(
      (note): note is Note => Boolean(note)
    )
  );

  const archiveCopies = useAppSelector(
    (state) => state.notes.archiveCopies
  );

  const conflictId = useAppSelector(
    (state) => state.notes.conflictId
  );

  const search = useAppSelector(
    (state) => state.notes.search
  );

  const tagFilter = useAppSelector(
    (state) => state.notes.tagFilter
  );

  const [selectedId, setSelectedId] = useState<string | null>('n1');
  const [title, setTitle] = useState('Welcome');
  const [text, setText] = useState(
    'Build a local-first note manager.'
  );
  const [newTag, setNewTag] = useState('');
  const [archiveText, setArchiveText] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const selectedNote = useAppSelector((state) =>
    selectedId ? state.notes.entities[selectedId] ?? null : null
  );

  // Restore notes from localStorage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          dispatch(restoreNotes(parsed as Note[]));
        }
      }
    } catch {
      // Ignore invalid saved data.
    }
  }, [dispatch]);

  // Persist notes locally.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(allNotes)
      );
    } catch {
      // Continue working if localStorage is unavailable.
    }
  }, [allNotes]);

  // Update editor when selected note changes.
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setText(selectedNote.text);
      setArchiveText(selectedNote.text);
    }
  }, [selectedNote]);

  const currentArchiveCopy = useMemo(
    () =>
      archiveCopies.find((copy) => copy.id === selectedId),
    [archiveCopies, selectedId]
  );

  const createNewNote = () => {
    const action = dispatch(addNote());
    setSelectedId(action.payload.id);
    setShowArchived(false);
    setShowHistory(false);
  };

  const selectNote = (note: Note) => {
    setSelectedId(note.id);
    setShowHistory(false);
  };

  const saveCurrentNote = () => {
    if (!selectedId) return;

    dispatch(
      updateNote({
        id: selectedId,
        title,
        text,
      })
    );
  };

  const handleAddTag = () => {
    if (!selectedId || !newTag.trim()) return;

    dispatch(
      addTag({
        id: selectedId,
        tag: newTag,
      })
    );

    setNewTag('');
  };

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify(allNotes, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'my-notes.json';
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleImport = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(
          String(reader.result)
        );

        if (!Array.isArray(parsed)) {
          alert('Invalid JSON: expected an array of notes.');
          return;
        }

        const valid = parsed.every(
          (note) =>
            note &&
            typeof note.id === 'string' &&
            typeof note.title === 'string' &&
            typeof note.text === 'string' &&
            typeof note.revision === 'number' &&
            Array.isArray(note.history) &&
            Array.isArray(note.tags)
        );

        if (!valid) {
          alert('Invalid note data. Please check the JSON file.');
          return;
        }

        dispatch(importNotes(parsed as Note[]));
        alert('Notes imported successfully!');
      } catch {
        alert('Could not read this JSON file.');
      }

      event.target.value = '';
    };

    reader.readAsText(file);
  };

  const simulateConflict = () => {
    if (!selectedNote) return;

    const changedText =
      archiveText.trim() === selectedNote.text.trim()
        ? `${archiveText}\n\nEdited in archived copy.`
        : archiveText;

    dispatch(
      simulateArchiveEdit({
        id: selectedNote.id,
        text: changedText,
      })
    );
  };

  const notesToDisplay = showArchived
    ? archivedNotes
    : visibleNotes;

  return (
    <main className="notes-app">
      <header className="top-header">
        <div>
          <p className="eyebrow">
            REDUX TOOLKIT · CHALLENGE 10 · HARD+
          </p>

          <h1>My Notes</h1>

          <p className="subtitle">
            Your ideas, organized and always available offline.
          </p>
        </div>

        <div className="header-actions">
          <button className="outline-btn" onClick={handleExport}>
            Export JSON
          </button>

          <label className="outline-btn import-label">
            Import JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              hidden
            />
          </label>
        </div>
      </header>

      <section className="status-bar">
        <div>
          <span className="status-dot"></span>
          Local storage enabled
        </div>

        <div>
          {unsavedCount > 0
            ? `${unsavedCount} unsaved changes`
            : 'All changes synced'}
        </div>

        <button
          className="sync-btn"
          onClick={() => dispatch(syncToArchive())}
          disabled={unsavedCount === 0}
        >
          Sync to local archive
        </button>
      </section>

      <div className="workspace">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <button
            className="new-note-btn"
            onClick={createNewNote}
          >
            + Create new note
          </button>

          <div className="sidebar-heading">
            <span>YOUR WORKSPACE</span>
          </div>

          <button
            className={!showArchived ? 'nav-item active' : 'nav-item'}
            onClick={() => setShowArchived(false)}
          >
            <span>All Notes</span>
            <span>{visibleNotes.length}</span>
          </button>

          <button
            className={showArchived ? 'nav-item active' : 'nav-item'}
            onClick={() => setShowArchived(true)}
          >
            <span>Archived</span>
            <span>{archivedNotes.length}</span>
          </button>

          <div className="sidebar-heading tags-heading">
            <span>TAGS</span>
          </div>

          <button
            className={
              tagFilter === 'all'
                ? 'tag-filter active'
                : 'tag-filter'
            }
            onClick={() => dispatch(setTagFilter('all'))}
          >
            All tags
          </button>

          {tags.map((tag) => (
            <button
              key={tag}
              className={
                tagFilter === tag
                  ? 'tag-filter active'
                  : 'tag-filter'
              }
              onClick={() => {
                dispatch(setTagFilter(tag));
                setShowArchived(false);
              }}
            >
              # {tag}
            </button>
          ))}
        </aside>

        {/* NOTES LIST */}
        <section className="notes-list">
          <div className="list-header">
            <div>
              <h2>
                {showArchived ? 'Archived Notes' : 'All Notes'}
              </h2>

              <p>
                {showArchived
                  ? 'Your archived ideas'
                  : 'Manage your thoughts and ideas'}
              </p>
            </div>
          </div>

          <input
            className="search-input"
            placeholder="Search your notes..."
            value={search}
            onChange={(event) =>
              dispatch(setSearch(event.target.value))
            }
          />

          <div className="note-cards">
            {notesToDisplay.map((note) => (
              <button
                key={note.id}
                className={
                  selectedId === note.id
                    ? 'note-card selected'
                    : 'note-card'
                }
                onClick={() => selectNote(note)}
              >
                <div className="note-card-top">
                  <strong>{note.title || 'Untitled note'}</strong>

                  <span className="note-indicators">
                    {note.pinned ? '📌' : ''}
                    {!note.saved ? ' •' : ''}
                  </span>
                </div>

                <p>{note.text || 'No content yet...'}</p>

                <div className="note-card-bottom">
                  <span>Rev. {note.revision}</span>
                  <span>
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="note-tags">
                  {note.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </button>
            ))}

            {notesToDisplay.length === 0 && (
              <p className="empty-state">No notes found.</p>
            )}
          </div>
        </section>

        {/* EDITOR */}
        <section className="editor">
          {!selectedNote ? (
            <div className="empty-editor">
              <h2>Select a note</h2>
              <p>
                Choose a note from the list or create a new one.
              </p>
            </div>
          ) : (
            <>
              <div className="editor-toolbar">
                <span>
                  Revision {selectedNote.revision}
                  {!selectedNote.saved && ' · Unsaved'}
                </span>

                <div>
                  <button
                    className="icon-btn"
                    onClick={() =>
                      dispatch(togglePin(selectedNote.id))
                    }
                  >
                    {selectedNote.pinned ? '📌 Pinned' : 'Pin'}
                  </button>

                  <button
                    className="icon-btn"
                    onClick={() =>
                      dispatch(toggleArchive(selectedNote.id))
                    }
                  >
                    {selectedNote.archived ? 'Restore' : 'Archive'}
                  </button>

                  <button
                    className="icon-btn delete-btn"
                    onClick={() => {
                      dispatch(deleteNote(selectedNote.id));
                      setSelectedId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <input
                className="title-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Note title"
              />

              <textarea
                className="note-textarea"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Start writing your ideas..."
              />

              <div className="editor-footer">
                <span>
                  Last edited{' '}
                  {new Date(
                    selectedNote.updatedAt
                  ).toLocaleString()}
                </span>

                <button
                  className="save-btn"
                  onClick={saveCurrentNote}
                  disabled={
                    title === selectedNote.title &&
                    text === selectedNote.text
                  }
                >
                  Save changes
                </button>
              </div>

              {/* TAGS */}
              <div className="editor-section">
                <div className="section-title">
                  <h3>Tags</h3>
                </div>

                <div className="tag-editor">
                  {selectedNote.tags.map((tag) => (
                    <span className="editable-tag" key={tag}>
                      #{tag}

                      <button
                        onClick={() =>
                          dispatch(
                            removeTag({
                              id: selectedNote.id,
                              tag,
                            })
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="add-tag">
                  <input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(event) =>
                      setNewTag(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleAddTag();
                      }
                    }}
                  />

                  <button onClick={handleAddTag}>Add</button>
                </div>
              </div>

              {/* VERSION HISTORY */}
              <div className="editor-section">
                <div className="section-title">
                  <h3>Version History</h3>

                  <button
                    className="text-btn"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? 'Hide history' : 'View history'}
                  </button>
                </div>

                {showHistory && (
                  <div className="history-list">
                    {selectedNote.history.length === 0 ? (
                      <p className="empty-state">
                        No previous revisions yet. Save an edit to
                        create one.
                      </p>
                    ) : (
                      selectedNote.history.map((revision) => (
                        <div
                          className="history-item"
                          key={revision.id}
                        >
                          <div>
                            <strong>{revision.title}</strong>
                            <p>{revision.text.slice(0, 90)}</p>

                            <small>
                              {new Date(
                                revision.date
                              ).toLocaleString()}
                            </small>
                          </div>

                          <button
                            className="outline-btn"
                            onClick={() =>
                              dispatch(
                                restoreRevision({
                                  id: selectedNote.id,
                                  revisionId: revision.id,
                                })
                              )
                            }
                          >
                            Restore
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* CONFLICT SIMULATOR */}
              <div className="editor-section conflict-section">
                <div className="section-title">
                  <h3>Conflict Simulator</h3>
                  <span className="simulation-label">
                    LOCAL DEMO
                  </span>
                </div>

                <p>
                  Edit a separate archived copy to simulate a
                  conflict.
                </p>

                <textarea
                  className="archive-textarea"
                  value={archiveText}
                  onChange={(event) =>
                    setArchiveText(event.target.value)
                  }
                />

                <button
                  className="outline-btn"
                  onClick={simulateConflict}
                  disabled={!currentArchiveCopy}
                >
                  Simulate archive edit
                </button>

                {!currentArchiveCopy && (
                  <p className="helper-text">
                    Sync this note first to create its archived copy.
                  </p>
                )}

                {conflictId === selectedNote.id && (
                  <div className="conflict-box">
                    <strong>Conflict detected!</strong>

                    <p>
                      The local note and archived copy have
                      different text. Choose how to resolve them.
                    </p>

                    <div className="conflict-actions">
                      <button
                        onClick={() =>
                          dispatch(
                            resolveConflict({
                              id: selectedNote.id,
                              strategy: 'local',
                            })
                          )
                        }
                      >
                        Keep local
                      </button>

                      <button
                        onClick={() =>
                          dispatch(
                            resolveConflict({
                              id: selectedNote.id,
                              strategy: 'archive',
                            })
                          )
                        }
                      >
                        Keep archive
                      </button>

                      <button
                        onClick={() =>
                          dispatch(
                            resolveConflict({
                              id: selectedNote.id,
                              strategy: 'merge',
                            })
                          )
                        }
                      >
                        Merge text
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}