import React, { useState } from 'react';
import { X, Plus, Upload, FileImage, CheckCircle, AlertCircle } from 'lucide-react';
import { certificationService, CreateCertificationData, AIScanResult, UploadResult } from '../../services/certification.service';
import CertificationUpload from './CertificationUpload';

interface AddCertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainerId: string;
  onSuccess: () => void;
}

const CATEGORIES = [
  'CARDIO',
  'STRENGTH', 
  'YOGA',
  'PILATES',
  'DANCE',
  'MARTIAL_ARTS',
  'AQUA',
  'FUNCTIONAL',
  'RECOVERY',
  'SPECIALIZED'
];

const LEVELS = [
  { value: 'BASIC', label: 'Cơ bản' },
  { value: 'INTERMEDIATE', label: 'Trung cấp' },
  { value: 'ADVANCED', label: 'Nâng cao' },
  { value: 'EXPERT', label: 'Chuyên gia' }
];

const AddCertificationModal: React.FC<AddCertificationModalProps> = ({
  isOpen,
  onClose,
  trainerId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateCertificationData>({
    category: '',
    certification_name: '',
    certification_issuer: '',
    certification_level: 'BASIC',
    issued_date: '',
    expiration_date: '',
    certificate_file_url: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUploadComplete = (upload: UploadResult, scan: AIScanResult) => {
    setUploadResult(upload);
    setScanResult(scan);
    setFormData(prev => ({
      ...prev,
      certificate_file_url: upload.url,
    }));
  };

  const handleUploadError = (error: string) => {
    setError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await certificationService.createCertification(trainerId, formData);
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        category: '',
        certification_name: '',
        certification_issuer: '',
        certification_level: 'BASIC',
        issued_date: '',
        expiration_date: '',
        certificate_file_url: '',
      });
      setUploadResult(null);
      setScanResult(null);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVerificationStatus = () => {
    if (!scanResult) return null;
    
    if (scanResult.hasRedSeal && scanResult.confidence > 0.7) {
      return {
        status: 'verified',
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: 'Sẽ được xác thực tự động',
        color: 'text-green-600'
      };
    } else if (scanResult.hasRedSeal && scanResult.confidence > 0.4) {
      return {
        status: 'pending',
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        text: 'Cần xem xét thủ công',
        color: 'text-yellow-600'
      };
    } else {
      return {
        status: 'pending',
        icon: <AlertCircle className="w-5 h-5 text-orange-500" />,
        text: 'Cần xem xét thủ công',
        color: 'text-orange-600'
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Thêm chứng chỉ mới</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danh mục *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Chọn danh mục</option>
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cấp độ chứng chỉ *
              </label>
              <select
                name="certification_level"
                value={formData.certification_level}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên chứng chỉ *
              </label>
              <input
                type="text"
                name="certification_name"
                value={formData.certification_name}
                onChange={handleInputChange}
                required
                placeholder="Ví dụ: Yoga Alliance RYT-500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tổ chức cấp chứng chỉ *
              </label>
              <input
                type="text"
                name="certification_issuer"
                value={formData.certification_issuer}
                onChange={handleInputChange}
                required
                placeholder="Ví dụ: Yoga Alliance International"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày cấp *
              </label>
              <input
                type="date"
                name="issued_date"
                value={formData.issued_date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày hết hạn
              </label>
              <input
                type="date"
                name="expiration_date"
                value={formData.expiration_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload chứng chỉ
            </label>
            <CertificationUpload
              trainerId={trainerId}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
          </div>

          {/* Verification Status */}
          {scanResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                {getVerificationStatus()?.icon}
                <span className={`font-medium ${getVerificationStatus()?.color}`}>
                  {getVerificationStatus()?.text}
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Độ tin cậy AI: {(scanResult.confidence * 100).toFixed(1)}%
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.category || !formData.certification_name}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Tạo chứng chỉ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCertificationModal;