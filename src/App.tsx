import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, FileText, BookOpen, Camera } from 'lucide-react';
import { Book, User, TtsSettings, ScanSessionData } from './types';
import { storageService, DEFAULT_SETTINGS } from './services/storageService';
import { SAMPLE_BOOKS } from './data/sampleBooks';
import { Navbar, TabType } from './components/Navbar';
import { Header } from './components/Header';
import { HomeTab } from './components/HomeTab';
import { LibraryTab } from './components/LibraryTab';
import { SettingsTab } from './components/SettingsTab';
import { ProfileTab } from './components/ProfileTab';
import { ReaderView } from './components/ReaderView';
import { ScanResultsPage } from './components/ScanResultsPage';
import { SplashScreen } from './components/SplashScreen';

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [books, setBooks] = useState<Book[]>([]);
  const [user, setUser] = useState<User>(storageService.getUser());
  const [settings, setSettings] = useState<TtsSettings>(storageService.getSettings());
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [scanSession, setScanSession] = useState<ScanSessionData | null>(null);
  const [loadingBook, setLoadingBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tabHistory, setTabHistory] = useState<TabType[]>(['home']);

  useEffect(() => {
    const loadedBooks = storageService.getBooks();
    setBooks(loadedBooks);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleSelectTab = useCallback((tab: TabType) => {
    setTabHistory((prev) => [...prev, tab]);
    setCurrentTab(tab);
  }, []);

  const handleBackToPrevious = useCallback(() => {
    setTabHistory((prev) => {
      if (prev.length > 1) {
        const next = [...prev];
        next.pop();
        const prevTab = next[next.length - 1];
        setCurrentTab(prevTab);
        return next;
      }
      setCurrentTab('home');
      return ['home'];
    });
  }, []);

  const handleOpenBook = useCallback((book: Book) => {
    const cleanBook = storageService.getSanitizedBook(book);
    setLoadingBook(cleanBook);
    setTimeout(() => {
      setActiveBook(cleanBook);
      setLoadingBook(null);
    }, 450);
  }, []);

  const handleCloseReader = useCallback(() => {
    setActiveBook(null);
    setBooks(storageService.getBooks());
  }, []);

  const handleAddBook = useCallback((book: Book) => {
    const updated = storageService.addBook(book);
    setBooks(updated);
    setCurrentTab('library');
    showToast(`Libro "${book.title}" aggiunto alla libreria!`);
  }, [showToast]);

  const handleDeleteBook = useCallback((bookId: string) => {
    setBooks((prev) => {
      const bookToDelete = prev.find((b) => b.book_id === bookId);
      const updated = storageService.deleteBook(bookId);
      showToast(`Libro ${bookToDelete ? `"${bookToDelete.title}"` : ''} eliminato.`);
      return updated;
    });
  }, [showToast]);

  const handleUpdatePage = useCallback((pageIndex: number) => {
    setActiveBook((prev) => {
      if (!prev || prev.currentPage === pageIndex) return prev;
      storageService.updateBookPage(prev.book_id, pageIndex);
      return { ...prev, currentPage: pageIndex };
    });
    setBooks((prev) => {
      return prev.map((b) =>
        b.book_id === activeBook?.book_id && b.currentPage !== pageIndex
          ? { ...b, currentPage: pageIndex }
          : b
      );
    });
  }, [activeBook?.book_id]);

  const handleUpdateContent = useCallback((pages: string[]) => {
    setActiveBook((prev) => {
      if (!prev) return null;
      storageService.updateBookContent(prev.book_id, pages);
      return { ...prev, pages };
    });
    setBooks((prev) => {
      return prev.map((b) =>
        b.book_id === activeBook?.book_id ? { ...b, pages } : b
      );
    });
  }, [activeBook?.book_id]);

  const handleUpdateSettings = (newSettings: TtsSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  const handleUpdateUser = (newUser: User) => {
    setUser(newUser);
    storageService.saveUser(newUser);
  };

  const handleResetSampleBooks = () => {
    storageService.saveBooks(SAMPLE_BOOKS);
    setBooks(SAMPLE_BOOKS);
    showToast('Libri classici di esempio ripristinati!');
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
      {/* Splash Screen with Logo and Title */}
      {showSplash && (
        <SplashScreen onDismiss={() => setShowSplash(false)} />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white text-gray-900 font-bold px-6 py-3 rounded-2xl shadow-2xl border border-gray-200 text-sm animate-bounce"
        >
          {toastMessage}
        </div>
      )}

      {/* Loading overlay when opening a book */}
      {loadingBook && (
        <div
          role="status"
          aria-live="polite"
          aria-label={`Caricamento del libro ${loadingBook.title}`}
          className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none"
        >
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-gray-200 border-t-red-600 animate-spin" />
            <Loader2 className="absolute text-red-600 animate-spin" size={38} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Apertura del libro in corso...
          </h2>
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-gray-800 max-w-md truncate mb-2">
            <span className="text-red-600 shrink-0 inline-flex items-center" title={`Tipo file: ${loadingBook.file_type.toUpperCase()}`}>
              {loadingBook.file_type === 'pdf' ? (
                <FileText size={20} aria-hidden="true" />
              ) : loadingBook.file_type === 'scan' ? (
                <Camera size={20} aria-hidden="true" />
              ) : (
                <BookOpen size={20} aria-hidden="true" />
              )}
            </span>
            <span className="truncate">{loadingBook.title}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 max-w-xs leading-relaxed">
            Caricamento di tutto il contenuto ({loadingBook.pages.length} {loadingBook.pages.length === 1 ? 'pagina' : 'pagine'})...
          </p>
        </div>
      )}

      {/* Reader View when active */}
      {activeBook ? (
        <ReaderView
          book={activeBook}
          settings={settings}
          onBack={handleCloseReader}
          onPageChange={handleUpdatePage}
          onUpdateContent={handleUpdateContent}
          onUpdateSettings={handleUpdateSettings}
        />
      ) : scanSession ? (
        <ScanResultsPage
          session={scanSession}
          settings={settings}
          onBack={() => setScanSession(null)}
          onOpenInReader={(book) => {
            setScanSession(null);
            handleOpenBook(book);
          }}
          onSaveToLibrary={(book) => {
            setScanSession(null);
            handleAddBook(book);
          }}
        />
      ) : (
        <>
          {/* Header mostrata solo nella home page */}
          {currentTab === 'home' && (
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              title="Vora"
            />
          )}

          {/* Main content body */}
          <main className="flex-1 max-w-2xl w-full mx-auto px-3.5 pt-2 pb-24">
            {currentTab === 'home' && (
              <HomeTab
                books={books}
                searchQuery={searchQuery}
                onOpenBook={handleOpenBook}
                onDeleteBook={handleDeleteBook}
                onAddBook={handleAddBook}
                onScanResultsReady={(session) => setScanSession(session)}
                hideFab={showSplash}
              />
            )}

            {currentTab === 'library' && (
              <LibraryTab
                books={books}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenBook={handleOpenBook}
                onDeleteBook={handleDeleteBook}
                onBack={handleBackToPrevious}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsTab
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onBack={handleBackToPrevious}
              />
            )}

            {currentTab === 'profile' && (
              <ProfileTab
                user={user}
                books={books}
                onUpdateUser={handleUpdateUser}
                onResetSampleBooks={handleResetSampleBooks}
                onShowSplash={() => setShowSplash(true)}
                onBack={handleBackToPrevious}
              />
            )}
          </main>

          {/* Bottom Navigation */}
          <Navbar currentTab={currentTab} onSelectTab={handleSelectTab} />
        </>
      )}
    </div>
  );
}

export default App;
