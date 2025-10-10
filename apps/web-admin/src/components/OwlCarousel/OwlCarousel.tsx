import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OwlCarouselProps {
  children: React.ReactNode[];
  autoplay?: boolean;
  autoplayTimeout?: number;
  loop?: boolean;
  nav?: boolean;
  dots?: boolean;
  className?: string;
  smartSpeed?: number;
  items?: number;
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
  smartSpeed = 1200,
  items = 1,
  dotsEach = 1,
  responsive,
}) => {
  const [currentItems, setCurrentItems] = useState(items);
  const totalSlides = children.length;
  
  // Initialize at middle copy for infinite loop
  const [currentSlide, setCurrentSlide] = useState(loop ? totalSlides : 0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

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
    setCurrentSlide(prev => prev + 1);

    setTimeout(() => {
      setIsTransitioning(false);
    }, smartSpeed);
  }, [isTransitioning, smartSpeed]);

  // Simple prev slide function
  const prevSlide = useCallback(() => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setCurrentSlide(prev => prev - 1);

    setTimeout(() => {
      setIsTransitioning(false);
    }, smartSpeed);
  }, [isTransitioning, smartSpeed]);

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

  // Handle infinite loop reset WITHOUT transition
  useEffect(() => {
    if (!loop) return;

    // If we've moved past the last copy, silently reset to middle copy
    if (currentSlide >= totalSlides * 2) {
      setTimeout(() => {
        setCurrentSlide(totalSlides);
      }, smartSpeed);
    }
    // If we've moved before the first copy, silently reset to middle copy
    else if (currentSlide < totalSlides) {
      setTimeout(() => {
        setCurrentSlide(totalSlides + (totalSlides - 1 - currentSlide));
      }, smartSpeed);
    }
  }, [currentSlide, loop, totalSlides, smartSpeed]);

  // Create infinite loop by duplicating items
  const renderItems = () => {
    if (!loop) {
      return children.map((child, index) => (
        <div
          key={index}
          className='owl-item'
          style={{
            width: `calc(${100 / currentItems}% - 30px)`, // 30px = 15px margin mỗi bên
            margin: '0 15px', // khoảng cách 15px mỗi bên
            minHeight: '1px',
            float: 'left',
            boxSizing: 'border-box',
            backfaceVisibility: 'hidden',
          }}
        >
          {child}
        </div>
      ));
    }

    // For infinite loop, create multiple copies
    const extendedItems: React.ReactNode[] = [];
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
              width: `calc(${100 / (totalSlides * copies)}% - 30px)`, // 30px = 15px margin mỗi bên
              margin: '0 15px', // khoảng cách 15px mỗi bên
              minHeight: '1px',
              float: 'left',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              WebkitTouchCallout: 'none',
              boxSizing: 'border-box',
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

    // For infinite loop, calculate transform based on current slide
    const translateX = -(currentSlide * 100) / (totalSlides * 3);
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
      <div className='owl-stage-outer relative overflow-hidden'>
        <div
          className='owl-stage relative'
          style={{
            transform: getTransform(),
            transition: isTransitioning ? `all ${smartSpeed}ms ease` : 'none',
            width: getStageWidth(),
            touchAction: 'manipulation',
            backfaceVisibility: 'hidden',
          }}
        >
          {renderItems()}
          {/* Clear float like in original CSS */}
          <div
            style={{
              content: '""',
              display: 'block',
              clear: 'both',
              visibility: 'hidden',
              lineHeight: 0,
              height: 0,
              overflow: 'hidden',
              position: 'relative',
            }}
          ></div>
        </div>
      </div>

      {nav && totalSlides > 1 && (
        <div className='owl-nav'>
          <button className='owl-prev' onClick={prevSlide} disabled={isTransitioning}>
            <ChevronLeft size={24} />
          </button>
          <button className='owl-next' onClick={nextSlide} disabled={isTransitioning}>
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      {dots && totalSlides > 0 && (
        <div className='owl-dots'>
          {Array.from({ length: 3 }).map((_, index) => {
            // Calculate which dot should be active based on current position
            const realSlideIndex = currentSlide % totalSlides;
            const slidesPerDot = Math.ceil(totalSlides / 3);
            const activeDotIndex = Math.floor(realSlideIndex / slidesPerDot);
            
            return (
              <button
                key={index}
                className={`owl-dot ${activeDotIndex === index ? 'active' : ''}`}
                onClick={() => goToSlide(totalSlides + index * slidesPerDot)}
                disabled={isTransitioning}
              >
                <span></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
