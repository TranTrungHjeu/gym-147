import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { scheduleService, ScheduleItem } from '../../services/schedule.service';
import { Calendar, Plus, Search, RefreshCw, Filter, Edit, Trash2 } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import ScheduleFormModal from '../../components/modals/ScheduleFormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import BulkOperations from '../../components/common/BulkOperations';

const ScheduleManagement: React.FC = () => {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadSchedules();
  }, [statusFilter, dateFilter]);

  const loadSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await scheduleService.getAllSchedules({
        date: dateFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      
      if (response.success) {
        const schedulesList = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.schedules || []);
        setSchedules(schedulesList);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách lịch tập', 'error');
      console.error('Error loading schedules:', error);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'IN_PROGRESS':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300';
      case 'COMPLETED':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
      case 'CANCELLED':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300';
      case 'POSTPONED':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      SCHEDULED: 'Đã lên lịch',
      IN_PROGRESS: 'Đang diễn ra',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      POSTPONED: 'Hoãn lại',
    };
    return statusMap[status] || status;
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch =
      schedule.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.room_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const paginatedSchedules = filteredSchedules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreate = () => {
    setSelectedSchedule(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (schedule: ScheduleItem) => {
    setSelectedSchedule(schedule);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (!scheduleToDelete) return;

    setIsDeleting(true);
    try {
      await scheduleService.deleteSchedule(scheduleToDelete.id);
      showToast('Xóa lịch tập thành công', 'success');
      await loadSchedules();
      setIsDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa lịch tập', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedSchedules.size === 0) return;
    setScheduleToDelete({ id: Array.from(selectedSchedules)[0] } as ScheduleItem);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async (data: Partial<ScheduleItem>) => {
    try {
      if (selectedSchedule) {
        await scheduleService.updateSchedule(selectedSchedule.id, data);
        showToast('Cập nhật lịch tập thành công', 'success');
      } else {
        await scheduleService.createSchedule(data as any);
        showToast('Tạo lịch tập thành công', 'success');
      }
      await loadSchedules();
      setIsFormModalOpen(false);
      setSelectedSchedule(null);
    } catch (error: any) {
      showToast(error.message || 'Không thể lưu lịch tập', 'error');
      throw error;
    }
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredSchedules.map(s => s.id));
    setSelectedSchedules(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedSchedules(new Set());
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedSchedules);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSchedules(newSelected);
  };

  return (
    <div className='p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold font-heading text-gray-900 dark:text-white'>
            Quản lý Lịch tập
          </h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1 font-inter'>
            Quản lý lịch tập và booking của thành viên
          </p>
        </div>
        <AdminButton variant='primary' icon={Plus} onClick={handleCreate}>
          Tạo lịch mới
        </AdminButton>
      </div>

      {/* Filters */}
      <AdminCard>
        <div className='flex gap-4 flex-wrap'>
          <AdminInput
            icon={Search}
            iconPosition='left'
            placeholder='Tìm kiếm lớp học, phòng...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='flex-1 min-w-[200px]'
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter'
          >
            <option value='all'>Tất cả trạng thái</option>
            <option value='SCHEDULED'>Đã lên lịch</option>
            <option value='IN_PROGRESS'>Đang diễn ra</option>
            <option value='COMPLETED'>Hoàn thành</option>
            <option value='CANCELLED'>Đã hủy</option>
            <option value='POSTPONED'>Hoãn lại</option>
          </select>
          <input
            type='date'
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className='px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter'
          />
          <AdminButton
            variant='secondary'
            icon={RefreshCw}
            onClick={loadSchedules}
          >
            Làm mới
          </AdminButton>
        </div>
      </AdminCard>

      {/* Schedules List */}
      {isLoading ? (
        <AdminCard>
          <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
            Đang tải...
          </div>
        </AdminCard>
      ) : filteredSchedules.length === 0 ? (
        <AdminCard>
          <div className='text-center py-12 text-gray-500 dark:text-gray-400 font-inter'>
            Không có lịch tập nào
          </div>
        </AdminCard>
      ) : (
        <>
          <AdminCard padding='none'>
            <BulkOperations
              selectedItems={Array.from(selectedSchedules)}
              totalItems={filteredSchedules.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onBulkDelete={selectedSchedules.size > 0 ? handleBulkDelete : undefined}
            />
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell>
                    <input
                      type='checkbox'
                      checked={selectedSchedules.size === filteredSchedules.length && filteredSchedules.length > 0}
                      onChange={handleSelectAll}
                      className='rounded border-gray-300 dark:border-gray-700 text-orange-600 focus:ring-orange-500'
                    />
                  </AdminTableCell>
                  <AdminTableCell>Lớp học</AdminTableCell>
                  <AdminTableCell>Phòng</AdminTableCell>
                  <AdminTableCell>Ngày giờ</AdminTableCell>
                  <AdminTableCell>Số lượng</AdminTableCell>
                  <AdminTableCell>Trạng thái</AdminTableCell>
                  <AdminTableCell className='text-right'>Thao tác</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {paginatedSchedules.map(item => (
                  <AdminTableRow key={item.id}>
                    <AdminTableCell>
                      <input
                        type='checkbox'
                        checked={selectedSchedules.has(item.id)}
                        onChange={() => handleToggleSelect(item.id)}
                        className='w-4 h-4 rounded accent-orange-600 focus:ring-orange-500 dark:bg-gray-900'
                      />
                    </AdminTableCell>
                    <AdminTableCell className='font-medium'>{item.class_name}</AdminTableCell>
                    <AdminTableCell>{item.room_name}</AdminTableCell>
                    <AdminTableCell>
                      <div className='text-sm text-gray-900 dark:text-white font-inter'>
                        {new Date(item.date).toLocaleDateString('vi-VN')}
                      </div>
                      <div className='text-sm text-gray-500 dark:text-gray-400 font-inter'>
                        {item.start_time} - {item.end_time}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-sm text-gray-900 dark:text-white font-inter'>
                        {item.current_bookings || 0} / {item.max_capacity}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='flex justify-end gap-2'>
                        <AdminButton
                          variant='outline'
                          size='sm'
                          icon={Edit}
                          onClick={() => handleEdit(item)}
                        >
                          Sửa
                        </AdminButton>
                        <AdminButton
                          variant='danger'
                          size='sm'
                          icon={Trash2}
                          onClick={() => {
                            setScheduleToDelete(item);
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
          </AdminCard>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSchedules.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </>
      )}

      {/* Form Modal */}
      <ScheduleFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedSchedule(null);
        }}
        onSave={handleSave}
        schedule={selectedSchedule}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setScheduleToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xác nhận xóa lịch tập'
        message={`Bạn có chắc chắn muốn xóa lịch tập "${scheduleToDelete?.class_name}"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ScheduleManagement;
