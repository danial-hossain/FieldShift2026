// FieldShift Unified SVG Icon Set
// Uniform stroke (1.75 / 2.0), viewBox="0 0 24 24", stroke="currentColor", fill="none"
// Replaces mixed emojis in UI chrome (sidebar, topbar, buttons, badges) with crisp, accessible vector icons.

import React from 'react';

const baseProps = (size = 20, className = '') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '1.85',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: `ui-icon ${className}`.trim(),
  'aria-hidden': 'true',
});

export const HomeIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export const FieldIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

export const RotationIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19" />
  </svg>
);

export const WeatherIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="8" y1="19" x2="7" y2="21" />
    <line x1="16" y1="19" x2="17" y2="21" />
  </svg>
);

export const WaterIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

export const MarketIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

export const CubeIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const EvidenceIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const SunIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

export const MoonIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const PresentationIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export const CompareIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <rect x="3" y="4" width="7" height="16" rx="1" />
    <rect x="14" y="4" width="7" height="16" rx="1" />
  </svg>
);

export const PlayIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const ChecklistIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

export const PrintIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export const CopyIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const SmsIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const InfoIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const CheckIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const AlertTriangleIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const AlertCircleIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const CloseIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const RefreshIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const SearchIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const HelpIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const ChevronDownIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const ChevronRightIcon = ({ size = 20, className = '' }) => (
  <svg {...baseProps(size, className)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default {
  HomeIcon,
  FieldIcon,
  RotationIcon,
  WeatherIcon,
  WaterIcon,
  MarketIcon,
  CubeIcon,
  EvidenceIcon,
  SunIcon,
  MoonIcon,
  PresentationIcon,
  CompareIcon,
  PlayIcon,
  ChecklistIcon,
  PrintIcon,
  CopyIcon,
  SmsIcon,
  InfoIcon,
  CheckIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  CloseIcon,
  RefreshIcon,
  SearchIcon,
  HelpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
};
