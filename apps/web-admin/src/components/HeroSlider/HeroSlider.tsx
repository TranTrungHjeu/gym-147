import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

interface Slide {
  backgroundImage: string;
  span: string;
  title: string;
  buttonText: string;
  buttonLink: string;
}

interface HeroSliderProps {
  slides: Slide[];
  autoplay?: boolean;
  autoplayTimeout?: number;
  className?: string;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  slides,
  autoplay = false,
  autoplayTimeout = 5000,
  className = '',
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const totalSlides = slides.length;

  useEffect(() => {
    if (autoplay && totalSlides > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % totalSlides);
      }, autoplayTimeout);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoplay, autoplayTimeout, totalSlides]);

  // Trigger initial animation when component mounts
  useEffect(() => {
    setIsMounted(true);
    setShouldAnimate(false);

    const timer = setTimeout(() => {
      setShouldAnimate(true);
      setAnimationKey(1);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const nextSlide = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setShouldAnimate(false);
    const nextIndex = (currentSlide + 1) % totalSlides;
    console.log(
      'Next slide:',
      nextIndex,
      'Total slides:',
      totalSlides,
      'Transform:',
      `-${(nextIndex * 100) / totalSlides}%`
    );

    setTimeout(() => {
      setCurrentSlide(nextIndex);
      setAnimationKey(prev => prev + 1);
      setTimeout(() => {
        setShouldAnimate(true);
        setIsTransitioning(false);
      }, 100);
    }, 100);
  };

  const prevSlide = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setShouldAnimate(false);
    const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;

    setTimeout(() => {
      setCurrentSlide(prevIndex);
      setAnimationKey(prev => prev + 1);
      setTimeout(() => {
        setShouldAnimate(true);
        setIsTransitioning(false);
      }, 100);
    }, 100);
  };

  return (
    <div className={`hs-slider owl-carousel owl-loaded owl-drag ${className}`}>
      <div className='owl-stage-outer'>
        <div
          className='owl-stage'
          style={{
            transform: `translate3d(-${(currentSlide * 100) / totalSlides}%, 0px, 0px)`,
            transition: isTransitioning ? 'all 1200ms ease' : 'none',
            width: `${totalSlides * 100}%`,
          }}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`owl-item ${index === currentSlide ? 'active' : ''}`}
              style={{
                width: `${100 / totalSlides}%`,
                display: 'block',
                float: 'left',
              }}
            >
              <div
                className='hs-item set-bg'
                style={{ backgroundImage: `url(${slide.backgroundImage})` }}
              >
                <div className='container'>
                  <div className='row'>
                    <div className='col-lg-6 offset-lg-6'>
                      <div className='hi-text' key={`${index}-${animationKey}`}>
                        <span
                          style={{
                            position: 'relative',
                            opacity: index === currentSlide && shouldAnimate && isMounted ? 1 : 0,
                            transition:
                              isMounted && shouldAnimate ? 'opacity 0.8s ease 0.2s' : 'none',
                            display: 'block',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 600,
                            letterSpacing: '0.1em',
                          }}
                        >
                          {slide.span}
                        </span>
                        <h1
                          style={{
                            position: 'relative',
                            opacity: index === currentSlide && shouldAnimate && isMounted ? 1 : 0,
                            transition:
                              isMounted && shouldAnimate ? 'opacity 0.8s ease 0.4s' : 'none',
                            display: 'block',
                            fontFamily: 'Space Grotesk, sans-serif',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            lineHeight: '1.1',
                          }}
                          dangerouslySetInnerHTML={{ __html: slide.title }}
                        />
                        <Link
                          to={slide.buttonLink}
                          className='primary-btn'
                          style={{
                            position: 'relative',
                            opacity: index === currentSlide && shouldAnimate && isMounted ? 1 : 0,
                            transition:
                              isMounted && shouldAnimate ? 'opacity 0.8s ease 0.6s' : 'none',
                            display: 'inline-block',
                          }}
                        >
                          {slide.buttonText}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='owl-nav'>
        <button className='owl-prev' onClick={prevSlide}>
          <i className='fa fa-angle-left'></i>
        </button>
        <button className='owl-next' onClick={nextSlide}>
          <i className='fa fa-angle-right'></i>
        </button>
      </div>
    </div>
  );
};

