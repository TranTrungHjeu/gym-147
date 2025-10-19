import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button/Button';
import {
  PerformanceGoal,
  PerformanceMetric,
  PerformanceReview,
  scheduleService,
} from '../../services/schedule.service';

export default function TrainerPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('metrics');

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await scheduleService.getTrainerPerformance();

      if (response.success) {
        setMetrics(response.data.metrics);
        setGoals(response.data.goals);
        setReviews(response.data.reviews);
      } else {
        throw new Error(response.message || 'Lỗi tải dữ liệu hiệu suất');
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Lỗi tải dữ liệu hiệu suất',
          duration: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      on_track: 'bg-green-100 text-green-800',
      at_risk: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      on_track: 'Đúng tiến độ',
      at_risk: 'Có rủi ro',
      completed: 'Hoàn thành',
      overdue: 'Quá hạn',
    };
    return labels[status] || status;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return (
          <svg
            className='w-4 h-4 text-green-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 17l9.2-9.2M17 17V7H7'
            />
          </svg>
        );
      case 'down':
        return (
          <svg
            className='w-4 h-4 text-red-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17 7l-9.2 9.2M7 7v10h10'
            />
          </svg>
        );
      default:
        return (
          <svg
            className='w-4 h-4 text-gray-500'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 12h14' />
          </svg>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Đang tải dữ liệu hiệu suất...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-800 dark:text-white/90 mb-2'>
              Hiệu suất cá nhân
            </h1>
            <p className='text-gray-600 dark:text-gray-400'>
              Theo dõi và đánh giá hiệu suất giảng dạy
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                if (window.showToast) {
                  window.showToast({
                    type: 'info',
                    message: 'Chức năng xuất báo cáo đang được phát triển',
                    duration: 3000,
                  });
                }
              }}
            >
              Xuất báo cáo
            </Button>
            <Button
              size='sm'
              onClick={() => {
                if (window.showToast) {
                  window.showToast({
                    type: 'info',
                    message: 'Chức năng đặt mục tiêu mới đang được phát triển',
                    duration: 3000,
                  });
                }
              }}
            >
              Đặt mục tiêu mới
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='mb-6'>
        <div className='border-b border-gray-200 dark:border-gray-700'>
          <nav className='-mb-px flex space-x-8'>
            {[
              { id: 'metrics', name: 'Chỉ số hiệu suất' },
              { id: 'goals', name: 'Mục tiêu' },
              { id: 'reviews', name: 'Đánh giá' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            {metrics.map(metric => (
              <div
                key={metric.id}
                className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'
              >
                <div className='flex items-center justify-between mb-2'>
                  <h3 className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                    {metric.name}
                  </h3>
                  <div className='flex items-center'>
                    {getTrendIcon(metric.trend)}
                    <span
                      className={`ml-1 text-xs ${
                        metric.trend === 'up'
                          ? 'text-green-600'
                          : metric.trend === 'down'
                            ? 'text-red-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {metric.change_percentage > 0 ? '+' : ''}
                      {metric.change_percentage}%
                    </span>
                  </div>
                </div>
                <div className='flex items-baseline'>
                  <p className='text-2xl font-semibold text-gray-900 dark:text-white'>
                    {metric.value}
                    <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      {metric.unit}
                    </span>
                  </p>
                </div>
                <div className='mt-2'>
                  <div className='flex items-center text-sm text-gray-600 dark:text-gray-400'>
                    <span>
                      Mục tiêu: {metric.target}
                      {metric.unit}
                    </span>
                  </div>
                  <div className='mt-1 w-full bg-gray-200 rounded-full h-2'>
                    <div
                      className={`h-2 rounded-full ${
                        metric.value >= metric.target ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{
                        width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className='space-y-6'>
          {goals.map(goal => (
            <div
              key={goal.id}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'
            >
              <div className='flex items-start justify-between mb-4'>
                <div className='flex-1'>
                  <h3 className='text-lg font-semibold text-gray-800 dark:text-white/90 mb-2'>
                    {goal.title}
                  </h3>
                  <p className='text-gray-600 dark:text-gray-400 mb-3'>{goal.description}</p>
                  <div className='flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400'>
                    <span>
                      Tiến độ: {goal.current_value}/{goal.target_value} {goal.unit}
                    </span>
                    <span>Hạn: {formatDate(goal.deadline)}</span>
                  </div>
                </div>
                <div className='flex flex-col items-end gap-2'>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(goal.status)}`}>
                    {getStatusLabel(goal.status)}
                  </span>
                  <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                    {goal.progress_percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className='w-full bg-gray-200 rounded-full h-3'>
                <div
                  className={`h-3 rounded-full ${
                    goal.progress_percentage >= 100
                      ? 'bg-green-500'
                      : goal.progress_percentage >= 80
                        ? 'bg-blue-500'
                        : goal.progress_percentage >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className='space-y-6'>
          {reviews.map(review => (
            <div
              key={review.id}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'
            >
              <div className='flex items-start justify-between mb-4'>
                <div>
                  <h3 className='text-lg font-semibold text-gray-800 dark:text-white/90 mb-1'>
                    Đánh giá {review.period}
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Đánh giá bởi: {review.reviewer} - {formatDate(review.review_date)}
                  </p>
                </div>
                <div className='text-right'>
                  <div className='text-2xl font-bold text-blue-600'>{review.overall_rating}/5</div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    {review.goals_achieved}/{review.total_goals} mục tiêu đạt được
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-4'>
                <div>
                  <h4 className='text-sm font-medium text-gray-800 dark:text-white/90 mb-2'>
                    Điểm mạnh
                  </h4>
                  <ul className='space-y-1'>
                    {review.strengths.map((strength, index) => (
                      <li
                        key={index}
                        className='text-sm text-gray-600 dark:text-gray-400 flex items-center'
                      >
                        <svg
                          className='w-4 h-4 text-green-500 mr-2'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M5 13l4 4L19 7'
                          />
                        </svg>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className='text-sm font-medium text-gray-800 dark:text-white/90 mb-2'>
                    Cần cải thiện
                  </h4>
                  <ul className='space-y-1'>
                    {review.areas_for_improvement.map((area, index) => (
                      <li
                        key={index}
                        className='text-sm text-gray-600 dark:text-gray-400 flex items-center'
                      >
                        <svg
                          className='w-4 h-4 text-yellow-500 mr-2'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                          />
                        </svg>
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                <h4 className='text-sm font-medium text-gray-800 dark:text-white/90 mb-2'>
                  Nhận xét
                </h4>
                <p className='text-sm text-gray-700 dark:text-gray-300'>{review.feedback}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
