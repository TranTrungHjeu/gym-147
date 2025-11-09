import { ImageUp } from 'lucide-react';
import React, { useRef, useState } from 'react';
import {
  AIScanResult,
  UploadResult,
  certificationService,
} from '../../services/certification.service';
import { SimpleLoading } from '../ui/AppLoading/Loading';

interface CertificationUploadProps {
  trainerId: string;
  onUploadComplete: (uploadResult: UploadResult, scanResult: AIScanResult) => void;
  onUploadError: (error: string) => void;
  onFileSelect?: () => void;
}

const CertificationUpload: React.FC<CertificationUploadProps> = ({
  trainerId,
  onUploadComplete,
  onUploadError,
  onFileSelect,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File | null | undefined) => {
    // Validate file exists
    if (!file) {
      return;
    }

    // Notify parent that file is selected - clear validation errors
    if (onFileSelect) {
      onFileSelect();
    }

    // Validate file type
    if (!file.type || !file.type.startsWith('image/')) {
      onUploadError('Chỉ cho phép file hình ảnh');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      onUploadError('File quá lớn. Kích thước tối đa là 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Upload file only (without AI scan)
      const uploadResult = await certificationService.uploadFileOnly(trainerId, file);

      // Start AI scanning phase
      setIsUploading(false);
      setIsScanning(true);

      // Start actual AI scan
      try {
        const aiScanResult = await certificationService.scanCertificateWithAI(
          uploadResult.publicUrl || uploadResult.url
        );

        // Ensure scan result is valid before proceeding
        if (!aiScanResult) {
          setIsScanning(false);
          onUploadError('Không thể phân tích chứng chỉ. Vui lòng thử lại.');
          return;
        }

        // Scan completed successfully - call callback immediately
        setIsScanning(false);
        onUploadComplete(uploadResult, aiScanResult);
      } catch (scanError: any) {
        setIsScanning(false);
        onUploadError(`Lỗi khi quét AI: ${scanError.message}`);
      }
    } catch (error: any) {
      setIsUploading(false);
      setIsScanning(false);
      onUploadError(error.message || 'Lỗi khi upload file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      const selectedFile = files[0];
      // Clear file input value to allow selecting the same file again
      e.target.value = '';
      handleFileSelect(selectedFile);
    }
  };

  return (
    <section className='flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm transition-colors w-full min-w-full'>
      {/* Upload Area */}
      <div
        className={`relative overflow-hidden rounded-xl border border-dashed p-6 text-center transition-all duration-300 min-h-[200px] w-full min-w-full flex items-center justify-center ${
          dragActive
            ? 'border-orange-400 bg-orange-50/70 dark:bg-orange-900/20 shadow-[0_0_0_4px_rgba(249,115,22,0.15)]'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
        } ${isUploading || isScanning ? 'pointer-events-none opacity-60' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleFileInputChange}
          className='hidden'
        />

        {isUploading || isScanning ? (
          <div className='flex flex-col items-center justify-center gap-4 w-full'>
            <div
              className='w-full flex items-center justify-center'
              style={{ textAlign: 'center' }}
            >
              <SimpleLoading
                size='small'
                text={isUploading ? 'Đang tải chứng chỉ...' : 'Đang phân tích...'}
                color='#ea580c'
                textColor='#374151'
                className='dark:text-gray-300 mx-auto'
              />
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center gap-3 text-gray-600 dark:text-gray-400'>
            <span className='flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'>
              <ImageUp className='h-6 w-6' />
            </span>
            <div className='space-y-1'>
              <p className='text-sm font-semibold text-gray-900 dark:text-white font-heading'>
                Tải chứng chỉ huấn luyện viên
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400 font-inter'>
                Kéo thả file hình ảnh hoặc&nbsp;
                <button
                  type='button'
                  onClick={() => {
                    // Clear errors immediately when user clicks to open file picker
                    if (onFileSelect) {
                      onFileSelect();
                    }
                    // Then open file picker
                    fileInputRef.current?.click();
                  }}
                  className='font-medium text-orange-600 dark:text-orange-400 underline-offset-4 transition-all duration-300 ease-in-out hover:text-orange-700 dark:hover:text-orange-300 hover:underline hover:underline-offset-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-transparent focus:rounded-sm focus:px-1 focus:-mx-1 active:text-orange-800 dark:active:text-orange-200 active:scale-[0.98] active:underline active:underline-offset-2 bg-transparent border-0 p-0 m-0'
                >
                  duyệt file từ thiết bị
                </button>
              </p>
            </div>
            <p className='rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 font-inter'>
              Hỗ trợ JPG, PNG, GIF – tối đa 10MB
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CertificationUpload;
