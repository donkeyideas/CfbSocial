import { memo, useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 24; // 12px margin on each side
const IMAGE_GAP = 4;

interface PostImagesProps {
  urls: string[];
}

export const PostImages = memo(function PostImages({ urls }: PostImagesProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);

  const styles = useMemo(() => {
    const availableWidth = SCREEN_WIDTH - CARD_PADDING - 20; // card padding
    const halfWidth = (availableWidth - IMAGE_GAP) / 2;
    const singleHeight = availableWidth * 0.6;
    const halfHeight = halfWidth * 0.75;

    return StyleSheet.create({
      container: {
        marginTop: 8,
        marginBottom: 4,
      },
      grid1: {
        borderRadius: 8,
        overflow: 'hidden',
      },
      img1: {
        width: availableWidth,
        height: singleHeight,
      },
      grid2: {
        flexDirection: 'row',
        gap: IMAGE_GAP,
        borderRadius: 8,
        overflow: 'hidden',
      },
      img2: {
        width: halfWidth,
        height: halfHeight,
      },
      grid3: {
        gap: IMAGE_GAP,
        borderRadius: 8,
        overflow: 'hidden',
      },
      grid3top: {
        width: availableWidth,
        height: singleHeight * 0.6,
      },
      grid3bottom: {
        flexDirection: 'row',
        gap: IMAGE_GAP,
      },
      img3bottom: {
        width: halfWidth,
        height: halfHeight * 0.8,
      },
      grid4: {
        gap: IMAGE_GAP,
        borderRadius: 8,
        overflow: 'hidden',
      },
      grid4row: {
        flexDirection: 'row',
        gap: IMAGE_GAP,
      },
      img4: {
        width: halfWidth,
        height: halfHeight,
      },
      lightboxOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
      },
      lightboxImg: {
        width: SCREEN_WIDTH - 32,
        height: SCREEN_WIDTH - 32,
        resizeMode: 'contain',
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
      lightboxNav: {
        position: 'absolute',
        top: '50%',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
      },
      lightboxNavText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
      },
    });
  }, []);

  if (!urls || urls.length === 0) return null;

  const count = Math.min(urls.length, 4);
  const images = urls.slice(0, 4);

  const renderGrid = () => {
    if (count === 1) {
      return (
        <Pressable style={styles.grid1} onPress={() => setLightboxIdx(0)}>
          <Image source={{ uri: images[0] }} style={styles.img1} />
        </Pressable>
      );
    }

    if (count === 2) {
      return (
        <View style={styles.grid2}>
          {images.map((uri, i) => (
            <Pressable key={i} onPress={() => setLightboxIdx(i)}>
              <Image source={{ uri }} style={styles.img2} />
            </Pressable>
          ))}
        </View>
      );
    }

    if (count === 3) {
      return (
        <View style={styles.grid3}>
          <Pressable onPress={() => setLightboxIdx(0)}>
            <Image source={{ uri: images[0] }} style={styles.grid3top} />
          </Pressable>
          <View style={styles.grid3bottom}>
            {images.slice(1).map((uri, i) => (
              <Pressable key={i} onPress={() => setLightboxIdx(i + 1)}>
                <Image source={{ uri }} style={styles.img3bottom} />
              </Pressable>
            ))}
          </View>
        </View>
      );
    }

    // 4 images
    return (
      <View style={styles.grid4}>
        <View style={styles.grid4row}>
          {images.slice(0, 2).map((uri, i) => (
            <Pressable key={i} onPress={() => setLightboxIdx(i)}>
              <Image source={{ uri }} style={styles.img4} />
            </Pressable>
          ))}
        </View>
        <View style={styles.grid4row}>
          {images.slice(2, 4).map((uri, i) => (
            <Pressable key={i} onPress={() => setLightboxIdx(i + 2)}>
              <Image source={{ uri }} style={styles.img4} />
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        {renderGrid()}
      </View>

      <Modal
        visible={lightboxIdx !== null}
        transparent
        animationType="fade"
        onRequestClose={closeLightbox}
      >
        <Pressable style={styles.lightboxOverlay} onPress={closeLightbox}>
          {lightboxIdx !== null && (
            <Image
              source={{ uri: images[lightboxIdx] }}
              style={styles.lightboxImg}
            />
          )}

          <Pressable style={styles.lightboxClose} onPress={closeLightbox}>
            <Text style={styles.lightboxCloseText}>X</Text>
          </Pressable>

          {lightboxIdx !== null && lightboxIdx > 0 && (
            <Pressable
              style={[styles.lightboxNav, { left: 12 }]}
              onPress={() => setLightboxIdx(lightboxIdx - 1)}
            >
              <Text style={styles.lightboxNavText}>&lt;</Text>
            </Pressable>
          )}

          {lightboxIdx !== null && lightboxIdx < images.length - 1 && (
            <Pressable
              style={[styles.lightboxNav, { right: 12 }]}
              onPress={() => setLightboxIdx(lightboxIdx + 1)}
            >
              <Text style={styles.lightboxNavText}>&gt;</Text>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </>
  );
});
