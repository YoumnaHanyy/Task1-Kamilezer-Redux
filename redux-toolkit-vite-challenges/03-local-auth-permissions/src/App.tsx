import { useState } from 'react';
import { useAppDispatch, useAppSelector } from './app/store';

import {
  DEMO_USERS,
  loginAs,
  logout,
  tick,
  recordPermissionDenied,
  selectCan,
  selectCurrentUser,
  selectDeniedActions,
  selectSessionStatus,
  selectMinutesRemaining,
} from './features/sessionSlice';

import './style.css';

export default function App() {
  const dispatch = useAppDispatch();

  const user = useAppSelector(selectCurrentUser);
  const status = useAppSelector(selectSessionStatus);
  const minutes = useAppSelector(selectMinutesRemaining);
  const deniedActions = useAppSelector(selectDeniedActions);

  const canRead = useAppSelector(selectCan('read'));
  const canCreate = useAppSelector(selectCan('create'));
  const canUpdate = useAppSelector(selectCan('update'));
  const canDelete = useAppSelector(selectCan('delete'));

  const [items, setItems] = useState([
    { id: 1, title: 'First workspace item' },
    { id: 2, title: 'Second workspace item' },
  ]);

  const [newTitle, setNewTitle] = useState('');

  const [privateNote, setPrivateNote] = useState('');
  const [savedNote, setSavedNote] = useState('');

  // Check permission before performing an action
  const attemptAction = (
    allowed: boolean,
    actionName: string,
    callback: () => void
  ) => {
    if (!allowed) {
      dispatch(
        recordPermissionDenied(
          `${actionName} denied for ${user?.role ?? 'guest'}`
        )
      );
      return;
    }

    callback();
  };

  // Create
  const handleCreate = () => {
    if (!newTitle.trim()) return;

    attemptAction(canCreate, 'Create', () => {
      setItems((previous) => [
        ...previous,
        {
          id: Date.now(),
          title: newTitle,
        },
      ]);

      setNewTitle('');
    });
  };

  // Update
  const handleUpdate = (id: number) => {
    attemptAction(canUpdate, 'Update', () => {
      setItems((previous) =>
        previous.map((item) =>
          item.id === id
            ? { ...item, title: `${item.title} (Edited)` }
            : item
        )
      );
    });
  };

  // Delete
  const handleDelete = (id: number) => {
    attemptAction(canDelete, 'Delete', () => {
      setItems((previous) =>
        previous.filter((item) => item.id !== id)
      );
    });
  };

  // Save private note
  const handleSaveNote = () => {
    attemptAction(canUpdate, 'Save note', () => {
      setSavedNote(privateNote);
    });
  };

  // Logout and clear private UI state
  const handleLogout = () => {
    dispatch(logout());
    setItems([]);
    setPrivateNote('');
    setSavedNote('');
  };

  // Login and switch users
  const handleLogin = (role: 'admin' | 'editor' | 'viewer') => {
    dispatch(loginAs(role));
    setItems([
      { id: 1, title: 'First workspace item' },
      { id: 2, title: 'Second workspace item' },
    ]);
    setPrivateNote('');
    setSavedNote('');
  };

  // Session timer: one tick per minute
  const startTimer = () => {
    dispatch(tick());
  };

  return (
    <main className="container">

      <header className="hero">
        <p className="eyebrow">
          REDUX TOOLKIT · CHALLENGE 03
        </p>

        <h1>Local Roles & Permissions</h1>

        <p className="subtitle">
          Authentication and authorization simulator
        </p>
      </header>

      {/* LOGIN */}
      {!user ? (
        <section className="panel">
          <h2>Choose a demo account</h2>

          <p className="muted">
            No password required. Select a role to login.
          </p>

          <div className="role-grid">
            {DEMO_USERS.map((demo) => (
              <button
                className="role-card"
                key={demo.id}
                onClick={() => handleLogin(demo.role)}
              >
                <strong>{demo.name}</strong>
                <span>{demo.role}</span>
                <small>Login as {demo.role}</small>
              </button>
            ))}
          </div>

          {status === 'expired' && (
            <p className="warning">
              Your session has expired. Please login again.
            </p>
          )}
        </section>
      ) : (

        <>
          {/* USER SESSION */}
          <section className="panel user-bar">
            <div>
              <p className="eyebrow">CURRENT SESSION</p>
              <h2>Welcome, {user.name}</h2>
              <p>Role: <strong>{user.role}</strong></p>
              <p>Time remaining: {minutes} minutes</p>
            </div>

            <div className="actions">
              <button onClick={startTimer}>
                Simulate 1 minute
              </button>

              <button onClick={handleLogout}>
                Logout
              </button>

              <select
                value={user.role}
                onChange={(e) =>
                  handleLogin(
                    e.target.value as 'admin' | 'editor' | 'viewer'
                  )
                }
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </section>

          {/* PERMISSIONS */}
          <section className="panel">
            <h2>Your permissions</h2>

            <div className="permission-grid">
              {[
                ['Read', canRead],
                ['Create', canCreate],
                ['Update', canUpdate],
                ['Delete', canDelete],
              ].map(([name, allowed]) => (
                <div className="permission-card" key={String(name)}>
                  <strong>{String(name)}</strong>

                  <span className={allowed ? 'allowed' : 'blocked'}>
                    {allowed ? 'Allowed' : 'Not allowed'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* WORKSPACE */}
          <section className="panel">
            <h2>Workspace</h2>

            {canCreate && (
              <div className="inline-form">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Enter item title"
                />

                <button onClick={handleCreate}>
                  Create
                </button>
              </div>
            )}

            {items.map((item) => (
              <div className="item-row" key={item.id}>
                <strong>{item.title}</strong>

                <div className="actions">
                  {canUpdate && (
                    <button onClick={() => handleUpdate(item.id)}>
                      Edit
                    </button>
                  )}

                  {canDelete && (
                    <button
                      className="danger"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  )}

                  {!canUpdate && !canDelete && (
                    <span className="muted">Read only</span>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* PRIVATE UI */}
          <section className="panel">
            <h2>Private note</h2>

            <input
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              placeholder="Write a private note"
            />

            <button
              onClick={handleSaveNote}
              disabled={!canUpdate}
            >
              Save note
            </button>

            <p>Saved note: {savedNote || 'No saved note'}</p>
          </section>

          {/* ACTIVITY LOG */}
          <section className="panel">
            <h2>Permission denial log</h2>

            {deniedActions.length === 0 ? (
              <p className="muted">No denied actions.</p>
            ) : (
              deniedActions.map((action, index) => (
                <p key={index}>{action}</p>
              ))
            )}
          </section>
        </>
      )}

      <footer>
        Local demo only · Not real authentication or security
      </footer>
    </main>
  );
}