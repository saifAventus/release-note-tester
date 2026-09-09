import React from 'react';
import { ClipboardList, Sparkles, RotateCcw } from 'lucide-react';
import type { Todo } from '../../types/todo';
import { TodoItem } from './TodoItem';
import { Button } from '../ui/Button';

export interface TodoListProps {
  readonly todos: readonly Todo[];
  readonly totalCount: number;
  readonly onToggle: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onEdit: (id: string, newTitle: string) => void;
  readonly onResetFilters: () => void;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  totalCount,
  onToggle,
  onDelete,
  onEdit,
  onResetFilters,
}) => {
  // Empty state when entire todo list is empty
  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">No tasks created yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-2">
          Your workspace is clear! Start organizing your work by adding a task above.
        </p>
      </div>
    );
  }

  // Filter empty state when search/filter yields zero results
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center bg-slate-900/30 rounded-2xl border border-slate-800/60">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
          <ClipboardList className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300">No matching tasks</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
          We couldn't find any tasks matching your active filter or search criteria.
        </p>
        <Button variant="secondary" size="sm" onClick={onResetFilters}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};
