import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Priority, Category } from '../../types/todo';
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from '../../config/todoConfig';
import { Button } from '../ui/Button';

export interface TodoInputProps {
  readonly onAddTodo: (title: string, priority: Priority, category: Category) => boolean;
}

export const TodoInput: React.FC<TodoInputProps> = ({ onAddTodo }) => {
  const [title, setTitle] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('work');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Please enter a task description');
      return;
    }

    const success = onAddTodo(title, priority, category);
    if (success) {
      setTitle('');
      setErrorMessage(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Main Text Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="What needs to be accomplished?"
            value={title}
            onChange={handleInputChange}
            className={`w-full bg-slate-950/80 text-slate-100 placeholder:text-slate-500 text-sm px-4 py-3 rounded-xl border transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
              errorMessage
                ? 'border-rose-500/80 ring-1 ring-rose-500/30'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          />
          {errorMessage && (
            <p className="absolute -bottom-5 left-1 text-xs text-rose-400 font-medium">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Priority, Category, and Submit controls */}
        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          {/* Priority selector */}
          <div className="flex items-center">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              aria-label="Select Priority"
              className="bg-slate-950/80 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 hover:border-slate-700 px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
            >
              {Object.values(PRIORITY_CONFIG).map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} Priority
                </option>
              ))}
            </select>
          </div>

          {/* Category selector */}
          <div className="flex items-center">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              aria-label="Select Category"
              className="bg-slate-950/80 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 hover:border-slate-700 px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
            >
              {Object.values(CATEGORY_CONFIG).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="whitespace-nowrap px-4 py-3"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </div>
      </div>
    </form>
  );
};
