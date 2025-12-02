import React, { useState, useEffect } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import Modal from '../Modal/Modal';
import { certificationService, Certification } from '../../services/certification.service';
import { useToast } from '../../hooks/useToast';
import CustomSelect from '../common/CustomSelect';

interface DeleteCertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  certification: Certification | null;
  trainerName?: string;
  onDeleteComplete: () => void;
}

const DELETE_REASON_TEMPLATES = [
  { value: 'invalid', label: 'Chứng chỉ không hợp lệ' },
  { value: 'expired', label: 'Chứng chỉ đã hết hạn' },
  { value: 'not_meet_requirements', label: 'Chứng chỉ không đúng yêu cầu' },
  { value: 'duplicate', label: 'Chứng chỉ trùng lặp' },
  { value: 'other', label: 'Lý do khác' },
];

const DeleteCertificationModal: React.FC<DeleteCertificationModalProps> = ({
  isOpen,
  onClose,
  certification,
  trainerName,
  onDeleteComplete,
}) => {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [reason, setReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate('');
      setCustomReason('');
      setReason('');
      setDeleteConfirm('');
      setIsDeleting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTemplate === 'other') {
      setReason(customReason);
    } else if (selectedTemplate) {
      const template = DELETE_REASON_TEMPLATES.find((t) => t.value === selectedTemplate);
      setReason(template?.label || '');
    } else {
      setReason('');
    }
  }, [selectedTemplate, customReason]);

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

  const handleDelete = async () => {
    if (!certification) return;
    
    if (deleteConfirm.toLowerCase() !== 'delete') {
      showToast('Vui lòng nhập "delete" để xác nhận', 'error');
      return;
    }

    if (!reason.trim()) {
      showToast('Vui lòng chọn lý do xóa', 'error');
      return;
    }

    setIsDeleting(true);
    
    // Optimistic update: Dispatch event immediately for instant UI update
    const deleteEvent = new CustomEvent('certification:deleted', {
      detail: {
        certification_id: certification.id,
        id: certification.id,
        trainer_id: certification.trainer_id,
        category: certification.category,
        certification_name: certification.certification_name,
        deleted_at: new Date().toISOString(),
      },
    });
    window.dispatchEvent(deleteEvent);
    console.log(`[SUCCESS] [DELETE_CERT_MODAL] Dispatched optimistic certification:deleted event for ${certification.id}`);
    
    try {
      await certificationService.deleteCertification(certification.id, reason.trim());
      
      // Show success toast
      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: `Đã xóa chứng chỉ "${certification.certification_name}" thành công`,
          duration: 3000,
        });
      } else {
        showToast('Đã xóa chứng chỉ thành công', 'success');
      }
      
      // Call onDeleteComplete for additional cleanup (e.g., in ViewTrainerCertificationsModal)
      onDeleteComplete();
      onClose();
    } catch (error: any) {
      // Revert optimistic update on error by dispatching a refresh event
      const refreshEvent = new CustomEvent('certification:refresh', {
        detail: { certification_id: certification.id },
      });
      window.dispatchEvent(refreshEvent);
      
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || 'Không thể xóa chứng chỉ',
          duration: 3000,
        });
      } else {
        showToast(error.message || 'Không thể xóa chứng chỉ', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!certification) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-3xl m-4'>
      <div className='relative w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col' style={{ maxHeight: '95vh', minHeight: '500px' }}>
        {/* Header */}
        <div className='flex-shrink-0 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-b border-red-200 dark:border-red-700 px-6 py-4 rounded-t-2xl'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center'>
              <Trash2 className='w-5 h-5 text-red-600 dark:text-red-400' />
            </div>
            <div>
              <h2 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
                Xóa chứng chỉ
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-6 space-y-4'>
          {/* Delete Confirmation Input */}
          <div>
            <label className='block text-sm font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Nhập "<span className='font-mono font-bold'>delete</span>" để xác nhận
            </label>
            <input
              type='text'
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder='delete'
              className={`w-full px-4 py-2.5 text-sm border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-500 transition-all duration-200 font-heading shadow-sm hover:shadow-md ${
                deleteConfirm && deleteConfirm.toLowerCase() !== 'delete'
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700 hover:border-red-400 dark:hover:border-red-600'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && deleteConfirm.toLowerCase() === 'delete' && reason.trim() && !isDeleting) {
                  handleDelete();
                }
              }}
              autoFocus
            />
            {deleteConfirm && deleteConfirm.toLowerCase() !== 'delete' && (
              <p className='mt-1.5 text-xs text-red-600 dark:text-red-400 font-heading'>
                Vui lòng nhập đúng "delete"
              </p>
            )}
          </div>

          {/* Reason Selection */}
          <div className='space-y-2'>
            <label className='block text-sm font-semibold font-heading text-gray-900 dark:text-white'>
              Lý do xóa <span className='text-red-500'>*</span>
            </label>
            <CustomSelect
              value={selectedTemplate}
              onChange={(value) => setSelectedTemplate(value)}
              options={DELETE_REASON_TEMPLATES.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
              placeholder='Chọn lý do xóa...'
              className='w-full'
            />
            {selectedTemplate === 'other' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder='Nhập lý do xóa...'
                rows={3}
                className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 dark:focus:border-red-500 font-inter resize-none'
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-6 py-4 rounded-b-2xl'>
          <div className='flex justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              disabled={isDeleting}
              className='inline-flex items-center justify-center min-w-[100px] h-10 px-5 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
            >
              Hủy
            </button>
            <button
              type='button'
              onClick={handleDelete}
              disabled={isDeleting || !reason.trim() || deleteConfirm.toLowerCase() !== 'delete'}
              className='inline-flex items-center justify-center gap-2 min-w-[120px] h-10 px-5 py-2.5 text-theme-xs font-semibold font-heading text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
            >
              {isDeleting ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <Trash2 className='w-4 h-4' />
                  <span>Xóa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteCertificationModal;

