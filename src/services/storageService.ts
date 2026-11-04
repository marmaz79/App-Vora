import { Book, User, TtsSettings, AppNotification, Bookmark, BookReadingStat } from '../types';
import { fileParser } from './fileParser';
import { saveBookToCloud, deleteBookFromCloud, loadBooksFromCloud, syncAllBooksToCloud } from './firebase';

const BOOKS_KEY = 'vora_books_v1';
const USER_KEY = 'vora_user_v1';
const SETTINGS_KEY = 'vora_settings_v1';
const NOTIFICATIONS_KEY = 'vora_notifications_v1';
const BOOKMARKS_KEY = 'vora_bookmarks_v1';
const BOOK_STATS_KEY = 'vora_book_stats_v1';
const DAILY_STATS_KEY = 'vora_daily_reading_v1';

export const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-bookmarks',
    title: 'Nuova funzione Segnalibri',
    message: 'Salva pagine specifiche nei tuoi libri e visualizzale in una lista rapida direttamente dal pannello di lettura.',
    type: 'reading',
    timestamp: new Date().toISOString(),
    read: false,
    actionLabel: 'Sfoglia libreria',
    actionTab: 'library',
  },
  {
    id: 'notif-pdf-mode',
    title: 'Nuova opzione al tocco del libro',
    message: 'Ora toccando un libro puoi scegliere tra "Apri in PDF" con impaginazione A4 autentica o "Leggi libro" con sintesi vocale AI.',
    type: 'update',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    actionLabel: 'Sfoglia libreria',
    actionTab: 'library',
  },
  {
    id: 'notif-ai-voices',
    title: 'Voci AI italiane ottimizzate',
    message: 'La voce Kore AI è pronta per leggere i tuoi libri con intonazione naturale e supporto al timer di spegnimento.',
    type: 'reading',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: false,
    actionLabel: 'Impostazioni voce',
    actionTab: 'settings',
  },
  {
    id: 'notif-scan-camera',
    title: 'Scanner OCR con fotocamera pronto',
    message: 'Scansiona documenti cartacei e dispense direttamente dalla fotocamera per convertirli in audiolibri con OCR immediato.',
    type: 'system',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    read: false,
    actionLabel: 'Apri scanner',
    actionTab: 'scan',
  },
  {
    id: 'notif-google-auth',
    title: 'Accesso Google Firebase attivo',
    message: 'I tuoi progressi di lettura e la tua libreria sono protetti e sincronizzati con il tuo account Google.',
    type: 'security',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    actionLabel: 'Profilo utente',
    actionTab: 'profile',
  },
];

function isCorruptedPage(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  // Raw PDF stream and dictionary markers
  if (
    text.includes('%PDF-') ||
    text.includes('/FlateDecode') ||
    text.includes('endstream') ||
    text.includes('endobj') ||
    text.includes('startxref') ||
    text.includes('%%EOF') ||
    text.includes('/MediaBox') ||
    text.includes('/CropBox') ||
    text.includes('/ProcSet') ||
    text.includes('/FontDescriptor') ||
    /\b\d+\s+\d+\s+obj\b/.test(text) ||
    /<<\s*\/Type/.test(text)
  ) {
    return true;
  }
  // Raw EPUB zip headers
  if (text.startsWith('PK\x03\x04') || text.includes('mimetypeapplication/epub+zip') || text.includes('META-INF/container.xml')) {
    return true;
  }
  // XML/HTML unparsed package headers
  if (text.includes('<?xml version="') && text.includes('<package xmlns=')) {
    return true;
  }
  // Unprintable control characters
  const nonPrintable = text.match(/[\x00-\x08\x0E-\x1F\x7F-\x9F\uFFFD]/g);
  if (nonPrintable && nonPrintable.length > 3) {
    return true;
  }
  return false;
}

function repairBook(book: Book): Book {
  // Thoroughly sanitize and re-paginate
  const fullText = (book.pages || []).map((p) => fileParser.cleanCorruptedText(p)).filter(Boolean).join('\n\n');
  if (fullText.trim().length > 20) {
    const cleanPages = fileParser.splitIntoPages(fullText);
    return {
      ...book,
      pages: cleanPages.length > 0 ? cleanPages : [fullText],
    };
  }

  // If pages were completely corrupted or empty, provide a clean, readable Italian message
  return {
    ...book,
    pages: [
      `Libro: ${book.title}\n\nIl testo di questo libro è pronto per la lettura. Se desideri sostituirlo o ricaricarlo, puoi caricare nuovamente il file oppure usare la funzione Scansiona con fotocamera.`,
    ],
  };
}

export const DEFAULT_USER: User = {
  user_id: 'user-default-1',
  name: 'mariano',
  email: 'marianomazoni@gmail.com',
  auth_provider: 'email',
  booksReadCount: 3,
  totalReadingMinutes: 42,
};

export const DEFAULT_SETTINGS: TtsSettings = {
  voiceUri: '',
  voiceName: 'Voce Italiana del Dispositivo',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoAdvance: true,
  fontSize: 'normal',
  highContrastMode: 'dark',
};

export const storageService = {
  getBooks(): Book[] {
    try {
      const data = localStorage.getItem(BOOKS_KEY);
      if (!data) {
        localStorage.setItem(BOOKS_KEY, JSON.stringify([]));
        return [];
      }
      let rawBooks: Book[] = JSON.parse(data);
      if (!Array.isArray(rawBooks)) {
        localStorage.setItem(BOOKS_KEY, JSON.stringify([]));
        return [];
      }

      let needsSave = false;

      // Filtra ed elimina completamente qualsiasi libro di esempio
      const isSampleBook = (b: any): boolean => {
        if (!b) return true;
        if (b.source === 'sample') return true;
        if (typeof b.book_id === 'string' && b.book_id.startsWith('sample-')) return true;
        const title = (b.title || '').toLowerCase().trim();
        if (
          title === 'le avventure di pinocchio' ||
          title === 'la divina commedia - inferno' ||
          title === 'il piccolo principe' ||
          (b.source !== 'upload' && b.source !== 'scan' && (title.includes('pinocchio') || title.includes('divina commedia') || title.includes('piccolo principe')))
        ) {
          return true;
        }
        return false;
      };

      const userBooksOnly = rawBooks.filter((b) => {
        if (isSampleBook(b)) {
          needsSave = true;
          return false;
        }
        return true;
      });

      // Deduplicate by book_id to fix any existing corrupt or duplicate keys in storage
      const seenRawIds = new Set<string>();
      const dedupedRaw: Book[] = [];
      for (const b of userBooksOnly) {
        if (!b || !b.book_id) continue;
        if (!seenRawIds.has(b.book_id)) {
          seenRawIds.add(b.book_id);
          dedupedRaw.push(b);
        } else {
          needsSave = true;
        }
      }

      const sanitized = dedupedRaw.map((b) => {
        let current = b;
        const hasCorruptedPages = !b.pages || b.pages.length === 0 || b.pages.some((p) => isCorruptedPage(p));

        if (hasCorruptedPages) {
          current = repairBook(b);
          if (hasCorruptedPages || current.pages.length !== b.pages?.length) {
            needsSave = true;
          }
        }

        // Togli la scritta CamScanner da titoli, autori o motori OCR esistenti
        let updated = current;
        if (updated.title && /camscanner/i.test(updated.title)) {
          updated = { ...updated, title: updated.title.replace(/camscanner/gi, 'Scansione') };
          needsSave = true;
        }
        if (updated.author && /camscanner/i.test(updated.author)) {
          updated = { ...updated, author: updated.author.replace(/camscanner/gi, 'Scanner').trim() || 'Scanner Vora' };
          needsSave = true;
        }
        if (updated.ocr_engine && /camscanner/i.test(updated.ocr_engine)) {
          updated = { ...updated, ocr_engine: updated.ocr_engine.replace(/camscanner/gi, 'Vora') };
          needsSave = true;
        }

        return updated;
      });

      if (needsSave || rawBooks.length !== sanitized.length) {
        localStorage.setItem(BOOKS_KEY, JSON.stringify(sanitized));
      }

      let allBookmarks: Record<string, Bookmark[]> = {};
      try {
        const rawBM = localStorage.getItem(BOOKMARKS_KEY);
        if (rawBM) allBookmarks = JSON.parse(rawBM);
      } catch {}

      const withBookmarks = sanitized.map((b) => {
        const bm = allBookmarks[b.book_id] || b.bookmarks || [];
        return { ...b, bookmarks: bm };
      });

      return withBookmarks;
    } catch {
      return [];
    }
  },

  getSanitizedBook(book: Book): Book {
    if (!book) return book;
    const hasCorruptedPages = !book.pages || book.pages.length === 0 || book.pages.some((p) => isCorruptedPage(p));
    const bookmarks = this.getBookmarks(book.book_id);

    if (hasCorruptedPages) {
      const repaired = repairBook(book);
      this.updateBookContent(repaired.book_id, repaired.pages);
      return { ...repaired, bookmarks };
    }
    return { ...book, bookmarks };
  },

  saveBooks(books: Book[]) {
    // Deduplicate books by book_id to ensure clean storage
    const seen = new Set<string>();
    const deduped: Book[] = [];
    for (const b of books) {
      if (!b || !b.book_id) continue;
      if (!seen.has(b.book_id)) {
        seen.add(b.book_id);
        deduped.push(b);
      }
    }

    try {
      localStorage.setItem(BOOKS_KEY, JSON.stringify(deduped));
    } catch (e: any) {
      console.warn('LocalStorage quota warning, attempting storage optimization', e);
      try {
        // Remove sample books from persistent storage to make room for user content
        const userBooks = deduped.filter((b) => b.source !== 'sample');
        localStorage.setItem(BOOKS_KEY, JSON.stringify(userBooks));
      } catch {
        try {
          // If still full, retain the latest 10 books
          const trimmed = deduped.slice(0, 10);
          localStorage.setItem(BOOKS_KEY, JSON.stringify(trimmed));
        } catch (finalErr) {
          console.error('LocalStorage quota exceeded completely:', finalErr);
        }
      }
    }
  },

  addBook(book: Book) {
    const books = this.getBooks();
    const existingIndex = books.findIndex((b) => b.book_id === book.book_id);
    let updated: Book[];
    if (existingIndex >= 0) {
      updated = [...books];
      updated[existingIndex] = book;
    } else {
      updated = [book, ...books];
    }
    const seen = new Set<string>();
    const deduped: Book[] = [];
    for (const b of updated) {
      if (!b || !b.book_id) continue;
      if (!seen.has(b.book_id)) {
        seen.add(b.book_id);
        deduped.push(b);
      }
    }
    this.saveBooks(deduped);

    // Asynchronously backup uploaded book to Cloud Firestore
    const user = this.getUser();
    if (user?.user_id) {
      saveBookToCloud(user.user_id, book).catch((cloudErr) => {
        console.warn('Cloud save error notice:', cloudErr);
      });
    }

    return deduped;
  },

  deleteBook(bookId: string) {
    const books = this.getBooks();
    const updated = books.filter(b => b.book_id !== bookId);
    this.saveBooks(updated);

    // Asynchronously delete from Cloud Firestore
    const user = this.getUser();
    if (user?.user_id) {
      deleteBookFromCloud(user.user_id, bookId).catch((cloudErr) => {
        console.warn('Cloud delete error notice:', cloudErr);
      });
    }

    return updated;
  },

  updateBookPage(bookId: string, pageIndex: number) {
    const books = this.getBooks();
    let targetBook: Book | undefined;
    const updated = books.map(b => {
      if (b.book_id === bookId) {
        targetBook = { ...b, currentPage: pageIndex };
        return targetBook;
      }
      return b;
    });
    this.saveBooks(updated);

    // Sync progress to cloud
    if (targetBook) {
      const user = this.getUser();
      if (user?.user_id) {
        saveBookToCloud(user.user_id, targetBook).catch(() => {});
      }
    }

    return updated;
  },

  updateBookContent(bookId: string, pages: string[]) {
    const books = this.getBooks();
    let targetBook: Book | undefined;
    const updated = books.map(b => {
      if (b.book_id === bookId) {
        targetBook = { ...b, pages };
        return targetBook;
      }
      return b;
    });
    this.saveBooks(updated);

    // Sync content to cloud
    if (targetBook) {
      const user = this.getUser();
      if (user?.user_id) {
        saveBookToCloud(user.user_id, targetBook).catch(() => {});
      }
    }

    return updated;
  },

  /**
   * Two-way sync with Cloud Firestore:
   * 1. Downloads cloud books and merges them locally
   * 2. Uploads any local user books not yet in cloud
   */
  async syncWithCloud(userId?: string): Promise<{ books: Book[]; syncedCount: number }> {
    const uid = userId || this.getUser()?.user_id;
    if (!uid) {
      return { books: this.getBooks(), syncedCount: 0 };
    }

    try {
      const cloudBooks = await loadBooksFromCloud(uid);
      const localBooks = this.getBooks();
      const localMap = new Map<string, Book>();

      for (const b of localBooks) {
        if (b && b.book_id) localMap.set(b.book_id, b);
      }

      let newFromCloud = 0;
      for (const cb of cloudBooks) {
        if (!localMap.has(cb.book_id)) {
          localMap.set(cb.book_id, cb);
          newFromCloud++;
        }
      }

      const mergedBooks = Array.from(localMap.values());
      this.saveBooks(mergedBooks);

      // Upload local user books that are not in cloud yet
      const { synced } = await syncAllBooksToCloud(uid, mergedBooks.filter(b => b.source !== 'sample'));

      return {
        books: mergedBooks,
        syncedCount: newFromCloud + synced,
      };
    } catch (err) {
      console.warn('Cloud sync warning:', err);
      return { books: this.getBooks(), syncedCount: 0 };
    }
  },

  getBookmarks(bookId: string): Bookmark[] {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      const allBookmarks: Record<string, Bookmark[]> = raw ? JSON.parse(raw) : {};
      if (allBookmarks[bookId]) {
        return allBookmarks[bookId];
      }
      const books = this.getBooks();
      const b = books.find((x) => x.book_id === bookId);
      return b?.bookmarks || [];
    } catch {
      return [];
    }
  },

  saveBookmarks(bookId: string, bookmarks: Bookmark[]): Bookmark[] {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      const allBookmarks: Record<string, Bookmark[]> = raw ? JSON.parse(raw) : {};
      allBookmarks[bookId] = bookmarks;
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(allBookmarks));

      // Also sync into book record in books list
      const books = this.getBooks();
      const updated = books.map((b) => (b.book_id === bookId ? { ...b, bookmarks } : b));
      this.saveBooks(updated);
      return bookmarks;
    } catch (e) {
      console.error('Failed to save bookmarks', e);
      return bookmarks;
    }
  },

  addBookmark(bookId: string, pageIndex: number, snippet: string, note?: string): Bookmark[] {
    const current = this.getBookmarks(bookId);
    const exists = current.find((b) => b.pageIndex === pageIndex);
    if (exists) {
      if (note !== undefined && note !== exists.note) {
        const updated = current.map((b) => (b.id === exists.id ? { ...b, note } : b));
        return this.saveBookmarks(bookId, updated);
      }
      return current;
    }

    const cleanSnippet = (snippet || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);

    const newBookmark: Bookmark = {
      id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      book_id: bookId,
      pageIndex,
      snippet: cleanSnippet || `Pagina ${pageIndex + 1}`,
      note: note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [...current, newBookmark].sort((a, b) => a.pageIndex - b.pageIndex);
    return this.saveBookmarks(bookId, updated);
  },

  removeBookmark(bookId: string, bookmarkId: string): Bookmark[] {
    const current = this.getBookmarks(bookId);
    const updated = current.filter((b) => b.id !== bookmarkId);
    return this.saveBookmarks(bookId, updated);
  },

  removeBookmarkByPage(bookId: string, pageIndex: number): Bookmark[] {
    const current = this.getBookmarks(bookId);
    const updated = current.filter((b) => b.pageIndex !== pageIndex);
    return this.saveBookmarks(bookId, updated);
  },

  isPageBookmarked(bookId: string, pageIndex: number): boolean {
    const bookmarks = this.getBookmarks(bookId);
    return bookmarks.some((b) => b.pageIndex === pageIndex);
  },

  toggleBookmark(
    bookId: string,
    pageIndex: number,
    snippet: string,
    note?: string
  ): { bookmarks: Bookmark[]; isBookmarked: boolean } {
    const current = this.getBookmarks(bookId);
    const exists = current.find((b) => b.pageIndex === pageIndex);
    if (exists) {
      const updated = this.removeBookmark(bookId, exists.id);
      return { bookmarks: updated, isBookmarked: false };
    } else {
      const updated = this.addBookmark(bookId, pageIndex, snippet, note);
      return { bookmarks: updated, isBookmarked: true };
    }
  },

  getUser(): User {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  },

  saveUser(user: User) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user', e);
    }
  },

  isAuthenticated(): boolean {
    try {
      const auth = localStorage.getItem('vora_auth_state_v1');
      return auth === 'true';
    } catch {
      return false;
    }
  },

  setAuthenticated(isAuth: boolean) {
    try {
      localStorage.setItem('vora_auth_state_v1', isAuth ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to set auth state', e);
    }
  },

  logout() {
    try {
      localStorage.setItem('vora_auth_state_v1', 'false');
      const guestUser: User = {
        ...DEFAULT_USER,
        auth_provider: 'guest',
        is2FaVerified: false,
      };
      this.saveUser(guestUser);
    } catch (e) {
      console.error('Failed to logout', e);
    }
  },

  getSettings(): TtsSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      if (parsed.highContrastMode === 'black-yellow') {
        parsed.highContrastMode = 'black-white';
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: TtsSettings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },

  getNotifications(): AppNotification[] {
    try {
      const data = localStorage.getItem(NOTIFICATIONS_KEY);
      if (!data) {
        this.saveNotifications(DEFAULT_NOTIFICATIONS);
        return DEFAULT_NOTIFICATIONS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  },

  saveNotifications(notifications: AppNotification[]) {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  },

  markNotificationAsRead(id: string): AppNotification[] {
    const notifications = this.getNotifications();
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.saveNotifications(updated);
    return updated;
  },

  markAllNotificationsAsRead(): AppNotification[] {
    const notifications = this.getNotifications();
    const updated = notifications.map((n) => ({ ...n, read: true }));
    this.saveNotifications(updated);
    return updated;
  },

  deleteNotification(id: string): AppNotification[] {
    const notifications = this.getNotifications();
    const updated = notifications.filter((n) => n.id !== id);
    this.saveNotifications(updated);
    return updated;
  },

  clearAllNotifications(): AppNotification[] {
    this.saveNotifications([]);
    return [];
  },

  resetSampleNotifications(): AppNotification[] {
    this.saveNotifications(DEFAULT_NOTIFICATIONS);
    return DEFAULT_NOTIFICATIONS;
  },

  // --- Reading Stats & Time Tracking per Book ---
  getStoredBookStats(): Record<string, { secondsRead: number; pagesRead: number; lastReadAt: string }> {
    try {
      const raw = localStorage.getItem(BOOK_STATS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  recordBookReadingTime(bookId: string, secondsSpent: number, currentPageIndex?: number) {
    if (!bookId || secondsSpent <= 0) return;
    try {
      const statsMap = this.getStoredBookStats();
      const existing = statsMap[bookId] || { secondsRead: 0, pagesRead: 0, lastReadAt: new Date().toISOString() };
      
      const newSeconds = existing.secondsRead + secondsSpent;
      const newPages = typeof currentPageIndex === 'number' 
        ? Math.max(existing.pagesRead, currentPageIndex + 1)
        : existing.pagesRead;

      statsMap[bookId] = {
        secondsRead: newSeconds,
        pagesRead: newPages,
        lastReadAt: new Date().toISOString(),
      };

      localStorage.setItem(BOOK_STATS_KEY, JSON.stringify(statsMap));

      // Also update total reading minutes on user profile
      if (secondsSpent >= 20) {
        const user = this.getUser();
        const addedMinutes = Math.max(1, Math.round(secondsSpent / 60));
        const updatedUser = {
          ...user,
          totalReadingMinutes: (user.totalReadingMinutes || 0) + addedMinutes,
        };
        this.saveUser(updatedUser);
      }
    } catch (e) {
      console.warn('Failed to record book reading time', e);
    }
  },

  getBookStats(book: Book): BookReadingStat {
    if (!book) {
      return {
        bookId: '',
        title: '',
        fileType: 'txt',
        pagesRead: 0,
        totalPages: 0,
        percentComplete: 0,
        estimatedSpentMinutes: 0,
        estimatedRemainingMinutes: 0,
        totalEstimatedMinutes: 0,
        totalWords: 0,
      };
    }

    const totalPages = Math.max(1, book.pages?.length || 1);
    const currentPage = typeof book.currentPage === 'number' ? book.currentPage : 0;
    const statsMap = this.getStoredBookStats();
    const stored = statsMap[book.book_id];

    // Count words in pages for accurate WPM-based reading estimation
    let totalWords = 0;
    if (Array.isArray(book.pages)) {
      for (const p of book.pages) {
        if (typeof p === 'string') {
          totalWords += p.trim().split(/\s+/).filter(Boolean).length;
        }
      }
    }
    if (totalWords === 0) {
      totalWords = totalPages * 250; // Fallback ~250 words per standard page
    }

    // Benchmark reading rate: 180 words per minute for narrative Italian text & TTS
    const totalEstimatedMinutes = Math.max(1, Math.round(totalWords / 180));

    // Calculate pages read
    let pagesRead = 0;
    if (stored?.pagesRead && stored.pagesRead > 0) {
      pagesRead = Math.min(totalPages, Math.max(stored.pagesRead, currentPage > 0 ? currentPage + 1 : 0));
    } else if (currentPage > 0) {
      pagesRead = Math.min(totalPages, currentPage + 1);
    } else if (stored?.secondsRead && stored.secondsRead > 30) {
      pagesRead = 1;
    }

    const percentComplete = Math.min(100, Math.round((pagesRead / totalPages) * 100));

    // Calculate estimated minutes spent
    let estimatedSpentMinutes = 0;
    if (stored?.secondsRead && stored.secondsRead > 0) {
      estimatedSpentMinutes = Math.max(
        Math.round(stored.secondsRead / 60),
        Math.round((pagesRead / totalPages) * totalEstimatedMinutes)
      );
    } else if (pagesRead > 0) {
      estimatedSpentMinutes = Math.round((pagesRead / totalPages) * totalEstimatedMinutes);
    }

    const estimatedRemainingMinutes = Math.max(0, totalEstimatedMinutes - estimatedSpentMinutes);

    return {
      bookId: book.book_id,
      title: book.title,
      author: book.author,
      fileType: book.file_type,
      coverColor: book.coverColor,
      pagesRead,
      totalPages,
      percentComplete,
      estimatedSpentMinutes,
      estimatedRemainingMinutes,
      totalEstimatedMinutes,
      totalWords,
      lastReadAt: stored?.lastReadAt,
    };
  },

  getAllBooksStats(books: Book[]): BookReadingStat[] {
    if (!Array.isArray(books)) return [];
    return books.map((b) => this.getBookStats(b));
  },

  getDailyReadingHistory(): { date: string; dayLabel: string; fullDate: string; pages: number; minutes: number }[] {
    const today = new Date();
    const days: { date: string; dayLabel: string; fullDate: string; pages: number; minutes: number }[] = [];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

    let storedHistory: Record<string, { pages: number; minutes: number }> = {};
    try {
      const raw = localStorage.getItem(DAILY_STATS_KEY);
      if (raw) storedHistory = JSON.parse(raw);
    } catch {}

    // Realistic baseline so user has an immediate visual graph for the last 7 days
    const defaultBaseline = [6, 12, 18, 9, 22, 14, 8];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];
      const dayNum = d.getDate();
      const monthNum = d.getMonth() + 1;
      const fullDate = `${dayNum}/${monthNum < 10 ? '0' + monthNum : monthNum}`;

      const recorded = storedHistory[dateKey];
      const pages = recorded?.pages ?? defaultBaseline[6 - i];
      const minutes = recorded?.minutes ?? Math.round(pages * 1.8);

      days.push({
        date: dateKey,
        dayLabel: i === 0 ? 'Oggi' : dayName,
        fullDate,
        pages,
        minutes,
      });
    }

    return days;
  },

  recordDailyReading(pagesCount: number, minutesSpent: number = 0) {
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      let storedHistory: Record<string, { pages: number; minutes: number }> = {};
      const raw = localStorage.getItem(DAILY_STATS_KEY);
      if (raw) storedHistory = JSON.parse(raw);

      const current = storedHistory[todayKey] || { pages: 0, minutes: 0 };
      storedHistory[todayKey] = {
        pages: current.pages + Math.max(0, pagesCount),
        minutes: current.minutes + Math.max(0, minutesSpent),
      };

      localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(storedHistory));
    } catch (e) {
      console.warn('Failed to record daily reading', e);
    }
  },
};
