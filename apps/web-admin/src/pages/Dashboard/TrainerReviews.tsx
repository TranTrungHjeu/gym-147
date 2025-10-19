import { useEffect, useState } from 'react';
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
  created_at: string;
  is_public: boolean;
}

export default function TrainerReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

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
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
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

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Đang tải danh sách đánh giá...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-800 dark:text-white/90 mb-2'>
          Đánh giá của học viên
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          Xem và quản lý đánh giá từ học viên về các lớp học
        </p>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <div className='w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center'>
                <svg className='w-6 h-6 text-yellow-600' fill='currentColor' viewBox='0 0 20 20'>
                  <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                </svg>
              </div>
            </div>
            <div className='ml-4'>
              <h3 className='text-lg font-medium text-gray-800 dark:text-white/90'>
                Đánh giá trung bình
              </h3>
              <p className='text-2xl font-bold text-yellow-600'>{getAverageRating()}/5</p>
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center'>
                <svg
                  className='w-6 h-6 text-blue-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
                  />
                </svg>
              </div>
            </div>
            <div className='ml-4'>
              <h3 className='text-lg font-medium text-gray-800 dark:text-white/90'>
                Tổng đánh giá
              </h3>
              <p className='text-2xl font-bold text-blue-600'>{reviews.length}</p>
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-center'>
            <div className='flex-shrink-0'>
              <div className='w-10 h-10 bg-green-100 rounded-full flex items-center justify-center'>
                <svg
                  className='w-6 h-6 text-green-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
            </div>
            <div className='ml-4'>
              <h3 className='text-lg font-medium text-gray-800 dark:text-white/90'>
                Đánh giá tích cực
              </h3>
              <p className='text-2xl font-bold text-green-600'>
                {reviews.filter(r => r.rating >= 4).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Input
            type='text'
            placeholder='Tìm kiếm đánh giá...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <select
            value={ratingFilter}
            onChange={e => setRatingFilter(e.target.value)}
            className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
          >
            <option value=''>Tất cả đánh giá</option>
            <option value='5'>5 sao</option>
            <option value='4'>4 sao</option>
            <option value='3'>3 sao</option>
            <option value='2'>2 sao</option>
            <option value='1'>1 sao</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className='space-y-4'>
        {filteredReviews.length > 0 ? (
          filteredReviews.map(review => (
            <div
              key={review.id}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'
            >
              <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                {/* Review Info */}
                <div className='flex-1'>
                  <div className='flex items-start justify-between mb-2'>
                    <div>
                      <h3 className='text-lg font-semibold text-gray-800 dark:text-white/90'>
                        {review.member_name}
                      </h3>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {review.member_email}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <div className='flex'>{renderStars(review.rating)}</div>
                      <span className='text-sm text-gray-500'>({review.rating}/5)</span>
                    </div>
                  </div>

                  <div className='mb-3'>
                    <div className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                      <strong>Lớp học:</strong> {review.class_name}
                    </div>
                    <div className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                      <strong>Ngày:</strong> {formatDate(review.schedule_date)}
                    </div>
                    <div className='text-sm text-gray-600 dark:text-gray-400'>
                      <strong>Đánh giá lúc:</strong> {formatDate(review.created_at)}
                    </div>
                  </div>

                  <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <p className='text-gray-800 dark:text-gray-200'>{review.comment}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex flex-col gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      if (window.showToast) {
                        window.showToast({
                          type: 'info',
                          message: 'Chức năng trả lời đánh giá đang được phát triển',
                          duration: 3000,
                        });
                      }
                    }}
                  >
                    Trả lời
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      if (window.showToast) {
                        window.showToast({
                          type: 'info',
                          message: 'Chức năng xem chi tiết đang được phát triển',
                          duration: 3000,
                        });
                      }
                    }}
                  >
                    Chi tiết
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='text-center py-12'>
            <div className='text-gray-500 dark:text-gray-400'>
              {searchTerm || ratingFilter ? 'Không tìm thấy đánh giá nào' : 'Chưa có đánh giá nào'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
