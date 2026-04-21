import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_SLIDE_HEIGHT = 500;

interface PostImagesProps {
  urls: string[];
}

/** Fetch dimensions for all images, returns array of {w, h} */
function useImageSizes(urls: string[]) {
  const [sizes, setSizes] = useState<({ w: number; h: number } | null)[]>(() => urls.map(() => null));

  useEffect(() => {
    urls.forEach((uri, i) => {
      Image.getSize(
        uri,
        (w, h) => setSizes((prev) => {
          const next = [...prev];
          next[i] = { w, h };
          return next;
        }),
        () => setSizes((prev) => {
          const next = [...prev];
          next[i] = { w: 1, h: 1 }; // fallback 1:1
          return next;
        }),
      );
    });
  }, [urls.join(',')]);

  return sizes;
}

export const PostImages = memo(function PostImages({ urls }: PostImagesProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const lightboxScrollRef = useRef<ScrollView>(null);
  const sizes = useImageSizes(urls);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  if (!urls || urls.length === 0) return null;

  const count = urls.length;
  const slideWidth = containerWidth || (SCREEN_WIDTH - 48);

  // Compute each slide's natural height (full width, aspect-ratio height)
  const slideHeights = sizes.map((s) => {
    if (!s) return slideWidth * 0.75; // loading placeholder
    const h = slideWidth / (s.w / s.h);
    return Math.min(h, MAX_SLIDE_HEIGHT);
  });
  // Carousel height = tallest slide so all fit without clipping
  const carouselHeight = Math.max(...slideHeights);
  const allLoaded = sizes.every((s) => s !== null);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const w = containerWidth || (SCREEN_WIDTH - 48);
    const idx = Math.round(offsetX / w);
    setActiveSlide(idx);
  }, [containerWidth]);

  const goToSlide = useCallback((idx: number) => {
    const w = containerWidth || (SCREEN_WIDTH - 48);
    scrollRef.current?.scrollTo({ x: idx * w, animated: true });
  }, [containerWidth]);

  // Single image — size to its actual aspect ratio
  if (count === 1) {
    const s = sizes[0];
    let imgH = slideWidth * 0.75;
    if (s) {
      imgH = Math.min(slideWidth / (s.w / s.h), MAX_SLIDE_HEIGHT);
    }

    return (
      <>
        <View style={styles.container} onLayout={onLayout}>
          {containerWidth > 0 && (
            <Pressable
              onPress={() => setLightboxIdx(0)}
              style={{ borderRadius: 8, overflow: 'hidden' }}
            >
              <Image
                source={{ uri: urls[0] }}
                style={{ width: slideWidth, height: imgH }}
                resizeMode="cover"
              />
            </Pressable>
          )}
        </View>
        <LightboxModal
          urls={urls}
          sizes={sizes}
          idx={lightboxIdx}
          onClose={closeLightbox}
          onChange={setLightboxIdx}
          scrollRef={lightboxScrollRef}
        />
      </>
    );
  }

  // Multi-image carousel
  return (
    <>
      <View style={styles.container} onLayout={onLayout}>
        {containerWidth > 0 && (
          <>
            <View style={[styles.carouselWrapper, { width: slideWidth, height: carouselHeight }]}>
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                decelerationRate="fast"
                style={{ width: slideWidth, height: carouselHeight }}
              >
                {urls.map((uri, idx) => {
                  const thisH = slideHeights[idx]!;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => setLightboxIdx(idx)}
                      style={{
                        width: slideWidth,
                        height: carouselHeight,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: slideWidth, height: thisH, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Counter badge */}
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{activeSlide + 1}/{count}</Text>
              </View>
            </View>

            {/* Dot indicators */}
            <View style={styles.dotsContainer}>
              {urls.map((_, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => goToSlide(idx)}
                  style={[
                    styles.dot,
                    idx === activeSlide && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </>
        )}
      </View>

      <LightboxModal
        urls={urls}
        sizes={sizes}
        idx={lightboxIdx}
        onClose={closeLightbox}
        onChange={setLightboxIdx}
        scrollRef={lightboxScrollRef}
      />
    </>
  );
});

/** Full-screen lightbox with swipeable navigation */
function LightboxModal({
  urls,
  sizes,
  idx,
  onClose,
  onChange,
  scrollRef,
}: {
  urls: string[];
  sizes: ({ w: number; h: number } | null)[];
  idx: number | null;
  onClose: () => void;
  onChange: (idx: number) => void;
  scrollRef: React.RefObject<ScrollView | null>;
}) {
  const screenH = Dimensions.get('window').height;

  const onLightboxScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / SCREEN_WIDTH);
    onChange(newIdx);
  }, [onChange]);

  useEffect(() => {
    if (idx !== null && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: false });
      }, 50);
    }
  }, [idx !== null]);

  if (idx === null) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.lightboxOverlay} onPress={onClose}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onLightboxScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          contentOffset={{ x: idx * SCREEN_WIDTH, y: 0 }}
          style={{ width: SCREEN_WIDTH }}
        >
          {urls.map((uri, i) => {
            const s = sizes[i];
            let imgW = SCREEN_WIDTH;
            let imgH = SCREEN_WIDTH;
            if (s) {
              const aspect = s.w / s.h;
              // Fit to screen: try full width first, then constrain by height
              imgW = SCREEN_WIDTH;
              imgH = SCREEN_WIDTH / aspect;
              if (imgH > screenH * 0.8) {
                imgH = screenH * 0.8;
                imgW = imgH * aspect;
              }
            }
            return (
              <Pressable key={i} style={styles.lightboxSlide} onPress={(e) => e.stopPropagation()}>
                <Image
                  source={{ uri }}
                  style={{ width: imgW, height: imgH }}
                  resizeMode="contain"
                />
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={styles.lightboxClose} onPress={onClose}>
          <Text style={styles.lightboxCloseText}>X</Text>
        </Pressable>

        {urls.length > 1 && (
          <View style={styles.lightboxDots}>
            {urls.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.lightboxDot,
                  i === idx && styles.lightboxDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  carouselWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  counterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ccc',
  },
  dotActive: {
    backgroundColor: '#8b0000',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxSlide: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  lightboxDots: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 6,
  },
  lightboxDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  lightboxDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
