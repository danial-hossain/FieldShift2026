import React, { useState, useEffect } from 'react';
import { SatelliteConstellation3D } from './research3d/SatelliteConstellation3D.jsx';

export function SatelliteReadinessView({
  request,
  formatNumber,
}) {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSensor, setSelectedSensor] = useState('nasa_power');

  useEffect(() => {
    const fetchReadiness = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await request('/api/satellite/readiness');
        if (res && res.status === 'ok') {
          setReadiness(res);
        } else {
          throw new Error('Failed to load satellite readiness data.');
        }
      } catch (err) {
        setError(err.message || 'Error communicating with Satellite Readiness endpoint.');
      } finally {
        setLoading(false);
      }
    };
    fetchReadiness();
  }, []);

  const sensors = readiness?.sensors || [];

  return (
    <div className="satellite-readiness-view" style={{ gridColumn: 'span 12' }}>
      {/* Header Banner */}
      <div className="dash-card" style={{
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(22, 29, 35, 0.95) 100%)',
        border: '1px solid rgba(14, 165, 233, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '26px' }}>🛰️</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f8fafc' }}>
                Satellite &amp; Earth Observation Sensor Readiness
              </h2>
              <span style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(14, 165, 233, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                P1 SPACE SENSOR TELEMETRY
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', maxWidth: '840px', lineHeight: 1.5 }}>
              Transparent telemetry readiness audit. FieldShift maintains an operational connector for <strong>NASA POWER Climatology</strong>, 
              while explicitly detailing the authentication and raster processing prerequisites for <strong>NASA SMAP</strong> and <strong>Sentinel-2 MSI</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 3D WebGL Orbital Sensor Constellation Visualizer */}
      <SatelliteConstellation3D
        selectedSensorId={selectedSensor}
        onSelectSensor={id => setSelectedSensor(id)}
        height={380}
      />

      {loading && <div style={{ color: '#94a3b8', padding: '20px' }}>Inspecting satellite sensor APIs...</div>}
      {error && <div style={{ color: '#ef4444', padding: '20px' }}>{error}</div>}

      {/* Sensor Readiness Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {sensors.map(sensor => {
          const isConnected = sensor.status === 'CONNECTED';
          const isStandby = sensor.status === 'STANDBY';
          const statusColor = isConnected ? '#00df81' : isStandby ? '#f59e0b' : '#94a3b8';
          const statusBg = isConnected ? 'rgba(0, 223, 129, 0.15)' : isStandby ? 'rgba(245, 158, 11, 0.15)' : '#1e293b';

          return (
            <div key={sensor.sensor_id} className="dash-card" style={{
              background: '#131920',
              border: `1px solid ${isConnected ? 'rgba(0, 223, 129, 0.3)' : '#1e293b'}`,
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                    {sensor.sensor_name}
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: statusBg,
                    color: statusColor,
                    fontWeight: 800,
                  }}>
                    {sensor.status}
                  </span>
                </div>

                <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {sensor.intended_measurement}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', background: '#0e1318', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Spatial Resolution:</span>
                    <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{sensor.spatial_resolution}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Cadence:</span>
                    <div style={{ color: '#38bdf8', fontWeight: 600 }}>{sensor.cadence}</div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>Primary Variables:</span>
                    <div style={{ color: '#00df81', fontWeight: 600, fontSize: '11.5px' }}>{sensor.parameters}</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', fontSize: '11.5px', color: '#cbd5e1' }}>
                  {isConnected ? (
                    <div style={{ color: '#00df81', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✓</span> Live point endpoint operational via NASA Langley ASDC.
                    </div>
                  ) : (
                    <div>
                      <strong style={{ color: '#f59e0b' }}>Integration Prerequisites:</strong> {sensor.prerequisites}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scientific Integrity Assurance */}
      <div className="dash-card" style={{ background: '#131920', border: '1px solid #1e293b', borderRadius: '14px', padding: '20px' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '14.5px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡️</span> Zero-Hallucination Satellite Telemetry Policy
        </h4>
        <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.6 }}>
          {readiness?.disclaimer || "FieldShift prohibits synthetic NDVI generation. NASA POWER meteorological variables (temperature, radiation, precipitation) provide regional climate boundaries, but cannot be presented as direct farm-level canopy greenness or sub-field moisture sensors without genuine Earth observation telemetry."}
        </p>
      </div>
    </div>
  );
}
