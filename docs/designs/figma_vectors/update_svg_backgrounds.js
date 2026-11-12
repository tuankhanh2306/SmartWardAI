const fs = require('fs');
const path = require('path');

const svgPath = 'e:/SmartWardAI/docs/designs/figma_vectors/03_Screens_And_04_Prototype_Flows.svg';
let content = fs.readFileSync(svgPath, 'utf8');

// The web background pattern from frontend/src/index.css:
// .bg-uth-canvas: background-color: #E0F2F1, radial-gradient, etc.
// Background tint: #F8FAFC or subtle teal-slate civic gradient: #F0FDFA to #F8FAFC, border #E2E8F0
// Let's add defs for web background pattern and gradients
const defs = `  <defs>
    <linearGradient id="webCanvasGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E0F2F1" stop-opacity="0.7"/>
      <stop offset="45%" stop-color="#F0FDFA" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#F8FAFC" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="cardHeaderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#004D40"/>
      <stop offset="100%" stop-color="#00796B"/>
    </linearGradient>
    <pattern id="civicGridPattern" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#00796B" stroke-width="0.75" stroke-opacity="0.06"/>
    </pattern>
  </defs>`;

if (!content.includes('id="webCanvasGradient"')) {
  content = content.replace('<g id="Page/03_Screens_And_04_Prototype_Flows">', defs + '\n  <g id="Page/03_Screens_And_04_Prototype_Flows">');
}

// Replace all frame backgrounds with webCanvasGradient and civicGridPattern
content = content.replace(
  /<rect width="390" height="844" rx="36" fill="#F8FAFC" stroke="#0F172A" stroke-width="6"\/>/g,
  '<rect width="390" height="844" rx="36" fill="url(#webCanvasGradient)" stroke="#0F172A" stroke-width="6"/><rect width="390" height="844" rx="36" fill="url(#civicGridPattern)"/>'
);

content = content.replace(
  /<rect width="360" height="800" rx="28" fill="#F8FAFC" stroke="#334155" stroke-width="5"\/>/g,
  '<rect width="360" height="800" rx="28" fill="url(#webCanvasGradient)" stroke="#334155" stroke-width="5"/><rect width="360" height="800" rx="28" fill="url(#civicGridPattern)"/>'
);

content = content.replace(
  /<rect width="480" height="844" rx="36" fill="#F8FAFC" stroke="#0F172A" stroke-width="6"\/>/g,
  '<rect width="480" height="844" rx="36" fill="url(#webCanvasGradient)" stroke="#0F172A" stroke-width="6"/><rect width="480" height="844" rx="36" fill="url(#civicGridPattern)"/>'
);

fs.writeFileSync(svgPath, content, 'utf8');
console.log('Successfully updated 03_Screens_And_04_Prototype_Flows.svg with web background!');
