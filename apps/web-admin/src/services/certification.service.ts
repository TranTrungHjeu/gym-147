import { scheduleApi } from './api';
import type { AxiosResponse } from 'axios';

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
  aiScanResult?: AIScanResult; // Optional: AI scan result from frontend (to avoid re-scanning)
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
  extractedData?: {
    certification_name?: string | null;
    certification_issuer?: string | null;
    issued_date?: string | null;
    expiration_date?: string | null;
    category?: string | null;
    certification_level?: string | null;
  };
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
  // Use centralized config - all URLs come from api.config.ts

  /**
   * Get all certifications for a trainer
   * @param trainerId - Trainer ID (can be trainer.id or user_id, backend will resolve it)
   */
  async getTrainerCertifications(trainerId: string): Promise<Certification[]> {
    try {
      // Directly use trainerId - backend will resolve if it's user_id or trainer.id
      const response = await scheduleApi.get(`/trainers/${trainerId}/certifications`);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new certification
   * Note: This may take longer due to AI scanning, so timeout is increased to 90 seconds
   */
  async createCertification(
    trainerId: string,
    data: CreateCertificationData
  ): Promise<Certification> {
    try {
      const response = await scheduleApi.post(
        `/trainers/${trainerId}/certifications`,
        data,
        { timeout: 90000 } // 90 seconds - enough time for AI scan + database operations
      );
      return response.data.data;
    } catch (error) {
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
      const response = await scheduleApi.put(`/certifications/${certId}`, data);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete certification
   */
  async deleteCertification(certId: string): Promise<void> {
    try {
      await scheduleApi.delete(`/certifications/${certId}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all pending certifications for admin review
   */
  async getPendingCertifications(params?: {
    page?: number;
    limit?: number;
    category?: string;
    trainer_id?: string;
  }): Promise<{ certifications: Certification[]; pagination: any }> {
    try {
      const response = await scheduleApi.get('/admin/certifications/pending', { params });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify (approve) a certification
   */
  async verifyCertification(certId: string, verifiedBy: string): Promise<Certification> {
    try {
      const response = await scheduleApi.put(`/admin/certifications/${certId}/verify`, {
        verified_by: verifiedBy,
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject a certification
   */
  async rejectCertification(
    certId: string,
    verifiedBy: string,
    rejectionReason: string
  ): Promise<Certification> {
    try {
      const response = await scheduleApi.put(`/admin/certifications/${certId}/reject`, {
        verified_by: verifiedBy,
        rejection_reason: rejectionReason,
      });
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get certification by ID
   */
  async getCertificationById(certId: string): Promise<Certification> {
    try {
      const response = await scheduleApi.get(`/admin/certifications/${certId}`);
      return response.data.data;
    } catch (error) {
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

      const response = await scheduleApi.post(
        `/trainers/${trainerId}/upload-certificate`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const result = response.data.data;
      
      if (!result) {
        throw new Error('Không nhận được dữ liệu từ server');
      }
      
      const uploadResult: UploadResult = {
        url: result.url,
        publicUrl: result.publicUrl || result.url,
        key: result.key,
        originalName: result.originalName || file.name,
        size: result.size || file.size,
        mimeType: result.mimeType || file.type,
        bucket: result.bucket,
      };
      
      return uploadResult;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi upload file';
      throw new Error(errorMessage);
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
      const response = await scheduleApi.post(`/trainers/${trainerId}/presigned-url`, {
        fileName,
        mimeType,
      });

      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload file directly to S3 using presigned URL
   * Note: This method may have CORS issues. Use uploadCertificateFile instead.
   */
  async uploadToS3WithPresignedUrl(presignedUrl: string, file: File): Promise<void> {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
        mode: 'cors', // Explicitly set CORS mode
      });

      if (!response.ok) {
        throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Scan certificate with AI
   */
  async scanCertificateWithAI(imageUrl: string): Promise<AIScanResult> {
    try {
      const response = await scheduleApi.post(
        `/scan-certificate`,
        { imageUrl },
        { timeout: 30000 }
      );
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get available categories for trainer
   * @param trainerId - Trainer ID (can be trainer.id or user_id, backend will resolve it)
   */
  async getAvailableCategories(trainerId: string): Promise<AvailableCategory[]> {
    try {
      // Directly use trainerId - backend will resolve if it's user_id or trainer.id
      const response = await scheduleApi.get(`/trainers/${trainerId}/available-categories`);
      return response.data.data.categories;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a certification
   * @param certId - Certification ID
   * @param reason - Reason for deletion
   */
  async deleteCertification(certId: string, reason: string): Promise<void> {
    try {
      await scheduleApi.delete(`/certifications/${certId}`, {
        data: { reason },
      });
    } catch (error) {
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
      const response = await scheduleApi.get(
        `/trainers/${trainerId}/categories/${category}/access`
      );
      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload file to S3 only (without AI scan)
   * Uses backend service to avoid CORS issues
   */
  async uploadFileOnly(trainerId: string, file: File): Promise<UploadResult> {
    try {
      // Upload via backend service to avoid CORS issues
      const uploadResult = await this.uploadCertificateFile(trainerId, file);
      return uploadResult;
    } catch (error) {
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

  getCertificateFileUrl(certificateFileUrl: string): string {
    // If certificate_file_url is already a full URL, return it directly
    // Backend returns full S3 URLs in format: https://bucket.s3.region.amazonaws.com/key
    if (certificateFileUrl.startsWith('http://') || certificateFileUrl.startsWith('https://')) {
      return certificateFileUrl;
    }
    
    // If it's just a key (e.g., "certifications/abc123.png"), construct the URL
    // Try to extract key from different formats
    let key = certificateFileUrl;
    
    // If it contains slashes, it might be a key like "certifications/abc123.png"
    // If it doesn't contain slashes, it's just a filename, add the folder prefix
    if (!key.includes('/')) {
      key = `certifications/${key}`;
    }
    
    // Try to construct URL - but this might not work if bucket is not public
    // Backend should return full URLs, so this is a fallback
    const bucketName = 'gym147-bucket'; // This should match AWS_S3_BUCKET_NAME in backend
    const region = 'ap-southeast-1'; // This should match AWS_REGION in backend
    
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  }
}

export const certificationService = new CertificationService();
