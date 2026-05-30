import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as StoreReview from 'expo-store-review';
import { ReviewPromptModal } from '@/components/ReviewPromptModal';
import {
  isEligible,
  loadReviewState,
  recordNeverAsk,
  recordPromptShown,
  recordReviewAction,
  recordSessionStart,
} from './state';

interface ReviewPromptContextValue {
  /** Call after a positive moment (e.g. successful post). No-op when ineligible. */
  triggerReviewPrompt: () => Promise<void>;
}

const ReviewPromptContext = createContext<ReviewPromptContextValue>({
  triggerReviewPrompt: async () => {},
});

export function useReviewPrompt() {
  return useContext(ReviewPromptContext);
}

export function ReviewPromptProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  // Record a new session on mount. First launch also stamps install_at.
  useEffect(() => {
    recordSessionStart().catch(() => {});
  }, []);

  const triggerReviewPrompt = useCallback(async () => {
    try {
      const state = await loadReviewState();
      if (!isEligible(state)) return;

      // Confirm the platform can actually show a review dialog before we burn
      // a prompt slot in our own cooldown.
      const [available, hasAction] = await Promise.all([
        StoreReview.isAvailableAsync(),
        StoreReview.hasAction(),
      ]);
      if (!available || !hasAction) return;

      setVisible(true);
      await recordPromptShown();
    } catch {
      // Swallow — review prompting must never block the success flow.
    }
  }, []);

  const handleRate = useCallback(async () => {
    setVisible(false);
    try {
      await recordReviewAction();
      await StoreReview.requestReview();
    } catch {
      // Native dialog failed — nothing we can do; cooldown already recorded.
    }
  }, []);

  const handleNotNow = useCallback(() => {
    setVisible(false);
    // Cooldown was already recorded when we opened the modal, so this is enough.
  }, []);

  const handleNeverAsk = useCallback(async () => {
    setVisible(false);
    try {
      await recordNeverAsk();
    } catch {
      // ignore
    }
  }, []);

  return (
    <ReviewPromptContext.Provider value={{ triggerReviewPrompt }}>
      {children}
      <ReviewPromptModal
        visible={visible}
        onRate={handleRate}
        onNotNow={handleNotNow}
        onNeverAsk={handleNeverAsk}
      />
    </ReviewPromptContext.Provider>
  );
}
