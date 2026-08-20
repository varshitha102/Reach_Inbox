const API_BASE = 'http://localhost:3001/api';

export interface UploadedFile {
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

export const uploadsApi = {
  async uploadFile(file: File): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/uploads/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    return response.json();
  },

  getFileUrl(filename: string): string {
    return `http://localhost:3001/uploads/${filename}`;
  },
};
