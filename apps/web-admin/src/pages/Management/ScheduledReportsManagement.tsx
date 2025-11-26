import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { Calendar, Plus, Edit, Trash2, Play, Save, Clock } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import AdminModal from '../../components/common/AdminModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { scheduledReportService, ScheduledReport } from '../../services/scheduledReport.service';
import { TableLoading, ButtonSpinner } from '../../components/ui/AppLoading';
import StatusBadge from '../../components/common/StatusBadge';
import { formatVietnamDateTime } from '../../utils/dateTime';
import CustomSelect from '../../components/common/CustomSelect';

const ScheduledReportsManagement: React.FC = () => {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<ScheduledReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    report_type: 'MEMBERS' as ScheduledReport['report_type'],
    format: 'PDF' as ScheduledReport['format'],
    schedule: {
      frequency: 'DAILY' as ScheduledReport['schedule']['frequency'],
      day_of_week: 1,
      day_of_month: 1,
      time: '09:00',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    recipients: [] as string[],
    is_active: true,
  });

  const reportTypes = [
    { value: 'MEMBERS', label: 'Báo cáo Thành viên' },
    { value: 'REVENUE', label: 'Báo cáo Doanh thu' },
    { value: 'CLASSES', label: 'Báo cáo Lớp học' },
    { value: 'EQUIPMENT', label: 'Báo cáo Thiết bị' },
    { value: 'SYSTEM', label: 'Báo cáo Hệ thống' },
    { value: 'CUSTOM', label: 'Báo cáo Tùy chỉnh' },
  ];

  const frequencies = [
    { value: 'DAILY', label: 'Hàng ngày' },
    { value: 'WEEKLY', label: 'Hàng tuần' },
    { value: 'MONTHLY', label: 'Hàng tháng' },
    { value: 'CUSTOM', label: 'Tùy chỉnh' },
  ];

  const formats = [
    { value: 'PDF', label: 'PDF' },
    { value: 'EXCEL', label: 'Excel' },
    { value: 'CSV', label: 'CSV' },
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await scheduledReportService.getScheduledReports();
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách báo cáo đã lên lịch', 'error');
      console.error('Error fetching scheduled reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedReport(null);
    setFormData({
      name: '',
      report_type: 'MEMBERS',
      format: 'PDF',
      schedule: {
        frequency: 'DAILY',
        day_of_week: 1,
        day_of_month: 1,
        time: '09:00',
        timezone: 'Asia/Ho_Chi_Minh',
      },
      recipients: [],
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (report: ScheduledReport) => {
    setSelectedReport(report);
    setFormData({
      name: report.name,
      report_type: report.report_type,
      format: report.format,
      schedule: report.schedule,
      recipients: report.recipients,
      is_active: report.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (selectedReport) {
        await scheduledReportService.updateScheduledReport(selectedReport.id, formData);
        showToast('Cập nhật báo cáo đã lên lịch thành công', 'success');
      } else {
        await scheduledReportService.createScheduledReport(formData);
        showToast('Tạo báo cáo đã lên lịch thành công', 'success');
      }
      setIsModalOpen(false);
      fetchReports();
    } catch (error: any) {
      showToast(error.message || 'Không thể lưu báo cáo đã lên lịch', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;
    try {
      await scheduledReportService.deleteScheduledReport(reportToDelete.id);
      showToast('Xóa báo cáo đã lên lịch thành công', 'success');
      setIsDeleteDialogOpen(false);
      setReportToDelete(null);
      fetchReports();
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa báo cáo đã lên lịch', 'error');
    }
  };

  const handleRunNow = async (report: ScheduledReport) => {
    try {
      const response = await scheduledReportService.runScheduledReport(report.id);
      if (response.success) {
        showToast('Đã bắt đầu chạy báo cáo', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Không thể chạy báo cáo', 'error');
    }
  };

  const addRecipient = () => {
    const email = prompt('Nhập email người nhận:');
    if (email && email.includes('@')) {
      setFormData({
        ...formData,
        recipients: [...formData.recipients, email],
      });
    } else if (email) {
      showToast('Email không hợp lệ', 'error');
    }
  };

  const removeRecipient = (index: number) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter((_, i) => i !== index),
    });
  };

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            Báo Cáo Đã Lên Lịch
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            Tự động gửi báo cáo theo lịch định kỳ
          </p>
        </div>
        <AdminButton
          variant='primary'
          icon={Plus}
          onClick={handleCreate}
        >
          Tạo lịch báo cáo mới
        </AdminButton>
      </div>

      {/* Reports Table */}
      <AdminCard>
        {loading ? (
          <TableLoading />
        ) : reports.length === 0 ? (
          <div className='text-center py-12'>
            <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-500 dark:text-gray-400'>Chưa có báo cáo đã lên lịch nào</p>
          </div>
        ) : (
          <AdminTable>
            <AdminTableHeader>
              <AdminTableRow>
                <AdminTableCell>Tên</AdminTableCell>
                <AdminTableCell>Loại báo cáo</AdminTableCell>
                <AdminTableCell>Định dạng</AdminTableCell>
                <AdminTableCell>Lịch trình</AdminTableCell>
                <AdminTableCell>Người nhận</AdminTableCell>
                <AdminTableCell>Lần chạy cuối</AdminTableCell>
                <AdminTableCell>Lần chạy tiếp</AdminTableCell>
                <AdminTableCell>Trạng thái</AdminTableCell>
                <AdminTableCell>Thao tác</AdminTableCell>
              </AdminTableRow>
            </AdminTableHeader>
            <AdminTableBody>
              {reports.map(report => (
                <AdminTableRow key={report.id}>
                  <AdminTableCell className='font-medium'>{report.name}</AdminTableCell>
                  <AdminTableCell>
                    {reportTypes.find(t => t.value === report.report_type)?.label || report.report_type}
                  </AdminTableCell>
                  <AdminTableCell>{report.format}</AdminTableCell>
                  <AdminTableCell>
                    <div className='text-sm'>
                      <p>{frequencies.find(f => f.value === report.schedule.frequency)?.label}</p>
                      <p className='text-gray-500'>{report.schedule.time}</p>
                    </div>
                  </AdminTableCell>
                  <AdminTableCell>
                    <span className='text-sm'>{report.recipients.length} người nhận</span>
                  </AdminTableCell>
                  <AdminTableCell>
                    {report.last_run_at ? formatVietnamDateTime(report.last_run_at) : 'Chưa chạy'}
                  </AdminTableCell>
                  <AdminTableCell>
                    {report.next_run_at ? formatVietnamDateTime(report.next_run_at) : '-'}
                  </AdminTableCell>
                  <AdminTableCell>
                    <StatusBadge status={report.is_active ? 'active' : 'inactive'} />
                  </AdminTableCell>
                  <AdminTableCell>
                    <div className='flex items-center gap-2'>
                      <AdminButton
                        variant='outline'
                        size='sm'
                        icon={Play}
                        onClick={() => handleRunNow(report)}
                      >
                        Chạy ngay
                      </AdminButton>
                      <AdminButton
                        variant='outline'
                        size='sm'
                        icon={Edit}
                        onClick={() => handleEdit(report)}
                      >
                        Sửa
                      </AdminButton>
                      <AdminButton
                        variant='danger'
                        size='sm'
                        icon={Trash2}
                        onClick={() => {
                          setReportToDelete(report);
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
        title={selectedReport ? 'Sửa báo cáo đã lên lịch' : 'Tạo báo cáo đã lên lịch mới'}
        size='lg'
      >
        <div className='space-y-4'>
          <AdminInput
            label='Tên báo cáo'
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Loại báo cáo
            </label>
            <CustomSelect
              options={reportTypes}
              value={formData.report_type}
              onChange={value => setFormData({ ...formData, report_type: value as ScheduledReport['report_type'] })}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Định dạng
            </label>
            <CustomSelect
              options={formats}
              value={formData.format}
              onChange={value => setFormData({ ...formData, format: value as ScheduledReport['format'] })}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Tần suất
            </label>
            <CustomSelect
              options={frequencies}
              value={formData.schedule.frequency}
              onChange={value => setFormData({
                ...formData,
                schedule: { ...formData.schedule, frequency: value as ScheduledReport['schedule']['frequency'] },
              })}
            />
          </div>
          {formData.schedule.frequency === 'WEEKLY' && (
            <AdminInput
              label='Ngày trong tuần (1-7, 1=Thứ 2)'
              type='number'
              min={1}
              max={7}
              value={formData.schedule.day_of_week?.toString() || '1'}
              onChange={e => setFormData({
                ...formData,
                schedule: { ...formData.schedule, day_of_week: parseInt(e.target.value) },
              })}
            />
          )}
          {formData.schedule.frequency === 'MONTHLY' && (
            <AdminInput
              label='Ngày trong tháng (1-31)'
              type='number'
              min={1}
              max={31}
              value={formData.schedule.day_of_month?.toString() || '1'}
              onChange={e => setFormData({
                ...formData,
                schedule: { ...formData.schedule, day_of_month: parseInt(e.target.value) },
              })}
            />
          )}
          <AdminInput
            label='Thời gian'
            type='time'
            value={formData.schedule.time}
            onChange={e => setFormData({
              ...formData,
              schedule: { ...formData.schedule, time: e.target.value },
            })}
          />
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Người nhận
            </label>
            <div className='space-y-2'>
              {formData.recipients.map((email, index) => (
                <div key={index} className='flex items-center gap-2'>
                  <input
                    type='email'
                    value={email}
                    readOnly
                    className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800'
                  />
                  <AdminButton
                    variant='danger'
                    size='sm'
                    onClick={() => removeRecipient(index)}
                  >
                    Xóa
                  </AdminButton>
                </div>
              ))}
              <AdminButton variant='outline' size='sm' onClick={addRecipient}>
                + Thêm người nhận
              </AdminButton>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='is_active_report'
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className='w-4 h-4'
            />
            <label htmlFor='is_active_report' className='text-sm text-gray-700 dark:text-gray-300'>
              Kích hoạt lịch báo cáo này
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setReportToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xóa báo cáo đã lên lịch'
        message={`Bạn có chắc chắn muốn xóa báo cáo "${reportToDelete?.name}"?`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
      />
    </div>
  );
};

export default ScheduledReportsManagement;

