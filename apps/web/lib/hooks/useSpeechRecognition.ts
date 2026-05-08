'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const HALLUCINATION_PHRASES = new Set([
  'thank you', 'thank you.',
  'thanks for watching', 'thanks for watching.',
  'subscribe', 'subscribe.',
  'like and subscribe', 'like and subscribe.',
  'please subscribe', 'please subscribe.',
  'bye', 'bye.', 'goodbye', 'goodbye.',
  'you', 'you.', 'the end', 'the end.',
  'thanks', 'thanks.',
  'thank you for watching', 'thank you for watching.',
  'see you next time', 'see you next time.',
  'subtitles by the amara.org community',
]);

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  elapsedSeconds: number;
  audioLevel: number;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { onResult, onError } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hadAudioRef = useRef(false);

  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    setIsSupported(
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    );
  }, []);

  useEffect(() => {
    if (isListening) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setElapsedSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isListening]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioContextRef.current?.close();
    };
  }, []);

  const startAudioMonitor = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      hadAudioRef.current = false;

      const dataArray = new Uint8Array(analyser.fftSize);

      const poll = () => {
        analyser.getByteTimeDomainData(dataArray);
        let maxDeviation = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const deviation = Math.abs(dataArray[i] - 128);
          if (deviation > maxDeviation) maxDeviation = deviation;
        }
        const normalized = maxDeviation / 128;
        setAudioLevel(normalized);

        if (normalized > 0.008) {
          hadAudioRef.current = true;
        }

        animFrameRef.current = requestAnimationFrame(poll);
      };
      poll();
    } catch {
      hadAudioRef.current = true;
    }
  }, []);

  const stopAudioMonitor = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const sendForTranscription = useCallback(async (blob: Blob) => {
    const detectedAudio = hadAudioRef.current;

    setInterimTranscript('Transcribing...');
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Transcription failed');
      }

      const { text } = await res.json();
      setInterimTranscript('');

      if (text && text.trim()) {
        const normalized = text.trim().toLowerCase();
        if (HALLUCINATION_PHRASES.has(normalized)) {
          onErrorRef.current?.(
            detectedAudio
              ? 'Could not understand speech clearly. Please try again.'
              : 'No speech detected. Check your microphone settings.'
          );
          return;
        }
        onResultRef.current?.(text.trim(), true);
      } else if (!detectedAudio) {
        onErrorRef.current?.('No speech detected. Check your microphone settings.');
      }
    } catch (err: any) {
      setInterimTranscript('');
      onErrorRef.current?.(err.message || 'Failed to transcribe audio');
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      onErrorRef.current?.('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      startAudioMonitor(stream);

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const hadAudio = hadAudioRef.current;
        stopAudioMonitor();

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        if (blob.size > 0) {
          hadAudioRef.current = hadAudio;
          sendForTranscription(blob);
        }
      };

      recorder.onerror = () => {
        setIsListening(false);
        stream.getTracks().forEach((t) => t.stop());
        stopAudioMonitor();
        onErrorRef.current?.('Recording failed. Please try again.');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
      setInterimTranscript('');
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        onErrorRef.current?.('Microphone access denied. Please allow microphone permissions.');
      } else {
        onErrorRef.current?.('Failed to access microphone: ' + err.message);
      }
    }
  }, [isSupported, sendForTranscription, startAudioMonitor, stopAudioMonitor]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsListening(false);
  }, []);

  return { isSupported, isListening, interimTranscript, startListening, stopListening, elapsedSeconds, audioLevel };
}
