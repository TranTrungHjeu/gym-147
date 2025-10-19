import { useEffect, useState } from 'react';
import AddCertificationModal from '../../components/certification/AddCertificationModal';
import Button from '../../components/ui/Button/Button';
import {
  AvailableCategory,
  Certification,
  certificationService,
} from '../../services/certification.service';

// Icons
const PlusIcon = () => (
  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
  </svg>
);

const DocumentIcon = () => (
  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    />
  </svg>
);

const ClockIcon = () => (
  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    />
  </svg>
);

const CheckIcon = () => (
  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
  </svg>
);

const XIcon = () => (
  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
  </svg>
);

const AlertIcon = () => (
  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z'
    />
  </svg>
);

export default function TrainerCertifications() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [availableCategories, setAvailableCategories] = useState<AvailableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Get current trainer ID from localStorage or context
  const getCurrentUserId = () => {
    // Get user_id from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.id;
    }
    return 'cmgrzx43a0002tz4or35rf13p'; // Fallback for testing
  };

  useEffect(() => {
    fetchCertifications();
    fetchAvailableCategories();
  }, []);

  const fetchCertifications = async () => {
    try {
      setLoading(true);
      const userId = getCurrentUserId();
      const data = await certificationService.getTrainerCertifications(userId);
      setCertifications(data);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải danh sách chứng chỉ',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCategories = async () => {
    try {
      const userId = getCurrentUserId();
      const data = await certificationService.getAvailableCategories(userId);
      setAvailableCategories(data);
    } catch (error) {
      console.error('Error fetching available categories:', error);
    }
  };

  const filteredCertifications = certifications.filter(cert => {
    if (!filterStatus) return true;
    return cert.verification_status === filterStatus;
  });

  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
      CARDIO: 'Cardio',
      STRENGTH: 'Tăng cơ',
      YOGA: 'Yoga',
      PILATES: 'Pilates',
      DANCE: 'Nhảy',
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
        return <CheckIcon />;
      case 'REJECTED':
        return <XIcon />;
      case 'PENDING':
        return <ClockIcon />;
      case 'EXPIRED':
        return <AlertIcon />;
      case 'SUSPENDED':
        return <AlertIcon />;
      default:
        return <ClockIcon />;
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-[var(--color-gray-50)] via-[var(--color-white)] to-[var(--color-gray-100)] dark:from-[var(--color-gray-900)] dark:via-[var(--color-gray-800)] dark:to-[var(--color-gray-900)]'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-orange-500)] mx-auto mb-4'></div>
              <p
                className='text-gray-600 dark:text-gray-400'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Đang tải danh sách chứng chỉ...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-[var(--color-gray-50)] via-[var(--color-white)] to-[var(--color-gray-100)] dark:from-[var(--color-gray-900)] dark:via-[var(--color-gray-800)] dark:to-[var(--color-gray-900)]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {/* Header Section */}
        <div className='mb-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1
                className='text-2xl font-bold text-gray-800 dark:text-white/90 mb-2'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Quản lý Chứng chỉ
              </h1>
              <p className='text-gray-600 dark:text-gray-400'>
                Quản lý chứng chỉ chuyên môn để mở các lớp học
              </p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className='bg-[var(--color-orange-500)] hover:bg-[var(--color-orange-600)] text-white'
            >
              <PlusIcon />
              Thêm chứng chỉ
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center'>
              <div className='p-3 rounded-full bg-green-100 dark:bg-green-900'>
                <CheckIcon />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Đã xác thực</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {certifications.filter(c => c.verification_status === 'VERIFIED').length}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center'>
              <div className='p-3 rounded-full bg-yellow-100 dark:bg-yellow-900'>
                <ClockIcon />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Chờ xác thực</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {certifications.filter(c => c.verification_status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center'>
              <div className='p-3 rounded-full bg-orange-100 dark:bg-orange-900'>
                <AlertIcon />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Sắp hết hạn</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {
                    certifications.filter(
                      c =>
                        c.verification_status === 'VERIFIED' &&
                        c.expiration_date &&
                        certificationService.isExpiringSoon(c.expiration_date)
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6'>
            <div className='flex items-center'>
              <div className='p-3 rounded-full bg-blue-100 dark:bg-blue-900'>
                <DocumentIcon />
              </div>
              <div className='ml-4'>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Tổng cộng</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {certifications.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8'>
          <div className='flex items-center gap-4'>
            <div className='flex-1'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Lọc theo trạng thái
              </label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent'
              >
                <option value=''>Tất cả trạng thái</option>
                <option value='VERIFIED'>Đã xác thực</option>
                <option value='PENDING'>Chờ xác thực</option>
                <option value='REJECTED'>Bị từ chối</option>
                <option value='EXPIRED'>Hết hạn</option>
                <option value='SUSPENDED'>Tạm dừng</option>
              </select>
            </div>
          </div>
        </div>

        {/* Certifications Grid */}
        {filteredCertifications.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {filteredCertifications.map((cert, index) => (
              <div
                key={cert.id}
                className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 overflow-hidden group'
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards',
                }}
              >
                {/* Header */}
                <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
                  <div className='flex items-start justify-between mb-4'>
                    <div className='flex-1'>
                      <h3
                        className='text-lg font-bold text-gray-900 dark:text-white mb-2'
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {cert.certification_name}
                      </h3>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {cert.certification_issuer}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(cert.category)}`}
                      >
                        {getCategoryLabel(cert.category)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className='flex items-center justify-between'>
                    <div
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${certificationService.getStatusColor(cert.verification_status)}`}
                    >
                      {getStatusIcon(cert.verification_status)}
                      {certificationService.formatVerificationStatus(cert.verification_status)}
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${certificationService.getLevelColor(cert.certification_level)}`}
                    >
                      {certificationService.formatCertificationLevel(cert.certification_level)}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className='p-6'>
                  <div className='space-y-3 mb-4'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-500 dark:text-gray-400'>Ngày cấp:</span>
                      <span className='text-gray-900 dark:text-white font-medium'>
                        {formatDate(cert.issued_date)}
                      </span>
                    </div>
                    {cert.expiration_date && (
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-gray-500 dark:text-gray-400'>Ngày hết hạn:</span>
                        <span
                          className={`font-medium ${
                            certificationService.isExpired(cert.expiration_date)
                              ? 'text-red-600 dark:text-red-400'
                              : certificationService.isExpiringSoon(cert.expiration_date)
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {formatDate(cert.expiration_date)}
                        </span>
                      </div>
                    )}
                    {cert.verified_at && (
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-gray-500 dark:text-gray-400'>Xác thực:</span>
                        <span className='text-gray-900 dark:text-white font-medium'>
                          {formatDate(cert.verified_at)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Rejection Reason */}
                  {cert.rejection_reason && (
                    <div className='mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800'>
                      <p className='text-sm text-red-800 dark:text-red-200'>
                        <strong>Lý do từ chối:</strong> {cert.rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className='flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center gap-2'>
                      {cert.certificate_file_url && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() =>
                            window.open(
                              certificationService.getCertificateFileUrl(
                                cert.certificate_file_url!.split('/').pop()!
                              ),
                              '_blank'
                            )
                          }
                          className='text-[var(--color-orange-600)] border-[var(--color-orange-600)] hover:bg-[var(--color-orange-50)] dark:text-[var(--color-orange-400)] dark:border-[var(--color-orange-400)] dark:hover:bg-[var(--color-orange-900)]'
                        >
                          <DocumentIcon />
                          Xem chứng chỉ
                        </Button>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      {cert.verification_status === 'PENDING' && (
                        <span className='text-xs text-yellow-600 dark:text-yellow-400 font-medium'>
                          Đang chờ xác thực
                        </span>
                      )}
                      {cert.verification_status === 'VERIFIED' &&
                        cert.expiration_date &&
                        certificationService.isExpiringSoon(cert.expiration_date) && (
                          <span className='text-xs text-orange-600 dark:text-orange-400 font-medium'>
                            Sắp hết hạn
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-16'>
            <div className='max-w-md mx-auto'>
              <div className='w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[var(--color-orange-100)] to-[var(--color-orange-200)] dark:from-[var(--color-orange-900)] dark:to-[var(--color-orange-800)] rounded-full flex items-center justify-center'>
                <DocumentIcon />
              </div>
              <h3
                className='text-2xl font-bold text-gray-900 dark:text-white mb-3'
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {filterStatus ? 'Không tìm thấy chứng chỉ phù hợp' : 'Chưa có chứng chỉ nào'}
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-6 leading-relaxed'>
                {filterStatus
                  ? 'Thử thay đổi bộ lọc để xem chứng chỉ khác'
                  : 'Bạn cần thêm chứng chỉ chuyên môn để có thể mở các lớp học. Hãy bắt đầu bằng việc thêm chứng chỉ đầu tiên.'}
              </p>
              {!filterStatus && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className='bg-[var(--color-orange-500)] hover:bg-[var(--color-orange-600)] text-white'
                >
                  <PlusIcon />
                  Thêm chứng chỉ đầu tiên
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Add Certification Modal */}
        <AddCertificationModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          trainerId={getCurrentUserId()}
          onSuccess={() => {
            fetchCertifications();
            fetchAvailableCategories();
          }}
        />
      </div>
    </div>
  );
}
