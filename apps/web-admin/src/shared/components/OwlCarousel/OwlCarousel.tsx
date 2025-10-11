import React, { useCallback, useEffect, useRef, useState } from 'react';

interface OwlCarouselProps {
  children: React.ReactNode[];
  autoplay?: boolean;
  autoplayTimeout?: number;
  loop?: boolean;
  nav?: boolean;
  dots?: boolean;
  className?: string;
  animateOut?: string;
  animateIn?: string;
  smartSpeed?: number;
  items?: number;
  margin?: number;
  dotsEach?: number;
  responsive?: {
    [breakpoint: number]: {
      items: number;
    };
  };
}

export const OwlCarousel: React.FC<OwlCarouselProps> = ({
  children,
  autoplay = false,
  autoplayTimeout = 5000,
  loop = true,
  nav = true,
  dots = false,
  className = '',
  animateOut = 'fadeOut',
  animateIn = 'fadeIn',
  smartSpeed = 1200,
  items = 1,
  margin = 0,
  dotsEach = 1,
  responsive,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentItems, setCurrentItems] = useState(items);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const totalSlides = children.length;

  // Handle responsive items
  useEffect(() => {
    const handleResize = () => {
      if (responsive) {
        const width = window.innerWidth;
        let newItems = items;

        const breakpoints = Object.keys(responsive)
          .map(Number)
          .sort((a, b) => b - a);
        for (const breakpoint of breakpoints) {
          if (width >= breakpoint) {
            newItems = responsive[breakpoint].items;
            break;
          }
        }

        setCurrentItems(newItems);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [responsive, items]);

  // Simple next slide function
  const nextSlide = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    setCurrentSlide(prev => {
      const next = prev + 1;
      return loop ? next % totalSlides : Math.min(next, totalSlides - currentItems);
    });

    setTimeout(() => {
      setIsTransitioning(false);
    }, smartSpeed);
  }, [isTransitioning, loop, totalSlides, currentItems, smartSpeed]);

  // Simple prev slide function
  const prevSlide = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);

    setCurrentSlide(prev => {
      const next = prev - 1;
      return loop ? (next < 0 ? totalSlides - 1 : next) : Math.max(next, 0);
    });

    setTimeout(() => {
      setIsTransitioning(false);
    }, smartSpeed);
  }, [isTransitioning, loop, totalSlides, smartSpeed]);

  // Go to specific slide
  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === currentSlide) return;

      setIsTransitioning(true);
      setCurrentSlide(index);

      setTimeout(() => {
        setIsTransitioning(false);
      }, smartSpeed);
    },
    [isTransitioning, currentSlide, smartSpeed]
  );

  // Autoplay effect
  useEffect(() => {
    if (autoplay && totalSlides > 1) {
      intervalRef.current = setInterval(nextSlide, autoplayTimeout);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoplay, autoplayTimeout, totalSlides, nextSlide]);

  // Create infinite loop by duplicating items
  const renderItems = () => {
    if (!loop) {
      return children.map((child, index) => (
        <div
          key={index}
          className={`owl-item ${
            index >= currentSlide && index < currentSlide + currentItems ? 'active' : ''
          }`}
          style={{
            width: `${100 / currentItems}%`,
            float: 'left',
            marginRight: `${margin}px`,
          }}
        >
          {child}
        </div>
      ));
    }

    // For infinite loop, create multiple copies
    const extendedItems = [];
    const copies = 3; // Create 3 copies for smooth infinite scroll

    for (let copy = 0; copy < copies; copy++) {
      children.forEach((child, index) => {
        const globalIndex = copy * totalSlides + index;
        extendedItems.push(
          <div
            key={`${copy}-${index}`}
            className={`owl-item ${
              globalIndex >= currentSlide && globalIndex < currentSlide + currentItems
                ? 'active'
                : ''
            }`}
            style={{
              width: `${100 / (totalSlides * copies)}%`,
              float: 'left',
              marginRight: `${margin}px`,
            }}
          >
            {child}
          </div>
        );
      });
    }

    return extendedItems;
  };

  // Calculate transform for infinite loop
  const getTransform = () => {
    if (!loop) {
      return `translate3d(-${(currentSlide * 100) / currentItems}%, 0px, 0px)`;
    }

    // For infinite loop, adjust the transform
    const actualSlide = currentSlide % totalSlides;
    const offset = totalSlides; // Start from middle copy
    const translateX = -((actualSlide + offset) * 100) / (totalSlides * 3);

    return `translate3d(${translateX}%, 0px, 0px)`;
  };

  // Get stage width
  const getStageWidth = () => {
    if (!loop) {
      return `${(totalSlides * 100) / currentItems}%`;
    }
    return `${(totalSlides * 3 * 100) / currentItems}%`;
  };

  return (
    <div ref={carouselRef} className={`owl-carousel owl-loaded owl-drag ${className}`}>
      <div className='owl-stage-outer'>
        <div
          className='owl-stage'
          style={{
            transform: getTransform(),
            transition: isTransitioning ? `all ${smartSpeed}ms ease` : 'none',
            width: getStageWidth(),
          }}
        >
          {renderItems()}
        </div>
      </div>

      {nav && totalSlides > 1 && (
        <div className='owl-nav'>
          <button className='owl-prev' onClick={prevSlide} disabled={isTransitioning}>
            <i className='fa fa-angle-left'></i>
          </button>
          <button className='owl-next' onClick={nextSlide} disabled={isTransitioning}>
            <i className='fa fa-angle-right'></i>
          </button>
        </div>
      )}

      {dots && totalSlides > currentItems && (
        <div className='owl-dots'>
          {Array.from({ length: Math.ceil(totalSlides / dotsEach) }).map((_, index) => (
            <button
              key={index}
              className={`owl-dot ${
                Math.floor((currentSlide % totalSlides) / dotsEach) === index ? 'active' : ''
              }`}
              onClick={() => goToSlide(index * dotsEach)}
              disabled={isTransitioning}
            >
              <span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
