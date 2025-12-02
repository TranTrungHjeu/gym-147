import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import AdminCard from '../../components/common/AdminCard';
import ExportButton from '../../components/common/ExportButton';
import SetGoalModal from '../../components/common/SetGoalModal';
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
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PerformanceGoal | null>(null);

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
      on_track:
        'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]',
      at_risk:
        'bg-[var(--color-orange-200)] dark:bg-[var(--color-orange-800)]/30 text-[var(--color-orange-800)] dark:text-[var(--color-orange-300)]',
      completed:
        'bg-[var(--color-orange-100)] dark:bg-[var(--color-orange-900)]/20 text-[var(--color-orange-700)] dark:text-[var(--color-orange-400)]',
      overdue:
        'bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)]',
    };
    return (
      colors[status] ||
      'bg-[var(--color-gray-100)] dark:bg-[var(--color-gray-700)] text-[var(--color-gray-800)] dark:text-[var(--color-gray-200)]'
    );
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

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  };

  const handleEditGoal = (goal: PerformanceGoal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (
    goalData: Omit<PerformanceGoal, 'id' | 'current_value' | 'status' | 'progress_percentage'>
  ) => {
    try {
      if (editingGoal) {
        await scheduleService.updateGoal(editingGoal.id, goalData);
      } else {
        await scheduleService.createGoal(goalData);
      }
      await fetchPerformanceData();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      throw error;
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mục tiêu này?')) {
      return;
    }

    try {
      await scheduleService.deleteGoal(goalId);
      if (window.showToast) {
        window.showToast({
          type: 'success',
          message: 'Đã xóa mục tiêu thành công',
          duration: 3000,
        });
      }
      await fetchPerformanceData();
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: error.message || 'Lỗi khi xóa mục tiêu',
          duration: 3000,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-orange-600)] mx-auto mb-4'></div>
          <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
            Đang tải dữ liệu hiệu suất...
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
                Hiệu suất cá nhân
              </h1>
              <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] text-xs font-sans'>
                Theo dõi, đánh giá hiệu suất giảng dạy
              </p>
            </div>

            {/* Action Buttons */}
            <div className='lg:col-span-4 flex justify-end gap-3'>
              {metrics.length > 0 || goals.length > 0 || reviews.length > 0 ? (
                <ExportButton
                  data={[
                    ...metrics.map(metric => ({
                      Loại: 'Chỉ số hiệu suất',
                      Tên: metric.name || 'N/A',
                      'Giá trị': `${metric.value} ${metric.unit || ''}`.trim(),
                      'Mục tiêu': `${metric.target} ${metric.unit || ''}`.trim(),
                      'Xu hướng':
                        metric.trend === 'up'
                          ? 'Tăng'
                          : metric.trend === 'down'
                          ? 'Giảm'
                          : 'Ổn định',
                      'Thay đổi': `${metric.change_percentage > 0 ? '+' : ''}${
                        metric.change_percentage
                      }%`,
                    })),
                    ...goals.map(goal => ({
                      Loại: 'Mục tiêu',
                      Tên: goal.title || 'N/A',
                      'Mô tả': goal.description || 'N/A',
                      'Trạng thái': getStatusLabel(goal.status),
                      'Tiến độ': `${goal.progress_percentage}%`,
                      'Hạn chót': goal.deadline
                        ? new Date(goal.deadline).toLocaleDateString('vi-VN')
                        : 'N/A',
                    })),
                    ...reviews.map(review => ({
                      Loại: 'Đánh giá',
                      Ngày: review.review_date
                        ? new Date(review.review_date).toLocaleDateString('vi-VN')
                        : 'N/A',
                      'Người đánh giá': review.reviewer || 'N/A',
                      'Điểm số': review.overall_rating || 'N/A',
                      'Nhận xét': review.feedback || 'N/A',
                    })),
                  ]}
                  columns={[
                    { key: 'Loại', label: 'Loại' },
                    { key: 'Tên', label: 'Tên/Mô tả' },
                    { key: 'Giá trị', label: 'Giá trị' },
                    { key: 'Mục tiêu', label: 'Mục tiêu' },
                    { key: 'Xu hướng', label: 'Xu hướng' },
                    { key: 'Thay đổi', label: 'Thay đổi' },
                    { key: 'Trạng thái', label: 'Trạng thái' },
                    { key: 'Tiến độ', label: 'Tiến độ' },
                  ]}
                  filename='trainer-performance'
                  title='Báo cáo hiệu suất Trainer'
                  variant='primary'
                  size='sm'
                />
              ) : null}
              <button
                onClick={handleCreateGoal}
                className='px-4 py-2 bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] rounded-lg transition-all duration-200 flex items-center gap-2 font-sans text-sm'
              >
                Đặt mục tiêu mới
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='mb-3'
        >
          <div className='border-b border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
            <nav className='-mb-px flex space-x-8'>
              {[
                { id: 'metrics', name: 'Chỉ số hiệu suất' },
                { id: 'goals', name: 'Mục tiêu' },
                { id: 'reviews', name: 'Đánh giá' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm font-sans ${
                    activeTab === tab.id
                      ? 'border-[var(--color-orange-500)] text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                      : 'border-transparent text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] dark:hover:text-[var(--color-gray-300)] hover:border-[var(--color-gray-300)] dark:hover:border-[var(--color-gray-600)]'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className='space-y-3 flex-1'
          >
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
              {metrics.map(metric => (
                <AdminCard key={metric.id} hover>
                  <div className='flex items-center justify-between mb-2'>
                    <h3 className='text-sm font-medium text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                      {metric.name}
                    </h3>
                    <div className='flex items-center'>
                      {getTrendIcon(metric.trend)}
                      <span
                        className={`ml-1 text-xs font-sans ${
                          metric.trend === 'up'
                            ? 'text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)]'
                            : metric.trend === 'down'
                            ? 'text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'
                            : 'text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'
                        }`}
                      >
                        {metric.change_percentage > 0 ? '+' : ''}
                        {metric.change_percentage}%
                      </span>
                    </div>
                  </div>
                  <div className='flex items-baseline'>
                    <p className='text-2xl font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] font-heading'>
                      {metric.value}
                      <span className='text-sm font-medium text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] font-sans'>
                        {metric.unit}
                      </span>
                    </p>
                  </div>
                  <div className='mt-2'>
                    <div className='flex items-center text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                      <span>
                        Mục tiêu: {metric.target}
                        {metric.unit}
                      </span>
                    </div>
                    <div className='mt-1 w-full bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full ${
                          metric.value >= metric.target
                            ? 'bg-[var(--color-orange-500)] dark:bg-[var(--color-orange-400)]'
                            : 'bg-[var(--color-orange-300)] dark:bg-[var(--color-orange-600)]'
                        }`}
                        style={{
                          width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>
          </motion.div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className='space-y-3 flex-1'
          >
            {goals.length === 0 ? (
              <AdminCard>
                <div className='text-center py-12'>
                  <svg
                    className='w-16 h-16 text-[var(--color-gray-300)] dark:text-[var(--color-gray-600)] mx-auto mb-4'
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
                  <h3 className='text-lg font-medium text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2 font-heading'>
                    Chưa có mục tiêu nào
                  </h3>
                  <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-4 font-sans'>
                    Tạo mục tiêu mới để theo dõi hiệu suất của bạn
                  </p>
                  <Button
                    size='sm'
                    onClick={handleCreateGoal}
                    className='bg-gradient-to-r from-[var(--color-orange-600)] to-[var(--color-orange-700)] hover:from-[var(--color-orange-700)] hover:to-[var(--color-orange-800)] text-[var(--color-white)] border-0'
                  >
                    Tạo mục tiêu đầu tiên
                  </Button>
                </div>
              </AdminCard>
            ) : (
              goals.map(goal => (
                <AdminCard key={goal.id} hover>
                  <div className='flex items-start justify-between mb-4'>
                    <div className='flex-1'>
                      <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2 font-heading'>
                        {goal.title}
                      </h3>
                      <p className='text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] mb-3 font-sans'>
                        {goal.description}
                      </p>
                      <div className='flex items-center gap-4 text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                        <span>
                          Tiến độ: {goal.current_value}/{goal.target_value} {goal.unit}
                        </span>
                        <span>Hạn: {formatDate(goal.deadline)}</span>
                      </div>
                    </div>
                    <div className='flex flex-col items-end gap-2'>
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-medium font-sans ${getStatusColor(
                          goal.status
                        )}`}
                      >
                        {getStatusLabel(goal.status)}
                      </span>
                      <span className='text-sm font-medium text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                        {goal.progress_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className='w-full bg-[var(--color-gray-200)] dark:bg-[var(--color-gray-700)] rounded-full h-3 mb-4'>
                    <div
                      className={`h-3 rounded-full ${
                        goal.progress_percentage >= 100
                          ? 'bg-[var(--color-orange-500)] dark:bg-[var(--color-orange-400)]'
                          : goal.progress_percentage >= 80
                          ? 'bg-[var(--color-orange-400)] dark:bg-[var(--color-orange-500)]'
                          : goal.progress_percentage >= 60
                          ? 'bg-[var(--color-orange-300)] dark:bg-[var(--color-orange-600)]'
                          : 'bg-[var(--color-gray-400)] dark:bg-[var(--color-gray-600)]'
                      }`}
                      style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className='flex justify-end gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleEditGoal(goal)}
                      className='border-[var(--color-gray-300)] dark:border-[var(--color-gray-600)] hover:border-[var(--color-orange-300)] dark:hover:border-[var(--color-orange-600)]'
                    >
                      Chỉnh sửa
                    </Button>
                    <Button size='sm' variant='danger' onClick={() => handleDeleteGoal(goal.id)}>
                      Xóa
                    </Button>
                  </div>
                </AdminCard>
              ))
            )}
          </motion.div>
        )}

        {/* Set Goal Modal */}
        <SetGoalModal
          isOpen={isGoalModalOpen}
          onClose={() => {
            setIsGoalModalOpen(false);
            setEditingGoal(null);
          }}
          onSave={handleSaveGoal}
          editingGoal={editingGoal}
        />

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className='space-y-3 flex-1'
          >
            {reviews.map(review => (
              <AdminCard key={review.id} hover>
                <div className='flex items-start justify-between mb-4'>
                  <div>
                    <h3 className='text-lg font-semibold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-1 font-heading'>
                      Đánh giá {review.period}
                    </h3>
                    <p className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                      Đánh giá bởi: {review.reviewer} - {formatDate(review.review_date)}
                    </p>
                  </div>
                  <div className='text-right'>
                    <div className='text-2xl font-bold text-[var(--color-orange-600)] dark:text-[var(--color-orange-400)] font-heading'>
                      {review.overall_rating}/5
                    </div>
                    <div className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] font-sans'>
                      {review.goals_achieved}/{review.total_goals} mục tiêu đạt được
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-4'>
                  <div>
                    <h4 className='text-sm font-medium text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2 font-sans'>
                      Điểm mạnh
                    </h4>
                    <ul className='space-y-1'>
                      {review.strengths.map((strength, index) => (
                        <li
                          key={index}
                          className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] flex items-center font-sans'
                        >
                          <svg
                            className='w-4 h-4 text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)] mr-2'
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
                    <h4 className='text-sm font-medium text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2 font-sans'>
                      Cần cải thiện
                    </h4>
                    <ul className='space-y-1'>
                      {review.areas_for_improvement.map((area, index) => (
                        <li
                          key={index}
                          className='text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] flex items-center font-sans'
                        >
                          <svg
                            className='w-4 h-4 text-[var(--color-orange-500)] dark:text-[var(--color-orange-400)] mr-2'
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

                <div className='bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-700)] rounded-lg p-4'>
                  <h4 className='text-sm font-medium text-[var(--color-gray-900)] dark:text-[var(--color-white)] mb-2 font-sans'>
                    Nhận xét
                  </h4>
                  <p className='text-sm text-[var(--color-gray-700)] dark:text-[var(--color-gray-300)] font-sans'>
                    {review.feedback}
                  </p>
                </div>
              </AdminCard>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
