import React, { useState, useRef, useEffect } from 'react';
import { request } from './apiClient.js';

const SUGGESTED_PROMPTS = [
  {
    category: 'Rotation & Strategy',
    items: [
      { label: '🌾 Best Rotation & Why?', text: 'Which crop rotation is best for my selected field, and why?' },
      { label: '💧 Low Irrigation Impact', text: 'Why did the crop rotation recommendation change after I reduced irrigation?' },
      { label: '📊 Simple MILP Explanation', text: 'Explain my MILP optimization result in simple language for a farmer.' },
      { label: '⚖️ MILP vs RL vs Rule Benchmark', text: 'Compare the MILP plan with the RL simulation and rule-based baseline plans.' }
    ]
  },
  {
    category: 'Risks & Feasibility',
    items: [
      { label: '🔥 Hotter & Drier Next Season', text: 'What happens to my crop rotation if next season is hotter and rainfall decreases?' },
      { label: '🚫 Constraint Violations', text: 'Which agricultural and water constraints made some crop choices infeasible in the optimizer?' },
      { label: '💧 Total Water Requirement', text: 'How much water does the recommended crop rotation require across the full planning horizon?' },
      { label: '🌱 Sustainability Score Meaning', text: 'Explain the sustainability score. Is it a real laboratory soil measurement or an empirical proxy?' }
    ]
  },
  {
    category: 'Outcomes & Decisions',
    items: [
      { label: '📈 Actual vs Estimated Comparison', text: 'What actual harvest outcome data do we have logged for this field, and how does it compare with prior optimizer estimates?' },
      { label: '📋 Next-Season Decision Checklist', text: 'What field, weather, and market factors should I check before making the next-season planting decision?' },
      { label: '🇧🇩 বাংলায় ব্যাখ্যা (Bangla)', text: 'এই জমির জন্য উপযুক্ত ফসল আবর্তন পরিকল্পনা ও মাটির স্বাস্থ্য সম্পর্কে বাংলায় পরামর্শ দিন।' },
      { label: '🏆 Summary for Judges & Farmers', text: 'Give me a concise 1-minute executive summary of this field\'s plan and climate resilience that I can present to a judge or farmer.' }
    ]
  }
];

export default function AiAssistantView({
  activeField,
  nasa,
  summary,
  plan,
  ml,
  rl,
  comparisonLab,
  robustness,
  outcomes,
  user,
  lang = 'bn',
  onBack,
  onNavigateTab
}) {
  const [language, setLanguage] = useState(lang || 'bn'); // 'en' | 'bn'
  const [presentationMode, setPresentationMode] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    if (lang && (lang === 'bn' || lang === 'en')) {
      setLanguage(lang);
    }
  }, [lang]);

  const initialGreeting = language === 'bn'
    ? (activeField
        ? `নমস্কার / আসসালামু আলাইকুম! আমি **FieldShift কৃষি সিদ্ধান্ত সহকারী** (টিম AZOIC | NASA Space Apps Challenge 2026)।\n\nবর্তমানে **${activeField.name}** (${activeField.soil_texture || 'দোঁআশ'} মাটি, pH ${activeField.soil_ph ?? '৬.৫'}, জৈব উপাদান ${activeField.organic_matter ?? '২.৫'}%, আয়তন ${activeField.area_ha || 10} হেক্টর) এর উপাত্ত সংযুক্ত রয়েছে। ফসল নির্বাচন, সেচ বা সম্ভাব্য লাভ সম্পর্কে যে কোনো প্রশ্ন করুন!`
        : `নমস্কার / আসসালামু আলাইকুম! আমি **FieldShift কৃষি সিদ্ধান্ত সহকারী**।\n\nবর্তমানে কোনো জমি নির্বাচিত নেই। আপনি উপরের মেনু থেকে **বগুড়া ডেমো খামার (১০ হেক্টর)** নির্বাচন করতে পারেন অথবা 'আমার খামার' পাতায় গিয়ে নতুন জমি নিবন্ধন করতে পারেন। আপনার যে কোনো কৃষি প্রশ্ন করুন!`)
    : (activeField
        ? `Hello! I am the **FieldShift Agronomic AI Assistant** (NASA Space Apps Challenge 2026 | Team AZOIC).\n\nSynchronized context for **${activeField.name}** (${activeField.soil_texture || 'loam'}, pH ${activeField.soil_ph ?? '6.5'}, ${activeField.organic_matter ?? '2.5'}% OM, ${activeField.area_ha || 10} ha) and NASA POWER agroclimatology telemetry.\n\nAsk me about crop planning, irrigation quotas, or market profit trade-offs!`
        : `Hello! I am the **FieldShift Agronomic AI Assistant**.\n\nNo field parcel is currently selected. You can select the **Bogura Demo Field (10 ha)** or register your field in My Farm. Ask any crop or soil question!`);

  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      role: 'assistant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'FieldShift AI Agent',
      isFallback: false,
      text: initialGreeting
    }
  ]);

  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const buildContextPayload = () => {
    const rotationStr = plan?.selected_crop_by_period
      ? Object.entries(plan.selected_crop_by_period).map(([p, c]) => `${p}: ${c}`).join(' -> ')
      : '';

    return {
      language,
      field: {
        name: activeField ? (activeField.is_demo ? `${activeField.name}` : activeField.name) : 'No registered parcel selected',
        is_demo: Boolean(activeField?.is_demo || activeField?.id === 'demo'),
        latitude: activeField?.latitude ?? null,
        longitude: activeField?.longitude ?? null,
        field_size_ha: activeField?.area_ha ?? activeField?.field_size_ha ?? null,
        soil_texture: activeField?.soil_texture || null,
        soil_ph: activeField?.soil_ph ?? null,
        organic_matter_pct: activeField?.organic_matter ?? activeField?.organic_matter_pct ?? null,
        irrigation_capacity_mm: activeField?.irrigation_capacity_mm ?? null,
        previous_crop: activeField?.previous_crop || null
      },
      weather: {
        temperature_c: nasa?.telemetry?.observed_temperature_c || 26.5,
        humidity_pct: nasa?.telemetry?.average_humidity_pct || 72,
        precipitation_mm: nasa?.telemetry?.precipitation_daily_mm || 3.8,
        wind_speed_ms: nasa?.telemetry?.wind_speed_ms || 2.1,
        source: nasa?.data_status === 'observed'
          ? 'NASA POWER Daily API (Reanalysis / Climatology)'
          : (activeField?.is_demo ? 'NASA POWER Historical Bogura Benchmark' : 'NASA POWER Historical Reanalysis Benchmark')
      },
      plan: {
        rotation_str: rotationStr,
        yield_tons: plan?.objective_value,
        gross_margin_bdt: plan?.gross_margin_bdt,
        water_mm: plan?.total_water_mm,
        solver_status: plan?.solver_status || 'Optimal'
      },
      comparison: {
        summary: comparisonLab?.trade_off_analysis?.headline || 'MILP maximized profit within linear bounds; RL explored adaptive drought resilience'
      },
      scenarios: {
        robustness_score: robustness?.overall_robustness_score_pct || 80
      },
      outcomes: {
        recorded_seasons: Array.isArray(outcomes) ? outcomes.length : 0
      }
    };
  };

  const handleSend = async (textToSend) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: messageContent
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    const contextData = buildContextPayload();
    const historyPayload = messages.map(m => ({ role: m.role, text: m.text }));

    try {
      const resJson = await request('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: messageContent,
          history: historyPayload,
          context: contextData
        })
      });

      const aiMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: resJson.model || 'gemini-flash-lite-latest',
        isFallback: Boolean(resJson.is_fallback),
        text: resJson.reply,
        actionIntent: resJson.action_intent || null
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'offline-rule-based-guidance',
        isFallback: true,
        text: `### 1. Short Answer\n**[Offline Rule-Based Agronomic Guidance]** (${error.message}). For ${activeField?.name || 'this parcel'}, prioritize alternating nitrogen-fixing pulses (Lentil, Chickpea) with cereal crops to preserve soil structure and maintain moisture efficiency.\n\n### 2. Evidence from this Field\n- Soil Profile: **${activeField?.soil_texture || 'loam'}** soil with **${activeField?.soil_ph ?? 6.5} pH** and **${activeField?.organic_matter ?? 2.0}% organic matter**.\n- Water Budget: Seasonal irrigation capacity is **${activeField?.irrigation_capacity_mm || 400} mm**.\n\n### 3. Recommended Next Step\nEnsure rotation breaks back-to-back Solanaceae/Poaceae to prevent soil-borne pathogens.\n\n### 4. Trade-offs and Risks\nExcess rainfall during germination can trigger root rot in legumes; ensure furrow drainage.\n\n### 5. Data Limitations\nGenerated by deterministic local agronomy rules. For critical farm decisions, obtain an accredited soil test.\n\n### 6. Suggested Follow-up Action\nRun the **3-Way Comparison Lab** to benchmark strategies.`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'FieldShift AI Agent',
        isFallback: false,
        text: language === 'bn'
          ? 'কথোপকথন মুছে ফেলা হয়েছে। আপনার পরবর্তী কৃষি প্রশ্নের জন্য প্রস্তুত!'
          : 'Conversation cleared. I am ready for your next agronomic inquiry!'
      }
    ]);
  };

  // Structured Markdown Renderer for 6-Part Agronomic Responses
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;

    // Presentation mode simplifies headings for quick reading
    const cleanText = presentationMode
      ? rawText.replace(/### \d+\. /g, '### ')
      : rawText;

    const lines = cleanText.split('\n');

    return lines.map((line, lIdx) => {
      const trimmed = line.trim();

      // Heading 3 (e.g. ### 1. Short Answer)
      if (trimmed.startsWith('### ')) {
        const headingText = trimmed.replace(/^###\s+/, '');
        const isShortAnswer = headingText.toLowerCase().includes('short answer') || headingText.includes('সংক্ষিপ্ত উত্তর');
        const isEvidence = headingText.toLowerCase().includes('evidence') || headingText.includes('প্রমাণাদি');
        const isAction = headingText.toLowerCase().includes('step') || headingText.includes('পদক্ষেপ');
        const isRisk = headingText.toLowerCase().includes('risk') || headingText.includes('trade-off') || headingText.includes('ঝুঁকি');
        const isLimit = headingText.toLowerCase().includes('limitation') || headingText.includes('সীমাবদ্ধতা');
        const isFollowup = headingText.toLowerCase().includes('follow-up') || headingText.includes('করণীয়');

        let pillClass = 'ai-section-pill-generic';
        if (isShortAnswer) pillClass = 'ai-section-pill-answer';
        else if (isEvidence) pillClass = 'ai-section-pill-evidence';
        else if (isAction) pillClass = 'ai-section-pill-action';
        else if (isRisk) pillClass = 'ai-section-pill-risk';
        else if (isLimit) pillClass = 'ai-section-pill-limit';
        else if (isFollowup) pillClass = 'ai-section-pill-followup';

        return (
          <div key={lIdx} className="ai-chat-section-heading">
            <span className={`ai-section-pill ${pillClass}`}>{headingText}</span>
          </div>
        );
      }

      // Heading 2 or 1
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        const hText = trimmed.replace(/^#+\s+/, '');
        return (
          <h4 key={lIdx} className="ai-chat-h4">
            {renderInlineMarkdown(hText)}
          </h4>
        );
      }

      // Unordered list
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const itemContent = trimmed.substring(2);
        return (
          <li key={lIdx} className="ai-chat-list-item">
            {renderInlineMarkdown(itemContent)}
          </li>
        );
      }

      // Blank line
      if (!trimmed) {
        return <div key={lIdx} style={{ height: 6 }} />;
      }

      // Regular line
      return (
        <p key={lIdx} className="ai-chat-paragraph">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^\$]+\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="ai-chat-strong">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="ai-chat-code">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className="ai-assistant-container">
      {/* Top Header */}
      <div className="view-sub-header ai-view-header">
        <div className="ai-title-group">
          <div className="ai-title-with-badge">
            <h2>AI Agronomist &amp; Decision Intelligence</h2>
            <span className="ai-status-pill online">
              <span className="ai-status-dot" />
              AI Decision Assistant
            </span>
          </div>
          <p className="ai-subtitle">
            Context-grounded agronomic advice for crop rotation, moisture deficits, and climate adaptation in Bangladesh.
          </p>
        </div>

        <div className="ai-header-controls">
          {/* Language Selector */}
          <div className="ai-lang-toggle" role="group" aria-label="Language selection">
            <button
              type="button"
              className={`ai-lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              type="button"
              className={`ai-lang-btn ${language === 'bn' ? 'active' : ''}`}
              onClick={() => setLanguage('bn')}
              title="বাংলা ভাষায় উত্তর পান"
            >
              বাংলা
            </button>
          </div>

          {/* Presentation Mode Toggle */}
          <button
            type="button"
            className={`ai-mode-toggle-btn ${presentationMode ? 'active' : ''}`}
            onClick={() => setPresentationMode(!presentationMode)}
            title="Toggle executive summary briefing mode for farmers or judges"
          >
            {presentationMode ? '📋 Briefing Mode ON' : '🔬 Scientific Detail'}
          </button>

          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              ← Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Field Telemetry Context Bar */}
      <div className="ai-context-banner">
        <div className="ai-context-badge">
          <span className="live-pulse-dot" />
          ACTIVE CONTEXT
        </div>
        <div className="ai-context-field-name">
          <strong>{activeField?.name || 'বগুড়া ডেমো খামার [DEMO]'}</strong>
          <span className="ai-context-coords">
            ({activeField?.latitude != null ? Number(activeField.latitude).toFixed(2) : '24.85'}°N, {activeField?.longitude != null ? Number(activeField.longitude).toFixed(2) : '89.37'}°E · {activeField?.area_ha != null ? Number(activeField.area_ha).toFixed(1) : '10.0'} ha)
          </span>
        </div>
        <div className="ai-context-metrics">
          <span className="ai-context-tag">
            Soil: <strong>{activeField?.soil_texture || 'loam'}</strong>
          </span>
          <span className="ai-context-tag">
            pH: <strong>{activeField?.soil_ph != null ? activeField.soil_ph : '6.5'}</strong>
          </span>
          <span className="ai-context-tag">
            OM: <strong>{activeField?.organic_matter ?? activeField?.organic_matter_pct ?? '2.2'}%</strong>
          </span>
          <span className="ai-context-tag">
            Irrigation: <strong>{activeField?.irrigation_capacity_mm || 420} mm</strong>
          </span>
          <span className="ai-context-tag highlight">
            NASA Temp: <strong>{nasa?.telemetry?.observed_temperature_c || '26.5'}°C</strong>
          </span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="ai-chat-card">
        {/* Messages Scroll Area */}
        <div className="ai-chat-body">
          {messages.map((msg) => (
            <div key={msg.id} className={`ai-message-row ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="ai-avatar-assistant">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
              )}

              <div className="ai-bubble-container">
                <div className={`ai-message-bubble ${msg.role} ${presentationMode ? 'briefing-card' : ''}`}>
                  {/* Model badge */}
                  {msg.role === 'assistant' && (
                    <div className="ai-bubble-header">
                      <span className={`ai-model-tag ${msg.isFallback ? 'fallback' : 'generative'}`}>
                        {msg.isFallback ? '⚡ Offline Agronomic Rules' : `🤖 Gemini (${msg.model})`}
                      </span>
                      <span className="ai-message-timestamp">{msg.time}</span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="ai-message-markdown">
                    {renderFormattedText(msg.text)}
                  </div>

                  {/* Interactive Action Intent Card */}
                  {msg.actionIntent && (
                    <div className="ai-action-card">
                      <div className="ai-action-icon">🚀</div>
                      <div className="ai-action-content">
                        <strong>{msg.actionIntent.label}</strong>
                        <p>{msg.actionIntent.description}</p>
                      </div>
                      <button
                        type="button"
                        className="ai-action-execute-btn"
                        onClick={() => {
                          if (onNavigateTab && msg.actionIntent.tab) {
                            onNavigateTab(msg.actionIntent.tab);
                          }
                        }}
                      >
                        Execute →
                      </button>
                    </div>
                  )}

                  {/* Bottom Message Actions */}
                  {msg.role === 'assistant' && (
                    <div className="ai-bubble-footer">
                      <button
                        type="button"
                        className="ai-copy-btn"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        title="Copy answer to clipboard"
                      >
                        {copiedId === msg.id ? '✓ Copied' : '📋 Copy'}
                      </button>
                      <span className="ai-provenance-tag">
                        Field: {activeField?.name || 'Selected Parcel'} · NASA Telemetry Grounded
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="ai-avatar-user">
                  {user ? (user.name || user.email || 'U').slice(0, 1).toUpperCase() : '👨‍🌾'}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="ai-message-row assistant">
              <div className="ai-avatar-assistant">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8z" />
                </svg>
              </div>
              <div className="ai-bubble-container">
                <div className="ai-message-bubble assistant ai-loading-bubble">
                  <span className="ai-typing-text">
                    {language === 'bn' ? 'জমি ও আবহাওয়া উপাত্ত বিশ্লেষণ করা হচ্ছে' : 'Gemini is evaluating field telemetry & agronomic constraints'}
                  </span>
                  <span className="ai-typing-dot" />
                  <span className="ai-typing-dot" />
                  <span className="ai-typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Suggestion Chips with Category Tabs */}
        <div className="ai-suggestions-row">
          <div className="ai-suggestion-tabs">
            {SUGGESTED_PROMPTS.map((cat, cIdx) => (
              <button
                key={cIdx}
                type="button"
                className={`ai-suggestion-tab-btn ${activeCategory === cIdx ? 'active' : ''}`}
                onClick={() => setActiveCategory(cIdx)}
              >
                {cat.category}
              </button>
            ))}
          </div>

          <div className="ai-suggestions-scroll">
            {SUGGESTED_PROMPTS[activeCategory].items.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-prompt-chip"
                onClick={() => handleSend(prompt.text)}
                disabled={loading}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="ai-chat-input-bar">
          <button
            type="button"
            className="ai-clear-btn"
            onClick={handleClear}
            title="Clear conversation history"
          >
            Clear
          </button>

          <div className="ai-input-wrapper">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={language === 'bn' ? "ফসল নির্বাচন, মাটির পুষ্টি, সেচ ঘাটতি বা আবহাওয়ার ঝুঁকি সম্পর্কে জিজ্ঞাসা করুন…" : "Ask FieldShift AI about crop choices, drought stress, soil nutrients, or rotation trade-offs…"}
              className="ai-textarea"
              disabled={loading}
            />
            <button
              type="button"
              className="ai-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
              title="Send message (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="ai-footer-disclaimer">
          Gemini-powered agronomic decision support · Grounded in active field soil measurements and NASA POWER telemetry · Decision support only; does not replace on-ground laboratory soil testing.
        </div>
      </div>
    </div>
  );
}
