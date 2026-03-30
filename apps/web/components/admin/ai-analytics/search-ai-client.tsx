'use client';

import { useState } from 'react';
import {
  BarChart3,
  FileText,
  Wrench,
  Globe2,
  Lightbulb,
  Search,
  MessageSquare,
  Target,
  Check,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { StatCard } from '@/components/admin/shared/stat-card';
import { ChartWrapper } from '@/components/admin/shared/chart-wrapper';
import { getChartConfig, SERIES_COLORS } from '@/lib/admin/utils/chart-theme';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import type { SelfAuditResult, CrawledPage } from '@/lib/admin/crawl/self-audit';

/* ── Tabs ──────────────────────────────────────────────────────── */

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'technical', label: 'Technical', icon: Wrench },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'geo', label: 'GEO', icon: Globe2 },
  { id: 'site-health', label: 'Site Health', icon: Search },
  { id: 'aeo', label: 'AEO', icon: MessageSquare },
  { id: 'cro', label: 'CRO', icon: Target },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ── Props ─────────────────────────────────────────────────────── */

interface Props {
  audit: SelfAuditResult;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function ScoreGauge({ label, score, color }: { label: string; score: number; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--admin-border)" strokeWidth="6" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="font-mono text-2xl font-bold text-[var(--admin-text)]">{score}</span>
      <span className="text-[10px] uppercase tracking-widest text-[var(--admin-text-muted)]">{label}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  const styles = {
    critical: 'text-[var(--admin-error)]',
    warning: 'text-[var(--admin-warning)]',
    info: 'text-[var(--admin-info)]',
  };

  return (
    <span className={`text-xs font-semibold uppercase ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function MetaLengthBadge({ length, min, max }: { length: number; min: number; max: number }) {
  if (length === 0) return <span className="text-xs font-semibold text-[var(--admin-error)]">Missing</span>;
  if (length < min) return <span className="text-xs font-semibold text-[var(--admin-warning)]">{length} (short)</span>;
  if (length > max) return <span className="text-xs font-semibold text-[var(--admin-warning)]">{length} (long)</span>;
  return <span className="text-xs font-semibold text-[var(--admin-success)]">{length}</span>;
}

function BoolBadge({ value, yes = 'Yes', no = 'No' }: { value: boolean; yes?: string; no?: string }) {
  return value ? (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--admin-success)]">
      <Check className="h-3 w-3" />{yes}
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--admin-error)]">
      <X className="h-3 w-3" />{no}
    </span>
  );
}

function ProgressBar({ value, max = 100, color = 'bg-[var(--admin-success)]' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--admin-border)]">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="admin-card p-12 text-center">
      <p className="text-lg font-semibold text-[var(--admin-text)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--admin-text-muted)]">{description}</p>
    </div>
  );
}

const TH = 'pb-2 text-[10px] uppercase tracking-widest text-[var(--admin-text-muted)] font-medium text-left';

/* ── Main Component ────────────────────────────────────────────── */

export function SearchAIClient({ audit }: Props) {
  const [tab, setTab] = useState<TabId>('overview');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const cfg = getChartConfig();

  const pages = audit.pages;
  const issues = audit.issues;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Search & AI Analytics</h1>
        <p className="mt-1 text-sm text-[var(--admin-text-secondary)]" suppressHydrationWarning>
          Self-audit of {audit.siteUrl} &mdash; {audit.totalPages} pages crawled at{' '}
          {new Date(audit.crawledAt).toLocaleString()}
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--admin-border)] pb-px">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors -mb-px ${
                tab === t.id
                  ? 'border-[var(--admin-accent)] text-[var(--admin-accent-light)]'
                  : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {tab === 'overview' && <OverviewTab audit={audit} />}
      {tab === 'pages' && <PagesTab pages={pages} />}
      {tab === 'technical' && <TechnicalTab pages={pages} />}
      {tab === 'content' && <ContentTab pages={pages} />}
      {tab === 'geo' && <GeoTab pages={pages} geoScore={audit.geoScore} />}
      {tab === 'site-health' && <SiteHealthTab pages={pages} audit={audit} />}
      {tab === 'aeo' && <AeoTab pages={pages} aeoScore={audit.aeoScore} />}
      {tab === 'cro' && <CroTab pages={pages} croScore={audit.croScore} />}
      {tab === 'recommendations' && (
        <RecommendationsTab issues={issues} severityFilter={severityFilter} setSeverityFilter={setSeverityFilter} />
      )}
    </div>
  );
}

/* ================================================================
   TAB 1: Overview
   ================================================================ */

function OverviewTab({ audit }: { audit: SelfAuditResult }) {
  const cfg = getChartConfig();
  const radarData = [
    { subject: 'SEO', score: audit.seoScore },
    { subject: 'Technical', score: audit.technicalScore },
    { subject: 'Content', score: audit.contentScore },
    { subject: 'AEO', score: audit.aeoScore },
    { subject: 'GEO', score: audit.geoScore },
    { subject: 'CRO', score: audit.croScore },
  ];

  const criticals = audit.issues.filter((i) => i.severity === 'critical').length;
  const warnings = audit.issues.filter((i) => i.severity === 'warning').length;
  const infos = audit.issues.filter((i) => i.severity === 'info').length;

  return (
    <div className="space-y-6">
      {/* Score Gauges */}
      <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
        <ScoreGauge label="SEO" score={audit.seoScore} color="#27ae60" />
        <ScoreGauge label="Technical" score={audit.technicalScore} color="#2980b9" />
        <ScoreGauge label="Content" score={audit.contentScore} color="#8e44ad" />
        <ScoreGauge label="AEO" score={audit.aeoScore} color="#d35400" />
        <ScoreGauge label="GEO" score={audit.geoScore} color="#16a085" />
        <ScoreGauge label="CRO" score={audit.croScore} color="#c0392b" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Radar Chart */}
        <ChartWrapper title="Score Radar">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid strokeDasharray="3 3" stroke={cfg.gridColor} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: cfg.axisColor }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: cfg.axisColor }} />
              <Radar dataKey="score" stroke="#27ae60" fill="#27ae60" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        {/* Issue Summary */}
        <div className="admin-card p-6 space-y-4">
          <h3 className="text-base font-semibold">Health Summary</h3>

          <div className="flex items-center justify-between rounded border border-[var(--admin-border)] p-3">
            <span className="text-sm">Pages Crawled</span>
            <span className="font-mono font-bold">{audit.totalPages}</span>
          </div>
          <div className="flex items-center justify-between rounded border border-[var(--admin-error)]/30 bg-[var(--admin-error)]/5 p-3">
            <span className="text-sm text-[var(--admin-error)]">Critical Issues</span>
            <span className="font-mono font-bold text-[var(--admin-error)]">{criticals}</span>
          </div>
          <div className="flex items-center justify-between rounded border border-[var(--admin-warning)]/30 bg-[var(--admin-warning)]/5 p-3">
            <span className="text-sm text-[var(--admin-warning)]">Warnings</span>
            <span className="font-mono font-bold text-[var(--admin-warning)]">{warnings}</span>
          </div>
          <div className="flex items-center justify-between rounded border border-[var(--admin-info)]/30 bg-[var(--admin-info)]/5 p-3">
            <span className="text-sm text-[var(--admin-info)]">Info</span>
            <span className="font-mono font-bold text-[var(--admin-info)]">{infos}</span>
          </div>

          <div className="space-y-2 pt-4">
            <p className="text-[10px] uppercase tracking-widest text-[var(--admin-text-muted)]">Quick Wins</p>
            {audit.issues.filter((i) => i.severity === 'critical').slice(0, 3).map((issue) => (
              <div key={issue.title} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-error)]" />
                <span>{issue.title}</span>
              </div>
            ))}
            {criticals === 0 && (
              <p className="flex items-center gap-1 text-sm text-[var(--admin-success)]">
                <Check className="h-4 w-4" /> No critical issues found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   TAB 2: Pages
   ================================================================ */

function PagesTab({ pages }: { pages: CrawledPage[] }) {
  if (pages.length === 0) return <EmptyState title="No Pages Crawled" description="The self-crawler didn't find any pages." />;

  return (
    <div className="admin-card overflow-hidden">
      <div className="p-6">
        <h3 className="text-base font-semibold">Page Meta Audit</h3>
      </div>
      <div className="overflow-x-auto px-6 pb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border)]">
              <th className={TH}>Path</th>
              <th className={TH}>Status</th>
              <th className={TH}>Title</th>
              <th className={TH}>Meta Desc</th>
              <th className={TH}>H1</th>
              <th className={TH}>Schema</th>
              <th className={TH}>OG Image</th>
              <th className={TH}>Load Time</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.path} className="border-b border-[var(--admin-border)]/50">
                <td className="py-2 font-mono text-xs">{p.path}</td>
                <td className="py-2">
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                    p.status === 200 ? 'bg-green-900/30 text-[var(--admin-success)]' : 'bg-red-900/30 text-[var(--admin-error)]'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-2"><MetaLengthBadge length={p.titleLength} min={30} max={60} /></td>
                <td className="py-2"><MetaLengthBadge length={p.metaDescriptionLength} min={70} max={160} /></td>
                <td className="py-2">
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                    p.h1Count === 1 ? 'bg-green-900/30 text-[var(--admin-success)]' : p.h1Count === 0 ? 'bg-red-900/30 text-[var(--admin-error)]' : 'bg-yellow-900/30 text-[var(--admin-warning)]'
                  }`}>
                    {p.h1Count} H1{p.h1Count !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="py-2"><BoolBadge value={p.schemaTypes.length > 0} yes={p.schemaTypes.join(', ')} no="None" /></td>
                <td className="py-2"><BoolBadge value={p.hasOgImage} /></td>
                <td className="py-2">
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                    p.loadTime < 2000 ? 'bg-green-900/30 text-[var(--admin-success)]' : p.loadTime < 4000 ? 'bg-yellow-900/30 text-[var(--admin-warning)]' : 'bg-red-900/30 text-[var(--admin-error)]'
                  }`}>
                    {(p.loadTime / 1000).toFixed(1)}s
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================
   TAB 3: Technical
   ================================================================ */

function TechnicalTab({ pages }: { pages: CrawledPage[] }) {
  const cfg = getChartConfig();
  const n = pages.length || 1;
  const checks = [
    { label: '200 Status Codes', count: pages.filter((p) => p.status === 200).length, total: n },
    { label: 'Single H1 Tag', count: pages.filter((p) => p.h1Count === 1).length, total: n },
    { label: 'Canonical URL Set', count: pages.filter((p) => p.hasCanonical).length, total: n },
    { label: 'Structured Data (JSON-LD)', count: pages.filter((p) => p.schemaTypes.length > 0).length, total: n },
    { label: 'OG Image Present', count: pages.filter((p) => p.hasOgImage).length, total: n },
    { label: 'Lang Attribute Set', count: pages.filter((p) => p.hasLang).length, total: n },
    { label: 'Fast Load (<3s)', count: pages.filter((p) => p.loadTime < 3000).length, total: n },
    { label: 'All Images Have Alt', count: pages.filter((p) => p.imageCount === 0 || p.imagesWithAlt === p.imageCount).length, total: n },
  ];

  // Schema type distribution
  const schemaCount: Record<string, number> = {};
  for (const p of pages) {
    for (const t of p.schemaTypes) {
      schemaCount[t] = (schemaCount[t] || 0) + 1;
    }
  }
  const schemaData = Object.entries(schemaCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="admin-card p-6 space-y-4">
        <h3 className="text-base font-semibold">Technical Health Checks</h3>
        {checks.map((c) => {
          const pct = Math.round((c.count / c.total) * 100);
          const color = pct === 100 ? 'bg-[var(--admin-success)]' : pct >= 70 ? 'bg-[var(--admin-warning)]' : 'bg-[var(--admin-error)]';
          return (
            <div key={c.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{c.label}</span>
                <span className="font-mono text-[var(--admin-text-muted)]">{c.count}/{c.total} ({pct}%)</span>
              </div>
              <ProgressBar value={c.count} max={c.total} color={color} />
            </div>
          );
        })}
      </div>

      {schemaData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <ChartWrapper title="Schema Types Detected">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={schemaData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {schemaData.map((_, i) => <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <div className="admin-card p-6">
            <h3 className="mb-4 text-base font-semibold">Schema Details</h3>
            <div className="space-y-3">
              {schemaData.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="text-sm font-mono">{s.name}</span>
                  <span className="text-sm text-[var(--admin-text-muted)]">{s.value} page{s.value !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   TAB 4: Content
   ================================================================ */

function ContentTab({ pages }: { pages: CrawledPage[] }) {
  const cfg = getChartConfig();
  const chartData = pages.map((p) => ({
    path: p.path,
    words: p.wordCount,
    headings: p.h2Count + p.h3Count,
    lists: p.listCount,
  }));

  return (
    <div className="space-y-6">
      <ChartWrapper title="Word Count by Page">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={cfg.gridColor} />
            <XAxis dataKey="path" tick={{ fontSize: 10, fill: cfg.axisColor }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10, fill: cfg.axisColor }} />
            <Tooltip contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }} />
            <Bar dataKey="words" fill="#2980b9" name="Words" />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      <div className="admin-card overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-semibold">Content Signals</h3>
        </div>
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)]">
                <th className={TH}>Path</th>
                <th className={TH}>Words</th>
                <th className={TH}>H2s</th>
                <th className={TH}>H3s</th>
                <th className={TH}>Lists</th>
                <th className={TH}>Images</th>
                <th className={TH}>Internal Links</th>
                <th className={TH}>External Links</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.path} className="border-b border-[var(--admin-border)]/50">
                  <td className="py-2 font-mono text-xs">{p.path}</td>
                  <td className="py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                      p.wordCount >= 300 ? 'bg-green-900/30 text-[var(--admin-success)]' : 'bg-yellow-900/30 text-[var(--admin-warning)]'
                    }`}>
                      {p.wordCount}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-xs text-[var(--admin-text-muted)]">{p.h2Count}</td>
                  <td className="py-2 font-mono text-xs text-[var(--admin-text-muted)]">{p.h3Count}</td>
                  <td className="py-2 font-mono text-xs text-[var(--admin-text-muted)]">{p.listCount}</td>
                  <td className="py-2 font-mono text-xs text-[var(--admin-text-muted)]">{p.imageCount}</td>
                  <td className="py-2 font-mono text-xs text-[var(--admin-text-muted)]">{p.internalLinks}</td>
                  <td className="py-2 font-mono text-xs text-[var(--admin-text-muted)]">{p.externalLinks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   TAB 5: GEO (Generative Engine Optimization)
   ================================================================ */

function GeoTab({ pages, geoScore }: { pages: CrawledPage[]; geoScore: number }) {
  const n = pages.length || 1;
  const checks = [
    { label: 'Has Organization Schema', count: pages.filter((p) => p.hasOrganizationSchema).length, total: n },
    { label: 'Has Breadcrumb Schema', count: pages.filter((p) => p.hasBreadcrumbSchema).length, total: n },
    { label: 'All OG Tags (image+title+desc)', count: pages.filter((p) => p.hasOgImage && p.hasOgTitle && p.hasOgDescription).length, total: n },
    { label: 'Word Count >= 500', count: pages.filter((p) => p.wordCount >= 500).length, total: n },
    { label: 'Lang Attribute Set', count: pages.filter((p) => p.hasLang).length, total: n },
    { label: 'Has Any Structured Data', count: pages.filter((p) => p.schemaTypes.length > 0).length, total: n },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ScoreGauge label="GEO Score" score={geoScore} color="#16a085" />
        <div className="flex-1">
          <h3 className="text-base font-semibold">Generative Engine Optimization</h3>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            How well your content is structured for AI engines like Google SGE, Perplexity, and ChatGPT.
            Structured data, rich metadata, and comprehensive content improve AI citation rates.
          </p>
        </div>
      </div>

      <div className="admin-card p-6 space-y-4">
        {checks.map((c) => {
          const pct = Math.round((c.count / c.total) * 100);
          const color = pct === 100 ? 'bg-[var(--admin-success)]' : pct >= 70 ? 'bg-[var(--admin-warning)]' : 'bg-[var(--admin-error)]';
          return (
            <div key={c.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{c.label}</span>
                <span className="font-mono text-[var(--admin-text-muted)]">{c.count}/{c.total} ({pct}%)</span>
              </div>
              <ProgressBar value={c.count} max={c.total} color={color} />
            </div>
          );
        })}
      </div>

      {/* Per-page OG breakdown */}
      <div className="admin-card overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-semibold">Open Graph & Schema per Page</h3>
        </div>
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)]">
                <th className={TH}>Path</th>
                <th className={TH}>OG Image</th>
                <th className={TH}>OG Title</th>
                <th className={TH}>OG Desc</th>
                <th className={TH}>Schema Types</th>
                <th className={TH}>Lang</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.path} className="border-b border-[var(--admin-border)]/50">
                  <td className="py-2 font-mono text-xs">{p.path}</td>
                  <td className="py-2"><BoolBadge value={p.hasOgImage} /></td>
                  <td className="py-2"><BoolBadge value={p.hasOgTitle} /></td>
                  <td className="py-2"><BoolBadge value={p.hasOgDescription} /></td>
                  <td className="py-2 text-xs font-mono text-[var(--admin-text-muted)]">
                    {p.schemaTypes.length > 0 ? p.schemaTypes.join(', ') : '-'}
                  </td>
                  <td className="py-2"><BoolBadge value={p.hasLang} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   TAB 7: Site Health
   ================================================================ */

function SiteHealthTab({ pages, audit }: { pages: CrawledPage[]; audit: SelfAuditResult }) {
  const cfg = getChartConfig();
  const healthy = pages.filter((p) => p.status === 200).length;
  const broken = pages.filter((p) => p.status !== 200).length;
  const avgLoadTime = pages.length > 0 ? Math.round(pages.reduce((s, p) => s + p.loadTime, 0) / pages.length) : 0;
  const fastPages = pages.filter((p) => p.loadTime < 2000).length;
  const slowPages = pages.filter((p) => p.loadTime >= 4000).length;

  const loadTimeData = pages.map((p) => ({
    path: p.path,
    loadTime: Math.round(p.loadTime),
  })).sort((a, b) => b.loadTime - a.loadTime);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Healthy Pages" value={healthy} color="success" />
        <StatCard label="Broken Pages" value={broken} color={broken > 0 ? 'danger' : 'success'} />
        <StatCard label="Avg Load Time" value={`${(avgLoadTime / 1000).toFixed(1)}s`} />
        <StatCard label="Fast (<2s)" value={fastPages} color="success" />
      </div>

      <ChartWrapper title="Load Time by Page (ms)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={loadTimeData}>
            <CartesianGrid strokeDasharray="3 3" stroke={cfg.gridColor} />
            <XAxis dataKey="path" tick={{ fontSize: 10, fill: cfg.axisColor }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 10, fill: cfg.axisColor }} />
            <Tooltip
              formatter={(val: number) => [`${val}ms`, 'Load Time']}
              contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }}
            />
            <Bar dataKey="loadTime" name="Load Time (ms)">
              {loadTimeData.map((entry, i) => (
                <Cell key={i} fill={entry.loadTime < 2000 ? '#27ae60' : entry.loadTime < 4000 ? '#f39c12' : '#e74c3c'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Crawl Status Table */}
      <div className="admin-card overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-semibold">Crawl Status</h3>
          <p className="mt-1 text-xs text-[var(--admin-text-muted)]" suppressHydrationWarning>
            Last crawl: {new Date(audit.crawledAt).toLocaleString()} - {audit.siteUrl}
          </p>
        </div>
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)]">
                <th className={TH}>Path</th>
                <th className={TH}>Status</th>
                <th className={TH}>Load Time</th>
                <th className={TH}>Title</th>
                <th className={TH}>Words</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.path} className="border-b border-[var(--admin-border)]/50">
                  <td className="py-2 font-mono text-xs">{p.path}</td>
                  <td className="py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                      p.status === 200 ? 'bg-green-900/30 text-[var(--admin-success)]' : 'bg-red-900/30 text-[var(--admin-error)]'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                      p.loadTime < 2000 ? 'bg-green-900/30 text-[var(--admin-success)]' : p.loadTime < 4000 ? 'bg-yellow-900/30 text-[var(--admin-warning)]' : 'bg-red-900/30 text-[var(--admin-error)]'
                    }`}>
                      {(p.loadTime / 1000).toFixed(1)}s
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate py-2 text-xs text-[var(--admin-text-muted)]">{p.title || '-'}</td>
                  <td className="py-2 font-mono text-xs text-[var(--admin-text-muted)]">{p.wordCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {slowPages > 0 && (
        <div className="admin-card border-l-4 border-[var(--admin-warning)] p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-warning)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--admin-warning)]">{slowPages} slow page{slowPages !== 1 ? 's' : ''} detected</p>
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                Pages taking more than 4 seconds to load significantly impact user experience. Consider optimizing server-side rendering, reducing bundle size, or adding caching.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   TAB 8: AEO (AI Engine Optimization)
   ================================================================ */

function AeoTab({ pages, aeoScore }: { pages: CrawledPage[]; aeoScore: number }) {
  const n = pages.length || 1;
  const checks = [
    { label: 'Has Any Structured Data', count: pages.filter((p) => p.schemaTypes.length > 0).length, total: n },
    { label: 'Has FAQ Schema', count: pages.filter((p) => p.hasFAQSchema).length, total: n },
    { label: 'Has HowTo Schema', count: pages.filter((p) => p.hasHowToSchema).length, total: n },
    { label: 'Has Speakable Markup', count: pages.filter((p) => p.hasSpeakable).length, total: n },
    { label: 'Question Headings (H2/H3 with ?)', count: pages.filter((p) => p.questionHeadings > 0).length, total: n },
    { label: 'Has Lists (UL/OL)', count: pages.filter((p) => p.listCount > 0).length, total: n },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ScoreGauge label="AEO Score" score={aeoScore} color="#d35400" />
        <div className="flex-1">
          <h3 className="text-base font-semibold">AI Engine Optimization</h3>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            How well your content is optimized for AI-powered answer engines. FAQ schema, speakable markup,
            question-formatted headings, and structured lists help your content appear in AI answers.
          </p>
        </div>
      </div>

      <div className="admin-card p-6 space-y-4">
        {checks.map((c) => {
          const pct = Math.round((c.count / c.total) * 100);
          const color = pct === 100 ? 'bg-[var(--admin-success)]' : pct >= 50 ? 'bg-[var(--admin-warning)]' : 'bg-[var(--admin-error)]';
          return (
            <div key={c.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{c.label}</span>
                <span className="font-mono text-[var(--admin-text-muted)]">{c.count}/{c.total} ({pct}%)</span>
              </div>
              <ProgressBar value={c.count} max={c.total} color={color} />
            </div>
          );
        })}
      </div>

      {/* Per-page AEO signals */}
      <div className="admin-card overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-semibold">AEO Signals per Page</h3>
        </div>
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)]">
                <th className={TH}>Path</th>
                <th className={TH}>FAQ Schema</th>
                <th className={TH}>HowTo Schema</th>
                <th className={TH}>Speakable</th>
                <th className={TH}>Q Headings</th>
                <th className={TH}>Lists</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.path} className="border-b border-[var(--admin-border)]/50">
                  <td className="py-2 font-mono text-xs">{p.path}</td>
                  <td className="py-2"><BoolBadge value={p.hasFAQSchema} /></td>
                  <td className="py-2"><BoolBadge value={p.hasHowToSchema} /></td>
                  <td className="py-2"><BoolBadge value={p.hasSpeakable} /></td>
                  <td className="py-2 font-mono text-xs text-[var(--admin-text-muted)]">{p.questionHeadings}</td>
                  <td className="py-2 font-mono text-xs text-[var(--admin-text-muted)]">{p.listCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   TAB 9: CRO (Conversion Rate Optimization)
   ================================================================ */

function CroTab({ pages, croScore }: { pages: CrawledPage[]; croScore: number }) {
  const cfg = getChartConfig();
  const n = pages.length || 1;
  const avgLoadTime = pages.length > 0 ? Math.round(pages.reduce((s, p) => s + p.loadTime, 0) / pages.length) : 0;
  const fastest = pages.length > 0 ? Math.min(...pages.map((p) => p.loadTime)) : 0;
  const slowest = pages.length > 0 ? Math.max(...pages.map((p) => p.loadTime)) : 0;

  const checks = [
    { label: 'Fast Load (<2s)', count: pages.filter((p) => p.loadTime < 2000).length, total: n },
    { label: '200 Status Code', count: pages.filter((p) => p.status === 200).length, total: n },
    { label: 'Has Internal Links', count: pages.filter((p) => p.internalLinks > 0).length, total: n },
    { label: 'Title 30-60 Characters', count: pages.filter((p) => p.titleLength >= 30 && p.titleLength <= 60).length, total: n },
    { label: 'Meta Desc 70-160 Characters', count: pages.filter((p) => p.metaDescriptionLength >= 70 && p.metaDescriptionLength <= 160).length, total: n },
  ];

  // Load time distribution
  const buckets = [
    { range: '<1s', count: pages.filter((p) => p.loadTime < 1000).length },
    { range: '1-2s', count: pages.filter((p) => p.loadTime >= 1000 && p.loadTime < 2000).length },
    { range: '2-3s', count: pages.filter((p) => p.loadTime >= 2000 && p.loadTime < 3000).length },
    { range: '3-4s', count: pages.filter((p) => p.loadTime >= 3000 && p.loadTime < 4000).length },
    { range: '4s+', count: pages.filter((p) => p.loadTime >= 4000).length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ScoreGauge label="CRO Score" score={croScore} color="#c0392b" />
        <div className="flex-1">
          <h3 className="text-base font-semibold">Conversion Rate Optimization</h3>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            Page speed, status codes, navigation, and meta quality directly impact user engagement and conversion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Avg Load Time" value={`${(avgLoadTime / 1000).toFixed(1)}s`} />
        <StatCard label="Fastest Page" value={`${(fastest / 1000).toFixed(1)}s`} color="success" />
        <StatCard label="Slowest Page" value={`${(slowest / 1000).toFixed(1)}s`} color={slowest > 4000 ? 'danger' : 'warning'} />
        <StatCard label="CRO Score" value={`${croScore}/100`} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartWrapper title="Load Time Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={cfg.gridColor} />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: cfg.axisColor }} />
              <YAxis tick={{ fontSize: 11, fill: cfg.axisColor }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: cfg.tooltipBg, border: `1px solid ${cfg.tooltipBorder}`, borderRadius: '0.5rem', color: 'var(--admin-text)' }} />
              <Bar dataKey="count" name="Pages">
                {buckets.map((b, i) => {
                  const colors = ['#27ae60', '#27ae60', '#f39c12', '#e67e22', '#e74c3c'];
                  return <Cell key={i} fill={colors[i]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <div className="admin-card p-6 space-y-4">
          <h3 className="text-base font-semibold">CRO Checks</h3>
          {checks.map((c) => {
            const pct = Math.round((c.count / c.total) * 100);
            const color = pct === 100 ? 'bg-[var(--admin-success)]' : pct >= 70 ? 'bg-[var(--admin-warning)]' : 'bg-[var(--admin-error)]';
            return (
              <div key={c.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{c.label}</span>
                  <span className="font-mono text-[var(--admin-text-muted)]">{c.count}/{c.total} ({pct}%)</span>
                </div>
                <ProgressBar value={c.count} max={c.total} color={color} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   TAB 10: Recommendations
   ================================================================ */

function RecommendationsTab({
  issues,
  severityFilter,
  setSeverityFilter,
}: {
  issues: SelfAuditResult['issues'];
  severityFilter: 'all' | 'critical' | 'warning' | 'info';
  setSeverityFilter: (f: 'all' | 'critical' | 'warning' | 'info') => void;
}) {
  const filtered = severityFilter === 'all' ? issues : issues.filter((i) => i.severity === severityFilter);
  const criticals = issues.filter((i) => i.severity === 'critical').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const infos = issues.filter((i) => i.severity === 'info').length;

  const filters: { id: 'all' | 'critical' | 'warning' | 'info'; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: issues.length },
    { id: 'critical', label: 'Critical', count: criticals },
    { id: 'warning', label: 'Warnings', count: warnings },
    { id: 'info', label: 'Info', count: infos },
  ];

  return (
    <div className="space-y-6">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setSeverityFilter(f.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              severityFilter === f.id
                ? 'bg-[var(--admin-accent)] text-white'
                : 'bg-[var(--admin-surface-raised)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="admin-card border-l-4 border-[var(--admin-error)] p-4 text-center">
          <p className="text-2xl font-bold text-[var(--admin-error)]">{criticals}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">Critical</p>
        </div>
        <div className="admin-card border-l-4 border-[var(--admin-warning)] p-4 text-center">
          <p className="text-2xl font-bold text-[var(--admin-warning)]">{warnings}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">Warnings</p>
        </div>
        <div className="admin-card border-l-4 border-[var(--admin-info)] p-4 text-center">
          <p className="text-2xl font-bold text-[var(--admin-info)]">{infos}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">Info</p>
        </div>
      </div>

      {/* Issue Cards */}
      {filtered.length === 0 ? (
        <EmptyState title="No issues found" description="All checks passed for this severity level." />
      ) : (
        <div className="space-y-4">
          {filtered.map((issue) => {
            const iconMap = {
              critical: <AlertTriangle className="h-5 w-5 text-[var(--admin-error)]" />,
              warning: <AlertTriangle className="h-5 w-5 text-[var(--admin-warning)]" />,
              info: <Info className="h-5 w-5 text-[var(--admin-info)]" />,
            };

            return (
              <div key={issue.title} className="admin-card p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{iconMap[issue.severity]}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{issue.title}</h4>
                      <SeverityBadge severity={issue.severity} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                        {issue.category}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{issue.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {issue.affectedPages.map((page) => (
                        <span key={page} className="font-mono text-xs text-[var(--admin-text-muted)]">
                          {page}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
