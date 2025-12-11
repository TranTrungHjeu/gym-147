import React, { useEffect, useState } from 'react';
import { DollarSign, Calendar, Clock, Users, TrendingUp, FileText } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
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

  return (
    <div className='space-y-6'>
      <AdminCard>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
              <DollarSign className='w-6 h-6' />
              Lương của tôi
            </h1>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Xem thống kê giờ dạy và lương theo tháng
            </p>
          </div>
        </div>

        {/* Month/Year Selector */}
        <div className='flex items-center gap-4 mb-6'>
          <div className='flex items-center gap-2'>
            <Calendar className='w-4 h-4 text-gray-500' />
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>Tháng:</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className='px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
            >
              {monthNames.map((month, index) => (
                <option key={index + 1} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className='flex items-center gap-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>Năm:</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className='px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <TableLoading />
        ) : statistics ? (
          <div className='space-y-6'>
            {/* Summary Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-blue-600 dark:text-blue-400'>
                      Tổng giờ dạy
                    </p>
                    <p className='text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1'>
                      {formatHours(statistics.teaching_hours.totalHours)}
                    </p>
                  </div>
                  <Clock className='w-8 h-8 text-blue-500' />
                </div>
              </div>

              <div className='bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-green-600 dark:text-green-400'>
                      Tổng lớp học
                    </p>
                    <p className='text-2xl font-bold text-green-900 dark:text-green-100 mt-1'>
                      {statistics.teaching_hours.totalClasses}
                    </p>
                  </div>
                  <FileText className='w-8 h-8 text-green-500' />
                </div>
              </div>

              <div className='bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-purple-600 dark:text-purple-400'>
                      Tổng học viên
                    </p>
                    <p className='text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1'>
                      {statistics.teaching_hours.totalStudents}
                    </p>
                  </div>
                  <Users className='w-8 h-8 text-purple-500' />
                </div>
              </div>

              <div className='bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-orange-600 dark:text-orange-400'>
                      Tổng lương
                    </p>
                    <p className='text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1'>
                      {statistics.salary
                        ? formatCurrency(statistics.salary.total)
                        : formatCurrency(null)}
                    </p>
                  </div>
                  <DollarSign className='w-8 h-8 text-orange-500' />
                </div>
              </div>
            </div>

            {/* Salary Details */}
            {statistics.salary && (
              <div className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
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
              <div className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                  Chi tiết giờ dạy
                </h2>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gray-50 dark:bg-gray-700'>
                      <tr>
                        <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                          Lớp học
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                          Thời gian
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                          Số giờ
                        </th>
                        <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                          Học viên
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                      {statistics.teaching_hours.breakdown.map((item, index) => (
                        <tr key={index} className='hover:bg-gray-50 dark:hover:bg-gray-700/50'>
                          <td className='px-4 py-2 text-sm text-gray-900 dark:text-white'>
                            {item.class_name}
                          </td>
                          <td className='px-4 py-2 text-sm text-gray-600 dark:text-gray-400'>
                            {new Date(item.start_time).toLocaleString('vi-VN')} -{' '}
                            {new Date(item.end_time).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className='px-4 py-2 text-sm text-gray-900 dark:text-white'>
                            {formatHours(item.hours)}
                          </td>
                          <td className='px-4 py-2 text-sm text-gray-600 dark:text-gray-400'>
                            {item.attendance_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!statistics.salary && (
              <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6'>
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
  );
}

