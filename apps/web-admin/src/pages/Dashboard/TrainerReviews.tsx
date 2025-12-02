import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Star, Users } from 'lucide-react';
import AdminModal from '../../components/common/AdminModal';
import AdminCard from '../../components/common/AdminCard';
import CustomSelect from '../../components/common/CustomSelect';
import MetricCard from '../../components/dashboard/MetricCard';
import Input from '../../components/form/input/InputField';
import Button from '../../components/ui/Button/Button';
import { scheduleService } from '../../services/schedule.service';

interface Review {
  id: string;
  member_name: string;
  member_email: string;
  class_name: string;
  schedule_date: string;
  rating: number;
  comment: string;
  trainer_reply?: string | null;
  created_at: string;
  is_public: boolean;
}

export default function TrainerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await scheduleService.getTrainerReviewsList();

      if (response.success) {
        // Ensure data is an array
        const data = Array.isArray(response.data) ? response.data : [];
        setReviews(data);
      } else {
        throw new Error(response.message || 'Lỗi tải danh sách đánh giá');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải danh sách đánh giá',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch =
      review.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = !ratingFilter || review.rating.toString() === ratingFilter;
    return matchesSearch && matchesRating;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${
          i < rating
            ? 'text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)] fill-current'
            : 'text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)]'
        }`}
        fill='currentColor'
        viewBox='0 0 20 20'
      >
        <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
      </svg>
    ));
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
  };

  const handleReply = (review: Review) => {
    setSelectedReview(review);
    setReplyMessage(review.trainer_reply || '');
    setIsReplyModalOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !replyMessage.trim()) {
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
      const response = await scheduleService.replyToReview(selectedReview.id, replyMessage.trim());

      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Đã trả lời đánh giá thành công',
            duration: 3000,
          });
        }
        setIsReplyModalOpen(false);
        setReplyMessage('');
        setSelectedReview(null);
        // Refresh reviews
        await fetchReviews();
      } else {
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: response.message || 'Không thể trả lời đánh giá',
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      console.error('Error replying to review:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || 'Lỗi khi trả lời đánh giá',
          duration: 3000,
        });
      }
    } finally {
      setIsReplying(false);
    }
  };

  const handleViewDetails = (review: Review) => {
    setSelectedReview(review);
    setIsDetailModalOpen(true);
  };

  const handleReport = (review: Review) => {
    setSelectedReview(review);
    setReportReason('');
    setReportNotes('');
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedReview || !reportReason.trim()) {
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Vui lòng chọn lý do báo cáo',
          duration: 3000,
        });
      }
      return;
    }

    try {
      setIsReplying(true);
      const response = await scheduleService.reportReview(
        selectedReview.id,
        reportReason,
        reportNotes.trim() || undefined
      );

      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: 'Đã báo cáo đánh giá. Admin sẽ xem xét.',
            duration: 3000,
          });
        }
        setIsReportModalOpen(false);
        setReportReason('');
        setReportNotes('');
        setSelectedReview(null);
      } else {
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: response.message || 'Không thể báo cáo đánh giá',
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      console.error('Error reporting review:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || 'Lỗi khi báo cáo đánh giá',
          duration: 3000,
        });
      }
    } finally {
      setIsReplying(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-orange-600)] mx-auto mb-4'></div>
          <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>Đang tải danh sách đánh giá...</p>
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
                Đánh giá của học viên
              </h1>
              <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] text-xs font-sans'>
                Xem và quản lý đánh giá từ học viên về các lớp học
              </p>
            </div>

            {/* Stats Overview */}
            <div className='lg:col-span-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                <MetricCard
                  icon={Star}
                  label='Đánh giá trung bình'
                  value={`${getAverageRating()}/5`}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
                <MetricCard
                  icon={MessageSquare}
                  label='Tổng đánh giá'
                  value={reviews.length}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
                <MetricCard
                  icon={Users}
                  label='Đánh giá tích cực'
                  value={reviews.filter(r => r.rating >= 4).length}
                  iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                  iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='mb-3'
        >
          <AdminCard className='p-3'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              {/* Search */}
              <div className='group relative'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200 pointer-events-none z-10' />
                <input
                  type='text'
                  placeholder='Tìm kiếm đánh giá...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full h-[30px] pl-9 pr-3 text-[11px] border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                />
              </div>

              {/* Rating Filter */}
              <div>
                <CustomSelect
                  options={[
                    { value: '', label: 'Tất cả đánh giá' },
                    { value: '5', label: '5 sao' },
                    { value: '4', label: '4 sao' },
                    { value: '3', label: '3 sao' },
                    { value: '2', label: '2 sao' },
                    { value: '1', label: '1 sao' },
                  ]}
                  value={ratingFilter}
                  onChange={setRatingFilter}
                  placeholder='Tất cả đánh giá'
                  className='font-inter'
                />
              </div>
            </div>
          </AdminCard>
        </motion.div>

        {/* Reviews List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className='space-y-3 flex-1'
        >
          {filteredReviews.length > 0 ? (
            filteredReviews.map(review => (
              <AdminCard key={review.id} hover className='transition-all duration-200 hover:shadow-md'>
                <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                  {/* Review Info */}
                  <div className='flex-1'>
                    <div className='flex items-start justify-between mb-2'>
                      <div>
                        <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                          {review.member_name}
                        </h3>
                        <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                          {review.member_email}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='flex'>{renderStars(review.rating)}</div>
                        <span className='text-sm text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                          ({review.rating}/5)
                        </span>
                      </div>
                    </div>

                    <div className='mb-3 font-sans'>
                      <div className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-1'>
                        <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>Lớp học:</strong> {review.class_name}
                      </div>
                      <div className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-1'>
                        <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>Ngày:</strong> {formatDate(review.schedule_date)}
                      </div>
                      <div className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'>
                        <strong className='text-[var(--color-gray-900)] dark:text-[var(--color-white)]'>Đánh giá lúc:</strong> {formatDate(review.created_at)}
                      </div>
                    </div>

                    <div className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-700)] rounded-lg p-4 mb-3'>
                      <p className='text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)] font-sans'>{review.comment}</p>
                    </div>

                    {/* Trainer Reply */}
                    {review.trainer_reply && (
                      <div className='bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 rounded-lg p-4 border-l-4 border-[var(--color-orange-500)]'>
                        <div className='flex items-start justify-between mb-2'>
                          <span className='text-sm font-semibold text-[var(--color-orange-800)] dark:text-[var(--color-orange-200)] font-sans'>
                            Phản hồi của bạn:
                          </span>
                        </div>
                        <p className='text-sm text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)] font-sans'>
                          {review.trainer_reply}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className='flex flex-col gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleViewDetails(review)}
                      className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
                    >
                      Chi tiết
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleReply(review)}
                      className='border-[var(--color-orange-300)] dark:border-[var(--color-orange-600)] text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/10'
                    >
                      {review.trainer_reply ? 'Chỉnh sửa trả lời' : 'Trả lời'}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleReport(review)}
                      className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] hover:border-[var(--color-gray-400)] dark:hover:border-[var(--color-gray-500)]'
                    >
                      Báo cáo
                    </Button>
                  </div>
                </div>
              </AdminCard>
            ))
          ) : (
            <AdminCard>
              <div className='text-center py-12'>
                <MessageSquare className='w-16 h-16 text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)] mx-auto mb-4' />
                <div className='text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                  {searchTerm || ratingFilter ? 'Không tìm thấy đánh giá nào' : 'Chưa có đánh giá nào'}
                </div>
              </div>
            </AdminCard>
          )}
        </motion.div>
      </div>

      {/* Reply Modal */}
      <AdminModal
        isOpen={isReplyModalOpen}
        onClose={() => {
          setIsReplyModalOpen(false);
          setReplyMessage('');
          setSelectedReview(null);
        }}
        title='Trả lời đánh giá'
        size='md'
      >
        <div className='space-y-4'>
          {selectedReview && (
            <AdminCard className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)]'>
              <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-2 font-sans'>
                <strong>Đánh giá từ:</strong> {selectedReview.member_name}
              </p>
              <p className='text-sm text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)] font-sans'>{selectedReview.comment}</p>
            </AdminCard>
          )}
          <div>
            <label className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2 font-sans'>
              Nội dung trả lời
            </label>
            <textarea
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
              rows={4}
              className='w-full px-3 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent dark:bg-[var(--color-gray-700)] dark:text-[var(--color-white)] font-sans'
              placeholder='Nhập nội dung trả lời...'
            />
          </div>
        </div>
        <div className='flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
          <Button
            variant='outline'
            onClick={() => {
              setIsReplyModalOpen(false);
              setReplyMessage('');
              setSelectedReview(null);
            }}
            className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmitReply}
            disabled={isReplying || !replyMessage.trim()}
            className='bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] border-0'
          >
            {isReplying ? 'Đang gửi...' : 'Gửi trả lời'}
          </Button>
        </div>
      </AdminModal>

      {/* Detail Modal */}
      <AdminModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReview(null);
        }}
        title={`Chi tiết đánh giá - ${selectedReview?.member_name || 'N/A'}`}
        size='lg'
      >
        {selectedReview && (
          <div className='space-y-6'>
            {/* Member Info */}
            <AdminCard>
              <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3 font-heading'>
                Thông tin học viên
              </h3>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Họ và tên
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {selectedReview.member_name}
                  </p>
                </div>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Email
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {selectedReview.member_email}
                  </p>
                </div>
              </div>
            </AdminCard>

            {/* Review Info */}
            <AdminCard>
              <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-3 font-heading'>
                Thông tin đánh giá
              </h3>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Lớp học
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {selectedReview.class_name}
                  </p>
                </div>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Ngày lớp học
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {formatDate(selectedReview.schedule_date)}
                  </p>
                </div>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Đánh giá
                  </label>
                  <div className='flex items-center gap-2 mt-1'>
                    <div className='flex'>{renderStars(selectedReview.rating)}</div>
                    <span className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                      ({selectedReview.rating}/5)
                    </span>
                  </div>
                </div>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Ngày đánh giá
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {formatDate(selectedReview.created_at)}
                  </p>
                </div>
                <div className='col-span-2'>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Nội dung đánh giá
                  </label>
                  <div className='mt-1 bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)] rounded-lg p-4'>
                    <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                      {selectedReview.comment}
                    </p>
                  </div>
                </div>
                <div>
                  <label className='text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    Trạng thái
                  </label>
                  <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                    {selectedReview.is_public ? 'Công khai' : 'Riêng tư'}
                  </p>
                </div>
              </div>
            </AdminCard>

            {/* Trainer Reply */}
            {selectedReview.trainer_reply && (
              <AdminCard className='bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                <h3 className='text-lg font-semibold text-[var(--color-orange-900)] dark:text-[var(--color-orange-200)] mb-3 font-heading'>
                  Phản hồi của bạn
                </h3>
                <p className='text-sm text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-sans'>
                  {selectedReview.trainer_reply}
                </p>
              </AdminCard>
            )}

            {/* Actions */}
            <div className='flex justify-end gap-3 pt-4 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
              <Button
                variant='outline'
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedReview(null);
                }}
                className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
              >
                Đóng
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleReply(selectedReview);
                }}
                className='border-[var(--color-orange-300)] dark:border-[var(--color-orange-600)] text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] hover:bg-[var(--color-orange-50)] dark:hover:bg-[var(--color-orange-900)]/10'
              >
                {selectedReview.trainer_reply ? 'Chỉnh sửa trả lời' : 'Trả lời'}
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleReport(selectedReview);
                }}
                className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] hover:border-[var(--color-gray-400)] dark:hover:border-[var(--color-gray-500)]'
              >
                Báo cáo
              </Button>
            </div>
          </div>
        )}
      </AdminModal>

      {/* Report Modal */}
      <AdminModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportReason('');
          setReportNotes('');
          setSelectedReview(null);
        }}
        title='Báo cáo đánh giá'
        size='md'
      >
        <div className='space-y-4'>
          {selectedReview && (
            <AdminCard className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-800)]'>
              <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-2 font-sans'>
                <strong>Đánh giá từ:</strong> {selectedReview.member_name}
              </p>
              <p className='text-sm text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)] font-sans'>{selectedReview.comment}</p>
            </AdminCard>
          )}
          <div>
            <label className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2 font-sans'>
              Lý do báo cáo <span className='text-[var(--color-error-500)]'>*</span>
            </label>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className='w-full px-3 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent dark:bg-[var(--color-gray-700)] dark:text-[var(--color-white)] font-sans'
            >
              <option value=''>Chọn lý do...</option>
              <option value='SPAM'>Spam hoặc quảng cáo</option>
              <option value='INAPPROPRIATE'>Nội dung không phù hợp</option>
              <option value='FALSE_INFO'>Thông tin sai sự thật</option>
              <option value='HARASSMENT'>Quấy rối hoặc lạm dụng</option>
              <option value='OTHER'>Khác</option>
            </select>
          </div>
          <div>
            <label className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2 font-sans'>
              Ghi chú thêm (tùy chọn)
            </label>
            <textarea
              value={reportNotes}
              onChange={e => setReportNotes(e.target.value)}
              rows={3}
              className='w-full px-3 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent dark:bg-[var(--color-gray-700)] dark:text-[var(--color-white)] font-sans'
              placeholder='Mô tả thêm về lý do báo cáo...'
            />
          </div>
        </div>
        <div className='flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
          <Button
            variant='outline'
            onClick={() => {
              setIsReportModalOpen(false);
              setReportReason('');
              setReportNotes('');
              setSelectedReview(null);
            }}
            className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmitReport}
            disabled={isReplying || !reportReason.trim()}
            variant='danger'
          >
            {isReplying ? 'Đang gửi...' : 'Gửi báo cáo'}
          </Button>
        </div>
      </AdminModal>
    </div>
  );
}
