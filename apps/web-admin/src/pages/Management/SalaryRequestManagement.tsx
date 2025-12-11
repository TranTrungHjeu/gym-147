import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DollarSign,
  Search,
  Clock,
  User,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import useTranslation from '../../hooks/useTranslation';
import AdminCard from '../../components/common/AdminCard';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
} from '../../components/common/AdminTable';
import CustomSelect from '../../components/common/CustomSelect';
import Pagination from '../../components/common/Pagination';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../hooks/useToast';
import { salaryService, type SalaryRequest } from '../../services/salary.service';
import { formatVietnamDateTime } from '../../utils/dateTime';
import SetSalaryModal from '../../components/modals/SetSalaryModal';

const SalaryRequestManagement: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<SalaryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<SalaryRequest | null>(null);
  const [isSetSalaryModalOpen, setIsSetSalaryModalOpen] = useState(false);

  useEffect(() => {
    loadSalaryRequests();
    
    // Check if navigating from notification with trainer_id filter
    const trainerId = searchParams.get('trainer_id');
    const action = searchParams.get('action');
    if (trainerId && action === 'set_salary') {
      // Find request for this trainer
      const request = requests.find(r => r.data.trainer_id === trainerId);
      if (request) {
        setSelectedRequest(request);
        setIsSetSalaryModalOpen(true);
      }
    }
  }, [currentPage, itemsPerPage, searchTerm]);

  const loadSalaryRequests = async () => {
    try {
      setIsLoading(true);
      const response = await salaryService.getSalaryRequests({
        page: currentPage,
        limit: itemsPerPage,
        trainer_id: searchParams.get('trainer_id') || undefined,
      });

      if (response.success && response.data) {
        setRequests(response.data.requests || []);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error: any) {
      showToast('error', error.message || t('salaryRequestManagement.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetSalary = (request: SalaryRequest) => {
    setSelectedRequest(request);
    setIsSetSalaryModalOpen(true);
  };

  const handleSalarySet = async () => {
    await loadSalaryRequests();
    setIsSetSalaryModalOpen(false);
    setSelectedRequest(null);
    showToast('success', t('salaryRequestManagement.messages.setSuccess'));
  };

  const filteredRequests = requests.filter(request => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      request.data.trainer_name.toLowerCase().includes(term) ||
      request.data.trainer_email.toLowerCase().includes(term) ||
      request.data.trainer_id.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (request: SalaryRequest) => {
    // Since we're using notifications, all requests are considered pending
    // In a real implementation, you might check notification data for status
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        {t('salaryRequestManagement.status.pending')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <AdminCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              {t('salaryRequestManagement.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('salaryRequestManagement.subtitle')}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('salaryRequestManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableLoading />
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t('salaryRequestManagement.empty')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <AdminTable>
                <AdminTableHeader>
                  <AdminTableRow>
                    <AdminTableCell>{t('salaryRequestManagement.table.trainer')}</AdminTableCell>
                    <AdminTableCell>{t('salaryRequestManagement.table.email')}</AdminTableCell>
                    <AdminTableCell>{t('salaryRequestManagement.table.requestTime')}</AdminTableCell>
                    <AdminTableCell>{t('salaryRequestManagement.table.status')}</AdminTableCell>
                    <AdminTableCell>{t('salaryRequestManagement.table.actions')}</AdminTableCell>
                  </AdminTableRow>
                </AdminTableHeader>
                <AdminTableBody>
                  {filteredRequests.map(request => (
                    <AdminTableRow key={request.id}>
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{request.data.trainer_name}</span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{request.data.trainer_email}</span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatVietnamDateTime(request.created_at)}</span>
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>{getStatusBadge(request)}</AdminTableCell>
                      <AdminTableCell>
                        <button
                          onClick={() => handleSetSalary(request)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          {t('salaryRequestManagement.actions.setSalary')}
                        </button>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </AdminTableBody>
              </AdminTable>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </>
        )}
      </AdminCard>

      {/* Set Salary Modal */}
      {selectedRequest && (
        <SetSalaryModal
          isOpen={isSetSalaryModalOpen}
          onClose={() => {
            setIsSetSalaryModalOpen(false);
            setSelectedRequest(null);
          }}
          trainerId={selectedRequest.data.trainer_id}
          trainerName={selectedRequest.data.trainer_name}
          onSuccess={handleSalarySet}
        />
      )}
    </div>
  );
};

export default SalaryRequestManagement;

