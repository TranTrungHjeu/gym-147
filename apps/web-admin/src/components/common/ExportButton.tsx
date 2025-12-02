import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, FileSpreadsheet, FileText } from 'lucide-react';
import React from 'react';
import { formatVietnamDateTime } from '../../utils/dateTime';
import { addNotoSansFont } from '../../utils/fonts/noto-sans-vietnamese';
import AdminButton from './AdminButton';

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  filename?: string;
  data: any[];
  columns?: Array<{
    key: string;
    label: string;
  }>;
  title?: string;
}

const ExportUtils = {
  exportToPDF: async (options: ExportOptions) => {
    const { data, columns, filename = 'export', title } = options;

    if (!data || data.length === 0) {
      alert('Không có dữ liệu để xuất');
      return;
    }

    try {
      // Create new PDF document
      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation

      // Try to add Noto Sans font for Vietnamese support
      // If font is not configured, will fallback to 'times'
      try {
        addNotoSansFont(doc);
        doc.setFont('NotoSans', 'normal');
      } catch (e) {
        // Fallback to times font if Noto Sans is not available
        console.warn('Noto Sans font not available, using times font:', e);
        doc.setFont('times', 'normal');
      }

      // Add title
      if (title) {
        doc.setFontSize(16);
        try {
          doc.setFont('NotoSans', 'bold');
        } catch (e) {
          doc.setFont('times', 'bold');
        }
        doc.text(title, 14, 15);
        doc.setFontSize(10);
        try {
          doc.setFont('NotoSans', 'normal');
        } catch (e) {
          doc.setFont('times', 'normal');
        }

        // Add export date
        const exportDate = formatVietnamDateTime(new Date(), 'datetime');
        doc.setFontSize(8);
        doc.text(`Xuất ngày: ${exportDate}`, 14, 22);
      }

      // Prepare table data
      const tableColumns = columns
        ? columns.map(col => col.label)
        : data.length > 0
        ? Object.keys(data[0])
        : [];

      const tableRows = data.map(row => {
        if (columns) {
          return columns.map(col => {
            const value = row[col.key];
            if (value === null || value === undefined) {
              return '';
            }
            // Format dates if they look like dates
            if (typeof value === 'string' && (value.includes('T') || value.includes('-'))) {
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  return formatVietnamDateTime(date, 'datetime');
                }
              } catch (e) {
                // Not a date, return as is
              }
            }
            return String(value);
          });
        } else {
          return Object.values(row).map(value => {
            if (value === null || value === undefined) {
              return '';
            }
            if (typeof value === 'string' && (value.includes('T') || value.includes('-'))) {
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  return formatVietnamDateTime(date, 'datetime');
                }
              } catch (e) {
                // Not a date
              }
            }
            return String(value);
          });
        }
      });

      // Add table using autoTable with Vietnamese font support
      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: title ? 28 : 20,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          // Try to use Noto Sans, fallback to times
          font: (() => {
            try {
              const fontList = (doc as any).getFontList();
              return fontList && fontList['NotoSans'] ? 'NotoSans' : 'times';
            } catch {
              return 'times';
            }
          })(),
          fontStyle: 'normal',
        },
        headStyles: {
          fillColor: [249, 115, 22], // Orange color
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          // Try to use Noto Sans, fallback to times
          font: (() => {
            try {
              const fontList = (doc as any).getFontList();
              return fontList && fontList['NotoSans'] ? 'NotoSans' : 'times';
            } catch {
              return 'times';
            }
          })(),
        },
        bodyStyles: {
          // Try to use Noto Sans, fallback to times
          font: (() => {
            try {
              const fontList = (doc as any).getFontList();
              return fontList && fontList['NotoSans'] ? 'NotoSans' : 'times';
            } catch {
              return 'times';
            }
          })(),
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        margin: { top: title ? 28 : 20, left: 14, right: 14 },
        tableWidth: 'wrap',
        showHead: 'everyPage',
        theme: 'striped',
        // Ensure proper encoding for Vietnamese characters
        didParseCell: (data: any) => {
          // Ensure cell content is properly encoded as string
          if (data.cell && data.cell.text !== undefined) {
            data.cell.text = String(data.cell.text);
          }
        },
      });

      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        try {
          doc.setFont('NotoSans', 'normal');
        } catch (e) {
          doc.setFont('times', 'normal');
        }
        doc.text(
          `Trang ${i} / ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      doc.save(`${filename}_${formatVietnamDateTime(new Date(), 'date').replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Không thể xuất PDF. Vui lòng thử lại.');
    }
  },

  exportToExcel: (options: ExportOptions) => {
    const { data, columns, filename = 'export' } = options;

    // Excel-compatible CSV export with semicolon delimiter
    // Many Excel versions (especially European) use semicolon as default delimiter
    // This ensures Excel will parse columns correctly
    const delimiter = ';';

    let csvContent = '';

    // Add headers first (no title to avoid Excel parsing issues)
    if (columns && columns.length > 0) {
      // Escape headers properly - wrap in quotes if contains delimiter, quote, or newline
      const headerRow = columns
        .map(col => {
          const label = col.label || '';
          const labelStr = String(label);
          // Wrap in quotes if contains delimiter, quote, or newline
          if (
            labelStr.includes(';') ||
            labelStr.includes(',') ||
            labelStr.includes('"') ||
            labelStr.includes('\n') ||
            labelStr.includes('\r')
          ) {
            return `"${labelStr.replace(/"/g, '""')}"`;
          }
          return labelStr;
        })
        .join(delimiter);
      csvContent += headerRow + '\n';
    } else if (data.length > 0) {
      const headers = Object.keys(data[0])
        .map(key => {
          const keyStr = String(key);
          if (
            keyStr.includes(';') ||
            keyStr.includes(',') ||
            keyStr.includes('"') ||
            keyStr.includes('\n') ||
            keyStr.includes('\r')
          ) {
            return `"${keyStr.replace(/"/g, '""')}"`;
          }
          return keyStr;
        })
        .join(delimiter);
      csvContent += headers + '\n';
    }

    // Add data rows
    data.forEach(row => {
      if (columns && columns.length > 0) {
        const rowData = columns
          .map(col => {
            const value = row[col.key];
            // Handle different data types
            if (value === null || value === undefined) {
              return '';
            }
            // Convert to string
            const stringValue = String(value);
            // Wrap in quotes if contains delimiter, quote, or newline
            if (
              stringValue.includes(';') ||
              stringValue.includes(',') ||
              stringValue.includes('"') ||
              stringValue.includes('\n') ||
              stringValue.includes('\r')
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(delimiter);
        csvContent += rowData + '\n';
      } else {
        const rowData = Object.values(row)
          .map(value => {
            if (value === null || value === undefined) {
              return '';
            }
            const stringValue = String(value);
            if (
              stringValue.includes(';') ||
              stringValue.includes(',') ||
              stringValue.includes('"') ||
              stringValue.includes('\n') ||
              stringValue.includes('\r')
            ) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(delimiter);
        csvContent += rowData + '\n';
      }
    });

    // Create blob with UTF-8 BOM for Excel compatibility (especially for Vietnamese characters)
    // Use semicolon-separated values which Excel parses better
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    // Use .csv extension - Excel should parse semicolon-delimited CSV correctly
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportToCSV: (options: ExportOptions) => {
    ExportUtils.exportToExcel(options);
  },

  exportToiCal: (
    events: Array<{
      title: string;
      description?: string;
      start: Date | string;
      end: Date | string;
      location?: string;
      url?: string;
    }>,
    filename: string = 'calendar'
  ) => {
    if (!events || events.length === 0) {
      alert('Không có sự kiện để xuất');
      return;
    }

    // Helper function to format date for iCal (YYYYMMDDTHHmmssZ)
    const formatDate = (date: Date | string): string => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const minutes = String(d.getUTCMinutes()).padStart(2, '0');
      const seconds = String(d.getUTCSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    // Helper function to escape text for iCal
    const escapeText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    };

    // Generate iCal content
    let icalContent = 'BEGIN:VCALENDAR\r\n';
    icalContent += 'VERSION:2.0\r\n';
    icalContent += 'PRODID:-//Gym Management//Gym Calendar//EN\r\n';
    icalContent += 'CALSCALE:GREGORIAN\r\n';
    icalContent += 'METHOD:PUBLISH\r\n';

    events.forEach(event => {
      const start = formatDate(event.start);
      const end = formatDate(event.end);
      const title = escapeText(event.title);
      const description = event.description ? escapeText(event.description) : '';
      const location = event.location ? escapeText(event.location) : '';
      const url = event.url ? escapeText(event.url) : '';

      icalContent += 'BEGIN:VEVENT\r\n';
      icalContent += `UID:${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}@gym-management\r\n`;
      icalContent += `DTSTART:${start}\r\n`;
      icalContent += `DTEND:${end}\r\n`;
      icalContent += `DTSTAMP:${formatDate(new Date())}\r\n`;
      icalContent += `SUMMARY:${title}\r\n`;
      if (description) {
        icalContent += `DESCRIPTION:${description}\r\n`;
      }
      if (location) {
        icalContent += `LOCATION:${location}\r\n`;
      }
      if (url) {
        icalContent += `URL:${url}\r\n`;
      }
      icalContent += 'STATUS:CONFIRMED\r\n';
      icalContent += 'SEQUENCE:0\r\n';
      icalContent += 'END:VEVENT\r\n';
    });

    icalContent += 'END:VCALENDAR\r\n';

    // Create blob and download
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.ics`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

interface ExportButtonProps {
  data: any[];
  columns?: Array<{
    key: string;
    label: string;
  }>;
  filename?: string;
  title?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showiCal?: boolean;
  iCalEvents?: Array<{
    title: string;
    description?: string;
    start: Date | string;
    end: Date | string;
    location?: string;
    url?: string;
  }>;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  columns,
  filename = 'export',
  title,
  variant = 'outline',
  size = 'md',
  showiCal = false,
  iCalEvents,
}) => {
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (format === 'pdf') {
      ExportUtils.exportToPDF({
        format,
        filename,
        data,
        columns,
        title,
      });
    } else {
      ExportUtils.exportToExcel({
        format,
        filename,
        data,
        columns,
        title,
      });
    }
  };

  const handleExportiCal = () => {
    if (iCalEvents && iCalEvents.length > 0) {
      ExportUtils.exportToiCal(iCalEvents, filename);
    }
  };

  return (
    <div className='flex gap-2'>
      <AdminButton
        variant={variant}
        size={size}
        icon={FileSpreadsheet}
        onClick={() => handleExport('excel')}
      >
        Export Excel
      </AdminButton>
      <AdminButton
        variant={variant}
        size={size}
        icon={FileText}
        onClick={() => handleExport('pdf')}
      >
        Export PDF
      </AdminButton>
      {showiCal && iCalEvents && iCalEvents.length > 0 && (
        <AdminButton variant={variant} size={size} icon={Calendar} onClick={handleExportiCal}>
          Export iCal
        </AdminButton>
      )}
    </div>
  );
};

export default ExportButton;
export { ExportUtils };
