import React from 'react';
import './InfiniteScrollBanner.css';

export const InfiniteScrollBanner: React.FC = () => {
  console.log('InfiniteScrollBanner component is rendering');

  const banners = [
    '/images/carousel/carousel-01.png',
    '/images/carousel/carousel-02.png',
    '/images/carousel/carousel-03.png',
    '/images/carousel/carousel-04.png',
  ];

  return (
    <div className='infinite-scroll-banner-container'>
      <div className='infinite-scroll-banner'>
        {/* First set of banners */}
        {banners.map((banner, index) => (
          <div key={`banner-1-${index}`} className='banner-item'>
            <img src={banner} alt={`Banner ${index + 1}`} loading='eager' />
          </div>
        ))}
        {/* Duplicate set for seamless infinite loop */}
        {banners.map((banner, index) => (
          <div key={`banner-2-${index}`} className='banner-item'>
            <img src={banner} alt={`Banner ${index + 1}`} loading='eager' />
          </div>
        ))}
      </div>
    </div>
  );
};
