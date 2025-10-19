import { api } from './api';

export interface Certification {
  id: string;
  trainer_id: string;
  category: string;
  certification_name: string;
  certification_issuer: string;
  certification_level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  issued_date: string;
  expiration_date?: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'SUSPENDED';
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  certificate_file_url?: string;
  certificate_file_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCertificationData {
  category: string;
  certification_name: string;
  certification_issuer: string;
  certification_level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  issued_date: string;
  expiration_date?: string;
  certificate_file_url?: string;
}

export interface UploadResult {
  url: string;
  publicUrl?: string;
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
  bucket: string;
}

export interface PresignedUrlResult {
  presignedUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export interface AIScanResult {
  hasRedSeal: boolean;
  isGym147Seal?: boolean;
  confidence: number;
  similarityScore?: number;
  description?: string;
  sealLocation?: string;
  sealType?: string;
  source?: string;
  imageUrl?: string;
  officialSealUrl?: string;
  timestamp?: string;
  redPixelCount?: number;
  totalPixels?: number;
  redPixelPercentage?: number;
  sealAnalysis?: {
    isSealLike: boolean;
    compactness: number;
    centerX: number;
    centerY: number;
    radius: number;
  };
  imageDimensions?: {
    width: number;
    height: number;
  };
  error?: string;
}

export interface AvailableCategory {
  category: string;
  level: string;
}

class CertificationService {
  private baseUrl = 'http://localhost:3003';

  /**
   * Get all certifications for a trainer
   */
  async getTrainerCertifications(userId: string): Promise<Certification[]> {
    try {
      // First get trainer_id from user_id
      const trainerResponse = await api.get(`${this.baseUrl}/trainers/user/${userId}`);
      const trainerId = trainerResponse.data.data.trainer.id;

      // Then get certifications using trainer_id
      const response = await api.get(`${this.baseUrl}/trainers/${trainerId}/certifications`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching trainer certifications:', error);
      throw error;
    }
  }

  /**
   * Create a new certification
   */
  async createCertification(
    trainerId: string,
    data: CreateCertificationData
  ): Promise<Certification> {
    try {
      const response = await api.post(`${this.baseUrl}/trainers/${trainerId}/certifications`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating certification:', error);
      throw error;
    }
  }

  /**
   * Update certification
   */
  async updateCertification(
    certId: string,
    data: Partial<CreateCertificationData>
  ): Promise<Certification> {
    try {
      const response = await api.put(`${this.baseUrl}/certifications/${certId}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating certification:', error);
      throw error;
    }
  }

  /**
   * Delete certification
   */
  async deleteCertification(certId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/certifications/${certId}`);
    } catch (error) {
      console.error('Error deleting certification:', error);
      throw error;
    }
  }

  /**
   * Upload certificate file to S3
   */
  async uploadCertificateFile(trainerId: string, file: File): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append('certificate_file', file);

      const response = await api.post(
        `${this.baseUrl}/trainers/${trainerId}/upload-certificate`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error uploading certificate file:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for direct upload
   */
  async generatePresignedUrl(
    trainerId: string,
    fileName: string,
    mimeType: string
  ): Promise<PresignedUrlResult> {
    try {
      const response = await api.post(`${this.baseUrl}/trainers/${trainerId}/presigned-url`, {
        fileName,
        mimeType,
      });

      return response.data.data;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw error;
    }
  }

  /**
   * Upload file directly to S3 using presigned URL
   */
  async uploadToS3WithPresignedUrl(presignedUrl: string, file: File): Promise<void> {
    try {
      await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  }

  /**
   * Scan certificate with AI
   */
  async scanCertificateWithAI(imageUrl: string): Promise<AIScanResult> {
    try {
      const response = await api.post(
        `${this.baseUrl}/scan-certificate`,
        { imageUrl },
        { timeout: 30000 }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error scanning certificate with AI:', error);
      throw error;
    }
  }

  /**
   * Get available categories for trainer
   */
  async getAvailableCategories(userId: string): Promise<AvailableCategory[]> {
    try {
      // First get trainer_id from user_id
      const trainerResponse = await api.get(`${this.baseUrl}/trainers/user/${userId}`);
      const trainerId = trainerResponse.data.data.trainer.id;

      // Then get available categories using trainer_id
      const response = await api.get(`${this.baseUrl}/trainers/${trainerId}/available-categories`);
      return response.data.data.categories;
    } catch (error) {
      console.error('Error fetching available categories:', error);
      throw error;
    }
  }

  /**
   * Check if trainer can access a specific category
   */
  async checkCategoryAccess(
    trainerId: string,
    category: string
  ): Promise<{ hasAccess: boolean; certification?: any }> {
    try {
      const response = await api.get(
        `${this.baseUrl}/trainers/${trainerId}/categories/${category}/access`
      );
      return response.data.data;
    } catch (error) {
      console.error('Error checking category access:', error);
      throw error;
    }
  }

  /**
   * Upload file to S3 only (without AI scan)
   */
  async uploadFileOnly(trainerId: string, file: File): Promise<UploadResult> {
    try {
      // Step 1: Generate presigned URL
      const presignedUrlData = await this.generatePresignedUrl(trainerId, file.name, file.type);

      // Step 2: Upload file to S3
      await this.uploadToS3WithPresignedUrl(presignedUrlData.presignedUrl, file);

      const uploadResult: UploadResult = {
        url: presignedUrlData.publicUrl,
        publicUrl: presignedUrlData.publicUrl,
        key: presignedUrlData.key,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        bucket: 'gym147-certifications', // This should come from the response
      };

      return uploadResult;
    } catch (error) {
      console.error('Error in upload file only:', error);
      throw error;
    }
  }

  /**
   * Complete upload flow: generate presigned URL, upload to S3, scan with AI
   */
  async completeUploadFlow(
    trainerId: string,
    file: File
  ): Promise<{
    uploadResult: UploadResult;
    scanResult: AIScanResult;
  }> {
    try {
      // Step 1: Generate presigned URL
      const presignedUrlData = await this.generatePresignedUrl(trainerId, file.name, file.type);

      // Step 2: Upload file to S3
      await this.uploadToS3WithPresignedUrl(presignedUrlData.presignedUrl, file);

      // Step 3: Scan with AI
      const scanResult = await this.scanCertificateWithAI(presignedUrlData.publicUrl);

      const uploadResult: UploadResult = {
        url: presignedUrlData.publicUrl,
        publicUrl: presignedUrlData.publicUrl,
        key: presignedUrlData.key,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        bucket: 'gym147-certifications', // This should come from the response
      };

      return {
        uploadResult,
        scanResult,
      };
    } catch (error) {
      console.error('Error in complete upload flow:', error);
      throw error;
    }
  }

  // Helper methods for UI
  formatVerificationStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      VERIFIED: 'Đã xác thực',
      PENDING: 'Chờ xác thực',
      REJECTED: 'Bị từ chối',
      EXPIRED: 'Hết hạn',
      SUSPENDED: 'Tạm dừng',
    };
    return statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      VERIFIED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      EXPIRED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      SUSPENDED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  formatCertificationLevel(level: string): string {
    const levelMap: { [key: string]: string } = {
      BASIC: 'Cơ bản',
      INTERMEDIATE: 'Trung cấp',
      ADVANCED: 'Nâng cao',
      EXPERT: 'Chuyên gia',
    };
    return levelMap[level] || level;
  }

  getLevelColor(level: string): string {
    const colorMap: { [key: string]: string } = {
      BASIC: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      INTERMEDIATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      ADVANCED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      EXPERT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colorMap[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  isExpired(expirationDate: string): boolean {
    return new Date(expirationDate) < new Date();
  }

  isExpiringSoon(expirationDate: string, days: number = 30): boolean {
    const expiration = new Date(expirationDate);
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days && diffDays > 0;
  }

  getCertificateFileUrl(fileName: string): string {
    // This should return the actual S3 URL or presigned URL
    return `https://gym147-certifications.s3.amazonaws.com/certifications/${fileName}`;
  }
}

export const certificationService = new CertificationService();
