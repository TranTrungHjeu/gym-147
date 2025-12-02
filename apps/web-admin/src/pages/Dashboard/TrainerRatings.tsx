import { motion } from 'framer-motion';
import { Search, Star, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Rating, RatingStats, scheduleService } from '../../services/schedule.service';
import AdminModal from '../../components/common/AdminModal';
import AdminCard from '../../components/common/AdminCard';
import CustomSelect from '../../components/common/CustomSelect';
import MetricCard from '../../components/dashboard/MetricCard';
import Button from '../../components/ui/Button/Button';

export default function TrainerRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating'>('newest');
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNotes, setReportNotes] = useState('');

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await scheduleService.getTrainerRatings();

      if (response.success) {
        // Ensure data structure is correct
        const ratings = Array.isArray(response.data?.ratings) ? response.data.ratings : [];
        const stats = response.data?.stats || null;
        setRatings(ratings);
        setRatingStats(stats);
      } else {
        throw new Error(response.message || 'Lỗi tải đánh giá');
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải đánh giá từ học viên',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRatings = ratings.filter(rating => {
    const matchesSearch =
      rating.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rating.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rating.comment.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating = ratingFilter === '' || rating.rating.toString() === ratingFilter;

    return matchesSearch && matchesRating;
  });

  const sortedRatings = [...filteredRatings].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating
            ? 'text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)] fill-current'
            : 'text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)]'
        }`}
      />
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5)
      return 'text-[var(--color-orange-700)] bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 dark:text-[var(--color-orange-400)]';
    if (rating >= 3.5)
      return 'text-[var(--color-orange-600)] bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 dark:text-[var(--color-orange-400)]';
    if (rating >= 2.5)
      return 'text-[var(--color-orange-600)] bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 dark:text-[var(--color-orange-400)]';
    return 'text-[var(--color-gray-600)] bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] dark:text-[var(--color-gray-400)]';
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

  const handleReply = (rating: Rating) => {
    setSelectedRating(rating);
    setReplyMessage(rating.trainer_reply || '');
    setIsReplyModalOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedRating || !replyMessage.trim()) {
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
      const response = await scheduleService.replyToReview(selectedRating.id, replyMessage.trim());

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
        setSelectedRating(null);
        await fetchRatings();
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
      console.error('Error replying to rating:', error);
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

  const handleReport = (rating: Rating) => {
    setSelectedRating(rating);
    setReportReason('');
    setReportNotes('');
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedRating || !reportReason.trim()) {
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
        selectedRating.id,
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
        setSelectedRating(null);
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
      console.error('Error reporting rating:', error);
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
          <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>Đang tải đánh giá...</p>
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
                Đánh giá từ học viên
              </h1>
              <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] text-xs font-sans'>
                Xem và theo dõi phản hồi từ học viên về chất lượng giảng dạy
              </p>
            </div>

            {/* Rating Stats */}
            {ratingStats && (
              <div className='lg:col-span-4'>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                  <MetricCard
                    icon={Star}
                    label='Đánh giá trung bình'
                    value={ratingStats.average_rating.toFixed(1)}
                    iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                    iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                  />
                  <MetricCard
                    icon={Users}
                    label='Tổng đánh giá'
                    value={ratingStats.total_ratings}
                    iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                    iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                  />
                  <MetricCard
                    icon={Star}
                    label='Đánh giá 5 sao'
                    value={ratingStats.rating_distribution[5] || 0}
                    iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                    iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                  />
                  <MetricCard
                    icon={TrendingUp}
                    label='Tỷ lệ hài lòng'
                    value={
                      ratingStats.total_ratings > 0
                        ? (
                            (((ratingStats.rating_distribution[5] || 0) +
                              (ratingStats.rating_distribution[4] || 0)) /
                              ratingStats.total_ratings) *
                            100
                          ).toFixed(0)
                        : 0
                    }
                    iconBgColor='bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/30'
                    iconColor='text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                  />
                </div>
              </div>
            )}
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
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
              {/* Search */}
              <div className='md:col-span-1 group relative'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-focus-within:text-orange-500 transition-colors duration-200 pointer-events-none z-10' />
                <input
                  type='text'
                  placeholder='Tìm kiếm theo tên học viên, lớp học hoặc bình luận...'
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

              {/* Sort By */}
              <div>
                <CustomSelect
                  options={[
                    { value: 'newest', label: 'Mới nhất' },
                    { value: 'oldest', label: 'Cũ nhất' },
                    { value: 'rating', label: 'Đánh giá cao' },
                  ]}
                  value={sortBy}
                  onChange={value => setSortBy(value as 'newest' | 'oldest' | 'rating')}
                  placeholder='Sắp xếp theo'
                  className='font-inter'
                />
              </div>
            </div>
          </AdminCard>
        </motion.div>

        {/* Ratings List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className='space-y-3 flex-1'
        >
          {sortedRatings.length === 0 ? (
            <AdminCard>
              <div className='text-center py-12'>
                <Star className='w-16 h-16 text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)] mx-auto mb-4' />
                <h3 className='text-lg font-medium text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2 font-heading'>
                  Không có đánh giá nào
                </h3>
                <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>Chưa có đánh giá nào từ học viên</p>
              </div>
            </AdminCard>
          ) : (
            sortedRatings.map(rating => (
              <AdminCard key={rating.id} hover className='transition-all duration-200 hover:shadow-md'>
                <div className='flex items-start justify-between mb-4'>
                  <div className='flex items-center space-x-4'>
                    <div className='w-12 h-12 bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] rounded-full flex items-center justify-center text-[var(--color-white)] font-semibold font-heading'>
                      {rating.member_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                        {rating.member_name}
                      </h3>
                      <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>{rating.class_name}</p>
                    </div>
                  </div>

                  <div className='flex items-center space-x-2'>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium font-sans ${getRatingColor(rating.rating)}`}
                    >
                      {rating.rating}/5
                    </div>
                    {!rating.is_public && (
                      <span className='px-2 py-1 bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] text-xs rounded-full font-sans'>
                        Riêng tư
                      </span>
                    )}
                  </div>
                </div>

                <div className='flex items-center space-x-2 mb-3'>{renderStars(rating.rating)}</div>

                {rating.comment && (
                  <p className='text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-4 leading-relaxed font-sans'>
                    "{rating.comment}"
                  </p>
                )}

                {rating.trainer_reply && (
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
                        <p className='text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] text-sm font-sans'>{rating.trainer_reply}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className='flex items-center justify-between text-sm text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] mt-4 font-sans'>
                  <span>{formatDate(rating.created_at)}</span>
                  <div className='flex items-center space-x-4'>
                    <button
                      onClick={() => handleReply(rating)}
                      className='text-[var(--color-orange-600)] hover:text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)] dark:hover:text-[var(--color-orange-300)] font-medium font-sans'
                    >
                      {rating.trainer_reply ? 'Chỉnh sửa trả lời' : 'Trả lời'}
                    </button>
                    <button
                      onClick={() => handleReport(rating)}
                      className='text-[var(--color-gray-600)] hover:text-[var(--color-gray-700)] dark:text-[var(--color-gray-400)] dark:hover:text-[var(--color-gray-300)] font-medium font-sans'
                    >
                      Báo cáo
                    </button>
                  </div>
                </div>
              </AdminCard>
            ))
          )}
        </motion.div>
      </div>

        {/* Load More Button */}
        {sortedRatings.length > 0 && (
          <div className='mt-6 text-center'>
            <button
              onClick={() => {
                if (window.showToast) {
                  window.showToast({
                    type: 'info',
                    message: 'Chức năng tải thêm đánh giá đang được phát triển',
                    duration: 3000,
                  });
                }
              }}
              className='px-6 py-3 bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] rounded-lg transition-all duration-200 font-sans'
            >
              Tải thêm đánh giá
            </button>
          </div>
        )}

      {/* Reply Modal */}
      <AdminModal
        isOpen={isReplyModalOpen}
        onClose={() => {
          setIsReplyModalOpen(false);
          setReplyMessage('');
          setSelectedRating(null);
        }}
        title='Trả lời đánh giá'
        size='md'
      >
        <div className='space-y-4'>
          {selectedRating && (
            <AdminCard className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-700)]'>
              <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-2 font-sans'>
                Đánh giá từ <span className='font-medium'>{selectedRating.member_name}</span>
              </p>
              <div className='flex items-center space-x-2 mb-2'>{renderStars(selectedRating.rating)}</div>
              <p className='text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] text-sm font-sans'>{selectedRating.comment}</p>
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
                setSelectedRating(null);
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

      {/* Report Modal */}
      <AdminModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportReason('');
          setReportNotes('');
          setSelectedRating(null);
        }}
        title='Báo cáo đánh giá'
        size='md'
      >
        <div className='space-y-4'>
          {selectedRating && (
            <AdminCard className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-700)]'>
              <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-2 font-sans'>
                Đánh giá từ <span className='font-medium'>{selectedRating.member_name}</span>
              </p>
              <div className='flex items-center space-x-2 mb-2'>{renderStars(selectedRating.rating)}</div>
              <p className='text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] text-sm font-sans'>{selectedRating.comment}</p>
            </AdminCard>
          )}

          <div>
            <label className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2 font-sans'>
              Lý do báo cáo <span className='text-[var(--color-error-500)]'>*</span>
            </label>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className='w-full px-4 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent dark:bg-[var(--color-gray-700)] dark:text-[var(--color-white)] font-sans'
            >
              <option value=''>Chọn lý do báo cáo</option>
              <option value='spam'>Spam hoặc quảng cáo</option>
              <option value='inappropriate'>Nội dung không phù hợp</option>
              <option value='fake'>Đánh giá giả mạo</option>
              <option value='harassment'>Quấy rối hoặc lạm dụng</option>
              <option value='other'>Khác</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] mb-2 font-sans'>
              Ghi chú thêm (tùy chọn)
            </label>
            <textarea
              value={reportNotes}
              onChange={e => setReportNotes(e.target.value)}
              placeholder='Cung cấp thêm thông tin về lý do báo cáo...'
              rows={4}
              className='w-full px-4 py-2 border border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] rounded-lg focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent dark:bg-[var(--color-gray-700)] dark:text-[var(--color-white)] resize-none font-sans'
            />
          </div>

          <div className='flex justify-end space-x-3 pt-4'>
            <Button
              variant='outline'
              onClick={() => {
                setIsReportModalOpen(false);
                setReportReason('');
                setReportNotes('');
                setSelectedRating(null);
              }}
              disabled={isReplying}
              className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
            >
              Hủy
            </Button>
            <Button
              variant='danger'
              onClick={handleSubmitReport}
              disabled={isReplying || !reportReason.trim()}
            >
              {isReplying ? 'Đang gửi...' : 'Gửi báo cáo'}
            </Button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
