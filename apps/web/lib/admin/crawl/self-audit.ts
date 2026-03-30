import * as cheerio from 'cheerio';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface CrawledPage {
  path: string;
  status: number;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  h1Count: number;
  h1Text: string[];
  h2Count: number;
  h3Count: number;
  wordCount: number;
  imageCount: number;
  imagesWithAlt: number;
  internalLinks: number;
  externalLinks: number;
  listCount: number;
  hasCanonical: boolean;
  hasOgImage: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasLang: boolean;
  hasOrganizationSchema: boolean;
  hasBreadcrumbSchema: boolean;
  hasFAQSchema: boolean;
  hasHowToSchema: boolean;
  schemaTypes: string[];
  loadTime: number;
  hasSpeakable: boolean;
  questionHeadings: number;
}

export interface AuditIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  affectedPages: string[];
}

export interface SelfAuditResult {
  pages: CrawledPage[];
  crawledAt: string;
  siteUrl: string;
  totalPages: number;
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  croScore: number;
  technicalScore: number;
  contentScore: number;
  issues: AuditIssue[];
}

/* -------------------------------------------------------------------------- */
/*  Pages to crawl                                                            */
/* -------------------------------------------------------------------------- */

const PAGES_TO_CRAWL = [
  '/',
  '/feed',
  '/rivalry',
  '/portal',
  '/predictions',
  '/war-room',
  '/mascot-wars',
  '/recruiting',
  '/dynasty',
  '/hall-of-fame',
  '/vault',
  '/login',
  '/register',
];

/* -------------------------------------------------------------------------- */
/*  Fetch + parse one page                                                    */
/* -------------------------------------------------------------------------- */

async function crawlPage(baseUrl: string, path: string): Promise<CrawledPage> {
  const url = `${baseUrl}${path}`;
  const start = Date.now();

  let status = 0;
  let html = '';

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CFBSocial-SelfAudit/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    html = await res.text();
  } catch {
    return emptyPage(path, 0, Date.now() - start);
  }

  const loadTime = Date.now() - start;
  const $ = cheerio.load(html);

  // Title
  const title = $('title').first().text().trim();

  // Meta description
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() ?? '';

  // Headings
  const h1Elements = $('h1');
  const h1Text: string[] = [];
  h1Elements.each((_, el) => { h1Text.push($(el).text().trim()); });

  const h2Count = $('h2').length;
  const h3Count = $('h3').length;

  // Word count (visible text)
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  // Images
  const images = $('img');
  let imagesWithAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt && alt.trim().length > 0) imagesWithAlt++;
  });

  // Links
  let internalLinks = 0;
  let externalLinks = 0;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.startsWith('/') || href.startsWith(baseUrl)) {
      internalLinks++;
    } else if (href.startsWith('http')) {
      externalLinks++;
    }
  });

  // Lists
  const listCount = $('ul, ol').length;

  // Canonical
  const hasCanonical = $('link[rel="canonical"]').length > 0;

  // OG tags
  const hasOgImage = $('meta[property="og:image"]').attr('content')?.trim() !== undefined;
  const hasOgTitle = $('meta[property="og:title"]').attr('content')?.trim() !== undefined;
  const hasOgDescription = $('meta[property="og:description"]').attr('content')?.trim() !== undefined;

  // Lang
  const hasLang = !!$('html').attr('lang');

  // Schema.org (JSON-LD)
  const schemaTypes: string[] = [];
  let hasOrganizationSchema = false;
  let hasBreadcrumbSchema = false;
  let hasFAQSchema = false;
  let hasHowToSchema = false;
  let hasSpeakable = false;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? '{}');
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const type = item['@type'];
        if (type) {
          const types = Array.isArray(type) ? type : [type];
          for (const t of types) {
            if (!schemaTypes.includes(t)) schemaTypes.push(t);
            if (t === 'Organization') hasOrganizationSchema = true;
            if (t === 'BreadcrumbList') hasBreadcrumbSchema = true;
            if (t === 'FAQPage') hasFAQSchema = true;
            if (t === 'HowTo') hasHowToSchema = true;
          }
        }
        if (item.speakable) hasSpeakable = true;
      }
    } catch {
      // ignore invalid JSON-LD
    }
  });

  // Question headings (h2/h3 containing ?)
  let questionHeadings = 0;
  $('h2, h3').each((_, el) => {
    const text = $(el).text();
    if (text.includes('?')) questionHeadings++;
  });

  return {
    path,
    status,
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    h1Count: h1Elements.length,
    h1Text,
    h2Count,
    h3Count,
    wordCount,
    imageCount: images.length,
    imagesWithAlt,
    internalLinks,
    externalLinks,
    listCount,
    hasCanonical,
    hasOgImage,
    hasOgTitle,
    hasOgDescription,
    hasLang,
    hasOrganizationSchema,
    hasBreadcrumbSchema,
    hasFAQSchema,
    hasHowToSchema,
    schemaTypes,
    loadTime,
    hasSpeakable,
    questionHeadings,
  };
}

function emptyPage(path: string, status: number, loadTime: number): CrawledPage {
  return {
    path,
    status,
    title: '',
    titleLength: 0,
    metaDescription: '',
    metaDescriptionLength: 0,
    h1Count: 0,
    h1Text: [],
    h2Count: 0,
    h3Count: 0,
    wordCount: 0,
    imageCount: 0,
    imagesWithAlt: 0,
    internalLinks: 0,
    externalLinks: 0,
    listCount: 0,
    hasCanonical: false,
    hasOgImage: false,
    hasOgTitle: false,
    hasOgDescription: false,
    hasLang: false,
    hasOrganizationSchema: false,
    hasBreadcrumbSchema: false,
    hasFAQSchema: false,
    hasHowToSchema: false,
    schemaTypes: [],
    loadTime,
    hasSpeakable: false,
    questionHeadings: 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  Scoring                                                                   */
/* -------------------------------------------------------------------------- */

function computeSeoScore(pages: CrawledPage[]): number {
  if (pages.length === 0) return 0;
  let score = 0;
  const total = pages.length;

  for (const p of pages) {
    let pageScore = 0;
    if (p.status === 200) pageScore += 20;
    if (p.titleLength >= 30 && p.titleLength <= 60) pageScore += 20;
    else if (p.titleLength > 0) pageScore += 10;
    if (p.metaDescriptionLength >= 70 && p.metaDescriptionLength <= 160) pageScore += 20;
    else if (p.metaDescriptionLength > 0) pageScore += 10;
    if (p.h1Count === 1) pageScore += 15;
    if (p.hasCanonical) pageScore += 10;
    if (p.hasOgImage) pageScore += 15;
    score += pageScore;
  }

  return Math.round(score / total);
}

function computeTechnicalScore(pages: CrawledPage[]): number {
  if (pages.length === 0) return 0;
  let score = 0;
  const total = pages.length;

  for (const p of pages) {
    let pageScore = 0;
    if (p.status === 200) pageScore += 15;
    if (p.h1Count === 1) pageScore += 15;
    if (p.hasCanonical) pageScore += 15;
    if (p.schemaTypes.length > 0) pageScore += 15;
    if (p.hasOgImage) pageScore += 10;
    if (p.hasLang) pageScore += 10;
    if (p.loadTime < 3000) pageScore += 10;
    if (p.imageCount === 0 || p.imagesWithAlt === p.imageCount) pageScore += 10;
    score += pageScore;
  }

  return Math.round(score / total);
}

function computeContentScore(pages: CrawledPage[]): number {
  if (pages.length === 0) return 0;
  let score = 0;
  const total = pages.length;

  for (const p of pages) {
    let pageScore = 0;
    if (p.wordCount >= 300) pageScore += 25;
    else if (p.wordCount >= 100) pageScore += 15;
    if (p.h2Count > 0) pageScore += 20;
    if (p.h3Count > 0) pageScore += 10;
    if (p.listCount > 0) pageScore += 15;
    if (p.imageCount > 0) pageScore += 15;
    if (p.internalLinks > 0) pageScore += 15;
    score += pageScore;
  }

  return Math.round(score / total);
}

function computeAeoScore(pages: CrawledPage[]): number {
  if (pages.length === 0) return 0;
  let score = 0;
  const total = pages.length;

  for (const p of pages) {
    let pageScore = 0;
    if (p.schemaTypes.length > 0) pageScore += 20;
    if (p.hasFAQSchema) pageScore += 20;
    if (p.questionHeadings > 0) pageScore += 15;
    if (p.hasSpeakable) pageScore += 15;
    if (p.listCount > 0) pageScore += 15;
    if (p.hasHowToSchema) pageScore += 15;
    score += pageScore;
  }

  return Math.round(score / total);
}

function computeGeoScore(pages: CrawledPage[]): number {
  if (pages.length === 0) return 0;
  let score = 0;
  const total = pages.length;

  for (const p of pages) {
    let pageScore = 0;
    if (p.schemaTypes.length > 0) pageScore += 20;
    if (p.hasOgImage && p.hasOgTitle && p.hasOgDescription) pageScore += 20;
    else if (p.hasOgImage || p.hasOgTitle) pageScore += 10;
    if (p.wordCount >= 500) pageScore += 20;
    if (p.hasBreadcrumbSchema) pageScore += 15;
    if (p.hasLang) pageScore += 10;
    if (p.hasOrganizationSchema) pageScore += 15;
    score += pageScore;
  }

  return Math.round(score / total);
}

function computeCroScore(pages: CrawledPage[]): number {
  if (pages.length === 0) return 0;
  let score = 0;
  const total = pages.length;

  for (const p of pages) {
    let pageScore = 0;
    if (p.loadTime < 2000) pageScore += 30;
    else if (p.loadTime < 4000) pageScore += 15;
    if (p.status === 200) pageScore += 20;
    if (p.internalLinks > 0) pageScore += 20;
    if (p.titleLength >= 30 && p.titleLength <= 60) pageScore += 15;
    if (p.metaDescriptionLength >= 70 && p.metaDescriptionLength <= 160) pageScore += 15;
    score += pageScore;
  }

  return Math.round(score / total);
}

/* -------------------------------------------------------------------------- */
/*  Issues                                                                    */
/* -------------------------------------------------------------------------- */

function detectIssues(pages: CrawledPage[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Missing titles
  const missingTitle = pages.filter((p) => p.titleLength === 0).map((p) => p.path);
  if (missingTitle.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'SEO',
      title: 'Pages missing title tag',
      description: 'Title tags are essential for search engine ranking and click-through rates. Add unique, descriptive titles to these pages.',
      affectedPages: missingTitle,
    });
  }

  // Title too long / too short
  const titleBad = pages.filter((p) => p.titleLength > 0 && (p.titleLength < 30 || p.titleLength > 60)).map((p) => p.path);
  if (titleBad.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'SEO',
      title: 'Title length not optimal (should be 30-60 characters)',
      description: 'Titles should be between 30 and 60 characters for best display in search results.',
      affectedPages: titleBad,
    });
  }

  // Missing meta description
  const missingMeta = pages.filter((p) => p.metaDescriptionLength === 0).map((p) => p.path);
  if (missingMeta.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'SEO',
      title: 'Pages missing meta description',
      description: 'Meta descriptions improve click-through rates from search results. Add descriptive meta descriptions to each page.',
      affectedPages: missingMeta,
    });
  }

  // Missing H1
  const missingH1 = pages.filter((p) => p.h1Count === 0).map((p) => p.path);
  if (missingH1.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'Technical',
      title: 'Pages missing H1 heading',
      description: 'Every page should have exactly one H1 tag that describes the page content.',
      affectedPages: missingH1,
    });
  }

  // Multiple H1
  const multiH1 = pages.filter((p) => p.h1Count > 1).map((p) => p.path);
  if (multiH1.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Technical',
      title: 'Pages with multiple H1 tags',
      description: 'Use only one H1 per page for clear document structure.',
      affectedPages: multiH1,
    });
  }

  // No OG image
  const noOg = pages.filter((p) => !p.hasOgImage).map((p) => p.path);
  if (noOg.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'SEO',
      title: 'Pages missing Open Graph image',
      description: 'OG images are used when pages are shared on social media. Add og:image meta tags.',
      affectedPages: noOg,
    });
  }

  // No schema / structured data
  const noSchema = pages.filter((p) => p.schemaTypes.length === 0).map((p) => p.path);
  if (noSchema.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'GEO',
      title: 'Pages without structured data (JSON-LD)',
      description: 'Schema.org structured data helps search engines and AI understand your content.',
      affectedPages: noSchema,
    });
  }

  // No canonical
  const noCanonical = pages.filter((p) => !p.hasCanonical).map((p) => p.path);
  if (noCanonical.length > 0) {
    issues.push({
      severity: 'info',
      category: 'Technical',
      title: 'Pages without canonical URL',
      description: 'Canonical URLs prevent duplicate content issues.',
      affectedPages: noCanonical,
    });
  }

  // Slow pages
  const slowPages = pages.filter((p) => p.loadTime > 4000).map((p) => p.path);
  if (slowPages.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'CRO',
      title: 'Slow-loading pages (>4 seconds)',
      description: 'Pages taking more than 4 seconds to load significantly hurt user experience and conversion rates.',
      affectedPages: slowPages,
    });
  }

  // Thin content
  const thinContent = pages.filter((p) => p.wordCount < 300 && p.status === 200).map((p) => p.path);
  if (thinContent.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Content',
      title: 'Thin content pages (<300 words)',
      description: 'Pages with less than 300 words may not rank well. Add meaningful content to these pages.',
      affectedPages: thinContent,
    });
  }

  // No lang attribute
  const noLang = pages.filter((p) => !p.hasLang).map((p) => p.path);
  if (noLang.length > 0) {
    issues.push({
      severity: 'info',
      category: 'Technical',
      title: 'Pages without lang attribute',
      description: 'The lang attribute helps search engines and assistive technologies understand the page language.',
      affectedPages: noLang,
    });
  }

  // No FAQ schema (AEO)
  const noFaq = pages.filter((p) => !p.hasFAQSchema && p.status === 200).map((p) => p.path);
  if (noFaq.length > 0) {
    issues.push({
      severity: 'info',
      category: 'AEO',
      title: 'Pages without FAQ schema',
      description: 'FAQ schema can help your content appear in featured snippets and voice search results.',
      affectedPages: noFaq,
    });
  }

  // Images without alt
  const badImages = pages.filter((p) => p.imageCount > 0 && p.imagesWithAlt < p.imageCount).map((p) => p.path);
  if (badImages.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Technical',
      title: 'Images missing alt text',
      description: 'All images should have descriptive alt attributes for accessibility and SEO.',
      affectedPages: badImages,
    });
  }

  // Non-200 status
  const errorPages = pages.filter((p) => p.status !== 200).map((p) => p.path);
  if (errorPages.length > 0) {
    issues.push({
      severity: 'critical',
      category: 'Technical',
      title: 'Pages returning non-200 status codes',
      description: 'These pages are not returning a successful HTTP response. Check for broken routes or server errors.',
      affectedPages: errorPages,
    });
  }

  return issues.sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}

/* -------------------------------------------------------------------------- */
/*  Main crawler                                                              */
/* -------------------------------------------------------------------------- */

export async function crawlOwnSite(): Promise<SelfAuditResult> {
  const siteUrl = process.env.WEB_APP_URL ?? 'http://localhost:4200';

  const pages = await Promise.all(
    PAGES_TO_CRAWL.map((path) => crawlPage(siteUrl, path)),
  );

  const issues = detectIssues(pages);

  return {
    pages,
    crawledAt: new Date().toISOString(),
    siteUrl,
    totalPages: pages.length,
    seoScore: computeSeoScore(pages),
    technicalScore: computeTechnicalScore(pages),
    contentScore: computeContentScore(pages),
    aeoScore: computeAeoScore(pages),
    geoScore: computeGeoScore(pages),
    croScore: computeCroScore(pages),
    issues,
  };
}
