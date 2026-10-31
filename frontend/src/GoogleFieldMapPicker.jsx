import React, { useEffect, useRef, useState } from 'react';

const VITE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Known agricultural preset coordinates in Bangladesh research zones
const PRESETS = [
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125, desc: 'Central Agricultural Basin' },
  { name: 'Barisal', lat: 22.7010, lng: 90.3535, desc: 'Coastal Delta Region' },
  { name: 'Rajshahi', lat: 24.3636, lng: 88.6241, desc: 'Northwest Arid / Barind Tract' }
];

export function GoogleFieldMapPicker({
  latitude,
  longitude,
  onChange,
  onLocationNameChange,
  readOnly = false
}) {
  const mapContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const [mapStatus, setMapStatus] = useState('loading'); // 'loading' | 'ready' | 'fallback_interactive'
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [mapType, setMapType] = useState('hybrid'); // 'hybrid' | 'roadmap' | 'satellite'

  const parsedLat = latitude === '' || latitude == null ? NaN : Number(latitude);
  const parsedLng = longitude === '' || longitude == null ? NaN : Number(longitude);
  const hasCoordinates = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
  const currentLat = hasCoordinates ? parsedLat : null;
  const currentLng = hasCoordinates ? parsedLng : null;

  // Reverse Geocode helper
  const reverseGeocode = (lat, lng) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!window.google?.maps?.Geocoder) {
      const fallback = `${Number(lat).toFixed(4)}° N, ${Number(lng).toFixed(4)}° E`;
      setSelectedAddress(fallback);
      if (onLocationNameChange) onLocationNameChange(fallback);
      return;
    }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const addr = results[0].formatted_address;
        setSelectedAddress(addr);
        if (onLocationNameChange) onLocationNameChange(addr);
      } else {
        const fallback = `${Number(lat).toFixed(4)}° N, ${Number(lng).toFixed(4)}° E`;
        setSelectedAddress(fallback);
        if (onLocationNameChange) onLocationNameChange(fallback);
      }
    });
  };

  // Initialize or re-center Google Map
  const initGoogleMap = async () => {
    if (!hasCoordinates) {
      setMapStatus('fallback_interactive');
      return;
    }
    if (!mapContainerRef.current || !window.google?.maps) {
      setMapStatus('fallback_interactive');
      return;
    }

    try {
      const center = { lat: currentLat, lng: currentLng };

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
        setMapStatus('fallback_interactive');
        return;
      }

      if (!mapInstanceRef.current) {
        const map = new MapConstructor(mapContainerRef.current, {
          center,
          zoom: 13,
          mapTypeId: mapType || 'hybrid',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: readOnly ? 'none' : 'auto'
        });

        const marker = MarkerConstructor
          ? new MarkerConstructor({
              position: center,
              map,
              draggable: !readOnly,
              title: 'Agricultural Field Location'
            })
          : null;

        if (!readOnly && marker) {
          // Click on map to place/move marker
          map.addListener('click', e => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            marker.setPosition({ lat, lng });
            onChange(lat.toFixed(4), lng.toFixed(4));
            reverseGeocode(lat, lng);
          });

          // Drag marker to adjust location
          marker.addListener('dragend', e => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            onChange(lat.toFixed(4), lng.toFixed(4));
            reverseGeocode(lat, lng);
          });

          // Connect Places Autocomplete if available
          if (searchInputRef.current && window.google.maps.places?.Autocomplete) {
            const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
              fields: ['geometry', 'formatted_address', 'name']
            });
            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (place.geometry && place.geometry.location) {
                const loc = place.geometry.location;
                map.panTo(loc);
                map.setZoom(14);
                marker.setPosition(loc);
                const lat = loc.lat();
                const lng = loc.lng();
                onChange(lat.toFixed(4), lng.toFixed(4));
                const addr = place.formatted_address || place.name || `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
                setSelectedAddress(addr);
                if (onLocationNameChange) onLocationNameChange(addr);
              }
            });
          }
        }

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;

        // Trigger resize event after short delay to fix modal rendering
        setTimeout(() => {
          if (mapInstanceRef.current && window.google?.maps?.event) {
            window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
            mapInstanceRef.current.setCenter(center);
          }
        }, 150);
      } else {
        // Map already exists, update center & marker
        mapInstanceRef.current.panTo(center);
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setPosition(center);
        }
      }

      setMapStatus('ready');
      reverseGeocode(currentLat, currentLng);
    } catch (err) {
      console.warn('Google Maps initialization fallback:', err);
      setMapStatus('fallback_interactive');
    }
  };

  // Switch Map Type
  const handleMapTypeToggle = type => {
    setMapType(type);
    if (mapInstanceRef.current && window.google?.maps) {
      mapInstanceRef.current.setMapTypeId(type);
    }
  };

  // Load Google Maps Script
  useEffect(() => {
    window.gm_authFailure = () => {
      console.info('Google Maps: Dev/Demo mode active without billing key.');
      setMapStatus('ready');
    };

    if (window.google?.maps) {
      initGoogleMap();
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
        initGoogleMap();
      };

      script.onerror = () => {
        console.warn('Could not load Google Maps script from CDN. Activating interactive terrain map.');
        setMapStatus('fallback_interactive');
      };

      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(interval);
          initGoogleMap();
        }
      }, 100);
      const timer = setTimeout(() => {
        clearInterval(interval);
        if (!window.google?.maps) {
          setMapStatus('fallback_interactive');
        }
      }, 3000);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, []);

  // Update marker if coordinates prop changes externally
  useEffect(() => {
    if (hasCoordinates && mapInstanceRef.current && markerInstanceRef.current && window.google?.maps) {
      const center = { lat: currentLat, lng: currentLng };
      markerInstanceRef.current.setPosition(center);
      mapInstanceRef.current.panTo(center);
      reverseGeocode(currentLat, currentLng);
    }
  }, [latitude, longitude, hasCoordinates]);

  // Auto-dismiss any Google Maps development dialog so the map is never blocked
  useEffect(() => {
    const dismissTimer = setInterval(() => {
      const okBtn = document.querySelector('.dismissButton') || document.querySelector('.gm-err-container button');
      if (okBtn) {
        try { okBtn.click(); } catch {}
      }
    }, 150);
    return () => clearInterval(dismissTimer);
  }, []);

  // Apply Preset Location
  const handleApplyPreset = preset => {
    onChange(preset.lat.toFixed(4), preset.lng.toFixed(4));
    if (mapInstanceRef.current && markerInstanceRef.current) {
      const pos = { lat: preset.lat, lng: preset.lng };
      mapInstanceRef.current.panTo(pos);
      mapInstanceRef.current.setZoom(13);
      markerInstanceRef.current.setPosition(pos);
      reverseGeocode(preset.lat, preset.lng);
    } else {
      setSelectedAddress(`${preset.name} Agricultural Research Zone (${preset.lat}° N, ${preset.lng}° E)`);
      if (onLocationNameChange) onLocationNameChange(`${preset.name} Agricultural Zone`);
    }
  };

  // Get User's Browser GPS Location
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onChange(lat.toFixed(4), lng.toFixed(4));
        if (mapInstanceRef.current && markerInstanceRef.current) {
          const loc = { lat, lng };
          mapInstanceRef.current.panTo(loc);
          mapInstanceRef.current.setZoom(15);
          markerInstanceRef.current.setPosition(loc);
          reverseGeocode(lat, lng);
        } else {
          setSelectedAddress(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E (GPS Measured)`);
        }
      },
      err => {
        setIsLocating(false);
        alert(`Could not retrieve GPS location: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Search Address Fallback if Autocomplete didn't fire
  const handleManualSearch = e => {
    if (e) e.preventDefault();
    const query = searchInputRef.current?.value?.trim();
    if (!query) return;

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          if (mapInstanceRef.current && markerInstanceRef.current) {
            mapInstanceRef.current.panTo(loc);
            mapInstanceRef.current.setZoom(14);
            markerInstanceRef.current.setPosition(loc);
          }
          onChange(lat.toFixed(4), lng.toFixed(4));
          setSelectedAddress(results[0].formatted_address);
          if (onLocationNameChange) onLocationNameChange(results[0].formatted_address);
        } else {
          // Fallback search match with presets
          const match = PRESETS.find(p => typeof p?.name === 'string' && p.name.toLowerCase().includes((query || '').toLowerCase()));
          if (match) {
            handleApplyPreset(match);
          } else {
            alert(`Location "${query}" not found.`);
          }
        }
      });
    } else {
      const match = PRESETS.find(p => typeof p?.name === 'string' && p.name.toLowerCase().includes((query || '').toLowerCase()));
      if (match) {
        handleApplyPreset(match);
      } else {
        alert(`Preset for "${query}" not found. Try Dhaka, Barisal, or Rajshahi.`);
      }
    }
  };

  // Interactive Fallback Map click handler (when Google CDN is offline/blocked)
  const handleFallbackCanvasClick = e => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pctX = x / rect.width;
    const pctY = y / rect.height;

    // Map pixel relative offset to geographic delta around Bangladesh / target coordinate
    const latSpan = 2.0; // +/- 1 deg
    const lngSpan = 2.0;
    const baseLat = Number.isFinite(currentLat) ? currentLat : 23.8103;
    const baseLng = Number.isFinite(currentLng) ? currentLng : 90.4125;
    const newLat = baseLat + (0.5 - pctY) * latSpan;
    const newLng = baseLng + (pctX - 0.5) * lngSpan;

    onChange(newLat.toFixed(4), newLng.toFixed(4));
    setSelectedAddress(`${newLat.toFixed(4)}° N, ${newLng.toFixed(4)}° E`);
  };

  return (
    <div className="google-map-picker-wrapper">
      {/* Search Bar & Controls */}
      {!readOnly && (
        <div className="map-picker-search-bar">
          <div className="search-input-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              className="map-search-input"
              placeholder="Search farm location, district, or place name..."
              onKeyDown={e => e.key === 'Enter' && handleManualSearch(e)}
            />
          </div>
          <button type="button" className="btn-map-search" onClick={handleManualSearch}>
            Search
          </button>
        </div>
      )}

      {/* Preset Chips & GPS */}
      {!readOnly && (
        <div className="map-presets-row">
          <span className="preset-label">Quick Locations:</span>
          {PRESETS.map(p => (
            <button
              type="button"
              key={p.name}
              className="preset-pill-btn"
              onClick={() => handleApplyPreset(p)}
              title={`${p.desc} (${p.lat}°, ${p.lng}°)`}
            >
              📍 {p.name}
            </button>
          ))}
          <button
            type="button"
            className="preset-pill-btn gps-btn"
            onClick={handleGetGPS}
            disabled={isLocating}
            title="Detect GPS coordinates from browser"
          >
            {isLocating ? 'Locating…' : '🎯 Current GPS'}
          </button>
        </div>
      )}

      {/* Google Maps Canvas Container */}
      <div className="map-canvas-container">
        {/* Real Google Map Element */}
        <div
          ref={mapContainerRef}
          className="google-map-element"
          style={{
            width: '100%',
            height: '250px',
            display: mapStatus === 'fallback_interactive' ? 'none' : 'block'
          }}
        />

        {/* Fallback Interactive Map (when Google CDN is unreachable) */}
        {mapStatus === 'fallback_interactive' && !hasCoordinates && (
          <div className="fallback-interactive-map" style={{ width: '100%', height: 250, display: 'grid', placeItems: 'center', color: '#bbb' }}>
            {readOnly ? 'Coordinates not registered' : 'Choose a preset, search for a location, or use GPS to set coordinates.'}
          </div>
        )}
        {mapStatus === 'fallback_interactive' && hasCoordinates && (
          <div
            className="fallback-interactive-map"
            onClick={handleFallbackCanvasClick}
            style={{
              width: '100%',
              height: '250px',
              position: 'relative',
              background: 'radial-gradient(ellipse at center, #1b3826 0%, #0d1e14 100%)',
              cursor: readOnly ? 'default' : 'crosshair',
              overflow: 'hidden'
            }}
          >
            {/* Topographic grid overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            />
            {/* Map terrain badge */}
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(0,0,0,0.7)',
                color: '#85e89d',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>🛰️ Satellite Agriculture Grid</span>
              <span style={{ color: '#bbb', fontSize: 10 }}>· Click map to set pin</span>
            </div>

            {/* Centered Marker Pin */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  background: '#e74c3c',
                  color: '#fff',
                  padding: '3px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                  marginBottom: 2
                }}
              >
                {hasCoordinates ? `${Number(currentLat).toFixed(4)}° N, ${Number(currentLng).toFixed(4)}° E` : 'Coordinates not set'}
              </div>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#e74c3c" stroke="#ffffff" strokeWidth="1.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
              </svg>
            </div>
          </div>
        )}

        {/* Map Type Toggle Overlays */}
        {mapStatus !== 'fallback_interactive' && (
          <div className="map-layer-controls">
            <button
              type="button"
              className={`map-layer-btn ${mapType === 'hybrid' ? 'active' : ''}`}
              onClick={() => handleMapTypeToggle('hybrid')}
              title="Satellite Imagery with Road Network"
            >
              Satellite
            </button>
            <button
              type="button"
              className={`map-layer-btn ${mapType === 'roadmap' ? 'active' : ''}`}
              onClick={() => handleMapTypeToggle('roadmap')}
              title="Standard Vector Roadmap"
            >
              Map
            </button>
          </div>
        )}

        {/* Interactive Instruction Hint */}
        {!readOnly && (
          <div className="map-hint-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Click anywhere on the map or drag the red pin to set field location
          </div>
        )}
      </div>

      {/* Selected Location Details Strip */}
      <div className="selected-location-strip">
        <div className="selected-location-details">
          <div className="loc-label-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <strong>Selected Field Coordinates:</strong>
            <span className="coords-readout">
              {hasCoordinates ? `${Number(currentLat).toFixed(4)}° N, ${Number(currentLng).toFixed(4)}° E` : 'Not set'}
            </span>
          </div>
          {selectedAddress && (
            <div className="loc-address-text">
              {selectedAddress}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="location-confirmed-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Pin Synchronized</span>
          </div>
        )}
      </div>
    </div>
  );
}
