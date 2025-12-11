import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';
import { Database, Download, Upload, RefreshCw, Trash2, Play, Save, HardDrive } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import {
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
} from '../../components/common/AdminTable';
import AdminModal from '../../components/common/AdminModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { backupService, Backup, RestoreRequest } from '../../services/backup.service';
import { TableLoading, ButtonSpinner } from '../../components/ui/AppLoading';
import { EnumBadge } from '../../shared/components/ui';
import { formatVietnamDateTime } from '../../utils/dateTime';
import CustomSelect from '../../components/common/CustomSelect';

const BackupRestoreManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
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
      showToast(t('backupRestoreManagement.messages.loadError'), 'error');
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true);
      await backupService.createBackup(backupFormData);
      showToast(t('backupRestoreManagement.messages.createSuccess'), 'success');
      setIsCreateModalOpen(false);
      setBackupFormData({ name: '', type: 'FULL' });
      fetchBackups();
    } catch (error: any) {
      showToast(error.message || t('backupRestoreManagement.messages.createError'), 'error');
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
      showToast(t('backupRestoreManagement.messages.downloadSuccess'), 'success');
    } catch (error: any) {
      showToast(t('backupRestoreManagement.messages.downloadError'), 'error');
    }
  };

  const handleRestore = async () => {
    if (!restoreFormData.backup_id) return;
    try {
      setIsRestoring(true);
      const response = await backupService.restoreBackup(restoreFormData);
      if (response.success) {
        showToast(t('backupRestoreManagement.messages.restoreSuccess'), 'success');
        setIsRestoreModalOpen(false);
        setRestoreFormData({ backup_id: '', restore_type: 'FULL', tables: [] });
      }
    } catch (error: any) {
      showToast(error.message || t('backupRestoreManagement.messages.restoreError'), 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!backupToDelete) return;
    try {
      await backupService.deleteBackup(backupToDelete.id);
      showToast(t('backupRestoreManagement.messages.deleteSuccess'), 'success');
      setIsDeleteDialogOpen(false);
      setBackupToDelete(null);
      fetchBackups();
    } catch (error: any) {
      showToast(error.message || t('backupRestoreManagement.messages.deleteError'), 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusEnumType = (
    status: Backup['status']
  ): { type: 'REPORT_STATUS' | 'PAYMENT_STATUS' | 'SCHEDULE_STATUS'; value: string } => {
    switch (status) {
      case 'COMPLETED':
        return { type: 'SCHEDULE_STATUS', value: 'COMPLETED' };
      case 'FAILED':
        return { type: 'PAYMENT_STATUS', value: 'FAILED' };
      case 'IN_PROGRESS':
        return { type: 'REPORT_STATUS', value: 'IN_PROGRESS' };
      default:
        return { type: 'REPORT_STATUS', value: 'PENDING' };
    }
  };

  const backupTypes = [
    { value: 'FULL', label: t('backupRestoreManagement.types.FULL') },
    { value: 'INCREMENTAL', label: t('backupRestoreManagement.types.INCREMENTAL') },
    { value: 'DATABASE_ONLY', label: t('backupRestoreManagement.types.DATABASE_ONLY') },
    { value: 'FILES_ONLY', label: t('backupRestoreManagement.types.FILES_ONLY') },
  ];

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            {t('backupRestoreManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            {t('backupRestoreManagement.subtitle')}
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
            {t('backupRestoreManagement.actions.restore')}
          </AdminButton>
          <AdminButton
            variant='primary'
            icon={Database}
            onClick={() => {
              setBackupFormData({
                name: `backup-${new Date().toISOString().split('T')[0]}`,
                type: 'FULL',
              });
              setIsCreateModalOpen(true);
            }}
          >
            {t('backupRestoreManagement.actions.create')}
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
            <p className='text-gray-500 dark:text-gray-400'>
              {t('backupRestoreManagement.empty.noBackups')}
            </p>
          </div>
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableCell>{t('backupRestoreManagement.table.name')}</AdminTableCell>
                <AdminTableCell>{t('backupRestoreManagement.table.type')}</AdminTableCell>
                <AdminTableCell>{t('backupRestoreManagement.table.size')}</AdminTableCell>
                <AdminTableCell>{t('backupRestoreManagement.table.status')}</AdminTableCell>
                <AdminTableCell>{t('backupRestoreManagement.table.createdAt')}</AdminTableCell>
                <AdminTableCell>{t('backupRestoreManagement.table.actions')}</AdminTableCell>
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
                    {(() => {
                      const statusEnum = getStatusEnumType(backup.status);
                      return (
                        <EnumBadge
                          type={statusEnum.type}
                          value={statusEnum.value}
                          size='sm'
                          showIcon={true}
                        />
                      );
                    })()}
                    {backup.error_message && (
                      <p className='text-xs text-red-600 mt-1'>{backup.error_message}</p>
                    )}
                  </AdminTableCell>
                  <AdminTableCell>{formatVietnamDateTime(backup.created_at)}</AdminTableCell>
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
                            {t('backupRestoreManagement.actions.download')}
                          </AdminButton>
                          <AdminButton
                            variant='outline'
                            size='sm'
                            icon={Play}
                            onClick={() => {
                              setRestoreFormData({
                                backup_id: backup.id,
                                restore_type: 'FULL',
                                tables: [],
                              });
                              setIsRestoreModalOpen(true);
                            }}
                          >
                            {t('backupRestoreManagement.actions.restore')}
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
                        {t('backupRestoreManagement.actions.delete')}
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
        title={t('backupRestoreManagement.form.createTitle')}
        size='md'
      >
        <div className='space-y-4'>
          <AdminInput
            label={t('backupRestoreManagement.form.name')}
            value={backupFormData.name}
            onChange={e => setBackupFormData({ ...backupFormData, name: e.target.value })}
            required
          />
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              {t('backupRestoreManagement.form.type')}
            </label>
            <CustomSelect
              options={backupTypes}
              value={backupFormData.type}
              onChange={value =>
                setBackupFormData({ ...backupFormData, type: value as Backup['type'] })
              }
            />
          </div>
          <div className='p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
            <p className='text-sm text-blue-800 dark:text-blue-300'>
              {t('backupRestoreManagement.form.warning')}
            </p>
          </div>
          <div className='flex justify-end gap-2 pt-4 border-t'>
            <AdminButton variant='outline' onClick={() => setIsCreateModalOpen(false)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton
              variant='primary'
              icon={Save}
              onClick={handleCreateBackup}
              disabled={isCreating}
            >
              {isCreating ? <ButtonSpinner /> : t('backupRestoreManagement.actions.create')}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* Restore Modal */}
      <AdminModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title={t('backupRestoreManagement.form.restoreTitle')}
        size='md'
      >
        <div className='space-y-4'>
          <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
            <p className='text-sm text-red-800 dark:text-red-300 font-medium mb-2'>
              {t('backupRestoreManagement.form.restoreWarningTitle')}
            </p>
            <p className='text-sm text-red-700 dark:text-red-400'>
              {t('backupRestoreManagement.form.restoreWarningMessage')}
            </p>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              {t('backupRestoreManagement.form.selectBackup')}
            </label>
            <select
              value={restoreFormData.backup_id}
              onChange={e => setRestoreFormData({ ...restoreFormData, backup_id: e.target.value })}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
            >
              <option value=''>{t('backupRestoreManagement.form.selectBackupPlaceholder')}</option>
              {backups
                .filter(b => b.status === 'COMPLETED')
                .map(backup => (
                  <option key={backup.id} value={backup.id}>
                    {backup.name} - {formatVietnamDateTime(backup.created_at)}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              {t('backupRestoreManagement.form.restoreType')}
            </label>
            <select
              value={restoreFormData.restore_type}
              onChange={e =>
                setRestoreFormData({
                  ...restoreFormData,
                  restore_type: e.target.value as 'FULL' | 'PARTIAL',
                })
              }
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
            >
              <option value='FULL'>{t('backupRestoreManagement.restoreTypes.FULL')}</option>
              <option value='PARTIAL'>{t('backupRestoreManagement.restoreTypes.PARTIAL')}</option>
            </select>
          </div>
          <div className='flex justify-end gap-2 pt-4 border-t'>
            <AdminButton variant='outline' onClick={() => setIsRestoreModalOpen(false)}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton
              variant='danger'
              icon={RefreshCw}
              onClick={handleRestore}
              disabled={isRestoring || !restoreFormData.backup_id}
            >
              {isRestoring ? <ButtonSpinner /> : t('backupRestoreManagement.actions.restore')}
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
        title={t('backupRestoreManagement.delete.confirmTitle')}
        message={t('backupRestoreManagement.delete.confirmMessage', {
          name: backupToDelete?.name || '',
        })}
        confirmText={t('backupRestoreManagement.actions.delete')}
        cancelText={t('common.cancel')}
        variant='danger'
      />
    </div>
  );
};

export default BackupRestoreManagement;
