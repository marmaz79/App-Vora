import { Book, User, TtsSettings } from '../types';
import { SAMPLE_BOOKS } from '../data/sampleBooks';

const BOOKS_KEY = 'vora_books_v1';
const USER_KEY = 'vora_user_v1';
const SETTINGS_KEY = 'vora_settings_v1';

export const DEFAULT_USER: User = {
  user_id: 'user-default-1',
  name: 'Lettore Vora',
  email: 'marianomazoni@gmail.com',
  auth_provider: 'email',
  booksReadCount: 3,
  totalReadingMinutes: 42,
};

export const DEFAULT_SETTINGS: TtsSettings = {
  voiceUri: '',
  voiceName: 'Predefinita (Italiano)',
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
      return JSON.parse(data);
    } catch {
      return SAMPLE_BOOKS;
    }
  },

  saveBooks(books: Book[]) {
    try {
      localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
    } catch (e) {
      console.error('Failed to save books to localStorage', e);
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
};
