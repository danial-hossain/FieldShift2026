// frontend/src/RealFarmCanvas3D.jsx
// Professional Three.js Real-time 3D Agricultural Simulation Canvas
// Powered by ClayFarmScene (plain Three.js) with zero fabricated telemetry.

import React, { useMemo } from 'react';
import { ClayFarmScene } from './ClayFarmScene.jsx';

export function RealFarmCanvas3D({
  fieldProfile,
  experimentalPlots = [],
  activeOverlay = 'crop',
  viewMode = '3d',
  hasAlert = false,
  selectedPlotIndex = 4,
  onSelectPlot,
  lang = 'bn',
}) {
  // Normalize allowed overlays: only 'crop', 'soil', 'rain'
  const safeOverlay = ['crop', 'soil', 'rain'].includes(activeOverlay) ? activeOverlay : 'crop';

  // Normalize plots from fieldProfile or experimentalPlots
  const plots = useMemo(() => {
    if (experimentalPlots && experimentalPlots.length > 0) {
      return experimentalPlots.map((p, idx) => ({
        id: p.id || `P-0${idx + 1}`,
        name: p.name || `Plot ${idx + 1}`,
        crop: p.crop || null,
        soil_texture: p.soil_texture || p.soilType || null,
        rain_mm: p.rain_mm != null ? p.rain_mm : null,
        hasAlert: Boolean(p.hasAlert),
      }));
    }

    if (fieldProfile) {
      return [
        {
          id: 'P-01',
          name: fieldProfile.name || (fieldProfile.district ? `${fieldProfile.district} Farm` : 'Demo Farm'),
          crop: fieldProfile.crop || null,
          soil_texture: fieldProfile.soil_texture || null,
          rain_mm: fieldProfile.rain_mm != null ? fieldProfile.rain_mm : null,
          hasAlert: Boolean(hasAlert),
        },
      ];
    }

    return [];
  }, [experimentalPlots, fieldProfile, hasAlert]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 380, position: 'relative' }}>
      <ClayFarmScene
        plots={plots}
        activeOverlay={safeOverlay}
        viewMode={viewMode}
        hasAlert={hasAlert}
        lang={lang}
        onSelectPlot={onSelectPlot}
        caption={lang === 'bn' ? 'উদাহরণমূলক খামারের মডেল' : 'Illustrative farm model'}
      />
    </div>
  );
}

export default RealFarmCanvas3D;
