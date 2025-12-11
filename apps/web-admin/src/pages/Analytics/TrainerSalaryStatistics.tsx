import React, { useEffect, useState } from 'react';
import { DollarSign, Calendar, TrendingUp, Users, Clock, Download } from 'lucide-react';
import AdminCard from '../../components/common/AdminCard';
import {
  AdminTable,
  AdminTableBody,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
} from '../../components/common/AdminTable';
import { TableLoading } from '../../components/ui/AppLoading';
import { useToast } from '../../hooks/useToast';
import { salaryService, type SalaryStatistics } from '../../services/salary.service';

const TrainerSalaryStatistics: React.FC = () => {
  const { showToast } = useToast();
  const [statistics, setStatistics] = useState<SalaryStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadStatistics();
  }, [selectedMonth, selectedYear]);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      const response = await salaryService.getAllTrainersSalaryStatistics(selectedMonth, selectedYear);

      if (response.success && response.data) {
        setStatistics(response.data.statistics || []);
      }
    } catch (error: any) {
      showToast('error', error.message || 'Không thể tải thống kê lương');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement Excel export
    showToast('info', 'Tính năng export đang được phát triển');
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'Chưa có lương';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)} giờ`;
  };

  // Calculate totals
  const totals = statistics.reduce(
    (acc, stat) => {
      acc.totalHours += stat.teaching_hours;
      acc.totalClasses += stat.total_classes;
      acc.totalStudents += stat.total_students;
      acc.totalSalary += stat.salary || 0;
      return acc;
    },
    { totalHours: 0, totalClasses: 0, totalStudents: 0, totalSalary: 0 }
  );

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

  return (
    <div className="space-y-6">
      <AdminCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Thống kê lương trainer
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Xem thống kê giờ dạy và lương của các trainers theo tháng
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Xuất Excel
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tháng</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Năm</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng giờ dạy</p>
                <p className="text-2xl font-bold text-gray-900">{formatHours(totals.totalHours)}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng số lớp</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalClasses}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng học viên</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalStudents}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng lương</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.totalSalary)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableLoading />
        ) : statistics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Không có dữ liệu thống kê cho tháng này</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <AdminTable>
              <AdminTableHeader>
                <AdminTableRow>
                  <AdminTableCell>Trainer</AdminTableCell>
                  <AdminTableCell>Email</AdminTableCell>
                  <AdminTableCell>Lương/giờ</AdminTableCell>
                  <AdminTableCell>Giờ dạy</AdminTableCell>
                  <AdminTableCell>Số lớp</AdminTableCell>
                  <AdminTableCell>Số học viên</AdminTableCell>
                  <AdminTableCell>Tổng lương</AdminTableCell>
                </AdminTableRow>
              </AdminTableHeader>
              <AdminTableBody>
                {statistics.map(stat => (
                  <AdminTableRow key={stat.trainer.id}>
                    <AdminTableCell>
                      <span className="font-medium">{stat.trainer.full_name}</span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className="text-gray-600">{stat.trainer.email}</span>
                    </AdminTableCell>
                    <AdminTableCell>
                      {stat.trainer.hourly_rate
                        ? formatCurrency(stat.trainer.hourly_rate)
                        : 'Chưa có lương'}
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatHours(stat.teaching_hours)}</span>
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span>{stat.total_classes}</span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span>{stat.total_students}</span>
                    </AdminTableCell>
                    <AdminTableCell>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(stat.salary)}
                      </span>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </AdminTableBody>
            </AdminTable>
          </div>
        )}
      </AdminCard>
    </div>
  );
};

export default TrainerSalaryStatistics;

