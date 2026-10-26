import {
  requestGoogleDriveAccess,
  getGoogleDriveAccessToken,
  clearGoogleDriveAccessToken,
} from './firebase';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  thumbnailLink?: string;
  shortcutDetails?: {
    targetId?: string;
    targetMimeType?: string;
  };
}

export interface ListDriveFilesOptions {
  searchTerm?: string;
  folderId?: string;
  pageToken?: string;
  forceRefresh?: boolean;
}

export const googleDriveService = {
  /**
   * Ensure user is authenticated with Google and has valid Drive access token
   */
  async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      const existing = getGoogleDriveAccessToken();
      if (existing) return existing;
    }
    return await requestGoogleDriveAccess(forceRefresh);
  },

  /**
   * List files and folders from Google Drive
   */
  async listFiles(options: ListDriveFilesOptions = {}): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
    const token = await this.getAccessToken(options.forceRefresh);

    // Query for supported book and document files: PDF, EPUB, TXT, Google Docs/Sheets/Slides, Images (OCR), Audio, and Folders
    const mimeQuery = [
      "mimeType = 'application/pdf'",
      "mimeType = 'application/epub+zip'",
      "mimeType = 'text/plain'",
      "mimeType = 'application/vnd.google-apps.document'",
      "mimeType = 'application/vnd.google-apps.presentation'",
      "mimeType = 'application/vnd.google-apps.spreadsheet'",
      "mimeType = 'application/vnd.google-apps.folder'",
      "mimeType = 'application/vnd.google-apps.shortcut'",
      "mimeType contains 'image/'",
      "mimeType contains 'audio/'",
    ].join(' or ');

    let query = `trashed = false and (${mimeQuery})`;

    if (options.folderId && !options.searchTerm) {
      query += ` and '${options.folderId}' in parents`;
    }

    if (options.searchTerm && options.searchTerm.trim()) {
      const sanitized = options.searchTerm.replace(/'/g, "\\'");
      query += ` and name contains '${sanitized}'`;
    }

    const params = new URLSearchParams({
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink, shortcutDetails)',
      pageSize: '40',
      orderBy: 'folder, modifiedTime desc',
    });

    if (options.pageToken) {
      params.append('pageToken', options.pageToken);
    }

    let response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Auto-refresh token once if 401 occurs
    if (response.status === 401 && !options.forceRefresh) {
      clearGoogleDriveAccessToken();
      const freshToken = await this.getAccessToken(true);
      response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${freshToken}`,
        },
      });
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) {
        clearGoogleDriveAccessToken();
        const detail = errJson?.error?.message || `Codice ${response.status}`;
        throw new Error(`Permessi Google Drive necessari (${detail}). Premi "Autorizza Google Drive" per consentire l'accesso.`);
      }
      throw new Error(errJson?.error?.message || `Errore caricamento file Google Drive (${response.status})`);
    }

    const data = await response.json();
    return {
      files: data.files || [],
      nextPageToken: data.nextPageToken,
    };
  },

  /**
   * Download a file from Google Drive and return standard Web File object
   */
  async downloadFile(file: DriveFile, onProgress?: (msg: string) => void): Promise<File> {
    let token = await this.getAccessToken();

    // Resolve shortcut if applicable
    const effectiveId = file.shortcutDetails?.targetId || file.id;
    const effectiveMimeType = file.shortcutDetails?.targetMimeType || file.mimeType;

    if (onProgress) {
      onProgress(`Scaricamento di "${file.name}" da Google Drive...`);
    }

    // Handle Google Docs, Presentations, Spreadsheets by exporting directly to PDF
    if (effectiveMimeType.startsWith('application/vnd.google-apps.')) {
      const exportUrl = `https://www.googleapis.com/drive/v3/files/${effectiveId}/export?mimeType=application/pdf`;
      let response = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        clearGoogleDriveAccessToken();
        token = await this.getAccessToken(true);
        response = await fetch(exportUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          clearGoogleDriveAccessToken();
        }
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error?.message || `Impossibile esportare il file Google Drive (${response.status})`);
      }

      const blob = await response.blob();
      const filename = file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`;
      return new File([blob], filename, { type: 'application/pdf' });
    }

    // Handle binary and text files (PDF, EPUB, TXT, Images)
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${effectiveId}?alt=media`;
    let response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      clearGoogleDriveAccessToken();
      token = await this.getAccessToken(true);
      response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearGoogleDriveAccessToken();
      }
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error?.message || `Impossibile scaricare il file da Google Drive (${response.status})`);
    }

    const blob = await response.blob();
    return new File([blob], file.name, { type: effectiveMimeType || blob.type });
  },
};
