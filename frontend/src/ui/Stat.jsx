import React, { useState, useEffect, useRef } from 'react';

// Count-up animation for numeric values (600ms on first appear, disabled on reduced motion)
function useCountUp(targetVal, duration = 600) {
  const [display, setDisplay] = useState(targetVal);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (animatedRef.current || targetVal == null) {
      setDisplay(targetVal);
      return;
    }

    // Check prefers-reduced-motion
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(targetVal);
      animatedRef.current = true;
      return;
    }

    const str = String(targetVal);
    // Find numeric part
    const numMatch = str.match(/([0-9]+(\.[0-9]+)?)/);
    if (!numMatch) {
      setDisplay(targetVal);
      animatedRef.current = true;
      return;
    }

    const num = parseFloat(numMatch[1]);
    const prefix = str.slice(0, numMatch.index);
    const suffix = str.slice(numMatch.index + numMatch[0].length);
    const isDecimal = numMatch[1].includes('.');
    const decimals = isDecimal ? numMatch[1].split('.')[1].length : 0;

    let startTime = null;
    let frameId;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out quad: 1 - (1 - t)^2
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = (num * eased).toFixed(decimals);
      setDisplay(`${prefix}${current}${suffix}`);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplay(targetVal);
        animatedRef.current = true;
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [targetVal, duration]);

  return display;
}

export function Stat({
  label,
  value,
  unit,
  sub,
  tone = 'neutral', // 'neutral' | 'accent' | 'leaf' | 'water' | 'sun' | 'alert' | 'hud'
  className = '',
  style = {}
}) {
  const toneClass = tone !== 'neutral' ? `ui-stat-tone-${tone}` : '';
  const animatedValue = useCountUp(value);
  const displayValue = animatedValue != null && animatedValue !== '' ? animatedValue : '—';

  return (
    <div className={`ui-stat ${className}`} style={style}>
      {label && <span className="ui-stat-label">{label}</span>}
      <div className="ui-stat-value-wrap">
        <span className={`ui-stat-value ${toneClass}`}>{displayValue}</span>
        {unit && <span className="ui-stat-unit">{unit}</span>}
      </div>
      {sub && <span className="ui-stat-sub">{sub}</span>}
    </div>
  );
}

export default Stat;
