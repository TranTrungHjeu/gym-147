import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import useTranslation from '../../hooks/useTranslation';
import { FileText, Search, Download, Filter, Calendar } from 'lucide-react';
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
import { auditService, AuditLog, AuditLogFilters } from '../../services/audit.service';
import { TableLoading } from '../../components/ui/AppLoading';
import Pagination from '../../components/common/Pagination';
import AdvancedFilters from '../../components/common/AdvancedFilters';
import { formatVietnamDateTime } from '../../utils/dateTime';

const AuditLogsManagement: React.FC = () => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await auditService.getAuditLogs(filters);
      if (response.success && response.data) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
        setTotalPages(Math.ceil(response.data.total / (filters.limit || 20)));
      }
    } catch (error: any) {
      showToast(t('auditLogsManagement.messages.loadError'), 'error');
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await auditService.exportAuditLogs(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(t('auditLogsManagement.messages.exportSuccess'), 'success');
    } catch (error: any) {
      showToast(t('auditLogsManagement.messages.exportError'), 'error');
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('CREATE'))
      return 'text-green-600 dark:text-green-400';
    if (action.includes('UPDATE') || action.includes('UPDATE'))
      return 'text-blue-600 dark:text-blue-400';
    if (action.includes('DELETE') || action.includes('DELETE'))
      return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold font-heading text-gray-900 dark:text-white'>
            {t('auditLogsManagement.title')}
          </h1>
          <p className='text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter'>
            {t('auditLogsManagement.subtitle')}
          </p>
        </div>
        <AdminButton variant='primary' icon={Download} onClick={handleExport}>
          {t('auditLogsManagement.export')}
        </AdminButton>
      </div>

      {/* Filters */}
      <AdvancedFilters
        filters={{
          dateRange: {
            from: filters.date_from,
            to: filters.date_to,
          },
          search: '',
          customFilters: {
            user_id: filters.user_id,
            action: filters.action,
            resource_type: filters.resource_type,
          },
        }}
        onFiltersChange={newFilters => {
          setFilters({
            ...filters,
            date_from: newFilters.dateRange?.from,
            date_to: newFilters.dateRange?.to,
            user_id: newFilters.customFilters?.user_id,
            action: newFilters.customFilters?.action,
            resource_type: newFilters.customFilters?.resource_type,
            page: 1,
          });
        }}
        showDateRange={true}
        showSearch={false}
        customFilterFields={[
          {
            key: 'user_id',
            label: t('auditLogsManagement.filters.userId'),
            type: 'text',
          },
          {
            key: 'action',
            label: t('auditLogsManagement.filters.action'),
            type: 'text',
          },
          {
            key: 'resource_type',
            label: t('auditLogsManagement.filters.resourceType'),
            type: 'text',
          },
        ]}
      />

      {/* Logs Table */}
      <AdminCard>
        <div className='mb-4 flex items-center justify-between'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            {t('auditLogsManagement.stats.total', { count: total })}
          </p>
        </div>
        {loading ? (
          <TableLoading />
        ) : logs.length === 0 ? (
          <div className='text-center py-12'>
            <FileText className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-500 dark:text-gray-400'>
              {t('auditLogsManagement.empty.noLogs')}
            </p>
          </div>
        ) : (
          <>
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell>{t('auditLogsManagement.table.timestamp')}</AdminTableCell>
                  <AdminTableCell>{t('auditLogsManagement.table.user')}</AdminTableCell>
                  <AdminTableCell>{t('auditLogsManagement.table.action')}</AdminTableCell>
                  <AdminTableCell>{t('auditLogsManagement.table.resourceType')}</AdminTableCell>
                  <AdminTableCell>{t('auditLogsManagement.table.details')}</AdminTableCell>
                  <AdminTableCell>{t('auditLogsManagement.table.ipAddress')}</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {logs.map(log => (
                  <AdminTableRow key={log.id}>
                    <AdminTableCell>{formatVietnamDateTime(log.created_at)}</AdminTableCell>
                    <AdminTableCell>{log.user_name || log.user_id}</AdminTableCell>
                    <AdminTableCell>
                      <span className={`font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </AdminTableCell>
                    <AdminTableCell>{log.resource_type}</AdminTableCell>
                    <AdminTableCell className='max-w-xs'>
                      <details className='cursor-pointer'>
                        <summary className='text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'>
                          {t('auditLogsManagement.table.viewDetails')}
                        </summary>
                        <pre className='mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs overflow-auto'>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    </AdminTableCell>
                    <AdminTableCell className='text-sm text-gray-500'>
                      {log.ip_address || '-'}
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
            {totalPages > 1 && (
              <div className='mt-4'>
                <Pagination
                  currentPage={filters.page || 1}
                  totalPages={totalPages}
                  onPageChange={page => setFilters({ ...filters, page })}
                />
              </div>
            )}
          </>
        )}
      </AdminCard>
    </div>
  );
};

export default AuditLogsManagement;
