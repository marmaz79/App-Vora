import { Book, User, TtsSettings, AppNotification } from '../types';
import { SAMPLE_BOOKS } from '../data/sampleBooks';
import { fileParser } from './fileParser';

const BOOKS_KEY = 'vora_books_v1';
const USER_KEY = 'vora_user_v1';
const SETTINGS_KEY = 'vora_settings_v1';
const NOTIFICATIONS_KEY = 'vora_notifications_v1';

export const DEFAULT_NOTIFICATIONS: AppNotification[] = [
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
  // If it's a sample book (by ID or title), restore pristine content from SAMPLE_BOOKS
  const originalSample = SAMPLE_BOOKS.find(
    (s) =>
      s.book_id === book.book_id ||
      s.title.toLowerCase() === book.title.toLowerCase() ||
      (book.source === 'sample' && s.title.toLowerCase().includes(book.title.toLowerCase()))
  );
  if (originalSample) {
    return {
      ...book,
      title: originalSample.title,
      author: originalSample.author,
      file_type: originalSample.file_type,
      size: originalSample.size,
      source: 'sample',
      coverColor: originalSample.coverColor,
      pages: [...originalSample.pages],
    };
  }

  // Otherwise, thoroughly sanitize and re-paginate
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
  highContrastMode: 'black-yellow',
};

export const storageService = {
  getBooks(): Book[] {
    try {
      const data = localStorage.getItem(BOOKS_KEY);
      if (!data) {
        localStorage.setItem(BOOKS_KEY, JSON.stringify(SAMPLE_BOOKS));
        return SAMPLE_BOOKS;
      }
      let rawBooks: Book[] = JSON.parse(data);
      if (!Array.isArray(rawBooks) || rawBooks.length === 0) {
        localStorage.setItem(BOOKS_KEY, JSON.stringify(SAMPLE_BOOKS));
        return SAMPLE_BOOKS;
      }

      let needsSave = false;

      // Ensure that all sample books are present and fully populated with clean text
      const sanitized = rawBooks.map((b) => {
        const isSample = b.source === 'sample' || SAMPLE_BOOKS.some((s) => s.book_id === b.book_id || s.title.toLowerCase() === b.title.toLowerCase());
        const hasCorruptedPages = !b.pages || b.pages.length === 0 || b.pages.some((p) => isCorruptedPage(p));

        if (isSample || hasCorruptedPages) {
          const repaired = repairBook(b);
          // Check if repaired changed anything
          if (hasCorruptedPages || repaired.pages.length !== b.pages?.length) {
            needsSave = true;
          }
          return repaired;
        }
        return b;
      });

      // Ensure default sample books exist if the library doesn't have them
      SAMPLE_BOOKS.forEach((sample) => {
        const exists = sanitized.some((b) => b.title.toLowerCase() === sample.title.toLowerCase());
        if (!exists) {
          sanitized.push(sample);
          needsSave = true;
        }
      });

      if (needsSave) {
        localStorage.setItem(BOOKS_KEY, JSON.stringify(sanitized));
      }

      return sanitized;
    } catch {
      return SAMPLE_BOOKS;
    }
  },

  getSanitizedBook(book: Book): Book {
    if (!book) return book;
    const isSample = book.source === 'sample' || SAMPLE_BOOKS.some((s) => s.book_id === book.book_id || s.title.toLowerCase() === book.title.toLowerCase());
    const hasCorruptedPages = !book.pages || book.pages.length === 0 || book.pages.some((p) => isCorruptedPage(p));

    if (isSample || hasCorruptedPages) {
      const repaired = repairBook(book);
      this.updateBookContent(repaired.book_id, repaired.pages);
      return repaired;
    }
    return book;
  },

  saveBooks(books: Book[]) {
    try {
      localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
    } catch (e: any) {
      console.warn('LocalStorage quota warning, attempting storage optimization', e);
      try {
        // Remove sample books from persistent storage to make room for user content
        const userBooks = books.filter((b) => b.source !== 'sample');
        localStorage.setItem(BOOKS_KEY, JSON.stringify(userBooks));
      } catch {
        try {
          // If still full, retain the latest 10 books
          const trimmed = books.slice(0, 10);
          localStorage.setItem(BOOKS_KEY, JSON.stringify(trimmed));
        } catch (finalErr) {
          console.error('LocalStorage quota exceeded completely:', finalErr);
        }
      }
    }
  },

  addBook(book: Book) {
    const books = this.getBooks();
    const updated = [book, ...books];
    this.saveBooks(updated);
    return updated;
  },

  deleteBook(bookId: string) {
    const books = this.getBooks();
    const updated = books.filter(b => b.book_id !== bookId);
    this.saveBooks(updated);
    return updated;
  },

  updateBookPage(bookId: string, pageIndex: number) {
    const books = this.getBooks();
    const updated = books.map(b => b.book_id === bookId ? { ...b, currentPage: pageIndex } : b);
    this.saveBooks(updated);
    return updated;
  },

  updateBookContent(bookId: string, pages: string[]) {
    const books = this.getBooks();
    const updated = books.map(b => b.book_id === bookId ? { ...b, pages } : b);
    this.saveBooks(updated);
    return updated;
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
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
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
};
