import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Clock, MessageSquare, Printer, Search, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Feedback, scheduleService } from '../../services/schedule.service';
import AdminModal from '../../components/common/AdminModal';
import AdminCard from '../../components/common/AdminCard';
import CustomSelect from '../../components/common/CustomSelect';
import ExportButton from '../../components/common/ExportButton';
import MetricCard from '../../components/dashboard/MetricCard';
import Button from '../../components/ui/Button/Button';

export default function TrainerFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'status'>('newest');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Memoize fetchFeedbacks to prevent unnecessary re-renders
  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await scheduleService.getTrainerFeedback();

      if (response.success) {
        // Ensure data is an array
        const data = Array.isArray(response.data) ? response.data : [];
        setFeedbacks(data);
      } else {
        throw new Error(response.message || 'Lỗi tải feedback');
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải feedback từ học viên',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Filter and sort feedbacks
  useEffect(() => {
    let filtered = [...feedbacks];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        feedback =>
          feedback.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feedback.member_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feedback.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feedback.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(feedback => feedback.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(feedback => feedback.feedback_type === typeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'status':
          const statusOrder: { [key: string]: number } = {
            PENDING: 0,
            IN_PROGRESS: 1,
            RESOLVED: 2,
            CLOSED: 3,
          };
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
        default:
          return 0;
      }
    });

    setFilteredFeedbacks(filtered);
  }, [feedbacks, searchTerm, statusFilter, typeFilter, sortBy]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className='w-4 h-4' />;
      case 'IN_PROGRESS':
        return <AlertCircle className='w-4 h-4' />;
      case 'RESOLVED':
        return <CheckCircle className='w-4 h-4' />;
      case 'CLOSED':
        return <XCircle className='w-4 h-4' />;
      default:
        return <Clock className='w-4 h-4' />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]';
      case 'IN_PROGRESS':
        return 'bg-[var(--color-orange-200)] dark:bg-[var(--color-orange-800)]/30 text-[var(--color-orange-800)] dark:text-[var(--color-orange-300)]';
      case 'RESOLVED':
        return 'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]';
      case 'CLOSED':
        return 'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]';
      default:
        return 'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Chờ xử lý';
      case 'IN_PROGRESS':
        return 'Đang xử lý';
      case 'RESOLVED':
        return 'Đã giải quyết';
      case 'CLOSED':
        return 'Đã đóng';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'COMPLAINT':
        return 'Khiếu nại';
      case 'SUGGESTION':
        return 'Đề xuất';
      case 'QUESTION':
        return 'Câu hỏi';
      case 'PRAISE':
        return 'Khen ngợi';
      case 'TECHNICAL':
        return 'Kỹ thuật';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'COMPLAINT':
        return 'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]';
      case 'SUGGESTION':
        return 'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]';
      case 'QUESTION':
        return 'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]';
      case 'PRAISE':
        return 'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]';
      case 'TECHNICAL':
        return 'bg-[var(--color-orange-200)] dark:bg-[var(--color-orange-800)]/30 text-[var(--color-orange-800)] dark:text-[var(--color-orange-300)]';
      default:
        return 'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStatusUpdate = async (feedbackId: string, newStatus: string) => {
    try {
      const response = await scheduleService.updateFeedbackStatus(feedbackId, newStatus);
      if (response.success) {
        setFeedbacks(prev =>
          prev.map(feedback =>
            feedback.id === feedbackId ? { ...feedback, status: newStatus } : feedback
          )
        );
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Cập nhật trạng thái thành công',
            duration: 3000,
          });
        }
      } else {
        throw new Error(response.message || 'Lỗi cập nhật trạng thái');
      }
    } catch (error) {
      console.error('Error updating feedback status:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi cập nhật trạng thái',
          duration: 3000,
        });
      }
    }
  };

  const handleReply = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setReplyMessage(feedback.trainer_reply || '');
    setIsReplyModalOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedFeedback || !replyMessage.trim()) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Vui lòng nhập nội dung trả lời',
          duration: 3000,
        });
      }
      return;
    }

    try {
      setIsReplying(true);
      const response = await scheduleService.replyToFeedback(selectedFeedback.id, replyMessage.trim());

      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Đã trả lời feedback thành công',
            duration: 3000,
          });
        }
        setIsReplyModalOpen(false);
        setReplyMessage('');
        setSelectedFeedback(null);
        await fetchFeedbacks();
      } else {
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: response.message || 'Không thể trả lời feedback',
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      console.error('Error replying to feedback:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || 'Lỗi khi trả lời feedback',
          duration: 3000,
        });
      }
    } finally {
      setIsReplying(false);
    }
  };

  // Calculate stats
  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter(f => f.status === 'PENDING').length,
    inProgress: feedbacks.filter(f => f.status === 'IN_PROGRESS').length,
    resolved: feedbacks.filter(f => f.status === 'RESOLVED').length,
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-orange-600)] mx-auto mb-4'></div>
          <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
            Đang tải feedback...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen-full bg-gradient-to-br from-[var(--color-gray-50)] via-[var(--color-white)] to-[var(--color-gray-100)] dark:from-[var(--color-gray-900)] dark:via-[var(--color-gray-800)] dark:to-[var(--color-gray-900)]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 h-full flex flex-col'>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='mb-2 flex-shrink-0'
        >
          <div className='grid grid-cols-1 lg:grid-cols-5 gap-4'>
            {/* Title Section */}
            <div className='lg:col-span-1 space-y-0.5'>
              <h1 className='text-xl lg:text-2xl font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                Feedback lớp học
              </h1>
              <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] text-xs font-sans'>
                Xem và quản lý phản hồi từ học viên về các lớp học
              </p>
            </div>

            {/* Stats Overview */}
            <div className='lg:col-span-3'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                <MetricCard
                  icon={MessageSquare}
                  label='Tổng feedback'
                  value={stats.total}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
                <MetricCard
                  icon={Clock}
                  label='Chờ xử lý'
                  value={stats.pending}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
                <MetricCard
                  icon={AlertCircle}
                  label='Đang xử lý'
                  value={stats.inProgress}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
                <MetricCard
                  icon={CheckCircle}
                  label='Đã giải quyết'
                  value={stats.resolved}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className='lg:col-span-1'>
              <div className='relative overflow-hidden bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-lg shadow-sm border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] p-3'>
                <div className='text-center mb-3'>
                  <h3 className='text-sm font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    Thao tác
                  </h3>
                </div>
                <div className='space-y-2'>
                  {/* Export Button */}
                  {filteredFeedbacks.length > 0 && (
                    <ExportButton
                      data={filteredFeedbacks.map(feedback => ({
                        'Tên học viên': feedback.member_name,
                        Email: feedback.member_email,
                        'Lớp học': feedback.class_name,
                        'Tiêu đề': feedback.subject,
                        'Nội dung': feedback.message,
                        'Loại': getTypeLabel(feedback.feedback_type),
                        'Trạng thái': getStatusLabel(feedback.status),
                        'Ngày tạo': formatDateTime(feedback.created_at),
                        'Trả lời': feedback.trainer_reply || '',
                      }))}
                      columns={[
                        { key: 'Tên học viên', label: 'Tên học viên' },
                        { key: 'Email', label: 'Email' },
                        { key: 'Lớp học', label: 'Lớp học' },
                        { key: 'Tiêu đề', label: 'Tiêu đề' },
                        { key: 'Nội dung', label: 'Nội dung' },
                        { key: 'Loại', label: 'Loại' },
                        { key: 'Trạng thái', label: 'Trạng thái' },
                        { key: 'Ngày tạo', label: 'Ngày tạo' },
                        { key: 'Trả lời', label: 'Trả lời' },
                      ]}
                      filename={`feedback-${new Date().toISOString().split('T')[0]}`}
                      title='Báo cáo feedback'
                      variant='outline'
                      size='sm'
                    />
                  )}

                  {/* Print Button */}
                  {filteredFeedbacks.length > 0 && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        window.print();
                      }}
                      className='w-full border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] hover:bg-[var(--color-gray-50)] dark:hover:bg-[var(--color-gray-700)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)] transition-all duration-200'
                    >
                      <Printer className='w-3.5 h-3.5 mr-2' />
                      In báo cáo
                    </Button>
                  )}

                  {/* Stats Summary */}
                  {filteredFeedbacks.length > 0 && (
                    <div className='pt-2 mt-2 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
                      <div className='text-[10px] text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans space-y-1'>
                        <div className='flex justify-between'>
                          <span>Tổng:</span>
                          <span className='font-semibold'>{stats.total}</span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Chờ:</span>
                          <span className='font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'>
                            {stats.pending}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Đang xử lý:</span>
                          <span className='font-semibold text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)]'>
                            {stats.inProgress}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Đã giải quyết:</span>
                          <span className='font-semibold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'>
                            {stats.resolved}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='mb-3'
        >
          <AdminCard className='p-3'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
              {/* Search */}
              <div className='w-full group relative'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200 pointer-events-none z-10' />
                <input
                  type='text'
                  placeholder='Tìm theo tên, email, lớp...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full h-[30px] pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                />
              </div>

              {/* Status Filter */}
              <div className='w-full'>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'PENDING', label: 'Chờ xử lý' },
                    { value: 'IN_PROGRESS', label: 'Đang xử lý' },
                    { value: 'RESOLVED', label: 'Đã giải quyết' },
                    { value: 'CLOSED', label: 'Đã đóng' },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder='Tất cả trạng thái'
                  className='font-inter w-full'
                />
              </div>

              {/* Type Filter */}
              <div className='w-full'>
                <CustomSelect
                  options={[
                    { value: 'all', label: 'Tất cả loại' },
                    { value: 'COMPLAINT', label: 'Khiếu nại' },
                    { value: 'SUGGESTION', label: 'Đề xuất' },
                    { value: 'QUESTION', label: 'Câu hỏi' },
                    { value: 'PRAISE', label: 'Khen ngợi' },
                    { value: 'TECHNICAL', label: 'Kỹ thuật' },
                  ]}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  placeholder='Tất cả loại'
                  className='font-inter w-full'
                />
              </div>

              {/* Sort By */}
              <div className='w-full'>
                <CustomSelect
                  options={[
                    { value: 'newest', label: 'Mới nhất' },
                    { value: 'oldest', label: 'Cũ nhất' },
                    { value: 'status', label: 'Theo trạng thái' },
                  ]}
                  value={sortBy}
                  onChange={value => setSortBy(value as 'newest' | 'oldest' | 'status')}
                  placeholder='Sắp xếp theo'
                  className='font-inter w-full'
                />
              </div>
            </div>

            {/* Filter Summary */}
            <div className='mt-3 pt-3 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)] flex items-center justify-between'>
              <div className='text-[11px] text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                Hiển thị {filteredFeedbacks.length} / {feedbacks.length} feedback
              </div>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSearchTerm('');
                  setSortBy('newest');
                }}
                className='text-[11px] text-[var(--color-orange-600)] hover:text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)] dark:hover:text-[var(--color-orange-300)] font-sans'
              >
                Xóa bộ lọc
              </button>
            </div>
          </AdminCard>
        </motion.div>

        {/* Feedbacks List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className='space-y-3 flex-1'
        >
          {filteredFeedbacks.length === 0 ? (
            <AdminCard>
              <div className='text-center py-12'>
                <MessageSquare className='w-16 h-16 text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)] mx-auto mb-4' />
                <h3 className='text-lg font-medium text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2 font-heading'>
                  {feedbacks.length === 0 ? 'Không có feedback nào' : 'Không tìm thấy feedback nào'}
                </h3>
                <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                  {feedbacks.length === 0
                    ? 'Chưa có feedback nào từ học viên'
                    : 'Không có feedback nào phù hợp với bộ lọc'}
                </p>
                {feedbacks.length > 0 && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setTypeFilter('all');
                      setSearchTerm('');
                      setSortBy('newest');
                    }}
                    className='mt-4 text-[var(--color-orange-600)] hover:text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)] dark:hover:text-[var(--color-orange-300)] font-sans'
                  >
                    Xóa bộ lọc để xem tất cả
                  </button>
                )}
              </div>
            </AdminCard>
          ) : (
            filteredFeedbacks.map(feedback => (
              <AdminCard key={feedback.id} hover className='transition-all duration-200 hover:shadow-md'>
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex items-center space-x-4'>
                    <div className='w-12 h-12 bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] rounded-full flex items-center justify-center text-[var(--color-white)] font-semibold font-heading'>
                      {feedback.member_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                        {feedback.member_name}
                      </h3>
                      <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                        {feedback.member_email}
                      </p>
                      <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                        {feedback.class_name}
                      </p>
                    </div>
                  </div>

                  <div className='flex items-center space-x-2'>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium font-sans ${getTypeColor(
                        feedback.feedback_type
                      )}`}
                    >
                      {getTypeLabel(feedback.feedback_type)}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 font-sans ${getStatusColor(
                        feedback.status
                      )}`}
                    >
                      {getStatusIcon(feedback.status)}
                      <span>{getStatusLabel(feedback.status)}</span>
                    </span>
                  </div>
                </div>

                <div className='mb-4'>
                  <h4 className='text-lg font-medium text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2 font-heading'>
                    {feedback.subject}
                  </h4>
                  <p className='text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] leading-relaxed font-sans'>
                    {feedback.message}
                  </p>
                </div>

                {feedback.trainer_reply && (
                  <div className='mt-4 p-4 bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 rounded-lg border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                    <div className='flex items-start space-x-3'>
                      <div className='flex-shrink-0'>
                        <div className='w-8 h-8 bg-[var(--color-orange-600)] rounded-full flex items-center justify-center text-[var(--color-white)] text-sm font-semibold font-heading'>
                          Bạn
                        </div>
                      </div>
                      <div className='flex-1'>
                        <p className='text-sm font-medium text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-1 font-sans'>
                          Phản hồi của bạn
                        </p>
                        <p className='text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] text-sm font-sans'>
                          {feedback.trainer_reply}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className='flex items-center justify-between mt-4'>
                  <span className='text-sm text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                    {formatDate(feedback.created_at)}
                  </span>

                  <div className='flex items-center space-x-2'>
                    {feedback.status === 'PENDING' && (
                      <Button
                        size='sm'
                        onClick={() => handleStatusUpdate(feedback.id, 'IN_PROGRESS')}
                        className='bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] border-0'
                      >
                        Bắt đầu xử lý
                      </Button>
                    )}

                    {feedback.status === 'IN_PROGRESS' && (
                      <Button
                        size='sm'
                        onClick={() => handleStatusUpdate(feedback.id, 'RESOLVED')}
                        className='bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] border-0'
                      >
                        Đánh dấu đã giải quyết
                      </Button>
                    )}

                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleReply(feedback)}
                      className='border-[var(--color-orange-300)] dark:border-[var(--color-orange-600)] text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/10'
                    >
                      {feedback.trainer_reply ? 'Chỉnh sửa trả lời' : 'Trả lời'}
                    </Button>
                  </div>
                </div>
              </AdminCard>
            ))
          )}
        </motion.div>
      </div>

      {/* Reply Modal */}
      <AdminModal
        isOpen={isReplyModalOpen}
        onClose={() => {
          setIsReplyModalOpen(false);
          setReplyMessage('');
          setSelectedFeedback(null);
        }}
        title='Trả lời feedback'
        size='md'
      >
        <div className='space-y-4'>
          {selectedFeedback && (
            <AdminCard className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-700)]'>
              <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-2 font-sans'>
                Feedback từ <span className='font-medium'>{selectedFeedback.member_name}</span>
              </p>
              <p className='text-sm font-medium text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-1 font-sans'>
                {selectedFeedback.subject}
              </p>
              <p className='text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] text-sm font-sans'>
                {selectedFeedback.message}
              </p>
            </AdminCard>
          )}

          <div>
            <label className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2 font-sans'>
              Nội dung trả lời
            </label>
            <textarea
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
              placeholder='Nhập nội dung trả lời...'
              rows={5}
              className='w-full px-4 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent dark:bg-[var(--color-gray-700)] dark:text-[var(--color-white)] resize-none font-sans'
            />
          </div>

          <div className='flex justify-end space-x-3 pt-4'>
            <Button
              variant='outline'
              onClick={() => {
                setIsReplyModalOpen(false);
                setReplyMessage('');
                setSelectedFeedback(null);
              }}
              disabled={isReplying}
              className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
            >
              Hủy
            </Button>
            <Button
              variant='primary'
              onClick={handleSubmitReply}
              disabled={isReplying || !replyMessage.trim()}
              className='bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] border-0'
            >
              {isReplying ? 'Đang gửi...' : 'Gửi trả lời'}
            </Button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
