import { ImageUp, X, CheckCircle2 } from 'lucide-react';
import React, { useRef, useState } from 'react';
import {
  UploadResult,
  certificationService,
} from '../../services/certification.service';
import { SimpleLoading } from '../ui/AppLoading/Loading';

interface ManualCertificationUploadProps {
  trainerId: string;
  onUploadComplete: (uploadResult: UploadResult) => void;
  onUploadError: (error: string) => void;
  onFileSelect?: () => void;
}

const ManualCertificationUpload: React.FC<ManualCertificationUploadProps> = ({
  trainerId,
  onUploadComplete,
  onUploadError,
  onFileSelect,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
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
      // Upload file only (no AI scan for manual entry)
      const uploadResult = await certificationService.uploadFileOnly(trainerId, file);
      
      // Validate upload result
      if (!uploadResult || (!uploadResult.url && !uploadResult.publicUrl)) {
        throw new Error('Upload thành công nhưng không nhận được URL file');
      }
      
      // Set uploaded image URL for preview
      const imageUrl = uploadResult.publicUrl || uploadResult.url;
      setUploadedImageUrl(imageUrl);
      
      setIsUploading(false);
      onUploadComplete(uploadResult);
    } catch (error: any) {
      setIsUploading(false);
      setUploadedImageUrl(null);
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi upload file';
      onUploadError(errorMessage);
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

  const handleRemoveImage = () => {
    setUploadedImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
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

        {isUploading ? (
          <div className='flex flex-col items-center justify-center gap-4 w-full'>
            <div
              className='w-full flex items-center justify-center'
              style={{ textAlign: 'center' }}
            >
              <SimpleLoading
                size='small'
                text='Đang tải chứng chỉ...'
                color='#ea580c'
                textColor='#374151'
                className='dark:text-gray-300 mx-auto'
              />
            </div>
          </div>
        ) : uploadedImageUrl ? (
          <div className='flex flex-col items-center gap-4 w-full'>
            <div className='relative w-full max-w-md'>
              <img
                src={uploadedImageUrl}
                alt='Uploaded certificate'
                className='w-full h-auto max-h-[400px] object-contain rounded-lg border-2 border-green-200 dark:border-green-800 shadow-lg'
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <button
                type='button'
                onClick={handleRemoveImage}
                className='absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors z-10'
                title='Xóa ảnh'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <div className='flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
              <CheckCircle2 className='w-5 h-5 text-green-600 dark:text-green-400' />
              <p className='text-sm font-semibold text-green-800 dark:text-green-300 font-heading'>
                Đã tải lên thành công
              </p>
            </div>
            <button
              type='button'
              onClick={() => {
                if (onFileSelect) {
                  onFileSelect();
                }
                fileInputRef.current?.click();
              }}
              className='text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium underline underline-offset-2 transition-colors'
            >
              Tải ảnh khác
            </button>
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

export default ManualCertificationUpload;

