import React, { useState, useEffect, useCallback } from 'react';

import { Book, User, TtsSettings, ScanSessionData, AppNotification, ContrastThemeMode } from './types';
import { storageService, DEFAULT_SETTINGS } from './services/storageService';
import { SAMPLE_BOOKS } from './data/sampleBooks';
import { Navbar, TabType } from './components/Navbar';
import { Header } from './components/Header';
import { HomeTab } from './components/HomeTab';
import { LibraryTab } from './components/LibraryTab';
import { SettingsTab } from './components/SettingsTab';
import { ProfileTab } from './components/ProfileTab';
import { ScanTab } from './components/ScanTab';
import { ScanModal } from './components/ScanModal';
import { ReaderView } from './components/ReaderView';
import { PdfDocumentView } from './components/PdfDocumentView';
import { BookOpenOptionsModal } from './components/BookOpenOptionsModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ScanResultsPage } from './components/ScanResultsPage';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { ReadingStatsModal } from './components/ReadingStatsModal';
import { StatsTab } from './components/StatsTab';
import { signOutFirebase, subscribeToAuthState, clearGoogleDriveAccessToken } from './services/firebase';

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showLogin, setShowLogin] = useState(() => !storageService.isAuthenticated());
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [books, setBooks] = useState<Book[]>([]);
  const [user, setUser] = useState<User>(storageService.getUser());
  const [settings, setSettings] = useState<TtsSettings>(() => {
    const s = storageService.getSettings();
    if (!s.highContrastMode || s.highContrastMode === 'white') {
      s.highContrastMode = 'dark';
      storageService.saveSettings(s);
    }
    return s;
  });
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activePdfBook, setActivePdfBook] = useState<Book | null>(null);
  const [bookForOptions, setBookForOptions] = useState<Book | null>(null);
  const [scanSession, setScanSession] = useState<ScanSessionData | null>(null);
  const [loadingBook, setLoadingBook] = useState<Book | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [openLiveCameraDirectly, setOpenLiveCameraDirectly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [tabHistory, setTabHistory] = useState<TabType[]>(['home']);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    storageService.getNotifications()
  );
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [pdfNightMode, setPdfNightMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('vora_pdf_night_mode');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const loadedBooks = storageService.getBooks();
    setBooks(loadedBooks);
  }, []);

  // Listen to Firebase Auth state for seamless Google session restore
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        storageService.saveUser(fbUser);
        storageService.setAuthenticated(true);
        setShowLogin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Global clipboard cache for text copied within app or web view
  useEffect(() => {
    const handleCopy = () => {
      try {
        const sel = window.getSelection()?.toString();
        if (sel && sel.trim()) {
          sessionStorage.setItem('vora_last_copied_text', sel.trim());
          localStorage.setItem('vora_last_copied_text', sel.trim());
        }
      } catch {}
    };
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleLoginSuccess = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    storageService.saveUser(loggedInUser);
    storageService.setAuthenticated(true);
    setShowLogin(false);
    showToast(`Accesso effettuato come ${loggedInUser.name}`);
  }, [showToast]);

  const handleSkipLogin = useCallback(() => {
    setShowLogin(false);
    showToast('Accesso come ospite completato.');
  }, [showToast]);

  const handleLogout = useCallback(() => {
    signOutFirebase().catch(() => {});
    clearGoogleDriveAccessToken();
    storageService.logout();
    setUser(storageService.getUser());
    setShowLogin(true);
    setCurrentTab('home');
    showToast('Disconnessione effettuata.');
  }, [showToast]);

  const handleMarkAsRead = useCallback((id: string) => {
    const updated = storageService.markNotificationAsRead(id);
    setNotifications(updated);
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    const updated = storageService.markAllNotificationsAsRead();
    setNotifications(updated);
    showToast('Tutte le notifiche segnate come lette.');
  }, [showToast]);

  const handleDeleteNotification = useCallback((id: string) => {
    const updated = storageService.deleteNotification(id);
    setNotifications(updated);
  }, []);

  const handleClearAllNotifications = useCallback(() => {
    const updated = storageService.clearAllNotifications();
    setNotifications(updated);
    showToast('Tutte le notifiche sono state cancellate.');
  }, [showToast]);

  const handleResetSampleNotifications = useCallback(() => {
    const updated = storageService.resetSampleNotifications();
    setNotifications(updated);
    showToast('Notifiche ripristinate.');
  }, [showToast]);

  const handleSelectTab = useCallback((tab: TabType) => {
    setTabHistory((prev) => [...prev, tab]);
    setCurrentTab(tab);
    if (tab === 'scan') {
      setIsScanModalOpen(false);
    }
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

  // Al tocco del libro: mostra il modale con le due opzioni "Apri in PDF" o "Leggi libro"
  const handleOpenBook = useCallback((book: Book) => {
    const cleanBook = storageService.getSanitizedBook(book);
    setBookForOptions(cleanBook);
  }, []);

  // Opzione 1: Apri nel lettore eBook (ReaderView con voce AI)
  const handleReadBook = useCallback((book: Book) => {
    setBookForOptions(null);
    const cleanBook = storageService.getSanitizedBook(book);
    setLoadingBook(cleanBook);
    setTimeout(() => {
      setActivePdfBook(null);
      setActiveBook(cleanBook);
      setLoadingBook(null);
    }, 450);
  }, []);

  // Opzione 2: Apri nel visualizzatore documento PDF (a pieno schermo)
  const handleOpenInPdf = useCallback((book: Book, nightMode?: boolean) => {
    setBookForOptions(null);
    const cleanBook = storageService.getSanitizedBook(book);
    if (typeof nightMode === 'boolean') {
      setPdfNightMode(nightMode);
      try {
        localStorage.setItem('vora_pdf_night_mode', nightMode ? 'true' : 'false');
      } catch {}
    }

    // Richiesta di apertura a pieno schermo sul gesto utente (click)
    try {
      const docEl = document.documentElement;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if ((docEl as any).webkitRequestFullscreen) {
          (docEl as any).webkitRequestFullscreen();
        } else if ((docEl as any).msRequestFullscreen) {
          (docEl as any).msRequestFullscreen();
        }
      }
    } catch {}

    setLoadingBook(cleanBook);
    setTimeout(() => {
      setActiveBook(null);
      setActivePdfBook(cleanBook);
      setLoadingBook(null);
    }, 450);
  }, []);

  const handleCloseReader = useCallback(() => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    } catch {}
    setActiveBook(null);
    setActivePdfBook(null);
    setBooks(storageService.getBooks());
  }, []);

  const handleAddBook = useCallback((book: Book) => {
    const updated = storageService.addBook(book);
    setBooks(updated);
    setSearchQuery('');
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
    const currentId = activeBook?.book_id || activePdfBook?.book_id;
    if (!currentId) return;

    setActiveBook((prev) => {
      if (!prev || prev.currentPage === pageIndex) return prev;
      storageService.updateBookPage(prev.book_id, pageIndex);
      return { ...prev, currentPage: pageIndex };
    });

    setActivePdfBook((prev) => {
      if (!prev || prev.currentPage === pageIndex) return prev;
      storageService.updateBookPage(prev.book_id, pageIndex);
      return { ...prev, currentPage: pageIndex };
    });

    setBooks((prev) => {
      return prev.map((b) =>
        b.book_id === currentId && b.currentPage !== pageIndex
          ? { ...b, currentPage: pageIndex }
          : b
      );
    });
  }, [activeBook?.book_id, activePdfBook?.book_id]);

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

  const isDarkMode =
    settings.highContrastMode === 'dark' ||
    settings.highContrastMode === 'black-white' ||
    settings.highContrastMode === 'black-yellow';

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = useCallback(() => {
    const nextMode: ContrastThemeMode = isDarkMode ? 'white' : 'dark';
    const updated: TtsSettings = {
      ...settings,
      highContrastMode: nextMode,
    };
    handleUpdateSettings(updated);
    showToast(nextMode === 'dark' ? 'Modalità scura attivata 🌙' : 'Modalità chiara attivata ☀️');
  }, [isDarkMode, settings, showToast]);

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
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-[#0E1716] text-slate-100' : 'bg-[#EFF8F7] text-slate-800'} flex flex-col font-sans selection:bg-[#FFD23F] selection:text-[#1E8C86] transition-colors duration-200`}>
      {/* Toast Notification - Flip7 Pill Style */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-[#FFD23F] text-[#1E8C86] font-black px-6 py-2.5 rounded-full shadow-accent-glow border-2 border-[#E6B800] text-sm animate-bounce flex items-center gap-2 select-none"
        >
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Splash Screen all'avvio dell'applicazione */}
      {showSplash ? (
        <SplashScreen onDismiss={() => setShowSplash(false)} isDarkMode={isDarkMode} />
      ) : showLogin ? (
        /* 2. Login Screen subito dopo lo splash screen e prima di arrivare alla home */
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onSkip={handleSkipLogin}
          initialEmail={user.email}
          isDarkMode={isDarkMode}
        />
      ) : (
        /* 3. Applicazione principale (Home, Lettore, Notifiche, ecc.) */
        <>
          {/* Loading overlay when opening a book: Flip7 spinner */}
          {loadingBook && (
            <div
              role="status"
              aria-live="polite"
              aria-label="Caricamento..."
              className="fixed inset-0 z-50 bg-[#EFF8F7]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in"
            >
              <div className="relative flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-full border-4 border-[#2BA8A2]/25 border-t-[#2BA8A2] animate-spin" />
              </div>
              <p className="text-base font-black text-[#1E8C86] tracking-wide">
                Caricamento in corso...
              </p>
            </div>
          )}

      {/* Modale con le due opzioni al tocco del libro: Apri in PDF o Leggi libro */}
      {bookForOptions && (
        <BookOpenOptionsModal
          book={bookForOptions}
          onOpenPdf={handleOpenInPdf}
          onOpenReader={handleReadBook}
          onClose={() => setBookForOptions(null)}
        />
      )}

      {/* Visualizzatore Documento PDF autentico */}
      {activePdfBook ? (
        <PdfDocumentView
          book={activePdfBook}
          settings={settings}
          initialNightMode={pdfNightMode}
          onBack={() => {
            setActivePdfBook(null);
            setBooks(storageService.getBooks());
          }}
          onSwitchToReader={handleReadBook}
          onPageChange={handleUpdatePage}
        />
      ) : activeBook ? (
        <ReaderView
          book={activeBook}
          settings={settings}
          onBack={handleCloseReader}
          onPageChange={handleUpdatePage}
          onUpdateContent={handleUpdateContent}
          onUpdateSettings={handleUpdateSettings}
          onSwitchToPdf={handleOpenInPdf}
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
              onOpenProfile={() => handleSelectTab('profile')}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              onOpenStats={() => handleSelectTab('stats')}
              unreadNotificationsCount={notifications.filter((n) => !n.read).length}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
            />
          )}

          {/* Main content body */}
          <main className="flex-1 max-w-2xl w-full mx-auto px-3.5 pt-2 pb-24">
            {currentTab === 'home' && (
              <HomeTab
                books={books}
                searchQuery={searchQuery}
                userName={user?.name || (user?.email ? user.email.split('@')[0] : 'mariano')}
                onOpenBook={handleOpenBook}
                onOpenPdf={handleOpenInPdf}
                onOpenReader={handleReadBook}
                onDeleteBook={handleDeleteBook}
                onAddBook={handleAddBook}
                onScanResultsReady={(session) => setScanSession(session)}
                hideFab={showSplash}
                onOpenScan={() => handleSelectTab('scan')}
                onOpenStats={() => handleSelectTab('stats')}
              />
            )}

            {currentTab === 'library' && (
              <LibraryTab
                books={books}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenBook={handleOpenBook}
                onOpenPdf={handleOpenInPdf}
                onOpenReader={handleReadBook}
                onDeleteBook={handleDeleteBook}
                onBack={handleBackToPrevious}
              />
            )}

            {currentTab === 'scan' && (
              <ScanTab
                onAddBook={handleAddBook}
                onScanResultsReady={(session) => setScanSession(session)}
                onOpenScanModal={() => setIsScanModalOpen(true)}
              />
            )}

            {currentTab === 'stats' && (
              <StatsTab
                books={books}
                onOpenBook={handleReadBook}
                onBack={handleBackToPrevious}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsTab
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onBack={handleBackToPrevious}
                user={user}
                onOpenProfile={() => handleSelectTab('profile')}
                onOpenLogin={() => setShowLogin(true)}
                onLogout={handleLogout}
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
                onOpenLogin={() => setShowLogin(true)}
                onLogout={handleLogout}
                onOpenStats={() => handleSelectTab('stats')}
              />
            )}
          </main>

          {/* Bottom Navigation con scan.ocr al posto del profilo */}
          <Navbar currentTab={currentTab} onSelectTab={handleSelectTab} isDarkMode={isDarkMode} />

          {/* Modale Scan.ocr globale */}
          <ScanModal
            isOpen={isScanModalOpen}
            initialOpenLiveCamera={openLiveCameraDirectly}
            onClose={() => {
              setIsScanModalOpen(false);
              setOpenLiveCameraDirectly(false);
            }}
            onBookAdded={handleAddBook}
            onScanResultsReady={(session) => {
              setIsScanModalOpen(false);
              setOpenLiveCameraDirectly(false);
              setScanSession(session);
            }}
          />

          {/* Modale Notifiche aperto al tocco della campana */}
          {isNotificationsOpen && (
            <NotificationsModal
              notifications={notifications}
              onClose={() => setIsNotificationsOpen(false)}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onDeleteNotification={handleDeleteNotification}
              onClearAll={handleClearAllNotifications}
              onResetSample={handleResetSampleNotifications}
              onNavigateTab={(tab) => {
                handleSelectTab(tab);
                setIsNotificationsOpen(false);
              }}
            />
          )}

          {/* Modale Statistiche di Lettura per ciascun libro */}
          <ReadingStatsModal
            isOpen={isStatsModalOpen}
            onClose={() => setIsStatsModalOpen(false)}
            books={books}
            onOpenBook={handleReadBook}
          />
        </>
      )}
        </>
      )}
    </div>
  );
}

export default App;
