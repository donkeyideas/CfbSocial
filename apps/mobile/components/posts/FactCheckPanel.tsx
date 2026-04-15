import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { typography } from '@/lib/theme/typography';
import { useColors } from '@/lib/theme/ThemeProvider';

interface FactCheck {
  id: string;
  claim: string;
  verdict: string;
  evidence: string | null;
  created_at: string;
}

interface FactCheckPanelProps {
  postId: string;
  postContent?: string;
  onClose: () => void;
}

const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.EXPO_PUBLIC_DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  VERIFIED: { label: 'Verified', color: '#1a7a1a', bg: '#e6f5e6' },
  FALSE: { label: 'False', color: '#8b1a1a', bg: '#fce6e6' },
  UNVERIFIABLE: { label: 'Opinion / Unverifiable', color: '#6b5a1a', bg: '#fdf5e6' },
  PENDING: { label: 'Pending Review', color: '#4a4a4a', bg: '#f0f0f0' },
};

export function FactCheckPanel({ postId, postContent, onClose }: FactCheckPanelProps) {
  const colors = useColors();
  const { profile } = useAuth();
  const [factCheck, setFactCheck] = useState<FactCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: colors.textPrimary,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    closeText: {
      fontFamily: typography.mono,
      fontSize: 13,
      color: colors.textMuted,
    },
    body: {
      padding: 10,
    },
    loadingText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textMuted,
    },
    descText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    runButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: colors.crimson,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    runButtonText: {
      fontFamily: typography.mono,
      fontSize: 11,
      color: '#f4efe4',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    errorText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.error,
    },
    verdictBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginBottom: 8,
    },
    verdictText: {
      fontFamily: typography.mono,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    claimLabel: {
      fontFamily: typography.sansSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    claimText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 18,
      marginBottom: 8,
    },
    evidenceText: {
      fontFamily: typography.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 8,
    },
    metaText: {
      fontFamily: typography.mono,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
  }), [colors]);

  // Load existing fact check from Supabase
  useEffect(() => {
    supabase
      .from('fact_checks')
      .select('id, claim, verdict, evidence, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setFactCheck(data as FactCheck);
        setLoading(false);
      });
  }, [postId]);

  const requestFactCheck = useCallback(async () => {
    if (!profile?.id) return;
    setRequesting(true);
    setError(null);

    try {
      // Get post content if not provided
      let content = postContent;
      if (!content) {
        const { data: post } = await supabase
          .from('posts')
          .select('content')
          .eq('id', postId)
          .single();
        content = post?.content ?? '';
      }

      if (!content) {
        setError('Post content not found.');
        setRequesting(false);
        return;
      }

      // Check for recent existing check (24h cache)
      const { data: existing } = await supabase
        .from('fact_checks')
        .select('id, claim, verdict, evidence, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const age = Date.now() - new Date(existing.created_at).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          setFactCheck(existing as FactCheck);
          setRequesting(false);
          return;
        }
      }

      const apiKey = DEEPSEEK_API_KEY || process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
      if (!apiKey) {
        console.warn('FactCheck: EXPO_PUBLIC_DEEPSEEK_API_KEY is not set. Restart Metro with --clear.');
        setError('Fact check service unavailable. Restart the app and try again.');
        setRequesting(false);
        return;
      }

      // Call DeepSeek API directly
      const prompt = `You are a college football fact-checker for CFB Social. Analyze the following fan post for factual claims.

POST: "${content}"

Instructions:
- Identify the main factual claim(s) in this post.
- For each claim, assess if it's VERIFIED (clearly true), FALSE (clearly wrong), UNVERIFIABLE (opinion or can't be confirmed), or PENDING (needs more context).
- Give an overall verdict.
- Keep your response under 150 words.
- Be fair — distinguish between opinions/hot takes (which are UNVERIFIABLE) and actual factual claims.
- College football trash talk and opinions are NOT false claims.

Respond ONLY with valid JSON:
{
  "claim": "The main factual claim extracted from the post",
  "verdict": "VERIFIED" | "FALSE" | "UNVERIFIABLE" | "PENDING",
  "evidence": "Brief explanation of your reasoning (1-2 sentences)",
  "confidence": 0.0 to 1.0
}`;

      const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        setError('AI analysis failed. Try again.');
        setRequesting(false);
        return;
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

      let analysis;
      try {
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysis = JSON.parse(cleaned);
      } catch {
        analysis = {
          claim: content.slice(0, 200),
          verdict: 'UNVERIFIABLE',
          evidence: 'Unable to parse AI analysis. The post may be opinion-based.',
          confidence: 0.5,
        };
      }

      // Store in fact_checks table
      const { data: fc, error: insertError } = await supabase
        .from('fact_checks')
        .insert({
          post_id: postId,
          requester_id: profile.id,
          claim: (analysis.claim || content).slice(0, 500),
          verdict: analysis.verdict || 'PENDING',
          evidence: analysis.evidence || null,
          ai_analysis: analysis,
        })
        .select('id, claim, verdict, evidence, created_at')
        .single();

      if (insertError) {
        setError('Failed to save fact check.');
      } else if (fc) {
        setFactCheck(fc as FactCheck);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setRequesting(false);
    }
  }, [postId, postContent, profile?.id]);

  const verdict = factCheck?.verdict ? VERDICT_CONFIG[factCheck.verdict] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fact Check</Text>
        <Pressable onPress={onClose}>
          <Text style={styles.closeText}>X</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {loading && (
          <Text style={styles.loadingText}>Checking...</Text>
        )}

        {!loading && !factCheck && !requesting && (
          <>
            <Text style={styles.descText}>
              Run an AI-powered fact check on this post. Claims will be analyzed for accuracy.
            </Text>
            <Pressable style={styles.runButton} onPress={requestFactCheck}>
              <Text style={styles.runButtonText}>Run Fact Check</Text>
            </Pressable>
          </>
        )}

        {requesting && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={colors.textMuted} />
            <Text style={styles.loadingText}>Analyzing claims...</Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {factCheck && verdict && (
          <>
            <View style={[styles.verdictBadge, { backgroundColor: verdict.bg }]}>
              <Text style={[styles.verdictText, { color: verdict.color }]}>
                {verdict.label}
              </Text>
            </View>
            {factCheck.claim ? (
              <>
                <Text style={styles.claimLabel}>Claim:</Text>
                <Text style={styles.claimText}>{factCheck.claim}</Text>
              </>
            ) : null}
            {factCheck.evidence ? (
              <Text style={styles.evidenceText}>{factCheck.evidence}</Text>
            ) : null}
            <Text style={styles.metaText}>
              Checked {new Date(factCheck.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
