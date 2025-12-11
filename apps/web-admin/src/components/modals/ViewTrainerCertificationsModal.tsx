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
import { EnumBadge } from '../../shared/components/ui';
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
  highlightCertificationId?: string; // Optional: ID of certification to highlight when modal opens
}

const ViewTrainerCertificationsModal: React.FC<ViewTrainerCertificationsModalProps> = ({
  isOpen,
  onClose,
  trainer,
  onCertificationDeleted,
  highlightCertificationId,
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
  const [deletingCertIds, setDeletingCertIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && trainer) {
      loadCertifications();
      setSelectedCert(null);
      setShowImageModal(false);
      setActionMenuOpen(false);
      setSelectedCertForAction(null);
      setDeletingCertIds(new Set());
    }
  }, [isOpen, trainer]);

  // Listen for certification events for optimistic updates
  useEffect(() => {
    const handleCertificationCreated = (event: CustomEvent) => {
      console.log(
        '[NOTIFY] certification:created event received in ViewTrainerCertificationsModal:',
        event.detail
      );
      const data = event.detail;

      // Check if this certification belongs to the current trainer
      if (
        (data?.trainer_id && data.trainer_id === trainer?.id) ||
        data?.certification_id ||
        data?.id
      ) {
        const certId = data.certification_id || data.id;

        setCertifications(prev => {
          // Check if certification already exists
          const exists = prev.some(cert => cert.id === certId);
          if (exists) {
            // Update existing certification
            return prev.map(cert => {
              if (cert.id === certId) {
                return {
                  ...cert,
                  category: data.category || cert.category,
                  certification_name: data.certification_name || cert.certification_name,
                  certification_issuer: data.certification_issuer || cert.certification_issuer,
                  certification_level: data.certification_level || cert.certification_level,
                  verification_status: data.verification_status || cert.verification_status,
                  certificate_file_url: data.certificate_file_url || cert.certificate_file_url,
                  issued_date: data.issued_date || cert.issued_date,
                  expiration_date: data.expiration_date || cert.expiration_date,
                  updated_at: data.updated_at || new Date().toISOString(),
                };
              }
              return cert;
            });
          }

          // Add new certification at the correct position according to backend sort logic:
          // 1. category: 'asc'
          // 2. verification_status: 'asc' (VERIFIED first, then PENDING, REJECTED)
          // 3. certification_level: 'desc' (Higher level first)
          // 4. expiration_date: 'desc' (Later expiration first, nulls last)
          // 5. created_at: 'desc' (Newer first)
          const newCert: Certification = {
            id: certId,
            trainer_id: data.trainer_id || trainer?.id || '',
            category: data.category || '',
            certification_name: data.certification_name || 'New Certification',
            certification_issuer: data.certification_issuer || '',
            certification_level: (data.certification_level as any) || 'BASIC',
            issued_date: data.issued_date || new Date().toISOString(),
            expiration_date: data.expiration_date,
            verification_status: data.verification_status || 'PENDING',
            certificate_file_url: data.certificate_file_url,
            is_active: data.is_active !== undefined ? data.is_active : true,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          };

          // Helper function to compare certifications according to backend sort logic
          const compareCerts = (a: Certification, b: Certification): number => {
            const statusOrder: Record<string, number> = {
              VERIFIED: 0,
              PENDING: 1,
              REJECTED: 2,
              EXPIRED: 3,
              SUSPENDED: 4,
            };
            const levelOrder: Record<string, number> = {
              EXPERT: 4,
              ADVANCED: 3,
              INTERMEDIATE: 2,
              BASIC: 1,
            };

            // 1. Sort by category (asc)
            if (a.category !== b.category) {
              return a.category.localeCompare(b.category);
            }

            // 2. Sort by verification_status (asc - VERIFIED first)
            const statusA = statusOrder[a.verification_status] ?? 99;
            const statusB = statusOrder[b.verification_status] ?? 99;
            if (statusA !== statusB) {
              return statusA - statusB;
            }

            // 3. Sort by certification_level (desc - higher first)
            const levelA = levelOrder[a.certification_level] ?? 0;
            const levelB = levelOrder[b.certification_level] ?? 0;
            if (levelA !== levelB) {
              return levelB - levelA;
            }

            // 4. Sort by expiration_date (desc - later first, nulls last)
            if (a.expiration_date && b.expiration_date) {
              const dateA = new Date(a.expiration_date).getTime();
              const dateB = new Date(b.expiration_date).getTime();
              if (dateA !== dateB) {
                return dateB - dateA;
              }
            } else if (a.expiration_date && !b.expiration_date) {
              return -1;
            } else if (!a.expiration_date && b.expiration_date) {
              return 1;
            }

            // 5. Sort by created_at (desc - newer first)
            const createdA = new Date(a.created_at).getTime();
            const createdB = new Date(b.created_at).getTime();
            return createdB - createdA;
          };

          // Find the correct position to insert the new certification
          let insertIndex = 0;
          for (let i = 0; i < prev.length; i++) {
            if (compareCerts(newCert, prev[i]) < 0) {
              insertIndex = i;
              break;
            }
            insertIndex = i + 1;
          }

          // Insert at the correct position
          const updated = [...prev];
          updated.splice(insertIndex, 0, newCert);

          console.log(
            `[SUCCESS] [VIEW_CERTS_MODAL] Added certification ${certId} optimistically at position ${insertIndex}`
          );
          return updated;
        });

        // No background reload - optimistic update is sufficient
      }
    };

    const handleCertificationUpdated = (event: CustomEvent) => {
      console.log(
        '[NOTIFY] certification:updated event received in ViewTrainerCertificationsModal:',
        event.detail
      );
      const data = event.detail;

      // Check if this certification belongs to the current trainer
      if (data?.certification_id || data?.id) {
        const certId = data.certification_id || data.id;

        setCertifications(prev => {
          const index = prev.findIndex(cert => cert.id === certId);
          if (index === -1) {
            console.log(
              `[INFO] [VIEW_CERTS_MODAL] Certification ${certId} not found in list, skipping optimistic update`
            );
            return prev;
          }

          // Update existing certification
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            verification_status: data.verification_status || updated[index].verification_status,
            verified_by: data.verified_by || updated[index].verified_by,
            verified_at: data.verified_at || updated[index].verified_at,
            rejection_reason: data.rejection_reason || updated[index].rejection_reason,
            updated_at: data.updated_at || new Date().toISOString(),
          };
          console.log(
            `[SUCCESS] [VIEW_CERTS_MODAL] Updated certification ${certId} optimistically`
          );
          return updated;
        });

        // No background reload - optimistic update is sufficient
      }
    };

    const handleCertificationDeleted = (event: CustomEvent) => {
      console.log(
        '[NOTIFY] certification:deleted event received in ViewTrainerCertificationsModal:',
        event.detail
      );
      const data = event.detail;

      // Check if this certification belongs to the current trainer
      if (data?.certification_id || data?.id) {
        const certId = data.certification_id || data.id;

        // Mark as deleting for animation
        setDeletingCertIds(prev => {
          const newSet = new Set(prev);
          newSet.add(certId);
          return newSet;
        });

        // Remove certification after animation
        setTimeout(() => {
          setCertifications(prev => {
            const filtered = prev.filter(cert => cert.id !== certId);
            console.log(
              `[SUCCESS] [VIEW_CERTS_MODAL] Removed certification ${certId} after animation. Remaining: ${filtered.length}`
            );
            return filtered;
          });

          // Remove from deleting set
          setDeletingCertIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(certId);
            return newSet;
          });
        }, 400); // Wait for animation to complete

        // No background reload - optimistic update is sufficient
      }
    };

    window.addEventListener('certification:created', handleCertificationCreated as EventListener);
    window.addEventListener('certification:updated', handleCertificationUpdated as EventListener);
    window.addEventListener('certification:deleted', handleCertificationDeleted as EventListener);

    return () => {
      window.removeEventListener(
        'certification:created',
        handleCertificationCreated as EventListener
      );
      window.removeEventListener(
        'certification:updated',
        handleCertificationUpdated as EventListener
      );
      window.removeEventListener(
        'certification:deleted',
        handleCertificationDeleted as EventListener
      );
    };
  }, [trainer?.id]);

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

  // Removed getStatusBadge - using EnumBadge with VERIFICATION_STATUS instead

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
    // Optimistic update: Remove certification immediately for instant UI feedback
    if (certToDelete) {
      // Remove certification immediately (optimistic update)
      setCertifications(prev => {
        const filtered = prev.filter(cert => cert.id !== certToDelete.id);
        console.log(
          `[SUCCESS] [VIEW_CERTS_MODAL] Removed certification ${certToDelete.id} optimistically. Remaining: ${filtered.length}`
        );
        return filtered;
      });

      // Mark as deleting for smooth animation (if needed)
      setDeletingCertIds(prev => {
        const newSet = new Set(prev);
        newSet.add(certToDelete.id);
        return newSet;
      });

      // Remove from deleting set after animation
      setTimeout(() => {
        setDeletingCertIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(certToDelete.id);
          return newSet;
        });
      }, 400); // Wait for fade-out animation
    }

    // Close modal immediately
    setIsDeleteModalOpen(false);
    setCertToDelete(null);

    // Call callback if provided
    if (onCertificationDeleted) {
      onCertificationDeleted();
    }

    // No background reload - optimistic update is sufficient
  };

  const handleReviewClick = (cert: Certification) => {
    setActionMenuOpen(false);
    setSelectedCertForAction(null);
    setCertToReview(cert);
    setIsReviewModalOpen(true);
  };

  const handleReviewComplete = () => {
    // No reload needed - optimistic update via socket events is sufficient
    if (onCertificationDeleted) {
      onCertificationDeleted();
    }
    setIsReviewModalOpen(false);
    setCertToReview(null);
  };

  if (!trainer) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className='max-w-7xl m-4'>
        <div
          className='relative min-w-[350px] w-full max-w-7xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl max-h-[85vh] flex flex-col'
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
                  {certifications.map((cert, index) => {
                    const isDeleting = deletingCertIds.has(cert.id);
                    const isHighlighted = highlightCertificationId === cert.id;

                    return (
                      <AdminTableRow
                        key={cert.id}
                        data-certification-id={cert.id}
                        onClick={(e?: React.MouseEvent) => {
                          if (e && !isDeleting) {
                            e.stopPropagation();
                            setSelectedCertForAction(cert);
                            setMenuPosition({ x: e.clientX, y: e.clientY });
                            setActionMenuOpen(true);
                          }
                        }}
                        className={`group relative border-l-4 transition-all duration-200 ${
                          isDeleting
                            ? 'certification-deleting pointer-events-none'
                            : 'cursor-pointer'
                        } ${
                          index % 2 === 0
                            ? 'bg-white dark:bg-gray-900'
                            : 'bg-gray-50/50 dark:bg-gray-800/50'
                        } border-l-transparent ${
                          isHighlighted
                            ? 'ring-4 ring-orange-500 ring-opacity-50 border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10'
                            : !isDeleting
                            ? 'hover:border-l-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10'
                            : ''
                        }`}
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
                          <EnumBadge
                            type='VERIFICATION_STATUS'
                            value={cert.verification_status}
                            size='sm'
                            showIcon={true}
                          />
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
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
                className='inline-flex items-center justify-center min-w-[80px] h-9 px-4 py-2 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95'
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
          className='max-w-7xl m-4'
        >
          <div className='relative w-full max-w-7xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl'>
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
                className='inline-flex items-center gap-2 px-3 py-2 text-theme-xs font-semibold font-heading text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg transition-all duration-200 flex-shrink-0'
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
