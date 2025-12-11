import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 220;
const BANNER_WIDTH = SCREEN_WIDTH;
const AUTO_SCROLL_INTERVAL = 4000; // 4 seconds per image

const banners = [
  require('@/assets/banner/banner1.png'),
  require('@/assets/banner/banner2.png'),
  require('@/assets/banner/banner3.png'),
  require('@/assets/banner/banner4.png'),
];

export default function InfiniteScrollBanner() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScrollingRef = useRef(false);
  const scrollPositionRef = useRef(0);

  // Duplicate banners để tạo infinite loop: [1,2,3,4,1,2,3,4,1,2,3,4]
  // Bắt đầu từ set thứ 2 (index = banners.length)
  const extendedBanners = [...banners, ...banners, ...banners];
  const startIndex = banners.length; // Bắt đầu từ set thứ 2

  useEffect(() => {
    // Scroll đến set thứ 2 khi component mount
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: startIndex * BANNER_WIDTH,
          animated: false,
        });
        scrollPositionRef.current = startIndex * BANNER_WIDTH;
      }
    }, 100);

    // Auto-scroll to next image
    const startAutoScroll = () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }

      autoScrollTimerRef.current = setInterval(() => {
        if (!isScrollingRef.current && scrollViewRef.current) {
          const currentPos = scrollPositionRef.current;
          const nextPos = currentPos + BANNER_WIDTH;
          const maxPos = extendedBanners.length * BANNER_WIDTH;

          // Nếu đã đến cuối set thứ 3, reset về đầu set thứ 2 (seamless)
          if (nextPos >= (startIndex + banners.length) * BANNER_WIDTH) {
            // Reset về set thứ 2 một cách seamless
            scrollViewRef.current.scrollTo({
              x: startIndex * BANNER_WIDTH,
              animated: false,
            });
            scrollPositionRef.current = startIndex * BANNER_WIDTH;
            setCurrentIndex(0);
          } else {
            scrollViewRef.current.scrollTo({
              x: nextPos,
              animated: true,
            });
            scrollPositionRef.current = nextPos;
            const newIndex = Math.round(nextPos / BANNER_WIDTH) - startIndex;
            setCurrentIndex(newIndex % banners.length);
          }
        }
      }, AUTO_SCROLL_INTERVAL);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollPositionRef.current = offsetX;
    const index = Math.round(offsetX / BANNER_WIDTH) - startIndex;
    
    // Tính toán index trong phạm vi banners gốc
    const normalizedIndex = ((index % banners.length) + banners.length) % banners.length;
    
    if (normalizedIndex !== currentIndex && normalizedIndex >= 0 && normalizedIndex < banners.length) {
      setCurrentIndex(normalizedIndex);
    }

    // Reset seamless khi scroll đến gần cuối set thứ 3
    const maxPos = (startIndex + banners.length) * BANNER_WIDTH;
    if (offsetX >= maxPos - BANNER_WIDTH / 2) {
      setTimeout(() => {
        if (scrollViewRef.current && !isScrollingRef.current) {
          scrollViewRef.current.scrollTo({
            x: startIndex * BANNER_WIDTH,
            animated: false,
          });
          scrollPositionRef.current = startIndex * BANNER_WIDTH;
        }
      }, 100);
    }

    // Reset seamless khi scroll về đầu set thứ 1
    if (offsetX <= BANNER_WIDTH / 2) {
      setTimeout(() => {
        if (scrollViewRef.current && !isScrollingRef.current) {
          scrollViewRef.current.scrollTo({
            x: startIndex * BANNER_WIDTH,
            animated: false,
          });
          scrollPositionRef.current = startIndex * BANNER_WIDTH;
        }
      }, 100);
    }
  };

  const handleScrollBeginDrag = () => {
    isScrollingRef.current = true;
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }
  };

  const handleScrollEndDrag = () => {
    // Resume auto-scroll after a delay
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 1000);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollPositionRef.current = offsetX;
    
    // Reset seamless khi scroll đến cuối
    const maxPos = (startIndex + banners.length) * BANNER_WIDTH;
    if (offsetX >= maxPos - BANNER_WIDTH / 2) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: startIndex * BANNER_WIDTH,
            animated: false,
          });
          scrollPositionRef.current = startIndex * BANNER_WIDTH;
        }
      }, 50);
    }

    // Reset seamless khi scroll về đầu
    if (offsetX <= BANNER_WIDTH / 2) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: startIndex * BANNER_WIDTH,
            animated: false,
          });
          scrollPositionRef.current = startIndex * BANNER_WIDTH;
        }
      }, 50);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={BANNER_WIDTH}
        snapToAlignment="start"
      >
        {extendedBanners.map((banner, index) => (
          <View key={index} style={styles.bannerItem}>
            <Image source={banner} style={styles.image} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>

      {/* Page Indicators */}
      <View style={styles.indicatorContainer}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor:
                  index === currentIndex
                    ? 'rgba(255, 255, 255, 0.9)'
                    : 'rgba(255, 255, 255, 0.4)',
                width: index === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    marginTop: 16,
    marginBottom: 12,
    position: 'relative',
  },
  bannerItem: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
});
