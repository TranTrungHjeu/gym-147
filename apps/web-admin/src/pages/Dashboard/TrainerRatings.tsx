import { Search, Star, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Rating, RatingStats, scheduleService } from '../../services/schedule.service';

export default function TrainerRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating'>('newest');

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
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
    if (rating >= 3.5)
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
    if (rating >= 2.5)
      return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
    return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
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

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Đang tải đánh giá...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>
          Đánh giá từ học viên
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          Xem và theo dõi phản hồi từ học viên về chất lượng giảng dạy
        </p>
      </div>

      {/* Rating Stats */}
      {ratingStats && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>Đánh giá trung bình</p>
                <p className='text-3xl font-bold text-gray-900 dark:text-white'>
                  {ratingStats.average_rating.toFixed(1)}
                </p>
              </div>
              <div className='p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg'>
                <Star className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>Tổng đánh giá</p>
                <p className='text-3xl font-bold text-gray-900 dark:text-white'>
                  {ratingStats.total_ratings}
                </p>
              </div>
              <div className='p-3 bg-blue-100 dark:bg-blue-900 rounded-lg'>
                <Users className='w-6 h-6 text-blue-600 dark:text-blue-400' />
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>Đánh giá 5 sao</p>
                <p className='text-3xl font-bold text-gray-900 dark:text-white'>
                  {ratingStats.rating_distribution[5] || 0}
                </p>
              </div>
              <div className='p-3 bg-green-100 dark:bg-green-900 rounded-lg'>
                <Star className='w-6 h-6 text-green-600 dark:text-green-400 fill-current' />
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 dark:text-gray-400 text-sm'>Tỷ lệ hài lòng</p>
                <p className='text-3xl font-bold text-gray-900 dark:text-white'>
                  {ratingStats.total_ratings > 0
                    ? (
                        (((ratingStats.rating_distribution[5] || 0) +
                          (ratingStats.rating_distribution[4] || 0)) /
                          ratingStats.total_ratings) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </p>
              </div>
              <div className='p-3 bg-purple-100 dark:bg-purple-900 rounded-lg'>
                <TrendingUp className='w-6 h-6 text-purple-600 dark:text-purple-400' />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-6'>
        <div className='flex flex-col md:flex-row gap-4'>
          <div className='flex-1'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
              <input
                type='text'
                placeholder='Tìm kiếm theo tên học viên, lớp học hoặc bình luận...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white'
              />
            </div>
          </div>

          <div className='flex gap-4'>
            <select
              value={ratingFilter}
              onChange={e => setRatingFilter(e.target.value)}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            >
              <option value=''>Tất cả đánh giá</option>
              <option value='5'>5 sao</option>
              <option value='4'>4 sao</option>
              <option value='3'>3 sao</option>
              <option value='2'>2 sao</option>
              <option value='1'>1 sao</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'newest' | 'oldest' | 'rating')}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            >
              <option value='newest'>Mới nhất</option>
              <option value='oldest'>Cũ nhất</option>
              <option value='rating'>Đánh giá cao</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ratings List */}
      <div className='space-y-4'>
        {sortedRatings.length === 0 ? (
          <div className='text-center py-12'>
            <Star className='w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
              Không có đánh giá nào
            </h3>
            <p className='text-gray-600 dark:text-gray-400'>Chưa có đánh giá nào từ học viên</p>
          </div>
        ) : (
          sortedRatings.map(rating => (
            <div
              key={rating.id}
              className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300'
            >
              <div className='flex items-start justify-between mb-4'>
                <div className='flex items-center space-x-4'>
                  <div className='w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold'>
                    {rating.member_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                      {rating.member_name}
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>{rating.class_name}</p>
                  </div>
                </div>

                <div className='flex items-center space-x-2'>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(rating.rating)}`}
                  >
                    {rating.rating}/5
                  </div>
                  {!rating.is_public && (
                    <span className='px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full'>
                      Riêng tư
                    </span>
                  )}
                </div>
              </div>

              <div className='flex items-center space-x-2 mb-3'>{renderStars(rating.rating)}</div>

              {rating.comment && (
                <p className='text-gray-700 dark:text-gray-300 mb-4 leading-relaxed'>
                  "{rating.comment}"
                </p>
              )}

              <div className='flex items-center justify-between text-sm text-gray-500 dark:text-gray-400'>
                <span>{formatDate(rating.created_at)}</span>
                <div className='flex items-center space-x-4'>
                  <button
                    onClick={() => {
                      if (window.showToast) {
                        window.showToast({
                          type: 'info',
                          message: 'Chức năng trả lời đánh giá đang được phát triển',
                          duration: 3000,
                        });
                      }
                    }}
                    className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                  >
                    Trả lời
                  </button>
                  <button
                    onClick={() => {
                      if (window.showToast) {
                        window.showToast({
                          type: 'info',
                          message: 'Chức năng báo cáo đánh giá đang được phát triển',
                          duration: 3000,
                        });
                      }
                    }}
                    className='text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
                  >
                    Báo cáo
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {sortedRatings.length > 0 && (
        <div className='mt-8 text-center'>
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
            className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200'
          >
            Tải thêm đánh giá
          </button>
        </div>
      )}
    </div>
  );
}
