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
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  auth_provider: 'email' | 'guest';
  booksReadCount: number;
  totalReadingMinutes: number;
}

export interface TtsSettings {
  voiceUri: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  autoAdvance: boolean;
  fontSize: 'normal' | 'large' | 'huge';
  highContrastMode: 'black-yellow' | 'black-white' | 'cream-black';
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
