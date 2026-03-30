'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info, Lightbulb, RefreshCw } from 'lucide-react';

interface HealthScore {
  overall: number;
  categories: {
    communityHealth: number;
    engagementQuality: number;
    growthTrajectory: number;
    moderationEfficiency: number;
    contentDiversity: number;
  };
}

interface Insight {
  id: string;
  insight_type: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  confidence: number;
  recommendations: string;
  created_at: string;
}

interface Props {
  healthScore: HealthScore;
  insights: Insight[];
}

const severityStyles: Record<string, { bg: string; icon: typeof AlertTriangle }> = {
  critical: { bg: 'border-l-[var(--admin-error)]', icon: AlertTriangle },
  warning: { bg: 'border-l-[var(--admin-warning)]', icon: AlertTriangle },
  info: { bg: 'border-l-[var(--admin-info)]', icon: Info },
  positive: { bg: 'border-l-[var(--admin-success)]', icon: CheckCircle },
};

const categoryLabels: Record<string, string> = {
  communityHealth: 'Community Health',
  engagementQuality: 'Engagement Quality',
  growthTrajectory: 'Growth Trajectory',
  moderationEfficiency: 'Moderation Efficiency',
  contentDiversity: 'Content Diversity',
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--admin-success)';
  if (score >= 60) return 'var(--admin-info)';
  if (score >= 40) return 'var(--admin-warning)';
  return 'var(--admin-error)';
}

export function DataIntelligenceClient({ healthScore, insights }: Props) {
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await fetch('/api/admin/generate-insights', { method: 'POST' });
      window.location.reload();
    } catch {
      setGenerating(false);
    }
  }

  const circumference = 2 * Math.PI * 65;
  const offset = circumference - (healthScore.overall / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="admin-card flex flex-col items-center justify-center p-8">
          <div className="health-score-ring">
            <svg width="160" height="160">
              <circle cx="80" cy="80" r="65" fill="none" stroke="var(--admin-surface-raised)" strokeWidth="10" />
              <circle
                cx="80" cy="80" r="65" fill="none"
                stroke={getScoreColor(healthScore.overall)}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="health-score-value">
              <span className="text-4xl font-bold" style={{ color: getScoreColor(healthScore.overall) }}>
                {healthScore.overall}
              </span>
              <span className="text-xs text-[var(--admin-text-muted)]">Health Score</span>
            </div>
          </div>
        </div>

        <div className="admin-card p-6 lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold">Category Scores</h3>
          <div className="space-y-4">
            {Object.entries(healthScore.categories).map(([key, value]) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm">{categoryLabels[key] || key}</span>
                  <span className="text-sm font-bold" style={{ color: getScoreColor(value) }}>{value}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--admin-surface-raised)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: getScoreColor(value) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Insights</h2>
        <button onClick={handleGenerate} disabled={generating} className="btn-admin flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating...' : 'Generate Insights'}
        </button>
      </div>

      {/* Insights Feed */}
      {insights.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <Lightbulb className="mx-auto h-10 w-10 text-[var(--admin-text-muted)]" />
          <p className="mt-3 text-sm text-[var(--admin-text-muted)]">No insights generated yet. Click "Generate Insights" to analyze your platform data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const style = severityStyles[insight.severity] ?? severityStyles.info!;
            const Icon = style!.icon;
            let recs: string[] = [];
            try { recs = JSON.parse(insight.recommendations || '[]'); } catch { /* ignore */ }

            return (
              <div key={insight.id} className={`admin-card border-l-4 p-5 ${style.bg}`}>
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--admin-text-muted)]" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <span className="text-xs text-[var(--admin-text-muted)]">{insight.category}</span>
                      <span className="text-xs text-[var(--admin-text-muted)]">{insight.confidence}% confidence</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{insight.description}</p>
                    {recs.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {recs.map((rec, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
                            <Activity className="h-3 w-3" /> {rec}
                          </li>
                        ))}
                      </ul>
                    )}
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
