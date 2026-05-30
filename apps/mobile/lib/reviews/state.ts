import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_INSTALL_AT = 'review.install_at';
const KEY_SESSION_COUNT = 'review.session_count';
const KEY_LAST_PROMPT_AT = 'review.last_prompt_at';
const KEY_NEVER_ASK = 'review.never_ask';
const KEY_ACTION_TAKEN = 'review.action_taken';

const DAY_MS = 24 * 60 * 60 * 1000;

// Eligibility gates — tuned to be conservative so we don't burn Apple's 3/year cap.
const MIN_SESSIONS = 5;
const MIN_DAYS_SINCE_INSTALL = 7;
const COOLDOWN_DAYS_BETWEEN_PROMPTS = 90;

export interface ReviewState {
  installAt: number;
  sessionCount: number;
  lastPromptAt: number;
  neverAsk: boolean;
  actionTaken: boolean;
}

export async function loadReviewState(): Promise<ReviewState> {
  const [installAt, sessionCount, lastPromptAt, neverAsk, actionTaken] = await Promise.all([
    AsyncStorage.getItem(KEY_INSTALL_AT),
    AsyncStorage.getItem(KEY_SESSION_COUNT),
    AsyncStorage.getItem(KEY_LAST_PROMPT_AT),
    AsyncStorage.getItem(KEY_NEVER_ASK),
    AsyncStorage.getItem(KEY_ACTION_TAKEN),
  ]);
  return {
    installAt: installAt ? Number(installAt) : 0,
    sessionCount: sessionCount ? Number(sessionCount) : 0,
    lastPromptAt: lastPromptAt ? Number(lastPromptAt) : 0,
    neverAsk: neverAsk === '1',
    actionTaken: actionTaken === '1',
  };
}

export async function recordSessionStart(): Promise<void> {
  const state = await loadReviewState();
  if (!state.installAt) {
    await AsyncStorage.setItem(KEY_INSTALL_AT, String(Date.now()));
  }
  await AsyncStorage.setItem(KEY_SESSION_COUNT, String(state.sessionCount + 1));
}

export async function recordPromptShown(): Promise<void> {
  await AsyncStorage.setItem(KEY_LAST_PROMPT_AT, String(Date.now()));
}

export async function recordReviewAction(): Promise<void> {
  await AsyncStorage.setItem(KEY_ACTION_TAKEN, '1');
}

export async function recordNeverAsk(): Promise<void> {
  await AsyncStorage.setItem(KEY_NEVER_ASK, '1');
}

export function isEligible(state: ReviewState): boolean {
  if (state.neverAsk || state.actionTaken) return false;
  if (!state.installAt) return false;
  const now = Date.now();
  const daysSinceInstall = (now - state.installAt) / DAY_MS;
  if (daysSinceInstall < MIN_DAYS_SINCE_INSTALL) return false;
  if (state.sessionCount < MIN_SESSIONS) return false;
  if (state.lastPromptAt > 0) {
    const daysSincePrompt = (now - state.lastPromptAt) / DAY_MS;
    if (daysSincePrompt < COOLDOWN_DAYS_BETWEEN_PROMPTS) return false;
  }
  return true;
}
