import React from 'react';
import { CheckCircle2, Circle, ListTodo, Trash2 } from 'lucide-react';
import type { TodoStats as TodoStatsType } from '../../types/todo';
import { Button } from '../ui/Button';

export interface TodoStatsProps {
  readonly stats: TodoStatsType;
  readonly onClearCompleted: () => void;
  readonly onMarkAllCompleted: () => void;
}

export const TodoStats: React.FC<TodoStatsProps> = ({
  stats,
  onClearCompleted,
  onMarkAllCompleted,
}) => {
  const { total, completed, active, completionPercentage } = stats;

  return (
    <section className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800/80 p-5 shadow-xl">
      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Tasks</p>
            <p className="text-xl font-bold text-slate-100">{total}</p>
          </div>
        </div>

        <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Circle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">In Progress</p>
            <p className="text-xl font-bold text-amber-400">{active}</p>
          </div>
        </div>

        <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Completed</p>
            <p className="text-xl font-bold text-emerald-400">{completed}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar & Actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Completion Rate</span>
          <span className="text-indigo-400 font-semibold">{completionPercentage}%</span>
        </div>
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/60 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Quick Action Footer */}
      {(completed > 0 || active > 0) && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 flex-wrap text-xs">
          {active > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllCompleted}
              className="text-slate-400 hover:text-indigo-300"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Mark all completed
            </Button>
          )}
          {completed > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={onClearCompleted}
              className="ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear completed ({completed})
            </Button>
          )}
        </div>
      )}
    </section>
  );
};
