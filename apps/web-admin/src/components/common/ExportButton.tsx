import React from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
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
    // TODO: Implement PDF export using jsPDF or similar
    // For now, just show a message
    console.log('PDF export not implemented yet', options);
    alert('Tính năng export PDF đang được phát triển');
  },

  exportToExcel: (options: ExportOptions) => {
    const { data, columns, filename = 'export', title } = options;

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
          if (labelStr.includes(';') || labelStr.includes(',') || labelStr.includes('"') || labelStr.includes('\n') || labelStr.includes('\r')) {
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
          if (keyStr.includes(';') || keyStr.includes(',') || keyStr.includes('"') || keyStr.includes('\n') || keyStr.includes('\r')) {
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
            if (stringValue.includes(';') || stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
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
            if (stringValue.includes(';') || stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
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
      type: 'text/csv;charset=utf-8;' 
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
  size?: 'sm' | 'md' | 'lg';
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  columns,
  filename = 'export',
  title,
  variant = 'outline',
  size = 'md',
}) => {
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    ExportUtils.exportToExcel({
      format,
      filename,
      data,
      columns,
      title,
    });
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
    </div>
  );
};

export default ExportButton;
export { ExportUtils };

