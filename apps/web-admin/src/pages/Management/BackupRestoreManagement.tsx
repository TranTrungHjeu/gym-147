import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Database, Download, Upload, RefreshCw, Trash2, Play, Save, HardDrive } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import AdminModal from '../../components/common/AdminModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { backupService, Backup, RestoreRequest } from '../../services/backup.service';
import { TableLoading, ButtonSpinner } from '../../components/ui/AppLoading';
import StatusBadge from '../../components/common/StatusBadge';
import { formatVietnamDateTime } from '../../utils/dateTime';
import CustomSelect from '../../components/common/CustomSelect';

const BackupRestoreManagement: React.FC = () => {
  const { showToast } = useToast();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [backupFormData, setBackupFormData] = useState({
    name: '',
    type: 'FULL' as Backup['type'],
  });

  const [restoreFormData, setRestoreFormData] = useState<RestoreRequest>({
    backup_id: '',
    restore_type: 'FULL',
    tables: [],
  });

  useEffect(() => {
    fetchBackups();
    // Poll for backup status updates
    const interval = setInterval(() => {
      fetchBackups();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await backupService.getBackups();
      if (response.success && response.data) {
        setBackups(response.data);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách backup', 'error');
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true);
      await backupService.createBackup(backupFormData);
      showToast('Đã bắt đầu tạo backup', 'success');
      setIsCreateModalOpen(false);
      setBackupFormData({ name: '', type: 'FULL' });
      fetchBackups();
    } catch (error: any) {
      showToast(error.message || 'Không thể tạo backup', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const blob = await backupService.downloadBackup(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backup.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Đã bắt đầu tải backup', 'success');
    } catch (error: any) {
      showToast('Không thể tải backup', 'error');
    }
  };

  const handleRestore = async () => {
    if (!restoreFormData.backup_id) return;
    try {
      setIsRestoring(true);
      const response = await backupService.restoreBackup(restoreFormData);
      if (response.success) {
        showToast('Đã bắt đầu khôi phục backup', 'success');
        setIsRestoreModalOpen(false);
        setRestoreFormData({ backup_id: '', restore_type: 'FULL', tables: [] });
      }
    } catch (error: any) {
      showToast(error.message || 'Không thể khôi phục backup', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!backupToDelete) return;
    try {
      await backupService.deleteBackup(backupToDelete.id);
      showToast('Xóa backup thành công', 'success');
      setIsDeleteDialogOpen(false);
      setBackupToDelete(null);
      fetchBackups();
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa backup', 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: Backup['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 dark:text-green-400';
      case 'FAILED':
        return 'text-red-600 dark:text-red-400';
      case 'IN_PROGRESS':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const backupTypes = [
    { value: 'FULL', label: 'Full Backup (Toàn bộ)' },
    { value: 'INCREMENTAL', label: 'Incremental (Tăng dần)' },
    { value: 'DATABASE_ONLY', label: 'Chỉ Database' },
    { value: 'FILES_ONLY', label: 'Chỉ Files' },
  ];

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            Sao Lưu & Khôi Phục
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            Quản lý sao lưu và khôi phục dữ liệu hệ thống
          </p>
        </div>
        <div className='flex gap-2'>
          <AdminButton
            variant='outline'
            icon={Upload}
            onClick={() => {
              setRestoreFormData({ backup_id: '', restore_type: 'FULL', tables: [] });
              setIsRestoreModalOpen(true);
            }}
          >
            Khôi phục
          </AdminButton>
          <AdminButton
            variant='primary'
            icon={Database}
            onClick={() => {
              setBackupFormData({ name: `backup-${new Date().toISOString().split('T')[0]}`, type: 'FULL' });
              setIsCreateModalOpen(true);
            }}
          >
            Tạo Backup
          </AdminButton>
        </div>
      </div>

      {/* Backups Table */}
      <AdminCard>
        {loading ? (
          <TableLoading />
        ) : backups.length === 0 ? (
          <div className='text-center py-12'>
            <HardDrive className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-500 dark:text-gray-400'>Chưa có backup nào</p>
          </div>
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableCell>Tên</AdminTableCell>
                <AdminTableCell>Loại</AdminTableCell>
                <AdminTableCell>Kích thước</AdminTableCell>
                <AdminTableCell>Trạng thái</AdminTableCell>
                <AdminTableCell>Ngày tạo</AdminTableCell>
                <AdminTableCell>Thao tác</AdminTableCell>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              {backups.map(backup => (
                <AdminTableRow key={backup.id}>
                  <AdminTableCell className='font-medium'>{backup.name}</AdminTableCell>
                  <AdminTableCell>
                    {backupTypes.find(t => t.value === backup.type)?.label || backup.type}
                  </AdminTableCell>
                  <AdminTableCell>{formatFileSize(backup.size)}</AdminTableCell>
                  <AdminTableCell>
                    <span className={`font-medium ${getStatusColor(backup.status)}`}>
                      {backup.status === 'COMPLETED' ? 'Hoàn thành' :
                       backup.status === 'FAILED' ? 'Thất bại' :
                       backup.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chờ xử lý'}
                    </span>
                    {backup.error_message && (
                      <p className='text-xs text-red-600 mt-1'>{backup.error_message}</p>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>
                    {formatVietnamDateTime(backup.created_at)}
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className='flex items-center gap-2'>
                      {backup.status === 'COMPLETED' && (
                        <>
                          <AdminButton
                            variant='outline'
                            size='sm'
                            icon={Download}
                            onClick={() => handleDownload(backup)}
                          >
                            Tải
                          </AdminButton>
                          <AdminButton
                            variant='outline'
                            size='sm'
                            icon={Play}
                            onClick={() => {
                              setRestoreFormData({ backup_id: backup.id, restore_type: 'FULL', tables: [] });
                              setIsRestoreModalOpen(true);
                            }}
                          >
                            Khôi phục
                          </AdminButton>
                        </>
                      )}
                      <AdminButton
                        variant='danger'
                        size='sm'
                        icon={Trash2}
                        onClick={() => {
                          setBackupToDelete(backup);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        Xóa
                      </AdminButton>
                    </div>
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        )}
      </AdminCard>

      {/* Create Backup Modal */}
      <AdminModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title='Tạo Backup mới'
        size='md'
      >
        <div className='space-y-4'>
          <AdminInput
            label='Tên backup'
            value={backupFormData.name}
            onChange={e => setBackupFormData({ ...backupFormData, name: e.target.value })}
            required
          />
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Loại backup
            </label>
            <CustomSelect
              options={backupTypes}
              value={backupFormData.type}
              onChange={value => setBackupFormData({ ...backupFormData, type: value as Backup['type'] })}
            />
          </div>
          <div className='p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
            <p className='text-sm text-blue-800 dark:text-blue-300'>
              [WARNING] Quá trình backup có thể mất vài phút. Vui lòng không đóng trang này.
            </p>
          </div>
          <div className='flex justify-end gap-2 pt-4 border-t'>
            <AdminButton variant='outline' onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </AdminButton>
            <AdminButton variant='primary' icon={Save} onClick={handleCreateBackup} disabled={isCreating}>
              {isCreating ? <ButtonSpinner /> : 'Tạo Backup'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* Restore Modal */}
      <AdminModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title='Khôi phục từ Backup'
        size='md'
      >
        <div className='space-y-4'>
          <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-sm text-red-800 dark:text-red-300 font-medium mb-2'>
              [WARNING] Cảnh báo
            </p>
            <p className='text-sm text-red-700 dark:text-red-400'>
              Khôi phục backup sẽ ghi đè dữ liệu hiện tại. Hãy đảm bảo bạn đã tạo backup trước khi khôi phục.
            </p>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Chọn backup
            </label>
            <select
              value={restoreFormData.backup_id}
              onChange={e => setRestoreFormData({ ...restoreFormData, backup_id: e.target.value })}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
            >
              <option value=''>Chọn backup...</option>
              {backups.filter(b => b.status === 'COMPLETED').map(backup => (
                <option key={backup.id} value={backup.id}>
                  {backup.name} - {formatVietnamDateTime(backup.created_at)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Loại khôi phục
            </label>
            <select
              value={restoreFormData.restore_type}
              onChange={e => setRestoreFormData({ ...restoreFormData, restore_type: e.target.value as 'FULL' | 'PARTIAL' })}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
            >
              <option value='FULL'>Full Restore (Toàn bộ)</option>
              <option value='PARTIAL'>Partial Restore (Một phần)</option>
            </select>
          </div>
          <div className='flex justify-end gap-2 pt-4 border-t'>
            <AdminButton variant='outline' onClick={() => setIsRestoreModalOpen(false)}>
              Hủy
            </AdminButton>
            <AdminButton
              variant='danger'
              icon={RefreshCw}
              onClick={handleRestore}
              disabled={isRestoring || !restoreFormData.backup_id}
            >
              {isRestoring ? <ButtonSpinner /> : 'Khôi phục'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setBackupToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xóa backup'
        message={`Bạn có chắc chắn muốn xóa backup "${backupToDelete?.name}"?`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
      />
    </div>
  );
};

export default BackupRestoreManagement;

