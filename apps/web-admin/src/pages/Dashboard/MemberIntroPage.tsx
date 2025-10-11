import React, { useState } from 'react';

const MemberIntroPage: React.FC = () => {
  const [showQR, setShowQR] = useState(false);

  const handleDownloadApp = () => {
    setShowQR(true);
  };

  const handleCloseQR = () => {
    setShowQR(false);
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-white mb-4'>
            <span className='bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'>
              CHÀO MỪNG ĐẾN VỚI GYM 147
            </span>
          </h1>
          <p className='text-gray-300 text-lg'>
            Trải nghiệm tập luyện thông minh với ứng dụng di động
          </p>
        </div>

        {/* Main Content */}
        <div className='max-w-4xl mx-auto'>
          {/* Features Grid */}
          <div className='grid md:grid-cols-2 gap-8 mb-12'>
            {/* App Features */}
            <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20'>
              <h2 className='text-2xl font-bold text-white mb-6 text-center'>Tính năng ứng dụng</h2>
              <div className='space-y-4'>
                <div className='flex items-start space-x-3'>
                  <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1'>
                    <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className='text-white font-semibold'>Đặt lịch tập</h3>
                    <p className='text-gray-300 text-sm'>
                      Đặt lịch tập với huấn luyện viên dễ dàng
                    </p>
                  </div>
                </div>
                <div className='flex items-start space-x-3'>
                  <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1'>
                    <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className='text-white font-semibold'>Theo dõi tiến độ</h3>
                    <p className='text-gray-300 text-sm'>
                      Ghi nhận và theo dõi quá trình tập luyện
                    </p>
                  </div>
                </div>
                <div className='flex items-start space-x-3'>
                  <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1'>
                    <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className='text-white font-semibold'>Thanh toán online</h3>
                    <p className='text-gray-300 text-sm'>
                      Thanh toán gói tập và dịch vụ nhanh chóng
                    </p>
                  </div>
                </div>
                <div className='flex items-start space-x-3'>
                  <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1'>
                    <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className='text-white font-semibold'>Cộng đồng</h3>
                    <p className='text-gray-300 text-sm'>Kết nối với các thành viên khác</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Download Section */}
            <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center'>
              <h2 className='text-2xl font-bold text-white mb-6'>Tải ứng dụng ngay</h2>
              <p className='text-gray-300 mb-8'>Quét mã QR để tải ứng dụng Gym 147 về điện thoại</p>

              <button
                onClick={handleDownloadApp}
                className='bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 mb-6'
              >
                <div className='flex items-center justify-center space-x-2'>
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 18l9-5-9-5-9 5 9 5z'
                    />
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 18l0-10'
                    />
                  </svg>
                  <span>Tải ứng dụng</span>
                </div>
              </button>

              <div className='text-sm text-gray-400'>Hỗ trợ iOS và Android</div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8'>
            <h2 className='text-2xl font-bold text-white mb-6 text-center'>
              Tại sao chọn Gym 147?
            </h2>
            <div className='grid md:grid-cols-3 gap-6'>
              <div className='text-center'>
                <div className='w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-8 h-8 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 10V3L4 14h7v7l9-11h-7z'
                    />
                  </svg>
                </div>
                <h3 className='text-white font-semibold mb-2'>Công nghệ hiện đại</h3>
                <p className='text-gray-300 text-sm'>Hệ thống quản lý thông minh với AI</p>
              </div>
              <div className='text-center'>
                <div className='w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-8 h-8 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                    />
                  </svg>
                </div>
                <h3 className='text-white font-semibold mb-2'>Huấn luyện viên chuyên nghiệp</h3>
                <p className='text-gray-300 text-sm'>Đội ngũ trainer giàu kinh nghiệm</p>
              </div>
              <div className='text-center'>
                <div className='w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-8 h-8 text-white'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <h3 className='text-white font-semibold mb-2'>Cam kết chất lượng</h3>
                <p className='text-gray-300 text-sm'>Đảm bảo hiệu quả tập luyện tối ưu</p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQR && (
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
            <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md w-full'>
              <div className='text-center'>
                <h3 className='text-2xl font-bold text-white mb-4'>Quét mã QR để tải ứng dụng</h3>

                {/* QR Code Placeholder */}
                <div className='bg-white p-6 rounded-xl mb-6 mx-auto w-64 h-64 flex items-center justify-center'>
                  <div className='text-center'>
                    <div className='w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4'>
                      <div className='text-gray-500 text-sm'>QR Code sẽ được tạo tự động</div>
                    </div>
                    <p className='text-gray-600 text-xs'>Gym 147 Mobile App</p>
                  </div>
                </div>

                <div className='space-y-3 mb-6'>
                  <div className='flex items-center justify-center space-x-2 text-white'>
                    <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z'
                        clipRule='evenodd'
                      />
                    </svg>
                    <span className='text-sm'>iOS App Store</span>
                  </div>
                  <div className='flex items-center justify-center space-x-2 text-white'>
                    <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z'
                        clipRule='evenodd'
                      />
                    </svg>
                    <span className='text-sm'>Google Play Store</span>
                  </div>
                </div>

                <button
                  onClick={handleCloseQR}
                  className='bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200'
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberIntroPage;
