import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ImageUp, Loader2, XCircle } from 'lucide-react';
import { AIScanResult, UploadResult, certificationService } from '../../services/certification.service';

interface CertificationUploadProps {
  trainerId: string;
  onUploadComplete: (uploadResult: UploadResult, scanResult: AIScanResult) => void;
  onUploadError: (error: string) => void;
}

const CertificationUpload: React.FC<CertificationUploadProps> = ({
  trainerId,
  onUploadComplete,
  onUploadError,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onUploadError('Chỉ cho phép file hình ảnh');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      onUploadError('File quá lớn. Kích thước tối đa là 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setScanProgress(0);

    try {
      // Simulate upload progress
      const uploadProgressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadProgressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file only (without AI scan)
      const uploadResult = await certificationService.uploadFileOnly(trainerId, file);

      clearInterval(uploadProgressInterval);
      setUploadProgress(100);
      setUploadResult(uploadResult);

      // Start AI scanning phase
      setIsUploading(false);
      setIsScanning(true);
      setScanProgress(0);

      // Simulate AI scan progress over 30 seconds
      const scanProgressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 95) {
            clearInterval(scanProgressInterval);
            return 95;
          }
          return prev + 3; // 30 seconds / 100% = 3% per second
        });
      }, 1000);

      // Start actual AI scan
      try {
        const aiScanResult = await certificationService.scanCertificateWithAI(
          uploadResult.publicUrl || uploadResult.url
        );
        setScanResult(aiScanResult);
        clearInterval(scanProgressInterval);
        setScanProgress(100);

        // Wait a bit to show 100% progress
        setTimeout(() => {
          setIsScanning(false);
          onUploadComplete(uploadResult, aiScanResult);
        }, 500);
      } catch (scanError: any) {
        clearInterval(scanProgressInterval);
        setIsScanning(false);
        onUploadError(`Lỗi khi quét AI: ${scanError.message}`);
      }
    } catch (error: any) {
      setIsUploading(false);
      setIsScanning(false);
      setUploadProgress(0);
      setScanProgress(0);
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
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const getScanResultBadge = () => {
    if (!scanResult) return null;

    if (scanResult.isGym147Seal && scanResult.confidence > 0.7) {
      return {
        icon: <CheckCircle2 className='h-5 w-5 text-success-500' />,
        tone: 'bg-success-50 text-success-600 border-success-200',
        label: 'Con dấu Gym147 đã xác thực',
      };
    }

    if (scanResult.isGym147Seal && scanResult.confidence > 0.4) {
      return {
        icon: <AlertCircle className='h-5 w-5 text-warning-500' />,
        tone: 'bg-warning-50 text-warning-700 border-warning-200',
        label: 'Cần kiểm tra lại con dấu Gym147',
      };
    }

    if (scanResult.hasRedSeal && scanResult.confidence > 0.4) {
      return {
        icon: <AlertCircle className='h-5 w-5 text-amber-500' />,
        tone: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Phát hiện con dấu khác màu đỏ',
      };
    }

    return {
      icon: <XCircle className='h-5 w-5 text-danger-500' />,
      tone: 'bg-danger-50 text-danger-600 border-danger-200',
      label: 'Không nhận diện được con dấu hợp lệ',
    };
  };

  const scanBadge = getScanResultBadge();

  return (
    <section className='flex flex-col gap-6 rounded-xl border border-neutral-200 bg-surface-0 p-6 shadow-sm transition-colors lg:p-7'>
      {/* Upload Area */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-dashed p-8 text-center transition-all duration-300 ${
          dragActive
            ? 'border-primary-400 bg-primary-50/70 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]'
            : 'border-neutral-300 bg-surface-0 hover:border-neutral-400 hover:bg-neutral-50'
        } ${
          isUploading || isScanning ? 'pointer-events-none opacity-60 backdrop-grayscale' : ''
        }`}
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
          <div className='space-y-6'>
            <Loader2 className='mx-auto h-14 w-14 animate-spin text-primary-500' />
            <div className='space-y-3'>
              <p className='text-lg font-semibold text-neutral-900'>Đang tải chứng chỉ</p>
              <p className='text-sm text-neutral-500'>Vui lòng giữ vững kết nối trong khi hệ thống ghi nhận tài liệu của bạn.</p>
              <div className='h-2 w-full overflow-hidden rounded-full bg-neutral-200'>
                <div
                  className='h-full rounded-full bg-primary-500 transition-all duration-300 ease-out'
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className='text-sm font-medium text-neutral-600'>{uploadProgress}%</p>
            </div>
          </div>
        ) : isScanning ? (
          <div className='space-y-6'>
            <Loader2 className='mx-auto h-14 w-14 animate-spin text-secondary-500' />
            <div className='space-y-3'>
              <p className='text-lg font-semibold text-neutral-900'>Đang phân tích chứng chỉ bằng AI</p>
              <p className='text-sm text-neutral-500'>Hệ thống đang kiểm tra dấu xác thực và nội dung chứng chỉ để đảm bảo tính hợp lệ.</p>
              <div className='h-2 w-full overflow-hidden rounded-full bg-neutral-200'>
                <div
                  className='h-full rounded-full bg-secondary-500 transition-all duration-1000 ease-linear'
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className='flex items-center justify-between text-xs text-neutral-500'>
                <span>{scanProgress.toFixed(0)}%</span>
                <span>Ước tính còn {Math.max(0, Math.ceil((100 - scanProgress) / 3))} giây</span>
              </div>
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center gap-4 text-neutral-600'>
            <span className='flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400'>
              <ImageUp className='h-7 w-7' />
            </span>
            <div className='space-y-2'>
              <p className='text-xl font-semibold text-neutral-900'>Tải chứng chỉ huấn luyện viên</p>
              <p className='text-sm text-neutral-500'>Kéo thả file hình ảnh hoặc&nbsp;
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className='font-medium text-primary-500 underline-offset-4 transition-colors hover:text-primary-400 hover:underline'
                >
                  duyệt file từ thiết bị
                </button>
              </p>
            </div>
            <p className='rounded-full bg-neutral-100 px-4 py-1 text-xs font-medium text-neutral-500'>Hỗ trợ JPG, PNG, GIF – tối đa 10MB</p>
          </div>
        )}
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className='flex flex-col gap-2 rounded-xl border border-success-200 bg-success-50/60 p-4 text-success-700'>
          <div className='flex items-center gap-2'>
            <CheckCircle2 className='h-5 w-5' />
            <span className='font-semibold'>Tài liệu đã được tải lên</span>
          </div>
          <div className='text-sm'>
            <span className='font-medium'>Tên file:</span>&nbsp;
            <span>{uploadResult.originalName}</span>
            <span className='pl-1 text-xs text-success-600'>
              ({uploadResult.size ? Math.round(uploadResult.size / 1024) : 0} KB)
            </span>
          </div>
        </div>
      )}

      {/* AI Scan Result */}
      {scanResult && (
        <div className='flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-surface-0 p-6 shadow-sm'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h3 className='text-lg font-semibold text-neutral-900'>Kết quả xác thực AI</h3>
              <p className='text-sm text-neutral-500'>Thông tin dưới đây giúp bạn đánh giá trạng thái chứng chỉ trước khi phê duyệt.</p>
            </div>
            {scanBadge && (
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${scanBadge.tone}`}>
                {scanBadge.icon}
                {scanBadge.label}
              </span>
            )}
          </div>

          <dl className='grid gap-3 text-sm text-neutral-600 sm:grid-cols-2'>
            <div className='rounded-lg bg-neutral-50 p-3'>
              <dt className='text-xs uppercase tracking-wide text-neutral-500'>Độ tin cậy</dt>
              <dd className='text-base font-semibold text-neutral-900'>{(scanResult.confidence * 100).toFixed(1)}%</dd>
            </div>
            <div className='rounded-lg bg-neutral-50 p-3'>
              <dt className='text-xs uppercase tracking-wide text-neutral-500'>Con dấu Gym147</dt>
              <dd className={`text-base font-semibold ${scanResult.isGym147Seal ? 'text-success-600' : 'text-danger-600'}`}>
                {scanResult.isGym147Seal ? 'Có xác nhận' : 'Không tìm thấy'}
              </dd>
            </div>
            {scanResult.similarityScore !== undefined && (
              <div className='rounded-lg bg-neutral-50 p-3'>
                <dt className='text-xs uppercase tracking-wide text-neutral-500'>Độ tương đồng</dt>
                <dd className='text-base font-semibold text-neutral-900'>
                  {(scanResult.similarityScore * 100).toFixed(1)}%
                </dd>
              </div>
            )}
            <div className='rounded-lg bg-neutral-50 p-3'>
              <dt className='text-xs uppercase tracking-wide text-neutral-500'>Vị trí con dấu</dt>
              <dd className='text-base font-semibold text-neutral-900'>
                {scanResult.sealLocation || 'Chưa xác định'}
              </dd>
            </div>
            <div className='rounded-lg bg-neutral-50 p-3'>
              <dt className='text-xs uppercase tracking-wide text-neutral-500'>Loại con dấu</dt>
              <dd className='text-base font-semibold text-neutral-900'>
                {scanResult.sealType || 'Chưa xác định'}
              </dd>
            </div>
            <div className='rounded-lg bg-neutral-50 p-3'>
              <dt className='text-xs uppercase tracking-wide text-neutral-500'>Nguồn phân tích</dt>
              <dd className='text-base font-semibold text-neutral-900'>{scanResult.source || 'AI Vision'}</dd>
            </div>
          </dl>

          {scanResult.description && (
            <div className='rounded-xl border border-neutral-200 bg-neutral-50/60 p-4'>
              <h4 className='mb-2 text-sm font-semibold text-neutral-800'>Nhận định của AI</h4>
              <p className='text-sm leading-relaxed text-neutral-600'>{scanResult.description}</p>
            </div>
          )}

          {scanResult.sealAnalysis && (
            <div className='rounded-xl border border-neutral-200 bg-neutral-50/60 p-4'>
              <h4 className='mb-2 text-sm font-semibold text-neutral-800'>Phân tích hình học con dấu</h4>
              <div className='grid gap-3 text-xs text-neutral-600 sm:grid-cols-2'>
                <div className='flex items-center justify-between rounded-lg bg-white p-2 shadow-sm'>
                  <span>Dạng con dấu</span>
                  <span className='font-medium text-neutral-900'>
                    {scanResult.sealAnalysis.isSealLike ? 'Hình tròn/oval' : 'Không chuẩn'}
                  </span>
                </div>
                <div className='flex items-center justify-between rounded-lg bg-white p-2 shadow-sm'>
                  <span>Độ compact</span>
                  <span className='font-medium text-neutral-900'>
                    {(scanResult.sealAnalysis.compactness * 100).toFixed(1)}%
                  </span>
                </div>
                <div className='flex items-center justify-between rounded-lg bg-white p-2 shadow-sm'>
                  <span>Bán kính trung bình</span>
                  <span className='font-medium text-neutral-900'>
                    {scanResult.sealAnalysis.radius.toFixed(1)} px
                  </span>
                </div>
                <div className='flex items-center justify-between rounded-lg bg-white p-2 shadow-sm'>
                  <span>Tọa độ tâm</span>
                  <span className='font-medium text-neutral-900'>
                    ({scanResult.sealAnalysis.centerX.toFixed(0)}, {scanResult.sealAnalysis.centerY.toFixed(0)})
                  </span>
                </div>
              </div>
            </div>
          )}

          {scanResult.error && (
            <div className='rounded-xl border border-danger-200 bg-danger-50/80 p-4 text-sm text-danger-600'>
              <span className='font-semibold'>Lưu ý:</span>&nbsp;
              {scanResult.error}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default CertificationUpload;
