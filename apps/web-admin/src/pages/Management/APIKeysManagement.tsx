import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Key, Plus, Edit, Trash2, Eye, EyeOff, Copy, Save, RefreshCw } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import AdminModal from '../../components/common/AdminModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { apiKeyService, APIKey } from '../../services/apiKey.service';
import { TableLoading, ButtonSpinner } from '../../components/ui/AppLoading';
import StatusBadge from '../../components/common/StatusBadge';
import { formatVietnamDateTime } from '../../utils/dateTime';

const APIKeysManagement: React.FC = () => {
  const { showToast } = useToast();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewKeyModalOpen, setIsViewKeyModalOpen] = useState(false);
  const [newKey, setNewKey] = useState<string>('');
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<APIKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
    rate_limit: 1000,
    expires_at: '',
  });

  const availablePermissions = [
    'read:members',
    'write:members',
    'read:classes',
    'write:classes',
    'read:equipment',
    'write:equipment',
    'read:reports',
    'admin:all',
  ];

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      setLoading(true);
      const response = await apiKeyService.getAPIKeys();
      if (response.success && response.data) {
        // Mask keys for security
        const maskedKeys = response.data.map(key => ({
          ...key,
          key: key.key_prefix ? `${key.key_prefix}***` : '***',
        }));
        setApiKeys(maskedKeys);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách API keys', 'error');
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedKey(null);
    setNewKey('');
    setFormData({
      name: '',
      permissions: [],
      rate_limit: 1000,
      expires_at: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (key: APIKey) => {
    setSelectedKey(key);
    setFormData({
      name: key.name,
      permissions: key.permissions,
      rate_limit: key.rate_limit || 1000,
      expires_at: key.expires_at ? key.expires_at.split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (selectedKey) {
        await apiKeyService.updateAPIKey(selectedKey.id, formData);
        showToast('Cập nhật API key thành công', 'success');
      } else {
        const response = await apiKeyService.createAPIKey(formData);
        if (response.success && response.data) {
          setNewKey(response.data.key);
          setIsViewKeyModalOpen(true);
          showToast('Tạo API key thành công. Vui lòng lưu key này ngay!', 'success');
        }
      }
      setIsModalOpen(false);
      fetchAPIKeys();
    } catch (error: any) {
      showToast(error.message || 'Không thể lưu API key', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;
    try {
      await apiKeyService.deleteAPIKey(keyToDelete.id);
      showToast('Xóa API key thành công', 'success');
      setIsDeleteDialogOpen(false);
      setKeyToDelete(null);
      fetchAPIKeys();
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa API key', 'error');
    }
  };

  const handleRevoke = async (key: APIKey) => {
    try {
      await apiKeyService.revokeAPIKey(key.id);
      showToast('Thu hồi API key thành công', 'success');
      fetchAPIKeys();
    } catch (error: any) {
      showToast(error.message || 'Không thể thu hồi API key', 'error');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    showToast('Đã sao chép API key', 'success');
  };

  const togglePermission = (permission: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(permission)
        ? formData.permissions.filter(p => p !== permission)
        : [...formData.permissions, permission],
    });
  };

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            Quản Lý API Keys
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            Tạo và quản lý API keys cho truy cập hệ thống
          </p>
        </div>
        <AdminButton
          variant='primary'
          icon={Plus}
          onClick={handleCreate}
        >
          Tạo API key mới
        </AdminButton>
      </div>

      {/* API Keys Table */}
      <AdminCard>
        {loading ? (
          <TableLoading />
        ) : apiKeys.length === 0 ? (
          <div className='text-center py-12'>
            <Key className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-500 dark:text-gray-400'>Chưa có API key nào</p>
          </div>
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableCell>Tên</AdminTableCell>
                <AdminTableCell>Key Prefix</AdminTableCell>
                <AdminTableCell>Quyền</AdminTableCell>
                <AdminTableCell>Rate Limit</AdminTableCell>
                <AdminTableCell>Hết hạn</AdminTableCell>
                <AdminTableCell>Lần sử dụng cuối</AdminTableCell>
                <AdminTableCell>Trạng thái</AdminTableCell>
                <AdminTableCell>Thao tác</AdminTableCell>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              {apiKeys.map(apiKey => (
                <AdminTableRow key={apiKey.id}>
                  <AdminTableCell className='font-medium'>{apiKey.name}</AdminTableCell>
                  <AdminTableCell className='font-mono text-sm'>{apiKey.key_prefix || '-'}</AdminTableCell>
                  <AdminTableCell>
                    <div className='flex flex-wrap gap-1'>
                      {apiKey.permissions.slice(0, 2).map(perm => (
                        <span key={perm} className='px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs'>
                          {perm.split(':')[0]}
                        </span>
                      ))}
                      {apiKey.permissions.length > 2 && (
                        <span className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs'>
                          +{apiKey.permissions.length - 2}
                        </span>
                      )}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>{apiKey.rate_limit || '-'}</AdminTableCell>
                  <AdminTableCell>
                    {apiKey.expires_at ? formatVietnamDateTime(apiKey.expires_at) : 'Không hết hạn'}
                  </AdminTableCell>
                  <AdminTableCell>
                    {apiKey.last_used_at ? formatVietnamDateTime(apiKey.last_used_at) : 'Chưa sử dụng'}
                  </AdminTableCell>
                  <AdminTableCell>
                    <StatusBadge status={apiKey.is_active ? 'active' : 'inactive'} />
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className='flex items-center gap-2'>
                      <AdminButton
                        variant='outline'
                        size='sm'
                        icon={Edit}
                        onClick={() => handleEdit(apiKey)}
                      >
                        Sửa
                      </AdminButton>
                      <AdminButton
                        variant='danger'
                        size='sm'
                        icon={RefreshCw}
                        onClick={() => handleRevoke(apiKey)}
                      >
                        Thu hồi
                      </AdminButton>
                      <AdminButton
                        variant='danger'
                        size='sm'
                        icon={Trash2}
                        onClick={() => {
                          setKeyToDelete(apiKey);
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

      {/* Create/Edit Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedKey ? 'Sửa API key' : 'Tạo API key mới'}
        size='lg'
      >
        <div className='space-y-4'>
          <AdminInput
            label='Tên API key'
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder='Ví dụ: Production API Key'
          />
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Quyền truy cập
            </label>
            <div className='grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-48 overflow-y-auto'>
              {availablePermissions.map(permission => (
                <label key={permission} className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={formData.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className='w-4 h-4'
                  />
                  <span className='text-sm text-gray-700 dark:text-gray-300'>{permission}</span>
                </label>
              ))}
            </div>
          </div>
          <AdminInput
            label='Rate Limit (requests/hour)'
            type='number'
            value={formData.rate_limit.toString()}
            onChange={e => setFormData({ ...formData, rate_limit: parseInt(e.target.value) || 1000 })}
          />
          <AdminInput
            label='Ngày hết hạn (tùy chọn)'
            type='date'
            value={formData.expires_at}
            onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
          />
          <div className='flex justify-end gap-2 pt-4 border-t'>
            <AdminButton variant='outline' onClick={() => setIsModalOpen(false)}>
              Hủy
            </AdminButton>
            <AdminButton variant='primary' icon={Save} onClick={handleSave} disabled={isSaving}>
              {isSaving ? <ButtonSpinner /> : 'Lưu'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* View New Key Modal */}
      <AdminModal
        isOpen={isViewKeyModalOpen}
        onClose={() => setIsViewKeyModalOpen(false)}
        title='API Key đã được tạo'
        size='md'
      >
        <div className='space-y-4'>
          <div className='p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg'>
            <p className='text-sm text-orange-800 dark:text-orange-300 font-medium mb-2'>
              ⚠️ Lưu ý quan trọng
            </p>
            <p className='text-sm text-orange-700 dark:text-orange-400'>
              API key này chỉ hiển thị một lần duy nhất. Vui lòng sao chép và lưu trữ an toàn.
            </p>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              API Key
            </label>
            <div className='flex items-center gap-2'>
              <input
                type={showKey['new'] ? 'text' : 'password'}
                value={newKey}
                readOnly
                className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-sm'
              />
              <AdminButton
                variant='outline'
                size='sm'
                icon={showKey['new'] ? EyeOff : Eye}
                onClick={() => setShowKey({ ...showKey, new: !showKey['new'] })}
              />
              <AdminButton
                variant='outline'
                size='sm'
                icon={Copy}
                onClick={() => handleCopyKey(newKey)}
              >
                Copy
              </AdminButton>
            </div>
          </div>
          <div className='flex justify-end pt-4 border-t'>
            <AdminButton variant='primary' onClick={() => setIsViewKeyModalOpen(false)}>
              Đã lưu
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setKeyToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xóa API key'
        message={`Bạn có chắc chắn muốn xóa API key "${keyToDelete?.name}"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
      />
    </div>
  );
};

export default APIKeysManagement;

