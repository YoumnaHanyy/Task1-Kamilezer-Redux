import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from './app/store';
import {
  addTask,
  editTask,
  deleteTask,
  moveTask,
  reorderTask,
  undo,
  redo,
  restoreBoard,
  selectColumns,
  selectCanUndo,
  selectCanRedo,
  selectFilteredTasks,
  type Task,
  type ColumnId,
  type Priority,
} from './features/boardSlice';
import './style.css';

const columns: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'doing', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

const emptyTask = {
  title: '',
  description: '',
  assignee: 'Alex',
  dueDate: '',
  priority: 'medium' as Priority,
  labels: [] as string[],
};

export default function App() {
  const dispatch = useAppDispatch();

  const boardColumns = useAppSelector(selectColumns);
  const tasks = useAppSelector((state) => state.board.entities);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);

  const [form, setForm] = useState(emptyTask);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filters = useMemo(
    () => ({
      assignee: assigneeFilter,
      priority: priorityFilter,
      label: labelFilter,
      overdue: overdueOnly,
    }),
    [assigneeFilter, priorityFilter, labelFilter, overdueOnly]
  );

  const filteredTasks = useAppSelector((state) =>
    selectFilteredTasks(state, filters)
  );

  const filteredIds = new Set(filteredTasks.map((task) => task.id));

  // Restore saved board once when the app starts.
  useEffect(() => {
    try {
      const savedBoard = localStorage.getItem('kanban-board');

      if (savedBoard) {
        dispatch(restoreBoard(JSON.parse(savedBoard)));
      }
    } catch {
      localStorage.removeItem('kanban-board');
    }
  }, [dispatch]);

  // Save board changes locally.
  useEffect(() => {
    const board = {
      ids: Object.keys(tasks),
      entities: tasks,
      columns: boardColumns,
    };

    localStorage.setItem('kanban-board', JSON.stringify(board));
  }, [tasks, boardColumns]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) return;

    const taskData = {
      ...form,
      labels: form.labels
        .flatMap((label) => label.split(','))
        .map((label) => label.trim())
        .filter(Boolean),
    };

    if (editingId) {
      dispatch(editTask({ ...taskData, id: editingId }));
      setEditingId(null);
    } else {
      dispatch(addTask(taskData));
    }

    setForm(emptyTask);
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      dueDate: task.dueDate,
      priority: task.priority,
      labels: task.labels,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyTask);
  }

  function move(taskId: string, currentColumn: ColumnId, direction: number) {
    const currentIndex = columns.findIndex(
      (column) => column.id === currentColumn
    );

    const nextColumn = columns[currentIndex + direction];

    if (!nextColumn) return;

    dispatch(
      moveTask({
        taskId,
        column: nextColumn.id,
      })
    );
  }

  function changeOrder(
    taskId: string,
    column: ColumnId,
    direction: number
  ) {
    const currentList = boardColumns[column];
    const currentIndex = currentList.indexOf(taskId);
    const nextIndex = currentIndex + direction;

    if (nextIndex < 0 || nextIndex >= currentList.length) return;

    dispatch(
      reorderTask({
        column,
        fromIndex: currentIndex,
        toIndex: nextIndex,
      })
    );
  }

  const allLabels = Array.from(
    new Set(
      Object.values(tasks)
        .filter((task): task is Task => Boolean(task))
        .flatMap((task) => task.labels)
    )
  );

  return (
    <main className="container">
      <header className="board-header">
        <div>
          <p className="eyebrow">REDUX TOOLKIT · CHALLENGE 04</p>
          <h1>Kanban Board</h1>
          <p className="subtitle">
            Organize your tasks, manage priorities and travel through history.
          </p>
        </div>

        <div className="history-actions">
          <button disabled={!canUndo} onClick={() => dispatch(undo())}>
            ↶ Undo
          </button>

          <button disabled={!canRedo} onClick={() => dispatch(redo())}>
            ↷ Redo
          </button>
        </div>
      </header>

      <section className="panel">
        <h2>{editingId ? 'Edit Task' : 'Create a Task'}</h2>

        <form onSubmit={handleSubmit} className="task-form">
          <input
            placeholder="Task title"
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            required
          />

          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />

          <div className="form-row">
            <select
              value={form.assignee}
              onChange={(event) =>
                setForm({ ...form, assignee: event.target.value })
              }
            >
              <option value="Alex">Alex</option>
              <option value="Sarah">Sarah</option>
              <option value="Mohamed">Mohamed</option>
              <option value="Unassigned">Unassigned</option>
            </select>

            <select
              value={form.priority}
              onChange={(event) =>
                setForm({
                  ...form,
                  priority: event.target.value as Priority,
                })
              }
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>

            <input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm({ ...form, dueDate: event.target.value })
              }
            />
          </div>

          <input
            placeholder="Labels (e.g. UI, Redux, Bug)"
            value={form.labels.join(', ')}
            onChange={(event) =>
              setForm({
                ...form,
                labels: event.target.value.split(','),
              })
            }
          />

          <div className="form-row">
            <button type="submit">
              {editingId ? 'Save Changes' : 'Add Task'}
            </button>

            {editingId && (
              <button type="button" onClick={cancelEditing}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Filters</h2>

        <div className="filters">
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          >
            <option value="">All Assignees</option>
            <option value="Alex">Alex</option>
            <option value="Sarah">Sarah</option>
            <option value="Mohamed">Mohamed</option>
            <option value="Unassigned">Unassigned</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            value={labelFilter}
            onChange={(event) => setLabelFilter(event.target.value)}
          >
            <option value="">All Labels</option>
            {allLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>

          <label className="overdue-filter">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => setOverdueOnly(event.target.checked)}
            />
            Overdue only
          </label>

          <button
            type="button"
            onClick={() => {
              setAssigneeFilter('');
              setPriorityFilter('');
              setLabelFilter('');
              setOverdueOnly(false);
            }}
          >
            Clear Filters
          </button>
        </div>
      </section>

      <section className="kanban-board">
        {columns.map((column) => {
          const visibleTasks = boardColumns[column.id].filter((id) =>
            filteredIds.has(id)
          );

          return (
            <div className="kanban-column" key={column.id}>
              <div className="column-header">
                <h2>{column.title}</h2>
                <span>{visibleTasks.length}</span>
              </div>

              <div className="task-list">
                {visibleTasks.length === 0 && (
                  <p className="empty-state">No tasks here</p>
                )}

                {visibleTasks.map((id) => {
                  const task = tasks[id];

                  if (!task) return null;

                  const overdue =
                    task.dueDate &&
                    task.dueDate < new Date().toISOString().slice(0, 10);

                  return (
                    <article className="task-card" key={task.id}>
                      <div className="task-card-top">
                        <span className={`priority ${task.priority}`}>
                          {task.priority}
                        </span>

                        {overdue && (
                          <span className="overdue">Overdue</span>
                        )}
                      </div>

                      <h3>{task.title}</h3>

                      {task.description && <p>{task.description}</p>}

                      <div className="task-info">
                        <span>👤 {task.assignee}</span>
                        {task.dueDate && <span>📅 {task.dueDate}</span>}
                      </div>

                      <div className="task-labels">
                        {task.labels.map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>

                      <div className="task-actions">
                        <button onClick={() => startEditing(task)}>
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            dispatch(deleteTask(task.id))
                          }
                        >
                          Delete
                        </button>
                      </div>

                      <div className="task-actions">
                        <button
                          disabled={column.id === 'todo'}
                          onClick={() => move(task.id, column.id, -1)}
                        >
                          ← Previous
                        </button>

                        <button
                          disabled={column.id === 'done'}
                          onClick={() => move(task.id, column.id, 1)}
                        >
                          Next →
                        </button>
                      </div>

                      <div className="task-actions">
                        <button
                          disabled={
                            boardColumns[column.id].indexOf(task.id) === 0
                          }
                          onClick={() =>
                            changeOrder(task.id, column.id, -1)
                          }
                        >
                          ↑
                        </button>

                        <button
                          disabled={
                            boardColumns[column.id].indexOf(task.id) ===
                            boardColumns[column.id].length - 1
                          }
                          onClick={() =>
                            changeOrder(task.id, column.id, 1)
                          }
                        >
                          ↓
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}