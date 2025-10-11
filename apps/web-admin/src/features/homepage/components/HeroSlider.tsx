import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface HeroSlide {
  backgroundImage: string;
  span: string;
  title: string;
  buttonText: string;
  buttonLink: string;
}

interface HeroSliderProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  autoplayTimeout?: number;
  className?: string;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  slides,
  autoplay = true,
  autoplayTimeout = 6000,
  className = '',
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fadeClass, setFadeClass] = useState('opacity-100 scale-100');
  const totalSlides = slides.length;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto slide logic
  useEffect(() => {
    if (autoplay && totalSlides > 1) {
      timeoutRef.current = setInterval(() => {
        setFadeClass('opacity-0 scale-105');
        setTimeout(() => {
          setCurrentSlide(prev => (prev + 1) % totalSlides);
          setFadeClass('opacity-100 scale-100');
        }, 700);
      }, autoplayTimeout);
    }
    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [autoplay, autoplayTimeout, totalSlides]);

  const prevSlide = () => {
    setFadeClass('opacity-0 scale-105');
    setTimeout(() => {
      setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);
      setFadeClass('opacity-100 scale-100');
    }, 600);
  };

  const nextSlide = () => {
    setFadeClass('opacity-0 scale-105');
    setTimeout(() => {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
      setFadeClass('opacity-100 scale-100');
    }, 600);
  };

  return (
    <div
      className={`relative w-full h-[100vh] min-h-[400px] max-h-[1200px] overflow-hidden ${className}`}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-[1200ms] ease-in-out ${
            index === currentSlide ? `opacity-100 scale-100 z-10` : 'opacity-0 scale-105 z-0'
          }`}
          style={{
            backgroundImage: `url(${slide.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            transform:
              index === currentSlide ? 'scale(1.03) translateX(0)' : 'scale(1) translateX(0)',
            transition: 'transform 5s ease-in-out',
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Overlay mờ */}
          <div className='absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent'></div>

          {/* Nội dung bên phải */}
          <div className='relative h-full max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-end'>
            <div
              className={`max-w-lg text-right text-white transform transition-all duration-700 ${fadeClass}`}
            >
              <span className='block text-orange-400 font-semibold text-lg md:text-xl mb-4 tracking-widest uppercase'>
                {slide.span}
              </span>

              <h1
                className='text-4xl md:text-6xl font-extrabold leading-tight mb-6 drop-shadow-xl'
                dangerouslySetInnerHTML={{ __html: slide.title }}
              />

              <Link
                to={slide.buttonLink}
                className='inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-md text-lg shadow-lg hover:shadow-orange-500/40 transition-all duration-300'
              >
                {slide.buttonText} <i className='fa fa-arrow-right ml-2'></i>
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation buttons */}
      <button
        onClick={prevSlide}
        className='absolute left-6 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-orange-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300'
      >
        <i className='fa fa-angle-left'></i>
      </button>

      <button
        onClick={nextSlide}
        className='absolute right-6 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-orange-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300'
      >
        <i className='fa fa-angle-right'></i>
      </button>

      {/* Dot indicators */}
      <div className='absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3'>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i === currentSlide ? 'bg-orange-500 scale-125' : 'bg-gray-400 hover:bg-gray-300'
            }`}
          ></button>
        ))}
      </div>
    </div>
  );
};
