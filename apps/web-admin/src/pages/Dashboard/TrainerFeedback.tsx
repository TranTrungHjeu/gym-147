import { AlertCircle, CheckCircle, Clock, MessageSquare, Search, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Feedback, scheduleService } from '../../services/schedule.service';

export default function TrainerFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'status'>('newest');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
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
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch =
      feedback.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.member_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === '' || feedback.status === statusFilter;
    const matchesType = typeFilter === '' || feedback.feedback_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const sortedFeedbacks = [...filteredFeedbacks].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'status':
        const statusOrder = { PENDING: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      default:
        return 0;
    }
  });

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
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
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
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'SUGGESTION':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'QUESTION':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'PRAISE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'TECHNICAL':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
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

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Đang tải feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>Feedback lớp học</h1>
        <p className='text-gray-600 dark:text-gray-400'>
          Xem và quản lý phản hồi từ học viên về các lớp học
        </p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-600 dark:text-gray-400 text-sm'>Tổng feedback</p>
              <p className='text-3xl font-bold text-gray-900 dark:text-white'>{feedbacks.length}</p>
            </div>
            <div className='p-3 bg-blue-100 dark:bg-blue-900 rounded-lg'>
              <MessageSquare className='w-6 h-6 text-blue-600 dark:text-blue-400' />
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-600 dark:text-gray-400 text-sm'>Chờ xử lý</p>
              <p className='text-3xl font-bold text-yellow-600'>
                {feedbacks.filter(f => f.status === 'PENDING').length}
              </p>
            </div>
            <div className='p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg'>
              <Clock className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-600 dark:text-gray-400 text-sm'>Đang xử lý</p>
              <p className='text-3xl font-bold text-blue-600'>
                {feedbacks.filter(f => f.status === 'IN_PROGRESS').length}
              </p>
            </div>
            <div className='p-3 bg-blue-100 dark:bg-blue-900 rounded-lg'>
              <AlertCircle className='w-6 h-6 text-blue-600 dark:text-blue-400' />
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-600 dark:text-gray-400 text-sm'>Đã giải quyết</p>
              <p className='text-3xl font-bold text-green-600'>
                {feedbacks.filter(f => f.status === 'RESOLVED').length}
              </p>
            </div>
            <div className='p-3 bg-green-100 dark:bg-green-900 rounded-lg'>
              <CheckCircle className='w-6 h-6 text-green-600 dark:text-green-400' />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6'>
        <div className='flex flex-col md:flex-row gap-4'>
          <div className='flex-1'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
              <input
                type='text'
                placeholder='Tìm kiếm theo tên, email, lớp học hoặc nội dung...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              />
            </div>
          </div>

          <div className='flex gap-4'>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            >
              <option value=''>Tất cả trạng thái</option>
              <option value='PENDING'>Chờ xử lý</option>
              <option value='IN_PROGRESS'>Đang xử lý</option>
              <option value='RESOLVED'>Đã giải quyết</option>
              <option value='CLOSED'>Đã đóng</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            >
              <option value=''>Tất cả loại</option>
              <option value='COMPLAINT'>Khiếu nại</option>
              <option value='SUGGESTION'>Đề xuất</option>
              <option value='QUESTION'>Câu hỏi</option>
              <option value='PRAISE'>Khen ngợi</option>
              <option value='TECHNICAL'>Kỹ thuật</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'newest' | 'oldest' | 'status')}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            >
              <option value='newest'>Mới nhất</option>
              <option value='oldest'>Cũ nhất</option>
              <option value='status'>Theo trạng thái</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedbacks List */}
      <div className='space-y-4'>
        {sortedFeedbacks.length === 0 ? (
          <div className='text-center py-12'>
            <MessageSquare className='w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
              Không có feedback nào
            </h3>
            <p className='text-gray-600 dark:text-gray-400'>Chưa có feedback nào từ học viên</p>
          </div>
        ) : (
          sortedFeedbacks.map(feedback => (
            <div
              key={feedback.id}
              className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300'
            >
              <div className='flex items-start justify-between mb-4'>
                <div className='flex items-center space-x-4'>
                  <div className='w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold'>
                    {feedback.member_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                      {feedback.member_name}
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {feedback.member_email}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {feedback.class_name}
                    </p>
                  </div>
                </div>

                <div className='flex items-center space-x-2'>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getTypeColor(feedback.feedback_type)}`}
                  >
                    <span>{getTypeLabel(feedback.feedback_type)}</span>
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(feedback.status)}`}
                  >
                    {getStatusIcon(feedback.status)}
                    <span>{getStatusLabel(feedback.status)}</span>
                  </span>
                </div>
              </div>

              <div className='mb-4'>
                <h4 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
                  {feedback.subject}
                </h4>
                <p className='text-gray-700 dark:text-gray-300 leading-relaxed'>
                  {feedback.message}
                </p>
              </div>

              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  {formatDate(feedback.created_at)}
                </span>

                <div className='flex items-center space-x-2'>
                  {feedback.status === 'PENDING' && (
                    <button
                      onClick={() => handleStatusUpdate(feedback.id, 'IN_PROGRESS')}
                      className='px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200'
                    >
                      Bắt đầu xử lý
                    </button>
                  )}

                  {feedback.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleStatusUpdate(feedback.id, 'RESOLVED')}
                      className='px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors duration-200'
                    >
                      Đánh dấu đã giải quyết
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (window.showToast) {
                        window.showToast({
                          type: 'info',
                          message: 'Chức năng trả lời feedback đang được phát triển',
                          duration: 3000,
                        });
                      }
                    }}
                    className='px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors duration-200'
                  >
                    Trả lời
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {sortedFeedbacks.length > 0 && (
        <div className='mt-8 text-center'>
          <button
            onClick={() => {
              if (window.showToast) {
                window.showToast({
                  type: 'info',
                  message: 'Chức năng tải thêm feedback đang được phát triển',
                  duration: 3000,
                });
              }
            }}
            className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200'
          >
            Tải thêm feedback
          </button>
        </div>
      )}
    </div>
  );
}
