import React, { useState } from 'react';
import {
  Bookmark as BookmarkIcon,
  BookmarkCheck,
  X,
  Trash2,
  Plus,
  ExternalLink,
  Edit3,
  Check,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Book, Bookmark } from '../types';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  currentPage: number;
  bookmarks: Bookmark[];
  onSelectPage: (pageIndex: number) => void;
  onAddBookmark: (pageIndex: number, note?: string) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onUpdateBookmarkNote: (bookmarkId: string, note: string) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  onClose,
  book,
  currentPage,
  bookmarks,
  onSelectPage,
  onAddBookmark,
  onRemoveBookmark,
  onUpdateBookmarkNote,
}) => {
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  if (!isOpen) return null;

  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageIndex === currentPage);
  const currentBookmark = bookmarks.find((b) => b.pageIndex === currentPage);

  const handleAddCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBookmark(currentPage, newNote.trim() || undefined);
    setNewNote('');
  };

  const handleStartEdit = (bm: Bookmark) => {
    setEditingId(bm.id);
    setEditNoteText(bm.note || '');
  };

  const handleSaveEdit = (bmId: string) => {
    onUpdateBookmarkNote(bmId, editNoteText.trim());
    setEditingId(null);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookmarks-modal-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-black border border-zinc-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-black">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <BookmarkCheck size={20} className="fill-white" />
            </div>
            <div>
              <h3 id="bookmarks-modal-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Segnalibri
                <span className="text-xs font-semibold bg-white text-black px-2 py-0.5 rounded-full">
                  {bookmarks.length}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 font-medium truncate max-w-[260px] sm:max-w-xs">
                {book.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors active:scale-95"
            aria-label="Chiudi pannello segnalibri"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Add / Manage Current Page Section */}
        <div className="p-3 sm:p-4 border-b border-zinc-800/80 bg-zinc-950/70 shrink-0">
          {isCurrentPageBookmarked && currentBookmark ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900 border border-white/20">
              <div className="flex items-center gap-2 min-w-0">
                <BookmarkIcon size={18} className="fill-white text-white shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Pagina {currentPage + 1} già salvata
                    <span className="text-[10px] bg-white text-black px-1.5 py-0.2 rounded font-black">
                      In lettura
                    </span>
                  </p>
                  {currentBookmark.note && (
                    <p className="text-xs text-zinc-300 italic truncate mt-0.5">
                      Nota: "{currentBookmark.note}"
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveBookmark(currentBookmark.id)}
                className="px-2.5 py-1.5 rounded-xl border border-red-500/40 text-red-400 hover:text-white hover:bg-red-600/30 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 active:scale-95"
                title="Rimuovi questo segnalibro"
              >
                <Trash2 size={14} />
                <span>Rimuovi</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddCurrent} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span>Salva pagina corrente (Pagina {currentPage + 1}):</span>
                <span className="text-[11px] text-zinc-400">
                  {book.pages?.length ? `${currentPage + 1} di ${book.pages.length}` : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Nota opzionale (es. Citazione chiave, Capitolo 2)..."
                  className="flex-1 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors active:scale-95 shrink-0"
                >
                  <Plus size={16} />
                  <span>Salva</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bookmarks List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col gap-2.5">
          {bookmarks.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <BookmarkIcon size={28} />
              </div>
              <div className="max-w-xs">
                <h4 className="text-sm font-bold text-white mb-1">
                  Nessun segnalibro salvato
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tocca il pulsante "Salva" in alto o l'icona del segnalibro sulla pagina per conservare i tuoi passaggi preferiti.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAddBookmark(currentPage)}
                className="mt-2 px-4 py-2 bg-white text-black font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-zinc-200 transition-transform active:scale-95 shadow-sm"
              >
                <BookmarkIcon size={14} className="fill-current" />
                Salva Pagina {currentPage + 1} ora
              </button>
            </div>
          ) : (
            bookmarks.map((bm) => {
              const isCurrent = bm.pageIndex === currentPage;
              const isEditing = editingId === bm.id;

              return (
                <div
                  key={bm.id}
                  className={`rounded-2xl border p-3.5 sm:p-4 transition-all flex flex-col gap-2.5 ${
                    isCurrent
                      ? 'border-white bg-zinc-900/90 shadow-sm'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  {/* Top line: Page badge, Status, and Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center gap-1">
                        <BookmarkIcon size={12} className="fill-white" />
                        Pagina {bm.pageIndex + 1}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase bg-white text-black px-2 py-0.5 rounded-md">
                          In lettura
                        </span>
                      )}
                      {bm.createdAt && (
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(bm.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(bm)}
                        className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
                        title="Modifica nota"
                        aria-label="Modifica nota del segnalibro"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveBookmark(bm.id)}
                        className="w-8 h-8 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 flex items-center justify-center transition-colors"
                        title="Elimina segnalibro"
                        aria-label="Elimina questo segnalibro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Note edit mode or display */}
                  {isEditing ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                        placeholder="Inserisci o modifica la nota..."
                        className="flex-1 bg-black border border-white rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(bm.id)}
                        className="p-1.5 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors"
                        title="Salva nota"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                        title="Annulla"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : bm.note ? (
                    <div className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 italic font-medium flex items-center gap-1.5">
                      <span className="text-zinc-400 font-bold not-italic text-[11px]">Nota:</span>
                      <span>"{bm.note}"</span>
                    </div>
                  ) : null}

                  {/* Snippet preview */}
                  <p className="text-xs text-zinc-400 font-normal line-clamp-2 leading-relaxed bg-black/40 p-2 rounded-lg border border-zinc-900">
                    {bm.snippet || '(Nessun testo estratto)'}
                  </p>

                  {/* Jump button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPage(bm.pageIndex);
                        onClose();
                      }}
                      className={`min-h-[38px] px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
                        isCurrent
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700'
                          : 'bg-white text-black hover:bg-zinc-200 shadow-xs'
                      }`}
                    >
                      <BookOpen size={14} />
                      <span>{isCurrent ? 'Sei già qui' : 'Vai alla pagina'}</span>
                      {!isCurrent && <ExternalLink size={12} className="opacity-70" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0 bg-black">
          <span>{bookmarks.length} {bookmarks.length === 1 ? 'segnalibro salvato' : 'segnalibri salvati'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-zinc-700 text-white hover:bg-zinc-800 font-bold transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
