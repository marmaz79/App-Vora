import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  BookOpen,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  Search,
  Filter,
  Flame,
  TrendingUp,
  FileText,
  Volume2,
  Sparkles,
  BookMarked,
  Check,
  Copy,
  ChevronDown,
  ArrowLeft,
  Calendar,
  Camera,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Book, BookReadingStat } from '../types';
import { storageService } from '../services/storageService';

interface StatsTabProps {
  books: Book[];
  onOpenBook?: (book: Book) => void;
  onBack?: () => void;
}

type FilterOption = 'all' | 'in_progress' | 'completed' | 'not_started';
type SortOption = 'progress' | 'time' | 'pages' | 'title';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// Flip7 Cream & Gold Tactile Tooltip
const CustomBarTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#FFF8E7] border-2 border-[#FFD23F] rounded-2xl px-3.5 py-2.5 shadow-accent-glow text-xs select-none">
        <div className="font-extrabold text-[#1E8C86] flex items-center justify-between gap-3 mb-1">
          <span>{data.dayLabel} ({data.fullDate})</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-900 font-black text-sm">
          <span>{data.pages} pagine lette</span>
        </div>
        <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
          ~{data.minutes} min di lettura stimati
        </div>
      </div>
    );
  }
  return null;
};

export const StatsTab: React.FC<StatsTabProps> = ({
  books,
  onOpenBook,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('progress');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Smooth entrance animation for the chart when the tab is mounted
  useEffect(() => {
    setChartVisible(false);
    setAnimationKey((k) => k + 1);
    const timer = setTimeout(() => {
      setChartVisible(true);
    }, 70);
    return () => clearTimeout(timer);
  }, []);

  // Compute stats for all books
  const bookStats = useMemo<BookReadingStat[]>(() => {
    return storageService.getAllBooksStats(books);
  }, [books]);

  // Daily Reading History for the past week
  const dailyData = useMemo(() => {
    return storageService.getDailyReadingHistory();
  }, []);

  const totalWeeklyPages = useMemo(() => {
    return dailyData.reduce((acc, d) => acc + d.pages, 0);
  }, [dailyData]);

  const dailyAverage = useMemo(() => {
    return Math.round(totalWeeklyPages / Math.max(1, dailyData.length));
  }, [totalWeeklyPages, dailyData]);

  const bestDay = useMemo(() => {
    return [...dailyData].sort((a, b) => b.pages - a.pages)[0] || { pages: 0, dayLabel: '-' };
  }, [dailyData]);

  // Overall Global Aggregates
  const summary = useMemo(() => {
    const totalBooks = bookStats.length;
    const totalPagesAll = bookStats.reduce((acc, b) => acc + b.totalPages, 0);
    const totalPagesRead = bookStats.reduce((acc, b) => acc + b.pagesRead, 0);
    const totalMinutesSpent = bookStats.reduce((acc, b) => acc + b.estimatedSpentMinutes, 0);
    const totalMinutesRemaining = bookStats.reduce((acc, b) => acc + b.estimatedRemainingMinutes, 0);
    const completedBooks = bookStats.filter((b) => b.percentComplete >= 100).length;
    const inProgressBooks = bookStats.filter((b) => b.percentComplete > 0 && b.percentComplete < 100).length;
    const notStartedBooks = bookStats.filter((b) => b.percentComplete === 0).length;
    const overallProgress = totalPagesAll > 0 ? Math.round((totalPagesRead / totalPagesAll) * 100) : 0;

    return {
      totalBooks,
      totalPagesAll,
      totalPagesRead,
      totalMinutesSpent,
      totalMinutesRemaining,
      completedBooks,
      inProgressBooks,
      notStartedBooks,
      overallProgress,
    };
  }, [bookStats]);

  // Filtered and Sorted Book Stats
  const filteredBookStats = useMemo(() => {
    return bookStats
      .filter((stat) => {
        if (filter === 'in_progress' && (stat.percentComplete === 0 || stat.percentComplete >= 100)) {
          return false;
        }
        if (filter === 'completed' && stat.percentComplete < 100) {
          return false;
        }
        if (filter === 'not_started' && stat.percentComplete > 0) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = stat.title.toLowerCase().includes(q);
          const matchAuthor = stat.author ? stat.author.toLowerCase().includes(q) : false;
          if (!matchTitle && !matchAuthor) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case 'progress':
            return b.percentComplete - a.percentComplete;
          case 'time':
            return b.estimatedSpentMinutes - a.estimatedSpentMinutes;
          case 'pages':
            return b.pagesRead - a.pagesRead;
          case 'title':
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
  }, [bookStats, filter, sort, searchQuery]);

  const formatMinutes = (totalMinutes: number): string => {
    if (totalMinutes <= 0) return '0 min';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleCopySummary = () => {
    const text = [
      `📊 Statistiche di Lettura Vora`,
      `Pagine lette totali: ${summary.totalPagesRead} su ${summary.totalPagesAll} (${summary.overallProgress}%)`,
      `Pagine lette questa settimana: ${totalWeeklyPages} (Media: ${dailyAverage}/giorno)`,
      `Tempo di lettura dedicato stimato: ${formatMinutes(summary.totalMinutesSpent)}`,
      `Tempo rimanente stimato: ${formatMinutes(summary.totalMinutesRemaining)}`,
      `Libri: ${summary.totalBooks} (${summary.completedBooks} completati, ${summary.inProgressBooks} in corso)`,
    ].join('\n');

    try {
      navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <section className="flex flex-col gap-4 select-none pb-28 animate-fade-in text-slate-800" aria-label="Statistiche di lettura">
      {/* Header */}
      <div className="pt-2 px-1 flex items-center justify-between border-b-2 border-dashed border-[#2BA8A2]/30 pb-3">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Torna indietro"
              className="w-9 h-9 rounded-full bg-white text-slate-600 hover:text-[#1E8C86] hover:bg-[#E8F6F5] flex items-center justify-center transition-all active:scale-95 shadow-xs border border-[#2BA8A2]/20"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1E8C86] tracking-tight flex items-center gap-2">
              Statistiche
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD23F] shadow-accent-glow inline-block" />
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Pagine lette e tempo stimato dedicato a ciascun libro
            </p>
          </div>
        </div>

        {/* Copy Summary Button - Flip7 Gold Pill */}
        <button
          type="button"
          onClick={handleCopySummary}
          aria-label="Copia riepilogo statistiche"
          className="px-4 py-2 rounded-full bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] hover:bg-[#FFD23F] border-2 border-[#E6B800] text-xs font-black text-[#1E8C86] flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-accent-glow"
        >
          {copiedSummary ? (
            <>
              <Check size={14} strokeWidth={3} className="text-[#1E8C86]" />
              <span>Copiato!</span>
            </>
          ) : (
            <>
              <Copy size={14} className="text-[#1E8C86]" />
              <span className="hidden sm:inline">Copia riepilogo</span>
              <span className="sm:hidden">Copia</span>
            </>
          )}
        </button>
      </div>

      {/* 1. Global KPI Metrics Cards (Flip7 White Cards with Colored Left Border) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Pagine Lette (Primary Teal Accent) */}
        <div className="p-3.5 rounded-2xl bg-white border-l-[6px] border-l-[#2BA8A2] border-y border-r border-[#2BA8A2]/15 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1E8C86]">Pagine lette</span>
            <div className="w-7 h-7 rounded-lg bg-[#E8F6F5] text-[#1E8C86] flex items-center justify-center">
              <BookOpen size={15} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {summary.totalPagesRead}
              <span className="text-xs font-bold text-slate-400 ml-1">/ {summary.totalPagesAll}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-bold mt-1">
              <span className="text-[#1E8C86] font-black">{summary.overallProgress}%</span> del totale
            </div>
          </div>
        </div>

        {/* Tempo Dedicato (Accent Gold Accent) */}
        <div className="p-3.5 rounded-2xl bg-white border-l-[6px] border-l-[#FFD23F] border-y border-r border-[#2BA8A2]/15 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1E8C86]">Tempo dedicato</span>
            <div className="w-7 h-7 rounded-lg bg-[#FFF8E7] text-[#1E8C86] flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatMinutes(summary.totalMinutesSpent)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              stimato sui testi letti
            </div>
          </div>
        </div>

        {/* Tempo Rimanente (Sky Blue Accent) */}
        <div className="p-3.5 rounded-2xl bg-white border-l-[6px] border-l-[#5DADE2] border-y border-r border-[#2BA8A2]/15 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#2980B9]">Tempo rimanente</span>
            <div className="w-7 h-7 rounded-lg bg-[#5DADE2]/15 text-[#5DADE2] flex items-center justify-center">
              <Hourglass size={15} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatMinutes(summary.totalMinutesRemaining)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              per completare i libri
            </div>
          </div>
        </div>

        {/* Libri Completati / In corso (Success Accent) */}
        <div className="p-3.5 rounded-2xl bg-white border-l-[6px] border-l-[#27AE60] border-y border-r border-[#2BA8A2]/15 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#27AE60]">Stato libri</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#27AE60] flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {summary.completedBooks}
              <span className="text-xs font-bold text-slate-400 ml-1">/ {summary.totalBooks}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {summary.inProgressBooks} libri in corso
            </div>
          </div>
        </div>
      </div>

      {/* 2. RECHARTS BAR CHART: Pagine lette nell'ultima settimana (Flip7 Palette) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#2BA8A2]/20 shadow-card flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-dashed border-[#2BA8A2]/20 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E8F6F5] text-[#1E8C86] flex items-center justify-center">
                <BarChart3 size={16} />
              </div>
              <h2 className="text-base font-black text-slate-900">
                Pagine lette giornalmente (ultima settimana)
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Andamento costante giorno per giorno basato sulle sessioni di lettura
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-full bg-[#E8F6F5] text-[#1E8C86] border border-[#2BA8A2]/30 font-extrabold flex items-center gap-1.5 shadow-xs">
              <TrendingUp size={13} className="text-[#2BA8A2]" />
              <span>Totale settimana: <strong className="text-slate-900">{totalWeeklyPages} pag</strong></span>
            </div>
            <div className="hidden sm:flex px-3 py-1.5 rounded-full bg-[#FFF8E7] text-[#1E8C86] border border-[#FFD23F] font-extrabold items-center gap-1.5 shadow-xs">
              <Flame size={13} className="text-[#EF6C4A]" />
              <span>Top: <strong className="text-slate-900">{bestDay.dayLabel} ({bestDay.pages} pag)</strong></span>
            </div>
          </div>
        </div>

        {/* The Recharts Bar Chart Container with Fluid Entrance Animation */}
        <div
          className={`w-full h-52 sm:h-60 pt-2 transition-all duration-700 ease-out transform ${
            chartVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-[0.98]'
          }`}
        >
          <ResponsiveContainer width="100%" height="100%" key={`recharts-container-${animationKey}`}>
            <BarChart
              data={dailyData}
              margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="dayLabel"
                stroke="#1E8C86"
                fontSize={12}
                fontWeight={700}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                fontWeight={600}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomBarTooltip />}
                cursor={{ fill: 'rgba(43, 168, 162, 0.08)', radius: 8 }}
              />
              <Bar
                dataKey="pages"
                name="Pagine lette"
                radius={[8, 8, 0, 0]}
                isAnimationActive={true}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {dailyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pages === bestDay.pages && entry.pages > 0 ? '#FFD23F' : '#2BA8A2'}
                    stroke={entry.pages === bestDay.pages && entry.pages > 0 ? '#E6B800' : '#1E8C86'}
                    strokeWidth={1.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Chart Footnote */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-[#2BA8A2]/15">
          <span>Media giornaliera: <strong className="text-slate-900 font-extrabold">{dailyAverage} pagine/giorno</strong></span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#2BA8A2] inline-block" />
              <span>Standard</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#FFD23F] border border-[#E6B800] inline-block" />
              <span>Miglior giorno</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Book-by-Book Breakdown Section */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookMarked size={20} className="text-[#1E8C86]" />
              <span>Dettaglio per ciascun libro</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pagine lette, percentuale di completamento e tempo stimato dedicato
            </p>
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-bold">Ordina per:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                aria-label="Ordina statistiche libri"
                className="bg-white border-2 border-[#2BA8A2]/30 text-xs font-black text-[#1E8C86] rounded-full py-1.5 pl-3.5 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2BA8A2] cursor-pointer shadow-xs"
              >
                <option value="progress">Avanzamento %</option>
                <option value="time">Tempo dedicato</option>
                <option value="pages">Pagine lette</option>
                <option value="title">Titolo</option>
              </select>
              <ChevronDown size={14} className="text-[#1E8C86] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Pills + Search */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Box (Cream Surface) */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1E8C86]" />
            <input
              type="text"
              placeholder="Cerca libro o autore..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FFF8E7] border-2 border-[#2BA8A2]/25 rounded-full text-xs text-slate-900 font-bold placeholder-[#1E8C86]/60 focus:outline-none focus:border-[#2BA8A2] shadow-xs"
            />
          </div>

          {/* Status Filter Chips (Pill Buttons) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 ${
                filter === 'all'
                  ? 'bg-[#1E8C86] text-white shadow-teal-glow'
                  : 'bg-white border border-[#2BA8A2]/30 text-slate-600 hover:text-[#1E8C86]'
              }`}
            >
              Tutti ({bookStats.length})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 ${
                filter === 'in_progress'
                  ? 'bg-[#FFD23F] text-[#1E8C86] shadow-accent-glow'
                  : 'bg-white border border-[#2BA8A2]/30 text-slate-600 hover:text-[#1E8C86]'
              }`}
            >
              In lettura ({summary.inProgressBooks})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 ${
                filter === 'completed'
                  ? 'bg-[#27AE60] text-white shadow-sm'
                  : 'bg-white border border-[#2BA8A2]/30 text-slate-600 hover:text-[#1E8C86]'
              }`}
            >
              Completati ({summary.completedBooks})
            </button>
            <button
              onClick={() => setFilter('not_started')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 ${
                filter === 'not_started'
                  ? 'bg-[#1E8C86] text-white shadow-teal-glow'
                  : 'bg-white border border-[#2BA8A2]/30 text-slate-600 hover:text-[#1E8C86]'
              }`}
            >
              Da iniziare ({summary.notStartedBooks})
            </button>
          </div>
        </div>

        {/* Book Stats List */}
        {filteredBookStats.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white border-2 border-dashed border-[#2BA8A2]/30 shadow-card">
            <BookOpen size={36} className="mx-auto text-[#2BA8A2] mb-2 opacity-50" />
            <p className="text-sm font-black text-slate-900">Nessun libro trovato</p>
            <p className="text-xs text-slate-500 mt-1">
              Prova a cambiare il filtro o la ricerca per visualizzare le statistiche
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredBookStats.map((stat) => {
              const originalBook = books.find((b) => b.book_id === stat.bookId);
              const isFinished = stat.percentComplete >= 100;

              return (
                <div
                  key={stat.bookId}
                  className={`p-4 rounded-2xl bg-white border-l-[6px] border-y border-r border-[#2BA8A2]/15 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-3.5 ${
                    isFinished
                      ? 'border-l-[#27AE60]'
                      : stat.fileType === 'scan'
                      ? 'border-l-[#EF6C4A]'
                      : stat.percentComplete > 0
                      ? 'border-l-[#FFD23F]'
                      : 'border-l-[#2BA8A2]'
                  }`}
                >
                  {/* Top row: Format badge, Title, Author & Open Action */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-[#E8F6F5] text-[#1E8C86] border border-[#2BA8A2]/30">
                          {stat.fileType.toUpperCase()}
                        </span>
                          {isFinished && (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#27AE60] text-white flex items-center gap-1 shadow-xs">
                              <CheckCircle2 size={10} /> Completato
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate mt-1">
                          {stat.title}
                        </h3>
                        {stat.author && (
                          <p className="text-xs text-slate-500 dark:text-white font-semibold truncate">{stat.author}</p>
                        )}
                      </div>

                      {originalBook && onOpenBook && (
                      <button
                        type="button"
                        onClick={() => onOpenBook(originalBook)}
                        aria-label={`Leggi ${stat.title}`}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-[#FFD23F] to-[#FFE47A] text-[#1E8C86] hover:bg-[#FFD23F] border-2 border-[#E6B800] text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-accent-glow"
                      >
                        <span>Leggi</span>
                        <ArrowRight size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>

                  {/* Quantitative Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-[#EFF8F7] border border-[#2BA8A2]/20">
                    {/* Pagine lette */}
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <BookOpen size={11} className="text-[#1E8C86]" />
                        <span>Pagine lette</span>
                      </span>
                      <div className="text-sm font-black text-slate-900 mt-0.5">
                        <span>{stat.pagesRead}</span>
                        <span className="text-slate-400 font-bold text-xs ml-1">/ {stat.totalPages}</span>
                      </div>
                    </div>

                    {/* Tempo stimato dedicato */}
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Clock size={11} className="text-[#1E8C86]" />
                        <span>Tempo dedicato</span>
                      </span>
                      <div className="text-sm font-black text-slate-900 mt-0.5">
                        {formatMinutes(stat.estimatedSpentMinutes)}
                      </div>
                    </div>

                    {/* Tempo rimanente stimato */}
                    <div className="hidden sm:flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Hourglass size={11} className="text-[#1E8C86]" />
                        <span>Tempo rimanente</span>
                      </span>
                      <div className="text-sm font-black text-slate-900 mt-0.5">
                        {isFinished ? 'Finito' : formatMinutes(stat.estimatedRemainingMinutes)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar in Primary Teal */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                      <span>Avanzamento lettura</span>
                      <span className="font-black text-[#1E8C86]">{stat.percentComplete}%</span>
                    </div>
                    <div className="w-full bg-[#E8F6F5] h-2.5 rounded-full overflow-hidden border border-[#2BA8A2]/20">
                      <div
                        className="bg-gradient-to-r from-[#2BA8A2] to-[#3CC4BD] h-full rounded-full transition-all duration-300"
                        style={{ width: `${stat.percentComplete}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Speed & Calculation Note */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#2BA8A2]/20 text-xs text-slate-600 font-medium flex items-center gap-2 shadow-xs">
        <Sparkles size={16} className="text-[#FFD23F] shrink-0" />
        <span>
          Velocità di lettura stimata: ~180 parole al minuto con sintesi vocale naturale italiana. Il tempo viene aggiornato ad ogni pagina letta.
        </span>
      </div>
    </section>
  );
};
