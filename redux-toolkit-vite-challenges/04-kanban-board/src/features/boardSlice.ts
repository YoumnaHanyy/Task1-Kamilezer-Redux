import {
  createSlice,
  createEntityAdapter,
  createSelector,
  PayloadAction,
} from '@reduxjs/toolkit';
import type { RootState } from '../app/store';

export type ColumnId = 'todo' | 'doing' | 'review' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export type Task = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  labels: string[];
};

type Columns = Record<ColumnId, string[]>;

const columnNames: ColumnId[] = ['todo', 'doing', 'review', 'done'];

const tasksAdapter = createEntityAdapter<Task>();

const initialData = tasksAdapter.getInitialState({
  columns: {
    todo: ['1'],
    doing: [],
    review: [],
    done: [],
  } as Columns,
});

export type BoardData = typeof initialData;

type BoardState = BoardData & {
  past: BoardData[];
  future: BoardData[];
};

const initialState: BoardState = {
  ...initialData,
  entities: {
    '1': {
      id: '1',
      title: 'Set up normalized entities',
      description: 'Use createEntityAdapter for tasks',
      assignee: 'Alex',
      dueDate: '',
      priority: 'high',
      labels: ['Redux'],
    },
  },
  past: [],
  future: [],
};

function copyBoard(state: BoardState): BoardData {
  return {
    ids: [...state.ids],
    entities: { ...state.entities },
    columns: {
      todo: [...state.columns.todo],
      doing: [...state.columns.doing],
      review: [...state.columns.review],
      done: [...state.columns.done],
    },
  };
}

function saveHistory(state: BoardState) {
  state.past.push(copyBoard(state));

  if (state.past.length > 20) {
    state.past.shift();
  }

  state.future = [];
}

function removeFromColumns(state: BoardState, taskId: string) {
  columnNames.forEach((column) => {
    state.columns[column] = state.columns[column].filter(
      (id) => id !== taskId
    );
  });
}

function restoreData(state: BoardState, data: BoardData) {
  state.ids = [...data.ids];
  state.entities = { ...data.entities };

  state.columns = {
    todo: [...data.columns.todo],
    doing: [...data.columns.doing],
    review: [...data.columns.review],
    done: [...data.columns.done],
  };
}

function validateBoard(data: BoardData): BoardData {
  const validIds = new Set(
    data.ids.filter((id) => Boolean(data.entities[id]))
  );

  const columns: Columns = {
    todo: [],
    doing: [],
    review: [],
    done: [],
  };

  const assignedIds = new Set<string>();

  columnNames.forEach((column) => {
    data.columns?.[column]?.forEach((id) => {
      if (validIds.has(id) && !assignedIds.has(id)) {
        columns[column].push(id);
        assignedIds.add(id);
      }
    });
  });

  // Tasks missing from all columns are placed in Todo.
  validIds.forEach((id) => {
    if (!assignedIds.has(id)) {
      columns.todo.push(id);
    }
  });

  return {
    ids: [...validIds],
    entities: Object.fromEntries(
      [...validIds].map((id) => [id, data.entities[id]])
    ),
    columns,
  };
}

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    addTask: {
      reducer(state, action: PayloadAction<Task>) {
        const task = action.payload;

        if (!task.title.trim()) return;

        saveHistory(state);
        tasksAdapter.addOne(state, task);
        state.columns.todo.push(task.id);
      },
      prepare(task: Omit<Task, 'id'>) {
        return {
          payload: {
            ...task,
            id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
          },
        };
      },
    },

    editTask(state, action: PayloadAction<Task>) {
      const task = action.payload;

      if (!state.entities[task.id] || !task.title.trim()) return;

      saveHistory(state);
      tasksAdapter.updateOne(state, {
        id: task.id,
        changes: task,
      });
    },

    deleteTask(state, action: PayloadAction<string>) {
      const id = action.payload;

      if (!state.entities[id]) return;

      saveHistory(state);
      tasksAdapter.removeOne(state, id);
      removeFromColumns(state, id);
    },

    assignTask(
      state,
      action: PayloadAction<{ id: string; assignee: string }>
    ) {
      const { id, assignee } = action.payload;

      if (!state.entities[id]) return;

      saveHistory(state);
      tasksAdapter.updateOne(state, {
        id,
        changes: { assignee },
      });
    },

    moveTask(
      state,
      action: PayloadAction<{
        taskId: string;
        column: ColumnId;
        index?: number;
      }>
    ) {
      const { taskId, column, index } = action.payload;

      if (!state.entities[taskId]) return;

      const currentColumn = columnNames.find((name) =>
        state.columns[name].includes(taskId)
      );

      if (!currentColumn) return;

      const oldIndex = state.columns[currentColumn].indexOf(taskId);
      const targetIndex = Math.max(
        0,
        Math.min(index ?? state.columns[column].length, state.columns[column].length)
      );

      if (currentColumn === column && oldIndex === targetIndex) return;

      saveHistory(state);
      removeFromColumns(state, taskId);

      const destination = state.columns[column];
      destination.splice(
        Math.min(targetIndex, destination.length),
        0,
        taskId
      );
    },

    reorderTask(
      state,
      action: PayloadAction<{
        column: ColumnId;
        fromIndex: number;
        toIndex: number;
      }>
    ) {
      const { column, fromIndex, toIndex } = action.payload;
      const tasks = state.columns[column];

      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= tasks.length ||
        toIndex >= tasks.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      saveHistory(state);

      const [taskId] = tasks.splice(fromIndex, 1);
      tasks.splice(toIndex, 0, taskId);
    },

    undo(state) {
      if (state.past.length === 0) return;

      const previous = state.past[state.past.length - 1];
      state.past.pop();
      state.future.push(copyBoard(state));

      restoreData(state, previous);
    },

    redo(state) {
      if (state.future.length === 0) return;

      const next = state.future[state.future.length - 1];
      state.future.pop();
      state.past.push(copyBoard(state));

      if (state.past.length > 20) {
        state.past.shift();
      }

      restoreData(state, next);
    },

    restoreBoard(state, action: PayloadAction<BoardData>) {
      const validated = validateBoard(action.payload);

      restoreData(state, validated);
      state.past = [];
      state.future = [];
    },
  },
});

export const {
  addTask,
  editTask,
  deleteTask,
  assignTask,
  moveTask,
  reorderTask,
  undo,
  redo,
  restoreBoard,
} = boardSlice.actions;

export const {
  selectAll: selectAllTasks,
  selectById: selectTaskById,
} = tasksAdapter.getSelectors<RootState>((state) => state.board);

export const selectColumns = (state: RootState) => state.board.columns;
export const selectCanUndo = (state: RootState) =>
  state.board.past.length > 0;
export const selectCanRedo = (state: RootState) =>
  state.board.future.length > 0;

export const selectFilteredTasks = createSelector(
  [
    selectAllTasks,
    (_state: RootState, filters: {
      assignee: string;
      priority: string;
      label: string;
      overdue: boolean;
    }) => filters,
  ],
  (tasks, filters) => {
    const today = new Date().toISOString().slice(0, 10);

    return tasks.filter((task) => {
      const matchesAssignee =
        !filters.assignee || task.assignee === filters.assignee;

      const matchesPriority =
        !filters.priority || task.priority === filters.priority;

      const matchesLabel =
        !filters.label || task.labels.includes(filters.label);

      const isOverdue =
        Boolean(task.dueDate) &&
        task.dueDate < today;

      const matchesOverdue = !filters.overdue || isOverdue;

      return (
        matchesAssignee &&
        matchesPriority &&
        matchesLabel &&
        matchesOverdue
      );
    });
  }
);

export default boardSlice.reducer;