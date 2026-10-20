export interface Bookmark {
  id: string;
  book_id: string;
  pageIndex: number;
  snippet: string;
  note?: string;
  createdAt: string;
}

export interface Book {
  book_id: string;
  owner_id: string;
  title: string;
  author?: string;
  file_type: 'pdf' | 'epub' | 'txt' | 'scan';
  storage_path?: string;
  size: number;
  pages: string[];
  currentPage?: number;
  source?: 'upload' | 'scan' | 'sample';
  ocr_engine?: string;
  created_at: string;
  coverColor?: string;
  imageUrls?: string[];
  bookmarks?: Bookmark[];
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  auth_provider: 'google' | 'email' | 'guest';
  booksReadCount: number;
  totalReadingMinutes: number;
  is2FaVerified?: boolean;
  googleAuthenticatorKey?: string;
  lastLogin?: string;
}

export type ContrastThemeMode = 'black-yellow' | 'cream-black' | 'dark' | 'white' | 'sepia' | 'black-white' | 'paperwhite';

export interface TtsSettings {
  voiceUri: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  autoAdvance: boolean;
  fontSize: 'normal' | 'large' | 'huge';
  highContrastMode: ContrastThemeMode;
}

export interface ScanSessionData {
  bookId: string;
  title: string;
  pages: string[];
  imageUrls: (string | null)[];
  rawPages: string[];
  engine: string;
  confidence: number;
  isAiOptimized: boolean;
  currentPageIndex: number;
}

export type NotificationType = 'system' | 'reading' | 'update' | 'security';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  actionTab?: 'home' | 'library' | 'scan' | 'settings' | 'profile';
  actionUrl?: string;
}

