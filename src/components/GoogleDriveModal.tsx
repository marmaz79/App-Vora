import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  FileText,
  Folder,
  Loader2,
  AlertCircle,
  Download,
  ArrowLeft,
  RefreshCw,
  HardDrive,
  FileCode,
  Image as ImageIcon,
  Check,
  Headphones,
} from 'lucide-react';
import { googleDriveService, DriveFile } from '../services/googleDriveService';
import {
  getGoogleDriveAccessToken,
  requestGoogleDriveAccess,
  clearGoogleDriveAccessToken,
} from '../services/firebase';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileDownloaded: (file: File) => Promise<void> | void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onFileDownloaded,
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [folderStack, setFolderStack] = useState<{ id?: string; name: string }[]>([
    { id: undefined, name: 'Il mio Drive' },
  ]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pdf' | 'doc' | 'text' | 'audio'>('all');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getGoogleDriveAccessToken());
  const deviceFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDeviceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDownloadingFileId('device-file');
      setDownloadStatus(`Importazione di "${file.name}" nella libreria...`);
      try {
        await onFileDownloaded(file);
        onClose();
      } catch (err: any) {
        console.error('Error importing device Drive file:', err);
        setError(err?.message || 'Errore durante l\'importazione del file.');
      } finally {
        setDownloadingFileId(null);
        setDownloadStatus('');
      }
    }
  };

  const currentFolder = folderStack[folderStack.length - 1];

  const fetchFiles = async (folderId?: string, search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleDriveService.listFiles({
        folderId,
        searchTerm: search,
      });
      setFiles(res.files);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Error fetching Google Drive files:', err);
      const isAuthErr =
        err?.message?.includes('Permessi') ||
        err?.message?.includes('403') ||
        err?.message?.includes('401') ||
        err?.message?.includes('scaduta') ||
        err?.message?.includes('autorizzazione');
      if (isAuthErr) {
        clearGoogleDriveAccessToken();
        setIsAuthenticated(false);
      }
      setError(err?.message || 'Impossibile connettersi a Google Drive. Autorizza l\'accesso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const token = getGoogleDriveAccessToken();
      if (token) {
        setIsAuthenticated(true);
        fetchFiles(currentFolder.id, searchTerm);
      } else {
        setIsAuthenticated(false);
      }
    }
  }, [isOpen, currentFolder.id]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestGoogleDriveAccess(true);
      setIsAuthenticated(true);
      await fetchFiles(currentFolder.id, searchTerm);
    } catch (err: any) {
      setIsAuthenticated(false);
      setError(err?.message || 'Accesso a Google Drive non riuscito.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(currentFolder.id, searchTerm);
  };

  const handleFolderClick = (folder: DriveFile) => {
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchTerm('');
  };

  const handleGoBackFolder = (index: number) => {
    setFolderStack((prev) => prev.slice(0, index + 1));
    setSearchTerm('');
  };

  const handleSelectFile = async (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      handleFolderClick(file);
      return;
    }

    setDownloadingFileId(file.id);
    setDownloadStatus(`Download di "${file.name}" da Google Drive...`);
    setError(null);

    try {
      const downloadedFile = await googleDriveService.downloadFile(file, (msg) => {
        setDownloadStatus(msg);
      });
      setDownloadStatus(`Salvataggio di "${downloadedFile.name}" nella libreria...`);
      await onFileDownloaded(downloadedFile);
      onClose();
    } catch (err: any) {
      console.error('Error downloading or importing Drive file:', err);
      setError(err?.message || 'Errore durante lo scaricamento o l\'importazione del file da Google Drive.');
    } finally {
      setDownloadingFileId(null);
      setDownloadStatus('');
    }
  };

  const filteredFiles = files.filter((f) => {
    if (f.mimeType === 'application/vnd.google-apps.folder') return true;
    if (activeFilter === 'pdf') {
      return f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    }
    if (activeFilter === 'doc') {
      return (
        f.mimeType === 'application/vnd.google-apps.document' ||
        f.name.toLowerCase().endsWith('.docx') ||
        f.name.toLowerCase().endsWith('.doc')
      );
    }
    if (activeFilter === 'text') {
      return (
        f.mimeType === 'text/plain' ||
        f.mimeType === 'application/epub+zip' ||
        f.name.toLowerCase().endsWith('.txt') ||
        f.name.toLowerCase().endsWith('.epub')
      );
    }
    if (activeFilter === 'audio') {
      return (
        f.mimeType.startsWith('audio/') ||
        ['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac', '.opus', '.wma'].some((ext) =>
          f.name.toLowerCase().endsWith(ext)
        )
      );
    }
    return true;
  });

  const formatFileSize = (bytesStr?: string) => {
    if (!bytesStr) return '';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder size={20} className="text-[#FFD23F] fill-[#FFD23F]/30" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <Headphones size={20} className="text-[#5DADE2]" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText size={20} className="text-[#1E8C86]" />;
    }
    if (mimeType === 'application/vnd.google-apps.document') {
      return <FileCode size={20} className="text-[#2BA8A2]" />;
    }
    if (mimeType.startsWith('image/')) {
      return <ImageIcon size={20} className="text-[#EF6C4A]" />;
    }
    return <FileText size={20} className="text-[#1E8C86]" />;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-drive-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none animate-fade-in font-sans"
    >
      <div className="bg-white border-2 border-[#2BA8A2]/30 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-card flex flex-col gap-4 text-slate-800 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-[#2BA8A2]/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 flex items-center justify-center shrink-0 shadow-xs">
              {/* Google Drive Signature Icon */}
              <svg className="w-5 h-5 text-[#1E8C86]" viewBox="0 0 87.3 78" fill="none">
                <path
                  d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"
                  fill="#2BA8A2"
                />
                <path
                  d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"
                  fill="#3CC4BD"
                />
                <path
                  d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"
                  fill="#1E8C86"
                />
                <path
                  d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
                  fill="#FFD23F"
                />
                <path
                  d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
                  fill="#EF6C4A"
                />
                <path
                  d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
                  fill="#5DADE2"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 id="google-drive-title" className="text-base sm:text-lg font-black text-[#1E8C86] truncate">
                Google Drive
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate">
                Importa libri e documenti dal tuo archivio Drive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  clearGoogleDriveAccessToken();
                  setIsAuthenticated(false);
                  setFiles([]);
                }}
                title="Cambia account Google Drive"
                className="text-[11px] text-[#1E8C86] hover:underline px-2.5 py-1 rounded-full border border-[#2BA8A2]/30 bg-[#E8F6F5] font-black transition-colors"
              >
                Cambia account
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi finestra Google Drive"
              className="w-9 h-9 rounded-full bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#1E8C86] flex items-center justify-center hover:bg-[#2BA8A2]/20 transition-all shrink-0 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error notification with quick action buttons */}
        {error && (
          <div className="bg-[#EF6C4A]/10 border-2 border-[#EF6C4A]/30 p-3.5 rounded-2xl flex flex-col gap-3 text-slate-800 shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-[#EF6C4A]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-relaxed text-[#D45233]">{error}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
              <button
                type="button"
                onClick={handleConnect}
                disabled={loading}
                className="w-full sm:flex-1 py-2.5 rounded-full bg-[#FFD23F] hover:bg-[#FFE47A] text-slate-900 font-black text-xs active:scale-95 transition-all shadow-accent-glow flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                <span>Autorizza Google Drive</span>
              </button>
              <button
                type="button"
                onClick={() => deviceFileInputRef.current?.click()}
                className="w-full sm:flex-1 py-2.5 rounded-full bg-white border-2 border-[#2BA8A2]/40 text-[#1E8C86] font-black text-xs hover:bg-[#E8F6F5] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <HardDrive size={15} />
                <span>Scegli dal tuo telefono / PC</span>
              </button>
            </div>
          </div>
        )}

        {/* Status indicator when downloading file */}
        {downloadingFileId && (
          <div className="bg-[#E8F6F5] border-2 border-[#2BA8A2]/40 p-3.5 rounded-2xl flex items-center gap-3 text-slate-800 shrink-0 animate-pulse">
            <Loader2 size={18} className="animate-spin shrink-0 text-[#1E8C86]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[#1E8C86] truncate">{downloadStatus}</p>
              <p className="text-[11px] text-slate-500 font-medium">Conversione in formato leggibile per Vora...</p>
            </div>
          </div>
        )}

        {/* Not authenticated state */}
        {!isAuthenticated ? (
          <div className="py-10 flex flex-col items-center justify-center text-center gap-4 px-4 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 flex items-center justify-center shadow-xs">
              <HardDrive size={32} className="text-[#1E8C86]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-1">
                Connetti il tuo Google Drive
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
                Autorizza l'accesso in sola lettura per scegliere ed estrarre libri in PDF, EPUB o documenti di testo direttamente dal tuo cloud.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-sm mt-1">
              <button
                type="button"
                onClick={handleConnect}
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#FFD23F] hover:bg-[#FFE47A] text-slate-900 font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-accent-glow disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Connessione...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Connetti Cloud Drive</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => deviceFileInputRef.current?.click()}
                className="w-full py-3 rounded-full bg-white hover:bg-[#E8F6F5] border-2 border-[#2BA8A2]/30 text-[#1E8C86] font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs"
                title="Apri il selettore del dispositivo con accesso diretto a Google Drive"
              >
                <HardDrive size={16} />
                <span>Scegli dal telefono</span>
              </button>
            </div>
          </div>
        ) : (
          /* Authenticated File Explorer */
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {/* Search and Refresh bar */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 shrink-0">
              <div className="flex-1 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1E8C86]"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cerca file su Google Drive..."
                  className="w-full bg-[#FFF8E7]/50 border-2 border-[#2BA8A2]/20 focus:border-[#2BA8A2] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2BA8A2] text-white font-black text-xs hover:bg-[#1E8C86] active:scale-95 transition-all shrink-0 shadow-xs"
              >
                Cerca
              </button>
              <button
                type="button"
                onClick={() => fetchFiles(currentFolder.id, searchTerm)}
                disabled={loading}
                title="Aggiorna elenco file"
                aria-label="Aggiorna elenco"
                className="w-9 h-9 rounded-xl bg-[#E8F6F5] border border-[#2BA8A2]/30 text-[#1E8C86] flex items-center justify-center hover:bg-[#2BA8A2]/20 active:scale-95 transition-all shrink-0"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </form>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 overflow-x-auto no-scrollbar py-1 shrink-0">
              {folderStack.map((folder, idx) => (
                <React.Fragment key={folder.id || 'root'}>
                  {idx > 0 && <span className="text-[#2BA8A2] font-black">/</span>}
                  <button
                    type="button"
                    onClick={() => handleGoBackFolder(idx)}
                    className={`hover:text-[#1E8C86] whitespace-nowrap transition-colors ${
                      idx === folderStack.length - 1 ? 'text-[#1E8C86] font-black' : ''
                    }`}
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'Tutti i file' },
                  { id: 'pdf', label: 'Solo PDF' },
                  { id: 'doc', label: 'Documenti' },
                  { id: 'text', label: 'Testo / EPUB' },
                  { id: 'audio', label: 'Audio' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all shrink-0 active:scale-95 ${
                    activeFilter === tab.id
                      ? 'bg-[#2BA8A2] text-white shadow-teal-glow'
                      : 'bg-[#E8F6F5] text-[#1E8C86] hover:bg-[#3CC4BD]/20 border border-[#2BA8A2]/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* File List */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#2BA8A2]/15 border-2 border-[#2BA8A2]/20 rounded-2xl bg-white shadow-xs">
              {loading && files.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 size={28} className="animate-spin text-[#2BA8A2]" />
                  <span className="text-xs font-bold text-[#1E8C86]">Lettura file da Google Drive...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center gap-2 text-slate-500 px-4 text-center">
                  <FileText size={32} className="text-[#2BA8A2]/50" />
                  <p className="text-sm font-black text-slate-800">Nessun file compatibile trovato</p>
                  <p className="text-xs text-slate-500 font-medium">
                    Prova a cercare per nome o carica file PDF, EPUB o TXT su Google Drive.
                  </p>
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                  const isDownloading = downloadingFileId === file.id;

                  return (
                    <div
                      key={file.id}
                      onClick={() => !isDownloading && handleSelectFile(file)}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#E8F6F5]/50 cursor-pointer transition-colors group select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-[#E8F6F5] border border-[#2BA8A2]/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-black text-slate-900 truncate group-hover:text-[#1E8C86]">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <span>
                              {isFolder ? 'Cartella' : file.mimeType.includes('pdf') ? 'PDF' : file.mimeType.includes('document') ? 'Google Doc' : 'Documento'}
                            </span>
                            {file.size && <span>· {formatFileSize(file.size)}</span>}
                            {file.modifiedTime && (
                              <span className="hidden sm:inline">
                                · {new Date(file.modifiedTime).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isDownloading ? (
                          <Loader2 size={16} className="animate-spin text-[#2BA8A2]" />
                        ) : isFolder ? (
                          <span className="text-xs text-[#1E8C86] font-black group-hover:translate-x-0.5 transition-transform">
                            Apri →
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="px-3 py-1 rounded-full bg-[#FFD23F] hover:bg-[#FFE47A] text-slate-900 text-xs font-black transition-all flex items-center gap-1 shadow-accent-glow active:scale-95"
                          >
                            <Download size={12} />
                            <span>Importa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Hidden device file input with access to native Google Drive */}
        <input
          ref={deviceFileInputRef}
          type="file"
          accept=".pdf,.epub,.txt,.docx,.doc,.mp3,.m4a,.wav,.ogg,.aac,application/pdf,application/epub+zip,text/plain,image/*,audio/*"
          onChange={handleDeviceFileChange}
          className="hidden"
        />

        {/* Footer info */}
        <div className="pt-2 border-t-2 border-dashed border-[#2BA8A2]/20 flex items-center justify-between text-[11px] text-slate-500 shrink-0 font-medium">
          <span>Supportati: PDF, Google Docs, EPUB, TXT, Audio, Immagini</span>
          <button
            type="button"
            onClick={onClose}
            className="text-[#1E8C86] hover:underline font-black"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
