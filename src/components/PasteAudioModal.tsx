import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  ClipboardPaste,
  Play,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Book } from '../types';
import { fileParser } from '../services/fileParser';

interface PasteAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReader: (book: Book) => void;
  onAddBook: (book: Book) => void;
  existingBooks?: Book[];
}

export const PasteAudioModal: React.FC<PasteAudioModalProps> = ({
  isOpen,
  onClose,
  onOpenReader,
  onAddBook,
}) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [pastedNotice, setPastedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Automatically focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPastedNotice(null);
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle direct paste from clipboard API or cache
  const handlePasteFromClipboard = async () => {
    setError(null);
    setPastedNotice(null);

    // 1. Direct call to navigator.clipboard.readText()
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          const clean = clipText.trim();
          setText(clean);
          setPastedNotice('Testo copiato incollato con successo!');
          if (!title) {
            const firstLine = clean.split('\n')[0].slice(0, 40);
            setTitle(firstLine || `Testo audio ${new Date().toLocaleDateString()}`);
          }
          setTimeout(() => setPastedNotice(null), 3000);
          return;
        }
      } catch (err) {
        console.warn('Direct clipboard.readText failed or was blocked by browser:', err);
      }
    }

    // 2. Check internal cache (saved whenever user copied inside the application)
    const cachedCopy =
      sessionStorage.getItem('vora_last_copied_text') ||
      localStorage.getItem('vora_last_copied_text');
    if (cachedCopy && cachedCopy.trim()) {
      const clean = cachedCopy.trim();
      setText(clean);
      setPastedNotice('Testo incollato con successo!');
      if (!title) {
        const firstLine = clean.split('\n')[0].slice(0, 40);
        setTitle(firstLine || `Testo audio ${new Date().toLocaleDateString()}`);
      }
      setTimeout(() => setPastedNotice(null), 3000);
      return;
    }

    // 3. Fallback: focus textarea and attempt execCommand paste
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      try {
        const ok = document.execCommand('paste');
        if (ok && textarea.value && textarea.value.trim()) {
          setText(textarea.value.trim());
          setPastedNotice('Testo incollato con successo!');
          setTimeout(() => setPastedNotice(null), 3000);
          return;
        }
      } catch {}

      // 4. If programmatic read is restricted by mobile browser security policy:
      // Focus and select so Samsung Keyboard shows the "Incolla" chip right above the keys
      textarea.focus();
      textarea.select();
      setPastedNotice('Tocca "Incolla" sopra la tastiera del telefono o tieni premuto');
      setTimeout(() => setPastedNotice(null), 5000);
    }
  };

  const handleInsertSample = () => {
    const sample =
      'Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura, ché la diritta via era smarrita. Ahi quanto a dir qual era è cosa dura esta selva selvaggia e aspra e forte che nel pensier rinova la paura!';
    setText(sample);
    setTitle('Dante - Divina Commedia');
    setPastedNotice('Testo di esempio inserito!');
    setTimeout(() => setPastedNotice(null), 3000);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const estimatedMinutes = Math.max(1, Math.round(wordCount / 150));

  const handleStartListening = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Incolla o inserisci del testo prima di avviare il lettore.');
      textareaRef.current?.focus();
      return;
    }

    // Determine book title
    let finalTitle = title.trim();
    if (!finalTitle) {
      const firstWords = trimmed.split(/\s+/).slice(0, 6).join(' ');
      finalTitle =
        firstWords.length > 3
          ? `${firstWords}...`
          : `Testo per ascolto (${new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })})`;
    }

    const pages = fileParser.splitIntoPages(trimmed, 260);

    const newBook: Book = {
      book_id: `audio-text-${Date.now()}`,
      owner_id: 'user-default-1',
      title: finalTitle,
      file_type: 'txt',
      size: trimmed.length,
      pages: pages.length > 0 ? pages : [trimmed],
      currentPage: 0,
      created_at: new Date().toISOString(),
      coverColor: '#FFFFFF',
      source: 'upload',
    };

    onAddBook(newBook);
    onOpenReader(newBook);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paste-audio-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none animate-fade-in font-sans"
    >
      <div className="bg-white border-2 border-[#2BA8A2]/30 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-card flex flex-col gap-4 text-slate-800 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#2BA8A2]/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 text-[#1E8C86] flex items-center justify-center shrink-0 shadow-xs">
              <Volume2 size={22} className="text-[#1E8C86]" />
            </div>
            <div className="min-w-0">
              <h2 id="paste-audio-title" className="text-base sm:text-lg font-black text-[#1E8C86] truncate">
                Ascolta Testo Copiato
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate">
                Incolla qualsiasi testo per aprirlo nel lettore vocale
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra"
            title="Chiudi"
            className="w-9 h-9 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#1E8C86] flex items-center justify-center hover:bg-[#2BA8A2]/20 transition-all shrink-0 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback / Error notices */}
        {error && (
          <div className="bg-[#EF6C4A]/10 border-2 border-[#EF6C4A]/30 p-3 rounded-2xl flex items-center gap-2.5 text-xs text-[#D45233] font-bold shrink-0">
            <AlertCircle size={17} className="text-[#EF6C4A] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {pastedNotice && (
          <div className="bg-[#E8F6F5] border-2 border-[#2BA8A2]/40 p-3 rounded-2xl flex items-center gap-2.5 text-xs text-[#1E8C86] font-black shrink-0 animate-fade-in shadow-xs">
            <Check size={17} className="text-[#2BA8A2] shrink-0" />
            <span>{pastedNotice}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3.5 pr-1">
          {/* Quick Action buttons */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            {/* Pulsante Incolla */}
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="h-10 px-4 rounded-full bg-[#E8F6F5] hover:bg-[#2BA8A2]/20 border-2 border-[#2BA8A2]/40 text-[#1E8C86] font-black text-xs active:scale-95 transition-all shadow-xs flex items-center gap-2"
              title="Tocca per incollare il testo copiato"
            >
              <ClipboardPaste size={16} />
              <span>Incolla</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Pulsante Testo di Prova */}
              {!text && (
                <button
                  type="button"
                  onClick={handleInsertSample}
                  className="h-10 px-4 rounded-full bg-[#FFF8E7] hover:bg-[#FFE47A]/30 border-2 border-[#FFD23F] text-[#E6B800] font-black text-xs transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
                  title="Inserisci testo di esempio"
                >
                  <Sparkles size={15} />
                  <span>Esempio</span>
                </button>
              )}

              {/* Pulsante Cancella */}
              {text && (
                <button
                  type="button"
                  onClick={() => {
                    setText('');
                    setTitle('');
                  }}
                  className="h-10 px-3.5 rounded-full bg-white hover:bg-[#EF6C4A]/10 border-2 border-[#EF6C4A]/30 text-[#EF6C4A] font-black text-xs transition-all flex items-center gap-1.5 active:scale-95"
                  title="Cancella tutto il testo"
                >
                  <Trash2 size={15} />
                  <span>Cancella</span>
                </button>
              )}
            </div>
          </div>

          {/* Text Area for Pasted Content (Cream background) */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-[190px]">
            <label htmlFor="pasted-content" className="text-xs font-black text-[#1E8C86]">
              Contenuto del testo
            </label>
            <textarea
              id="pasted-content"
              ref={textareaRef}
              value={text}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted && pasted.trim()) {
                  setText(pasted.trim());
                  if (!title) {
                    const firstLine = pasted.trim().split('\n')[0].slice(0, 40);
                    setTitle(firstLine || `Testo audio ${new Date().toLocaleDateString()}`);
                  }
                  setPastedNotice('Testo incollato con successo!');
                  setTimeout(() => setPastedNotice(null), 3000);
                }
              }}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Incolla qui il testo copiato da una pagina web, articolo, messaggio, email o documento..."
              className="w-full flex-1 min-h-[190px] sm:min-h-[220px] bg-[#FFF8E7]/50 border-2 border-[#2BA8A2]/20 focus:border-[#2BA8A2] rounded-2xl p-4 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none resize-none leading-relaxed transition-all"
            />
          </div>

          {/* Word count and duration stats */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 shrink-0 font-medium">
            <div className="flex items-center gap-3">
              <span>{wordCount} parole</span>
              <span>·</span>
              <span>{text.length} caratteri</span>
            </div>
            {wordCount > 0 && (
              <div className="flex items-center gap-1.5 text-[#1E8C86] font-black">
                <Clock size={14} />
                <span>~{estimatedMinutes} min di ascolto</span>
              </div>
            )}
          </div>

          {/* Title input (optional) */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <label htmlFor="pasted-title" className="text-xs font-black text-[#1E8C86]">
              Titolo documento (opzionale)
            </label>
            <input
              id="pasted-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Articolo, Appunti, Capitolo..."
              className="w-full bg-[#FFF8E7]/50 border-2 border-[#2BA8A2]/20 focus:border-[#2BA8A2] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t-2 border-dashed border-[#2BA8A2]/20 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#1E8C86] hover:bg-[#2BA8A2]/20 font-black text-xs transition-all flex items-center gap-2 active:scale-95"
            title="Annulla"
          >
            <X size={16} />
            <span>Annulla</span>
          </button>

          <button
            type="button"
            onClick={handleStartListening}
            className="flex-1 h-11 px-6 rounded-full bg-[#FFD23F] hover:bg-[#FFE47A] text-slate-900 font-black text-xs sm:text-sm active:scale-95 transition-all shadow-accent-glow flex items-center justify-center gap-2"
            title="Avvia lettura vocale nel lettore"
          >
            <Play size={18} className="fill-slate-900 text-slate-900" />
            <span>Ascolta Subito</span>
          </button>
        </div>
      </div>
    </div>
  );
};
