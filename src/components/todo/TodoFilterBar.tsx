import React from 'react';
import { Search, X, ArrowUpDown, Filter } from 'lucide-react';
import type { FilterStatus, Priority, Category, SortOption } from '../../types/todo';
import {
  FILTER_OPTIONS,
  PRIORITY_CONFIG,
  CATEGORY_CONFIG,
  SORT_OPTIONS,
} from '../../config/todoConfig';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface TodoFilterBarProps {
  readonly filterStatus: FilterStatus;
  readonly filterPriority: Priority | 'all';
  readonly filterCategory: Category | 'all';
  readonly searchQuery: string;
  readonly sortBy: SortOption;
  readonly onStatusChange: (status: FilterStatus) => void;
  readonly onPriorityChange: (priority: Priority | 'all') => void;
  readonly onCategoryChange: (category: Category | 'all') => void;
  readonly onSearchChange: (query: string) => void;
  readonly onSortChange: (sort: SortOption) => void;
  readonly onResetFilters: () => void;
}

export const TodoFilterBar: React.FC<TodoFilterBarProps> = ({
  filterStatus,
  filterPriority,
  filterCategory,
  searchQuery,
  sortBy,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onSearchChange,
  onSortChange,
  onResetFilters,
}) => {
  const isFiltered =
    filterStatus !== 'all' ||
    filterPriority !== 'all' ||
    filterCategory !== 'all' ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-3 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 backdrop-blur-md">
      {/* Search and Sort controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Input
            type="text"
            placeholder="Search tasks by title..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            startIcon={<Search className="w-4 h-4" />}
            endIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="hover:text-slate-200 cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex items-center w-full sm:w-auto">
            <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-slate-900/90 text-slate-200 text-xs font-medium rounded-xl border border-slate-800 hover:border-slate-700 pl-9 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 cursor-pointer w-full appearance-none"
              aria-label="Sort tasks"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-900 text-slate-200">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              title="Reset all active filters"
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs: Status, Priority & Category */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Status Filter Tabs */}
        <div className="inline-flex p-1 bg-slate-950/70 rounded-xl border border-slate-800/80">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filterStatus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Priority & Category Dropdown Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={filterPriority}
              onChange={(e) => onPriorityChange(e.target.value as Priority | 'all')}
              className="bg-slate-950/70 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              aria-label="Filter by priority"
            >
              <option value="all">All Priorities</option>
              {Object.values(PRIORITY_CONFIG).map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} Priority
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => onCategoryChange(e.target.value as Category | 'all')}
            className="bg-slate-950/70 text-slate-300 text-xs font-medium rounded-lg border border-slate-800 px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {Object.values(CATEGORY_CONFIG).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
