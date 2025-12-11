import { CheckCircle2, DollarSign, Plus, RefreshCw, Search, Trash2, User } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminButton from '../../components/common/AdminButton';
import AdminCard from '../../components/common/AdminCard';
import AdminModal from '../../components/common/AdminModal';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
} from '../../components/common/AdminTable';
import AdvancedFilters from '../../components/common/AdvancedFilters';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ExportButton from '../../components/common/ExportButton';
import Pagination from '../../components/common/Pagination';
import CreateGuestPassModal from '../../components/modals/CreateGuestPassModal';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';
import { GuestPass, GuestPassStats, guestService } from '../../services/guest.service';
import { formatVietnamDateTime } from '../../utils/dateTime';

const GuestManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [guestPasses, setGuestPasses] = useState<GuestPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<GuestPassStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [passTypeFilter, setPassTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPass, setSelectedPass] = useState<GuestPass | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [passToDelete, setPassToDelete] = useState<GuestPass | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const prevPageRef = React.useRef(currentPage);
  const isInitialLoadRef = React.useRef(true);

  const loadGuestPasses = useCallback(
    async (isPageChange = false) => {
      try {
        // Only show full loading on initial load, not on page changes
        if (!isPageChange) {
          setIsLoading(true);
        }
        const response = await guestService.getAllGuestPasses({
          page: currentPage,
          limit: itemsPerPage,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          pass_type: passTypeFilter !== 'all' ? passTypeFilter : undefined,
          search: searchTerm || undefined,
        });
        if (response.success) {
          setGuestPasses(response.data.guest_passes || []);
          setTotalPages(response.data.totalPages || 1);
        }
      } catch (error: any) {
        showToast(t('guestManagement.messages.loadError'), 'error');
        console.error('Error loading guest passes:', error);
        setGuestPasses([]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, itemsPerPage, statusFilter, passTypeFilter, searchTerm, showToast]
  );

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await guestService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Error loading guest stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    const isPageChange = prevPageRef.current !== currentPage && !isInitialLoadRef.current;
    const wasInitialLoad = isInitialLoadRef.current;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
    prevPageRef.current = currentPage;
    loadGuestPasses(isPageChange);
    // Only load stats on initial load, not on page changes
    if (wasInitialLoad) {
      loadStats();
    }
  }, [loadGuestPasses, loadStats, currentPage]);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300 border-success-200 dark:border-success-800';
      case 'USED':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'EXPIRED':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'CANCELLED':
        return 'bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-300 border-error-200 dark:border-error-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      ACTIVE: t('guestManagement.status.ACTIVE'),
      USED: t('guestManagement.status.USED'),
      EXPIRED: t('guestManagement.status.EXPIRED'),
      CANCELLED: t('guestManagement.status.CANCELLED'),
    };
    return statusMap[status] || status;
  };

  const getPassTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      SINGLE_DAY: t('guestManagement.passTypes.SINGLE_DAY'),
      WEEK: t('guestManagement.passTypes.WEEK'),
      MONTH: t('guestManagement.passTypes.MONTH'),
    };
    return typeMap[type] || type;
  };

  const filteredPasses = useMemo(() => {
    return guestPasses.filter(pass => {
      const matchesSearch =
        pass.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pass.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pass.guest_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pass.issuer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || pass.status === statusFilter;
      const matchesType = passTypeFilter === 'all' || pass.pass_type === passTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [guestPasses, searchTerm, statusFilter, passTypeFilter]);

  const handleDelete = async () => {
    if (!passToDelete) return;
    try {
      setIsDeleting(true);
      await guestService.deleteGuestPass(passToDelete.id);
      showToast(t('guestManagement.messages.deleteSuccess'), 'success');
      await loadGuestPasses();
      setIsDeleteDialogOpen(false);
      setPassToDelete(null);
    } catch (error: any) {
      showToast(error.message || t('guestManagement.messages.deleteError'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            {t('guestManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            {t('guestManagement.subtitle')}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <AdminButton
            variant='outline'
            size='sm'
            icon={RefreshCw}
            onClick={() => {
              loadGuestPasses();
              loadStats();
            }}
          >
            {t('equipmentManagement.filter.refresh')}
          </AdminButton>
          <AdminButton
            variant='primary'
            size='sm'
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            {t('guestManagement.addGuestPass')}
          </AdminButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <User className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                  {statsLoading ? '...' : stats?.total || 0}
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium mt-0.5'>
                  {t('guestManagement.stats.total')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <CheckCircle2 className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                  {statsLoading ? '...' : stats?.active || 0}
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium mt-0.5'>
                  {t('guestManagement.stats.active')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <CheckCircle2 className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                  {statsLoading ? '...' : stats?.used || 0}
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium mt-0.5'>
                  {t('guestManagement.stats.used')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding='sm' className='relative overflow-hidden group'>
          <div className='absolute -top-px -right-px w-12 h-12 bg-orange-100 dark:bg-orange-900/30 opacity-5 rounded-bl-3xl transition-opacity duration-300 group-hover:opacity-10'></div>
          <div className='absolute left-0 top-0 bottom-0 w-0.5 bg-orange-100 dark:bg-orange-900/30 opacity-20 rounded-r'></div>
          <div className='relative'>
            <div className='flex items-center gap-3'>
              <div className='relative w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-orange-500/20'>
                <DollarSign className='relative w-[18px] h-[18px] text-orange-600 dark:text-orange-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-none tracking-tight'>
                  {statsLoading
                    ? '...'
                    : `${(stats?.total_revenue || 0).toLocaleString('vi-VN')} VND`}
                </div>
                <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter leading-tight font-medium mt-0.5'>
                  {t('guestManagement.stats.revenue')}
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={{
          search: searchTerm,
          status: statusFilter !== 'all' ? statusFilter : '',
          customFilters: {
            pass_type: passTypeFilter !== 'all' ? passTypeFilter : '',
          },
        }}
        onFiltersChange={newFilters => {
          setSearchTerm(newFilters.search || '');
          setStatusFilter(newFilters.status || 'all');
          setPassTypeFilter(newFilters.customFilters?.pass_type || 'all');
          setCurrentPage(1);
        }}
        availableStatuses={[
          { value: 'ACTIVE', label: t('guestManagement.status.ACTIVE') },
          { value: 'USED', label: t('guestManagement.status.USED') },
          { value: 'EXPIRED', label: t('guestManagement.status.EXPIRED') },
          { value: 'CANCELLED', label: t('guestManagement.status.CANCELLED') },
        ]}
        showStatus={true}
        showCategory={false}
        customFilterFields={[
          {
            key: 'pass_type',
            label: t('guestManagement.filter.passType'),
            type: 'select',
            options: [
              { value: 'SINGLE_DAY', label: t('guestManagement.passTypes.SINGLE_DAY') },
              { value: 'WEEK', label: t('guestManagement.passTypes.WEEK') },
              { value: 'MONTH', label: t('guestManagement.passTypes.MONTH') },
            ],
          },
        ]}
      />

      {/* Export */}
      <div className='flex justify-between items-center'>
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          {t('guestManagement.stats.totalCount', { count: filteredPasses.length })}
        </div>
        {filteredPasses.length > 0 && (
          <ExportButton
            data={filteredPasses.map(pass => ({
              'Tên khách': pass.guest_name,
              Email: pass.guest_email || '',
              'Số điện thoại': pass.guest_phone || '',
              'Người phát hành': pass.issuer?.full_name || 'N/A',
              'Loại thẻ': getPassTypeLabel(pass.pass_type),
              'Ngày phát hành': pass.issued_date ? formatVietnamDateTime(pass.issued_date) : '',
              'Hiệu lực đến': pass.valid_until ? formatVietnamDateTime(pass.valid_until) : '',
              'Trạng thái': getStatusLabel(pass.status),
              'Số lần sử dụng': `${pass.uses_count}/${pass.max_uses}`,
              Giá: pass.price ? `${pass.price.toLocaleString('vi-VN')} VND` : t('common.free'),
            }))}
            columns={[
              { key: 'Tên khách', label: 'Tên khách' },
              { key: 'Người phát hành', label: 'Người phát hành' },
              { key: 'Loại thẻ', label: 'Loại thẻ' },
              { key: 'Trạng thái', label: 'Trạng thái' },
              { key: 'Hiệu lực đến', label: 'Hiệu lực đến' },
            ]}
            filename={t('guestManagement.export.filename')}
            title={t('guestManagement.export.title')}
            variant='outline'
            size='sm'
          />
        )}
      </div>

      {/* Guest Passes List */}
      {isLoading ? (
        <TableLoading text={t('guestManagement.messages.loading')} />
      ) : filteredPasses.length === 0 ? (
        <AdminCard padding='md' className='text-center'>
          <div className='flex flex-col items-center justify-center py-12'>
            <User className='w-20 h-20 text-gray-300 dark:text-gray-700 mb-4' />
            <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-heading mb-2'>
              {searchTerm
                ? t('guestManagement.empty.noResults')
                : t('guestManagement.empty.noPasses')}
            </div>
          </div>
        </AdminCard>
      ) : (
        <>
          <AdminCard padding='none'>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell header>{t('guestManagement.table.guestName')}</AdminTableCell>
                  <AdminTableCell header>{t('guestManagement.table.issuer')}</AdminTableCell>
                  <AdminTableCell header>{t('guestManagement.table.passType')}</AdminTableCell>
                  <AdminTableCell header>{t('guestManagement.table.validUntil')}</AdminTableCell>
                  <AdminTableCell header>{t('guestManagement.table.status')}</AdminTableCell>
                  <AdminTableCell header>{t('guestManagement.table.uses')}</AdminTableCell>
                  <AdminTableCell header>{t('guestManagement.table.actions')}</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {filteredPasses.map((pass, index) => (
                  <AdminTableRow
                    key={pass.id}
                    className={`group relative border-l-4 border-l-transparent hover:border-l-orange-500 transition-all duration-200 ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50/50 dark:bg-gray-800/50'
                    } hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 dark:hover:from-orange-900/20 dark:hover:to-orange-800/10`}
                  >
                    <AdminTableCell>
                      <div className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                        {pass.guest_name}
                      </div>
                      {pass.guest_email && (
                        <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                          {pass.guest_email}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                        {pass.issuer?.full_name || 'N/A'}
                      </div>
                      {pass.issuer?.membership_number && (
                        <div className='text-[10px] text-gray-500 dark:text-gray-400 font-inter mt-0.5'>
                          {pass.issuer.membership_number}
                        </div>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                        {getPassTypeLabel(pass.pass_type)}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                        {pass.valid_until ? formatVietnamDateTime(pass.valid_until, 'date') : 'N/A'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span
                        className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold font-heading rounded-full border ${getStatusColor(
                          pass.status
                        )}`}
                      >
                        {getStatusLabel(pass.status)}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='text-theme-xs font-heading text-gray-900 dark:text-white'>
                        {pass.uses_count}/{pass.max_uses}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className='flex items-center justify-end gap-2'>
                        <button
                          onClick={() => {
                            setSelectedPass(pass);
                            setIsDetailModalOpen(true);
                          }}
                          className='p-1.5 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors'
                          title={t('guestManagement.actions.viewDetails')}
                        >
                          <Search className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => {
                            setPassToDelete(pass);
                            setIsDeleteDialogOpen(true);
                          }}
                          className='p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors'
                          title={t('guestManagement.actions.delete')}
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </AdminCard>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setPassToDelete(null);
        }}
        onConfirm={handleDelete}
        title={t('guestManagement.delete.confirmTitle')}
        message={t('guestManagement.delete.confirmMessage', {
          name: passToDelete?.guest_name || t('guestManagement.delete.thisGuest'),
        })}
        confirmText={t('guestManagement.actions.delete')}
        cancelText={t('common.cancel')}
        isLoading={isDeleting}
        variant='danger'
      />

      {/* Detail Modal */}
      <AdminModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPass(null);
        }}
        title={t('guestManagement.detail.title', { name: selectedPass?.guest_name || 'N/A' })}
        size='lg'
      >
        {selectedPass && (
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.guestName')}
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedPass.guest_name}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.email')}
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedPass.guest_email || t('common.noData')}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.phone')}
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedPass.guest_phone || t('common.noData')}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.issuer')}
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedPass.issuer?.full_name || t('common.noData')}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.passType')}
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {getPassTypeLabel(selectedPass.pass_type)}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.status')}
                </label>
                <div className='mt-1'>
                  <span
                    className={`px-2.5 py-1 inline-flex text-theme-xs font-semibold rounded-full border ${getStatusColor(
                      selectedPass.status
                    )}`}
                  >
                    {getStatusLabel(selectedPass.status)}
                  </span>
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.validFrom')}
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedPass.valid_from
                    ? formatVietnamDateTime(selectedPass.valid_from, 'date')
                    : t('common.noData')}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.validUntil')}
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedPass.valid_until
                    ? formatVietnamDateTime(selectedPass.valid_until, 'date')
                    : t('common.noData')}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.uses')}
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedPass.uses_count}/{selectedPass.max_uses}
                </div>
              </div>
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  {t('guestManagement.detail.price')}
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedPass.price
                    ? `${selectedPass.price.toLocaleString('vi-VN')} VND`
                    : t('common.free')}
                </div>
              </div>
            </div>
            {selectedPass.notes && (
              <div>
                <label className='text-theme-xs font-semibold text-gray-700 dark:text-gray-300'>
                  Ghi chú
                </label>
                <div className='text-theme-xs text-gray-900 dark:text-white mt-1'>
                  {selectedPass.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </AdminModal>

      {/* Create Guest Pass Modal */}
      <CreateGuestPassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadGuestPasses();
          loadStats();
        }}
      />
    </div>
  );
};

export default GuestManagement;
