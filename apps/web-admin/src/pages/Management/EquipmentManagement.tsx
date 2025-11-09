import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Filter,
  Hash,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
  Weight,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Modal from '../../components/Modal/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CustomSelect from '../../components/common/CustomSelect';
import EquipmentIcon from '../../components/equipment/EquipmentIcon';
import EquipmentFormModal from '../../components/modals/EquipmentFormModal';
import useTranslation from '../../hooks/useTranslation';
import { Equipment, equipmentService } from '../../services/equipment.service';

const EquipmentManagement: React.FC = () => {
  const { t } = useTranslation();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [equipmentUsers, setEquipmentUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedEquipmentForUsers, setSelectedEquipmentForUsers] = useState<Equipment | null>(
    null
  );

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      setIsLoading(true);
      const response = await equipmentService.getAllEquipment();
      if (response.success) {
        const equipmentList = Array.isArray(response.data)
          ? response.data
          : response.data?.equipment || [];
        // Ensure usage_logs are preserved from backend response
        const equipmentWithUsageLogs = equipmentList.map((eq: any) => {
          // Log to debug usage_logs
          if (eq.usage_logs && eq.usage_logs.length > 0) {
            console.log(
              `📊 Equipment ${eq.name} has ${eq.usage_logs.length} usage log(s)`,
              eq.usage_logs[0]
            );
          }
          return {
            ...eq,
            usage_logs: eq.usage_logs || [],
          };
        });
        setEquipment(equipmentWithUsageLogs);
      }
    } catch (error: any) {
      console.error('Error loading equipment:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('equipmentManagement.messages.loadError'),
          duration: 3000,
        });
      }
      setEquipment([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800 shadow-sm';
      case 'IN_USE':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm';
      case 'MAINTENANCE':
        return 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-800 shadow-sm';
      case 'OUT_OF_ORDER':
        return 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800 shadow-sm';
      case 'RESERVED':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CARDIO':
        return 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800';
      case 'STRENGTH':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'FREE_WEIGHTS':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'FUNCTIONAL':
        return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800';
      case 'STRETCHING':
        return 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800';
      case 'RECOVERY':
        return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
      case 'SPECIALIZED':
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const filteredEquipment = Array.isArray(equipment)
    ? equipment.filter(eq => {
        const matchesSearch =
          eq?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          eq?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          eq?.location?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || eq?.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || eq?.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
      })
    : [];

  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const paginatedEquipment = filteredEquipment.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreate = () => {
    setSelectedEquipment(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setIsFormModalOpen(true);
  };

  const handleViewUsers = async (eq: Equipment) => {
    setSelectedEquipmentForUsers(eq);
    setIsUsersModalOpen(true);
    setIsLoadingUsers(true);
    try {
      // Fetch equipment by ID to get usage logs with member info
      console.log('🔍 Fetching equipment users for:', eq.id);
      const response = await equipmentService.getEquipmentById(eq.id);
      console.log('📦 Response:', response);
      if (response.success) {
        // Response can be { equipment: Equipment } or Equipment directly
        const equipmentData = (response.data as any)?.equipment || response.data;
        console.log('📋 Equipment data:', equipmentData);
        console.log('📊 Usage logs:', equipmentData?.usage_logs);
        if (equipmentData?.usage_logs && equipmentData.usage_logs.length > 0) {
          console.log('✅ Found usage logs:', equipmentData.usage_logs.length);
          setEquipmentUsers(equipmentData.usage_logs || []);
        } else {
          console.log('⚠️ No usage logs found');
          setEquipmentUsers([]);
        }
      } else {
        console.log('❌ Response not successful');
        setEquipmentUsers([]);
      }
    } catch (error) {
      console.error('Error fetching equipment users:', error);
      setEquipmentUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Calculate time since last maintenance or until next maintenance
  const getMaintenanceStatus = (nextMaintenance?: string) => {
    if (!nextMaintenance) return null;

    const now = new Date();
    const nextDate = new Date(nextMaintenance);
    const isOverdue = now > nextDate;

    const diffMs = Math.abs(now.getTime() - nextDate.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMonths > 0) {
      return {
        text: `${diffMonths} ${
          diffMonths === 1
            ? t('equipmentManagement.details.month')
            : t('equipmentManagement.details.months')
        }`,
        isOverdue,
      };
    } else if (diffDays > 0) {
      return {
        text: `${diffDays} ${
          diffDays === 1
            ? t('equipmentManagement.details.day')
            : t('equipmentManagement.details.days')
        }`,
        isOverdue,
      };
    } else {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      return {
        text: `${diffHours} ${
          diffHours === 1
            ? t('equipmentManagement.details.hour')
            : t('equipmentManagement.details.hours')
        }`,
        isOverdue,
      };
    }
  };

  const handleDelete = async () => {
    if (!equipmentToDelete) return;

    setIsDeleting(true);
    try {
      await equipmentService.deleteEquipment(equipmentToDelete.id);
      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: t('equipmentManagement.delete.success'),
          duration: 3000,
        });
      }
      await loadEquipment();
      setIsDeleteDialogOpen(false);
      setEquipmentToDelete(null);
    } catch (error: any) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || t('equipmentManagement.delete.error'),
          duration: 3000,
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (data: Partial<Equipment>) => {
    try {
      if (selectedEquipment) {
        await equipmentService.updateEquipment(selectedEquipment.id, data);
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: t('equipmentManagement.messages.updateSuccess'),
            duration: 3000,
          });
        }
      } else {
        await equipmentService.createEquipment(data);
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: t('equipmentManagement.messages.createSuccess'),
            duration: 3000,
          });
        }
      }
      await loadEquipment();
      setIsFormModalOpen(false);
      setSelectedEquipment(null);
    } catch (error: any) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || t('equipmentManagement.messages.saveError'),
          duration: 3000,
        });
      }
      throw error;
    }
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            {t('equipmentManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            {t('equipmentManagement.subtitle')}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={loadEquipment}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <RefreshCw className='w-4 h-4' />
            {t('equipmentManagement.filter.refresh')}
          </button>
          <button
            onClick={handleCreate}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <Plus className='w-4 h-4' />
            {t('equipmentManagement.addEquipment')}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-3'>
          {/* Search Input */}
          <div className='md:col-span-2 group relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
            <input
              type='text'
              placeholder={t('equipmentManagement.search.placeholder')}
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {/* Category Filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: t('equipmentManagement.filter.allCategories') },
                { value: 'CARDIO', label: t('equipmentManagement.categories.CARDIO') },
                { value: 'STRENGTH', label: t('equipmentManagement.categories.STRENGTH') },
                { value: 'FREE_WEIGHTS', label: t('equipmentManagement.categories.FREE_WEIGHTS') },
                { value: 'FUNCTIONAL', label: t('equipmentManagement.categories.FUNCTIONAL') },
                { value: 'STRETCHING', label: t('equipmentManagement.categories.STRETCHING') },
                { value: 'RECOVERY', label: t('equipmentManagement.categories.RECOVERY') },
                { value: 'SPECIALIZED', label: t('equipmentManagement.categories.SPECIALIZED') },
              ]}
              value={categoryFilter}
              onChange={value => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
              placeholder={t('equipmentManagement.filter.allCategories')}
              icon={<Filter className='w-3.5 h-3.5' />}
              className='font-inter'
            />
          </div>

          {/* Status Filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: t('equipmentManagement.filter.allStatuses') },
                { value: 'AVAILABLE', label: t('equipmentManagement.statuses.AVAILABLE') },
                { value: 'IN_USE', label: t('equipmentManagement.statuses.IN_USE') },
                { value: 'MAINTENANCE', label: t('equipmentManagement.statuses.MAINTENANCE') },
                { value: 'OUT_OF_ORDER', label: t('equipmentManagement.statuses.OUT_OF_ORDER') },
                { value: 'RESERVED', label: t('equipmentManagement.statuses.RESERVED') },
              ]}
              value={statusFilter}
              onChange={value => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
              placeholder={t('equipmentManagement.filter.allStatuses')}
              icon={<Filter className='w-3.5 h-3.5' />}
              className='font-inter'
            />
          </div>
        </div>
      </div>

      {/* Equipment List */}
      {isLoading ? (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='text-center text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
            {t('common.loading')}
          </div>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='text-center text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? t('equipmentManagement.empty.noResults')
              : t('equipmentManagement.empty.noEquipment')}
          </div>
        </div>
      ) : (
        <>
          {/* Equipment Cards Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
            {paginatedEquipment.map(eq => (
              <div
                key={eq.id}
                className='group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-orange-500/20 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 overflow-hidden hover:-translate-y-1 flex flex-col h-full'
              >
                {/* Gradient Accent Bar */}
                <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>

                {/* Card Header */}
                <div className='relative p-5 pb-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800'>
                  <div className='flex items-start justify-between gap-3 mb-3'>
                    {/* Category Icon - 3D Icon from Figma */}
                    <div
                      className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${getCategoryColor(
                        eq.category
                      )} p-3 shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-105`}
                    >
                      <EquipmentIcon
                        category={eq.category}
                        className='w-full h-full'
                        use3DIcon={true}
                      />
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-theme-xs font-semibold font-heading tracking-wide flex-shrink-0 transition-all duration-200 ${getStatusColor(
                        eq.status
                      )}`}
                    >
                      {t(`equipmentManagement.statuses.${eq.status}`) || eq.status}
                    </span>
                  </div>

                  {/* Equipment Name */}
                  <h3 className='text-base font-bold font-heading text-gray-900 dark:text-white mb-2.5 line-clamp-2 leading-tight'>
                    {eq.name}
                  </h3>

                  {/* Category Badge */}
                  <div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-theme-xs font-semibold font-heading tracking-wide transition-all duration-200 ${getCategoryColor(
                        eq.category
                      )}`}
                    >
                      {t(`equipmentManagement.categories.${eq.category}`) || eq.category}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className='p-5 space-y-4 flex-1 flex flex-col'>
                  {/* Brand & Model */}
                  {(eq.brand || eq.model) && (
                    <div className='flex items-center gap-2.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700'>
                      <Hash className='w-4 h-4 flex-shrink-0 text-orange-500 dark:text-orange-400' />
                      <span className='text-theme-xs font-semibold font-heading text-gray-800 dark:text-gray-200 truncate'>
                        {eq.brand && eq.model ? `${eq.brand} ${eq.model}` : eq.brand || eq.model}
                      </span>
                    </div>
                  )}

                  {/* Location */}
                  {eq.location && (
                    <div className='flex items-center gap-2.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700'>
                      <MapPin className='w-4 h-4 flex-shrink-0 text-orange-500 dark:text-orange-400' />
                      <span className='text-theme-xs font-medium font-inter text-gray-700 dark:text-gray-300 truncate'>
                        {eq.location}
                      </span>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className='grid grid-cols-2 gap-2.5'>
                    {/* Usage Hours */}
                    <div className='flex items-center gap-2 px-2.5 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50'>
                      <Clock className='w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400' />
                      <div className='min-w-0'>
                        <div className='text-[11px] font-bold font-heading text-blue-700 dark:text-blue-300'>
                          {eq.usage_hours !== undefined ? eq.usage_hours : 0}
                        </div>
                        <div className='text-[9px] font-medium font-inter text-blue-600 dark:text-blue-400'>
                          {t('equipmentManagement.details.usageHours')}
                        </div>
                      </div>
                    </div>

                    {/* Max Weight */}
                    <div className='flex items-center gap-2 px-2.5 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/50'>
                      <Weight className='w-4 h-4 flex-shrink-0 text-purple-600 dark:text-purple-400' />
                      <div className='min-w-0'>
                        <div className='text-[11px] font-bold font-heading text-purple-700 dark:text-purple-300'>
                          {eq.max_weight ? `${eq.max_weight}kg` : '-'}
                        </div>
                        <div className='text-[9px] font-medium font-inter text-purple-600 dark:text-purple-400'>
                          {t('equipmentManagement.details.maxWeight')}
                        </div>
                      </div>
                    </div>

                    {/* Usage Count */}
                    <div className='flex items-center gap-2 px-2.5 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/50'>
                      <Activity className='w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400' />
                      <div className='min-w-0'>
                        <div className='text-[11px] font-bold font-heading text-green-700 dark:text-green-300'>
                          {eq._count?.usage_logs !== undefined ? eq._count.usage_logs : 0}
                        </div>
                        <div className='text-[9px] font-medium font-inter text-green-600 dark:text-green-400'>
                          {t('equipmentManagement.details.usageCount')}
                        </div>
                      </div>
                    </div>

                    {/* Maintenance Count */}
                    <div className='flex items-center gap-2 px-2.5 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800/50'>
                      <Wrench className='w-4 h-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400' />
                      <div className='min-w-0'>
                        <div className='text-[11px] font-bold font-heading text-yellow-700 dark:text-yellow-300'>
                          {eq._count?.maintenance_logs !== undefined ? eq._count.maintenance_logs : 0}
                        </div>
                        <div className='text-[9px] font-medium font-inter text-yellow-600 dark:text-yellow-400'>
                          {t('equipmentManagement.details.maintenanceCount')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Last Maintenance */}
                  {eq.last_maintenance && (
                    <div className='flex items-center gap-2 px-2.5 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                      <Calendar className='w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400' />
                      <div className='min-w-0'>
                        <div className='text-[10px] font-semibold font-heading text-gray-700 dark:text-gray-300 mb-0.5'>
                          {t('equipmentManagement.details.lastMaintenance')}
                        </div>
                        <div className='text-[9px] font-medium font-inter text-gray-600 dark:text-gray-400'>
                          {new Date(eq.last_maintenance).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Maintenance Status Warning */}
                  {(() => {
                    const maintenanceStatus = getMaintenanceStatus(eq.next_maintenance);
                    if (maintenanceStatus && eq.next_maintenance) {
                      return (
                        <div
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border col-span-2 ${
                            maintenanceStatus.isOverdue
                              ? 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800'
                              : 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800'
                          }`}
                        >
                          <Calendar
                            className={`w-4 h-4 flex-shrink-0 ${
                              maintenanceStatus.isOverdue
                                ? 'text-error-600 dark:text-error-400'
                                : 'text-warning-600 dark:text-warning-400'
                            }`}
                          />
                          <div className='min-w-0 flex-1'>
                            <div
                              className={`text-[10px] font-semibold font-heading mb-0.5 ${
                                maintenanceStatus.isOverdue
                                  ? 'text-error-700 dark:text-error-300'
                                  : 'text-warning-700 dark:text-warning-300'
                              }`}
                            >
                              {maintenanceStatus.isOverdue
                                ? t('equipmentManagement.details.overdueMaintenance')
                                : t('equipmentManagement.details.dueMaintenance')}
                            </div>
                            <div
                              className={`text-[9px] font-medium font-inter ${
                                maintenanceStatus.isOverdue
                                  ? 'text-error-600 dark:text-error-400'
                                  : 'text-warning-600 dark:text-warning-400'
                              }`}
                            >
                              {t('equipmentManagement.details.notMaintainedFor', {
                                time: maintenanceStatus.text,
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Queue Count */}
                  {eq._count?.queue !== undefined && eq._count.queue > 0 && (
                    <div className='flex items-center gap-2 px-2.5 py-2 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800 col-span-2 animate-pulse'>
                      <Zap className='w-4 h-4 flex-shrink-0 text-warning-600 dark:text-warning-400' />
                      <div className='min-w-0 flex-1'>
                        <div className='text-[11px] font-bold font-heading text-warning-700 dark:text-warning-300'>
                          {eq._count.queue} {t('equipmentManagement.details.queueCount')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Last User */}
                  {eq.usage_logs && eq.usage_logs.length > 0 && eq.usage_logs[0]?.member && (
                    <div className='pt-2 border-t border-gray-100 dark:border-gray-800'>
                      <button
                        onClick={() => handleViewUsers(eq)}
                        className='w-full flex items-center gap-2.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-200 cursor-pointer group'
                      >
                        <div className='flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
                          <User className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                        </div>
                        <div className='flex-1 min-w-0 text-left'>
                          <div className='text-[10px] font-semibold font-heading text-gray-600 dark:text-gray-400 mb-0.5'>
                            {t('equipmentManagement.details.lastUser')}
                          </div>
                          <div className='text-theme-xs font-medium font-inter text-gray-900 dark:text-white truncate'>
                            {eq.usage_logs[0].member.full_name}
                          </div>
                        </div>
                        <Users className='w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200' />
                      </button>
                    </div>
                  )}

                  {/* Smart Features */}
                  {(eq.has_heart_monitor ||
                    eq.has_calorie_counter ||
                    eq.has_rep_counter ||
                    eq.wifi_enabled) && (
                    <div className='pt-2 border-t border-gray-100 dark:border-gray-800 mt-auto'>
                      <div className='flex items-center gap-1.5 mb-2'>
                        <Zap className='w-3.5 h-3.5 text-orange-500 dark:text-orange-400' />
                        <span className='text-[10px] font-semibold font-heading text-gray-600 dark:text-gray-400 uppercase tracking-wide'>
                          {t('equipmentManagement.details.features')}
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5 flex-wrap'>
                        {eq.has_heart_monitor && (
                          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold font-heading bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-sm'>
                            <Activity className='w-3 h-3' />
                            {t('equipmentManagement.details.heartMonitor')}
                          </span>
                        )}
                        {eq.has_calorie_counter && (
                          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold font-heading bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shadow-sm'>
                            <Zap className='w-3 h-3' />
                            {t('equipmentManagement.details.calorieCounter')}
                          </span>
                        )}
                        {eq.has_rep_counter && (
                          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold font-heading bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-sm'>
                            <Activity className='w-3 h-3' />
                            {t('equipmentManagement.details.repCounter')}
                          </span>
                        )}
                        {eq.wifi_enabled && (
                          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold font-heading bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm'>
                            <Wifi className='w-3 h-3' />
                            {t('equipmentManagement.details.wifiEnabled')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer - Actions */}
                <div className='px-5 py-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2.5'>
                  <button
                    onClick={() => handleEdit(eq)}
                    className='flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-orange-700 dark:text-orange-300 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:border-orange-400 dark:hover:border-orange-700 hover:text-orange-800 dark:hover:text-orange-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
                  >
                    <Edit className='w-4 h-4' />
                    {t('equipmentManagement.actions.edit')}
                  </button>
                  <button
                    onClick={() => {
                      setEquipmentToDelete(eq);
                      setIsDeleteDialogOpen(true);
                    }}
                    className='flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-error-700 dark:text-error-300 bg-white dark:bg-gray-800 border border-error-200 dark:border-error-800 rounded-xl hover:bg-error-50 dark:hover:bg-error-900/30 hover:border-error-400 dark:hover:border-error-700 hover:text-error-800 dark:hover:text-error-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
                  >
                    <Trash2 className='w-4 h-4' />
                    {t('equipmentManagement.actions.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm px-6 py-4'>
              <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter font-medium'>
                {t('common.page')} {currentPage} {t('common.of')} {totalPages}
              </div>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className='inline-flex items-center gap-2 px-4 py-2 text-theme-xs font-medium font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800'
                >
                  <ChevronLeft className='w-4 h-4' />
                  {t('common.prev')}
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className='inline-flex items-center gap-2 px-4 py-2 text-theme-xs font-medium font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800'
                >
                  {t('common.next')}
                  <ChevronRight className='w-4 h-4' />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      <EquipmentFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedEquipment(null);
        }}
        onSave={handleSave}
        equipment={selectedEquipment}
      />

      {/* Users Modal */}
      <Modal
        isOpen={isUsersModalOpen}
        onClose={() => {
          setIsUsersModalOpen(false);
          setEquipmentUsers([]);
          setSelectedEquipmentForUsers(null);
        }}
        className='max-w-2xl m-4'
      >
        <div className='relative w-full max-w-2xl overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl max-h-[80vh]'>
          {/* Header */}
          <div className='sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-b border-blue-200 dark:border-blue-700 px-6 py-4 rounded-t-2xl'>
            <h2 className='text-xl font-bold font-heading text-gray-900 dark:text-white'>
              {t('equipmentManagement.usersModal.title')}
            </h2>
            <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter mt-1'>
              {selectedEquipmentForUsers?.name && (
                <>
                  {t('equipmentManagement.usersModal.subtitle')}:{' '}
                  <span className='font-semibold'>{selectedEquipmentForUsers.name}</span>
                </>
              )}
            </p>
          </div>

          {/* Content */}
          <div className='p-6'>
            {isLoadingUsers ? (
              <div className='text-center py-12'>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
                  {t('common.loading')}
                </div>
              </div>
            ) : equipmentUsers.length === 0 ? (
              <div className='text-center py-12'>
                <Users className='w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
                <p className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter'>
                  {t('equipmentManagement.usersModal.noUsers')}
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {equipmentUsers.map((usage, index) => (
                  <div
                    key={usage.id || index}
                    className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3 flex-1 min-w-0'>
                        <div className='flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
                          <User className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                        </div>
                        <div className='flex-1 min-w-0'>
                          <h3 className='text-theme-sm font-semibold font-heading text-gray-900 dark:text-white truncate'>
                            {usage.member?.full_name ||
                              t('equipmentManagement.usersModal.unknownUser')}
                          </h3>
                          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter truncate'>
                            {usage.member?.membership_number && (
                              <span className='mr-2'>
                                {t('equipmentManagement.usersModal.membershipNumber')}:{' '}
                                {usage.member.membership_number}
                              </span>
                            )}
                            {usage.member?.email && <span>{usage.member.email}</span>}
                          </p>
                        </div>
                      </div>
                      <div className='flex-shrink-0 text-right ml-4'>
                        <div className='text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300'>
                          {new Date(usage.start_time).toLocaleDateString()}
                        </div>
                        <div className='text-[11px] text-gray-500 dark:text-gray-400 font-inter'>
                          {new Date(usage.start_time).toLocaleTimeString()}
                        </div>
                        {usage.duration && (
                          <div className='text-[10px] text-gray-400 dark:text-gray-500 font-inter mt-1'>
                            {usage.duration} {t('equipmentManagement.usersModal.minutes')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 rounded-b-2xl flex justify-end'>
            <button
              onClick={() => {
                setIsUsersModalOpen(false);
                setEquipmentUsers([]);
                setSelectedEquipmentForUsers(null);
              }}
              className='px-5 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md'
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setEquipmentToDelete(null);
        }}
        onConfirm={handleDelete}
        title={t('equipmentManagement.delete.confirmTitle')}
        message={t('equipmentManagement.delete.confirmMessage', {
          name: equipmentToDelete?.name || '',
        })}
        confirmText={t('equipmentManagement.actions.delete')}
        cancelText={t('common.cancel')}
        variant='danger'
        isLoading={isDeleting}
      />
    </div>
  );
};

export default EquipmentManagement;
