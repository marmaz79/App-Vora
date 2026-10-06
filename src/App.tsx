import React, { useState, useEffect, useCallback } from 'react';
import { Book, User, TtsSettings } from './types';
import { storageService, DEFAULT_SETTINGS } from './services/storageService';
import { SAMPLE_BOOKS } from './data/sampleBooks';
import { Navbar, TabType } from './components/Navbar';
import { Header } from './components/Header';
import { HomeTab } from './components/HomeTab';
import { LibraryTab } from './components/LibraryTab';
import { SettingsTab } from './components/SettingsTab';
import { ProfileTab } from './components/ProfileTab';
import { ReaderView } from './components/ReaderView';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [books, setBooks] = useState<Book[]>([]);
  const [user, setUser] = useState<User>(storageService.getUser());
  const [settings, setSettings] = useState<TtsSettings>(storageService.getSettings());
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadedBooks = storageService.getBooks();
    setBooks(loadedBooks);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleOpenBook = useCallback((book: Book) => {
    setActiveBook(book);
  }, []);

  const handleCloseReader = useCallback(() => {
    setActiveBook(null);
    setBooks(storageService.getBooks());
  }, []);

  const handleAddBook = useCallback((book: Book) => {
    const updated = storageService.addBook(book);
    setBooks(updated);
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
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#FFD600] text-black font-black px-6 py-3 rounded-2xl shadow-2xl border-2 border-white text-sm animate-bounce"
        >
          {toastMessage}
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
        />
      ) : (
        <>
          {/* Header */}
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            title={
              currentTab === 'home'
                ? 'Vora'
                : currentTab === 'library'
                ? 'Libreria'
                : currentTab === 'settings'
                ? 'Impostazioni'
                : 'Profilo'
            }
          />

          {/* Main content body */}
          <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-32">
            {currentTab === 'home' && (
              <HomeTab
                books={books}
                searchQuery={searchQuery}
                onOpenBook={handleOpenBook}
                onDeleteBook={handleDeleteBook}
                onAddBook={handleAddBook}
              />
            )}

            {currentTab === 'library' && (
              <LibraryTab
                books={books}
                searchQuery={searchQuery}
                onOpenBook={handleOpenBook}
                onDeleteBook={handleDeleteBook}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsTab
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {currentTab === 'profile' && (
              <ProfileTab
                user={user}
                books={books}
                onUpdateUser={handleUpdateUser}
                onResetSampleBooks={handleResetSampleBooks}
              />
            )}
          </main>

          {/* Bottom Navigation */}
          <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />
        </>
      )}
    </div>
  );
}

export default App;
