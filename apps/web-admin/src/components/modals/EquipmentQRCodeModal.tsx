import React, { useState, useEffect } from 'react';
import { X, Download, QrCode, Loader2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { equipmentService } from '../../services/equipment.service';

interface EquipmentQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentId: string;
  equipmentName?: string;
}

const EquipmentQRCodeModal: React.FC<EquipmentQRCodeModalProps> = ({
  isOpen,
  onClose,
  equipmentId,
  equipmentName,
}) => {
  const { t } = useTranslation();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [sensorId, setSensorId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && equipmentId) {
      loadQRCode();
    } else {
      // Reset state when modal closes
      setQrCodeDataUrl('');
      setSensorId('');
      setError(null);
    }
  }, [isOpen, equipmentId]);

  const loadQRCode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await equipmentService.generateQRCode(equipmentId);
      if (response.success && response.data) {
        setQrCodeDataUrl(response.data.qr_code_data_url);
        setSensorId(response.data.sensor_id);
      } else {
        setError(response.message || t('equipmentManagement.qrCode.error'));
      }
    } catch (err: any) {
      console.error('Error loading QR code:', err);
      setError(err.message || t('equipmentManagement.qrCode.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `equipment-qr-${equipmentName || equipmentId}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

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
        aria-labelledby='equipment-qr-modal-title'
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
          {/* Header */}
          <div className='text-center mb-4'>
            <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 mb-3'>
              <QrCode className='w-6 h-6 text-orange-600 dark:text-orange-400' />
            </div>
            <h2
              id='equipment-qr-modal-title'
              className='text-xl font-bold text-gray-900 dark:text-white mb-1'
            >
              {t('equipmentManagement.qrCode.title')}
            </h2>
            {equipmentName && (
              <p className='text-sm text-gray-600 dark:text-gray-400'>{equipmentName}</p>
            )}
          </div>

          {/* QR Code Display */}
          <div className='flex flex-col items-center mb-4'>
            {isLoading ? (
              <div className='w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-200 dark:border-gray-700'>
                <div className='text-center'>
                  <Loader2 className='w-8 h-8 text-orange-500 dark:text-orange-400 animate-spin mx-auto mb-2' />
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {t('equipmentManagement.qrCode.loading')}
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className='w-64 h-64 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center border-2 border-red-200 dark:border-red-800'>
                <div className='text-center p-4'>
                  <p className='text-sm font-semibold text-red-700 dark:text-red-300 mb-2'>
                    {t('equipmentManagement.qrCode.error')}
                  </p>
                  <p className='text-xs text-red-600 dark:text-red-400'>{error}</p>
                </div>
              </div>
            ) : qrCodeDataUrl ? (
              <div className='bg-white p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md'>
                <img
                  src={qrCodeDataUrl}
                  alt='Equipment QR Code'
                  className='w-64 h-64'
                  onError={e => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* Sensor ID Info */}
          {sensorId && (
            <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4'>
              <p className='text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1'>
                {t('equipmentManagement.qrCode.sensorId')}
              </p>
              <p className='text-sm font-mono text-gray-900 dark:text-white break-all'>
                {sensorId}
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4'>
            <p className='text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1'>
              {t('equipmentManagement.qrCode.instructions.title')}
            </p>
            <p className='text-xs text-blue-700 dark:text-blue-400'>
              {t('equipmentManagement.qrCode.instructions.description')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-2'>
            {qrCodeDataUrl && (
              <button
                onClick={handleDownload}
                className='flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
              >
                <Download className='w-4 h-4' />
                {t('equipmentManagement.qrCode.download')}
              </button>
            )}
            <button
              onClick={onClose}
              className='flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md'
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentQRCodeModal;
