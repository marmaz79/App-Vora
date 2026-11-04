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
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none font-sans"
    >
      <div className="bg-white dark:bg-black/95 border-2 border-[#2BA8A2]/30 dark:border-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-card text-slate-800 dark:text-white overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-dashed border-[#2BA8A2]/20 dark:border-white/30 flex items-center justify-between shrink-0 bg-white dark:bg-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F6F5] dark:bg-transparent border-2 border-[#2BA8A2]/30 dark:border-white flex items-center justify-center text-[#1E8C86] dark:text-white shadow-xs">
              <BookmarkCheck size={20} className="text-[#1E8C86] dark:text-white" />
            </div>
            <div>
              <h3 id="bookmarks-modal-title" className="text-base sm:text-lg font-black text-[#1E8C86] dark:text-white flex items-center gap-2">
                Segnalibri
                <span className="text-xs font-black bg-[#FFD23F] dark:bg-white text-slate-900 dark:text-black px-2 py-0.5 rounded-full shadow-xs">
                  {bookmarks.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/80 font-medium truncate max-w-[260px] sm:max-w-xs">
                {book.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#E8F6F5] dark:bg-transparent border border-[#2BA8A2]/30 dark:border-white text-[#1E8C86] dark:text-white flex items-center justify-center hover:bg-[#2BA8A2]/20 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            aria-label="Chiudi pannello segnalibri"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Add / Manage Current Page Section */}
        <div className="p-3 sm:p-4 border-b-2 border-dashed border-[#2BA8A2]/20 dark:border-white/30 bg-[#EFF8F7] dark:bg-transparent shrink-0">
          {isCurrentPageBookmarked && currentBookmark ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-transparent border-2 border-[#FFD23F] dark:border-white shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <BookmarkIcon size={18} className="fill-[#FFD23F] dark:fill-white text-[#FFD23F] dark:text-white shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    Pagina {currentPage + 1} già salvata
                    <span className="text-[10px] bg-[#FFF8E7] dark:bg-transparent border border-[#FFD23F] dark:border-white text-[#1E8C86] dark:text-white px-2 py-0.2 rounded-full font-black">
                      In lettura
                    </span>
                  </p>
                  {currentBookmark.note && (
                    <p className="text-xs text-slate-600 dark:text-white/80 italic truncate mt-0.5 font-medium">
                      Nota: "{currentBookmark.note}"
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveBookmark(currentBookmark.id)}
                className="px-3 py-1.5 rounded-full border border-[#EF6C4A]/40 dark:border-white text-[#EF6C4A] dark:text-white hover:bg-[#EF6C4A]/10 dark:hover:bg-white/10 text-xs font-black flex items-center gap-1.5 transition-colors shrink-0 active:scale-95 cursor-pointer"
                title="Rimuovi questo segnalibro"
              >
                <Trash2 size={13} className="text-current" />
                <span>Rimuovi</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddCurrent} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-black text-[#1E8C86] dark:text-white">
                <span>Salva pagina corrente (Pagina {currentPage + 1}):</span>
                <span className="text-[11px] text-slate-500 dark:text-white/80 font-bold">
                  {book.pages?.length ? `${currentPage + 1} di ${book.pages.length}` : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Nota opzionale (es. Citazione chiave, Capitolo 2)..."
                  className="flex-1 bg-white dark:bg-transparent border-2 border-[#2BA8A2]/20 dark:border-white rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/60 focus:outline-none focus:border-[#2BA8A2] dark:focus:border-white transition-all"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2BA8A2] hover:bg-[#1E8C86] dark:bg-transparent dark:hover:bg-white/10 text-white font-black text-xs rounded-full border-2 border-transparent dark:border-white flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                >
                  <Plus size={16} className="text-white" />
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
              <div className="w-14 h-14 rounded-2xl bg-[#E8F6F5] dark:bg-transparent border-2 border-[#2BA8A2]/30 dark:border-white flex items-center justify-center text-[#1E8C86] dark:text-white">
                <BookmarkIcon size={28} />
              </div>
              <div className="max-w-xs">
                <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">
                  Nessun segnalibro salvato
                </h4>
                <p className="text-xs text-slate-500 dark:text-white/80 leading-relaxed font-medium">
                  Tocca il pulsante "Salva" in alto o l'icona del segnalibro sulla pagina per conservare i tuoi passaggi preferiti.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAddBookmark(currentPage)}
                className="mt-2 px-5 py-2.5 bg-[#FFD23F] hover:bg-[#FFE47A] dark:bg-transparent dark:hover:bg-white/10 text-slate-900 dark:text-white font-black text-xs rounded-full border-2 border-transparent dark:border-white flex items-center gap-1.5 transition-all active:scale-95 shadow-accent-glow dark:shadow-none cursor-pointer"
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
                  className={`rounded-2xl border-2 dark:border-white p-3.5 sm:p-4 transition-all flex flex-col gap-2.5 bg-white dark:bg-transparent shadow-xs`}
                >
                  {/* Top line: Page badge, Status, and Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#E8F6F5] dark:bg-transparent text-[#1E8C86] dark:text-white border border-[#2BA8A2]/30 dark:border-white flex items-center gap-1">
                        <BookmarkIcon size={12} className="fill-[#1E8C86] dark:fill-white text-[#1E8C86] dark:text-white" />
                        Pagina {bm.pageIndex + 1}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase bg-[#FFD23F] dark:bg-transparent border dark:border-white text-slate-900 dark:text-white px-2 py-0.5 rounded-full shadow-xs">
                          In lettura
                        </span>
                      )}
                      {bm.createdAt && (
                        <span className="text-[11px] text-slate-400 dark:text-white/70 font-medium flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(bm.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(bm)}
                        className="w-8 h-8 rounded-full text-slate-500 dark:text-white hover:text-[#1E8C86] hover:bg-[#E8F6F5] dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                        title="Modifica nota"
                        aria-label="Modifica nota del segnalibro"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveBookmark(bm.id)}
                        className="w-8 h-8 rounded-full text-slate-400 dark:text-white hover:text-[#EF6C4A] hover:bg-[#EF6C4A]/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
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
                        className="flex-1 bg-white dark:bg-transparent border-2 border-[#2BA8A2] dark:border-white rounded-xl px-3 py-1 text-xs text-slate-900 dark:text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(bm.id)}
                        className="p-1.5 bg-[#2BA8A2] dark:bg-transparent border dark:border-white text-white rounded-lg hover:bg-[#1E8C86] dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Salva nota"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-[#E8F6F5] dark:bg-transparent border dark:border-white text-[#1E8C86] dark:text-white rounded-lg hover:bg-[#2BA8A2]/20 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Annulla"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : bm.note ? (
                    <div className="px-3 py-1.5 rounded-xl bg-[#FFF8E7] dark:bg-transparent border border-[#FFD23F] dark:border-white/60 text-xs text-slate-800 dark:text-white italic font-medium flex items-center gap-1.5">
                      <span className="text-[#1E8C86] dark:text-white font-black not-italic text-[11px]">Nota:</span>
                      <span>"{bm.note}"</span>
                    </div>
                  ) : null}

                  {/* Snippet preview */}
                  <p className="text-xs text-slate-600 dark:text-white font-normal line-clamp-2 leading-relaxed bg-[#EFF8F7]/50 dark:bg-transparent p-2.5 rounded-xl border border-[#2BA8A2]/15 dark:border-white/30">
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
                      className={`min-h-[36px] px-4 rounded-full font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#E8F6F5] dark:bg-transparent text-[#1E8C86] dark:text-white border border-[#2BA8A2]/30 dark:border-white hover:bg-[#2BA8A2]/20 dark:hover:bg-white/10'
                          : 'bg-[#FFD23F] hover:bg-[#FFE47A] dark:bg-transparent dark:hover:bg-white/10 text-slate-900 dark:text-white border-2 border-transparent dark:border-white shadow-accent-glow dark:shadow-none'
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
        <div className="p-3 sm:p-4 border-t-2 border-dashed border-[#2BA8A2]/20 dark:border-white/30 flex items-center justify-between text-xs text-slate-500 dark:text-white/80 shrink-0 bg-white dark:bg-transparent font-medium">
          <span>{bookmarks.length} {bookmarks.length === 1 ? 'segnalibro salvato' : 'segnalibri salvati'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-full border-2 border-[#2BA8A2]/30 dark:border-white bg-[#E8F6F5] dark:bg-transparent text-[#1E8C86] dark:text-white hover:bg-[#2BA8A2]/20 dark:hover:bg-white/10 font-black transition-all active:scale-95 cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
