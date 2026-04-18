import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/lib/theme/ThemeProvider';
import { useSchoolTheme } from '@/lib/theme/SchoolThemeProvider';
import { typography } from '@/lib/theme/typography';
const GIPHY_API_KEY = '9I8e3itfVV3EkKtj5aEqxVpkQJNxISuq';

interface GiphyGif {
  id: string;
  title: string;
  url: string;
  mediaUrl: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface GiphyApiImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyApiResult {
  id: string;
  title: string;
  url: string;
  images: {
    original: GiphyApiImage;
    fixed_width: GiphyApiImage;
    fixed_height_small: GiphyApiImage;
  };
}

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

const DEBOUNCE_MS = 400;
const NUM_COLUMNS = 2;
const GRID_GAP = 8;
const HORIZONTAL_PADDING = 16;

export function GifPicker({ visible, onClose, onSelect }: GifPickerProps) {
  const colors = useColors();
  const { dark } = useSchoolTheme();

  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Calculate thumbnail size based on screen width
  const screenWidth = Dimensions.get('window').width;
  const thumbSize = Math.floor(
    (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP) / NUM_COLUMNS
  );

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setQuery('');
      setGifs([]);
      setError(null);
    }
  }, [visible]);

  // Debounced GIF search
  useEffect(() => {
    if (!visible) return;

    const searchQuery = query.trim() || 'college football';
    setLoading(true);
    setError(null);

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=pg-13`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Search failed');
        const json = (await res.json()) as { data: GiphyApiResult[] };
        const mapped: GiphyGif[] = (json.data ?? []).map((g) => ({
          id: g.id,
          title: g.title,
          url: g.url,
          mediaUrl: g.images.original.url,
          previewUrl: g.images.fixed_width.url,
          width: parseInt(g.images.original.width, 10),
          height: parseInt(g.images.original.height, 10),
        }));
        setGifs(mapped);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Unable to load GIFs.');
          setGifs([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, visible]);

  const handleSelect = useCallback(
    (gif: GiphyGif) => {
      onSelect(gif.mediaUrl);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderGif = useCallback(
    ({ item }: { item: GiphyGif }) => (
      <Pressable
        onPress={() => handleSelect(item)}
        style={({ pressed }) => [
          {
            width: thumbSize,
            height: thumbSize,
            marginBottom: GRID_GAP,
            borderRadius: 6,
            overflow: 'hidden',
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Image
          source={{ uri: item.previewUrl }}
          style={{ width: thumbSize, height: thumbSize }}
          resizeMode="cover"
        />
      </Pressable>
    ),
    [thumbSize, handleSelect]
  );

  const keyExtractor = useCallback((item: GiphyGif) => item.id, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
        },
        sheet: {
          backgroundColor: colors.paper,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '80%',
          minHeight: 400,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingTop: 14,
          paddingBottom: 10,
          gap: 10,
        },
        searchInput: {
          flex: 1,
          fontFamily: typography.sans,
          fontSize: 15,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: Platform.OS === 'ios' ? 10 : 8,
        },
        closeButton: {
          paddingHorizontal: 8,
          paddingVertical: 6,
        },
        closeText: {
          fontFamily: typography.sans,
          fontSize: 15,
          color: colors.textSecondary,
        },
        body: {
          flex: 1,
          paddingHorizontal: HORIZONTAL_PADDING,
        },
        statusContainer: {
          paddingVertical: 40,
          alignItems: 'center',
        },
        statusText: {
          fontFamily: typography.sans,
          fontSize: 14,
          color: colors.textMuted,
        },
        errorText: {
          fontFamily: typography.sans,
          fontSize: 14,
          color: colors.error,
        },
        gridContent: {
          justifyContent: 'space-between' as const,
          paddingBottom: 12,
        },
        attribution: {
          paddingVertical: 12,
          paddingHorizontal: HORIZONTAL_PADDING,
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        attributionText: {
          fontFamily: typography.mono,
          fontSize: 10,
          letterSpacing: 1,
          color: colors.textMuted,
          textTransform: 'uppercase',
        },
        titleBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 10,
          paddingBottom: 4,
        },
        handle: {
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.borderStrong,
        },
      }),
    [colors]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.titleBar}>
            <View style={styles.handle} />
          </View>

          {/* Search header */}
          <View style={styles.header}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search GIFs..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Cancel</Text>
            </Pressable>
          </View>

          {/* Grid body */}
          <View style={styles.body}>
            {loading && (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="large" color={dark} />
              </View>
            )}
            {!loading && error && (
              <View style={styles.statusContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {!loading && !error && gifs.length === 0 && (
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>No GIFs found.</Text>
              </View>
            )}
            {!loading && !error && gifs.length > 0 && (
              <FlatList
                data={gifs}
                renderItem={renderGif}
                keyExtractor={keyExtractor}
                numColumns={NUM_COLUMNS}
                columnWrapperStyle={styles.gridContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
              />
            )}
          </View>

          {/* GIPHY attribution */}
          <View style={styles.attribution}>
            <Text style={styles.attributionText}>Powered by GIPHY</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
