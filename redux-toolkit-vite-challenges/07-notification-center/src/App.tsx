import { useEffect, useState } from 'react';

import {
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
  selectVisibleNotifications,
  selectUnreadCount,
  selectActiveCount,
  selectArchivedCount,
  type Priority,
  type Category,
} from './features/notificationsSlice';

import { useAppDispatch, useAppSelector } from './app/store';

import './style.css';

function App() {
  const dispatch = useAppDispatch();

  const notifications = useAppSelector(selectVisibleNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const activeCount = useAppSelector(selectActiveCount);
  const archivedCount = useAppSelector(selectArchivedCount);

  const [autoStream, setAutoStream] = useState(false);

  // Generate notifications automatically.
  useEffect(() => {
    if (!autoStream) return;

    const interval = setInterval(() => {
      dispatch(generate());
    }, 10000);

    return () => clearInterval(interval);
  }, [autoStream, dispatch]);

  // Update snoozed notifications.
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(tick());
    }, 1000);

    return () => clearInterval(interval);
  }, [dispatch]);

  // Group notifications by day.
  const groupedNotifications = notifications.reduce<
    Record<string, typeof notifications>
  >((groups, notification) => {
    const day = new Date(notification.createdAt).toLocaleDateString();

    if (!groups[day]) {
      groups[day] = [];
    }

    groups[day].push(notification);

    return groups;
  }, {});

  const handleGenerate = () => {
    dispatch(generate());
  };

  const handleDeleteArchived = () => {
    if (window.confirm('Delete all archived notifications?')) {
      dispatch(deleteArchived());
    }
  };

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>Notification Center</h1>
          <p>Manage your notifications in one place.</p>
        </div>

        <button className="primary-btn" onClick={handleGenerate}>
          + Generate Notification
        </button>
      </header>

      <section className="stats">
        <div className="stat-card">
          <span>Unread</span>
          <h2>{unreadCount}</h2>
        </div>

        <div className="stat-card">
          <span>Active</span>
          <h2>{activeCount}</h2>
        </div>

        <div className="stat-card">
          <span>Archived</span>
          <h2>{archivedCount}</h2>
        </div>
      </section>

      <section className="controls">
        <div>
          <label>Priority</label>

          <select
            onChange={(e) =>
              dispatch(
                setPriorityFilter(
                  e.target.value as Priority | 'all'
                )
              )
            }
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label>Category</label>

          <select
            onChange={(e) =>
              dispatch(
                setCategoryFilter(
                  e.target.value as Category | 'all'
                )
              )
            }
          >
            <option value="all">All categories</option>
            <option value="system">System</option>
            <option value="task">Task</option>
            <option value="message">Message</option>
            <option value="reminder">Reminder</option>
          </select>
        </div>

        <div>
          <label>View</label>

          <select
            onChange={(e) =>
              dispatch(setShowArchived(e.target.value === 'archived'))
            }
          >
            <option value="active">Active notifications</option>
            <option value="archived">Archived notifications</option>
          </select>
        </div>
      </section>

      <section className="toolbar">
        <button onClick={() => dispatch(markAllRead())}>
          Mark all as read
        </button>

        <button onClick={() => setAutoStream(!autoStream)}>
          {autoStream ? 'Stop Auto Stream' : 'Start Auto Stream'}
        </button>

        <button onClick={handleDeleteArchived}>
          Delete all archived
        </button>
      </section>

      <section className="notification-list">
        {Object.entries(groupedNotifications).map(([day, items]) => (
          <div className="day-group" key={day}>
            <h2 className="day-title">{day}</h2>

            {items.map((notice) => (
              <article
                className={`notification-card ${
                  notice.read ? 'read' : 'unread'
                }`}
                key={notice.id}
              >
                <div className="notification-content">
                  <div className="notification-heading">
                    <span className={`priority ${notice.priority}`}>
                      {notice.priority}
                    </span>

                    <span className="category">
                      {notice.category}
                    </span>

                    {!notice.read && (
                      <span className="unread-label">New</span>
                    )}
                  </div>

                  <p>{notice.text}</p>

                  <small>
                    {new Date(notice.createdAt).toLocaleTimeString()}
                  </small>
                </div>

                <div className="notification-actions">
                  {notice.read ? (
                    <button
                      onClick={() =>
                        dispatch(markUnread(notice.id))
                      }
                    >
                      Mark unread
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        dispatch(markRead(notice.id))
                      }
                    >
                      Mark read
                    </button>
                  )}

                  {notice.snoozedUntil === null && (
                    <button
                      onClick={() =>
                        dispatch(
                          snoozeNotice({
                            id: notice.id,
                            until: Date.now() + 10000,
                          })
                        )
                      }
                    >
                      Snooze 10s
                    </button>
                  )}

                  {notice.archived ? (
                    <button
                      onClick={() =>
                        dispatch(restoreNotice(notice.id))
                      }
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        dispatch(archiveNotice(notice.id))
                      }
                    >
                      Archive
                    </button>
                  )}

                  <button
                    className="delete-btn"
                    onClick={() =>
                      dispatch(deleteNotice(notice.id))
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="empty-state">
            <h2>No notifications found</h2>
            <p>Your notifications will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;