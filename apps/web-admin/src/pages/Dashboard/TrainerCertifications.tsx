import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Search,
  XCircle,
  AlertCircle,
  Eye,
  Award,
  Calendar,
  Building2,
  CalendarCheck,
  CalendarX,
  X,
  Download,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import AddCertificationModal from '../../components/certification/AddCertificationModal';
import MetricCard from '../../components/dashboard/MetricCard';
import Modal from '../../components/Modal/Modal';
import CustomSelect from '../../components/common/CustomSelect';
import Pagination from '../../components/common/Pagination';
import { useToast } from '../../context/ToastContext';
import {
  AvailableCategory,
  Certification,
  certificationService,
} from '../../services/certification.service';

export default function TrainerCertifications() {
  const { showToast } = useToast();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [availableCategories, setAvailableCategories] = useState<AvailableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewCertificateModal, setViewCertificateModal] = useState(false);
  const [certificateImageUrl, setCertificateImageUrl] = useState<string | null>(null);
  const [certificateName, setCertificateName] = useState<string>('');
  const [imageZoom, setImageZoom] = useState(1);

  // Get current trainer ID from localStorage
  // Prefer trainerId if available (from login), otherwise fallback to user_id
  const getCurrentTrainerId = () => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      // Use trainerId if available (set during login), otherwise use user_id
      return userData.trainerId || userData.id;
    }
    return null;
  };

  useEffect(() => {
    fetchCertifications();
    fetchAvailableCategories();
  }, []);

  const fetchCertifications = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const trainerId = getCurrentTrainerId();
      if (!trainerId) {
        throw new Error('Trainer ID not found');
      }
      const data = await certificationService.getTrainerCertifications(trainerId);
      setCertifications(data);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      showToast({
        type: 'error',
        message: 'Lỗi tải danh sách chứng chỉ',
        duration: 3000,
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    await fetchCertifications(false);
  };

  const fetchAvailableCategories = async () => {
    try {
      const trainerId = getCurrentTrainerId();
      if (!trainerId) {
        console.error('Trainer ID not found');
        return;
      }
      const data = await certificationService.getAvailableCategories(trainerId);
      setAvailableCategories(data);
    } catch (error) {
      console.error('Error fetching available categories:', error);
    }
  };

  const filteredCertifications = certifications.filter(cert => {
    const matchesStatus = filterStatus === 'all' || cert.verification_status === filterStatus;
    const matchesSearch =
      !searchTerm ||
      cert.certification_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.certification_issuer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryLabel(cert.category).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredCertifications.length / itemsPerPage);
  const paginatedCertifications = filteredCertifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
      CARDIO: 'Tim mạch',
      STRENGTH: 'Sức mạnh',
      YOGA: 'Yoga',
      PILATES: 'Pilates',
      DANCE: 'Khiêu vũ',
      MARTIAL_ARTS: 'Võ thuật',
      AQUA: 'Bơi lội',
      FUNCTIONAL: 'Chức năng',
      RECOVERY: 'Phục hồi',
      SPECIALIZED: 'Chuyên biệt',
    };
    return categories[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      CARDIO: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      STRENGTH: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      YOGA: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      PILATES: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      DANCE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      MARTIAL_ARTS: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      AQUA: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      FUNCTIONAL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      RECOVERY: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      SPECIALIZED: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle2 className='w-3.5 h-3.5' />;
      case 'REJECTED':
        return <XCircle className='w-3.5 h-3.5' />;
      case 'PENDING':
        return <Clock className='w-3.5 h-3.5' />;
      case 'EXPIRED':
        return <AlertCircle className='w-3.5 h-3.5' />;
      case 'SUSPENDED':
        return <AlertCircle className='w-3.5 h-3.5' />;
      default:
        return <Clock className='w-3.5 h-3.5' />;
    }
  };

  const handleViewCertificate = (cert: Certification) => {
    if (cert.certificate_file_url) {
      try {
        // Use certificate URL directly (same as equipment images)
        // URL is already public/CDN URL from backend
        const imageUrl = cert.certificate_file_url;
        console.log('Using certificate URL directly (like equipment):', imageUrl);
        
        setCertificateImageUrl(imageUrl);
        setCertificateName(cert.certification_name || 'Chứng chỉ');
        setImageZoom(1);
        setViewCertificateModal(true);
      } catch (error) {
        console.error('Error viewing certificate:', error);
        showToast({
          type: 'error',
          message: 'Không thể tải ảnh chứng chỉ',
          duration: 3000,
        });
      }
    }
  };

  const handleCloseCertificateModal = () => {
    setViewCertificateModal(false);
    setCertificateImageUrl(null);
    setCertificateName('');
    setImageZoom(1);
  };

  const handleDownloadCertificate = () => {
    if (certificateImageUrl) {
      const link = document.createElement('a');
      link.href = certificateImageUrl;
      link.download = `${certificateName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.1, 1));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setImageZoom(1);
  };

  if (loading) {
    return (
      <div className='p-3 space-y-3'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4'></div>
            <p className='text-gray-600 dark:text-gray-400 font-inter'>
              Đang tải danh sách chứng chỉ...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='p-3 space-y-3'>
      {/* Header */}
      <div className='flex justify-between items-start'>
        <div>
          <h1 className='text-xl font-bold font-heading text-gray-900 dark:text-white leading-tight'>
            Quản lý Chứng chỉ
          </h1>
          <p className='text-theme-xs text-gray-600 dark:text-gray-400 font-inter leading-tight mt-0.5'>
            Quản lý chứng chỉ chuyên môn để mở các lớp học
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={handleRefresh}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <RefreshCw className='w-4 h-4' />
            Làm mới
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className='inline-flex items-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
          >
            <Plus className='w-4 h-4' />
            Thêm chứng chỉ
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
        <MetricCard
          icon={CheckCircle2}
          label='Đã xác thực'
          value={certifications.filter(c => c.verification_status === 'VERIFIED').length}
          iconBgColor='bg-green-100 dark:bg-green-900/30'
          iconColor='text-green-600 dark:text-green-400'
          isLoading={loading}
        />
        <MetricCard
          icon={Clock}
          label='Chờ xác thực'
          value={certifications.filter(c => c.verification_status === 'PENDING').length}
          iconBgColor='bg-yellow-100 dark:bg-yellow-900/30'
          iconColor='text-yellow-600 dark:text-yellow-400'
          isLoading={loading}
        />
        <MetricCard
          icon={AlertCircle}
          label='Sắp hết hạn'
          value={
            certifications.filter(
              c =>
                c.verification_status === 'VERIFIED' &&
                c.expiration_date &&
                certificationService.isExpiringSoon(c.expiration_date)
            ).length
          }
          iconBgColor='bg-orange-100 dark:bg-orange-900/30'
          iconColor='text-orange-600 dark:text-orange-400'
          isLoading={loading}
        />
        <MetricCard
          icon={FileText}
          label='Tổng cộng'
          value={certifications.length}
          iconBgColor='bg-blue-100 dark:bg-blue-900/30'
          iconColor='text-blue-600 dark:text-blue-400'
          isLoading={loading}
        />
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
          {/* Search Input */}
          <div className='md:col-span-2 group relative'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
            <input
              type='text'
              placeholder='Tìm kiếm chứng chỉ...'
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className='w-full py-2 pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {/* Status Filter */}
          <div>
            <CustomSelect
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'VERIFIED', label: 'Đã xác thực' },
                { value: 'PENDING', label: 'Chờ xác thực' },
                { value: 'REJECTED', label: 'Bị từ chối' },
                { value: 'EXPIRED', label: 'Hết hạn' },
                { value: 'SUSPENDED', label: 'Tạm dừng' },
              ]}
              value={filterStatus}
              onChange={value => {
                setFilterStatus(value);
                setCurrentPage(1);
              }}
              placeholder='Tất cả trạng thái'
              className='font-inter'
            />
          </div>
        </div>
      </div>

      {/* Certifications Cards */}
      {filteredCertifications.length > 0 ? (
        <>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
            {paginatedCertifications.map((cert, index) => {
              const isExpired = cert.expiration_date
                ? certificationService.isExpired(cert.expiration_date)
                : false;
              const isExpiringSoon = cert.expiration_date
                ? certificationService.isExpiringSoon(cert.expiration_date)
                : false;
              const statusColor = certificationService.getStatusColor(cert.verification_status);

              return (
                <div
                  key={cert.id}
                  className='group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-orange-500/20 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 overflow-hidden hover:-translate-y-1 flex flex-col h-full opacity-0'
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                  }}
                >
                  {/* Gradient Accent Bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-opacity duration-300 ${
                      cert.verification_status === 'VERIFIED'
                        ? 'from-green-500 via-green-400 to-green-500 opacity-0 group-hover:opacity-100'
                        : cert.verification_status === 'PENDING'
                          ? 'from-yellow-500 via-yellow-400 to-yellow-500 opacity-0 group-hover:opacity-100'
                          : cert.verification_status === 'REJECTED'
                            ? 'from-red-500 via-red-400 to-red-500 opacity-0 group-hover:opacity-100'
                            : 'from-orange-500 via-orange-400 to-orange-500 opacity-0 group-hover:opacity-100'
                    }`}
                  ></div>

                  {/* Card Header */}
                  <div className='relative p-5 pb-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-b border-gray-100 dark:border-gray-800'>
                    <div className='flex items-start justify-between gap-3 mb-3'>
                      {/* Award Icon */}
                      <div
                        className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${getCategoryColor(cert.category)} p-3 shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-105`}
                      >
                        <Award className='w-7 h-7' />
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold font-heading tracking-wide flex-shrink-0 transition-all duration-200 ${statusColor}`}
                      >
                        {getStatusIcon(cert.verification_status)}
                        <span className='hidden sm:inline'>
                          {certificationService.formatVerificationStatus(cert.verification_status)}
                        </span>
                      </div>
                    </div>

                    {/* Certification Name */}
                    <h3 className='text-base font-bold font-heading text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight'>
                      {cert.certification_name}
                    </h3>

                    {/* Category and Level Badges */}
                    <div className='flex flex-wrap items-center gap-2'>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold font-heading tracking-wide transition-all duration-200 ${getCategoryColor(cert.category)}`}
                      >
                        {getCategoryLabel(cert.category)}
                      </span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold font-heading tracking-wide transition-all duration-200 ${certificationService.getLevelColor(cert.certification_level)}`}
                      >
                        {certificationService.formatCertificationLevel(cert.certification_level)}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className='p-5 space-y-3 flex-1 flex flex-col'>
                    {/* Issuer */}
                    <div className='flex items-center gap-2.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700'>
                      <Building2 className='w-4 h-4 flex-shrink-0 text-orange-500 dark:text-orange-400' />
                      <span className='text-[11px] font-semibold font-heading text-gray-800 dark:text-gray-200 truncate flex-1'>
                        {cert.certification_issuer}
                      </span>
                    </div>

                    {/* Dates Grid */}
                    <div className='grid grid-cols-1 gap-2'>
                      {/* Issued Date */}
                      <div className='flex items-center gap-2.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50'>
                        <CalendarCheck className='w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400' />
                        <div className='min-w-0 flex-1'>
                          <div className='text-[10px] font-medium font-inter text-blue-600 dark:text-blue-400 mb-0.5'>
                            Ngày cấp
                          </div>
                          <div className='text-[11px] font-bold font-heading text-blue-700 dark:text-blue-300'>
                            {formatDate(cert.issued_date)}
                          </div>
                        </div>
                      </div>

                      {/* Expiration Date */}
                      {cert.expiration_date ? (
                        <div
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${
                            isExpired
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50'
                              : isExpiringSoon
                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50'
                                : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50'
                          }`}
                        >
                          <CalendarX
                            className={`w-4 h-4 flex-shrink-0 ${
                              isExpired
                                ? 'text-red-600 dark:text-red-400'
                                : isExpiringSoon
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-green-600 dark:text-green-400'
                            }`}
                          />
                          <div className='min-w-0 flex-1'>
                            <div
                              className={`text-[10px] font-medium font-inter mb-0.5 ${
                                isExpired
                                  ? 'text-red-600 dark:text-red-400'
                                  : isExpiringSoon
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-green-600 dark:text-green-400'
                              }`}
                            >
                              Hết hạn
                            </div>
                            <div
                              className={`text-[11px] font-bold font-heading ${
                                isExpired
                                  ? 'text-red-700 dark:text-red-300'
                                  : isExpiringSoon
                                    ? 'text-orange-700 dark:text-orange-300'
                                    : 'text-green-700 dark:text-green-300'
                              }`}
                            >
                              {formatDate(cert.expiration_date)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className='flex items-center gap-2.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700'>
                          <Calendar className='w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500' />
                          <div className='min-w-0 flex-1'>
                            <div className='text-[10px] font-medium font-inter text-gray-500 dark:text-gray-400 mb-0.5'>
                              Hết hạn
                            </div>
                            <div className='text-[11px] font-medium font-heading text-gray-500 dark:text-gray-400'>
                              Không có
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {cert.certificate_file_url && (
                      <button
                        onClick={() => handleViewCertificate(cert)}
                        className='mt-auto w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-semibold font-heading text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl transition-all duration-200 hover:shadow-md active:scale-95'
                      >
                        <Eye className='w-4 h-4' />
                        <span>Xem chứng chỉ</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className='flex justify-center mt-6'>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12'>
          <div className='text-center'>
            <div className='text-theme-xs text-gray-500 dark:text-gray-400 font-inter mb-2'>
              {filterStatus !== 'all' || searchTerm
                ? 'Không tìm thấy chứng chỉ nào'
                : 'Chưa có chứng chỉ nào'}
            </div>
            {filterStatus === 'all' && !searchTerm && (
              <div className='text-[11px] text-gray-400 dark:text-gray-500 font-inter mt-2'>
                Thêm chứng chỉ chuyên môn để có thể mở các lớp học
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Certification Modal */}
      <AddCertificationModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        trainerId={getCurrentTrainerId() || ''}
        onSuccess={() => {
          fetchCertifications();
          fetchAvailableCategories();
        }}
      />

      {/* View Certificate Image Modal */}
      <Modal
        isOpen={viewCertificateModal}
        onClose={handleCloseCertificateModal}
        className='max-w-6xl m-4'
      >
        <div className='relative w-full max-w-6xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl'>
          {/* Header */}
          <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-gray-800 dark:to-gray-800/50'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg'>
                <Award className='w-5 h-5 text-orange-600 dark:text-orange-400' />
              </div>
              <div>
                <h3 className='text-lg font-bold font-heading text-gray-900 dark:text-white'>
                  {certificateName}
                </h3>
                <p className='text-[11px] text-gray-600 dark:text-gray-400 font-inter'>
                  Xem chứng chỉ đã tải lên
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {/* Zoom Controls */}
              <div className='flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1'>
                <button
                  type='button'
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 0.5}
                  className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  title='Thu nhỏ'
                >
                  <ZoomOut className='w-4 h-4 text-gray-600 dark:text-gray-400' />
                </button>
                <button
                  type='button'
                  onClick={handleResetZoom}
                  className='px-2 py-1 text-[10px] font-semibold font-heading text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200 min-w-[40px]'
                  title='Đặt lại'
                >
                  {Math.round(imageZoom * 100)}%
                </button>
                <button
                  type='button'
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 1}
                  className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  title='Phóng to'
                >
                  <ZoomIn className='w-4 h-4 text-gray-600 dark:text-gray-400' />
                </button>
              </div>
              {/* Download Button */}
              <button
                type='button'
                onClick={handleDownloadCertificate}
                className='inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg transition-all duration-200'
                title='Tải xuống'
              >
                <Download className='w-4 h-4' />
                <span className='hidden sm:inline'>Tải xuống</span>
              </button>
              {/* Close Button */}
              <button
                type='button'
                onClick={handleCloseCertificateModal}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200'
                title='Đóng'
              >
                <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div className='p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 min-h-[400px] max-h-[75vh] overflow-hidden'>
            {certificateImageUrl ? (
              <div className='relative w-full h-full flex items-center justify-center'>
                <img
                  src={certificateImageUrl}
                  alt={certificateName}
                  className='max-w-full max-h-[calc(75vh-120px)] w-auto h-auto object-contain rounded-lg shadow-lg'
                  style={{
                    transform: `scale(${Math.min(imageZoom, 1)})`,
                  }}
                  onError={(e) => {
                    console.error('Error loading certificate image:', {
                      url: certificateImageUrl,
                      error: e,
                    });
                    showToast({
                      type: 'error',
                      message: 'Không thể tải ảnh chứng chỉ. Vui lòng thử lại sau.',
                      duration: 5000,
                    });
                    // Don't close modal automatically, let user see the error
                  }}
                  onLoad={() => {
                    console.log('Certificate image loaded successfully:', certificateImageUrl);
                  }}
                />
              </div>
            ) : (
              <div className='text-center py-12'>
                <AlertCircle className='w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4' />
                <p className='text-gray-600 dark:text-gray-400 font-inter'>
                  Không thể tải ảnh chứng chỉ
                </p>
                <p className='text-[11px] text-gray-500 dark:text-gray-500 font-inter mt-2'>
                  URL: {certificateImageUrl || 'Không có URL'}
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
