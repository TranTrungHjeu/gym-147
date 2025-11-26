import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 220; // Tăng chiều cao banner
const SPACING = 12; // Khoảng cách giữa các ảnh
const PADDING_HORIZONTAL = 0; // Loại bỏ padding để banner rộng tối đa
const BANNER_WIDTH = SCREEN_WIDTH; // Banner rộng full màn hình
const SCROLL_DURATION = 8000; // 8 seconds for one full cycle

const banners = [
  require('@/assets/banner/banner1.png'),
  require('@/assets/banner/banner2.png'),
  require('@/assets/banner/banner3.png'),
  require('@/assets/banner/banner4.png'),
];

export default function InfiniteScrollBanner() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Duplicate banners để tạo seamless infinite loop
  const extendedBanners = [...banners, ...banners, ...banners];
  const itemWidth = BANNER_WIDTH + SPACING;
  const totalWidth = itemWidth * banners.length; // Width của một set banners

  useEffect(() => {
    // Bắt đầu từ set thứ 2 (index = banners.length) để có thể scroll cả 2 chiều
    scrollX.setValue(-totalWidth);

    // Tạo infinite scroll animation
    const animate = () => {
      // Scroll từ set thứ 2 đến set thứ 3
      animationRef.current = Animated.timing(scrollX, {
        toValue: -totalWidth * 2,
        duration: SCROLL_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      });

      animationRef.current.start(({ finished }) => {
        if (finished) {
          // Reset về set thứ 2 một cách seamless (không nhìn thấy)
          scrollX.setValue(-totalWidth);
          // Tiếp tục animation
          animate();
        }
      });
    };

    animate();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [totalWidth]);

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <Animated.View
          style={[
            styles.scrollContainer,
            {
              transform: [{ translateX: scrollX }],
              width: itemWidth * extendedBanners.length,
            },
          ]}
        >
          {extendedBanners.map((banner, index) => (
            <View
              key={index}
              style={[
                styles.bannerItem,
                {
                  marginRight: index === extendedBanners.length - 1 ? 0 : SPACING,
                },
              ]}
            >
              <Image source={banner} style={styles.image} resizeMode="cover" />
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    marginTop: 16,
    marginBottom: 12, // Tăng margin bottom để banner nổi bật hơn
  },
  wrapper: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: PADDING_HORIZONTAL, // Không có padding, banner full width
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BANNER_HEIGHT,
  },
  bannerItem: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 0, // Loại bỏ border radius
    overflow: 'hidden',
    backgroundColor: 'transparent', // Loại bỏ background color
    // Loại bỏ shadow và elevation để không có border nhấp nháy
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
