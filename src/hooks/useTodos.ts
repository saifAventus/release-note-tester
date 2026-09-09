import { useState, useMemo, useCallback } from 'react';
import type { Todo, Priority, Category, FilterStatus, SortOption, TodoStats } from '../types/todo';
import { PRIORITY_CONFIG } from '../config/todoConfig';
import { useLocalStorage } from './useLocalStorage';

const INITIAL_TODOS: Todo[] = [
  {
    id: 'demo-1',
    title: 'Review React architecture guidelines with mentor',
    completed: true,
    priority: 'high',
    category: 'work',
    createdAt: Date.now() - 3600000 * 24,
  },
  {
    id: 'demo-2',
    title: 'Build clean, decoupled Todo web app with Tailwind CSS',
    completed: false,
    priority: 'high',
    category: 'work',
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'demo-3',
    title: 'Practice strict TypeScript domain modeling without `any`',
    completed: false,
    priority: 'medium',
    category: 'study',
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'demo-4',
    title: 'Explore modern 2025 React frontend design tokens',
    completed: false,
    priority: 'low',
    category: 'personal',
    createdAt: Date.now() - 3600000 * 1,
  },
];

export interface UseTodosReturn {
  // Data
  readonly filteredTodos: readonly Todo[];
  readonly stats: TodoStats;
  readonly filterStatus: FilterStatus;
  readonly filterPriority: Priority | 'all';
  readonly filterCategory: Category | 'all';
  readonly searchQuery: string;
  readonly sortBy: SortOption;

  // Setters for filters
  readonly setFilterStatus: (status: FilterStatus) => void;
  readonly setFilterPriority: (priority: Priority | 'all') => void;
  readonly setFilterCategory: (category: Category | 'all') => void;
  readonly setSearchQuery: (query: string) => void;
  readonly setSortBy: (sort: SortOption) => void;
  readonly resetFilters: () => void;

  // Todo Operations
  readonly addTodo: (title: string, priority?: Priority, category?: Category) => boolean;
  readonly toggleTodo: (id: string) => void;
  readonly deleteTodo: (id: string) => void;
  readonly editTodo: (id: string, newTitle: string) => void;
  readonly clearCompleted: () => void;
  readonly markAllCompleted: () => void;
}

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useLocalStorage<Todo[]>('taskflow_todos', INITIAL_TODOS);

  // Filter & Search states
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterCategory('all');
    setSearchQuery('');
  }, []);

  // Add a new todo (returns false if title is empty or invalid)
  const addTodo = useCallback(
    (title: string, priority: Priority = 'medium', category: Category = 'general'): boolean => {
      const trimmed = title.trim();
      if (!trimmed) return false;

      const newTodo: Todo = {
        id: crypto.randomUUID ? crypto.randomUUID() : `todo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: trimmed,
        completed: false,
        priority,
        category,
        createdAt: Date.now(),
      };

      setTodos((prev) => [newTodo, ...prev]);
      return true;
    },
    [setTodos]
  );

  // Toggle completion status
  const toggleTodo = useCallback(
    (id: string) => {
      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id
            ? { ...todo, completed: !todo.completed, updatedAt: Date.now() }
            : todo
        )
      );
    },
    [setTodos]
  );

  // Delete a todo by ID
  const deleteTodo = useCallback(
    (id: string) => {
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
    },
    [setTodos]
  );

  // Edit todo title
  const editTodo = useCallback(
    (id: string, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;

      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === id
            ? { ...todo, title: trimmed, updatedAt: Date.now() }
            : todo
        )
      );
    },
    [setTodos]
  );

  // Clear all completed todos
  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((todo) => !todo.completed));
  }, [setTodos]);

  // Mark all active todos as completed
  const markAllCompleted = useCallback(() => {
    setTodos((prev) =>
      prev.map((todo) => ({
        ...todo,
        completed: true,
        updatedAt: Date.now(),
      }))
    );
  }, [setTodos]);

  // Derived statistics (Memoized)
  const stats: TodoStats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const active = total - completed;
    const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, active, completionPercentage };
  }, [todos]);

  // Filtered and Sorted todos (Memoized for optimal performance)
  const filteredTodos = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return todos
      .filter((todo) => {
        // Status filter
        if (filterStatus === 'active' && todo.completed) return false;
        if (filterStatus === 'completed' && !todo.completed) return false;

        // Priority filter
        if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;

        // Category filter
        if (filterCategory !== 'all' && todo.category !== filterCategory) return false;

        // Search query filter
        if (query && !todo.title.toLowerCase().includes(query)) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return b.createdAt - a.createdAt;
          case 'oldest':
            return a.createdAt - b.createdAt;
          case 'priority': {
            const weightA = PRIORITY_CONFIG[a.priority]?.weight ?? 0;
            const weightB = PRIORITY_CONFIG[b.priority]?.weight ?? 0;
            return weightB - weightA;
          }
          case 'alphabetical':
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
  }, [todos, filterStatus, filterPriority, filterCategory, searchQuery, sortBy]);

  return {
    filteredTodos,
    stats,
    filterStatus,
    filterPriority,
    filterCategory,
    searchQuery,
    sortBy,
    setFilterStatus,
    setFilterPriority,
    setFilterCategory,
    setSearchQuery,
    setSortBy,
    resetFilters,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    clearCompleted,
    markAllCompleted,
  };
}
