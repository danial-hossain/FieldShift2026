import fs from 'fs';
const content = fs.readFileSync('src/main.jsx', 'utf8');
const lines = content.split(/\r?\n/);
console.log('Total lines:', lines.length);

const findLine = (pattern, start = 0) => {
  for (let i = start; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return -1;
};

console.log('Import insertion line:', findLine(/import \{ ResearchWorkspaceView \}/));
console.log('handleNavigate line:', findLine(/const handleNavigate =/));
console.log('sidebar nav start line:', findLine(/<nav className="sidebar-nav"/));
console.log('crop_advice block start line:', findLine(/\{activeNav === 'crop_advice' &&/));
console.log('harvest_profit block start line:', findLine(/\{activeNav === 'harvest_profit' &&/));
console.log('research block start line:', findLine(/\{activeNav === 'research' &&/));
console.log('dashboard farmer mode start line:', findLine(/\{activeNav === 'dashboard' && dashboardMode === 'farmer'/));
console.log('analytics block start line:', findLine(/\{activeNav === 'analytics' &&/));
console.log('field block start line:', findLine(/\{\(activeNav === 'field' \|\| activeNav === 'field_map'\) &&/));
console.log('weather block start line:', findLine(/\{activeNav === 'weather' &&/));
console.log('assistant block start line:', findLine(/\{activeNav === 'assistant' &&/));
console.log('market block start line:', findLine(/\{activeNav === 'market' &&/));
console.log('synthetic_lab block start line:', findLine(/\{activeNav === 'synthetic_lab' &&/));
console.log('sensitivity block start line:', findLine(/\{activeNav === 'sensitivity' &&/));
console.log('account block start line:', findLine(/\{activeNav === 'account' &&/));
console.log('mobile bottom nav start line:', findLine(/<nav className="mobile-bottom-nav"/));
