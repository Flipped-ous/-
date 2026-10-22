import { useCallback, useReducer } from 'react';
import type { Task, DueCategory } from '../types/index.ts';
import * as logic from '../utils/taskLogic.ts';

type State = { tasks: Task[]; deleted: { task: Task; index: number } | null };
type Action =
  | { type: 'set'; value: Task[] | ((tasks: Task[]) => Task[]) }
  | { type: 'save'; value: Partial<Task> }
  | { type: 'toggle' | 'delete'; id: string }
  | { type: 'move'; id: string; targetId: string; category?: DueCategory }
  | { type: 'undo' | 'dismiss' };

export function taskReducer(state: State, action: Action): State {
  if (action.type === 'set')
    return {
      ...state,
      tasks:
        typeof action.value === 'function'
          ? action.value(state.tasks)
          : action.value,
    };
  if (action.type === 'save')
    return {
      ...state,
      tasks: action.value.id
        ? logic.updateTask(state.tasks, action.value.id, action.value)
        : logic.addTask(state.tasks, action.value),
    };
  if (action.type === 'toggle')
    return { ...state, tasks: logic.toggleTask(state.tasks, action.id) };
  if (action.type === 'delete') {
    const deleted = logic.deleteTask(state.tasks, action.id);
    return deleted.deletedTask
      ? {
          tasks: deleted.updatedTasks,
          deleted: { task: deleted.deletedTask, index: deleted.deletedIndex },
        }
      : state;
  }
  if (action.type === 'move') {
    const tasks = action.category
      ? logic.changeTaskCategory(state.tasks, action.id, action.category)
      : state.tasks;
    return {
      ...state,
      tasks: logic.moveTaskById(tasks, action.id, action.targetId),
    };
  }
  if (action.type === 'undo' && state.deleted)
    return {
      tasks: logic.restoreTask(
        state.tasks,
        state.deleted.task,
        state.deleted.index,
      ),
      deleted: null,
    };
  if (action.type === 'dismiss') return { ...state, deleted: null };
  return state;
}

export function useTasks(initial: Task[]) {
  const [state, dispatch] = useReducer(taskReducer, {
    tasks: initial,
    deleted: null,
  });
  return {
    tasks: state.tasks,
    deletedTaskBackup: state.deleted,
    setTasks: useCallback(
      (value: Task[] | ((tasks: Task[]) => Task[])) =>
        dispatch({ type: 'set', value }),
      [],
    ),
    saveTask: useCallback(
      (value: Partial<Task>) => dispatch({ type: 'save', value }),
      [],
    ),
    toggle: useCallback((id: string) => dispatch({ type: 'toggle', id }), []),
    remove: useCallback((id: string) => dispatch({ type: 'delete', id }), []),
    undo: useCallback(() => dispatch({ type: 'undo' }), []),
    dismiss: useCallback(() => dispatch({ type: 'dismiss' }), []),
    move: useCallback(
      (id: string, targetId: string, category?: DueCategory) =>
        dispatch({ type: 'move', id, targetId, category }),
      [],
    ),
  };
}
