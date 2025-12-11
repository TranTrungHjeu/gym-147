const { prisma } = require('../lib/prisma');

/**
 * Salary Service
 * Handles salary calculation based on actual teaching hours (from Attendance)
 */
class SalaryService {
  /**
   * Calculate actual teaching hours for a trainer in a date range
   * Only counts schedules with status = COMPLETED and has at least 1 attendance record
   * @param {string} trainerId - Trainer ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} { totalHours, totalClasses, totalStudents, breakdown }
   */
  async calculateTeachingHours(trainerId, startDate, endDate) {
    try {
      // Get all completed schedules for this trainer in the date range
      const schedules = await prisma.schedule.findMany({
        where: {
          trainer_id: trainerId,
          status: 'COMPLETED',
          start_time: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          attendance: true,
        },
        orderBy: {
          start_time: 'asc',
        },
      });

      // Filter schedules that have at least 1 attendance record
      const schedulesWithAttendance = schedules.filter(
        schedule => schedule.attendance && schedule.attendance.length > 0
      );

      let totalHours = 0;
      let totalClasses = 0;
      let totalStudents = 0;
      const breakdown = [];

      for (const schedule of schedulesWithAttendance) {
        // Calculate hours for this schedule
        const startTime = new Date(schedule.start_time);
        const endTime = new Date(schedule.end_time);
        const durationMs = endTime.getTime() - startTime.getTime();
        const hours = durationMs / (1000 * 60 * 60); // Convert to hours

        const attendanceCount = schedule.attendance.length;

        totalHours += hours;
        totalClasses += 1;
        totalStudents += attendanceCount;

        breakdown.push({
          schedule_id: schedule.id,
          class_name: schedule.gym_class?.name || 'Unknown',
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          hours: parseFloat(hours.toFixed(2)),
          attendance_count: attendanceCount,
        });
      }

      return {
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalClasses,
        totalStudents,
        breakdown,
      };
    } catch (error) {
      console.error('[ERROR] SalaryService.calculateTeachingHours:', error);
      throw error;
    }
  }

  /**
   * Calculate salary for a trainer
   * @param {string} trainerId - Trainer ID
   * @param {number} hourlyRate - Hourly rate
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} { hours, rate, total, breakdown }
   */
  async calculateSalary(trainerId, hourlyRate, startDate, endDate) {
    try {
      const teachingHours = await this.calculateTeachingHours(trainerId, startDate, endDate);

      const totalSalary = teachingHours.totalHours * hourlyRate;

      return {
        hours: teachingHours.totalHours,
        rate: hourlyRate,
        total: parseFloat(totalSalary.toFixed(2)),
        breakdown: teachingHours.breakdown,
        totalClasses: teachingHours.totalClasses,
        totalStudents: teachingHours.totalStudents,
      };
    } catch (error) {
      console.error('[ERROR] SalaryService.calculateSalary:', error);
      throw error;
    }
  }

  /**
   * Get salary statistics for a specific trainer
   * @param {string} trainerId - Trainer ID
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object>} Salary statistics
   */
  async getTrainerSalaryStatistics(trainerId, month, year) {
    try {
      // Get trainer info
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainerId },
        select: {
          id: true,
          full_name: true,
          email: true,
          hourly_rate: true,
        },
      });

      if (!trainer) {
        throw new Error('Trainer not found');
      }

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // Get teaching hours
      const teachingHours = await this.calculateTeachingHours(trainerId, startDate, endDate);

      // Calculate salary if hourly rate exists
      let salary = null;
      if (trainer.hourly_rate) {
        salary = await this.calculateSalary(
          trainerId,
          Number(trainer.hourly_rate),
          startDate,
          endDate
        );
      }

      return {
        trainer: {
          id: trainer.id,
          full_name: trainer.full_name,
          email: trainer.email,
          hourly_rate: trainer.hourly_rate ? Number(trainer.hourly_rate) : null,
        },
        period: {
          month,
          year,
          start_date: startDate,
          end_date: endDate,
        },
        teaching_hours: teachingHours,
        salary,
      };
    } catch (error) {
      console.error('[ERROR] SalaryService.getTrainerSalaryStatistics:', error);
      throw error;
    }
  }

  /**
   * Get salary statistics for all trainers
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Array>} Array of trainer salary statistics
   */
  async getAllTrainersSalaryStatistics(month, year) {
    try {
      // Get all trainers
      const trainers = await prisma.trainer.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          full_name: true,
          email: true,
          hourly_rate: true,
        },
        orderBy: {
          full_name: 'asc',
        },
      });

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // Calculate statistics for each trainer
      const statistics = await Promise.all(
        trainers.map(async trainer => {
          try {
            const teachingHours = await this.calculateTeachingHours(trainer.id, startDate, endDate);

            let salary = null;
            if (trainer.hourly_rate) {
              salary = await this.calculateSalary(
                trainer.id,
                Number(trainer.hourly_rate),
                startDate,
                endDate
              );
            }

            return {
              trainer: {
                id: trainer.id,
                full_name: trainer.full_name,
                email: trainer.email,
                hourly_rate: trainer.hourly_rate ? Number(trainer.hourly_rate) : null,
              },
              teaching_hours: teachingHours.totalHours,
              total_classes: teachingHours.totalClasses,
              total_students: teachingHours.totalStudents,
              salary: salary ? salary.total : null,
            };
          } catch (error) {
            console.error(
              `[ERROR] Failed to calculate salary for trainer ${trainer.id}:`,
              error.message
            );
            return {
              trainer: {
                id: trainer.id,
                full_name: trainer.full_name,
                email: trainer.email,
                hourly_rate: trainer.hourly_rate ? Number(trainer.hourly_rate) : null,
              },
              teaching_hours: 0,
              total_classes: 0,
              total_students: 0,
              salary: null,
              error: error.message,
            };
          }
        })
      );

      return statistics;
    } catch (error) {
      console.error('[ERROR] SalaryService.getAllTrainersSalaryStatistics:', error);
      throw error;
    }
  }
}

module.exports = { SalaryService };
