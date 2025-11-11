import {
  AlertCircle,
  Award,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Loader2,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Certification, certificationService } from '../../services/certification.service';
import Modal from '../Modal/Modal';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
} from '../common/AdminTable';
import DeleteCertificationModal from './DeleteCertificationModal';
import ReviewCertificationModal from './ReviewCertificationModal';

interface ViewTrainerCertificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainer: { id: string; full_name: string } | null;
  onCertificationDeleted?: () => void;
}

const ViewTrainerCertificationsModal: React.FC<ViewTrainerCertificationsModalProps> = ({
  isOpen,
  onClose,
  trainer,
  onCertificationDeleted,
}) => {
  const { showToast } = useToast();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedCertForAction, setSelectedCertForAction] = useState<Certification | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [certToDelete, setCertToDelete] = useState<Certification | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [certToReview, setCertToReview] = useState<Certification | null>(null);

  useEffect(() => {
    if (isOpen && trainer) {
      loadCertifications();
      setSelectedCert(null);
      setShowImageModal(false);
      setActionMenuOpen(false);
      setSelectedCertForAction(null);
    }
  }, [isOpen, trainer]);

  const loadCertifications = async () => {
    if (!trainer?.id) return;
    setIsLoading(true);
    try {
      const data = await certificationService.getTrainerCertifications(trainer.id);
      setCertifications(data);
    } catch (error: any) {
      showToast(error.message || 'Không thể tải danh sách chứng chỉ', 'error');
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      VERIFIED: {
        label: 'Đã xác thực',
        className:
          'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
        icon: <CheckCircle className='w-3.5 h-3.5' />,
      },
      PENDING: {
        label: 'Chờ xác thực',
        className:
          'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
        icon: <AlertCircle className='w-3.5 h-3.5' />,
      },
      REJECTED: {
        label: 'Đã từ chối',
        className:
          'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
        icon: <XCircle className='w-3.5 h-3.5' />,
      },
      EXPIRED: {
        label: 'Đã hết hạn',
        className:
          'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
        icon: <Clock className='w-3.5 h-3.5' />,
      },
      SUSPENDED: {
        label: 'Đã tạm ngưng',
        className:
          'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700',
        icon: <AlertCircle className='w-3.5 h-3.5' />,
      },
    };
    const statusInfo = statusMap[status] || statusMap.PENDING;
    return (
      <span
        className={`inline-flex items-center justify-center px-1.5 py-1 rounded-lg border ${statusInfo.className}`}
        title={statusInfo.label}
      >
        {statusInfo.icon}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getCertificateImageUrl = (cert: Certification) => {
    if (!cert.certificate_file_url) return null;
    return certificationService.getCertificateFileUrl(cert.certificate_file_url);
  };

  const handleViewImage = (cert: Certification) => {
    setSelectedCert(cert);
    setShowImageModal(true);
  };

  const handleDeleteClick = (cert: Certification) => {
    setCertToDelete(cert);
    setIsDeleteModalOpen(true);
    setActionMenuOpen(false);
    setSelectedCertForAction(null);
  };

  const handleDeleteComplete = () => {
    loadCertifications();
    if (onCertificationDeleted) {
      onCertificationDeleted();
    }
    setIsDeleteModalOpen(false);
    setCertToDelete(null);
  };

  const handleReviewClick = (cert: Certification) => {
    setActionMenuOpen(false);
    setSelectedCertForAction(null);
    setCertToReview(cert);
    setIsReviewModalOpen(true);
  };

  const handleReviewComplete = () => {
    loadCertifications();
    if (onCertificationDeleted) {
      onCertificationDeleted();
    }
    setIsReviewModalOpen(false);
    setCertToReview(null);
  };

  if (!trainer) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className='max-w-6xl m-4'>
        <div
          className='relative w-full max-w-6xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl max-h-[85vh] flex flex-col'
          style={{ willChange: 'auto' }}
        >
          {/* Header */}
          <div className='flex-shrink-0 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700 px-3 py-2.5 rounded-t-2xl'>
            <div className='flex items-center gap-2.5'>
              <div className='p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg'>
                <Award className='w-4 h-4 text-orange-600 dark:text-orange-400' />
              </div>
              <div>
                <h2 className='text-base font-bold font-heading text-gray-900 dark:text-white'>
                  Chứng chỉ của {trainer.full_name}
                </h2>
                <p className='text-[10px] text-gray-600 dark:text-gray-400 font-heading mt-0.5'>
                  {certifications.length} chứng chỉ
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className='flex-1 overflow-y-auto p-2.5 custom-scrollbar'
            style={{ position: 'relative' }}
          >
            {isLoading ? (
              <div className='flex items-center justify-center py-12'>
                <Loader2 className='w-8 h-8 text-gray-400 animate-spin' />
              </div>
            ) : certifications.length === 0 ? (
              <div className='text-center py-12'>
                <Award className='w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
                <p className='text-gray-500 dark:text-gray-400 font-heading'>
                  Trainer này chưa có chứng chỉ nào cả
                </p>
              </div>
            ) : (
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableCell header className='w-[13%]'>
                      Ngành
                    </AdminTableCell>
                    <AdminTableCell header className='w-[15%]'>
                      Cấp độ
                    </AdminTableCell>
                    <AdminTableCell header className='w-[20%]'>
                      Tên chứng chỉ
                    </AdminTableCell>
                    <AdminTableCell header className='w-[20%]'>
                      Tổ chức
                    </AdminTableCell>
                    <AdminTableCell header className='w-[12%]'>
                      Ngày cấp
                    </AdminTableCell>
                    <AdminTableCell header className='w-[12%]'>
                      Hết hạn
                    </AdminTableCell>
                    <AdminTableCell header className='w-[8%]'>
                      Logs
                    </AdminTableCell>
                  </AdminTableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {certifications.map((cert, index) => (
                    <AdminTableRow
                      key={cert.id}
                      onClick={(e?: React.MouseEvent) => {
                        if (e) {
                          e.stopPropagation();
                          setSelectedCertForAction(cert);
                          setMenuPosition({ x: e.clientX, y: e.clientY });
                          setActionMenuOpen(true);
                        }
                      }}
                      className={`group relative border-l-4 transition-all duration-200 cursor-pointer ${
                        index % 2 === 0
                          ? 'bg-white dark:bg-gray-900'
                          : 'bg-gray-50/50 dark:bg-gray-800/50'
                      } border-l-transparent hover:border-l-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                    >
                      <AdminTableCell className='overflow-hidden font-space-grotesk'>
                        <span className='font-medium'>{getCategoryLabel(cert.category)}</span>
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden font-space-grotesk'>
                        <span className='font-medium'>
                          {getLevelLabel(cert.certification_level)}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden font-space-grotesk'>
                        <span className='truncate block' title={cert.certification_name}>
                          {cert.certification_name}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden font-space-grotesk'>
                        <span className='truncate block' title={cert.certification_issuer}>
                          {cert.certification_issuer}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden font-space-grotesk'>
                        {formatDate(cert.issued_date)}
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden font-space-grotesk'>
                        {cert.expiration_date ? formatDate(cert.expiration_date) : '-'}
                      </AdminTableCell>
                      <AdminTableCell className='overflow-hidden font-space-grotesk'>
                        {getStatusBadge(cert.verification_status)}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            )}
          </div>

          {/* Footer */}
          <div className='flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 rounded-b-2xl'>
            <div className='flex justify-end'>
              <button
                type='button'
                onClick={onClose}
                className='inline-flex items-center justify-center min-w-[80px] h-9 px-4 py-2 text-[11px] font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Image Modal */}
      {showImageModal && selectedCert && getCertificateImageUrl(selectedCert) && (
        <Modal
          isOpen={showImageModal}
          onClose={() => {
            setShowImageModal(false);
            setSelectedCert(null);
          }}
          className='max-w-6xl m-4'
        >
          <div className='relative w-full max-w-6xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-gray-800 dark:to-gray-800/50 pr-16'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg'>
                  <Award className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                </div>
                <div>
                  <h3 className='text-lg font-bold font-heading text-gray-900 dark:text-white'>
                    {selectedCert.certification_name}
                  </h3>
                  <p className='text-[11px] text-gray-600 dark:text-gray-400 font-inter'>
                    Xem chứng chỉ đã tải lên
                  </p>
                </div>
              </div>
              {/* Download Button */}
              <button
                type='button'
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = getCertificateImageUrl(selectedCert) || '#';
                  link.download = `${selectedCert.certification_name.replace(/\s+/g, '_')}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className='inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg transition-all duration-200 flex-shrink-0'
                title='Tải xuống'
              >
                <Download className='w-4 h-4' />
                <span className='hidden sm:inline'>Tải xuống</span>
              </button>
            </div>
            {/* Image Container */}
            <div className='p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 min-h-[400px] max-h-[75vh] overflow-hidden'>
              <div className='relative w-full h-full flex items-center justify-center'>
                <img
                  src={getCertificateImageUrl(selectedCert) || ''}
                  alt={selectedCert.certification_name}
                  className='max-w-full max-h-[calc(75vh-120px)] w-auto h-auto object-contain rounded-lg shadow-lg'
                  onError={() => {
                    showToast('Không thể tải ảnh chứng chỉ', 'error');
                  }}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Action Menu Popup */}
      {actionMenuOpen && (
        <div
          className='fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl py-2 min-w-[180px]'
          style={{
            zIndex: 100002,
            left: `${Math.min(menuPosition.x, window.innerWidth - 200)}px`,
            top: `${Math.min(menuPosition.y + 10, window.innerHeight - 150)}px`,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
            <p className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate max-w-[200px]'>
              {selectedCertForAction?.certification_name}
            </p>
          </div>
          <div className='py-1'>
            {selectedCertForAction && getCertificateImageUrl(selectedCertForAction) && (
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  handleViewImage(selectedCertForAction);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150'
              >
                <Eye className='w-3.5 h-3.5' />
                Xem ảnh
              </button>
            )}
            {selectedCertForAction && selectedCertForAction.verification_status === 'PENDING' && (
              <button
                onClick={() => handleReviewClick(selectedCertForAction)}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-theme-xs font-semibold font-heading text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors duration-150'
              >
                <CheckCircle className='w-3.5 h-3.5' />
                Duyệt chứng chỉ
              </button>
            )}
            {selectedCertForAction && (
              <button
                onClick={() => handleDeleteClick(selectedCertForAction)}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-theme-xs font-semibold font-heading text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors duration-150'
              >
                <Trash2 className='w-3.5 h-3.5' />
                Xóa chứng chỉ
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteCertificationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCertToDelete(null);
        }}
        certification={certToDelete}
        trainerName={trainer?.full_name || ''}
        onDeleteComplete={handleDeleteComplete}
      />

      {/* Review Certification Modal */}
      {trainer && (
        <ReviewCertificationModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setCertToReview(null);
          }}
          certification={certToReview}
          trainerName={trainer.full_name}
          onReviewComplete={handleReviewComplete}
        />
      )}
    </>
  );
};

export default ViewTrainerCertificationsModal;
