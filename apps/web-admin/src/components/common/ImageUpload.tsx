import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import useTranslation from '../../hooks/useTranslation';
import AdminButton from '../common/AdminButton';
import { identityApi } from '@/services/api';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onError?: (error: string) => void;
  maxSize?: number; // in MB
  accept?: string;
  label?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onError,
  maxSize = 5,
  accept = 'image/*',
  label,
  className = '',
}) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError?.(t('imageUpload.errors.mustBeImage'));
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      onError?.(t('imageUpload.errors.maxSize', { maxSize }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to S3 or server
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await identityApi.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success && response.data?.data?.url) {
        onChange(response.data.data.url);
      } else {
        throw new Error(response.data?.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      onError?.(error.message || t('imageUpload.errors.uploadFailed'));
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      {label && (
        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-inter'>
          {label}
        </label>
      )}

      <div className='flex items-center gap-4'>
        {preview ? (
          <div className='relative'>
            <img
              src={preview}
              alt='Preview'
              className='w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-700'
            />
            <button
              type='button'
              onClick={handleRemove}
              className='absolute -top-2 -right-2 p-1 bg-error-600 text-white rounded-full hover:bg-error-700 transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        ) : (
          <div
            onClick={handleClick}
            className='w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-colors bg-gray-50 dark:bg-gray-900'
          >
            <ImageIcon className='w-8 h-8 text-gray-400 dark:text-gray-500' />
          </div>
        )}

        <div className='flex-1'>
          <input
            ref={fileInputRef}
            type='file'
            accept={accept}
            onChange={handleFileSelect}
            className='hidden'
          />
          <AdminButton
            variant='outline'
            onClick={handleClick}
            isLoading={isUploading}
            icon={Upload}
            disabled={isUploading}
          >
            {preview ? t('imageUpload.change') : t('imageUpload.upload')}
          </AdminButton>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 font-inter'>
            {t('imageUpload.maxSize', { maxSize, formats: 'JPG, PNG, GIF' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;

