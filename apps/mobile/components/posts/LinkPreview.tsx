import { memo, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useColors, useTheme } from '@/lib/theme/ThemeProvider';
import { typography } from '@/lib/theme/typography';

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  url: string;
}

// Detect direct GIF URLs (GIPHY media links, etc.)
function extractGifUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Any giphy.com subdomain with giphy.gif in path
    if (u.hostname.includes('giphy.com') && u.pathname.includes('/giphy.gif')) {
      return url.split('?')[0]; // strip query params for cleaner URL
    }
    // GIPHY page URLs — convert to direct media
    if ((u.hostname === 'giphy.com' || u.hostname === 'www.giphy.com') && u.pathname.startsWith('/gifs/')) {
      const match = u.pathname.match(/\/gifs\/(?:.*-)?([a-zA-Z0-9]+)$/);
      if (match) return `https://media.giphy.com/media/${match[1]}/giphy.gif`;
    }
    // Any direct .gif URL
    if (u.pathname.endsWith('.gif')) return url;
  } catch { /* ignore */ }
  return null;
}

const URL_REGEX = /https?:\/\/[^\s<>"\])}]+/gi;

// In-memory cache — only stores successful results
const ogCache = new Map<string, OgData>();

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Strip the first URL from post content so it doesn't show as raw text
 * when a link preview card is rendered below.
 */
export function stripFirstUrl(text: string): string {
  const url = extractFirstUrl(text);
  if (!url) return text;
  return text.replace(url, '').replace(/\n{2,}$/g, '').trimEnd();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function extractOgFromHtml(html: string, baseUrl: URL): OgData {
  function getMeta(property: string): string | null {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return decodeHtmlEntities(m[1]);
    }
    return null;
  }

  let title = getMeta('og:title') ?? getMeta('twitter:title');
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch?.[1]) title = decodeHtmlEntities(titleMatch[1].trim());
  }

  let description = getMeta('og:description') ?? getMeta('twitter:description') ?? getMeta('description');

  // Sanitize garbage descriptions (nav text, concatenated menu items, etc.)
  if (description) {
    // Detect concatenated nav text: long "words" without spaces (e.g. "SearchNewsFinanceSports")
    const words = description.split(/\s+/);
    const hasGarbageWord = words.some((w) => w.length > 50);
    const avgWordLen = description.replace(/\s+/g, '').length / Math.max(words.length, 1);
    if (hasGarbageWord || avgWordLen > 20) {
      description = null;
    }
  }

  let image = getMeta('og:image') ?? getMeta('twitter:image');
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, baseUrl.origin).href;
    } catch {
      image = null;
    }
  }

  const siteName = getMeta('og:site_name');

  let favicon: string | null = null;
  const iconMatch = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']*)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i);
  if (iconMatch?.[1]) {
    favicon = iconMatch[1];
    if (!favicon.startsWith('http')) {
      try {
        favicon = new URL(favicon, baseUrl.origin).href;
      } catch {
        favicon = `${baseUrl.origin}/favicon.ico`;
      }
    }
  } else {
    favicon = `${baseUrl.origin}/favicon.ico`;
  }

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    siteName: siteName || null,
    favicon,
    url: baseUrl.href,
  };
}

// ---- YouTube helpers ----

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if ((u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com' || u.hostname === 'm.youtube.com') && u.pathname === '/watch') {
      return u.searchParams.get('v');
    }
    const pathMatch = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?&]+)/);
    if (pathMatch && u.hostname.includes('youtube.com')) {
      return pathMatch[2];
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split(/[?/]/)[0] || null;
    }
  } catch { /* ignore */ }
  return null;
}

async function fetchYouTubeOg(url: string, videoId: string): Promise<OgData | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;

    const data = await res.json() as { title?: string; author_name?: string; thumbnail_url?: string };
    return {
      title: data.title || null,
      description: data.author_name ? `Video by ${data.author_name}` : null,
      image: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      siteName: 'YouTube',
      favicon: 'https://www.youtube.com/favicon.ico',
      url,
    };
  } catch {
    return {
      title: null,
      description: null,
      image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      siteName: 'YouTube',
      favicon: 'https://www.youtube.com/favicon.ico',
      url,
    };
  }
}

function isTwitterUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === 'twitter.com' || h === 'www.twitter.com' || h === 'x.com' || h === 'www.x.com';
  } catch { return false; }
}

function extractTweetId(url: string): string | null {
  try {
    const m = new URL(url).pathname.match(/\/status\/(\d+)/);
    return m ? m[1] : null;
  } catch { return null; }
}

async function fetchOgData(url: string): Promise<OgData | null> {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    // YouTube: use oEmbed API (YouTube blocks HTML scraping)
    const ytId = extractYouTubeId(url);
    if (ytId) return fetchYouTubeOg(url, ytId);

    // Twitter/X: blocks scraping, return minimal card
    if (isTwitterUrl(url)) {
      return {
        title: 'Post on X',
        description: null,
        image: null,
        siteName: 'X (Twitter)',
        favicon: 'https://abs.twimg.com/favicons/twitter.3.ico',
        url,
      };
    }

    // Instagram: use oEmbed API for reliable preview
    if (parsed.hostname.includes('instagram.com')) {
      try {
        const oRes = await fetch(`https://api.instagram.com/oembed?url=${encodeURIComponent(url)}&maxwidth=480`);
        if (oRes.ok) {
          const d = await oRes.json() as { title?: string; author_name?: string; thumbnail_url?: string };
          return {
            title: d.title || d.author_name || 'Instagram Post',
            description: d.author_name ? `@${d.author_name}` : null,
            image: d.thumbnail_url || null,
            siteName: 'Instagram',
            favicon: 'https://www.instagram.com/favicon.ico',
            url,
          };
        }
      } catch { /* fall through to HTML scraping */ }
    }

    // TikTok: use oEmbed API for reliable preview
    if (parsed.hostname.includes('tiktok.com')) {
      try {
        const oRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
        if (oRes.ok) {
          const d = await oRes.json() as { title?: string; author_name?: string; thumbnail_url?: string };
          return {
            title: d.title || 'TikTok Video',
            description: d.author_name ? `@${d.author_name}` : null,
            image: d.thumbnail_url || null,
            siteName: 'TikTok',
            favicon: 'https://www.tiktok.com/favicon.ico',
            url,
          };
        }
      } catch { /* fall through to HTML scraping */ }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CFBSocialBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) return null;

    // Read limited HTML (first 50KB)
    const text = await res.text();
    const html = text.slice(0, 50 * 1024);

    const og = extractOgFromHtml(html, parsed);
    return og.title || og.description || og.image ? og : null;
  } catch {
    return null;
  }
}

// ---- Video embed detection ----

interface VideoEmbed {
  platform: 'youtube' | 'instagram' | 'tiktok' | 'twitch' | 'twitter';
  embedUrl: string;
}

// Base URL for YouTube IFrame API — must be a real third-party domain so
// the WebView origin matches the `origin` playerVar YouTube checks.
const YT_PLAYER_BASE_URL = 'https://lonelycpp.github.io';

function buildYouTubeHtml(videoId: string): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden}body{background:#000}#player{width:100vw;height:100vh}</style>
</head><body>
<div id="player"></div>
<script>
var tag=document.createElement('script');
tag.src='https://www.youtube.com/iframe_api';
document.head.appendChild(tag);
function onYouTubeIframeAPIReady(){
new YT.Player('player',{
videoId:'${videoId}',
playerVars:{playsinline:1,autoplay:1,rel:0,modestbranding:1,fs:1,origin:'${YT_PLAYER_BASE_URL}'},
events:{onReady:function(e){e.target.playVideo()}}
});}
</script>
</body></html>`;
}

function detectVideoEmbed(url: string): VideoEmbed | null {
  const ytId = extractYouTubeId(url);
  if (ytId) return { platform: 'youtube', embedUrl: ytId }; // store just the video ID for YouTube

  try {
    const u = new URL(url);
    // TikTok
    const tiktokMatch = u.pathname.match(/\/@[^/]+\/video\/(\d+)/);
    if (u.hostname.includes('tiktok.com') && tiktokMatch) {
      return { platform: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}` };
    }
    if (u.hostname === 'vm.tiktok.com') {
      const shortId = u.pathname.replace(/^\//, '').split('/')[0];
      if (shortId) return { platform: 'tiktok', embedUrl: url };
    }
    // Instagram — reels use /reel/{id}/embed, posts use /p/{id}/embed
    const instaReel = u.pathname.match(/\/reels?\/([A-Za-z0-9_-]+)/);
    const instaPost = u.pathname.match(/\/p\/([A-Za-z0-9_-]+)/);
    if (u.hostname.includes('instagram.com') && (instaReel || instaPost)) {
      const id = instaReel ? instaReel[1] : instaPost![1];
      const type = instaReel ? 'reel' : 'p';
      return { platform: 'instagram', embedUrl: `https://www.instagram.com/${type}/${id}/embed/` };
    }
    // Twitch clips
    const twitchClip = url.match(/clips\.twitch\.tv\/([A-Za-z0-9_-]+)/) || u.pathname.match(/\/clip\/([A-Za-z0-9_-]+)/);
    if (u.hostname.includes('twitch.tv') && twitchClip) {
      return { platform: 'twitch', embedUrl: `https://clips.twitch.tv/embed?clip=${twitchClip[1]}&parent=localhost` };
    }
    // Twitter/X
    const tweetId = extractTweetId(url);
    if (isTwitterUrl(url) && tweetId) {
      return { platform: 'twitter', embedUrl: tweetId };
    }
  } catch { /* ignore */ }
  return null;
}

function buildTwitterEmbedHtml(tweetId: string, darkMode: boolean): string {
  const theme = darkMode ? 'dark' : 'light';
  const bg = darkMode ? '#1a1a1a' : '#fff';
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0}body{background:${bg};display:flex;justify-content:center;min-height:100vh}</style>
</head><body><div id="tweet"></div>
<script src="https://platform.twitter.com/widgets.js"></script>
<script>
twttr.ready(function(twttr){
  twttr.widgets.createTweet('${tweetId}',document.getElementById('tweet'),{
    theme:'${theme}',dnt:true,align:'center'
  }).then(function(el){
    if(el){
      setTimeout(function(){
        var h=document.body.scrollHeight;
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'height',height:h}));
      },500);
      setTimeout(function(){
        var h=document.body.scrollHeight;
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'height',height:h}));
      },2000);
    }
  });
});
</script></body></html>`;
}

interface LinkPreviewProps {
  content: string;
}

export const LinkPreview = memo(function LinkPreview({ content }: LinkPreviewProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [embedHeight, setEmbedHeight] = useState<number | null>(null);
  const shimmerAnim = useMemo(() => new Animated.Value(0), []);

  const url = extractFirstUrl(content);

  // Shimmer animation
  useEffect(() => {
    if (!loading) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [loading, shimmerAnim]);

  useEffect(() => {
    if (!url) return;

    // Skip OG fetch for GIF URLs — they render directly
    if (extractGifUrl(url)) return;

    const cached = ogCache.get(url);
    if (cached) {
      setOgData(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchOgData(url).then((data) => {
      if (cancelled) return;
      if (data) {
        ogCache.set(url, data);
        setOgData(data);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [url]);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      overflow: 'hidden',
      marginTop: 8,
      marginBottom: 4,
      backgroundColor: colors.surfaceRaised,
    },
    image: {
      width: '100%',
      height: 200,
      backgroundColor: colors.surface,
    },
    info: {
      padding: 10,
    },
    siteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    favicon: {
      width: 14,
      height: 14,
      borderRadius: 2,
    },
    siteName: {
      fontFamily: typography.mono,
      fontSize: 10,
      letterSpacing: 1,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    title: {
      fontFamily: typography.serifBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.ink,
      marginBottom: 4,
    },
    desc: {
      fontFamily: typography.sans,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    skeleton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      overflow: 'hidden',
      marginTop: 8,
      marginBottom: 4,
    },
    skeletonImg: {
      width: '100%',
      height: 80,
      backgroundColor: colors.surface,
    },
    skeletonLine: {
      height: 10,
      borderRadius: 2,
      backgroundColor: colors.surface,
      marginBottom: 6,
    },
    skeletonInfo: {
      padding: 12,
    },
    videoContainer: {
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 6,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    videoWebView: {
      height: 220,
      backgroundColor: colors.surface,
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    playButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    playTriangle: {
      width: 0,
      height: 0,
      borderLeftWidth: 18,
      borderTopWidth: 11,
      borderBottomWidth: 11,
      borderLeftColor: '#fff',
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      marginLeft: 4,
    },
  }), [colors]);

  const videoEmbed = url ? detectVideoEmbed(url) : null;

  if (!url) return null;
  // Only hide on error for non-video embeds; video embeds show a play button regardless
  if (error && !videoEmbed) return null;

  // Fallback OG data for video embeds when OG fetch failed
  const platformNames: Record<string, string> = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', twitch: 'Twitch', twitter: 'X (Twitter)' };
  const effectiveOgData = ogData ?? (error && videoEmbed ? {
    title: `Watch on ${platformNames[videoEmbed.platform] || 'Video'}`,
    description: null,
    image: null,
    siteName: platformNames[videoEmbed.platform] || null,
    favicon: null,
    url: url,
  } : null);

  // GIF URLs: render image directly, no OG card
  const gifUrl = url ? extractGifUrl(url) : null;
  if (gifUrl) {
    return (
      <View style={styles.card}>
        <Image source={{ uri: gifUrl }} style={{ width: '100%', height: 250 }} resizeMode="contain" />
      </View>
    );
  }

  if (loading) {
    const opacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });
    return (
      <View style={styles.skeleton}>
        <Animated.View style={[styles.skeletonImg, { opacity }]} />
        <View style={styles.skeletonInfo}>
          <Animated.View style={[styles.skeletonLine, { width: '60%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '80%', opacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: '40%', opacity }]} />
        </View>
      </View>
    );
  }

  // Twitter/X: render native embed via WebView
  if (videoEmbed?.platform === 'twitter') {
    const handleTweetHeight = (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'height' && data.height > 100 && data.height < 800) {
          setEmbedHeight(data.height);
        }
      } catch {}
    };
    return (
      <View style={[styles.videoContainer, { height: embedHeight || 350 }]}>
        <WebView
          source={{ html: buildTwitterEmbedHtml(videoEmbed.embedUrl, isDark) }}
          style={{ flex: 1, backgroundColor: isDark ? '#1a1a1a' : '#fff' }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          originWhitelist={['*']}
          mixedContentMode="always"
          scrollEnabled={false}
          onMessage={handleTweetHeight}
          userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        />
      </View>
    );
  }

  if (!effectiveOgData) return null;

  // If playing, show embedded video
  if (videoEmbed && playing) {
    // YouTube: use IFrame API with third-party baseUrl for proper origin matching
    if (videoEmbed.platform === 'youtube') {
      return (
        <View style={styles.videoContainer}>
          <WebView
            source={{ html: buildYouTubeHtml(videoEmbed.embedUrl), baseUrl: YT_PLAYER_BASE_URL }}
            style={styles.videoWebView}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            originWhitelist={['*']}
            mixedContentMode="always"
          />
        </View>
      );
    }

    // HTML wrapper approach: embed the URL in a tall iframe (2000px) inside
    // a wrapper page. The iframe gives the embed plenty of room to layout,
    // pushing comments far below. The outer RN View clips at the desired
    // height, so only the header + video are visible.
    // This avoids the Android issue where direct WebView loading renders
    // content at the clipped height, squishing everything together.

    const handleHeightMessage = (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'height' && data.height > 150 && data.height < 800) {
          setEmbedHeight(data.height);
        }
      } catch {}
    };

    function buildEmbedWrapper(embedUrl: string, ua?: string): string {
      return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:transparent}
iframe{width:100%;height:2000px;border:none}
</style></head><body>
<iframe src="${embedUrl}" scrolling="no" allowfullscreen
 allow="autoplay;encrypted-media" referrerpolicy="no-referrer-when-downgrade"></iframe>
<script>
// Listen for postMessage height events from embed (Instagram sometimes sends these)
window.addEventListener('message',function(e){
  try{
    var d=typeof e.data==='string'?JSON.parse(e.data):e.data;
    if(d&&d.details&&d.details.height){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'height',height:Math.ceil(d.details.height)}));
    }
  }catch(ex){}
});
</script></body></html>`;
    }

    // Instagram — iframe wrapper, outer View clips below video
    if (videoEmbed.platform === 'instagram') {
      const clipHeight = embedHeight || 480;
      return (
        <View style={[styles.videoContainer, { height: clipHeight }]}>
          <WebView
            source={{ html: buildEmbedWrapper(videoEmbed.embedUrl) }}
            style={{ flex: 1, backgroundColor: colors.surface }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            originWhitelist={['*']}
            mixedContentMode="always"
            scrollEnabled={false}
            onMessage={handleHeightMessage}
            userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          />
        </View>
      );
    }

    // TikTok — iframe wrapper, outer View clips below video
    if (videoEmbed.platform === 'tiktok') {
      const clipHeight = embedHeight || 500;
      return (
        <View style={[styles.videoContainer, { height: clipHeight }]}>
          <WebView
            source={{ html: buildEmbedWrapper(videoEmbed.embedUrl) }}
            style={{ flex: 1, backgroundColor: colors.surface }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            originWhitelist={['*']}
            mixedContentMode="always"
            scrollEnabled={false}
            userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            onMessage={handleHeightMessage}
          />
        </View>
      );
    }

    // Twitch — load embed URL directly
    if (videoEmbed.platform === 'twitch') {
      return (
        <View style={styles.videoContainer}>
          <WebView
            source={{ uri: videoEmbed.embedUrl }}
            style={{ height: 220, backgroundColor: colors.surface }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            allowsFullscreenVideo
            originWhitelist={['*']}
            mixedContentMode="always"
          />
        </View>
      );
    }
  }

  const displayDomain = (() => {
    try {
      return new URL(effectiveOgData.url).hostname.replace(/^www\./, '');
    } catch {
      return effectiveOgData.url;
    }
  })();

  return (
    <Pressable
      style={styles.card}
      onPress={() => {
        if (videoEmbed) {
          setPlaying(true);
        } else {
          Linking.openURL(effectiveOgData.url);
        }
      }}
    >
      {effectiveOgData.image && !imgError ? (
        <View>
          <Image
            source={{ uri: effectiveOgData.image }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
          {videoEmbed && (
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <View style={styles.playTriangle} />
              </View>
            </View>
          )}
        </View>
      ) : videoEmbed ? (
        <View style={{ height: 160, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <View style={styles.playTriangle} />
            </View>
          </View>
        </View>
      ) : null}
      <View style={styles.info}>
        <View style={styles.siteRow}>
          {effectiveOgData.favicon && (
            <Image
              source={{ uri: effectiveOgData.favicon }}
              style={styles.favicon}
              resizeMode="contain"
            />
          )}
          <Text style={styles.siteName} numberOfLines={1}>
            {effectiveOgData.siteName || displayDomain}
          </Text>
        </View>
        {effectiveOgData.title && (
          <Text style={styles.title} numberOfLines={2}>
            {effectiveOgData.title}
          </Text>
        )}
        {effectiveOgData.description && (
          <Text style={styles.desc} numberOfLines={2}>
            {effectiveOgData.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
});
