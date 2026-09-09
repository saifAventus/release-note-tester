export type Priority = 'low' | 'medium' | 'high';

export type FilterStatus = 'all' | 'active' | 'completed';

export type Category = 'personal' | 'work' | 'study' | 'general';

export interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly priority: Priority;
  readonly category: Category;
  readonly createdAt: number;
  readonly updatedAt?: number;
}

export interface TodoStats {
  readonly total: number;
  readonly completed: number;
  readonly active: number;
  readonly completionPercentage: number;
}

export type SortOption = 'newest' | 'oldest' | 'priority' | 'alphabetical';

export interface TodoFilterState {
  readonly status: FilterStatus;
  readonly priority: Priority | 'all';
  readonly category: Category | 'all';
  readonly searchQuery: string;
  readonly sortBy: SortOption;
}
