# Mobile Embed Issues - Status Report

## File: `apps/mobile/components/posts/LinkPreview.tsx`

---

## SOLVED Issues

### 1. React DevTools "Rendered fewer hooks than expected" Error
- **Problem**: Hooks were called conditionally (early returns before all hooks ran)
- **Fix**: Moved all hooks (`useState`, `useEffect`, `useMemo`) above every early return
- **Status**: FIXED

### 2. Web - Post Text Selection / Copy-Paste
- **Problem**: Post text was wrapped in `<Link>` tags, preventing text selection
- **Fix**: Removed `<Link>` wrappers, added `onClick` handler on card wrapper that checks for text selection before navigating. Added `user-select: text` CSS to post body elements.
- **Files**: `apps/web/components/feed/PostCard.tsx`, `apps/web/app/globals.css`
- **Status**: FIXED

### 3. Web - Dark Mode Text Readability
- **Problem**: School colors (used for text) were invisible on dark backgrounds
- **Fix**: Added color contrast utility, hover states use school secondary color (gold) in dark mode
- **Files**: `apps/web/app/globals.css`, `apps/web/lib/utils/colorContrast.ts`
- **Status**: FIXED

---

## UNSOLVED Issues

### 4. Mobile - Instagram/TikTok Embed White Space Below Content
- **Problem**: Instagram and TikTok embeds have massive white/empty space below the actual content. The embeds are loaded in a WebView with fixed heights (Instagram: 480px, TikTok: 680px), but the actual content is shorter, leaving blank space.
- **Root Cause**: WebView requires a fixed `height` style. The actual embed content height varies per post. `scrollHeight` measurement doesn't work because it reports the container height, not the content height. Cross-origin iframe restrictions prevent measuring the inner content.
- **Attempts Made**:
  1. `AutoHeightEmbed` component using `injectedJavaScript` to measure `scrollHeight` - did not work (scrollHeight fills to container)
  2. iframe wrapper with `postMessage` height listener - did not work (cross-origin blocks measurement, events don't fire reliably)
  3. Reduced fixed heights from 700 to 480/680 - improved slightly but still has excess space
- **Current State**: Using iframe wrappers with fixed heights (Instagram: 480px, TikTok: 680px). White space still present.
- **Possible Solutions to Explore**:
  - Platform-specific oEmbed `html` field parsing to extract actual dimensions
  - Using the oEmbed thumbnail as a static preview card instead of embedding (sacrifices inline playback)
  - React Native `onMessage` with a more sophisticated content-height detection script
  - Using `react-native-autoheight-webview` package

### 5. Mobile - Instagram/TikTok White Background in Dark Mode
- **Problem**: When the app is in dark mode, Instagram and TikTok embeds render with white backgrounds that clash with the dark theme.
- **Root Cause**: The embed pages (instagram.com/p/.../embed, tiktok.com/embed/v2/...) have their own white CSS backgrounds. Since they load inside a cross-origin iframe, CSS cannot be injected from outside to override them.
- **Attempts Made**:
  1. Set `backgroundColor` on WebView wrapper to `colors.surface` - only affects the container, not the iframe content
  2. Direct WebView loading (no iframe) with `injectedJavaScript` CSS injection - broke video playback entirely
  3. iframe wrapper with body background set to `colors.surface` - only affects the wrapper page background, not the inner iframe
- **Current State**: Using iframe wrappers. The wrapper page background matches dark theme, but the Instagram/TikTok embed content inside the iframe is still white.
- **Key Constraint**: Cross-origin iframes cannot have their styles modified from the parent. Instagram and TikTok do not offer dark-mode embed parameters.
- **Possible Solutions to Explore**:
  - CSS `filter: invert(1) hue-rotate(180deg)` on the iframe (inverts colors to approximate dark mode, but distorts images/videos)
  - Overlay a semi-transparent dark tint on the non-video portions
  - Use oEmbed thumbnail as a static OG card (no white background, but loses inline playback)
  - Check if Instagram/TikTok offer any embed URL parameters for dark theme

### 6. Mobile - TikTok Player Reliability
- **Problem**: TikTok embeds sometimes load and sometimes don't. The player is inconsistent.
- **Root Cause**: TikTok embed pages are unreliable in mobile WebViews. They sometimes fail to load or get blocked. TikTok may detect non-browser user agents or apply rate limiting.
- **Attempts Made**:
  1. Added custom `userAgent` string mimicking Chrome Android - improved but not 100% reliable
  2. Added `scrollEnabled` and `allow="autoplay"` attributes
- **Current State**: Using iframe wrapper with custom user agent. Works most of the time but occasionally fails.
- **Possible Solutions to Explore**:
  - Fallback to OG preview card if WebView fails to load within N seconds (onError/onHttpError handler)
  - Try TikTok's official embed SDK script instead of iframe
  - Use `vm.tiktok.com` short URLs with redirect following
  - Add retry logic with loading indicator

---

## Current Architecture

```
LinkPreview.tsx flow:
1. Extract first URL from post content
2. Check if it's a GIF -> render Image directly
3. Check if it's a video embed (YouTube/Instagram/TikTok/Twitch)
4. Fetch OG data (oEmbed API for YouTube/Instagram/TikTok, HTML scraping for others)
5. Show OG preview card with play button overlay for video embeds
6. On press: video embeds -> setPlaying(true) -> render WebView; links -> Linking.openURL()

WebView rendering by platform:
- YouTube: Custom HTML with IFrame API (works well)
- Instagram: iframe wrapper HTML, height 480px
- TikTok: iframe wrapper HTML, height 680px, custom userAgent
- Twitch: Direct URL loading, height 220px
```

## Key Files
- `apps/mobile/components/posts/LinkPreview.tsx` - Main embed component
- `apps/mobile/lib/theme/ThemeProvider.tsx` - Theme colors (`useColors()`)
- `apps/web/components/feed/PostCard.tsx` - Web post card (text selection fix applied)
- `apps/web/app/globals.css` - Web styles (dark mode hover fix applied)
