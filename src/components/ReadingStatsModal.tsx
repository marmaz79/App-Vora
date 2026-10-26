import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  BookOpen,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  X,
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

interface ReadingStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onOpenBook?: (book: Book) => void;
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

export const ReadingStatsModal: React.FC<ReadingStatsModalProps> = ({
  isOpen,
  onClose,
  books,
  onOpenBook,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('progress');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Trigger smooth chart entrance animation whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setChartVisible(false);
      setAnimationKey((k) => k + 1);
      const timer = setTimeout(() => {
        setChartVisible(true);
      }, 70);
      return () => clearTimeout(timer);
    } else {
      setChartVisible(false);
    }
  }, [isOpen]);

  // Compute stats for all books
  const bookStats = useMemo<BookReadingStat[]>(() => {
    return storageService.getAllBooksStats(books);
  }, [books, isOpen]);

  // Daily Reading History for the past week
  const dailyData = useMemo(() => {
    return storageService.getDailyReadingHistory();
  }, [isOpen]);

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

  // Filtered & Sorted books
  const filteredStats = useMemo(() => {
    let result = bookStats.filter((b) => {
      const matchesSearch =
        !searchQuery.trim() ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesFilter = true;
      if (filter === 'in_progress') {
        matchesFilter = b.percentComplete > 0 && b.percentComplete < 100;
      } else if (filter === 'completed') {
        matchesFilter = b.percentComplete >= 100;
      } else if (filter === 'not_started') {
        matchesFilter = b.percentComplete === 0;
      }

      return matchesSearch && matchesFilter;
    });

    result.sort((a, b) => {
      if (sort === 'progress') return b.percentComplete - a.percentComplete;
      if (sort === 'time') return b.estimatedSpentMinutes - a.estimatedSpentMinutes;
      if (sort === 'pages') return b.pagesRead - a.pagesRead;
      if (sort === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

    return result;
  }, [bookStats, searchQuery, filter, sort]);

  if (!isOpen) return null;

  const formatMinutes = (mins: number) => {
    if (mins < 1) return '< 1 min';
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours} h ${remainingMins} m` : `${hours} h`;
  };

  const handleCopySummary = () => {
    const text = `📊 Statistiche di Lettura Vora:
- Pagine lette totali: ${summary.totalPagesRead} di ${summary.totalPagesAll} (${summary.overallProgress}%)
- Pagine lette nell'ultima settimana: ${totalWeeklyPages} (media ${dailyAverage} pag/giorno)
- Tempo totale stimato dedicato: ${formatMinutes(summary.totalMinutesSpent)}
- Libri completati: ${summary.completedBooks} / ${summary.totalBooks}
- Libri in corso: ${summary.inProgressBooks}
Generato da Vora - Lettore Digitale Accessibile`;

    try {
      navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in select-none"
    >
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center shrink-0 shadow-sm">
              <BarChart3 size={22} className="text-black" />
            </div>
            <div className="min-w-0">
              <h2 id="stats-modal-title" className="text-lg sm:text-xl font-black text-white truncate">
                Statistiche di Lettura
              </h2>
              <p className="text-xs text-zinc-400 font-medium truncate">
                Pagine lette e tempo stimato dedicato a ciascun libro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
              title="Copia riepilogo negli appunti"
            >
              {copiedSummary ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedSummary ? 'Copiato!' : 'Copia riepilogo'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi pannello statistiche"
              className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300 hover:text-white transition-colors active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-5">
          {/* Global Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Pagine lette */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pagine lette</span>
                <BookOpen size={16} className="text-white" />
              </div>
              <div className="my-1.5">
                <span className="text-2xl font-black text-white">{summary.totalPagesRead}</span>
                <span className="text-xs text-zinc-400 font-medium ml-1">/ {summary.totalPagesAll}</span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full transition-all duration-500 rounded-full"
                  style={{ width: `${summary.overallProgress}%` }}
                />
              </div>
            </div>

            {/* 2. Tempo dedicato */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tempo dedicato</span>
                <Clock size={16} className="text-white" />
              </div>
              <div className="my-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">
                  {formatMinutes(summary.totalMinutesSpent)}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium truncate">
                Stimato sui libri aperti
              </span>
            </div>

            {/* 3. Libri completati */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Completati</span>
                <CheckCircle2 size={16} className="text-white" />
              </div>
              <div className="my-1.5">
                <span className="text-2xl font-black text-white">{summary.completedBooks}</span>
                <span className="text-xs text-zinc-400 font-medium ml-1">/ {summary.totalBooks} libri</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium truncate">
                {summary.inProgressBooks} attualmente in corso
              </span>
            </div>

            {/* 4. Tempo rimanente */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tempo stimato</span>
                <Hourglass size={16} className="text-white" />
              </div>
              <div className="my-1.5">
                <span className="text-xl sm:text-2xl font-black text-white">
                  {formatMinutes(summary.totalMinutesRemaining)}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium truncate">
                Per finire i libri aperti
              </span>
            </div>
          </div>

          {/* Grafico a barre Recharts: Pagine lette giornalmente nell'ultima settimana con animazione fluida */}
          <div
            className={`bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all duration-700 ease-out transform ${
              chartVisible
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-4 scale-[0.98]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <BarChart3 size={17} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Pagine lette nell'ultima settimana
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Numero di pagine lette giorno per giorno negli ultimi 7 giorni
                  </p>
                </div>
              </div>

              {/* Badges riepilogativi settimana */}
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-zinc-950 text-zinc-300 font-bold border border-zinc-800 text-[11px]">
                  Totale: <strong className="text-white">{totalWeeklyPages} pag</strong>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-zinc-950 text-zinc-300 font-bold border border-zinc-800 text-[11px] hidden sm:inline-block">
                  Media: <strong className="text-white">~{dailyAverage} pag/giorno</strong>
                </span>
              </div>
            </div>

            {/* Container Recharts BarChart con animazione di crescita */}
            <div className="w-full h-52 sm:h-56 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  key={`barchart-anim-${animationKey}`}
                  data={dailyData}
                  margin={{ top: 12, right: 8, left: -22, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="#27272a"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#3f3f46' }}
                    dy={4}
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<CustomBarTooltip />}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 6 }}
                  />
                  <Bar
                    dataKey="pages"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                    isAnimationActive={true}
                    animationDuration={1100}
                    animationEasing="ease-out"
                    animationBegin={80}
                  >
                    {dailyData.map((entry, index) => {
                      const isToday = index === dailyData.length - 1;
                      const isMax = entry.pages === bestDay.pages && entry.pages > 0;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isToday ? '#FFFFFF' : isMax ? '#E4E4E7' : '#71717A'}
                          className="hover:opacity-85 transition-opacity cursor-pointer"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda e insight rapido sotto il grafico */}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[11px] text-zinc-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-white inline-block" />
                  <span>Oggi</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-zinc-500 inline-block" />
                  <span>Giorni scorsi</span>
                </span>
              </div>
              <span className="truncate">
                Giorno con più pagine: <strong className="text-white">{bestDay.dayLabel} ({bestDay.pages} pag)</strong>
              </span>
            </div>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtra per titolo o autore..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-white focus:ring-1 focus:ring-white rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  filter === 'all'
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Tutti ({bookStats.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('in_progress')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  filter === 'in_progress'
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                In corso ({summary.inProgressBooks})
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  filter === 'completed'
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Completati ({summary.completedBooks})
              </button>
            </div>
          </div>

          {/* Section Heading */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-white" />
              <span>Dettaglio per ciascun libro</span>
            </h3>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="hidden sm:inline">Ordina:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                aria-label="Ordina statistiche"
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-white"
              >
                <option value="progress">Avanzamento (%)</option>
                <option value="time">Tempo dedicato</option>
                <option value="pages">Pagine lette</option>
                <option value="title">Titolo (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Books List with detailed statistics */}
          {filteredStats.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center gap-2">
              <BookOpen size={32} className="text-zinc-600 mb-1" />
              <p className="text-sm font-bold text-zinc-300">Nessun libro corrispondente</p>
              <p className="text-xs text-zinc-500">Prova a modificare i termini di ricerca o i filtri.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredStats.map((stat) => {
                const bookRef = books.find((b) => b.book_id === stat.bookId);

                return (
                  <div
                    key={stat.bookId}
                    className="bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 rounded-2xl p-3.5 sm:p-4 transition-all shadow-sm flex flex-col gap-3"
                  >
                    {/* Top Row: Book Title, Format Badge, Action */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Book Spine Icon Badge */}
                        <div
                          className="w-10 h-12 rounded-lg flex items-center justify-center text-white shrink-0 font-black text-xs border border-white/20 shadow-xs"
                          style={{ backgroundColor: stat.coverColor || '#18181b' }}
                        >
                          {stat.fileType === 'pdf' ? (
                            'PDF'
                          ) : stat.fileType === 'audio' ? (
                            <Volume2 size={16} />
                          ) : (
                            <BookOpen size={16} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate leading-tight">
                            {stat.title}
                          </h4>
                          <p className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                            {stat.author || 'Autore sconosciuto'} • {stat.totalPages} pagine totali
                          </p>
                        </div>
                      </div>

                      {/* Status pill or Open action */}
                      <div className="flex items-center gap-2 shrink-0">
                        {stat.percentComplete >= 100 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[10px] font-black uppercase">
                            Completato
                          </span>
                        ) : stat.percentComplete > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-black uppercase">
                            In corso
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase">
                            Non iniziato
                          </span>
                        )}

                        {onOpenBook && bookRef && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenBook(bookRef);
                            }}
                            className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-white text-zinc-300 hover:text-black border border-zinc-700 hover:border-white flex items-center justify-center transition-colors active:scale-95"
                            title="Apri e leggi questo libro"
                            aria-label={`Apri ${stat.title}`}
                          >
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Primary Highlight Metrics (Pagine lette & Tempo stimato dedicato) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-black/60 rounded-xl p-2.5 border border-zinc-800/80">
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

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span className="truncate">
            Velocità di lettura stimata: ~180 parole/min con TTS italiano
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-black text-xs rounded-xl transition-colors active:scale-95 shrink-0"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
