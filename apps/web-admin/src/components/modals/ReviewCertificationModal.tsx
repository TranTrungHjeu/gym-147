import { AlertCircle, Award, Calendar, CheckCircle, Clock, Download, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Certification, certificationService } from '../../services/certification.service';
import Modal from '../Modal/Modal';
import { ButtonSpinner } from '../ui/AppLoading';

// Custom scrollbar styles for review modal
const scrollbarStyles = `
  .review-modal-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .review-modal-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .review-modal-scroll::-webkit-scrollbar-thumb {
    background-color: #f97316;
    border-radius: 3px;
  }
  .review-modal-scroll::-webkit-scrollbar-thumb:hover {
    background-color: #ea580c;
  }
  .dark .review-modal-scroll::-webkit-scrollbar-thumb {
    background-color: #fb923c;
  }
  .dark .review-modal-scroll::-webkit-scrollbar-thumb:hover {
    background-color: #f97316;
  }
  .certificate-image-scroll::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .certificate-image-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .certificate-image-scroll::-webkit-scrollbar-thumb {
    background-color: #f97316;
    border-radius: 3px;
  }
  .certificate-image-scroll::-webkit-scrollbar-thumb:hover {
    background-color: #ea580c;
  }
  .dark .certificate-image-scroll::-webkit-scrollbar-thumb {
    background-color: #fb923c;
  }
  .dark .certificate-image-scroll::-webkit-scrollbar-thumb:hover {
    background-color: #f97316;
  }
`;

interface ReviewCertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  certification: Certification | null;
  trainerName?: string;
  onReviewComplete: () => void;
}

const ReviewCertificationModal: React.FC<ReviewCertificationModalProps> = ({
  isOpen,
  onClose,
  certification,
  trainerName,
  onReviewComplete,
}) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [certData, setCertData] = useState<Certification | null>(certification);

  useEffect(() => {
    if (isOpen && certification) {
      setCertData(certification);
      setRejectionReason('');
      setShowRejectInput(false);
      // Reload certification data to ensure it's up to date
      loadCertification();
    }
  }, [isOpen, certification]);

  const loadCertification = async () => {
    if (!certification?.id) return;
    try {
      const data = await certificationService.getCertificationById(certification.id);
      setCertData(data);
    } catch (error) {
      console.error('Error loading certification:', error);
    }
  };

  const getCurrentUserId = (): string => {
    const user = localStorage.getItem('user') || localStorage.getItem('userData');
    if (user) {
      const userData = JSON.parse(user);
      return userData.id || userData.userId;
    }
    return '';
  };

  const handleVerify = async () => {
    if (!certData) return;

    setIsLoading(true);
    try {
      const userId = getCurrentUserId();
      const updatedCert = await certificationService.verifyCertification(certData.id, userId);
      
      // Optimistic update: Dispatch event immediately for instant UI update
      const updatedEvent = new CustomEvent('certification:updated', {
        detail: {
          id: updatedCert.id,
          certification_id: updatedCert.id,
          trainer_id: updatedCert.trainer_id,
          category: updatedCert.category,
          verification_status: updatedCert.verification_status,
          verified_by: updatedCert.verified_by,
          verified_at: updatedCert.verified_at,
          updated_at: updatedCert.updated_at,
        },
      });
      window.dispatchEvent(updatedEvent);
      console.log(`[SUCCESS] [REVIEW_CERT_MODAL] Dispatched optimistic certification:updated event for ${updatedCert.id} (VERIFIED)`);
      
      showToast('Đã duyệt chứng chỉ thành công', 'success');
      onReviewComplete();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Không thể duyệt chứng chỉ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!certData || !rejectionReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const userId = getCurrentUserId();
      const updatedCert = await certificationService.rejectCertification(certData.id, userId, rejectionReason.trim());
      
      // Optimistic update: Dispatch event immediately for instant UI update
      const updatedEvent = new CustomEvent('certification:updated', {
        detail: {
          id: updatedCert.id,
          certification_id: updatedCert.id,
          trainer_id: updatedCert.trainer_id,
          category: updatedCert.category,
          verification_status: updatedCert.verification_status,
          rejection_reason: updatedCert.rejection_reason,
          verified_by: updatedCert.verified_by,
          verified_at: updatedCert.verified_at,
          updated_at: updatedCert.updated_at,
        },
      });
      window.dispatchEvent(updatedEvent);
      console.log(`[SUCCESS] [REVIEW_CERT_MODAL] Dispatched optimistic certification:updated event for ${updatedCert.id} (REJECTED)`);
      
      showToast('Đã từ chối chứng chỉ', 'success');
      onReviewComplete();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Không thể từ chối chứng chỉ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      CARDIO: 'Tim mạch',
      STRENGTH: 'Sức mạnh',
      YOGA: 'Yoga',
      PILATES: 'Pilates',
      DANCE: 'Khiêu vũ',
      MARTIAL_ARTS: 'Võ thuật',
      AQUA: 'Bơi lội',
      FUNCTIONAL: 'Chức năng',
      RECOVERY: 'Phục hồi',
      SPECIALIZED: 'Chuyên biệt',
    };
    return categoryMap[category] || category;
  };

  const getLevelLabel = (level: string) => {
    const levelMap: Record<string, string> = {
      BASIC: 'Cơ bản',
      INTERMEDIATE: 'Trung cấp',
      ADVANCED: 'Nâng cao',
      EXPERT: 'Chuyên gia',
    };
    return levelMap[level] || level;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getCertificateImageUrl = () => {
    if (!certData?.certificate_file_url) return null;
    return certificationService.getCertificateFileUrl(certData.certificate_file_url);
  };

  if (!certData) return null;

  return (
    <>
      <style>{scrollbarStyles}</style>
      <Modal isOpen={isOpen} onClose={onClose} className='max-w-4xl m-4'>
        <div className='relative w-full max-w-4xl rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl max-h-[90vh] flex flex-col'>
          {/* Header */}
          <div className='flex-shrink-0 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700 px-5 py-3.5 rounded-t-xl'>
            <div className='flex items-center gap-2.5'>
              <div className='w-9 h-9 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0'>
                <Award className='w-5 h-5 text-orange-600 dark:text-orange-400' />
              </div>
              <div className='min-w-0 flex-1'>
                <h2 className='text-base font-semibold font-heading text-gray-900 dark:text-white truncate'>
                  Duyệt chứng chỉ
                </h2>
                {trainerName && (
                  <p className='text-xs text-gray-600 dark:text-gray-400 font-heading mt-0.5 truncate'>
                    {trainerName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className='flex-1 overflow-y-auto p-5 space-y-4 review-modal-scroll'
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#f97316 transparent',
            }}
          >
            {/* Certification Info */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3.5'>
              <div className='space-y-2.5'>
                <div>
                  <label className='block text-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                    Tên chứng chỉ
                  </label>
                  <div className='px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <p className='text-sm font-heading text-gray-900 dark:text-white'>
                      {certData.certification_name}
                    </p>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                    Tổ chức cấp
                  </label>
                  <div className='px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <p className='text-sm font-heading text-gray-900 dark:text-white'>
                      {certData.certification_issuer}
                    </p>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2.5'>
                  <div>
                    <label className='block text-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                      Danh mục
                    </label>
                    <div className='px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <p className='text-sm font-heading text-gray-900 dark:text-white'>
                        {getCategoryLabel(certData.category)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className='block text-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                      Cấp độ
                    </label>
                    <div className='px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <p className='text-sm font-heading text-gray-900 dark:text-white'>
                        {getLevelLabel(certData.certification_level)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='space-y-2.5'>
                <div className='grid grid-cols-2 gap-2.5'>
                  <div>
                    <label className='block text-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                      <Calendar className='w-3 h-3 inline mr-1' />
                      Ngày cấp
                    </label>
                    <div className='px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <p className='text-sm font-heading text-gray-900 dark:text-white'>
                        {formatDate(certData.issued_date)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className='block text-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                      <Clock className='w-3 h-3 inline mr-1' />
                      Ngày hết hạn
                    </label>
                    <div className='px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <p className='text-sm font-heading text-gray-900 dark:text-white'>
                        {certData.expiration_date
                          ? formatDate(certData.expiration_date)
                          : 'Không có'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-semibold font-heading text-gray-700 dark:text-gray-300 mb-1.5'>
                    Trạng thái
                  </label>
                  <div className='px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700'>
                    <span className='inline-flex items-center gap-1.5 text-xs font-semibold font-heading text-orange-800 dark:text-orange-300'>
                      <AlertCircle className='w-4 h-4' />
                      Chờ xác thực
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificate Image */}
            {getCertificateImageUrl() && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <label className='block text-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                    Hình ảnh chứng chỉ
                  </label>
                  <a
                    href={getCertificateImageUrl() || '#'}
                    download
                    className='inline-flex items-center gap-1 px-2 py-1 text-theme-xs font-semibold font-heading text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-md transition-all duration-200'
                    title='Tải xuống'
                  >
                    <Download className='w-4 h-4' />
                    <span>Tải xuống</span>
                  </a>
                </div>
                <div
                  className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center min-h-[200px] max-h-[50vh] overflow-auto certificate-image-scroll'
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#f97316 transparent',
                  }}
                >
                  <img
                    src={getCertificateImageUrl() || ''}
                    alt='Certificate'
                    className='max-w-full max-h-[calc(35vh-60px)] w-auto h-auto object-contain rounded-md shadow-sm'
                    onError={() => {
                      console.error('Error loading certificate image');
                      showToast('Không thể tải ảnh chứng chỉ', 'error');
                    }}
                  />
                </div>
              </div>
            )}

            {/* Rejection Reason Input */}
            {showRejectInput && (
              <div className='space-y-2'>
                <label className='block text-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                  Lý do từ chối *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder='Nhập lý do từ chối chứng chỉ...'
                  rows={3}
                  className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-500 font-heading'
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-5 py-3.5 rounded-b-xl'>
            <div className='flex justify-end gap-2.5'>
              {!showRejectInput ? (
                <>
                  <button
                    type='button'
                    onClick={() => setShowRejectInput(true)}
                    disabled={isLoading}
                    className='inline-flex items-center justify-center gap-1.5 min-w-[90px] h-9 px-4 py-2 text-theme-xs font-semibold font-heading text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
                  >
                    <XCircle className='w-4 h-4' />
                    Từ chối
                  </button>
                  <button
                    type='button'
                    onClick={handleVerify}
                    disabled={isLoading}
                    className='inline-flex items-center justify-center gap-1.5 min-w-[90px] h-9 px-4 py-2 text-theme-xs font-semibold font-heading text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
                  >
                    {isLoading ? (
                      <>
                        <ButtonSpinner />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className='w-4 h-4' />
                        <span>Duyệt</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={() => {
                      setShowRejectInput(false);
                      setRejectionReason('');
                    }}
                    disabled={isLoading}
                    className='inline-flex items-center justify-center min-w-[90px] h-9 px-4 py-2 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
                  >
                    Hủy
                  </button>
                  <button
                    type='button'
                    onClick={handleReject}
                    disabled={isLoading || !rejectionReason.trim()}
                    className='inline-flex items-center justify-center gap-1.5 min-w-[110px] h-9 px-4 py-2 text-theme-xs font-semibold font-heading text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
                  >
                    {isLoading ? (
                      <>
                        <ButtonSpinner />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className='w-4 h-4' />
                        <span>Xác nhận từ chối</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ReviewCertificationModal;
