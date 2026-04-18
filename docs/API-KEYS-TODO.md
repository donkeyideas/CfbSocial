# API Keys — Pending Setup

> **TL;DR** — All provider code is deployed and works. Every key below is **optional**. Features behind missing keys gracefully return `null`/`[]` and simply don't render. The app works identically to pre-integration state until you add keys.

---

## ✅ Already configured

| Provider | Key | What it unlocks |
|---|---|---|
| CFBD | `CFBD_API_KEY` | Recruiting class badges on `/recruiting`, SP+ rankings in bot context |
| NewsAPI | `NEWSAPI_KEY` | General CFB news headlines injected into bot prompts |

Both are in Vercel + local `.env.local`. ✅

---

## 🟡 Pending — add when you have time

All of these require the same 3 steps:
1. Get key from the provider's site (links below)
2. Add env var(s) to **Vercel → Settings → Environment Variables** (All Environments)
3. Add same env var(s) to local `.env.local` + `apps/web/.env.local`
4. Redeploy on Vercel

### 1. Reddit — bot content boost (r/CFB buzz)

- **Site**: https://www.reddit.com/prefs/apps
- **How**: Click *create another app* → select **script** → name `cfbsocial` → redirect URI `https://www.cfbsocial.com/` (unused but required) → create
- **Env vars (3)**:
  ```
  REDDIT_CLIENT_ID=<short string under app name>
  REDDIT_CLIENT_SECRET=<the secret field>
  REDDIT_USER_AGENT=cfbsocial/1.0 (by /u/Alarming_Mixture_797)
  ```
- **Unlocks**: Bot takes will cite "r/CFB is buzzing about..." topics
- **Notes**: Script type uses client-credentials OAuth — no user login ever happens

### 2. YouTube — school hub highlights

- **Site**: https://console.cloud.google.com/apis/credentials
- **How**: Create project → Enable "YouTube Data API v3" → Create API key
- **Env var**: `YOUTUBE_API_KEY=<key>`
- **Unlocks**: Top 5 recent highlight videos on each `/school/[slug]` page
- **Limit**: 10,000 units/day (100 searches) — mitigated by 2-hour cache per team

### 3. Giphy — GIF picker in composer

- **Site**: https://developers.giphy.com/dashboard
- **How**: Click **Create an API Key** → pick **API** (NOT SDK) → name `CFB Social` → description any
- **Env var**: `GIPHY_API_KEY=<key>`
- **Unlocks**: "GIF" button in post composer; picker with search + inline preview

### 4. OpenWeather — War Room weather fallback

- **Site**: https://openweathermap.org/api
- **How**: Sign up → API Keys tab → copy key
- **Env var**: `OPENWEATHER_API_KEY=<key>`
- **Unlocks**: Weather badge fallback when NWS fails (non-US stadiums, outages)
- **Notes**: NWS works without any key for US games — this is purely a fallback

### 5. Perspective — supplemental moderation

- **Site**: https://console.cloud.google.com/apis/credentials
- **How**: In your Google Cloud project → Enable "Perspective Comment Analyzer API" → use existing API key or create new
- **Env var**: `PERSPECTIVE_API_KEY=<key>`
- **Unlocks**: Toxicity scoring merged with DeepSeek moderation; most-severe-action wins
- **Limit**: 1 QPS free tier — serialized + 60s cache handles this

### 6. Cloudflare Turnstile — CAPTCHA

- **Site**: https://dash.cloudflare.com/?to=/:account/turnstile
- **How**: Add site → domain `cfbsocial.com` → get site key + secret key
- **Env vars (2)**:
  ```
  NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>
  TURNSTILE_SECRET_KEY=<secret key>
  ```
- **Unlocks**: CAPTCHA challenge on Register form + Report modal (spam prevention)
- **Notes**: `NEXT_PUBLIC_` prefix is intentional — that one ships to the browser

### 7. Resend — transactional email

- **Site**: https://resend.com/api-keys
- **How**: Sign up → verify a domain (cfbsocial.com) → create API key
- **Env vars (2)**:
  ```
  RESEND_API_KEY=<key>
  RESEND_FROM_EMAIL=no-reply@cfbsocial.com
  ```
- **Unlocks**: Welcome email after signup + appeal outcome emails
- **Limit**: 3000 emails/month free

### 8. Groq — alt AI provider (fast + free)

- **Site**: https://console.groq.com/keys
- **How**: Sign in → Create API Key
- **Env var**: `GROQ_API_KEY=<key>`
- **Unlocks**: Nothing by itself — becomes useful when combined with Gemini + AI_PROVIDER_WEIGHTS (see below)

### 9. Gemini — alt AI provider (free Flash)

- **Site**: https://aistudio.google.com/apikey
- **How**: Get API Key → copy
- **Env var**: `GEMINI_API_KEY=<key>`
- **Unlocks**: Nothing by itself — useful with AI_PROVIDER_WEIGHTS below

### 10. AI Provider Router — enable fallthrough

Once any of Groq/Gemini keys are set, opt in via:
```
AI_PROVIDER_WEIGHTS=deepseek:70,groq:20,gemini:10
```
- Percentages of traffic per provider, router picks weighted-random
- On error, automatically falls through to next provider in descending weight order
- **Default unset** = 100% DeepSeek (current behavior, zero change)
- Daily cap ($0.50/500 calls) is shared across all providers — no way to bypass

---

## 🧪 Verification after adding any key

| Provider | How to confirm |
|---|---|
| Reddit | Admin → bot cycle → new `ai_interactions` row should mention "r/CFB" in prompt |
| YouTube | Visit `/school/alabama` → sidebar shows highlight thumbnails |
| Giphy | Composer → **GIF** button → search works → picked GIF renders inline |
| OpenWeather | War Room for non-US game (if any) → weather badge shows |
| Perspective | Post deliberately toxic content → moderation log shows `perspective_*` labels |
| Turnstile | Register form → CAPTCHA challenge appears |
| Resend | Register → welcome email arrives at registered address |
| Groq/Gemini | With AI_PROVIDER_WEIGHTS set, check `ai_interactions.provider` column shows mix |

---

## 🛡️ Graceful degradation guarantee

Every provider starts with:
```ts
if (!process.env.X_API_KEY) return null;  // or []
```

**What happens if you never add any of the above keys?**
- Everything works today, with ESPN + DeepSeek + CFBD + NewsAPI only
- UI surfaces behind missing providers simply don't render (no crash)
- You can add them one at a time over weeks/months with zero downtime

---

## 📍 Reference

- Plan: `C:\Users\beltr\.claude\plans\functional-leaping-frost.md`
- Commit: `82ca63b` on `main`
- Provider modules: [apps/web/lib/providers/](../apps/web/lib/providers/)
- AI router: [apps/web/lib/admin/ai/router.ts](../apps/web/lib/admin/ai/router.ts)
