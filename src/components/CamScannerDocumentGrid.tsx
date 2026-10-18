import React, { useState } from 'react';
import {
  ArrowLeft,
  Pencil,
  Tag as TagIcon,
  MoreVertical,
  Camera,
  Edit3,
  Share2,
  FileText,
  Check,
  Plus,
  Trash2,
  RotateCw,
  X,
  FileDown,
  ArrowUpDown,
  MoveLeft,
  MoveRight,
  Eye,
  CheckCircle,
} from 'lucide-react';

export interface ScannedPageItem {
  file: File;
  url: string;
  pageNumber: number;
}

interface CamScannerDocumentGridProps {
  pages: ScannedPageItem[];
  documentTitle: string;
  onUpdateTitle: (newTitle: string) => void;
  onAddMorePages: () => void;
  onEditPage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  onSavePdfBook: () => void;
  onOpenOcrWord: () => void;
  onBack: () => void;
  isSaving?: boolean;
}

export const CamScannerDocumentGrid: React.FC<CamScannerDocumentGridProps> = ({
  pages,
  documentTitle,
  onUpdateTitle,
  onAddMorePages,
  onEditPage,
  onDeletePage,
  onReorderPages,
  onSavePdfBook,
  onOpenOcrWord,
  onBack,
  isSaving = false,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(documentTitle);
  const [selectedTag, setSelectedTag] = useState<string>('Tag +');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const tagsList = ['Lavoro', 'Personale', 'Fattura', 'Note', 'Ricevuta', 'Studio', 'Certificato'];

  const handleTitleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleShare = async () => {
    if (navigator.share && pages.length > 0) {
      try {
        const filesToShare = pages.map((p) => p.file);
        if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
          await navigator.share({
            title: documentTitle,
            text: `Documento scansionato CamScanner (${pages.length} pagine)`,
            files: filesToShare,
          });
          return;
        }
      } catch (e) {
        console.warn('Errore condivisione nativa:', e);
      }
    }

    // Fallback: scarica la prima immagine o notifica
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Modalità Griglia Documento CamScanner"
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* 1. TOP BAR (Stile Esatto CamScanner) */}
      <header className="bg-black border-b border-zinc-800 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0 z-20 shadow-md">
        {/* Sinistra: Freccia Indietro + Titolo modificabile */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-300 hover:text-white transition-colors shrink-0"
            title="Torna alla fotocamera"
            aria-label="Indietro"
          >
            <ArrowLeft size={20} />
          </button>

          {isEditingTitle ? (
            <form onSubmit={handleTitleSubmit} className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                autoFocus
                onBlur={() => handleTitleSubmit()}
                className="bg-black text-white text-xs sm:text-sm font-bold px-2 py-1 rounded-lg border border-white/60 focus:outline-none w-full max-w-xs"
              />
              <button
                type="submit"
                className="px-2 py-1 bg-white text-black text-xs font-bold rounded-lg shrink-0"
              >
                OK
              </button>
            </form>
          ) : (
            <div
              onClick={() => {
                setTitleInput(documentTitle);
                setIsEditingTitle(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer group min-w-0 flex-1"
              title="Tocca per rinominare il documento"
            >
              <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-xs tracking-tight group-hover:text-zinc-300 transition-colors">
                {documentTitle}
              </h2>
              <Pencil size={14} className="text-zinc-400 group-hover:text-white shrink-0 transition-colors" />
            </div>
          )}
        </div>

        {/* Destra: Tag + Riordina + Menu + Salva PDF rapido */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Pill Tag + */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagMenu((prev) => !prev)}
              className="px-2 sm:px-2.5 py-1 rounded-full bg-black hover:bg-zinc-900 border border-white/20 text-[11px] font-bold text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <TagIcon size={11} className="text-zinc-400" />
              <span>{selectedTag}</span>
            </button>

            {showTagMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-black border border-white/20 rounded-xl shadow-2xl py-1 z-30 animate-fade-in">
                {tagsList.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSelectedTag(tag);
                      setShowTagMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Reorder Mode */}
          <button
            type="button"
            onClick={() => setReorderMode((prev) => !prev)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              reorderMode ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white'
            }`}
            title="Riordina pagine"
            aria-label="Riordina pagine"
          >
            <ArrowUpDown size={16} />
          </button>

          {/* Pulsante PDF rapido in alto - sfondo trasparente con bordo bianco */}
          <button
            type="button"
            onClick={onSavePdfBook}
            disabled={isSaving || pages.length === 0}
            className="px-2.5 py-1 bg-transparent hover:bg-white/10 active:scale-95 text-white font-black text-xs rounded-full flex items-center gap-1.5 border border-white shadow-sm transition-all disabled:opacity-50"
            title="Salva subito come PDF nella libreria"
          >
            <span className="text-[10px] bg-white text-black px-1 py-0.2 rounded font-black tracking-tight">PDF</span>
            <span className="hidden sm:inline">Salva</span>
          </button>

          {/* Tre puntini ⋮ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
              title="Altre opzioni"
              aria-label="Menu opzioni"
            >
              <MoreVertical size={17} />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-black border border-white/20 rounded-xl shadow-2xl py-1.5 z-30 animate-fade-in divide-y divide-white/10">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReorderMode((prev) => !prev);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 flex items-center gap-2"
                  >
                    <ArrowUpDown size={14} />
                    <span>{reorderMode ? 'Esci da riordina' : 'Riordina pagine'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenOcrWord();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 flex items-center gap-2"
                  >
                    <FileText size={14} />
                    <span>Riconoscimento OCR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleShare();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 flex items-center gap-2"
                  >
                    <Share2 size={14} />
                    <span>Condividi documento</span>
                  </button>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Vuoi eliminare tutte le pagine scansionate?')) {
                        for (let i = pages.length - 1; i >= 0; i--) {
                          onDeletePage(i);
                        }
                      }
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    <span>Elimina tutte le pagine</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Share Toast Banner */}
      {shareSuccess && (
        <div className="bg-black text-white border-b border-white text-xs font-bold px-4 py-2 text-center shadow-lg animate-fade-in z-30">
          Documento pronto per la condivisione / esportazione!
        </div>
      )}

      {/* 2. BODY: GRIGLIA A 2 COLONNE (Stile Esatto Screenshot 01, 02, 03, 04) */}
      <main className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-4 bg-black">
        <div className="max-w-2xl mx-auto w-full">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[350px] text-center gap-4 text-zinc-400 p-6 border-2 border-dashed border-zinc-800 rounded-3xl">
              <Camera size={48} className="text-gray-500 stroke-[1.5]" />
              <div>
                <p className="text-base font-bold text-white">Nessuna pagina scansionata</p>
                <p className="text-xs text-gray-400 mt-1">
                  Scatta la prima foto per visualizzarla nella griglia CamScanner.
                </p>
              </div>
              <button
                type="button"
                onClick={onAddMorePages}
                className="mt-2 px-5 py-2.5 rounded-full bg-white text-black font-extrabold text-xs shadow-lg hover:bg-gray-100 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={16} className="text-black stroke-[3]" />
                <span>Scatta Prima Pagina</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
              {pages.map((page, idx) => {
                const pageNumberStr = String(idx + 1).padStart(2, '0');

                return (
                  <div key={idx} className="flex flex-col items-center group">
                    {/* Scheda Pagina Documento (Foglio Bianco / Bordo Netto CamScanner) */}
                    <div
                      onClick={() => onEditPage(idx)}
                      className="relative w-full aspect-[3/4] bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md shadow-black/80 border-2 border-white/20 hover:border-white transition-all cursor-pointer group-hover:shadow-2xl group-hover:scale-[1.01]"
                    >
                      <img
                        src={page.url}
                        alt={`Pagina ${idx + 1}`}
                        className="w-full h-full object-cover object-top pointer-events-none select-none bg-white"
                        loading="lazy"
                      />

                      {/* Overlay con azioni rapide al tocco/hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPage(idx);
                          }}
                          className="w-9 h-9 rounded-full bg-black/70 text-white hover:bg-black flex items-center justify-center border border-white/30 shadow-md active:scale-90 transition-transform"
                          title="Modifica e ritaglia questa pagina"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPageIndex(idx);
                          }}
                          className="w-9 h-9 rounded-full bg-black/70 text-white hover:bg-black flex items-center justify-center border border-white/30 shadow-md active:scale-90 transition-transform"
                          title="Ingrandisci a schermo intero"
                        >
                          <Eye size={15} />
                        </button>
                      </div>

                      {/* Pulsante Elimina Pagina */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(idx);
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/85 hover:bg-zinc-800 text-white flex items-center justify-center border border-white/40 shadow-md transition-colors"
                        title="Elimina questa pagina"
                        aria-label="Elimina pagina"
                      >
                        <X size={12} className="stroke-[2.5]" />
                      </button>

                      {/* Controlli di riordino se reorderMode attivo */}
                      {reorderMode && (
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/85 backdrop-blur-md rounded-lg p-1 border border-white/30">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderPages(idx, idx - 1);
                            }}
                            className="p-1 rounded text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none"
                            title="Sposta prima"
                          >
                            <MoveLeft size={14} />
                          </button>
                          <span className="text-[10px] font-bold text-gray-300">Sposta</span>
                          <button
                            type="button"
                            disabled={idx === pages.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderPages(idx, idx + 1);
                            }}
                            className="p-1 rounded text-white hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none"
                            title="Sposta dopo"
                          >
                            <MoveRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Numero Pagina Sotto centrato: 01, 02, 03, 04... Identico allo screenshot */}
                    <span className="mt-2 text-sm sm:text-base font-bold text-white tracking-wider text-center">
                      {pageNumberStr}
                    </span>
                  </div>
                );
              })}

              {/* Scheda aggiuntiva (+ Aggiungi Pagina) nella griglia */}
              <button
                type="button"
                onClick={onAddMorePages}
                className="w-full aspect-[3/4] rounded-lg sm:rounded-xl border-2 border-dashed border-white/20 hover:border-white bg-black hover:bg-zinc-950 flex flex-col items-center justify-center gap-2.5 text-white active:scale-95 transition-all group shadow-sm"
                title="Scatta o aggiungi un'altra pagina"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center text-white border border-white/20 transition-all">
                  <Plus size={24} className="stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">
                  + Aggiungi
                </span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 3. MODALE ANTEPRIMA SCHERMO INTERO SE CLICCA SU OCCHIO */}
      {previewPageIndex !== null && pages[previewPageIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-fade-in"
          onClick={() => setPreviewPageIndex(null)}
        >
          <div className="flex items-center justify-between text-white z-10">
            <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
              Pagina {String(previewPageIndex + 1).padStart(2, '0')} di {String(pages.length).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const target = previewPageIndex;
                  setPreviewPageIndex(null);
                  onEditPage(target);
                }}
                className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Edit3 size={13} />
                <span>Modifica</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewPageIndex(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
            <img
              src={pages[previewPageIndex].url}
              alt={`Anteprima pagina ${previewPageIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="flex items-center justify-center gap-4 text-white text-xs font-semibold py-2">
            <button
              type="button"
              disabled={previewPageIndex === 0}
              onClick={(e) => {
                e.stopPropagation();
                setPreviewPageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
              }}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
            >
              Precedente
            </button>
            <button
              type="button"
              disabled={previewPageIndex === pages.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setPreviewPageIndex((prev) => (prev !== null && prev < pages.length - 1 ? prev + 1 : prev));
              }}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30"
            >
              Successiva
            </button>
          </div>
        </div>
      )}

      {/* 4. BOTTOM BAR CON LE 5 ICONE E NOME SOTTO (Stile Esatto Screenshot) */}
      <footer className="bg-black border-t border-zinc-800 px-2 sm:px-4 py-2 shrink-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto w-full gap-1">
          {/* 1. AGGIUNGI (Fotocamera con +) */}
          <button
            type="button"
            onClick={onAddMorePages}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0"
            title="Scatta o aggiungi un'altra foto a questo documento"
            aria-label="Aggiungi"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white">
              <Camera size={19} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Aggiungi</span>
          </button>

          {/* 2. MODIFICA (Matita / Ritaglia) */}
          <button
            type="button"
            onClick={() => {
              if (pages.length > 0) {
                onEditPage(0);
              }
            }}
            disabled={pages.length === 0}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-40"
            title="Modifica, ritaglia e applica filtri alle pagine"
            aria-label="Modifica"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white">
              <Edit3 size={19} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Modifica</span>
          </button>

          {/* 3. CONDIVIDI */}
          <button
            type="button"
            onClick={handleShare}
            disabled={pages.length === 0}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-40"
            title="Condividi documento scansionato"
            aria-label="Condividi"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white">
              <Share2 size={19} className="text-white" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">Condividi</span>
          </button>

          {/* 4. IN WORD (Estrai Testo OCR) */}
          <button
            type="button"
            onClick={onOpenOcrWord}
            disabled={pages.length === 0}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-40"
            title="Riconoscimento testo OCR (In Word)"
            aria-label="In Word"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent border border-white flex items-center justify-center text-white relative">
              <FileText size={19} className="text-white" />
              <span className="absolute -top-1 -right-1 bg-white text-[8px] font-black px-1 rounded text-black">W</span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-tight truncate">In Word</span>
          </button>

          {/* 5. SALVA PDF - Sfondo trasparente con bordi bianchi */}
          <button
            type="button"
            onClick={onSavePdfBook}
            disabled={isSaving || pages.length === 0}
            className="flex flex-col items-center justify-center gap-1 p-1 rounded-2xl text-white hover:bg-white/10 active:scale-95 transition-all flex-1 min-w-0 disabled:opacity-50"
            title="Salva il libro nella libreria in PDF"
            aria-label="Salva PDF"
          >
            <div className="w-10 h-10 rounded-2xl bg-transparent text-white border-2 border-white flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.3)] hover:bg-white/15 transition-colors">
              <Check size={22} className="text-white stroke-[3]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-black text-white tracking-tight truncate">Salva PDF</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
