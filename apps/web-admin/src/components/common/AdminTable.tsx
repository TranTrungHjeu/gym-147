import React from 'react';

interface AdminTableProps {
  children: React.ReactNode;
  className?: string;
}

interface AdminTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface AdminTableRowProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  'data-certification-id'?: string;
  'data-user-id'?: string;
  'data-trainer-id'?: string;
}

interface AdminTableCellProps {
  children: React.ReactNode;
  className?: string;
  header?: boolean;
}

const AdminTable: React.FC<AdminTableProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg shadow-theme-md overflow-hidden border border-gray-200 dark:border-gray-800 ${className}`}
    >
      <div className='overflow-x-auto md:overflow-x-hidden'>
        <table className='w-full divide-y divide-gray-200 dark:divide-gray-800 table-auto min-w-[1200px] md:min-w-0'>
          {children}
        </table>
      </div>
    </div>
  );
};

const AdminTableHeader: React.FC<AdminTableHeaderProps> = ({ children, className = '' }) => {
  return <thead className={`bg-gray-50 dark:bg-gray-800 ${className}`}>{children}</thead>;
};

const AdminTableRow: React.FC<AdminTableRowProps> = ({
  children,
  className = '',
  hover = true,
  onClick,
  'data-certification-id': dataCertificationId,
  'data-user-id': dataUserId,
  'data-trainer-id': dataTrainerId,
}) => {
  // Check if className already has hover effects
  const hasCustomHover = className.includes('hover:');

  return (
    <tr
      className={`${hover && !hasCustomHover ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''} ${
        onClick ? 'cursor-pointer' : ''
      } transition-colors duration-150 ${className}`}
      onClick={onClick as any}
      data-certification-id={dataCertificationId}
      data-user-id={dataUserId}
      data-trainer-id={dataTrainerId}
    >
      {children}
    </tr>
  );
};

const AdminTableCell: React.FC<AdminTableCellProps> = ({
  children,
  className = '',
  header = false,
}) => {
  if (header) {
    // Extract alignment from className if present
    const alignClass = className.includes('text-right')
      ? 'text-right'
      : className.includes('text-center')
      ? 'text-center'
      : 'text-left';

    // Use align-middle by default, but allow override via className
    const verticalAlign = className.includes('align-top')
      ? 'align-top'
      : className.includes('align-bottom')
      ? 'align-bottom'
      : 'align-middle';

    return (
      <th
        className={`px-2 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 ${alignClass} ${verticalAlign} text-theme-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-heading whitespace-nowrap ${className}`}
      >
        {children}
      </th>
    );
  }

  // Extract alignment from className if present
  const alignClass = className.includes('text-right')
    ? 'text-right'
    : className.includes('text-center')
    ? 'text-center'
    : 'text-left';

  // Use align-middle by default, but allow override via className
  const verticalAlign = className.includes('align-top')
    ? 'align-top'
    : className.includes('align-bottom')
    ? 'align-bottom'
    : 'align-middle';

  return (
    <td
      className={`px-2 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 ${alignClass} ${verticalAlign} text-theme-xs text-gray-900 dark:text-gray-300 font-inter ${className}`}
    >
      {children}
    </td>
  );
};

const AdminTableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <tbody
      className={`bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800 ${className}`}
    >
      {children}
    </tbody>
  );
};

export { AdminTable, AdminTableBody, AdminTableCell, AdminTableHeader, AdminTableRow };
