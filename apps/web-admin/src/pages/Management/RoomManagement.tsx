import React, { useEffect, useState, useMemo } from 'react';
import { useToast } from '../../hooks/useToast';
import { scheduleService } from '../../services/schedule.service';
import { Search, Plus, RefreshCw, Edit, Trash2, Building2, CheckCircle2, Users, Upload, FileText, Eye } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import AdminButton from '../../components/common/AdminButton';
import AdminInput from '../../components/common/AdminInput';
import { AdminTable, AdminTableHeader, AdminTableBody, AdminTableRow, AdminTableCell } from '../../components/common/AdminTable';
import RoomFormModal from '../../components/modals/RoomFormModal';
import RoomDetailModal from '../../components/modals/RoomDetailModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import ExportButton, { ExportUtils } from '../../components/common/ExportButton';
import CustomSelect from '../../components/common/CustomSelect';
import AdminModal from '../../components/common/AdminModal';
import { TableLoading, ButtonSpinner } from '../../components/ui/AppLoading';

interface Room {
  id: string;
  name: string;
  capacity: number;
  area_sqm?: number;
  equipment: string[];
  amenities: string[];
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING' | 'RESERVED';
  maintenance_notes?: string;
}

const RoomManagement: React.FC = () => {
  const { showToast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState<Room | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedRoomForAction, setSelectedRoomForAction] = useState<Room | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const response = await scheduleService.getAllRooms();
      if (response.success) {
        const roomsList = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.rooms || []);
        setRooms(roomsList);
      }
    } catch (error: any) {
      showToast('Không thể tải danh sách phòng tập', 'error');
      console.error('Error loading rooms:', error);
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'OCCUPIED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'MAINTENANCE':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300 border-warning-200 dark:border-warning-800';
      case 'CLEANING':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'RESERVED':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Sẵn sàng';
      case 'OCCUPIED':
        return 'Đang sử dụng';
      case 'MAINTENANCE':
        return 'Bảo trì';
      case 'CLEANING':
        return 'Đang dọn dẹp';
      case 'RESERVED':
        return 'Đã đặt';
      default:
        return status;
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(room => room.status === 'AVAILABLE').length;
    const occupiedRooms = rooms.filter(room => room.status === 'OCCUPIED').length;
    const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
    
    return {
      totalRooms,
      availableRooms,
      occupiedRooms,
      totalCapacity,
    };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    if (!Array.isArray(rooms)) return [];
    
    return rooms.filter(room => {
      const matchesSearch = room?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || room?.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
  const paginatedRooms = filteredRooms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreate = () => {
    setSelectedRoom(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (room: Room) => {
    setSelectedRoom(room);
    setIsFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (!roomToDelete) return;

    setIsDeleting(true);
    try {
      await scheduleService.deleteRoom(roomToDelete.id);
      showToast('Xóa phòng tập thành công', 'success');
      await loadRooms();
      setIsDeleteDialogOpen(false);
      setRoomToDelete(null);
    } catch (error: any) {
      showToast(error.message || 'Không thể xóa phòng tập', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (data: Partial<Room>) => {
    try {
      if (selectedRoom) {
        await scheduleService.updateRoom(selectedRoom.id, data);
        showToast('Cập nhật phòng tập thành công', 'success');
      } else {
        await scheduleService.createRoom(data);
        showToast('Tạo phòng tập thành công', 'success');
      }
      await loadRooms();
      setIsFormModalOpen(false);
      setSelectedRoom(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể lưu phòng tập';
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const handleViewDetail = (room: Room) => {
    setSelectedRoomForDetail(room);
    setIsDetailModalOpen(true);
  };

  const handleExport = () => {
    const exportData = filteredRooms.map(room => ({
      'Tên phòng': room.name,
      'Sức chứa': room.capacity,
      'Diện tích (m²)': room.area_sqm || '',
      'Trạng thái': getStatusLabel(room.status),
      'Thiết bị': room.equipment?.join(' | ') || '',
      'Tiện ích': room.amenities?.join(' | ') || '',
    }));

    const columns = [
      { key: 'Tên phòng', label: 'Tên phòng' },
      { key: 'Sức chứa', label: 'Sức chứa' },
      { key: 'Diện tích (m²)', label: 'Diện tích (m²)' },
      { key: 'Trạng thái', label: 'Trạng thái' },
      { key: 'Thiết bị', label: 'Thiết bị' },
      { key: 'Tiện ích', label: 'Tiện ích' },
    ];

    ExportUtils.exportToExcel({
      format: 'excel',
      filename: `danh_sach_phong_tap_${new Date().toISOString().split('T')[0]}`,
      data: exportData,
      columns,
      title: 'Danh sách Phòng tập',
    });

    showToast('Đã xuất danh sách phòng tập', 'success');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseCSV = (csvText: string) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        showToast('File CSV không hợp lệ hoặc trống', 'error');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Parse data rows
      const data: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.every(v => !v)) continue; // Skip empty rows

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }

      // Validate and transform data
      const validatedData = data.map((row, index) => {
        const room: any = {
          name: row['Tên phòng'] || row['Ten phong'] || '',
          capacity: parseInt(row['Sức chứa'] || row['Suc chua'] || '0'),
          area_sqm: row['Diện tích (m²)'] || row['Dien tich'] ? parseFloat(row['Diện tích (m²)'] || row['Dien tich']) : undefined,
          status: row['Trạng thái'] || row['Trang thai'] || 'AVAILABLE',
          equipment: row['Thiết bị'] || row['Thiet bi'] ? (row['Thiết bị'] || row['Thiet bi']).split(';').map((e: string) => e.trim()).filter((e: string) => e) : [],
          amenities: row['Tiện ích'] || row['Tien ich'] ? (row['Tiện ích'] || row['Tien ich']).split(';').map((a: string) => a.trim()).filter((a: string) => a) : [],
        };

        // Validation
        const errors: string[] = [];
        if (!room.name) errors.push(`Dòng ${index + 2}: Tên phòng là bắt buộc`);
        if (!room.capacity || room.capacity < 1 || room.capacity > 500) {
          errors.push(`Dòng ${index + 2}: Sức chứa không hợp lệ (1-500)`);
        }
        if (room.area_sqm !== undefined && room.area_sqm < 0) {
          errors.push(`Dòng ${index + 2}: Diện tích không được âm`);
        }

        return { ...room, _errors: errors, _rowIndex: index + 2 };
      });

      const hasErrors = validatedData.some(item => item._errors && item._errors.length > 0);
      if (hasErrors) {
        const allErrors = validatedData.flatMap(item => item._errors || []);
        showToast(`Có lỗi trong file CSV:\n${allErrors.slice(0, 5).join('\n')}${allErrors.length > 5 ? '\n...' : ''}`, 'error');
      }

      setImportPreview(validatedData);
      setIsImportModalOpen(true);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      showToast('Không thể đọc file CSV', 'error');
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;

    setIsImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const roomData of importPreview) {
        if (roomData._errors && roomData._errors.length > 0) {
          errorCount++;
          continue;
        }

        try {
          await scheduleService.createRoom(roomData);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Error importing room:', error);
        }
      }

      showToast(
        `Import hoàn tất: ${successCount} thành công, ${errorCount} thất bại`,
        successCount > 0 ? 'success' : 'error'
      );

      if (successCount > 0) {
        await loadRooms();
        setIsImportModalOpen(false);
        setImportPreview([]);
      }
    } catch (error) {
      showToast('Có lỗi xảy ra khi import', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Quản lý Phòng tập
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Quản lý tất cả các phòng tập trong gym
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={loadRooms}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <RefreshCw className='w-4 h-4' />
            Làm mới
          </button>
          <button
            onClick={handleCreate}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <Plus className='w-4 h-4' />
            Thêm phòng
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Building2 className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.totalRooms}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng số phòng
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <CheckCircle2 className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.availableRooms}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Phòng sẵn sàng
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Users className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.occupiedRooms}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Phòng đang sử dụng
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          {/* Subtle corner accent */}
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          {/* Subtle left border accent */}
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              {/* Icon Container */}
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <div className='absolute inset-0 bg-orange-100 dark:bg-orange-900/30 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300'></div>
                <Users className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400 transition-transform duration-300 group-hover:scale-110' />
              </div>
              {/* Value and Label Container */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-baseline gap-1.5 mb-0.5'>
                  <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                    {stats.totalCapacity.toLocaleString()}
                  </div>
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium'>
                  Tổng sức chứa
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          {/* Search Input */}
          <div className='md:col-span-2 group relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
            <input
              type='text'
              placeholder='Tìm kiếm phòng...'
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className='w-full h-[42px] py-2.5 pl-9 pr-3 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {/* Status Filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'AVAILABLE', label: 'Sẵn sàng' },
                { value: 'OCCUPIED', label: 'Đang sử dụng' },
                { value: 'MAINTENANCE', label: 'Bảo trì' },
                { value: 'CLEANING', label: 'Đang dọn dẹp' },
                { value: 'RESERVED', label: 'Đã đặt' },
              ]}
              value={statusFilter}
              onChange={value => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
              placeholder='Tất cả trạng thái'
              className='font-inter'
            />
          </div>
        </div>
        <div className='mt-3 flex justify-end gap-2'>
          <label className='inline-flex items-center gap-2 px-4 py-2 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-orange-400 dark:hover:border-orange-600 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 cursor-pointer'>
            <Upload className='w-4 h-4' />
            Import CSV
            <input
              type='file'
              accept='.csv'
              onChange={handleFileSelect}
              className='hidden'
            />
          </label>
          <button
            onClick={handleExport}
            className='inline-flex items-center gap-2 px-4 py-2 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-orange-400 dark:hover:border-orange-600 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95'
          >
            <FileText className='w-4 h-4' />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Rooms List */}
      {isLoading ? (
        <TableLoading text='Đang tải danh sách phòng...' />
      ) : filteredRooms.length === 0 ? (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='flex flex-col items-center justify-center gap-3'>
            <Building2 className='w-12 h-12 text-gray-300 dark:text-gray-600' />
            <div className='text-theme-xs font-heading text-gray-500 dark:text-gray-400'>
              {searchTerm || statusFilter !== 'all'
                ? 'Không tìm thấy phòng nào'
                : 'Không có phòng nào'}
            </div>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={handleCreate}
                className='mt-2 inline-flex items-center gap-2 px-4 py-2 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
              >
                <Plus className='w-4 h-4' />
                Thêm phòng đầu tiên
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <AdminCard padding='none' className='admin-table-container'>
            <div
              className={`transition-opacity duration-300 ${
                isPageTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableCell header>Tên phòng</AdminTableCell>
                    <AdminTableCell header>Sức chứa</AdminTableCell>
                    <AdminTableCell header>Diện tích</AdminTableCell>
                    <AdminTableCell header>Trạng thái</AdminTableCell>
                  </AdminTableRow>
                </AdminTableHeader>
                <AdminTableBody>
                {paginatedRooms.map((room, index) => (
                  <AdminTableRow
                    key={room.id}
                    className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 cursor-pointer ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50/50 dark:bg-gray-800/50'
                    } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                    onClick={(e?: React.MouseEvent) => {
                      if (e) {
                        e.stopPropagation();
                        setSelectedRoomForAction(room);
                        setMenuPosition({ x: e.clientX, y: e.clientY });
                        setActionMenuOpen(true);
                      }
                    }}
                  >
                    <AdminTableCell className='overflow-hidden relative'>
                      {/* Hover border indicator */}
                      <div className='absolute left-0 top-0 bottom-0 w-0 group-hover:w-0.5 bg-orange-500 dark:bg-orange-500 transition-all duration-200 pointer-events-none z-0' />
                      <div className='min-w-0 flex-1 relative z-10'>
                        <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200'>
                          {room.name}
                        </div>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='flex items-center gap-1.5'>
                        <Users className='w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200' />
                        <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                          {room.capacity} người
                        </span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className='text-theme-xs font-heading text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200'>
                        {room.area_sqm ? `${room.area_sqm} m²` : '-'}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border transition-all duration-200 group-hover:scale-105 ${getStatusColor(room.status)}`}>
                        {getStatusLabel(room.status)}
                      </span>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
                </AdminTableBody>
              </AdminTable>
            </div>
          </AdminCard>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredRooms.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => {
                setIsPageTransitioning(true);
                setTimeout(() => {
                  setCurrentPage(page);
                  setTimeout(() => {
                    setIsPageTransitioning(false);
                  }, 150);
                }, 150);
              }}
              onItemsPerPageChange={(newItemsPerPage) => {
                setIsPageTransitioning(true);
                setTimeout(() => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                  setTimeout(() => {
                    setIsPageTransitioning(false);
                  }, 150);
                }, 150);
              }}
            />
          )}
        </>
      )}

      {/* Form Modal */}
      <RoomFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedRoom(null);
        }}
        onSave={handleSave}
        room={selectedRoom}
      />

      {/* Detail Modal */}
      <RoomDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRoomForDetail(null);
        }}
        room={selectedRoomForDetail}
      />

      {/* Import Preview Modal */}
      <AdminModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportPreview([]);
        }}
        title='Xem trước Import'
        size='lg'
        footer={
          <div className='flex justify-end gap-3'>
            <button
              type='button'
              onClick={() => {
                setIsImportModalOpen(false);
                setImportPreview([]);
              }}
              disabled={isImporting}
              className='px-4 py-2 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50'
            >
              Hủy
            </button>
            <button
              type='button'
              onClick={handleImport}
              disabled={isImporting || importPreview.length === 0}
              className='inline-flex items-center gap-2 px-4 py-2 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl transition-all duration-200 disabled:opacity-50'
            >
              {isImporting ? (
                <>
                  <ButtonSpinner />
                  Đang import...
                </>
              ) : (
                <>
                  <Upload className='w-4 h-4' />
                  Import ({importPreview.length} phòng)
                </>
              )}
            </button>
          </div>
        }
      >
        <div className='space-y-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400 font-inter'>
            Tìm thấy {importPreview.length} phòng trong file CSV. Vui lòng kiểm tra trước khi import.
          </p>
          <div className='max-h-96 overflow-y-auto'>
            <AdminCard padding='none'>
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableCell header>Tên phòng</AdminTableCell>
                    <AdminTableCell header>Sức chứa</AdminTableCell>
                    <AdminTableCell header>Diện tích</AdminTableCell>
                    <AdminTableCell header>Trạng thái</AdminTableCell>
                    <AdminTableCell header>Lỗi</AdminTableCell>
                  </AdminTableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {importPreview.map((room, index) => (
                    <AdminTableRow key={index}>
                      <AdminTableCell>
                        <span className='text-theme-xs font-inter text-gray-900 dark:text-white'>
                          {room.name || '-'}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className='text-theme-xs font-inter text-gray-900 dark:text-white'>
                          {room.capacity || '-'}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className='text-theme-xs font-inter text-gray-900 dark:text-white'>
                          {room.area_sqm ? `${room.area_sqm} m²` : '-'}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        <span className='text-theme-xs font-inter text-gray-900 dark:text-white'>
                          {room.status || 'AVAILABLE'}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell>
                        {room._errors && room._errors.length > 0 ? (
                          <span className='text-[10px] text-error-600 dark:text-error-400 font-inter'>
                            {room._errors.join(', ')}
                          </span>
                        ) : (
                          <span className='text-[10px] text-success-600 dark:text-success-400 font-inter'>
                            ✓
                          </span>
                        )}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </AdminCard>
          </div>
        </div>
      </AdminModal>

      {/* Action Menu Popup */}
      {actionMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => {
              setActionMenuOpen(false);
              setSelectedRoomForAction(null);
            }}
          />
          {/* Popup */}
          <div
            className='fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl py-2 min-w-[180px]'
            style={{
              left: `${Math.min(menuPosition.x, window.innerWidth - 200)}px`,
              top: `${Math.min(menuPosition.y + 10, window.innerHeight - 150)}px`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-800'>
              <p className='text-xs font-semibold font-heading text-gray-900 dark:text-white truncate max-w-[200px]'>
                {selectedRoomForAction?.name}
              </p>
            </div>
            <div className='py-1'>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  handleViewDetail(selectedRoomForAction!);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150'
              >
                <Eye className='w-3.5 h-3.5' />
                Chi tiết
              </button>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  handleEdit(selectedRoomForAction!);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150'
              >
                <Edit className='w-3.5 h-3.5' />
                Sửa
              </button>
              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  setRoomToDelete(selectedRoomForAction);
                  setIsDeleteDialogOpen(true);
                }}
                className='w-full text-left inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors duration-150'
              >
                <Trash2 className='w-3.5 h-3.5' />
                Xóa
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setRoomToDelete(null);
        }}
        onConfirm={handleDelete}
        title='Xác nhận xóa phòng tập'
        message={`Bạn có chắc chắn muốn xóa phòng "${roomToDelete?.name}"? Hành động này không thể hoàn tác.`}
        confirmText='Xóa'
        cancelText='Hủy'
        variant='danger'
        isLoading={isDeleting}
      />
    </div>
  );
};

export default RoomManagement;
