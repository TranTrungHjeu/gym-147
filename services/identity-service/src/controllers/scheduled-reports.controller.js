const prisma = require('../lib/prisma.js').prisma;

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

      const scheduledReport = await prisma.scheduledReport.create({
        data: {
          name,
          report_type,
          format,
          schedule,
          recipients,
          filters,
          is_active,
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
   */
  async generateReport(scheduledReport) {
    try {
      // This is a placeholder implementation
      // In production, this would:
      // 1. Fetch data based on report_type and filters
      // 2. Generate report in the specified format (PDF, EXCEL, CSV)
      // 3. Send report to recipients via email
      // 4. Store report file for download

      console.log(`Generating ${scheduledReport.report_type} report in ${scheduledReport.format} format`);
      console.log(`Recipients: ${scheduledReport.recipients.join(', ')}`);

      // Simulate report generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, integrate with:
      // - Report generation service/library (e.g., PDFKit, ExcelJS, csv-writer)
      // - Email service to send reports
      // - File storage service to store generated reports

      console.log('Report generation completed (placeholder)');
    } catch (error) {
      console.error('Report generation error:', error);
      throw error;
    }
  }
}

module.exports = new ScheduledReportsController();

