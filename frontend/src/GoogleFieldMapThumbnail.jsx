import React, { useEffect, useRef, useState } from 'react';

const VITE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function GoogleFieldMapThumbnail({
  latitude,
  longitude,
  name = '',
  height = '180px',
  onClick = null
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const lat = latitude === null || latitude === undefined || latitude === '' ? NaN : Number(latitude);
  const lng = longitude === null || longitude === undefined || longitude === '' ? NaN : Number(longitude);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  const initMap = async () => {
    if (!containerRef.current || !window.google?.maps) {
      setLoadError(true);
      return;
    }

    try {
      const center = { lat, lng };

      let MapConstructor = window.google.maps.Map;
      let MarkerConstructor = window.google.maps.Marker;

      if (!MapConstructor && window.google.maps.importLibrary) {
        try {
          const mapsLib = await window.google.maps.importLibrary('maps');
          MapConstructor = mapsLib.Map;
        } catch {}
      }

      if (!MarkerConstructor && window.google.maps.importLibrary) {
        try {
          const markerLib = await window.google.maps.importLibrary('marker');
          MarkerConstructor = markerLib.Marker || markerLib.AdvancedMarkerElement;
        } catch {}
      }

      if (!MapConstructor) {
        setLoadError(true);
        return;
      }

      if (!mapInstanceRef.current) {
        const map = new MapConstructor(containerRef.current, {
          center,
          zoom: 13,
          mapTypeId: 'hybrid',
          disableDefaultUI: true,
          gestureHandling: 'none',
          keyboardShortcuts: false,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          scrollwheel: false,
          draggable: false,
          clickableIcons: false
        });

        const marker = MarkerConstructor
          ? new MarkerConstructor({
              position: center,
              map,
              title: name || (hasCoordinates ? `${Number(lat).toFixed(4)}° N, ${Number(lng).toFixed(4)}° E` : 'Field Location')
            })
          : null;

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;

        setTimeout(() => {
          if (mapInstanceRef.current && window.google?.maps?.event) {
            window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
            mapInstanceRef.current.setCenter(center);
          }
        }, 200);
      } else {
        mapInstanceRef.current.setCenter(center);
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setPosition(center);
        }
      }

      setMapLoaded(true);
      setLoadError(false);
    } catch (err) {
      console.warn('Thumbnail map initialization fallback:', err);
      setLoadError(true);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    if (!hasCoordinates) {
      setLoadError(false);
      return () => { isCancelled = true; };
    }

    if (window.google?.maps) {
      initMap();
      return;
    }

    const scriptId = 'google-maps-api-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      const keyParam = VITE_KEY ? `&key=${encodeURIComponent(VITE_KEY)}` : '';
      script.src = `https://maps.googleapis.com/maps/api/js?libraries=places,geometry${keyParam}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (!isCancelled) initMap();
      };
      script.onerror = () => {
        if (!isCancelled) setLoadError(true);
      };

      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(interval);
          if (!isCancelled) initMap();
        }
      }, 100);
      const timer = setTimeout(() => {
        clearInterval(interval);
        if (!window.google?.maps && !isCancelled) {
          setLoadError(true);
        }
      }, 3500);
      return () => {
        isCancelled = true;
        clearInterval(interval);
        clearTimeout(timer);
      };
    }

    return () => {
      isCancelled = true;
    };
  }, [lat, lng, hasCoordinates]);

  useEffect(() => {
    if (!containerRef.current) return;
    const dismissPopup = () => {
      if (!containerRef.current) return;
      const divs = containerRef.current.querySelectorAll('div');
      divs.forEach(d => {
        if (d.textContent && (d.textContent.includes("can't load Google Maps correctly") || d.textContent.includes("Do you own this website"))) {
          const popup = d.closest('div[style*="Roboto"]') || d.closest('div[style*="max-width"]') || d;
          if (popup) popup.style.setProperty('display', 'none', 'important');
        }
        if (d.tagName === 'BUTTON' && d.textContent.trim() === 'OK') {
          try { d.click(); } catch {}
        }
      });
    };
    dismissPopup();
    const observer = new MutationObserver(dismissPopup);
    observer.observe(containerRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!hasCoordinates) {
    return (
      <div className="field-card-map-thumbnail map-location-unavailable" style={{ height, display: 'grid', placeItems: 'center' }}>
        Coordinates not registered
      </div>
    );
  }

  return (
    <div
      className="field-card-map-thumbnail"
      style={{
        height,
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        background: '#1a2e22',
        cursor: onClick ? 'pointer' : 'default'
      }}
      onClick={onClick || undefined}
      title={onClick ? `Click to inspect ${name || 'field'} location` : (hasCoordinates ? `${name || 'Field'} (${Number(lat).toFixed(4)}°, ${Number(lng).toFixed(4)}°)` : `${name || 'Field'} (Coordinates not set)`)}
    >
      {/* Real Google Map Element */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: loadError ? 'none' : 'block'
        }}
      />

      {/* Fallback Satellite Grid when offline or loading */}
      {loadError && (
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            background: 'radial-gradient(ellipse at center, #1b3826 0%, #0d1e14 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Topographic grid overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }}
          />
          {/* Center Marker Icon */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#e74c3c" stroke="#ffffff" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
            </svg>
          </div>
        </div>
      )}

      {/* Satellite Badge (Top-Left) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(15, 23, 18, 0.78)',
          color: '#85e89d',
          padding: '3px 8px',
          borderRadius: 6,
          fontSize: 10.5,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 3,
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}
      >
        <span>🛰️ Satellite Preview</span>
      </div>

      {/* Field Location / Name Chip (Top-Right) */}
      {name && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(255, 255, 255, 0.92)',
            color: 'var(--text-main)',
            padding: '3px 9px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            maxWidth: '55%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 3,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
          }}
        >
          {name}
        </div>
      )}

      {/* Coordinate Strip (Bottom-Left) */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 10,
          background: 'rgba(15, 23, 18, 0.82)',
          color: '#ffffff',
          padding: '3px 9px',
          borderRadius: 6,
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          zIndex: 3,
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}
      >
        <span style={{ color: '#e74c3c' }}>📍</span>
        <span>{hasCoordinates ? `${Number(lat).toFixed(4)}° N, ${Number(lng).toFixed(4)}° E` : 'Coordinates not set'}</span>
      </div>

      {/* Click to Expand Overlay (Appears on Hover) */}
      {onClick && (
        <div className="thumbnail-hover-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <span>Click to View Full Map</span>
        </div>
      )}
    </div>
  );
}
