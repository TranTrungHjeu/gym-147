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

  // Listen for certification events to update certifications list optimistically
  useEffect(() => {
    // Helper to update certification status optimistically
    const updateCertificationStatus = (certificationId: string, status: string, data?: any) => {
      setCertifications(prev => {
        const index = prev.findIndex(cert => cert.id === certificationId);
        if (index === -1) {
          // Certification not found, might be new - will be added by socket data if available
          console.log(`[INFO] [TRAINER_CERTS] Certification ${certificationId} not found in list, skipping optimistic update`);
          return prev;
        }

        // Update existing certification
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          verification_status: status as any,
          updated_at: new Date().toISOString(),
        };
        console.log(`[SUCCESS] [TRAINER_CERTS] Updated certification ${certificationId} status to ${status} optimistically`);
        return updated;
      });
    };

    // Helper to add new certification optimistically
    const addCertificationOptimistically = (certData: any) => {
      if (!certData?.certification_id && !certData?.id) {
        console.warn('[WARNING] [TRAINER_CERTS] Cannot add certification: missing id');
        return;
      }

      const certId = certData.certification_id || certData.id;
      
      setCertifications(prev => {
        // Check if certification already exists
        const exists = prev.some(cert => cert.id === certId);
        if (exists) {
          console.log(`[INFO] [TRAINER_CERTS] Certification ${certId} already exists, updating status instead`);
          // Update status if it exists
          updateCertificationStatus(certId, certData.verification_status || 'PENDING', certData);
          return prev;
        }

        // Create new certification object from socket data
        // Note: This is a partial object, full data will be synced from server
        const newCert: Certification = {
          id: certId,
          trainer_id: getCurrentTrainerId() || '',
          category: certData.category || '',
          certification_name: certData.certification_name || certData.certificationName || 'Chứng chỉ mới',
          certification_issuer: certData.certification_issuer || certData.certificationIssuer || '',
          certification_level: certData.certification_level || certData.certificationLevel || 'BASIC',
          issued_date: certData.issued_date || certData.issuedDate || new Date().toISOString(),
          expiration_date: certData.expiration_date || certData.expirationDate,
          verification_status: certData.verification_status || certData.verificationStatus || 'PENDING',
          certificate_file_url: certData.certificate_file_url || certData.certificateFileUrl,
          is_active: true,
          created_at: certData.created_at || new Date().toISOString(),
          updated_at: certData.updated_at || new Date().toISOString(),
        };

        // Add to beginning of list (newest first)
        console.log(`[SUCCESS] [TRAINER_CERTS] Added certification ${certId} optimistically`);
        return [newCert, ...prev];
      });

      // Also update available categories if needed
      fetchAvailableCategories();
    };

    const handleCertificationUpdated = (event: CustomEvent) => {
      console.log('[NOTIFY] certification:updated event received in TrainerCertifications:', event.detail);
      const data = event.detail;

      // If we have certification data, update optimistically
      if (data?.certification_id || data?.id) {
        const certId = data.certification_id || data.id;
        const status = data.verification_status || data.status || 'PENDING';
        
        // Update certification status optimistically
        updateCertificationStatus(certId, status, data);
        
        // Background sync after delay to ensure data consistency
        setTimeout(() => {
          fetchCertifications(false);
          fetchAvailableCategories();
        }, 1500);
      } else {
        // No certification data, do full refresh
        setTimeout(() => {
          fetchCertifications(false);
          fetchAvailableCategories();
        }, 1000);
      }
    };

    const handleCertificationCreated = (event: CustomEvent) => {
      console.log('[NOTIFY] certification:created event received in TrainerCertifications:', event.detail);
      const data = event.detail;

      // Optimistically add certification to the list
      if (data?.certification_id || data?.id) {
        const certId = data.certification_id || data.id;
        
        // Check if certification already exists
        setCertifications(prev => {
          const exists = prev.some(cert => cert.id === certId);
          if (exists) {
            // Update existing certification
            return prev.map(cert => {
              if (cert.id === certId) {
                return {
                  ...cert,
                  category: data.category || cert.category,
                  certification_name: data.certification_name || cert.certification_name,
                  certification_issuer: data.certification_issuer || cert.certification_issuer,
                  certification_level: data.certification_level || cert.certification_level,
                  verification_status: data.verification_status || cert.verification_status,
                  certificate_file_url: data.certificate_file_url || cert.certificate_file_url,
                  issued_date: data.issued_date || cert.issued_date,
                  expiration_date: data.expiration_date || cert.expiration_date,
                  updated_at: data.updated_at || new Date().toISOString(),
                };
              }
              return cert;
            });
          }
          
          // Add new certification at the beginning
          const newCert: Certification = {
            id: certId,
            trainer_id: data.trainer_id || '',
            category: data.category || '',
            certification_name: data.certification_name || 'New Certification',
            certification_issuer: data.certification_issuer || '',
            certification_level: (data.certification_level as any) || 'BASIC',
            issued_date: data.issued_date || new Date().toISOString(),
            expiration_date: data.expiration_date,
            verification_status: data.verification_status || 'PENDING',
            certificate_file_url: data.certificate_file_url,
            is_active: data.is_active !== undefined ? data.is_active : true,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          };
          
          console.log(`[SUCCESS] [TRAINER_CERTS] Added certification ${certId} optimistically`);
          return [newCert, ...prev];
        });
        
        // Background sync after delay to ensure data consistency
        setTimeout(() => {
          fetchCertifications(false);
          fetchAvailableCategories();
        }, 1500);
      } else {
        // No certification data, do full refresh
        setTimeout(() => {
          fetchCertifications(false);
          fetchAvailableCategories();
        }, 1000);
      }
    };

    const handleCertificationDeleted = (event: CustomEvent) => {
      console.log('[NOTIFY] certification:deleted event received in TrainerCertifications:', event.detail);
      const data = event.detail;

      // Remove certification optimistically (no reload)
      if (data?.certification_id || data?.id) {
        const certId = data.certification_id || data.id;
        
        // Check if certification exists before removing
        setCertifications(prev => {
          const exists = prev.some(cert => cert.id === certId);
          if (!exists) {
            console.log(`[INFO] [TRAINER_CERTS] Certification ${certId} not found in list, skipping removal`);
            return prev;
          }
          
          const filtered = prev.filter(cert => cert.id !== certId);
          console.log(`[SUCCESS] [TRAINER_CERTS] Removed certification ${certId} optimistically. Remaining: ${filtered.length}`);
          return filtered;
        });

        // Background sync after delay to ensure data consistency
        setTimeout(() => {
          fetchCertifications(false);
        }, 2000);
      }
    };

    // Listen for socket events directly (for real-time updates)
    // Socket is managed by TrainerLayout, so we can access it via window
    // For now, we rely on custom events dispatched by TrainerLayout
    // Socket events are already handled in TrainerLayout and dispatched as custom events
    window.addEventListener('certification:updated', handleCertificationUpdated as EventListener);
    window.addEventListener('certification:created', handleCertificationCreated as EventListener);
    window.addEventListener('certification:deleted', handleCertificationDeleted as EventListener);

    return () => {
      window.removeEventListener('certification:updated', handleCertificationUpdated as EventListener);
      window.removeEventListener('certification:created', handleCertificationCreated as EventListener);
      window.removeEventListener('certification:deleted', handleCertificationDeleted as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // With new logic, we show all certifications (including inactive ones)
    // But we can still filter by status and search
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
          iconBgColor='bg-orange-100 dark:bg-orange-900/30'
          iconColor='text-orange-600 dark:text-orange-400'
          isLoading={loading}
        />
        <MetricCard
          icon={Clock}
          label='Chờ xác thực'
          value={certifications.filter(c => c.verification_status === 'PENDING').length}
          iconBgColor='bg-orange-100 dark:bg-orange-900/30'
          iconColor='text-orange-600 dark:text-orange-400'
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
          iconBgColor='bg-orange-100 dark:bg-orange-900/30'
          iconColor='text-orange-600 dark:text-orange-400'
          isLoading={loading}
        />
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-3'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          {/* Search Input */}
          <div className='group relative w-full'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200' />
            <input
              type='text'
              placeholder='Tìm kiếm chứng chỉ...'
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className='w-full h-[30px] pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            />
          </div>

          {/* Status Filter */}
          <div className='w-full'>
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
              className='font-inter w-full'
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
                  className={`group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg hover:shadow-orange-500/10 dark:hover:shadow-orange-500/20 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-200 overflow-hidden hover:-translate-y-0.5 flex flex-col h-full animate-fadeInUp`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    filter: cert.is_active === false ? 'grayscale(100%)' : 'none',
                  }}
                >
                  {/* Status Accent Bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-0.5 ${
                      cert.verification_status === 'VERIFIED'
                        ? 'bg-green-500'
                        : cert.verification_status === 'PENDING'
                          ? 'bg-yellow-500'
                          : cert.verification_status === 'REJECTED'
                            ? 'bg-red-500'
                            : 'bg-orange-500'
                    }`}
                  ></div>

                  {/* Card Header with Certificate Image Background */}
                  <div 
                    className='relative overflow-hidden'
                    style={{
                      backgroundImage: cert.certificate_file_url 
                        ? `url(${cert.certificate_file_url})` 
                        : 'linear-gradient(to bottom right, rgb(249, 250, 251), rgb(255, 255, 255))',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      minHeight: '160px',
                    }}
                  >
                    {/* Overlay for better text readability */}
                    <div className='absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 dark:from-black/80 dark:via-black/60 dark:to-black/90'></div>
                    
                    {/* Content with relative positioning */}
                    <div className='relative z-10 p-4'>
                      {/* Status Badge - Top Right */}
                      <div className='flex items-start justify-between gap-2 mb-3'>
                        <div className='flex-1 min-w-0'>
                          {/* Certification Name with Gradient Animation */}
                          <h3 
                            className='text-sm font-bold font-heading mb-2 line-clamp-2 leading-tight drop-shadow-md'
                            style={{ 
                              backgroundImage: cert.is_active === false 
                                ? 'none' 
                                : 'linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                              backgroundSize: cert.is_active === false ? 'auto' : '300% 100%',
                              backgroundPosition: cert.is_active === false ? 'center' : '200% center',
                              WebkitBackgroundClip: cert.is_active === false ? 'initial' : 'text',
                              WebkitTextFillColor: cert.is_active === false ? 'rgba(255, 255, 255, 0.7)' : 'transparent',
                              backgroundClip: cert.is_active === false ? 'initial' : 'text',
                              color: cert.is_active === false ? 'rgba(255, 255, 255, 0.7)' : undefined,
                              animation: cert.is_active === false ? 'none' : 'gradientFlowHorizontal 3s ease-in-out infinite',
                            }}
                          >
                            {cert.certification_name}
                          </h3>
                        </div>
                        {/* Status Badge */}
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold font-heading tracking-wide flex-shrink-0 backdrop-blur-md bg-white/95 dark:bg-gray-900/95 shadow-sm ${statusColor}`}
                        >
                          {getStatusIcon(cert.verification_status)}
                          <span className='hidden sm:inline'>
                            {certificationService.formatVerificationStatus(cert.verification_status)}
                          </span>
                        </div>
                      </div>

                      {/* Category and Level Badges */}
                      <div className='flex flex-wrap items-center gap-1.5'>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-heading tracking-wide backdrop-blur-md bg-white/95 dark:bg-gray-900/95 shadow-sm ${getCategoryColor(cert.category)}`}
                        >
                          {getCategoryLabel(cert.category)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-heading tracking-wide backdrop-blur-md bg-white/95 dark:bg-gray-900/95 shadow-sm ${certificationService.getLevelColor(cert.certification_level)}`}
                        >
                          {certificationService.formatCertificationLevel(cert.certification_level)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inactive Overlay - Centered (on top of everything) */}
                  {cert.is_active === false && (
                    <div 
                      className='absolute inset-0 z-50 pointer-events-none flex items-center justify-center'
                    >
                      <img 
                        src='/images/cetificate/inactive.png'
                        alt='Inactive'
                        className='w-40 h-40 object-contain opacity-90'
                      />
                    </div>
                  )}

                  {/* Card Body */}
                  <div className='p-4 space-y-2.5 flex-1 flex flex-col relative z-10'>
                    {/* Issuer */}
                    <div className='flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700'>
                      <Building2 className='w-3.5 h-3.5 flex-shrink-0 text-orange-500 dark:text-orange-400' />
                      <span className='text-[11px] font-medium font-heading text-gray-800 dark:text-gray-200 truncate flex-1'>
                        {cert.certification_issuer}
                      </span>
                    </div>

                    {/* Dates Grid */}
                    <div className='grid grid-cols-2 gap-2'>
                      {/* Issued Date */}
                      <div className='flex items-start gap-2 px-2.5 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800/50'>
                        <CalendarCheck className='w-3.5 h-3.5 flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5' />
                        <div className='min-w-0 flex-1'>
                          <div className='text-[10px] font-medium font-inter text-orange-600 dark:text-orange-400 mb-0.5'>
                            Cấp
                          </div>
                          <div className='text-[11px] font-bold font-heading text-orange-700 dark:text-orange-300 leading-tight'>
                            {formatDate(cert.issued_date)}
                          </div>
                        </div>
                      </div>

                      {/* Expiration Date */}
                      {cert.expiration_date ? (
                        <div className='flex items-start gap-2 px-2.5 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800/50'>
                          <CalendarX className='w-3.5 h-3.5 flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5' />
                          <div className='min-w-0 flex-1'>
                            <div className='text-[10px] font-medium font-inter text-orange-600 dark:text-orange-400 mb-0.5'>
                              Hết hạn
                            </div>
                            <div className='text-[11px] font-bold font-heading text-orange-700 dark:text-orange-300 leading-tight'>
                              {formatDate(cert.expiration_date)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className='flex items-start gap-2 px-2.5 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800/50'>
                          <Calendar className='w-3.5 h-3.5 flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5' />
                          <div className='min-w-0 flex-1'>
                            <div className='text-[10px] font-medium font-inter text-orange-600 dark:text-orange-400 mb-0.5'>
                              Hết hạn
                            </div>
                            <div className='text-[11px] font-medium font-heading text-orange-600 dark:text-orange-400 leading-tight'>
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
                        className='mt-auto w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg transition-all duration-200 hover:shadow-sm active:scale-95'
                      >
                        <Eye className='w-3.5 h-3.5' />
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
                totalItems={filteredCertifications.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                showItemsPerPage={false}
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
          // Don't reload - optimistic update from event listener will handle UI update
          // Only sync available categories in background (no UI impact)
          setTimeout(() => {
            fetchAvailableCategories();
          }, 1000);
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
          <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-gray-800 dark:to-gray-800/50 pr-16'>
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
            {/* Download Button */}
            <button
              type='button'
              onClick={handleDownloadCertificate}
              className='inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold font-heading text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg transition-all duration-200 flex-shrink-0'
              title='Tải xuống'
            >
              <Download className='w-4 h-4' />
              <span className='hidden sm:inline'>Tải xuống</span>
            </button>
          </div>

          {/* Image Container */}
          <div className='p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 min-h-[400px] max-h-[75vh] overflow-hidden'>
            {certificateImageUrl ? (
              <div className='relative w-full h-full flex items-center justify-center'>
                <img
                  src={certificateImageUrl}
                  alt={certificateName}
                  className='max-w-full max-h-[calc(75vh-120px)] w-auto h-auto object-contain rounded-lg shadow-lg'
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
