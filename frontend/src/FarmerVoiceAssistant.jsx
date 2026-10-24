// frontend/src/FarmerVoiceAssistant.jsx
// Accessible, Bangla-enabled Voice Assistant for Bangladeshi farmers

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation, toBengaliNumber } from './i18n.js';

export function FarmerVoiceAssistant({
  activeField,
  nasa,
  lang = 'bn',
  onNavigate,
  onOpenAssistant
}) {
  const { t } = useTranslation(lang);
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState('ready'); // 'ready' | 'listening' | 'processing' | 'error' | 'answered'
  const [transcript, setTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationAction, setConfirmationAction] = useState(null);

  const recognitionRef = useRef(null);
  const accumulatedFinalRef = useRef('');
  const isListeningRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Initialize SpeechRecognition if supported with stable lifecycle
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMessage(lang === 'bn'
        ? 'আপনার ব্রাউজারে ভয়েস সুবিধা নেই। অনুগ্রহ করে গুগল ক্রোম (Google Chrome) ব্যবহার করুন বা নিচে লিখে প্রশ্ন করুন।'
        : 'Speech recognition is not supported in this browser. Please use Google Chrome or type below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening for full sentences
      recognition.interimResults = true; // Show interim text without discarding
      recognition.lang = lang === 'bn' ? 'bn-BD' : 'en-US';

      recognition.onstart = () => {
        isListeningRef.current = true;
        setState('listening');
        setErrorMessage('');
      };

      recognition.onresult = (event) => {
        let interimStr = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            accumulatedFinalRef.current += res[0].transcript + ' ';
          } else {
            interimStr += res[0].transcript;
          }
        }
        const fullText = (accumulatedFinalRef.current + interimStr).trim();
        if (fullText) {
          setTranscript(fullText);
          setManualInput(fullText); // Display recognized text immediately in editable input
        }

        // Reset silence timer: stop listening after 4 seconds of quiet to let user review
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {}
          }
        }, 4000);
      };

      recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'no-speech') {
          setErrorMessage(lang === 'bn'
            ? 'কোনো কথা শোনা যায়নি। মাইক্রোফোনের কাছে স্পষ্ট করে আবার বলুন।'
            : 'No speech was detected. Please speak closer to your microphone.');
          setState('ready');
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage(lang === 'bn'
            ? 'মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজার সেটিংসে গিয়ে মাইক্রোফোন পারমিশন দিন।'
            : 'Microphone permission denied. Please allow microphone access in your browser settings.');
          setState('error');
        } else if (event.error === 'network') {
          setErrorMessage(lang === 'bn'
            ? 'ইন্টারনেট বা স্পিচ সার্ভার সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে নিচে লিখে প্রশ্ন করুন।'
            : 'Speech server network error. Please check internet connection or type below.');
          setState('error');
        } else if (event.error === 'audio-capture') {
          setErrorMessage(lang === 'bn'
            ? 'মাইক্রোফোন শনাক্ত করা যায়নি। মাইক্রোফোন সংযোগ পরীক্ষা করুন।'
            : 'No microphone was found. Please verify your audio input device.');
          setState('error');
        } else {
          setErrorMessage(lang === 'bn'
            ? `ভয়েস ইনপুট সমস্যা (${event.error})। নিচে লিখে প্রশ্ন করুন।`
            : `Voice recognition error (${event.error}). Please type below.`);
          setState('error');
        }
      };

      recognition.onspeechend = () => {
        // User finished a phrase; wait briefly for continuous input before stop
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {}
          }
        }, 3000);
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setState(prev => prev === 'listening' ? 'ready' : prev);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition init error:', err);
      setIsSupported(false);
      setErrorMessage(lang === 'bn'
        ? 'ভয়েস সার্ভিস সক্রিয় করা যায়নি। অনুগ্রহ করে নিচে লিখে প্রশ্ন করুন।'
        : 'Could not initialize speech recognition. Please type below.');
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lang]);

  // Voice Command Intent Matching
  const processSpokenCommand = async (text) => {
    setState('processing');
    const lower = text.toLowerCase();

    // 1. Weather Intent
    if (lower.includes('আবহাওয়া') || lower.includes('বৃষ্টি') || lower.includes('weather') || lower.includes('rain')) {
      const reply = lang === 'bn'
        ? `আজকের আবহাওয়া দেখানো হচ্ছে। তাপমাত্রা প্রায় ${toBengaliNumber(Math.round(nasa?.temperature_c || 28))} ডিগ্রি সেলসিয়াস।`
        : `Showing today's weather. Temperature is around ${Math.round(nasa?.temperature_c || 28)}°C.`;
      setResponseText(reply);
      speakText(reply);
      setState('answered');
      setTimeout(() => {
        if (onNavigate) onNavigate('weather');
      }, 1400);
      return;
    }

    // 2. Crop Advice Intent
    if (lower.includes('ফসল') || lower.includes('পরামর্শ') || lower.includes('চাষ') || lower.includes('crop') || lower.includes('recommend')) {
      const reply = lang === 'bn'
        ? `আপনার জমির জন্য সেরা ফসলের পরামর্শ পাতা খোলা হলো।`
        : `Opening recommended crops for your land.`;
      setResponseText(reply);
      speakText(reply);
      setState('answered');
      setTimeout(() => {
        if (onNavigate) onNavigate('crop_advice');
      }, 1400);
      return;
    }

    // 3. Market Price Intent
    if (lower.includes('বাজার') || lower.includes('দাম') || lower.includes('দর') || lower.includes('market') || lower.includes('price')) {
      const reply = lang === 'bn'
        ? `সর্বশেষ পাইকারি ও খামার বাজারদরের তালিকা দেখানো হচ্ছে।`
        : `Opening latest farmgate and wholesale market prices.`;
      setResponseText(reply);
      speakText(reply);
      setState('answered');
      setTimeout(() => {
        if (onNavigate) onNavigate('market');
      }, 1400);
      return;
    }

    // 4. Farm Details Intent
    if (lower.includes('জমি') || lower.includes('মাটি') || lower.includes('খামার') || lower.includes('farm') || lower.includes('field')) {
      const reply = lang === 'bn'
        ? `আপনার নির্বাচিত জমি ${activeField?.name || ''} এর তথ্য দেখানো হচ্ছে।`
        : `Showing details for your active field ${activeField?.name || ''}.`;
      setResponseText(reply);
      speakText(reply);
      setState('answered');
      setTimeout(() => {
        if (onNavigate) onNavigate('field');
      }, 1400);
      return;
    }

    // 5. Profit & Harvest Intent
    if (lower.includes('লাভ') || lower.includes('খরচ') || lower.includes('হিসাব') || lower.includes('profit') || lower.includes('harvest')) {
      const reply = lang === 'bn'
        ? `ফসলের সম্ভাব্য লাভ ও খরচের হিসাব পাতা খোলা হলো।`
        : `Opening harvest profit and cost calculator.`;
      setResponseText(reply);
      speakText(reply);
      setState('answered');
      setTimeout(() => {
        if (onNavigate) onNavigate('harvest_profit');
      }, 1400);
      return;
    }

    // 6. General Agricultural Question -> Backend Assistant API
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: [],
          context: {
            language: lang,
            field: {
              name: activeField ? (activeField.is_demo ? `${activeField.name} [DEMO]` : activeField.name) : 'No registered parcel selected',
              soil_texture: activeField?.soil_texture || 'loam',
              soil_ph: activeField?.soil_ph ?? 6.5,
              organic_matter_pct: activeField?.organic_matter ?? 2.5,
              irrigation_capacity_mm: activeField?.irrigation_capacity_mm ?? 90
            },
            weather: {
              temperature_c: nasa?.temperature_c || 28.0,
              precipitation_mm: nasa?.rainfall_mm || 5.0
            }
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const fullReply = data.reply || (lang === 'bn' ? 'তথ্য পাওয়া যায়নি।' : 'No answer available.');
        setResponseText(fullReply);
        // Speak short concise answer
        const spokenExcerpt = fullReply.split('\n')[0].replace(/[#*`_]/g, '');
        speakText(spokenExcerpt);
        setState('answered');
      } else {
        throw new Error('API offline');
      }
    } catch {
      const fallbackReply = lang === 'bn'
        ? `আপনার জমির মাটি ও আবহাওয়ার সাথে আমন ধান, সরিষা বা মসুর ডাল সবচেয়ে মানানসই। বিস্তারিত জানতে 'ফসলের পরামর্শ' দেখুন।`
        : `For your soil and climate, Aman rice, mustard, or lentils are well suited. Check Crop Advice for details.`;
      setResponseText(fallbackReply);
      speakText(fallbackReply);
      setState('answered');
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      if (!isSupported) {
        setErrorMessage(lang === 'bn'
          ? 'আপনার ব্রাউজারে ভয়েস সুবিধা নেই। অনুগ্রহ করে গুগল ক্রোম ব্যবহার করুন বা নিচে টাইপ করুন।'
          : 'Speech recognition is not supported in this browser. Please use Chrome or type below.');
      }
      return;
    }
    accumulatedFinalRef.current = '';
    setTranscript('');
    setManualInput('');
    setResponseText('');
    setErrorMessage('');
    try {
      recognitionRef.current.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
      // If already started, ignore or restart
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 200);
      } catch {}
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    isListeningRef.current = false;
    setState(prev => prev === 'listening' ? 'ready' : prev);
  };

  const handleSubmit = (text) => {
    const query = (text || manualInput).trim();
    if (!query || isSubmittingRef.current || state === 'processing') return;
    isSubmittingRef.current = true;
    stopListening();
    processSpokenCommand(query).finally(() => {
      isSubmittingRef.current = false;
    });
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`_]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    utterance.rate = 0.95; // Slightly slower for clear understanding
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    setTranscript(promptText);
    setManualInput(promptText);
    handleSubmit(promptText);
  };

  return (
    <>
      {/* Floating Microphone Action Button */}
      <div className="farmer-voice-floating-container">
        <button
          type="button"
          className={`farmer-voice-fab ${state === 'listening' ? 'is-listening' : ''}`}
          onClick={() => {
            setIsOpen(true);
            if (state !== 'listening') {
              startListening();
            }
          }}
          title={t('voice_btn_title')}
          aria-label={t('voice_btn_title')}
        >
          <span className="farmer-voice-fab-icon">🎙️</span>
          <span className="farmer-voice-fab-label">{lang === 'bn' ? 'মুখে বলুন' : 'Speak'}</span>
          {state === 'listening' && <span className="farmer-voice-pulse" />}
        </button>
      </div>

      {/* Voice Assistant Modal */}
      {isOpen && (
        <div className="farmer-voice-modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="farmer-voice-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-modal-title"
          >
            {/* Header */}
            <div className="farmer-voice-modal-header">
              <div className="farmer-voice-title-wrap">
                <span className="farmer-voice-badge-icon">🎙️</span>
                <div>
                  <h3 id="voice-modal-title" className="farmer-voice-title">{t('voice_modal_title')}</h3>
                  <p className="farmer-voice-subtitle">
                    {lang === 'bn' ? 'সহজ কথায় বাংলায় প্রশ্ন করুন' : 'Ask questions naturally with your voice'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="farmer-voice-close-btn"
                onClick={() => {
                  stopListening();
                  stopSpeaking();
                  setIsOpen(false);
                }}
                aria-label={t('close')}
              >
                ✕
              </button>
            </div>

            {/* Error / Permission Banner */}
            {errorMessage && (
              <div className="farmer-voice-error-banner" style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#be123c',
                padding: '10px 14px',
                borderRadius: 8,
                margin: '10px 16px 0',
                fontSize: 13,
                lineHeight: 1.4
              }}>
                <strong>⚠️ {lang === 'bn' ? 'বিজ্ঞপ্তি:' : 'Notice:'}</strong> {errorMessage}
              </div>
            )}

            {/* Visual State & Mic Orb */}
            <div className="farmer-voice-orb-section">
              <button
                type="button"
                className={`farmer-voice-orb ${state === 'listening' ? 'active-pulse' : ''}`}
                onClick={() => {
                  if (state === 'listening') {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                title={state === 'listening' ? (lang === 'bn' ? 'থামাতে চাপুন' : 'Click to stop') : (lang === 'bn' ? 'শুনতে চাপুন' : 'Click to speak')}
              >
                <span className="farmer-voice-orb-icon">
                  {state === 'listening' ? '🛑' : state === 'processing' ? '⏳' : '🎙️'}
                </span>
              </button>

              <div className="farmer-voice-status-text">
                {state === 'listening' && (
                  <span className="voice-status-listening">
                    <span className="voice-dot" /> {t('voice_listening')}
                  </span>
                )}
                {state === 'processing' && (
                  <span className="voice-status-processing">{t('voice_processing')}</span>
                )}
                {state === 'ready' && (
                  <span className="voice-status-ready">{t('voice_ready')}</span>
                )}
                {state === 'error' && (
                  <span className="voice-status-error">{t('voice_error')}</span>
                )}
                {state === 'answered' && (
                  <span className="voice-status-ready">
                    {lang === 'bn' ? 'উত্তর প্রস্তুত হয়েছে' : 'Answer ready'}
                  </span>
                )}
              </div>
            </div>

            {/* Response Card */}
            {responseText && (
              <div className="farmer-voice-response-card">
                <div className="farmer-voice-response-header">
                  <span className="farmer-voice-card-label">
                    {lang === 'bn' ? 'সহকারীর উত্তর:' : 'Assistant Answer:'}
                  </span>
                  {isSpeaking ? (
                    <button
                      type="button"
                      className="farmer-voice-audio-btn is-speaking"
                      onClick={stopSpeaking}
                    >
                      {t('voice_stop_speak_btn')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="farmer-voice-audio-btn"
                      onClick={() => speakText(responseText)}
                    >
                      {t('voice_speak_btn')}
                    </button>
                  )}
                </div>
                <div className="farmer-voice-response-text">
                  {responseText}
                </div>
              </div>
            )}

            {/* Editable Recognized Text & Fallback Typed Input */}
            <div className="farmer-voice-text-fallback">
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #64748b)', marginBottom: 6, display: 'block' }}>
                {transcript
                  ? (lang === 'bn' ? 'স্বীকৃত বাক্য (প্রয়োজনে সম্পাদনা করে পাঠান):' : 'Recognized query (edit if needed before sending):')
                  : (lang === 'bn' ? 'মুখে বলুন অথবা এখানে লিখে প্রশ্ন করুন:' : 'Speak or type your question here:')}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="farmer-voice-input"
                  placeholder={lang === 'bn' ? 'যেমন: আজকের আবহাওয়া বলো / ধানের সার খরচ কত?' : 'e.g. Today weather / Potato harvest profit?'}
                  value={manualInput}
                  onChange={(e) => {
                    setManualInput(e.target.value);
                    setTranscript(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualInput.trim()) {
                      handleSubmit(manualInput.trim());
                    }
                  }}
                />
                <button
                  type="button"
                  className="farmer-voice-send-btn"
                  disabled={!manualInput.trim() || state === 'processing'}
                  onClick={() => {
                    if (manualInput.trim()) {
                      handleSubmit(manualInput.trim());
                    }
                  }}
                >
                  {state === 'processing' ? (lang === 'bn' ? 'অপেক্ষা...' : '...') : (lang === 'bn' ? 'পাঠান' : 'Send')}
                </button>
              </div>
              {state === 'listening' && (
                <small style={{ color: '#16a34a', display: 'block', marginTop: 4, fontSize: 11.5 }}>
                  🎙️ {lang === 'bn' ? 'শুনছি... আপনার কথা শেষ হলে "পাঠান" চাপুন বা ২-৩ সেকেন্ড থামুন।' : 'Listening... Speak complete sentence, then press Send.'}
                </small>
              )}
            </div>

            {/* Suggested Spoken Phrases */}
            <div className="farmer-voice-suggestions">
              <span className="farmer-voice-suggestions-title">{t('voice_suggested_queries')}</span>
              <div className="farmer-voice-chips">
                <button
                  type="button"
                  className="farmer-voice-chip"
                  onClick={() => handleQuickPrompt(t('q_best_crop'))}
                >
                  🌾 {t('q_best_crop')}
                </button>
                <button
                  type="button"
                  className="farmer-voice-chip"
                  onClick={() => handleQuickPrompt(t('q_today_weather'))}
                >
                  🌦️ {t('q_today_weather')}
                </button>
                <button
                  type="button"
                  className="farmer-voice-chip"
                  onClick={() => handleQuickPrompt(t('q_market_price'))}
                >
                  💰 {t('q_market_price')}
                </button>
                <button
                  type="button"
                  className="farmer-voice-chip"
                  onClick={() => handleQuickPrompt(t('q_paddy_cost'))}
                >
                  📋 {t('q_paddy_cost')}
                </button>
                <button
                  type="button"
                  className="farmer-voice-chip"
                  onClick={() => handleQuickPrompt(t('q_my_farm'))}
                >
                  🗺️ {t('q_my_farm')}
                </button>
              </div>
            </div>

            {/* Action Confirmation Modal if triggered */}
            {confirmationAction && (
              <div className="farmer-confirm-banner">
                <p>{confirmationAction.prompt}</p>
                <div className="farmer-confirm-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      confirmationAction.onConfirm();
                      setConfirmationAction(null);
                    }}
                  >
                    {t('confirm_yes')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setConfirmationAction(null)}
                  >
                    {t('confirm_no')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
