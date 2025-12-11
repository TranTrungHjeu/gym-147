import React, { useEffect, useState } from 'react';
import { X, Download, QrCode, Clock, RefreshCw } from 'lucide-react';
import { scheduleService } from '../../services/schedule.service';

interface ScheduleQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleId: string;
  scheduleName: string;
  type: 'check-in' | 'check-out';
  trainerId: string;
}

const ScheduleQRCodeModal: React.FC<ScheduleQRCodeModalProps> = ({
  isOpen,
  onClose,
  scheduleId,
  scheduleName,
  type,
  trainerId,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');
  const [qrData, setQrData] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQRCode = async () => {
    if (!scheduleId || !trainerId) {
      setError('Schedule ID and Trainer ID are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await scheduleService.generateScheduleQRCode(
        scheduleId,
        type,
        trainerId
      );

      if (response.success && response.data) {
        setQrCodeDataUrl(response.data.qr_code_data_url);
        setQrCodeSvg(response.data.qr_code_svg);
        setQrData(response.data.qr_data);
        setExpiresAt(response.data.expires_at);
      } else {
        setError('Failed to generate QR code');
      }
    } catch (err: any) {
      console.error('Error generating QR code:', err);
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && scheduleId && trainerId) {
      generateQRCode();
    }
  }, [isOpen, scheduleId, type, trainerId]);

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qr-code-${type}-${scheduleId}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSVG = () => {
    if (!qrCodeSvg) return;

    const blob = new Blob([qrCodeSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-code-${type}-${scheduleId}-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const formatExpiresAt = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className='fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto'
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className='fixed inset-0 h-full w-full bg-black/50 backdrop-blur-sm'
        aria-hidden='true'
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className='relative z-[99999] w-full max-w-md mx-4 my-8 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden'
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='qr-modal-title'
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className='absolute top-3 right-3 z-50 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200'
        >
          <X className='w-4 h-4' />
        </button>

        {/* Modal Body */}
        <div className='p-6'>
          {/* Title */}
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center'>
              <QrCode className='w-5 h-5 text-orange-600 dark:text-orange-400' />
            </div>
            <div>
              <h2
                id='qr-modal-title'
                className='text-xl font-bold text-gray-900 dark:text-white'
              >
                QR Code {type === 'check-in' ? 'Check-in' : 'Check-out'}
              </h2>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {scheduleName}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className='flex flex-col items-center justify-center py-12'>
              <RefreshCw className='w-8 h-8 text-orange-600 dark:text-orange-400 animate-spin mb-3' />
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Đang tạo QR code...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4'>
              <p className='text-sm text-red-800 dark:text-red-400'>{error}</p>
              <button
                onClick={generateQRCode}
                className='mt-2 text-sm text-red-600 dark:text-red-400 hover:underline'
              >
                Thử lại
              </button>
            </div>
          )}

          {/* QR Code Display */}
          {!loading && !error && qrCodeDataUrl && (
            <>
              <div className='flex flex-col items-center mb-4'>
                <div className='bg-white p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md mb-4'>
                  <img
                    src={qrCodeDataUrl}
                    alt='QR Code'
                    className='w-64 h-64'
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Expiry Info */}
                {expiresAt && (
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4'>
                    <Clock className='w-4 h-4' />
                    <span>Hết hạn: {formatExpiresAt(expiresAt)}</span>
                  </div>
                )}

                {/* Instructions */}
                <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 w-full mb-4'>
                  <p className='text-sm text-gray-700 dark:text-gray-300 text-center'>
                    Học viên quét QR code này để {type === 'check-in' ? 'điểm danh' : 'check-out'} vào lớp học
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className='flex gap-2'>
                <button
                  onClick={handleDownload}
                  className='flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors text-sm'
                >
                  <Download className='w-4 h-4' />
                  Tải PNG
                </button>
                <button
                  onClick={handleDownloadSVG}
                  className='flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm'
                >
                  <Download className='w-4 h-4' />
                  Tải SVG
                </button>
                <button
                  onClick={generateQRCode}
                  className='flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm'
                >
                  <RefreshCw className='w-4 h-4' />
                </button>
              </div>
            </>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className='w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleQRCodeModal;

