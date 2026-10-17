import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  ClipboardPaste,
  Play,
  FileText,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  BookOpen,
  Trash2,
  Mic,
  Smartphone,
  BookMarked,
} from 'lucide-react';
import { Book } from '../types';
import { fileParser } from '../services/fileParser';
import { storageService } from '../services/storageService';

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
  existingBooks = [],
}) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [pastedNotice, setPastedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>(() => {
    return storageService.getSettings()?.voiceUri || 'gemini:Kore';
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const VOICE_OPTIONS = [
    { uri: 'gemini:Kore', name: 'Kore', label: 'Donna AI', icon: Mic },
    { uri: 'gemini:Puck', name: 'Puck', label: 'Uomo AI', icon: Sparkles },
    { uri: 'gemini:Charon', name: 'Charon', label: 'Narratore', icon: Volume2 },
    { uri: '', name: 'Sistema', label: 'Dispositivo', icon: Smartphone },
  ];

  const handleSelectVoice = (uri: string, name: string) => {
    setSelectedVoiceUri(uri);
    try {
      const current = storageService.getSettings();
      storageService.saveSettings({
        ...current,
        voiceUri: uri,
        voiceName: name,
      });
    } catch {}
  };

  // Automatically focus textarea when modal opens, and check cached clipboard text
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

    // Save voice preference
    const matchedVoice = VOICE_OPTIONS.find((v) => v.uri === selectedVoiceUri);
    try {
      const currentSettings = storageService.getSettings();
      storageService.saveSettings({
        ...currentSettings,
        voiceUri: selectedVoiceUri,
        voiceName: matchedVoice?.name || 'Kore',
      });
    } catch {}

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
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-fade-in"
    >
      <div className="bg-black border border-white/20 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-3.5 text-white max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-black border border-white/20 text-white flex items-center justify-center shrink-0">
              <Volume2 size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 id="paste-audio-title" className="text-base sm:text-lg font-black text-white truncate">
                Ascolta Testo Copiato
              </h2>
              <p className="text-xs text-zinc-400 font-medium truncate">
                Incolla qualsiasi testo per aprirlo nel lettore vocale
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra"
            className="w-9 h-9 rounded-xl bg-black border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback / Error notices */}
        {error && (
          <div className="bg-black border border-white/50 p-3 rounded-xl flex items-center gap-2.5 text-xs text-white font-semibold shrink-0">
            <AlertCircle size={17} className="text-white shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {pastedNotice && (
          <div className="bg-black border border-white p-3 rounded-xl flex items-center gap-2.5 text-xs text-white font-bold shrink-0 animate-fade-in">
            <Check size={17} className="text-white shrink-0" />
            <span>{pastedNotice}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3.5 pr-1">
          {/* Quick Paste Button & Clear Button as Icons */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="py-2.5 px-4 rounded-xl bg-white text-black font-black text-xs hover:bg-zinc-200 active:scale-95 transition-all shadow-md flex items-center gap-2"
              title="Tocca per incollare il testo copiato"
            >
              <ClipboardPaste size={17} />
              <span>Incolla testo</span>
            </button>

            <div className="flex items-center gap-2">
              {!text && (
                <button
                  type="button"
                  onClick={handleInsertSample}
                  className="text-xs text-zinc-400 hover:text-white underline font-semibold transition-colors"
                >
                  Testo di prova
                </button>
              )}

              {text && (
                <button
                  type="button"
                  onClick={() => {
                    setText('');
                    setTitle('');
                  }}
                  className="py-2 px-3 rounded-xl bg-black border border-zinc-800 hover:border-zinc-600 text-xs text-zinc-300 hover:text-white font-bold transition-all flex items-center gap-1.5 active:scale-95"
                  title="Cancella testo inserito"
                >
                  <Trash2 size={14} className="text-zinc-400" />
                  <span>Cancella</span>
                </button>
              )}
            </div>
          </div>

          {/* Text Area for Pasted Content */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-[160px]">
            <label htmlFor="pasted-content" className="text-xs font-bold text-zinc-300">
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
              className="w-full flex-1 min-h-[170px] sm:min-h-[200px] bg-black border border-white/20 focus:border-white rounded-2xl p-3.5 text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Word count and duration stats */}
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1 shrink-0">
            <div className="flex items-center gap-3">
              <span>{wordCount} parole</span>
              <span>·</span>
              <span>{text.length} caratteri</span>
            </div>
            {wordCount > 0 && (
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <Clock size={14} />
                <span>~{estimatedMinutes} min di ascolto</span>
              </div>
            )}
          </div>

          {/* Title input (optional) */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <label htmlFor="pasted-title" className="text-xs font-bold text-zinc-300">
              Titolo documento (opzionale)
            </label>
            <input
              id="pasted-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Articolo, Appunti, Capitolo..."
              className="w-full bg-black border border-white/20 focus:border-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {/* Voci di Lettura (TTS) come Icone */}
          <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2 shrink-0">
            <span className="text-xs font-bold text-zinc-300">
              Scegli la voce di lettura:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {VOICE_OPTIONS.map((v) => {
                const Icon = v.icon;
                const isSelected = selectedVoiceUri === v.uri;
                return (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => handleSelectVoice(v.uri, v.name)}
                    className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 text-center ${
                      isSelected
                        ? 'bg-zinc-900 border-white text-white shadow-md'
                        : 'bg-black border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-transform group-hover:scale-105 ${
                        isSelected ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="text-[11px] font-bold leading-tight truncate w-full">
                      {v.name}
                    </span>
                    <span className="text-[9px] text-zinc-400 leading-none mt-0.5">
                      {v.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voci e Libri Recenti come Icone */}
          {existingBooks.length > 0 && (
            <div className="pt-2 border-t border-zinc-800 flex flex-col gap-2 shrink-0">
              <span className="text-xs font-bold text-zinc-300">
                Oppure ascolta una voce recente:
              </span>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                {existingBooks.slice(0, 6).map((b) => (
                  <button
                    key={b.book_id}
                    type="button"
                    onClick={() => {
                      onOpenReader(b);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none min-w-[70px] max-w-[85px] text-center active:scale-95 transition-transform"
                    title={b.title}
                  >
                    <div className="relative w-13 h-13 rounded-2xl bg-zinc-900 border border-zinc-700 group-hover:border-white text-white flex items-center justify-center transition-all shadow-md group-hover:scale-105">
                      <BookOpen size={22} className="text-white" />
                      <span className="absolute -bottom-1 -right-1 text-[8px] bg-white text-black font-black px-1 rounded-sm uppercase">
                        {b.file_type || 'TXT'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white transition-colors truncate w-full">
                      {b.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:border-white text-xs font-bold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <X size={14} />
            <span>Annulla</span>
          </button>

          <button
            type="button"
            onClick={handleStartListening}
            className="flex-1 py-3 px-5 rounded-2xl bg-white text-black font-black text-xs sm:text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
          >
            <Play size={16} className="fill-black" />
            <span>Apri nel Lettore e Ascolta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
