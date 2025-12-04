const prisma = require('../lib/prisma.js').prisma;
const reportDataService = require('../services/report-data.service.js');
const reportGenerationService = require('../services/report-generation.service.js');
const reportStorageService = require('../services/report-storage.service.js');
const reportEmailService = require('../services/report-email.service.js');

class ScheduledReportsController {
  /**
   * Get all scheduled reports
   */
  async getScheduledReports(req, res) {
    try {
      const scheduledReports = await prisma.scheduledReport.findMany({
        orderBy: {
          created_at: 'desc',
        },
      });

      res.json({
        success: true,
        message: 'Scheduled reports retrieved successfully',
        data: scheduledReports,
      });
    } catch (error) {
      console.error('Get scheduled reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách báo cáo đã lên lịch',
        data: null,
      });
    }
  }

  /**
   * Get a single scheduled report by ID
   */
  async getScheduledReport(req, res) {
    try {
      const { id } = req.params;

      const scheduledReport = await prisma.scheduledReport.findUnique({
        where: { id },
      });

      if (!scheduledReport) {
        return res.status(404).json({
          success: false,
          message: 'Scheduled report not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Scheduled report retrieved successfully',
        data: scheduledReport,
      });
    } catch (error) {
      console.error('Get scheduled report error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy báo cáo đã lên lịch',
        data: null,
      });
    }
  }

  /**
   * Create a new scheduled report
   */
  async createScheduledReport(req, res) {
    try {
      const {
        name,
        report_type,
        format,
        schedule,
        recipients,
        filters,
        is_active = true,
      } = req.body;

      // Validate required fields
      if (!name || !report_type || !format || !schedule || !recipients) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          data: null,
        });
      }

      // Calculate next_run_at based on schedule
      let nextRunAt = null;
      if (schedule && schedule.frequency) {
        const now = new Date();
        nextRunAt = new Date();

        switch (schedule.frequency.toUpperCase()) {
          case 'DAILY':
            nextRunAt.setDate(now.getDate() + 1);
            break;
          case 'WEEKLY':
            nextRunAt.setDate(now.getDate() + 7);
            break;
          case 'MONTHLY':
            nextRunAt.setMonth(now.getMonth() + 1);
            break;
        }

        // Set time if specified
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          nextRunAt.setHours(hours || 0, minutes || 0, 0, 0);
        }
      }

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          name,
          report_type,
          format,
          schedule,
          recipients,
          filters,
          is_active,
          next_run_at: nextRunAt,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Scheduled report created successfully',
        data: scheduledReport,
      });
    } catch (error) {
      console.error('Create scheduled report error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo báo cáo đã lên lịch',
        data: null,
      });
    }
  }

  /**
   * Update a scheduled report
   */
  async updateScheduledReport(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const scheduledReport = await prisma.scheduledReport.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Scheduled report updated successfully',
        data: scheduledReport,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Scheduled report not found',
          data: null,
        });
      }

      console.error('Update scheduled report error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật báo cáo đã lên lịch',
        data: null,
      });
    }
  }

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(req, res) {
    try {
      const { id } = req.params;

      await prisma.scheduledReport.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Scheduled report deleted successfully',
        data: null,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Scheduled report not found',
          data: null,
        });
      }

      console.error('Delete scheduled report error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa báo cáo đã lên lịch',
        data: null,
      });
    }
  }

  /**
   * Run a scheduled report manually
   */
  async runScheduledReport(req, res) {
    try {
      const { id } = req.params;

      const scheduledReport = await prisma.scheduledReport.findUnique({
        where: { id },
      });

      if (!scheduledReport) {
        return res.status(404).json({
          success: false,
          message: 'Scheduled report not found',
          data: null,
        });
      }

      // Start report generation asynchronously
      this.generateReport(scheduledReport).catch(error => {
        console.error('Report generation error:', error);
      });

      // Update last_run_at immediately
      await prisma.scheduledReport.update({
        where: { id },
        data: {
          last_run_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Scheduled report execution started',
        data: {
          success: true,
          message: 'Report generation has been queued and will be sent to recipients when ready',
        },
      });
    } catch (error) {
      console.error('Run scheduled report error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi chạy báo cáo đã lên lịch',
        data: null,
      });
    }
  }

  /**
   * Generate report (async)
   * Full implementation with data fetching, generation, storage, and email sending
   */
  async generateReport(scheduledReport) {
    const startTime = Date.now();
    console.log(
      `[REPORT] Starting report generation: ${scheduledReport.name} (${scheduledReport.report_type}, ${scheduledReport.format})`
    );
    console.log(`[REPORT] Recipients: ${scheduledReport.recipients.join(', ')}`);

    try {
      // Step 1: Fetch data based on report_type and filters
      console.log('[REPORT] Step 1: Fetching data...');
      const filters = scheduledReport.filters || {};
      const reportData = await reportDataService.fetchReportData(
        scheduledReport.report_type,
        filters
      );
      console.log(
        `[REPORT] Data fetched successfully (${
          Array.isArray(reportData) ? reportData.length : 'object'
        } items)`
      );

      // Step 2: Generate report in the specified format
      console.log(`[REPORT] Step 2: Generating ${scheduledReport.format} report...`);
      let fileBuffer;
      const format = scheduledReport.format.toUpperCase();

      switch (format) {
        case 'PDF':
          fileBuffer = await reportGenerationService.generatePDF(
            scheduledReport.report_type,
            reportData,
            {
              title: scheduledReport.name,
              filters,
            }
          );
          break;
        case 'EXCEL':
          fileBuffer = await reportGenerationService.generateExcel(
            scheduledReport.report_type,
            reportData,
            {
              title: scheduledReport.name,
              filters,
            }
          );
          break;
        case 'CSV':
          fileBuffer = await reportGenerationService.generateCSV(
            scheduledReport.report_type,
            reportData,
            {
              title: scheduledReport.name,
              filters,
            }
          );
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      console.log(
        `[REPORT] Report generated successfully (${(fileBuffer.length / 1024).toFixed(2)} KB)`
      );

      // Step 3: Store report file in S3
      console.log('[REPORT] Step 3: Uploading to S3...');
      let downloadUrl = null;
      try {
        downloadUrl = await reportStorageService.uploadReport(
          fileBuffer,
          scheduledReport.id,
          format,
          scheduledReport.report_type
        );
        if (downloadUrl) {
          console.log(`[REPORT] Report uploaded to S3: ${downloadUrl.substring(0, 50)}...`);
        } else {
          console.warn('[REPORT] S3 not configured, skipping upload');
        }
      } catch (storageError) {
        console.error('[REPORT] S3 upload failed (non-critical):', storageError.message);
        // Continue even if S3 upload fails
      }

      // Step 4: Send report to recipients via email
      console.log('[REPORT] Step 4: Sending email to recipients...');
      const emailResult = await reportEmailService.sendReport(
        scheduledReport.recipients,
        scheduledReport.name,
        scheduledReport.report_type,
        format,
        fileBuffer,
        downloadUrl
      );

      if (emailResult.success) {
        console.log(`[REPORT] Email sent successfully to ${emailResult.recipients} recipient(s)`);
      } else {
        console.error('[REPORT] Email sending failed:', emailResult.error);
        // Don't throw - log error but don't fail the entire process
      }

      // Update next_run_at based on schedule
      await this.updateNextRunAt(scheduledReport);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[REPORT] Report generation completed successfully in ${duration}s`);

      return {
        success: true,
        reportId: scheduledReport.id,
        format,
        size: fileBuffer.length,
        downloadUrl,
        emailSent: emailResult.success,
        duration: `${duration}s`,
      };
    } catch (error) {
      console.error('[REPORT] Report generation error:', error);
      console.error('[REPORT] Stack:', error.stack);

      // Update next_run_at even on error (to prevent retry loops)
      try {
        await this.updateNextRunAt(scheduledReport);
      } catch (updateError) {
        console.error('[REPORT] Failed to update next_run_at:', updateError);
      }

      throw error;
    }
  }

  /**
   * Calculate and update next_run_at based on schedule
   * @param {Object} scheduledReport - Scheduled report
   */
  async updateNextRunAt(scheduledReport) {
    try {
      const schedule = scheduledReport.schedule;
      if (!schedule || !schedule.frequency) {
        return;
      }

      const now = new Date();
      let nextRun = new Date();

      switch (schedule.frequency.toUpperCase()) {
        case 'DAILY':
          nextRun.setDate(now.getDate() + 1);
          break;
        case 'WEEKLY':
          nextRun.setDate(now.getDate() + 7);
          break;
        case 'MONTHLY':
          nextRun.setMonth(now.getMonth() + 1);
          break;
        default:
          // Don't update if frequency is unknown
          return;
      }

      // Set time if specified
      if (schedule.time) {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        nextRun.setHours(hours || 0, minutes || 0, 0, 0);
      }

      await prisma.scheduledReport.update({
        where: { id: scheduledReport.id },
        data: { next_run_at: nextRun },
      });

      console.log(`[REPORT] Next run scheduled for: ${nextRun.toLocaleString('vi-VN')}`);
    } catch (error) {
      console.error('[REPORT] Error updating next_run_at:', error);
    }
  }
}

module.exports = new ScheduledReportsController();
