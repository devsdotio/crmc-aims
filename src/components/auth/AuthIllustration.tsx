import React from 'react';

export function TargetIllustration() {
  return (
    <div className="relative flex items-center justify-center w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] aspect-square mx-auto select-none pointer-events-none">
      <svg
        viewBox="0 0 400 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* Soft horizontal backdrop capsules */}
        <rect x="30" y="110" width="160" height="32" rx="16" fill="white" fillOpacity="0.10" />
        <rect x="70" y="150" width="240" height="40" rx="20" fill="white" fillOpacity="0.08" />
        <rect x="120" y="196" width="180" height="28" rx="14" fill="white" fillOpacity="0.12" />

        {/* Floating cross & dot accents */}
        <path d="M62 250V262M56 256H68" stroke="#FF4E45" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8" />
        <path d="M320 100V110M315 105H325" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
        <circle cx="50" cy="180" r="3.5" fill="#FF4E45" fillOpacity="0.75" />
        <circle cx="118" cy="242" r="2.5" fill="white" fillOpacity="0.7" />
        <circle cx="340" cy="210" r="3" fill="#FF6B62" fillOpacity="0.8" />
        <circle cx="290" cy="265" r="2.5" fill="white" fillOpacity="0.5" />

        {/* Outer deep navy rim */}
        <circle cx="195" cy="185" r="95" fill="#161B36" />
        {/* Outer White Ring */}
        <circle cx="195" cy="185" r="74" fill="#FFFFFF" />
        {/* Middle CRMC Coral/Orange Ring */}
        <circle cx="195" cy="185" r="54" fill="#f15a29" />
        {/* Inner White Ring */}
        <circle cx="195" cy="185" r="34" fill="#FFFFFF" />
        {/* Center Bullseye Point */}
        <circle cx="195" cy="185" r="16" fill="#1B2140" />

        {/* Arrow / Dart */}
        <path d="M280 85 L195 185" stroke="#161B36" strokeWidth="6" strokeLinecap="round" />
        <circle cx="195" cy="185" r="5" fill="#FF4E45" />

        {/* Dart fletching */}
        <path d="M282 83 L302 72 L294 94 Z" fill="#FF4E45" />
        <path d="M278 87 L290 108 L269 100 Z" fill="#D83D35" />
        <path d="M283 81 L298 62 L280 70 Z" fill="#FFA09B" />
      </svg>
    </div>
  );
}

export function InventoryIllustration() {
  return (
    <div className="relative flex items-center justify-center w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] aspect-square mx-auto select-none pointer-events-none">
      <svg
        viewBox="0 0 400 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xl"
      >
        <defs>
          {/* Mathematically precise 30° isometric gradients */}
          <linearGradient id="boxTopGrad" x1="120" y1="83" x2="280" y2="175" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="boxRightGrad" x1="200" y1="175" x2="280" y2="267" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#252E56" />
            <stop offset="100%" stopColor="#1B2140" />
          </linearGradient>
          <linearGradient id="boxLeftGrad" x1="120" y1="129" x2="200" y2="267" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#171C38" />
            <stop offset="100%" stopColor="#0F1327" />
          </linearGradient>
          <linearGradient id="tapeGrad" x1="188" y1="83" x2="212" y2="175" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF6B62" />
            <stop offset="100%" stopColor="#E03E36" />
          </linearGradient>
          <linearGradient id="badgeGrad" x1="0" y1="0" x2="76" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF5A52" />
            <stop offset="100%" stopColor="#D8332A" />
          </linearGradient>
        </defs>

        {/* Soft horizontal backdrop capsules */}
        <rect x="35" y="105" width="170" height="32" rx="16" fill="white" fillOpacity="0.10" />
        <rect x="65" y="150" width="260" height="40" rx="20" fill="white" fillOpacity="0.08" />
        <rect x="110" y="210" width="190" height="28" rx="14" fill="white" fillOpacity="0.12" />

        {/* Ambient geometric particle accents */}
        <path d="M64 252V262M59 257H69" stroke="#FF4E45" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8" />
        <path d="M338 120V130M333 125H343" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
        <circle cx="52" cy="180" r="3.5" fill="#FF4E45" fillOpacity="0.75" />
        <circle cx="115" cy="246" r="2.5" fill="white" fillOpacity="0.7" />
        <circle cx="346" cy="215" r="3" fill="#FF6B62" fillOpacity="0.8" />
        <circle cx="318" cy="265" r="2.5" fill="white" fillOpacity="0.5" />

        {/* Soft ground contact shadow */}
        <ellipse cx="200" cy="272" rx="90" ry="22" fill="#0A0E1F" fillOpacity="0.45" />

        {/* --- MATHEMATICALLY EXACT 30° ISOMETRIC CUBE --- */}
        {/* Left Face */}
        <path
          d="M120 129 L200 175 L200 267 L120 221 Z"
          fill="url(#boxLeftGrad)"
        />

        {/* Right Face */}
        <path
          d="M200 175 L280 129 L280 221 L200 267 Z"
          fill="url(#boxRightGrad)"
        />

        {/* Top Face */}
        <path
          d="M200 83 L280 129 L200 175 L120 129 Z"
          fill="url(#boxTopGrad)"
        />

        {/* Top Seam Line */}
        <line x1="200" y1="83" x2="200" y2="175" stroke="#CBD5E1" strokeWidth="1.5" strokeOpacity="0.5" />

        {/* Sealing Tape: runs along the center top seam and folds symmetrically over the front ridge */}
        {/* Top Face Tape */}
        <path
          d="M188 90 L200 83 L212 90 L212 168 L200 175 L188 168 Z"
          fill="url(#tapeGrad)"
        />
        {/* Tape fold down left face */}
        <path
          d="M188 168 L200 175 L200 196 L188 189 Z"
          fill="#D8332A"
        />
        {/* Tape fold down right face */}
        <path
          d="M200 175 L212 168 L212 189 L200 196 Z"
          fill="#FF4E45"
        />

        {/* Left Face Handle Slot */}
        <path
          d="M142 180 L172 197 C174 198 174 202 172 203 L142 186 C140 185 140 181 142 180 Z"
          fill="#0C0F1D"
          fillOpacity="0.85"
        />

        {/* --- ISOMETRIC SHIPPING LABEL WITH QR CODE (RIGHT FACE) --- */}
        {/* White Label Base */}
        <path
          d="M214 177 L266 147 L266 219 L214 249 Z"
          fill="#FFFFFF"
          fillOpacity="0.98"
        />
        {/* Coral Label Header Banner */}
        <path
          d="M214 177 L266 147 L266 159 L214 189 Z"
          fill="#FF4E45"
        />

        {/* Authentic 30° Isometric QR Code (Centered with exact 8px uniform margins) */}
        <g transform="matrix(0.866025, -0.5, 0, 1, 220.8, 193)">
          {/* Position Finder 1: Top-Left */}
          <rect x="0" y="0" width="14" height="14" rx="1.5" fill="#1B2140" />
          <rect x="2" y="2" width="10" height="10" fill="#FFFFFF" />
          <rect x="4" y="4" width="6" height="6" rx="1" fill="#1B2140" />

          {/* Position Finder 2: Top-Right */}
          <rect x="30" y="0" width="14" height="14" rx="1.5" fill="#1B2140" />
          <rect x="32" y="2" width="10" height="10" fill="#FFFFFF" />
          <rect x="34" y="4" width="6" height="6" rx="1" fill="#1B2140" />

          {/* Position Finder 3: Bottom-Left */}
          <rect x="0" y="30" width="14" height="14" rx="1.5" fill="#1B2140" />
          <rect x="2" y="32" width="10" height="10" fill="#FFFFFF" />
          <rect x="4" y="34" width="6" height="6" rx="1" fill="#1B2140" />

          {/* Alignment Pattern (Bottom-Right area) */}
          <rect x="28" y="28" width="10" height="10" rx="1" fill="#1B2140" />
          <rect x="30" y="30" width="6" height="6" fill="#FFFFFF" />
          <rect x="32" y="32" width="2" height="2" fill="#1B2140" />

          {/* Timing Patterns */}
          <line x1="15" y1="7" x2="29" y2="7" stroke="#1B2140" strokeWidth="1.5" strokeDasharray="2 2" />
          <line x1="7" y1="15" x2="7" y2="29" stroke="#1B2140" strokeWidth="1.5" strokeDasharray="2 2" />

          {/* High-density Data Matrix Modules */}
          <rect x="16" y="0" width="3" height="3" fill="#1B2140" />
          <rect x="21" y="2" width="3" height="3" fill="#1B2140" />
          <rect x="25" y="0" width="3" height="3" fill="#1B2140" />
          <rect x="16" y="10" width="3" height="3" fill="#1B2140" />
          <rect x="22" y="10" width="4" height="3" fill="#1B2140" />
          <rect x="16" y="16" width="3" height="3" fill="#1B2140" />
          <rect x="21" y="16" width="3" height="3" fill="#1B2140" />
          <rect x="25" y="16" width="3" height="3" fill="#1B2140" />
          <rect x="16" y="21" width="4" height="3" fill="#1B2140" />
          <rect x="22" y="21" width="3" height="3" fill="#1B2140" />
          <rect x="16" y="26" width="3" height="3" fill="#1B2140" />
          <rect x="21" y="26" width="3" height="3" fill="#1B2140" />
          <rect x="40" y="16" width="4" height="3" fill="#1B2140" />
          <rect x="40" y="21" width="4" height="3" fill="#1B2140" />
          <rect x="40" y="39" width="4" height="3" fill="#1B2140" />
          <rect x="16" y="32" width="3" height="3" fill="#1B2140" />
          <rect x="21" y="32" width="3" height="3" fill="#1B2140" />
          <rect x="16" y="38" width="3" height="3" fill="#1B2140" />
          <rect x="22" y="38" width="4" height="3" fill="#1B2140" />
        </g>

        {/* Floating Verified Status Tag (Top Right) */}
        <g transform="translate(236, 82)" filter="drop-shadow(0px 8px 16px rgba(255, 78, 69, 0.35))">
          <rect width="76" height="32" rx="16" fill="url(#badgeGrad)" />
          {/* Checkmark icon */}
          <path
            d="M24 16 L31 22 L45 10"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Accent dot */}
          <circle cx="58" cy="16" r="3" fill="white" fillOpacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

export function SecurityIllustration() {
  return (
    <div className="relative flex items-center justify-center w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] aspect-square mx-auto select-none pointer-events-none">
      <svg
        viewBox="0 0 400 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* Soft horizontal backdrop capsules */}
        <rect x="45" y="115" width="170" height="32" rx="16" fill="white" fillOpacity="0.10" />
        <rect x="75" y="160" width="250" height="38" rx="19" fill="white" fillOpacity="0.08" />
        <rect x="120" y="215" width="180" height="28" rx="14" fill="white" fillOpacity="0.12" />

        {/* Accents */}
        <circle cx="65" cy="190" r="3.5" fill="#FF4E45" fillOpacity="0.75" />
        <path d="M335 150V160M330 155H340" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="315" cy="240" r="3" fill="#FF6B62" fillOpacity="0.8" />

        {/* Outer Shield Rim */}
        <path
          d="M200 90 L285 125 C285 210 200 275 200 275 C200 275 115 210 115 125 Z"
          fill="#161B36"
        />

        {/* Inner Shield Body */}
        <path
          d="M200 108 L267 136 C267 205 200 256 200 256 C200 256 133 205 133 136 Z"
          fill="#FFFFFF"
        />

        {/* Center Shield Core */}
        <path
          d="M200 124 L250 145 C250 198 200 238 200 238 C200 238 150 198 150 145 Z"
          fill="#FF4E45"
        />

        {/* Verified Shield Checkmark */}
        <path
          d="M178 180 L194 196 L224 162"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Keyhole Accent under checkmark */}
        <circle cx="200" cy="216" r="4" fill="white" fillOpacity="0.9" />
      </svg>
    </div>
  );
}

// Default export for backwards compatibility
export function AuthIllustration() {
  return <TargetIllustration />;
}
