import React from 'react';
import { CheckSquare2, Sparkles, Code2, ShieldCheck, Layers } from 'lucide-react';
import { useTodos } from './hooks/useTodos';
import { TodoStats } from './components/todo/TodoStats';
import { TodoInput } from './components/todo/TodoInput';
import { TodoFilterBar } from './components/todo/TodoFilterBar';
import { TodoList } from './components/todo/TodoList';

export const App: React.FC = () => {
  const {
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
  } = useTodos();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden py-10 px-4 sm:px-6 lg:px-8">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Centered App Container */}
      <div className="w-full max-w-3xl mx-auto relative z-10 flex flex-col gap-6">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clean Architecture Demo</span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <CheckSquare2 className="w-6 h-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              TaskFlow
            </h1>
          </div>

          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            A production-ready Todo management application built with decoupled logic, strict TypeScript, and Tailwind CSS.
          </p>
        </header>

        {/* Aggregate Stats & Progress */}
        <TodoStats
          stats={stats}
          onClearCompleted={clearCompleted}
          onMarkAllCompleted={markAllCompleted}
        />

        {/* Input Form */}
        <TodoInput onAddTodo={addTodo} />

        {/* Filter, Search & Sort Bar */}
        <TodoFilterBar
          filterStatus={filterStatus}
          filterPriority={filterPriority}
          filterCategory={filterCategory}
          searchQuery={searchQuery}
          sortBy={sortBy}
          onStatusChange={setFilterStatus}
          onPriorityChange={setFilterPriority}
          onCategoryChange={setFilterCategory}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          onResetFilters={resetFilters}
        />

        {/* Task List */}
        <TodoList
          todos={filteredTodos}
          totalCount={stats.total}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onEdit={editTodo}
          onResetFilters={resetFilters}
        />

        {/* Senior Architect Engineering Showcase Footer */}
        <footer className="mt-8 pt-6 border-t border-slate-900/80 text-center space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/40">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
                <Code2 className="w-4 h-4" />
                <span>Zero `any` Typing</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Strict domain models with immutable updates and complete TypeScript safety.
              </p>
            </div>

            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/40">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1">
                <Layers className="w-4 h-4" />
                <span>Decoupled Business Logic</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                State and persistence encapsulated in custom hooks, keeping UI components pure.
              </p>
            </div>

            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/40">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Config-Driven UI</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Filters, badges, and priorities driven by config tables for infinite scalability.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Tip: Double-click any task to edit inline &bull; Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">Enter</kbd> to save &bull; <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">Esc</kbd> to cancel
          </p>
        </footer>
      </div>
    </main>
  );
};

export default App;
