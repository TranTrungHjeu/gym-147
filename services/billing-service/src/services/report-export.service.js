const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * Report Export Service
 * Handles exporting reports to PDF and Excel formats
 */
class ReportExportService {
  /**
   * Export revenue report to PDF
   * @param {Object} reportData - Report data
   * @param {Object} options - Export options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async exportRevenueReportToPDF(reportData, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Revenue Report', { align: 'center' });
        doc.moveDown();
        
        if (reportData.period) {
          doc.fontSize(12).text(
            `Period: ${reportData.period.startDate.toLocaleDateString()} - ${reportData.period.endDate.toLocaleDateString()}`,
            { align: 'center' }
          );
        }
        doc.moveDown();

        // Summary
        if (reportData.totals) {
          doc.fontSize(16).text('Summary', { underline: true });
          doc.moveDown(0.5);
          
          doc.fontSize(12);
          doc.text(`Total Revenue: ${this.formatCurrency(reportData.totals.total_revenue)}`);
          doc.text(`Subscription Revenue: ${this.formatCurrency(reportData.totals.subscription_revenue)}`);
          doc.text(`Class Revenue: ${this.formatCurrency(reportData.totals.class_revenue)}`);
          doc.text(`Addon Revenue: ${this.formatCurrency(reportData.totals.addon_revenue)}`);
          doc.text(`Other Revenue: ${this.formatCurrency(reportData.totals.other_revenue)}`);
          doc.moveDown();
          
          doc.text(`New Members: ${reportData.totals.new_members}`);
          doc.text(`Cancelled Members: ${reportData.totals.cancelled_members}`);
          doc.text(`Successful Payments: ${reportData.totals.successful_payments}`);
          doc.text(`Failed Payments: ${reportData.totals.failed_payments}`);
          doc.moveDown();
        }

        // Daily reports table
        if (reportData.reports && reportData.reports.length > 0) {
          doc.fontSize(16).text('Daily Reports', { underline: true });
          doc.moveDown(0.5);

          doc.fontSize(10);
          reportData.reports.forEach((report, index) => {
            const date = new Date(report.report_date).toLocaleDateString();
            doc.text(
              `${date}: ${this.formatCurrency(report.total_revenue)} (${report.successful_payments} payments)`
            );
            
            if (index < reportData.reports.length - 1) {
              doc.moveDown(0.3);
            }
          });
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).text(
          `Generated on ${new Date().toLocaleString()}`,
          { align: 'center' }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export revenue report to Excel
   * @param {Object} reportData - Report data
   * @param {Object} options - Export options
   * @returns {Promise<Buffer>} Excel buffer
   */
  async exportRevenueReportToExcel(reportData, options = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Revenue Report');

      // Set column widths
      worksheet.columns = [
        { width: 15 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
      ];

      // Header row
      const headerRow = worksheet.addRow([
        'Date',
        'Subscription Revenue',
        'Class Revenue',
        'Addon Revenue',
        'Other Revenue',
        'Total Revenue',
        'New Members',
        'Cancelled',
        'Success Payments',
        'Failed Payments',
      ]);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Data rows
      if (reportData.reports && reportData.reports.length > 0) {
        reportData.reports.forEach(report => {
          worksheet.addRow([
            new Date(report.report_date).toLocaleDateString(),
            Number(report.subscription_revenue),
            Number(report.class_revenue),
            Number(report.addon_revenue),
            Number(report.other_revenue),
            Number(report.total_revenue),
            report.new_members,
            report.cancelled_members,
            report.successful_payments,
            report.failed_payments,
          ]);
        });
      }

      // Summary row
      if (reportData.totals) {
        worksheet.addRow([]);
        const summaryRow = worksheet.addRow([
          'TOTAL',
          Number(reportData.totals.subscription_revenue),
          Number(reportData.totals.class_revenue),
          Number(reportData.totals.addon_revenue),
          Number(reportData.totals.other_revenue),
          Number(reportData.totals.total_revenue),
          reportData.totals.new_members,
          reportData.totals.cancelled_members,
          reportData.totals.successful_payments,
          reportData.totals.failed_payments,
        ]);
        summaryRow.font = { bold: true };
        summaryRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE0E0' },
        };
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Export to Excel error:', error);
      throw error;
    }
  }

  /**
   * Export member analytics to Excel
   * @param {Array} members - Member analytics data
   * @param {Object} options - Export options
   * @returns {Promise<Buffer>} Excel buffer
   */
  async exportMemberAnalyticsToExcel(members, options = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Member Analytics');

      // Set column widths
      worksheet.columns = [
        { width: 20 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
      ];

      // Header row
      const headerRow = worksheet.addRow([
        'Member ID',
        'Total Spent',
        'Predicted LTV',
        'Engagement Score',
        'Churn Risk',
        'Last Calculated',
      ]);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Data rows
      members.forEach(member => {
        worksheet.addRow([
          member.member_id,
          Number(member.total_spent || 0),
          Number(member.predicted_ltv || 0),
          member.engagement_score || 0,
          member.churn_risk_score || 0,
          member.last_calculated_at
            ? new Date(member.last_calculated_at).toLocaleDateString()
            : 'N/A',
        ]);
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Export member analytics to Excel error:', error);
      throw error;
    }
  }

  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }
}

module.exports = new ReportExportService();

