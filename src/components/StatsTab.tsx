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

const CustomBarTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-black/95 border border-zinc-700/80 rounded-xl px-3 py-2 shadow-2xl text-xs backdrop-blur-md">
        <div className="font-bold text-white flex items-center justify-between gap-3 mb-1">
          <span>{data.dayLabel} ({data.fullDate})</span>
        </div>
        <div className="flex items-center gap-1.5 text-white font-extrabold text-sm">
          <span>{data.pages} pagine lette</span>
        </div>
        <div className="text-[11px] text-zinc-400 mt-0.5">
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
        // Filter by state
        if (filter === 'in_progress' && (stat.percentComplete === 0 || stat.percentComplete >= 100)) {
          return false;
        }
        if (filter === 'completed' && stat.percentComplete < 100) {
          return false;
        }
        if (filter === 'not_started' && stat.percentComplete > 0) {
          return false;
        }
        // Filter by search query
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
    <section className="flex flex-col gap-5 animate-fade-in select-none pb-28" aria-label="Statistiche di lettura">
      {/* Header */}
      <div className="pt-2 px-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Torna indietro"
              className="p-1.5 -ml-1 rounded-xl text-zinc-400 hover:text-white transition-colors active:scale-95"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Statistiche
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pagine lette e tempo stimato dedicato a ciascun libro
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopySummary}
          aria-label="Copia riepilogo statistiche"
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-bold text-white flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs"
        >
          {copiedSummary ? (
            <>
              <Check size={14} className="text-white" />
              <span>Copiato</span>
            </>
          ) : (
            <>
              <Copy size={14} className="text-zinc-400" />
              <span className="hidden sm:inline">Copia riepilogo</span>
              <span className="sm:hidden">Copia</span>
            </>
          )}
        </button>
      </div>

      {/* 1. Global KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Pagine Lette */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pagine lette</span>
            <BookOpen size={17} className="text-white" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {summary.totalPagesRead}
              <span className="text-xs font-normal text-zinc-400 ml-1">/ {summary.totalPagesAll}</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <span className="font-bold text-white">{summary.overallProgress}%</span> del totale
            </div>
          </div>
        </div>

        {/* Tempo Dedicato */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tempo dedicato</span>
            <Clock size={17} className="text-white" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatMinutes(summary.totalMinutesSpent)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              stimato sui testi letti
            </div>
          </div>
        </div>

        {/* Tempo Rimanente */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Tempo rimanente</span>
            <Hourglass size={17} className="text-white" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatMinutes(summary.totalMinutesRemaining)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              per completare i libri
            </div>
          </div>
        </div>

        {/* Libri Completati / In corso */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Stato libri</span>
            <CheckCircle2 size={17} className="text-white" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {summary.completedBooks}
              <span className="text-xs font-normal text-zinc-400 ml-1">/ {summary.totalBooks}</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {summary.inProgressBooks} libri in corso
            </div>
          </div>
        </div>
      </div>

      {/* 2. RECHARTS BAR CHART: Pagine lette nell'ultima settimana */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-white" />
              <h2 className="text-base font-extrabold text-white">
                Pagine lette giornalmente (ultima settimana)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Andamento costante giorno per giorno basato sulle sessioni di lettura
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <div className="px-2.5 py-1 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-semibold flex items-center gap-1.5">
              <TrendingUp size={13} className="text-white" />
              <span>Totale settimana: <strong className="text-white">{totalWeeklyPages} pag</strong></span>
            </div>
            <div className="hidden sm:flex px-2.5 py-1 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-semibold items-center gap-1.5">
              <Flame size={13} className="text-white" />
              <span>Miglior giorno: <strong className="text-white">{bestDay.dayLabel} ({bestDay.pages} pag)</strong></span>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="dayLabel"
                stroke="#a1a1aa"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#3f3f46' }}
              />
              <YAxis
                stroke="#a1a1aa"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#3f3f46' }}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomBarTooltip />}
                cursor={{ fill: 'rgba(255, 255, 255, 0.06)', radius: 8 }}
              />
              <Bar
                dataKey="pages"
                name="Pagine lette"
                radius={[6, 6, 0, 0]}
                isAnimationActive={true}
                animationDuration={900}
                animationEasing="ease-out"
              >
                {dailyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pages === bestDay.pages && entry.pages > 0 ? '#ffffff' : '#e4e4e7'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Chart Footnote */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
          <span>Media giornaliera: <strong className="text-white">{dailyAverage} pagine/giorno</strong></span>
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-xs bg-white inline-block" />
            <span>Pagine registrate</span>
          </span>
        </div>
      </div>

      {/* 3. Book-by-Book Breakdown Section */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <BookMarked size={20} className="text-white" />
              <span>Dettaglio per ciascun libro</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Pagine lette, percentuale di completamento e tempo stimato dedicato
            </p>
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-zinc-400 font-medium">Ordina per:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                aria-label="Ordina statistiche libri"
                className="bg-zinc-900 border border-zinc-700 text-xs font-bold text-white rounded-xl py-1.5 pl-3 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
              >
                <option value="progress">Avanzamento %</option>
                <option value="time">Tempo dedicato</option>
                <option value="pages">Pagine lette</option>
                <option value="title">Titolo</option>
              </select>
              <ChevronDown size={14} className="text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Filter Pills + Search */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cerca libro o autore..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                filter === 'all'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              Tutti ({bookStats.length})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                filter === 'in_progress'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              In lettura ({summary.inProgressBooks})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                filter === 'completed'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              Completati ({summary.completedBooks})
            </button>
            <button
              onClick={() => setFilter('not_started')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                filter === 'not_started'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              Da iniziare ({summary.notStartedBooks})
            </button>
          </div>
        </div>

        {/* Book Stats List */}
        {filteredBookStats.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
            <BookOpen size={36} className="mx-auto text-zinc-500 mb-2 opacity-50" />
            <p className="text-sm font-bold text-white">Nessun libro trovato</p>
            <p className="text-xs text-zinc-400 mt-1">
              Prova a cambiare il filtro o la ricerca per visualizzare le statistiche
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredBookStats.map((stat) => {
              const originalBook = books.find((b) => b.book_id === stat.bookId);
              return (
                <div
                  key={stat.bookId}
                  className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-3.5 shadow-sm"
                >
                  {/* Top row: Format badge, Title, Author & Open Action */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        {stat.fileType === 'scan' ? (
                          <Sparkles size={18} className="text-white" />
                        ) : stat.fileType === 'pdf' ? (
                          <FileText size={18} className="text-white" />
                        ) : (
                          <Volume2 size={18} className="text-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {stat.fileType.toUpperCase()}
                          </span>
                          {stat.percentComplete >= 100 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-black flex items-center gap-1">
                              <CheckCircle2 size={10} /> Completato
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white truncate mt-1">
                          {stat.title}
                        </h3>
                        {stat.author && (
                          <p className="text-xs text-zinc-400 truncate">{stat.author}</p>
                        )}
                      </div>
                    </div>

                    {originalBook && onOpenBook && (
                      <button
                        type="button"
                        onClick={() => onOpenBook(originalBook)}
                        aria-label={`Leggi ${stat.title}`}
                        className="px-3 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                      >
                        <span>Leggi</span>
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>

                  {/* Quantitative Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-black/60 border border-zinc-800/80">
                    {/* Pagine lette */}
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                        <BookOpen size={11} className="text-white" />
                        <span>Pagine lette</span>
                      </span>
                      <div className="text-sm font-black text-white mt-0.5">
                        <span>{stat.pagesRead}</span>
                        <span className="text-zinc-500 font-normal text-xs ml-1">/ {stat.totalPages}</span>
                      </div>
                    </div>

                    {/* Tempo stimato dedicato */}
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                        <Clock size={11} className="text-white" />
                        <span>Tempo dedicato</span>
                      </span>
                      <div className="text-sm font-black text-white mt-0.5">
                        {formatMinutes(stat.estimatedSpentMinutes)}
                      </div>
                    </div>

                    {/* Tempo rimanente stimato */}
                    <div className="hidden sm:flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                        <Hourglass size={11} className="text-white" />
                        <span>Tempo rimanente</span>
                      </span>
                      <div className="text-sm font-black text-white mt-0.5">
                        {stat.percentComplete >= 100
                          ? 'Finito'
                          : formatMinutes(stat.estimatedRemainingMinutes)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                      <span>Avanzamento libro</span>
                      <span className="font-bold text-white">{stat.percentComplete}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-white h-full rounded-full transition-all duration-300"
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
      <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-400 flex items-center gap-2">
        <Sparkles size={16} className="text-zinc-400 shrink-0" />
        <span>
          Velocità di lettura stimata: ~180 parole al minuto con sintesi vocale naturale italiana. Il tempo viene aggiornato ad ogni pagina letta.
        </span>
      </div>
    </section>
  );
};
