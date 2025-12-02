import React, { useState, useEffect } from 'react';
import { Plus, Save, CheckCircle, AlertCircle, Award, Sparkles, Brain, Edit2, Lock, FileText } from 'lucide-react';
import { certificationService, CreateCertificationData, AIScanResult, UploadResult } from '../../services/certification.service';
import CertificationUpload from './CertificationUpload';
import ManualCertificationUpload from './ManualCertificationUpload';
import Modal from '../Modal/Modal';
import CustomSelect from '../common/CustomSelect';
import { useToast } from '../../context/ToastContext';
import { ButtonSpinner } from '../ui/AppLoading';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

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
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai'); // Tab state: 'ai' or 'manual'
  
  // Determine if fields should be disabled
  // In AI tab: disable fields until file is uploaded and scanned (or user unlocks)
  // In manual tab: fields are always enabled
  const areFieldsDisabled = activeTab === 'ai' ? (fieldsLocked || !scanResult) : false;

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
      setFieldsLocked(false);
      setActiveTab('ai'); // Reset to AI tab when modal opens
    } else {
      // Also reset when modal closes to ensure clean state
      setHasSubmitted(false);
      setErrors({});
    }
  }, [isOpen]);

  // Reset form when switching tabs
  useEffect(() => {
    if (isOpen) {
      setHasSubmitted(false);
      setErrors({});
      setUploadResult(null);
      setScanResult(null);
      setAutoFilled(false);
      setFieldsLocked(false);
      if (activeTab === 'manual') {
        // Keep form data when switching to manual, but clear AI-related data
        setFormData(prev => ({
          ...prev,
          certificate_file_url: prev.certificate_file_url || '',
        }));
      } else {
        // Reset form when switching to AI tab
        setFormData({
          category: '',
          certification_name: '',
          certification_issuer: '',
          certification_level: 'BASIC',
          issued_date: '',
          expiration_date: '',
          certificate_file_url: '',
        });
      }
    }
  }, [activeTab, isOpen]);

  // Helper function to normalize date input (handle DD/MM/YYYY format)
  const normalizeDateInput = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // If input is in format DD/MM/YYYY or DD-MM-YYYY, convert to YYYY-MM-DD
    const dateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // If already in YYYY-MM-DD format, return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // Try to parse as date and convert to YYYY-MM-DD
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        // Format as YYYY-MM-DD (local date, not UTC)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    
    return dateStr;
  };

  const handleInputChange = (field: keyof CreateCertificationData, value: string) => {
    // Normalize date fields if needed
    let normalizedValue = value;
    if ((field === 'issued_date' || field === 'expiration_date') && value) {
      normalizedValue = normalizeDateInput(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: normalizedValue,
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

    // Helper function to get current date in Vietnam timezone (GMT+7) - date only (no time)
    const getVietnamDateOnly = () => {
      return dayjs().tz('Asia/Ho_Chi_Minh').startOf('day');
    };

    // Helper function to parse date string in Vietnam timezone - date only (no time)
    const parseDateVietnam = (dateStr: string) => {
      if (!dateStr) return null;
      
      try {
        // Normalize date string first
        const normalized = normalizeDateInput(dateStr);
        
        // Parse as date in Vietnam timezone
        // If format is YYYY-MM-DD, parse it as Vietnam timezone at 00:00:00
        if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
          const [year, month, day] = normalized.split('-').map(Number);
          const vnDate = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 00:00:00`, 'Asia/Ho_Chi_Minh');
          if (vnDate.isValid()) {
            return vnDate.startOf('day');
          }
        }
        
        // Try parsing as-is
        const vnDate = dayjs.tz(normalized, 'Asia/Ho_Chi_Minh');
        if (vnDate.isValid()) {
          return vnDate.startOf('day');
        }
        
        // Try parsing as UTC, then convert to Vietnam timezone
        const utcDate = dayjs.utc(normalized);
        if (utcDate.isValid()) {
          return utcDate.tz('Asia/Ho_Chi_Minh').startOf('day');
        }
        
        return null;
      } catch (error) {
        return null;
      }
    };

    if (!formData.issued_date) {
      newErrors.issued_date = 'Ngày cấp là bắt buộc';
    } else {
      const issuedDateVietnam = parseDateVietnam(formData.issued_date);
      if (!issuedDateVietnam || !issuedDateVietnam.isValid()) {
        newErrors.issued_date = 'Ngày cấp không hợp lệ. Vui lòng nhập đúng định dạng (DD/MM/YYYY hoặc YYYY-MM-DD)';
      } else {
        const nowVietnam = getVietnamDateOnly();
        // Compare dates only (not time) in Vietnam timezone
        if (issuedDateVietnam.isAfter(nowVietnam)) {
          const issuedDateStr = issuedDateVietnam.format('DD/MM/YYYY');
          const todayStr = nowVietnam.format('DD/MM/YYYY');
          newErrors.issued_date = `Ngày cấp (${issuedDateStr}) không được là ngày tương lai (hôm nay là ${todayStr} theo giờ Việt Nam)`;
        }
      }
    }

    if (formData.expiration_date) {
      const expirationDateVietnam = parseDateVietnam(formData.expiration_date);
      if (!expirationDateVietnam || !expirationDateVietnam.isValid()) {
        newErrors.expiration_date = 'Ngày hết hạn không hợp lệ. Vui lòng nhập đúng định dạng (DD/MM/YYYY hoặc YYYY-MM-DD)';
      } else {
        const nowVietnam = getVietnamDateOnly();
        
        // Check if expiration_date is after issued_date
        if (formData.issued_date) {
          const issuedDateVietnam = parseDateVietnam(formData.issued_date);
          if (issuedDateVietnam && issuedDateVietnam.isValid()) {
            // Use isBefore or isSame instead of isSameOrBefore if plugin not available
            if (expirationDateVietnam.isBefore(issuedDateVietnam) || expirationDateVietnam.isSame(issuedDateVietnam)) {
              const expirationDateStr = expirationDateVietnam.format('DD/MM/YYYY');
              const issuedDateStr = issuedDateVietnam.format('DD/MM/YYYY');
              newErrors.expiration_date = `Ngày hết hạn (${expirationDateStr}) phải sau ngày cấp (${issuedDateStr})`;
            }
          }
        }
        
        // Check if expiration_date is in the past (certification already expired)
        // Compare dates only (not time) in Vietnam timezone
        if (expirationDateVietnam.isBefore(nowVietnam)) {
          const expirationDateStr = expirationDateVietnam.format('DD/MM/YYYY');
          const todayStr = nowVietnam.format('DD/MM/YYYY');
          newErrors.expiration_date = `Chứng chỉ đã hết hạn. Ngày hết hạn (${expirationDateStr}) đã qua (hôm nay là ${todayStr} theo giờ Việt Nam)`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler for manual upload (no AI scan)
  const handleManualUploadComplete = (upload: UploadResult) => {
    setUploadResult(upload);
    setScanResult(null); // No AI scan for manual entry
    
    // Clear all errors and reset submitted state
    setErrors({});
    setHasSubmitted(false);
    
    // Set file URL in form data - use publicUrl if available, otherwise use url
    const fileUrl = upload.publicUrl || upload.url;
    setFormData(prev => ({
      ...prev,
      certificate_file_url: fileUrl,
    }));
    
    // Show success toast
    showToast({
      message: 'Đã tải lên chứng chỉ thành công',
      type: 'success',
      duration: 3000,
    });
  };

  // Handler for AI upload (with AI scan)
  const handleUploadComplete = async (upload: UploadResult, scan: AIScanResult) => {
    setUploadResult(upload);
    // Don't set scanResult to hide the AI verification card
    // We'll use scan parameter directly for auto-submit
    
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
    
    // Auto-submit form after AI scan completes
    // Wait a bit for form fields to be populated
    setTimeout(async () => {
      // Validate form before submitting
      if (validate()) {
        setIsSubmitting(true);
        try {
          const dataToSubmit = {
            ...formData,
            aiScanResult: scan,
            skipAiScan: false,
          };
          
          const createdCert = await certificationService.createCertification(trainerId, dataToSubmit);
          showToast({
            message: 'Tạo chứng chỉ thành công',
            type: 'success',
            duration: 3000,
          });
          
          // Optimistic update: Dispatch event immediately for instant UI update
          const createdEvent = new CustomEvent('certification:created', {
            detail: {
              id: createdCert.id,
              certification_id: createdCert.id,
              trainer_id: createdCert.trainer_id,
              category: createdCert.category,
              certification_name: createdCert.certification_name,
              certification_issuer: createdCert.certification_issuer,
              certification_level: createdCert.certification_level,
              issued_date: createdCert.issued_date,
              expiration_date: createdCert.expiration_date,
              verification_status: createdCert.verification_status,
              certificate_file_url: createdCert.certificate_file_url,
              is_active: createdCert.is_active,
              created_at: createdCert.created_at,
              updated_at: createdCert.updated_at,
            },
            bubbles: true,
            cancelable: true,
          });
          
          // Dispatch on both window and document for better compatibility
          const dispatchedWindow = window.dispatchEvent(createdEvent);
          const dispatchedDocument = document.dispatchEvent(new CustomEvent('certification:created', {
            detail: createdEvent.detail,
            bubbles: true,
            cancelable: true,
          }));
          
          console.log(`[SUCCESS] [ADD_CERT_MODAL] [STAR] Dispatched optimistic certification:created event for ${createdCert.id}`, {
            trainer_id: createdCert.trainer_id,
            certification_id: createdCert.id,
            verification_status: createdCert.verification_status,
            dispatched_window: dispatchedWindow,
            dispatched_document: dispatchedDocument,
            event_detail: createdEvent.detail
          });
          
          // Reset submitting state before closing modal
          setIsSubmitting(false);
          
          onSuccess();
          setTimeout(() => {
            onClose();
          }, 100);
        } catch (error: any) {
          console.error('Error creating certification:', error);
          
          const errorMessage = 
            error?.response?.data?.message || 
            error?.message || 
            'Có lỗi xảy ra khi tạo chứng chỉ. Vui lòng thử lại.';
          
          showToast({
            message: errorMessage,
            type: 'error',
            duration: 5000,
          });
          
          setIsSubmitting(false);
        }
      }
    }, 500); // Wait 500ms for form fields to be populated
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
      // Include AI scan result only for AI tab (to avoid re-scanning on backend)
      // For manual tab, explicitly skip AI scan
      const dataToSubmit = {
        ...formData,
        // Include AI scan result only if we're on AI tab and have scan result
        aiScanResult: activeTab === 'ai' && scanResult ? scanResult : undefined,
        // Flag to skip AI scan for manual entry
        skipAiScan: activeTab === 'manual',
      };
      
          const createdCert = await certificationService.createCertification(trainerId, dataToSubmit);
          showToast({
            message: 'Tạo chứng chỉ thành công',
            type: 'success',
            duration: 3000,
          });
          
          // Optimistic update: Dispatch event immediately for instant UI update
          const createdEvent = new CustomEvent('certification:created', {
            detail: {
              id: createdCert.id,
              certification_id: createdCert.id,
              trainer_id: createdCert.trainer_id,
              category: createdCert.category,
              certification_name: createdCert.certification_name,
              certification_issuer: createdCert.certification_issuer,
              certification_level: createdCert.certification_level,
              issued_date: createdCert.issued_date,
              expiration_date: createdCert.expiration_date,
              verification_status: createdCert.verification_status,
              certificate_file_url: createdCert.certificate_file_url,
              is_active: createdCert.is_active,
              created_at: createdCert.created_at,
              updated_at: createdCert.updated_at,
            },
          });
          
          // Dispatch on both window and document for better compatibility
          const dispatchedWindow = window.dispatchEvent(createdEvent);
          const dispatchedDocument = document.dispatchEvent(new CustomEvent('certification:created', {
            detail: createdEvent.detail,
            bubbles: true,
            cancelable: true,
          }));
          
          console.log(`[SUCCESS] [ADD_CERT_MODAL] [STAR] Dispatched optimistic certification:created event for ${createdCert.id}`, {
            trainer_id: createdCert.trainer_id,
            certification_id: createdCert.id,
            verification_status: createdCert.verification_status,
            dispatched_window: dispatchedWindow,
            dispatched_document: dispatchedDocument,
            event_detail: createdEvent.detail
          });
          
          // Reset submitting state before closing modal
          setIsSubmitting(false);
          
          onSuccess();
          setTimeout(() => {
            onClose();
          }, 100);
    } catch (error: any) {
      console.error('Error creating certification:', error);
      
      // Extract error message from response
      const errorMessage = 
        error?.response?.data?.message || 
        error?.message || 
        'Có lỗi xảy ra khi tạo chứng chỉ. Vui lòng thử lại.';
      
      // Show error toast with message from backend
      // This includes validation errors like "Đã có chứng chỉ X đã được xác thực cho Y. Chỉ chấp nhận cấp độ cao hơn."
      showToast({
        message: errorMessage,
        type: 'error',
        duration: 5000, // Show for 5 seconds for validation errors
      });
      
      // Reset submitting state
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
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center'>
              <Award className='w-5 h-5 text-orange-600 dark:text-orange-400' />
            </div>
            <h2 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
              Thêm chứng chỉ mới
            </h2>
          </div>
          
          {/* Tabs */}
          <div className='flex gap-2 border-b border-orange-200 dark:border-orange-700'>
            <button
              type='button'
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold font-heading transition-all duration-200 border-b-2 ${
                activeTab === 'ai'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-orange-500 dark:hover:text-orange-500'
              }`}
            >
              <Sparkles className='w-4 h-4' />
              <span>Quét bằng AI</span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold font-heading transition-all duration-200 border-b-2 ${
                activeTab === 'manual'
                  ? 'text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-orange-500 dark:hover:text-orange-500'
              }`}
            >
              <FileText className='w-4 h-4' />
              <span>Nhập thủ công</span>
            </button>
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
            {/* AI verification card removed - form auto-submits after scan */}

            {/* Edit Button - Show when fields are locked in AI tab */}
            {activeTab === 'ai' && areFieldsDisabled && scanResult && (
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
                  {areFieldsDisabled && (
                    <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0' />
                  )}
                </div>
                <CustomSelect
                  options={CATEGORIES}
                  value={formData.category}
                  onChange={value => handleInputChange('category', value)}
                  placeholder='Chọn danh mục'
                  className='font-inter'
                  disabled={areFieldsDisabled}
                />
                {isOpen && hasSubmitted && errors.category && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter break-words max-w-full'>
                    {errors.category}
                  </p>
                )}
              </div>

              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                    Cấp độ chứng chỉ *
                  </label>
                  {areFieldsDisabled && (
                    <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0' />
                  )}
                </div>
                <CustomSelect
                  options={LEVELS}
                  value={formData.certification_level}
                  onChange={value => handleInputChange('certification_level', value as 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT')}
                  placeholder='Chọn cấp độ'
                  className='font-inter'
                  disabled={areFieldsDisabled}
                />
              </div>
            </div>

            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Tên chứng chỉ *
                </label>
                {areFieldsDisabled && (
                  <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
                )}
              </div>
              <input
                type='text'
                value={formData.certification_name || ''}
                onChange={e => handleInputChange('certification_name', e.target.value)}
                placeholder='Ví dụ: Yoga Alliance RYT-500'
                disabled={areFieldsDisabled}
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter shadow-sm ${
                  areFieldsDisabled
                    ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    : 'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                } ${
                  isOpen && hasSubmitted && errors.certification_name
                    ? 'border-red-500 dark:border-red-500'
                    : areFieldsDisabled
                    ? ''
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {isOpen && hasSubmitted && errors.certification_name && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter break-words max-w-full'>
                  {errors.certification_name}
                </p>
              )}
            </div>

            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                  Tổ chức cấp chứng chỉ *
                </label>
                {areFieldsDisabled && (
                  <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
                )}
              </div>
              <input
                type='text'
                value={formData.certification_issuer || ''}
                onChange={e => handleInputChange('certification_issuer', e.target.value)}
                placeholder='Ví dụ: Yoga Alliance International'
                disabled={areFieldsDisabled}
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter shadow-sm ${
                  areFieldsDisabled
                    ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    : 'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                } ${
                  isOpen && hasSubmitted && errors.certification_issuer
                    ? 'border-red-500 dark:border-red-500'
                    : areFieldsDisabled
                    ? ''
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {isOpen && hasSubmitted && errors.certification_issuer && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter break-words max-w-full'>
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
                  {areFieldsDisabled && (
                    <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
                  )}
                </div>
                <input
                  type='date'
                  value={formData.issued_date || ''}
                  onChange={e => handleInputChange('issued_date', e.target.value)}
                  onBlur={e => {
                    // Normalize date on blur if user typed manually
                    if (e.target.value) {
                      const normalized = normalizeDateInput(e.target.value);
                      if (normalized !== e.target.value) {
                        handleInputChange('issued_date', normalized);
                      }
                    }
                  }}
                  max={dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')}
                  disabled={areFieldsDisabled}
                  className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 font-inter shadow-sm ${
                    areFieldsDisabled
                      ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      : 'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                  } ${
                    isOpen && hasSubmitted && errors.issued_date
                      ? 'border-red-500 dark:border-red-500'
                      : areFieldsDisabled
                      ? ''
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                {isOpen && hasSubmitted && errors.issued_date && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter break-words max-w-full'>
                    {errors.issued_date}
                  </p>
                )}
              </div>

              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                    Ngày hết hạn
                  </label>
                  {areFieldsDisabled && (
                    <Lock className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
                  )}
                </div>
                <input
                  type='date'
                  value={formData.expiration_date || ''}
                  onChange={e => handleInputChange('expiration_date', e.target.value)}
                  onBlur={e => {
                    // Normalize date on blur if user typed manually
                    if (e.target.value) {
                      const normalized = normalizeDateInput(e.target.value);
                      if (normalized !== e.target.value) {
                        handleInputChange('expiration_date', normalized);
                      }
                    }
                  }}
                  min={formData.issued_date || undefined}
                  disabled={areFieldsDisabled}
                  className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 font-inter shadow-sm ${
                    areFieldsDisabled
                      ? 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      : 'focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                  } ${
                    isOpen && hasSubmitted && errors.expiration_date
                      ? 'border-red-500 dark:border-red-500'
                      : areFieldsDisabled
                      ? ''
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                {isOpen && hasSubmitted && errors.expiration_date && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter break-words max-w-full'>
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
              {activeTab === 'ai' ? (
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
              ) : (
                <ManualCertificationUpload
                  trainerId={trainerId}
                  onUploadComplete={(upload) => {
                    // Clear all errors and reset submitted state before handling upload complete
                    setErrors({});
                    setHasSubmitted(false);
                    handleManualUploadComplete(upload);
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
              )}
            </div>
          </div>

          {/* Auto-fill Notification - Only show for AI tab */}
          {activeTab === 'ai' && autoFilled && scanResult?.extractedData && (
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
                  <ButtonSpinner />
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