const API_BASE = `${import.meta.env.VITE_API_URL || 'https://reachinbox-production-8d17.up.railway.app'}/api`;

console.log('=== UPLOADS API DEBUG ===');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('API_BASE:', API_BASE);
console.log('=== END UPLOADS API DEBUG ===');

export interface UploadedFile {
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

export const uploadsApi = {
  async uploadFile(file: File): Promise<UploadedFile> {
    console.log('=== UPLOAD FILE DEBUG ===');
    console.log('Upload URL:', `${API_BASE}/uploads/upload`);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/uploads/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Upload error:', error);
      throw new Error(error.error || 'Failed to upload file');
    }

    console.log('Upload successful');
    console.log('=== END UPLOAD FILE DEBUG ===');
    return response.json();
  },

  getFileUrl(filename: string): string {
    return `${import.meta.env.VITE_API_URL || 'https://reachinbox-production-8d17.up.railway.app'}/uploads/${filename}`;
  },
};
