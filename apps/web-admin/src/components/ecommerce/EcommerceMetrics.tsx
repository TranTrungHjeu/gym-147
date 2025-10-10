export default function EcommerceMetrics() {
  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
      {/* Active Members */}
      <div className='group relative overflow-hidden rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-sm p-6 dark:border-gray-700 dark:bg-gray-800/95 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]'>
        <div className='absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-500/10 dark:to-transparent'></div>
        <div className='relative'>
          <div className='flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300'>
            <svg className='text-white size-7' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z' />
            </svg>
          </div>

          <div className='mt-6'>
            <span className='text-sm font-medium text-gray-600 dark:text-gray-300 font-inter block mb-3'>
              Active Members
            </span>
            <h4 className='text-2xl font-bold text-gray-900 dark:text-white font-space-grotesk mb-4'>
              1,247
            </h4>
            <div className='flex justify-center'>
              <div className='group/percentage relative'>
                <div className='flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 dark:bg-green-500/20 cursor-pointer hover:bg-green-200 dark:hover:bg-green-500/30 hover:scale-105 hover:shadow-md transition-all duration-300 ease-out'>
                  <svg
                    className='text-green-600 size-3.5 dark:text-green-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-xs font-bold text-green-700 dark:text-green-400 font-inter'>
                    +12.5%
                  </span>
                </div>
                {/* Tooltip */}
                <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-2.5 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 dark:from-slate-600 dark:via-slate-500 dark:to-slate-600 text-white text-xs rounded-2xl shadow-2xl opacity-0 group-hover/percentage:opacity-100 group-hover/percentage:translate-y-0 translate-y-2 transition-all duration-500 ease-out pointer-events-none whitespace-nowrap z-30 backdrop-blur-sm border border-white/10'>
                  <div className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse'></div>
                    <span className='font-semibold tracking-wide'>from last month</span>
                  </div>
                  <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-800 dark:border-t-slate-600'></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className='group relative overflow-hidden rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-sm p-6 dark:border-gray-700 dark:bg-gray-800/95 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]'>
        <div className='absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-500/10 dark:to-transparent'></div>
        <div className='relative'>
          <div className='flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300'>
            <svg className='text-white size-7' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z' />
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z'
                clipRule='evenodd'
              />
            </svg>
          </div>
          <div className='mt-6'>
            <span className='text-sm font-medium text-gray-600 dark:text-gray-300 font-inter block mb-3'>
              Monthly Revenue
            </span>
            <h4 className='text-2xl font-bold text-gray-900 dark:text-white font-space-grotesk mb-4'>
              $24,580
            </h4>
            <div className='flex justify-center'>
              <div className='group/percentage relative'>
                <div className='flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 dark:bg-green-500/20 cursor-pointer hover:bg-green-200 dark:hover:bg-green-500/30 hover:scale-105 hover:shadow-md transition-all duration-300 ease-out'>
                  <svg
                    className='text-green-600 size-3.5 dark:text-green-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-xs font-bold text-green-700 dark:text-green-400 font-inter'>
                    +8.2%
                  </span>
                </div>
                {/* Tooltip */}
                <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-2.5 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 dark:from-slate-600 dark:via-slate-500 dark:to-slate-600 text-white text-xs rounded-2xl shadow-2xl opacity-0 group-hover/percentage:opacity-100 group-hover/percentage:translate-y-0 translate-y-2 transition-all duration-500 ease-out pointer-events-none whitespace-nowrap z-30 backdrop-blur-sm border border-white/10'>
                  <div className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse'></div>
                    <span className='font-semibold tracking-wide'>from last month</span>
                  </div>
                  <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-800 dark:border-t-slate-600'></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Classes Today */}
      <div className='group relative overflow-hidden rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-sm p-6 dark:border-gray-700 dark:bg-gray-800/95 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]'>
        <div className='absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-500/10 dark:to-transparent'></div>
        <div className='relative'>
          <div className='flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300'>
            <svg className='text-white size-7' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h6a1 1 0 100-2H6zm2 3a1 1 0 000 2h2a1 1 0 100-2H8z'
                clipRule='evenodd'
              />
            </svg>
          </div>
          <div className='mt-6'>
            <span className='text-sm font-medium text-gray-600 dark:text-gray-300 font-inter block mb-3'>
              Classes Scheduled
            </span>
            <h4 className='text-2xl font-bold text-gray-900 dark:text-white font-space-grotesk mb-4'>
              18
            </h4>
            <div className='flex justify-center'>
              <div className='group/percentage relative'>
                <div className='flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 dark:bg-green-500/20 cursor-pointer hover:bg-green-200 dark:hover:bg-green-500/30 hover:scale-105 hover:shadow-md transition-all duration-300 ease-out'>
                  <svg
                    className='text-green-600 size-3.5 dark:text-green-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-xs font-bold text-green-700 dark:text-green-400 font-inter'>
                    +2.1%
                  </span>
                </div>
                {/* Tooltip */}
                <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-2.5 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 dark:from-slate-600 dark:via-slate-500 dark:to-slate-600 text-white text-xs rounded-2xl shadow-2xl opacity-0 group-hover/percentage:opacity-100 group-hover/percentage:translate-y-0 translate-y-2 transition-all duration-500 ease-out pointer-events-none whitespace-nowrap z-30 backdrop-blur-sm border border-white/10'>
                  <div className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse'></div>
                    <span className='font-semibold tracking-wide'>from yesterday</span>
                  </div>
                  <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-800 dark:border-t-slate-600'></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Status */}
      <div className='group relative overflow-hidden rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-sm p-6 dark:border-gray-700 dark:bg-gray-800/95 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02]'>
        <div className='absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-500/10 dark:to-transparent'></div>
        <div className='relative'>
          <div className='flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300'>
            <svg className='text-white size-7' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
                clipRule='evenodd'
              />
            </svg>
          </div>
          <div className='mt-6'>
            <span className='text-sm font-medium text-gray-600 dark:text-gray-300 font-inter block mb-3'>
              Equipment Status
            </span>
            <h4 className='text-2xl font-bold text-gray-900 dark:text-white font-space-grotesk mb-4'>
              95%
            </h4>
            <div className='flex justify-center'>
              <div className='group/percentage relative'>
                <div className='flex items-center gap-1 rounded-full bg-red-100 px-3 py-1.5 dark:bg-red-500/20 cursor-pointer hover:bg-red-200 dark:hover:bg-red-500/30 hover:scale-105 hover:shadow-md transition-all duration-300 ease-out'>
                  <svg
                    className='text-red-600 size-3.5 dark:text-red-400'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span className='text-xs font-bold text-red-700 dark:text-red-400 font-inter'>
                    -2.3%
                  </span>
                </div>
                {/* Tooltip */}
                <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-2.5 bg-gradient-to-br from-red-800 via-red-700 to-red-800 dark:from-red-600 dark:via-red-500 dark:to-red-600 text-white text-xs rounded-2xl shadow-2xl opacity-0 group-hover/percentage:opacity-100 group-hover/percentage:translate-y-0 translate-y-2 transition-all duration-500 ease-out pointer-events-none whitespace-nowrap z-30 backdrop-blur-sm border border-red-400/20'>
                  <div className='flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse'></div>
                    <span className='font-semibold tracking-wide'>maintenance needed</span>
                  </div>
                  <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-red-800 dark:border-t-red-600'></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
