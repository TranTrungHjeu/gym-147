import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Webhook as WebhookIcon, Plus, Edit, Trash2, Play, Eye, Save, RefreshCw } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import AdminModal from '../../components/common/AdminModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { webhookService, Webhook, WebhookEvent } from '../../services/webhook.service';
import { TableLoading, ButtonSpinner } from '../../components/ui/AppLoading';
import StatusBadge from '../../components/common/StatusBadge';
import { formatVietnamDateTime } from '../../utils/dateTime';
import Pagination from '../../components/common/Pagination';

const WebhooksManagement: React.FC = () => {
  const { showToast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [eventsPage, setEventsPage] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
    is_active: true,
  });

  const availableEvents = [
    'member.created',
    'member.updated',
    'member.deleted',
    'class.booked',
    'class.cancelled',
    'payment.completed',
    'payment.failed',
    'subscription.created',
    'subscription.expired',
  ];

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await webhookService.getWebhooks();
      if (response.success && response.data) {
        setWebhooks(response.data);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách webhooks', 'error');
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (webhookId: string) => {
    try {
      setEventsLoading(true);
      const response = await webhookService.getWebhookEvents(webhookId, eventsPage, 10);
      if (response.success && response.data) {
        setEvents(response.data.events);
      }
    } catch (error: any) {
      showToast('Không thể tải lịch sử sự kiện', 'error');
    } finally {
      setEventsLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedWebhook(null);
    setFormData({
      name: '',
      url: '',
      events: [],
      secret: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || '',
      is_active: webhook.is_active,
    });
    setIsModalOpen(true);
  };

  const handleViewEvents = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setEventsPage(1);
    setIsEventsModalOpen(true);
    fetchEvents(webhook.id);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (selectedWebhook) {
        await webhookService.updateWebhook(selectedWebhook.id, formData);
        showToast('Cập nhật webhook thành công', 'success');
      } else {
        await webhookService.createWebhook(formData);
        showToast('Tạo webhook thành công', 'success');
      }
      setIsModalOpen(false);
      fetchWebhooks();
    } catch (error: any) {
      showToast(error.message || 'Không thể lưu webhook', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!webhookToDelete) return;
    try {
      await webhookService.deleteWebhook(webhookToDelete.id);
      showToast('Xóa webhook thành công', 'success');
      setIsDeleteDialogOpen(false);
      setWebhookToDelete(null);
      fetchWebhooks();
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa webhook', 'error');
    }
  };

  const handleTest = async (webhook: Webhook) => {
    try {
      const response = await webhookService.testWebhook(webhook.id);
      if (response.success) {
        showToast('Gửi test webhook thành công', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Không thể test webhook', 'error');
    }
  };

  const toggleEvent = (event: string) => {
    setFormData({
      ...formData,
      events: formData.events.includes(event)
        ? formData.events.filter(e => e !== event)
        : [...formData.events, event],
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-600 dark:text-green-400';
      case 'FAILED':
        return 'text-red-600 dark:text-red-400';
      case 'PENDING':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            Quản Lý Webhooks
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            Cấu hình webhooks để nhận thông báo sự kiện từ hệ thống
          </p>
        </div>
        <AdminButton
          variant='primary'
          icon={Plus}
          onClick={handleCreate}
        >
          Tạo webhook mới
        </AdminButton>
      </div>

      {/* Webhooks Table */}
      <AdminCard>
        {loading ? (
          <TableLoading />
        ) : webhooks.length === 0 ? (
          <div className='text-center py-12'>
            <WebhookIcon className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-500 dark:text-gray-400'>Chưa có webhook nào</p>
          </div>
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableCell>Tên</AdminTableCell>
                <AdminTableCell>URL</AdminTableCell>
                <AdminTableCell>Sự kiện</AdminTableCell>
                <AdminTableCell>Lần gửi cuối</AdminTableCell>
                <AdminTableCell>Trạng thái</AdminTableCell>
                <AdminTableCell>Thao tác</AdminTableCell>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              {webhooks.map(webhook => (
                <AdminTableRow key={webhook.id}>
                  <AdminTableCell className='font-medium'>{webhook.name}</AdminTableCell>
                  <AdminTableCell className='max-w-xs truncate font-mono text-sm'>{webhook.url}</AdminTableCell>
                  <AdminTableCell>
                    <div className='flex flex-wrap gap-1'>
                      {webhook.events.slice(0, 2).map(event => (
                        <span key={event} className='px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs'>
                          {event.split('.')[0]}
                        </span>
                      ))}
                      {webhook.events.length > 2 && (
                        <span className='px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs'>
                          +{webhook.events.length - 2}
                        </span>
                      )}
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    {webhook.last_triggered_at ? formatVietnamDateTime(webhook.last_triggered_at) : 'Chưa gửi'}
                  </AdminTableCell>
                  <AdminTableCell>
                    <StatusBadge status={webhook.is_active ? 'active' : 'inactive'} />
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className='flex items-center gap-2'>
                      <AdminButton
                        variant='outline'
                        size='sm'
                        icon={Eye}
                        onClick={() => handleViewEvents(webhook)}
                      >
                        Lịch sử
                      </AdminButton>
                      <AdminButton
                        variant='outline'
                        size='sm'
                        icon={Play}
                        onClick={() => handleTest(webhook)}
                      >
                        Test
                      </AdminButton>
                      <AdminButton
                        variant='outline'
                        size='sm'
                        icon={Edit}
                        onClick={() => handleEdit(webhook)}
                      >
                        Sửa
                      </AdminButton>
                      <AdminButton
                        variant='danger'
                        size='sm'
                        icon={Trash2}
                        onClick={() => {
                          setWebhookToDelete(webhook);
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
        title={selectedWebhook ? 'Sửa webhook' : 'Tạo webhook mới'}
        size='lg'
      >
        <div className='space-y-4'>
          <AdminInput
            label='Tên webhook'
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder='Ví dụ: Production Webhook'
          />
          <AdminInput
            label='URL endpoint'
            value={formData.url}
            onChange={e => setFormData({ ...formData, url: e.target.value })}
            required
            placeholder='https://example.com/webhook'
            type='url'
          />
          <AdminInput
            label='Secret (tùy chọn)'
            value={formData.secret}
            onChange={e => setFormData({ ...formData, secret: e.target.value })}
            type='password'
            placeholder='Secret để xác thực webhook'
          />
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Sự kiện cần lắng nghe
            </label>
            <div className='grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-64 overflow-y-auto'>
              {availableEvents.map(event => (
                <label key={event} className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={formData.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className='w-4 h-4'
                  />
                  <span className='text-sm text-gray-700 dark:text-gray-300'>{event}</span>
                </label>
              ))}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='is_active_webhook'
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className='w-4 h-4'
            />
            <label htmlFor='is_active_webhook' className='text-sm text-gray-700 dark:text-gray-300'>
              Kích hoạt webhook này
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

      {/* Events History Modal */}
      <AdminModal
        isOpen={isEventsModalOpen}
        onClose={() => setIsEventsModalOpen(false)}
        title={`Lịch sử sự kiện: ${selectedWebhook?.name}`}
        size='lg'
      >
        {eventsLoading ? (
          <TableLoading />
        ) : events.length === 0 ? (
          <div className='text-center py-8'>
            <p className='text-gray-500 dark:text-gray-400'>Chưa có sự kiện nào</p>
          </div>
        ) : (
          <div className='space-y-2'>
            {events.map(event => (
              <div key={event.id} className='p-3 border border-gray-200 dark:border-gray-700 rounded-lg'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='font-medium text-sm'>{event.event_type}</span>
                  <span className={`text-sm font-medium ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400 space-y-1'>
                  <p>Thời gian: {formatVietnamDateTime(event.created_at)}</p>
                  <p>Số lần thử: {event.attempts}</p>
                  {event.response_code && (
                    <p>Response Code: {event.response_code}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setWebhookToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xóa webhook'
        message={`Bạn có chắc chắn muốn xóa webhook "${webhookToDelete?.name}"?`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
      />
    </div>
  );
};

export default WebhooksManagement;

