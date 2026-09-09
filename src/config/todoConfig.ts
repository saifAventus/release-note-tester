import type { Priority, Category, FilterStatus, SortOption } from '../types/todo';

export interface PriorityConfig {
  readonly label: string;
  readonly value: Priority;
  readonly badgeClass: string;
  readonly borderClass: string;
  readonly weight: number; // for sorting
}

export const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  high: {
    label: 'High',
    value: 'high',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    borderClass: 'border-l-rose-500',
    weight: 3,
  },
  medium: {
    label: 'Medium',
    value: 'medium',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderClass: 'border-l-amber-500',
    weight: 2,
  },
  low: {
    label: 'Low',
    value: 'low',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderClass: 'border-l-emerald-500',
    weight: 1,
  },
};

export interface CategoryConfig {
  readonly label: string;
  readonly value: Category;
  readonly colorClass: string;
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  work: {
    label: 'Work',
    value: 'work',
    colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  personal: {
    label: 'Personal',
    value: 'personal',
    colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
  study: {
    label: 'Study',
    value: 'study',
    colorClass: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  },
  general: {
    label: 'General',
    value: 'general',
    colorClass: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  },
};

export interface FilterOption {
  readonly label: string;
  readonly value: FilterStatus;
}

export const FILTER_OPTIONS: readonly FilterOption[] = [
  { label: 'All Tasks', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
] as const;

export interface SortConfig {
  readonly label: string;
  readonly value: SortOption;
}

export const SORT_OPTIONS: readonly SortConfig[] = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Priority', value: 'priority' },
  { label: 'Alphabetical', value: 'alphabetical' },
] as const;
