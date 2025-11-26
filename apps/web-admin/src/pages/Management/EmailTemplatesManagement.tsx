import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Mail, Plus, Edit, Trash2, Eye, Save, X } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import AdminModal from '../../components/common/AdminModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { templateService, EmailTemplate } from '../../services/template.service';
import { TableLoading, ButtonSpinner } from '../../components/ui/AppLoading';
import StatusBadge from '../../components/common/StatusBadge';

const EmailTemplatesManagement: React.FC = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    type: 'CUSTOM' as EmailTemplate['type'],
    is_active: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateService.getEmailTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách mẫu email', 'error');
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      subject: '',
      body: '',
      type: 'CUSTOM',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      type: template.type,
      is_active: template.is_active,
    });
    setIsModalOpen(true);
  };

  const handleView = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsViewModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (selectedTemplate) {
        await templateService.updateEmailTemplate(selectedTemplate.id, formData);
        showToast('Cập nhật mẫu email thành công', 'success');
      } else {
        await templateService.createEmailTemplate(formData);
        showToast('Tạo mẫu email thành công', 'success');
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (error: any) {
      showToast(error.message || 'Không thể lưu mẫu email', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await templateService.deleteEmailTemplate(templateToDelete.id);
      showToast('Xóa mẫu email thành công', 'success');
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa mẫu email', 'error');
    }
  };

  const templateTypes = [
    { value: 'WELCOME', label: 'Chào mừng' },
    { value: 'PASSWORD_RESET', label: 'Đặt lại mật khẩu' },
    { value: 'MEMBERSHIP_EXPIRY', label: 'Hết hạn thành viên' },
    { value: 'CLASS_REMINDER', label: 'Nhắc nhở lớp học' },
    { value: 'PAYMENT_RECEIPT', label: 'Hóa đơn thanh toán' },
    { value: 'CUSTOM', label: 'Tùy chỉnh' },
  ];

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            Quản Lý Mẫu Email
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            Tạo và quản lý các mẫu email tự động
          </p>
        </div>
        <AdminButton
          variant='primary'
          icon={Plus}
          onClick={handleCreate}
        >
          Tạo mẫu mới
        </AdminButton>
      </div>

      {/* Templates Table */}
      <AdminCard>
        {loading ? (
          <TableLoading />
        ) : templates.length === 0 ? (
          <div className='text-center py-12'>
            <Mail className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-500 dark:text-gray-400'>Chưa có mẫu email nào</p>
          </div>
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableCell>Tên mẫu</AdminTableCell>
                <AdminTableCell>Loại</AdminTableCell>
                <AdminTableCell>Tiêu đề</AdminTableCell>
                <AdminTableCell>Trạng thái</AdminTableCell>
                <AdminTableCell>Thao tác</AdminTableCell>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              {templates.map(template => (
                <AdminTableRow key={template.id}>
                  <AdminTableCell className='font-medium'>{template.name}</AdminTableCell>
                  <AdminTableCell>
                    {templateTypes.find(t => t.value === template.type)?.label || template.type}
                  </AdminTableCell>
                  <AdminTableCell className='max-w-xs truncate'>{template.subject}</AdminTableCell>
                  <AdminTableCell>
                    <StatusBadge status={template.is_active ? 'active' : 'inactive'} />
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className='flex items-center gap-2'>
                      <AdminButton
                        variant='outline'
                        size='sm'
                        icon={Eye}
                        onClick={() => handleView(template)}
                      >
                        Xem
                      </AdminButton>
                      <AdminButton
                        variant='outline'
                        size='sm'
                        icon={Edit}
                        onClick={() => handleEdit(template)}
                      >
                        Sửa
                      </AdminButton>
                      <AdminButton
                        variant='danger'
                        size='sm'
                        icon={Trash2}
                        onClick={() => {
                          setTemplateToDelete(template);
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
        title={selectedTemplate ? 'Sửa mẫu email' : 'Tạo mẫu email mới'}
        size='lg'
      >
        <div className='space-y-4'>
          <AdminInput
            label='Tên mẫu'
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Loại mẫu
            </label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as EmailTemplate['type'] })}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
            >
              {templateTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <AdminInput
            label='Tiêu đề email'
            value={formData.subject}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
            required
          />
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Nội dung email
            </label>
            <textarea
              value={formData.body}
              onChange={e => setFormData({ ...formData, body: e.target.value })}
              rows={10}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
              placeholder='Sử dụng {{variable}} để chèn biến động'
            />
            <p className='text-xs text-gray-500 mt-1'>
              Các biến có sẵn: {'{{name}}'}, {'{{email}}'}, {'{{date}}'}, {'{{link}}'}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='is_active'
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className='w-4 h-4'
            />
            <label htmlFor='is_active' className='text-sm text-gray-700 dark:text-gray-300'>
              Kích hoạt mẫu này
            </label>
          </div>
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

      {/* View Modal */}
      <AdminModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Xem mẫu: ${selectedTemplate?.name}`}
        size='lg'
      >
        {selectedTemplate && (
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Tiêu đề
              </label>
              <p className='text-gray-900 dark:text-white'>{selectedTemplate.subject}</p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Nội dung
              </label>
              <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-lg whitespace-pre-wrap text-gray-900 dark:text-white'>
                {selectedTemplate.body}
              </div>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Biến có sẵn
              </label>
              <div className='flex flex-wrap gap-2'>
                {selectedTemplate.variables.map((variable, index) => (
                  <span key={index} className='px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-sm'>
                    {'{{' + variable + '}}'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xóa mẫu email'
        message={`Bạn có chắc chắn muốn xóa mẫu "${templateToDelete?.name}"?`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
      />
    </div>
  );
};

export default EmailTemplatesManagement;

