import { useState, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { AppLanguage, InputLanguage } from '../types/i18n.types';
import { detectInputLanguage } from '../utils/languageDetector';

export interface LanguageEvaluationState {
  visible: boolean;
  detectedLanguage: InputLanguage;
  isMixed: boolean;
  sampleText: string;
  onProceedCallback: (() => void) | null;
}

export function useLanguageConfirmation() {
  const { language, setLanguage } = useLanguage();
  const [modalState, setModalState] = useState<LanguageEvaluationState>({
    visible: false,
    detectedLanguage: 'unknown',
    isMixed: false,
    sampleText: '',
    onProceedCallback: null,
  });

  // Track texts that the user has already acknowledged/confirmed in the current session
  const confirmedTextsRef = useRef<Set<string>>(new Set());

  /**
   * Evaluates a free-text field against the active appLanguage.
   * If a mismatch or mixed-script input is detected, shows the confirmation modal
   * before proceeding. If no mismatch or already confirmed, proceeds immediately.
   */
  const checkAndConfirmLanguage = useCallback(
    (
      freeText: string | undefined | null,
      onProceed: () => void
    ) => {
      const trimmed = (freeText || '').trim();

      // Guard 1: Empty or short text (< 15 characters) -> no warning
      if (!trimmed || trimmed.length < 15) {
        onProceed();
        return;
      }

      // Guard 2: Already confirmed in this flow -> avoid duplicate prompt
      if (confirmedTextsRef.current.has(trimmed)) {
        onProceed();
        return;
      }

      const detection = detectInputLanguage(trimmed, language);

      // Guard 3: Unknown classification or low confidence -> no warning
      if (detection.inputLanguage === 'unknown' || detection.confidence < 0.7) {
        onProceed();
        return;
      }

      // Guard 4: Same language (e.g. 'mr' text in 'mr' app, 'en' in 'en' app, Romanized 'mr' in 'mr' app)
      if (detection.inputLanguage === language) {
        onProceed();
        return;
      }

      // Case: Mixed language or High-confidence mismatch
      const isMixed = detection.inputLanguage === 'mixed';

      setModalState({
        visible: true,
        detectedLanguage: detection.inputLanguage,
        isMixed,
        sampleText: trimmed,
        onProceedCallback: () => {
          confirmedTextsRef.current.add(trimmed);
          setModalState((prev) => ({ ...prev, visible: false, onProceedCallback: null }));
          onProceed();
        },
      });
    },
    [language]
  );

  const handleModalContinue = useCallback(() => {
    if (modalState.onProceedCallback) {
      modalState.onProceedCallback();
    } else {
      setModalState((prev) => ({ ...prev, visible: false }));
    }
  }, [modalState]);

  const handleModalSwitchLanguage = useCallback(
    async (targetLang: AppLanguage) => {
      await setLanguage(targetLang);
      if (modalState.onProceedCallback) {
        modalState.onProceedCallback();
      } else {
        setModalState((prev) => ({ ...prev, visible: false }));
      }
    },
    [setLanguage, modalState]
  );

  const handleModalClose = useCallback(() => {
    // Closing via backdrop or close button is non-blocking: it executes proceed
    handleModalContinue();
  }, [handleModalContinue]);

  return {
    languageConfirmationState: modalState,
    checkAndConfirmLanguage,
    handleModalContinue,
    handleModalSwitchLanguage,
    handleModalClose,
  };
}

export default useLanguageConfirmation;
