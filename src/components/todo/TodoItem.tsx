import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, Edit2, CheckSquare, Square, Clock } from 'lucide-react';
import type { Todo } from '../../types/todo';
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from '../../config/todoConfig';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface TodoItemProps {
  readonly todo: Todo;
  readonly onToggle: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onEdit: (id: string, newTitle: string) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggle,
  onDelete,
  onEdit,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const priorityMeta = PRIORITY_CONFIG[todo.priority] ?? PRIORITY_CONFIG.medium;
  const categoryMeta = CATEGORY_CONFIG[todo.category] ?? CATEGORY_CONFIG.general;

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleCommitEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== todo.title) {
      onEdit(todo.id, trimmed);
    } else {
      setEditTitle(todo.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommitEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(todo.title);
      setIsEditing(false);
    }
  };

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(todo.createdAt));

  return (
    <div
      className={`group relative flex items-center justify-between gap-3.5 p-3.5 rounded-xl border transition-all duration-200 ${
        todo.completed
          ? 'bg-slate-900/30 border-slate-800/40 text-slate-500'
          : 'bg-slate-900/70 hover:bg-slate-900/90 border-slate-800/80 hover:border-slate-700/80 shadow-md shadow-black/20'
      } ${priorityMeta.borderClass} border-l-4`}
    >
      {/* Checkbox Toggle */}
      <button
        type="button"
        onClick={() => onToggle(todo.id)}
        className="flex-shrink-0 cursor-pointer text-slate-400 hover:text-indigo-400 transition-colors p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-400 outline-none"
        aria-label={todo.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
      >
        {todo.completed ? (
          <CheckSquare className="w-5 h-5 text-emerald-400 transition-transform scale-105" />
        ) : (
          <Square className="w-5 h-5 transition-transform hover:scale-105" />
        )}
      </button>

      {/* Main Content / Inline Edit */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-950 text-slate-100 text-sm px-3 py-1.5 rounded-lg border border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
            />
            <Button
              variant="icon"
              size="sm"
              onClick={handleCommitEdit}
              title="Save changes"
              className="text-emerald-400 hover:text-emerald-300"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <p
              onDoubleClick={() => setIsEditing(true)}
              className={`text-sm font-medium leading-relaxed select-text cursor-pointer break-words transition-all ${
                todo.completed
                  ? 'line-through text-slate-500 decoration-slate-600'
                  : 'text-slate-200 hover:text-white'
              }`}
              title="Double click to edit"
            >
              {todo.title}
            </p>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Badge className={priorityMeta.badgeClass}>
                {priorityMeta.label}
              </Badge>

              <Badge className={categoryMeta.colorClass}>
                {categoryMeta.label}
              </Badge>

              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="w-3 h-3" />
                {formattedTime}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
        {!isEditing && (
          <Button
            variant="icon"
            onClick={() => setIsEditing(true)}
            aria-label="Edit task"
            title="Edit task"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="icon"
          onClick={() => onDelete(todo.id)}
          aria-label="Delete task"
          title="Delete task"
          className="hover:text-rose-400 hover:bg-rose-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
