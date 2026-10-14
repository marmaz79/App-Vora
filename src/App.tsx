import React, { useState, useEffect, useCallback } from 'react';

import { Book, User, TtsSettings, ScanSessionData, AppNotification } from './types';
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
import { signOutFirebase, subscribeToAuthState } from './services/firebase';

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showLogin, setShowLogin] = useState(!storageService.isAuthenticated());
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [books, setBooks] = useState<Book[]>([]);
  const [user, setUser] = useState<User>(storageService.getUser());
  const [settings, setSettings] = useState<TtsSettings>(storageService.getSettings());
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
      }
    });
    return () => unsubscribe();
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
    storageService.logout();
    setUser(storageService.getUser());
    setShowLogin(true);
    setCurrentTab('home');
    showToast('Disconnessione effettuata. Accedi con Google.');
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

  // Opzione 2: Apri nel visualizzatore documento PDF
  const handleOpenInPdf = useCallback((book: Book) => {
    setBookForOptions(null);
    const cleanBook = storageService.getSanitizedBook(book);
    setLoadingBook(cleanBook);
    setTimeout(() => {
      setActiveBook(null);
      setActivePdfBook(cleanBook);
      setLoadingBook(null);
    }, 450);
  }, []);

  const handleCloseReader = useCallback(() => {
    setActiveBook(null);
    setActivePdfBook(null);
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
    <div className="min-h-screen bg-[#0A0B10] text-gray-100 flex flex-col font-sans">
      {/* Splash Screen with Logo and Title */}
      {showSplash && (
        <SplashScreen onDismiss={() => setShowSplash(false)} />
      )}

      {/* Login Screen con Firebase Google Auth - Mostrato dopo lo splash screen se non autenticato */}
      {!showSplash && showLogin && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onSkip={handleSkipLogin}
          initialEmail={user.email}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#161824] text-white font-bold px-6 py-3 rounded-2xl shadow-2xl border border-[#2B3042] text-sm animate-bounce"
        >
          {toastMessage}
        </div>
      )}

      {/* Loading overlay when opening a book: mostra solo caricamento... con loading bianco */}
      {loadingBook && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Caricamento..."
          className="fixed inset-0 z-50 bg-[#0A0B10]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in"
        >
          <div className="relative flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          </div>
          <p className="text-base font-bold text-white tracking-wide">
            Caricamento...
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
              unreadNotificationsCount={notifications.filter((n) => !n.read).length}
            />
          )}

          {/* Main content body */}
          <main className="flex-1 max-w-2xl w-full mx-auto px-3.5 pt-2 pb-24">
            {currentTab === 'home' && (
              <HomeTab
                books={books}
                searchQuery={searchQuery}
                onOpenBook={handleOpenBook}
                onOpenPdf={handleOpenInPdf}
                onOpenReader={handleReadBook}
                onDeleteBook={handleDeleteBook}
                onAddBook={handleAddBook}
                onScanResultsReady={(session) => setScanSession(session)}
                hideFab={showSplash}
                onOpenScan={() => handleSelectTab('scan')}
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
              />
            )}
          </main>

          {/* Bottom Navigation con scan.ocr al posto del profilo */}
          <Navbar currentTab={currentTab} onSelectTab={handleSelectTab} />

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
        </>
      )}
    </div>
  );
}

export default App;
