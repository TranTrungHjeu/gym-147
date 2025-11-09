import React, { useState, useEffect } from 'react';
import { Plus, Save, CheckCircle, AlertCircle, Award, Sparkles, Brain, Edit2, Lock } from 'lucide-react';
import { certificationService, CreateCertificationData, AIScanResult, UploadResult } from '../../services/certification.service';
import CertificationUpload from './CertificationUpload';
import Modal from '../Modal/Modal';
import CustomSelect from '../common/CustomSelect';
import { useToast } from '../../context/ToastContext';

interface AddCertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainerId: string;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'CARDIO', label: 'Tim mạch' },
  { value: 'STRENGTH', label: 'Sức mạnh' },
  { value: 'YOGA', label: 'Yoga' },
  { value: 'PILATES', label: 'Pilates' },
  { value: 'DANCE', label: 'Khiêu vũ' },
  { value: 'MARTIAL_ARTS', label: 'Võ thuật' },
  { value: 'AQUA', label: 'Bơi lội' },
  { value: 'FUNCTIONAL', label: 'Chức năng' },
  { value: 'RECOVERY', label: 'Phục hồi' },
  { value: 'SPECIALIZED', label: 'Chuyên biệt' },
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
  const { showToast } = useToast();
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Always start with hasSubmitted = false to prevent showing errors on initial render
  // This ensures errors are NEVER shown until user explicitly submits the form
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  const [fieldsLocked, setFieldsLocked] = useState(false); // Lock fields when AI auto-fills

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens - do this immediately to prevent any errors from showing
      // Reset hasSubmitted FIRST, then errors, to ensure errors never show before submit
      setHasSubmitted(false);
      setErrors({});
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
      setAutoFilled(false);
    } else {
      // Also reset when modal closes to ensure clean state
      setHasSubmitted(false);
      setErrors({});
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof CreateCertificationData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Only clear error if form has been submitted (to avoid showing errors prematurely)
    if (hasSubmitted && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category) {
      newErrors.category = 'Danh mục là bắt buộc';
    }

    if (!formData.certification_name || formData.certification_name.trim().length === 0) {
      newErrors.certification_name = 'Tên chứng chỉ là bắt buộc';
    } else if (formData.certification_name.length < 3) {
      newErrors.certification_name = 'Tên chứng chỉ phải có ít nhất 3 ký tự';
    }

    if (!formData.certification_issuer || formData.certification_issuer.trim().length === 0) {
      newErrors.certification_issuer = 'Tổ chức cấp chứng chỉ là bắt buộc';
    }

    if (!formData.issued_date) {
      newErrors.issued_date = 'Ngày cấp là bắt buộc';
    } else {
      const issuedDate = new Date(formData.issued_date);
      const today = new Date();
      if (issuedDate > today) {
        newErrors.issued_date = 'Ngày cấp không được là ngày tương lai';
      }
    }

    if (formData.expiration_date) {
      const expirationDate = new Date(formData.expiration_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare dates only
      expirationDate.setHours(0, 0, 0, 0);
      
      const issuedDate = formData.issued_date ? new Date(formData.issued_date) : null;
      if (issuedDate) {
        issuedDate.setHours(0, 0, 0, 0);
        
        // Check if expiration_date is before or equal to issued_date
        if (expirationDate <= issuedDate) {
          newErrors.expiration_date = 'Ngày hết hạn phải sau ngày cấp';
        }
      }
      
      // Check if expiration_date is in the past (certification already expired)
      if (expirationDate < today) {
        newErrors.expiration_date = 'Chứng chỉ đã hết hạn. Ngày hết hạn không thể là ngày trong quá khứ. Vui lòng kiểm tra lại hoặc tải lên chứng chỉ mới còn hiệu lực.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUploadComplete = (upload: UploadResult, scan: AIScanResult) => {
    setUploadResult(upload);
    setScanResult(scan);
    
    // Clear all errors and reset submitted state - no validation when uploading file
    setErrors({});
    setHasSubmitted(false);
    
    // Auto-fill form fields from AI extracted data
    if (scan.extractedData) {
      const extracted = scan.extractedData;
      let hasFilled = false;
      
      setFormData(prev => {
        // Determine certification_level: always use extracted value if available (since default is BASIC)
        const defaultLevel = 'BASIC';
        const finalLevel = extracted.certification_level 
          ? (extracted.certification_level as 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT')
          : prev.certification_level || defaultLevel;
        
        // Normalize date format if needed
        const normalizeDate = (dateStr: string | null | undefined): string => {
          if (!dateStr) return '';
          // If date is in format DD/MM/YYYY or DD-MM-YYYY, convert to YYYY-MM-DD
          const dateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (dateMatch) {
            const [, day, month, year] = dateMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          // If already in YYYY-MM-DD format, return as is
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
          }
          return dateStr;
        };

        // Normalize category value - map Vietnamese or alternative names to enum values
        const normalizeCategory = (categoryStr: string | null | undefined): string => {
          if (!categoryStr) return '';
          const upperCategory = categoryStr.toUpperCase().trim();
          
          // Direct enum match
          const validCategories = ['CARDIO', 'STRENGTH', 'YOGA', 'PILATES', 'DANCE', 'MARTIAL_ARTS', 'AQUA', 'FUNCTIONAL', 'RECOVERY', 'SPECIALIZED'];
          if (validCategories.includes(upperCategory)) {
            return upperCategory;
          }
          
          // Map Vietnamese and alternative names
          const categoryMap: Record<string, string> = {
            'TIM MẠCH': 'CARDIO',
            'CARDIO': 'CARDIO',
            'CARDIOVASCULAR': 'CARDIO',
            'SỨC MẠNH': 'STRENGTH',
            'STRENGTH': 'STRENGTH',
            'BODYBUILDING': 'STRENGTH',
            'WEIGHTLIFTING': 'STRENGTH',
            'YOGA': 'YOGA',
            'PILATES': 'PILATES',
            'KHIÊU VŨ': 'DANCE',
            'DANCE': 'DANCE',
            'DANCING': 'DANCE',
            'VÕ THUẬT': 'MARTIAL_ARTS',
            'MARTIAL ARTS': 'MARTIAL_ARTS',
            'MARTIAL_ARTS': 'MARTIAL_ARTS',
            'BOXING': 'MARTIAL_ARTS',
            'MUAY THAI': 'MARTIAL_ARTS',
            'KARATE': 'MARTIAL_ARTS',
            'TAEKWONDO': 'MARTIAL_ARTS',
            'THỦY SINH': 'AQUA',
            'AQUA': 'AQUA',
            'SWIMMING': 'AQUA',
            'BƠI LỘI': 'AQUA',
            'CHỨC NĂNG': 'FUNCTIONAL',
            'FUNCTIONAL': 'FUNCTIONAL',
            'FUNCTIONAL TRAINING': 'FUNCTIONAL',
            'PHỤC HỒI': 'RECOVERY',
            'RECOVERY': 'RECOVERY',
            'REHABILITATION': 'RECOVERY',
            'CHUYÊN BIỆT': 'SPECIALIZED',
            'SPECIALIZED': 'SPECIALIZED',
            'OTHER': 'SPECIALIZED',
          };
          
          return categoryMap[upperCategory] || '';
        };

        const normalizedIssuedDate = normalizeDate(extracted.issued_date);
        const normalizedExpirationDate = normalizeDate(extracted.expiration_date);
        const normalizedCategory = normalizeCategory(extracted.category);

        const newData = {
          ...prev,
          certificate_file_url: upload.url,
          // Always use extracted category if available (since it's important for classification)
          category: normalizedCategory || prev.category || '',
          certification_name: prev.certification_name || extracted.certification_name || '',
          certification_issuer: prev.certification_issuer || extracted.certification_issuer || '',
          certification_level: finalLevel,
          issued_date: prev.issued_date || normalizedIssuedDate || '',
          // Always use extracted expiration_date if available, even if prev has value (since expiration_date is optional)
          expiration_date: normalizedExpirationDate || prev.expiration_date || '',
        };
        
        // Check if any field was auto-filled
        hasFilled = !!(
          (normalizedCategory && normalizedCategory !== prev.category) ||
          (!prev.certification_name && extracted.certification_name) ||
          (!prev.certification_issuer && extracted.certification_issuer) ||
          (extracted.certification_level && extracted.certification_level !== prev.certification_level) ||
          (!prev.issued_date && normalizedIssuedDate) ||
          (!prev.expiration_date && normalizedExpirationDate)
        );
        
        return newData;
      });
      
      // Clear errors again after auto-fill to ensure no validation errors show
      setTimeout(() => {
        setErrors({});
        setHasSubmitted(false);
      }, 0);
      
      if (hasFilled) {
        setAutoFilled(true);
        setFieldsLocked(true); // Lock fields when AI auto-fills
        showToast({
          message: 'Đã tự động điền thông tin từ chứng chỉ. Các trường đã bị khóa để đảm bảo tính chính xác.',
          type: 'success',
          duration: 4000,
        });
      }
    } else {
      setFormData(prev => ({
        ...prev,
        certificate_file_url: upload.url,
      }));
      // Clear errors again after setting file URL
      setTimeout(() => {
        setErrors({});
        setHasSubmitted(false);
      }, 0);
    }
    
    // Show toast for successful scan after all processing is done
    setTimeout(() => {
      showToast({
        message: 'Đã quét chứng chỉ thành công',
        type: 'success',
        duration: 3000,
      });
    }, 200);
    
    // Don't validate form here - validation will happen when user submits the form
  };

  const handleUploadError = (error: string) => {
    // Only set error for certificate_file field, don't trigger validation for other fields
    // Don't set hasSubmitted to true for file errors
    setErrors(prev => {
      const newErrors = { ...prev };
      // Clear all other errors, only keep certificate_file error
      Object.keys(newErrors).forEach(key => {
        if (key !== 'certificate_file') {
          delete newErrors[key];
        }
      });
      newErrors.certificate_file = error;
      return newErrors;
    });
    setHasSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark form as submitted to show errors
    setHasSubmitted(true);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Include AI scan result if available (to avoid re-scanning on backend)
      const dataToSubmit = {
        ...formData,
        // Include AI scan result if we already have it from upload
        aiScanResult: scanResult || undefined,
      };
      
      await certificationService.createCertification(trainerId, dataToSubmit);
      showToast({
        message: 'Tạo chứng chỉ thành công',
        type: 'success',
        duration: 3000,
      });
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error: any) {
      console.error('❌ Error creating certification:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi tạo chứng chỉ';
      
      // Show error toast with detailed message
      showToast({
        message: errorMessage,
        type: 'error',
        duration: 5000, // Longer duration for error messages
      });
      
      // Set error in form state to display in UI
      setErrors(prev => ({ ...prev, submit: errorMessage }));
      
      // If it's a validation error (400), also set field-specific errors if available
      if (error.response?.status === 400) {
        // The backend returns a clear message, we'll show it in the toast and error state
        console.error('❌ Validation error:', errorMessage);
      }
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-[900px] min-w-[600px] m-4'>
      <div className='relative w-full min-w-[600px] max-w-[900px] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl max-h-[85vh] flex flex-col'>
        {/* Header */}
        <div className='flex-shrink-0 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700 px-6 py-4 rounded-t-2xl'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center'>
              <Award className='w-5 h-5 text-orange-600 dark:text-orange-400' />
            </div>
            <h2 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
              Thêm chứng chỉ mới
            </h2>
          </div>
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          className='flex-1 overflow-y-auto p-5'
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db transparent',
          }}
        >
          <style>{`
            form::-webkit-scrollbar {
              width: 4px;
            }
            form::-webkit-scrollbar-track {
              background: transparent;
            }
            form::-webkit-scrollbar-thumb {
              background-color: #d1d5db;
              border-radius: 2px;
            }
            form::-webkit-scrollbar-thumb:hover {
              background-color: #9ca3af;
            }
            .dark form::-webkit-scrollbar-thumb {
              background-color: #4b5563;
            }
            .dark form::-webkit-scrollbar-thumb:hover {
              background-color: #6b7280;
            }
          `}</style>

          <div className='space-y-3'>
            {/* AI Scan Badge - Show when file has been scanned by AI (distinguishes from manual entry) */}
            {scanResult && uploadResult ? (
              <div className='flex items-center gap-3 p-3.5 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-indigo-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-xl shadow-sm'>
                <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 shadow-md'>
                  <Sparkles className='w-5 h-5 text-white' />
                </div>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <p className='text-[12px] font-bold text-purple-900 dark:text-purple-100 font-heading'>
                      Đã quét bằng AI
                    </p>
                    <span className='px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full text-[9px] font-semibold font-inter'>
                      AI Verified
                    </span>
                  </div>
                  <p className='text-[11px] text-purple-700 dark:text-purple-300 font-inter'>
                    {scanResult.confidence > 0.7
                      ? '✓ Chứng chỉ sẽ được xác thực tự động (Độ tin cậy: ' + Math.round(scanResult.confidence * 100) + '%)'
                      : scanResult.confidence > 0.4
                      ? '⚠ Đang chờ xem xét thủ công (Độ tin cậy: ' + Math.round(scanResult.confidence * 100) + '%)'
                      : '⚠ Cần xem xét kỹ lưỡng (Độ tin cậy: ' + Math.round(scanResult.confidence * 100) + '%)'}
                  </p>
                </div>
                {scanResult.confidence > 0.7 && (
                  <div className='flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50'>
                    <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />
                  </div>
                )}
              </div>
            ) : (
              // Manual entry indicator (when no AI scan)
              <div className='flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg'>
                <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700'>
                  <AlertCircle className='w-4 h-4 text-gray-500 dark:text-gray-400' />
                </div>
                <div className='flex-1'>
                  <p className='text-[11px] font-medium text-gray-600 dark:text-gray-400 font-heading'>
                    Nhập thủ công
                  </p>
                  <p className='text-[10px] text-gray-500 dark:text-gray-500 font-inter'>
                    Chứng chỉ sẽ được xem xét thủ công bởi quản trị viên
                  </p>
                </div>
              </div>
            )}

            {/* Edit Button - Show when fields are locked */}
            {fieldsLocked && (
              <div className='flex items-center justify-end mb-2'>
                <button
                  type='button'
                  onClick={() => {
                    setFieldsLocked(false);
                    showToast({
                      message: 'Đã mở khóa các trường. Bạn có thể chỉnh sửa thông tin.',
                      type: 'info',
                      duration: 3000,
                    });
                  }}
                  className='inline-flex items-center justify-center gap-2 min-w-[120px] h-9 px-4 py-2 text-[11px] font-semibold font-heading text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95'
                >
                  <Edit2 className='w-3.5 h-3.5 flex-shrink-0' />
                  <span>Chỉnh sửa</span>
                </button>
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                    Danh mục *
                  </label>
                  {fieldsLocked && (
                    <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0' />
                  )}
                </div>
                <CustomSelect
                  options={CATEGORIES}
                  value={formData.category}
                  onChange={value => handleInputChange('category', value)}
                  placeholder='Chọn danh mục'
                  className='font-inter'
                  disabled={fieldsLocked}
                />
                {isOpen && hasSubmitted && errors.category && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                    {errors.category}
                  </p>
                )}
              </div>

              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                    Cấp độ chứng chỉ *
                  </label>
                  {fieldsLocked && (
                    <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0' />
                  )}
                </div>
                <CustomSelect
                  options={LEVELS}
                  value={formData.certification_level}
                  onChange={value => handleInputChange('certification_level', value as 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT')}
                  placeholder='Chọn cấp độ'
                  className='font-inter'
                  disabled={fieldsLocked}
                />
              </div>
            </div>

            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Tên chứng chỉ *
                </label>
                {fieldsLocked && (
                  <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
                )}
              </div>
              <input
                type='text'
                value={formData.certification_name || ''}
                onChange={e => handleInputChange('certification_name', e.target.value)}
                placeholder='Ví dụ: Yoga Alliance RYT-500'
                disabled={fieldsLocked}
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter shadow-sm ${
                  fieldsLocked
                    ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    : 'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                } ${
                  isOpen && hasSubmitted && errors.certification_name
                    ? 'border-red-500 dark:border-red-500'
                    : fieldsLocked
                    ? ''
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {isOpen && hasSubmitted && errors.certification_name && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.certification_name}
                </p>
              )}
            </div>

            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Tổ chức cấp chứng chỉ *
                </label>
                {fieldsLocked && (
                  <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
                )}
              </div>
              <input
                type='text'
                value={formData.certification_issuer || ''}
                onChange={e => handleInputChange('certification_issuer', e.target.value)}
                placeholder='Ví dụ: Yoga Alliance International'
                disabled={fieldsLocked}
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter shadow-sm ${
                  fieldsLocked
                    ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    : 'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                } ${
                  isOpen && hasSubmitted && errors.certification_issuer
                    ? 'border-red-500 dark:border-red-500'
                    : fieldsLocked
                    ? ''
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {isOpen && hasSubmitted && errors.certification_issuer && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.certification_issuer}
                </p>
              )}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                    Ngày cấp *
                  </label>
                  {fieldsLocked && (
                    <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
                  )}
                </div>
                <input
                  type='date'
                  value={formData.issued_date || ''}
                  onChange={e => handleInputChange('issued_date', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={fieldsLocked}
                  className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 font-inter shadow-sm ${
                    fieldsLocked
                      ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      : 'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                  } ${
                    isOpen && hasSubmitted && errors.issued_date
                      ? 'border-red-500 dark:border-red-500'
                      : fieldsLocked
                      ? ''
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                {isOpen && hasSubmitted && errors.issued_date && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                    {errors.issued_date}
                  </p>
                )}
              </div>

              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                    Ngày hết hạn
                  </label>
                  {fieldsLocked && (
                    <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
                  )}
                </div>
                <input
                  type='date'
                  value={formData.expiration_date || ''}
                  onChange={e => handleInputChange('expiration_date', e.target.value)}
                  min={formData.issued_date || undefined}
                  disabled={fieldsLocked}
                  className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 font-inter shadow-sm ${
                    fieldsLocked
                      ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      : 'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                  } ${
                    isOpen && hasSubmitted && errors.expiration_date
                      ? 'border-red-500 dark:border-red-500'
                      : fieldsLocked
                      ? ''
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                {isOpen && hasSubmitted && errors.expiration_date && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                    {errors.expiration_date}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className='min-h-[200px]'>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-3'>
              Upload chứng chỉ
            </label>
            <div className='min-h-[200px]'>
              <CertificationUpload
                trainerId={trainerId}
                onUploadComplete={(upload, scan) => {
                  // Clear all errors and reset submitted state before handling upload complete
                  setErrors({});
                  setHasSubmitted(false);
                  handleUploadComplete(upload, scan);
                }}
                onUploadError={(error) => {
                  // Clear all validation errors, only show file error
                  setErrors({ certificate_file: error });
                  setHasSubmitted(false);
                }}
                onFileSelect={() => {
                  // Clear all errors and reset submitted state when file is selected
                  setErrors({});
                  setHasSubmitted(false);
                }}
              />
            </div>
            {errors.certificate_file && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.certificate_file}
              </p>
            )}
          </div>

          {/* Auto-fill Notification */}
          {autoFilled && scanResult?.extractedData && (
            <div className='p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl'>
              <div className='flex items-start gap-2'>
                <CheckCircle className='w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5' />
                <div className='flex-1'>
                  <p className='text-[11px] font-medium text-green-800 dark:text-green-300 font-heading mb-1'>
                    Đã tự động điền thông tin từ chứng chỉ
                  </p>
                  <p className='text-[10px] text-green-700 dark:text-green-400 font-inter'>
                    Vui lòng kiểm tra và chỉnh sửa nếu cần thiết
                  </p>
                </div>
              </div>
            </div>
          )}


          {errors.submit && (
            <div className='p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl'>
              <p className='text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.submit}
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className='flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-6 py-4 rounded-b-2xl'>
          <div className='flex justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSubmitting}
              className='inline-flex items-center justify-center min-w-[100px] h-10 px-5 py-2.5 text-[11px] font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
            >
              <span>Hủy</span>
            </button>
            <button
              type='submit'
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.category || !formData.certification_name || !formData.certification_issuer || !formData.issued_date}
              className='inline-flex items-center justify-center gap-2 min-w-[140px] h-10 px-5 py-2.5 text-[11px] font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
            >
              {isSubmitting ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0'></div>
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Save className='w-4 h-4 flex-shrink-0' />
                  <span>Tạo chứng chỉ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddCertificationModal;