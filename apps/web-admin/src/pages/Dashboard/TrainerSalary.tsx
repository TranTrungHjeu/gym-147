import React, { useEffect, useState } from 'react';
import { DollarSign, Calendar, Clock, Users, TrendingUp, FileText } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import CustomSelect from '../../components/common/CustomSelect';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../hooks/useToast';
import { salaryService, type TrainerSalaryStatistics } from '../../services/salary.service';

export default function TrainerSalary() {
  const { showToast } = useToast();
  const [statistics, setStatistics] = useState<TrainerSalaryStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadStatistics();
  }, [selectedMonth, selectedYear]);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      const response = await salaryService.getMySalaryStatistics(selectedMonth, selectedYear);

      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        showToast('error', response.message || 'Không thể tải thống kê lương');
      }
    } catch (error: any) {
      showToast('error', error.message || 'Không thể tải thống kê lương');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'Chưa có lương';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)} giờ`;
  };

  // Get month name
  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const monthOptions = monthNames.map((month, index) => ({
    value: String(index + 1),
    label: month,
  }));
  const yearOptions = years.map(year => ({
    value: String(year),
    label: String(year),
  }));

  return (
    <div className='min-h-screen-full bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-900)]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3'>
        <AdminCard className='rounded-none border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
        <div className='flex items-center justify-between mb-5'>
          <div>
            <h1 className='text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-heading'>
              <DollarSign className='w-6 h-6' />
              Lương của tôi
            </h1>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Xem thống kê giờ dạy và lương theo tháng
            </p>
          </div>
        </div>

        {/* Month/Year Selector */}
        <div className='mb-5 border border-gray-200 dark:border-gray-700 rounded-none bg-gray-50/70 dark:bg-gray-900/40 p-3'>
          <div className='flex items-center gap-2 mb-2'>
            <Calendar className='w-4 h-4 text-orange-500' />
            <p className='text-xs uppercase tracking-wide font-semibold text-gray-600 dark:text-gray-300'>
              Bộ lọc kỳ lương
            </p>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1'>
                Tháng
              </label>
              <CustomSelect
                options={monthOptions}
                value={String(selectedMonth)}
                onChange={value => setSelectedMonth(Number(value))}
                placeholder='Chọn tháng'
                icon={<Calendar className='w-3.5 h-3.5' />}
                className='w-full h-[36px]'
              />
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1'>
                Năm
              </label>
              <CustomSelect
                options={yearOptions}
                value={String(selectedYear)}
                onChange={value => setSelectedYear(Number(value))}
                placeholder='Chọn năm'
                icon={<Calendar className='w-3.5 h-3.5' />}
                className='w-full h-[36px]'
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <TableLoading className='rounded-none border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8' />
        ) : statistics ? (
          <div className='space-y-6'>
            {/* Summary Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <div className='bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-none p-5 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-medium text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'>
                      Tổng giờ dạy
                    </p>
                    <p className='text-xl font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mt-1 font-heading'>
                      {formatHours(statistics.teaching_hours.totalHours)}
                    </p>
                  </div>
                  <Clock className='w-7 h-7 text-[var(--color-orange-500)]' />
                </div>
              </div>

              <div className='bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-none p-5 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-medium text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'>
                      Tổng lớp học
                    </p>
                    <p className='text-xl font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mt-1 font-heading'>
                      {statistics.teaching_hours.totalClasses}
                    </p>
                  </div>
                  <FileText className='w-7 h-7 text-[var(--color-orange-500)]' />
                </div>
              </div>

              <div className='bg-[var(--color-white)] dark:bg-[var(--color-gray-800)] rounded-none p-5 border border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-medium text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)]'>
                      Tổng học viên
                    </p>
                    <p className='text-xl font-bold text-[var(--color-gray-900)] dark:text-[var(--color-white)] mt-1 font-heading'>
                      {statistics.teaching_hours.totalStudents}
                    </p>
                  </div>
                  <Users className='w-7 h-7 text-[var(--color-orange-500)]' />
                </div>
              </div>

              <div className='bg-[var(--color-orange-50)] dark:bg-[var(--color-orange-900)]/20 rounded-none p-5 border border-[var(--color-orange-200)] dark:border-[var(--color-orange-700)]'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-medium text-[var(--color-orange-700)] dark:text-[var(--color-orange-300)]'>
                      Tổng lương
                    </p>
                    <p className='text-xl font-bold text-[var(--color-orange-800)] dark:text-[var(--color-orange-200)] mt-1 font-heading'>
                      {statistics.salary
                        ? formatCurrency(statistics.salary.total)
                        : formatCurrency(null)}
                    </p>
                  </div>
                  <DollarSign className='w-7 h-7 text-[var(--color-orange-500)]' />
                </div>
              </div>
            </div>

            {/* Salary Details */}
            {statistics.salary && (
              <div className='bg-white dark:bg-gray-800 rounded-none p-5 border border-gray-200 dark:border-gray-700'>
                <h2 className='text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2 font-heading'>
                  <TrendingUp className='w-5 h-5' />
                  Chi tiết lương
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>Mức lương/giờ</p>
                    <p className='text-lg font-semibold text-gray-900 dark:text-white mt-1'>
                      {formatCurrency(statistics.trainer.hourly_rate || 0)}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>Số giờ dạy</p>
                    <p className='text-lg font-semibold text-gray-900 dark:text-white mt-1'>
                      {formatHours(statistics.salary.hours)}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>Tổng lương</p>
                    <p className='text-lg font-semibold text-orange-600 dark:text-orange-400 mt-1'>
                      {formatCurrency(statistics.salary.total)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Teaching Hours Breakdown */}
            {statistics.teaching_hours.breakdown && statistics.teaching_hours.breakdown.length > 0 && (
              <div className='bg-white dark:bg-gray-800 rounded-none p-5 border border-gray-200 dark:border-gray-700'>
                <h2 className='text-base font-semibold text-gray-900 dark:text-white mb-3 font-heading'>
                  Chi tiết giờ dạy
                </h2>
                <div className='overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-none'>
                  <div className='max-h-[360px] overflow-y-auto'>
                    <table className='w-full text-xs'>
                    <thead className='bg-gray-50 dark:bg-gray-700 sticky top-0 z-10'>
                      <tr>
                        <th className='px-3 py-2 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide'>
                          Lớp học
                        </th>
                        <th className='px-3 py-2 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide'>
                          Thời gian
                        </th>
                        <th className='px-3 py-2 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide'>
                          Số giờ
                        </th>
                        <th className='px-3 py-2 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide'>
                          Học viên
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                      {statistics.teaching_hours.breakdown.map((item, index) => (
                        <tr
                          key={index}
                          className='hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors'
                        >
                          <td className='px-3 py-2.5 text-sm text-gray-900 dark:text-white font-medium'>
                            {item.class_name || item.className || item.class?.name || 'Lớp học'}
                          </td>
                          <td className='px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap'>
                            {new Date(item.start_time).toLocaleDateString('vi-VN')} -{' '}
                            {new Date(item.start_time).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' -> '}
                            {new Date(item.end_time).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className='px-3 py-2.5 text-sm text-gray-900 dark:text-white font-semibold'>
                            {formatHours(item.hours)}
                          </td>
                          <td className='px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400'>
                            {item.attendance_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            )}

            {!statistics.salary && (
              <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-none p-5'>
                <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                  Chưa có thông tin lương cho tháng này. Vui lòng liên hệ quản trị viên để được
                  cập nhật mức lương/giờ.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className='text-center py-12'>
            <p className='text-gray-500 dark:text-gray-400'>Không có dữ liệu</p>
          </div>
        )}
        </AdminCard>
      </div>
    </div>
  );
}

