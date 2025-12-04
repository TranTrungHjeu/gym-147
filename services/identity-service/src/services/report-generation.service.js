const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * Report Generation Service
 * Generates reports in PDF, Excel, and CSV formats
 */
class ReportGenerationService {
  /**
   * Generate PDF report
   * @param {string} reportType - Report type
   * @param {any} data - Report data
   * @param {Object} options - Options (title, filters, etc.)
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generatePDF(reportType, data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        const title = options.title || `${reportType} Report`;
        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();

        // Report metadata
        doc.fontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString('vi-VN')}`, { align: 'center' });
        if (options.filters) {
          if (options.filters.startDate) {
            doc.text(`From: ${new Date(options.filters.startDate).toLocaleDateString('vi-VN')}`, {
              align: 'center',
            });
          }
          if (options.filters.endDate) {
            doc.text(`To: ${new Date(options.filters.endDate).toLocaleDateString('vi-VN')}`, {
              align: 'center',
            });
          }
        }
        doc.moveDown(2);

        // Generate content based on report type
        this.generatePDFContent(doc, reportType, data, options);

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).text('Gym147 - Automated Report System', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate PDF content based on report type
   * @param {PDFDocument} doc - PDF document
   * @param {string} reportType - Report type
   * @param {any} data - Report data
   * @param {Object} options - Options
   */
  generatePDFContent(doc, reportType, data, options) {
    switch (reportType) {
      case 'MEMBERS':
        this.generateMembersPDF(doc, data);
        break;
      case 'REVENUE':
        this.generateRevenuePDF(doc, data);
        break;
      case 'CLASSES':
        this.generateClassesPDF(doc, data);
        break;
      case 'EQUIPMENT':
        this.generateEquipmentPDF(doc, data);
        break;
      case 'SYSTEM':
        this.generateSystemPDF(doc, data);
        break;
      default:
        doc.text('Report data:', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Generate Members PDF
   */
  generateMembersPDF(doc, members) {
    if (!Array.isArray(members) || members.length === 0) {
      doc.text('No members found.');
      return;
    }

    doc.fontSize(16).text('Members Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Members: ${members.length}`);
    doc.moveDown(2);

    doc.fontSize(14).text('Member Details', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10);
    members.slice(0, 50).forEach((member, index) => {
      // Prevent page overflow
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.text(`${index + 1}. ${member.full_name || member.name || 'N/A'}`, { continued: false });
      doc.text(`   Email: ${member.email || 'N/A'}`, { indent: 20 });
      doc.text(`   Status: ${member.membership_status || 'N/A'}`, { indent: 20 });
      doc.text(`   Type: ${member.membership_type || 'N/A'}`, { indent: 20 });
      doc.moveDown(0.3);
    });

    if (members.length > 50) {
      doc.moveDown();
      doc.text(`... and ${members.length - 50} more members`, { align: 'center' });
    }
  }

  /**
   * Generate Revenue PDF
   */
  generateRevenuePDF(doc, revenueData) {
    doc.fontSize(16).text('Revenue Summary', { underline: true });
    doc.moveDown(0.5);

    if (revenueData.totals) {
      doc.fontSize(12);
      doc.text(`Total Revenue: ${this.formatCurrency(revenueData.totals.total_revenue || 0)}`);
      doc.text(
        `Subscription Revenue: ${this.formatCurrency(revenueData.totals.subscription_revenue || 0)}`
      );
      doc.text(`Class Revenue: ${this.formatCurrency(revenueData.totals.class_revenue || 0)}`);
      doc.text(`Addon Revenue: ${this.formatCurrency(revenueData.totals.addon_revenue || 0)}`);
      doc.moveDown();
      doc.text(`New Members: ${revenueData.totals.new_members || 0}`);
      doc.text(`Successful Payments: ${revenueData.totals.successful_payments || 0}`);
    }

    if (revenueData.reports && Array.isArray(revenueData.reports)) {
      doc.moveDown(2);
      doc.fontSize(14).text('Daily Reports', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);

      revenueData.reports.slice(0, 30).forEach(report => {
        const date = new Date(report.report_date).toLocaleDateString('vi-VN');
        doc.text(
          `${date}: ${this.formatCurrency(report.total_revenue || 0)} (${
            report.successful_payments || 0
          } payments)`
        );
      });
    }
  }

  /**
   * Generate Classes PDF
   */
  generateClassesPDF(doc, classes) {
    if (!Array.isArray(classes) || classes.length === 0) {
      doc.text('No classes found.');
      return;
    }

    doc.fontSize(16).text('Classes Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Classes: ${classes.length}`);
    doc.moveDown(2);

    doc.fontSize(14).text('Class Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    classes.slice(0, 50).forEach((gymClass, index) => {
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.text(`${index + 1}. ${gymClass.name || 'N/A'}`, { continued: false });
      doc.text(`   Category: ${gymClass.category || 'N/A'}`, { indent: 20 });
      doc.text(`   Difficulty: ${gymClass.difficulty || 'N/A'}`, { indent: 20 });
      doc.text(`   Duration: ${gymClass.duration || 0} minutes`, { indent: 20 });
      doc.text(`   Max Capacity: ${gymClass.max_capacity || 0}`, { indent: 20 });
      doc.moveDown(0.3);
    });
  }

  /**
   * Generate Equipment PDF
   */
  generateEquipmentPDF(doc, equipment) {
    if (!Array.isArray(equipment) || equipment.length === 0) {
      doc.text('No equipment found.');
      return;
    }

    doc.fontSize(16).text('Equipment Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Equipment: ${equipment.length}`);
    doc.moveDown(2);

    doc.fontSize(14).text('Equipment Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    equipment.slice(0, 50).forEach((item, index) => {
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.text(`${index + 1}. ${item.name || 'N/A'}`, { continued: false });
      doc.text(`   Category: ${item.category || 'N/A'}`, { indent: 20 });
      doc.text(`   Status: ${item.status || 'N/A'}`, { indent: 20 });
      doc.text(`   Location: ${item.location || 'N/A'}`, { indent: 20 });
      doc.moveDown(0.3);
    });
  }

  /**
   * Generate System PDF
   */
  generateSystemPDF(doc, systemData) {
    doc.fontSize(16).text('System Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Users: ${systemData.total_users || 0}`);
    doc.text(`Active Users: ${systemData.active_users || 0}`);
    doc.text(`Total Sessions: ${systemData.total_sessions || 0}`);
    doc.moveDown();
    doc.text(`Generated At: ${new Date(systemData.generated_at).toLocaleString('vi-VN')}`);
  }

  /**
   * Generate Excel report
   * @param {string} reportType - Report type
   * @param {any} data - Report data
   * @param {Object} options - Options
   * @returns {Promise<Buffer>} Excel buffer
   */
  async generateExcel(reportType, data, options = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportType);

      // Generate content based on report type
      await this.generateExcelContent(worksheet, reportType, data, options);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Generate Excel error:', error);
      throw error;
    }
  }

  /**
   * Generate Excel content
   */
  async generateExcelContent(worksheet, reportType, data, options) {
    switch (reportType) {
      case 'MEMBERS':
        await this.generateMembersExcel(worksheet, data);
        break;
      case 'REVENUE':
        await this.generateRevenueExcel(worksheet, data);
        break;
      case 'CLASSES':
        await this.generateClassesExcel(worksheet, data);
        break;
      case 'EQUIPMENT':
        await this.generateEquipmentExcel(worksheet, data);
        break;
      case 'SYSTEM':
        await this.generateSystemExcel(worksheet, data);
        break;
      default:
        worksheet.addRow(['Report Data']);
        worksheet.addRow([JSON.stringify(data, null, 2)]);
    }
  }

  /**
   * Generate Members Excel
   */
  async generateMembersExcel(worksheet, members) {
    // Set column widths
    worksheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 20 },
    ];

    // Header row
    const headerRow = worksheet.addRow(['ID', 'Full Name', 'Email', 'Status', 'Type', 'Joined At']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Data rows
    if (Array.isArray(members)) {
      members.forEach(member => {
        worksheet.addRow([
          member.id || member.membership_number || 'N/A',
          member.full_name || 'N/A',
          member.email || 'N/A',
          member.membership_status || 'N/A',
          member.membership_type || 'N/A',
          member.joined_at ? new Date(member.joined_at).toLocaleDateString('vi-VN') : 'N/A',
        ]);
      });
    }
  }

  /**
   * Generate Revenue Excel
   */
  async generateRevenueExcel(worksheet, revenueData) {
    worksheet.columns = [{ width: 25 }, { width: 20 }];

    // Summary
    if (revenueData.totals) {
      worksheet.addRow(['Revenue Summary', '']);
      worksheet.addRow([
        'Total Revenue',
        this.formatCurrency(revenueData.totals.total_revenue || 0),
      ]);
      worksheet.addRow([
        'Subscription Revenue',
        this.formatCurrency(revenueData.totals.subscription_revenue || 0),
      ]);
      worksheet.addRow([
        'Class Revenue',
        this.formatCurrency(revenueData.totals.class_revenue || 0),
      ]);
      worksheet.addRow([
        'Addon Revenue',
        this.formatCurrency(revenueData.totals.addon_revenue || 0),
      ]);
      worksheet.addRow(['']);
      worksheet.addRow(['New Members', revenueData.totals.new_members || 0]);
      worksheet.addRow(['Successful Payments', revenueData.totals.successful_payments || 0]);
      worksheet.addRow(['']);
    }

    // Daily reports
    if (revenueData.reports && Array.isArray(revenueData.reports)) {
      worksheet.addRow(['Date', 'Revenue', 'Payments']);
      revenueData.reports.forEach(report => {
        worksheet.addRow([
          new Date(report.report_date).toLocaleDateString('vi-VN'),
          this.formatCurrency(report.total_revenue || 0),
          report.successful_payments || 0,
        ]);
      });
    }
  }

  /**
   * Generate Classes Excel
   */
  async generateClassesExcel(worksheet, classes) {
    worksheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    const headerRow = worksheet.addRow([
      'ID',
      'Name',
      'Category',
      'Difficulty',
      'Duration',
      'Capacity',
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    if (Array.isArray(classes)) {
      classes.forEach(gymClass => {
        worksheet.addRow([
          gymClass.id || 'N/A',
          gymClass.name || 'N/A',
          gymClass.category || 'N/A',
          gymClass.difficulty || 'N/A',
          gymClass.duration || 0,
          gymClass.max_capacity || 0,
        ]);
      });
    }
  }

  /**
   * Generate Equipment Excel
   */
  async generateEquipmentExcel(worksheet, equipment) {
    worksheet.columns = [{ width: 15 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 20 }];

    const headerRow = worksheet.addRow(['ID', 'Name', 'Category', 'Status', 'Location']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    if (Array.isArray(equipment)) {
      equipment.forEach(item => {
        worksheet.addRow([
          item.id || 'N/A',
          item.name || 'N/A',
          item.category || 'N/A',
          item.status || 'N/A',
          item.location || 'N/A',
        ]);
      });
    }
  }

  /**
   * Generate System Excel
   */
  async generateSystemExcel(worksheet, systemData) {
    worksheet.columns = [{ width: 25 }, { width: 20 }];

    worksheet.addRow(['Metric', 'Value']);
    worksheet.addRow(['Total Users', systemData.total_users || 0]);
    worksheet.addRow(['Active Users', systemData.active_users || 0]);
    worksheet.addRow(['Total Sessions', systemData.total_sessions || 0]);
    worksheet.addRow(['Generated At', new Date(systemData.generated_at).toLocaleString('vi-VN')]);
  }

  /**
   * Generate CSV report
   * @param {string} reportType - Report type
   * @param {any} data - Report data
   * @param {Object} options - Options
   * @returns {Promise<Buffer>} CSV buffer
   */
  async generateCSV(reportType, data, options = {}) {
    let csvContent = '';

    switch (reportType) {
      case 'MEMBERS':
        csvContent = this.generateMembersCSV(data);
        break;
      case 'REVENUE':
        csvContent = this.generateRevenueCSV(data);
        break;
      case 'CLASSES':
        csvContent = this.generateClassesCSV(data);
        break;
      case 'EQUIPMENT':
        csvContent = this.generateEquipmentCSV(data);
        break;
      case 'SYSTEM':
        csvContent = this.generateSystemCSV(data);
        break;
      default:
        csvContent = JSON.stringify(data, null, 2);
    }

    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Generate Members CSV
   */
  generateMembersCSV(members) {
    if (!Array.isArray(members) || members.length === 0) {
      return 'No members found.';
    }

    const headers = ['ID', 'Full Name', 'Email', 'Status', 'Type', 'Joined At'];
    const rows = members.map(member => [
      member.id || member.membership_number || '',
      member.full_name || '',
      member.email || '',
      member.membership_status || '',
      member.membership_type || '',
      member.joined_at ? new Date(member.joined_at).toLocaleDateString('vi-VN') : '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Generate Revenue CSV
   */
  generateRevenueCSV(revenueData) {
    const rows = [];
    if (revenueData.totals) {
      rows.push(['Metric', 'Value']);
      rows.push(['Total Revenue', this.formatCurrency(revenueData.totals.total_revenue || 0)]);
      rows.push([
        'Subscription Revenue',
        this.formatCurrency(revenueData.totals.subscription_revenue || 0),
      ]);
      rows.push(['Class Revenue', this.formatCurrency(revenueData.totals.class_revenue || 0)]);
      rows.push(['New Members', revenueData.totals.new_members || 0]);
    }
    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Generate Classes CSV
   */
  generateClassesCSV(classes) {
    if (!Array.isArray(classes) || classes.length === 0) {
      return 'No classes found.';
    }

    const headers = ['ID', 'Name', 'Category', 'Difficulty', 'Duration', 'Capacity'];
    const rows = classes.map(gymClass => [
      gymClass.id || '',
      gymClass.name || '',
      gymClass.category || '',
      gymClass.difficulty || '',
      gymClass.duration || 0,
      gymClass.max_capacity || 0,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Generate Equipment CSV
   */
  generateEquipmentCSV(equipment) {
    if (!Array.isArray(equipment) || equipment.length === 0) {
      return 'No equipment found.';
    }

    const headers = ['ID', 'Name', 'Category', 'Status', 'Location'];
    const rows = equipment.map(item => [
      item.id || '',
      item.name || '',
      item.category || '',
      item.status || '',
      item.location || '',
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Generate System CSV
   */
  generateSystemCSV(systemData) {
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', systemData.total_users || 0],
      ['Active Users', systemData.active_users || 0],
      ['Total Sessions', systemData.total_sessions || 0],
      ['Generated At', new Date(systemData.generated_at).toLocaleString('vi-VN')],
    ];
    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  }
}

module.exports = new ReportGenerationService();
