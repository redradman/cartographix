interface PosterMockupProps {
  colors: string[];
  cityName: string;
  className?: string;
}

// Simple deterministic hash from a string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Seeded pseudo-random number generator
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateStreetPaths(cityName: string) {
  const seed = hashCode(cityName || 'default');
  const rand = seededRandom(seed);

  const mainRoads: string[] = [];
  const sideStreets: string[] = [];
  let riverPath = '';
  let parkCx = 50;
  let parkCy = 50;
  let parkRx = 12;
  let parkRy = 10;

  // Generate 4-6 main roads as long curved paths
  const mainCount = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < mainCount; i++) {
    const horizontal = rand() > 0.4;
    if (horizontal) {
      const y1 = 10 + rand() * 80;
      const y2 = y1 + (rand() - 0.5) * 30;
      const cy = y1 + (rand() - 0.5) * 20;
      mainRoads.push(`M -5 ${y1.toFixed(1)} Q ${25 + rand() * 20} ${cy.toFixed(1)} 50 ${((y1 + y2) / 2).toFixed(1)} Q ${55 + rand() * 20} ${y2.toFixed(1)} 105 ${y2.toFixed(1)}`);
    } else {
      const x1 = 10 + rand() * 80;
      const x2 = x1 + (rand() - 0.5) * 30;
      const cx = x1 + (rand() - 0.5) * 20;
      mainRoads.push(`M ${x1.toFixed(1)} -5 Q ${cx.toFixed(1)} ${25 + rand() * 20} ${((x1 + x2) / 2).toFixed(1)} 50 Q ${x2.toFixed(1)} ${55 + rand() * 20} ${x2.toFixed(1)} 105`);
    }
  }

  // Generate 8-14 side streets as shorter straight or slightly curved segments
  const sideCount = 8 + Math.floor(rand() * 7);
  for (let i = 0; i < sideCount; i++) {
    const x1 = rand() * 100;
    const y1 = rand() * 100;
    const angle = rand() * Math.PI;
    const len = 15 + rand() * 30;
    const x2 = x1 + Math.cos(angle) * len;
    const y2 = y1 + Math.sin(angle) * len;

    if (rand() > 0.5) {
      sideStreets.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    } else {
      const cx = (x1 + x2) / 2 + (rand() - 0.5) * 15;
      const cy = (y1 + y2) / 2 + (rand() - 0.5) * 15;
      sideStreets.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
  }

  // River: a smooth S-curve across the map
  const riverDir = rand() > 0.5;
  if (riverDir) {
    const startY = 10 + rand() * 30;
    const endY = 60 + rand() * 30;
    riverPath = `M -5 ${startY.toFixed(1)} C ${20 + rand() * 15} ${(startY - 10 + rand() * 20).toFixed(1)} ${60 + rand() * 15} ${(endY - 10 + rand() * 20).toFixed(1)} 105 ${endY.toFixed(1)}`;
  } else {
    const startX = 10 + rand() * 30;
    const endX = 60 + rand() * 30;
    riverPath = `M ${startX.toFixed(1)} -5 C ${(startX - 10 + rand() * 20).toFixed(1)} ${20 + rand() * 15} ${(endX - 10 + rand() * 20).toFixed(1)} ${60 + rand() * 15} ${endX.toFixed(1)} 105`;
  }

  // Park: an elliptical shape
  parkCx = 25 + rand() * 50;
  parkCy = 25 + rand() * 50;
  parkRx = 8 + rand() * 10;
  parkRy = 6 + rand() * 8;

  return { mainRoads, sideStreets, riverPath, parkCx, parkCy, parkRx, parkRy };
}

export default function PosterMockup({ colors, cityName, className = '' }: PosterMockupProps) {
  const [bg, primary, secondary, accent] = colors;
  const streets = generateStreetPaths(cityName);

  // Determine if background is dark for text contrast
  const isDark = isColorDark(bg);
  const textColor = isDark ? '#FFFFFF' : '#111111';

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: bg }}>
      {/* Full-bleed map */}
      <svg
        viewBox="0 0 100 130"
        fill="none"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Park */}
        <ellipse
          cx={streets.parkCx}
          cy={streets.parkCy}
          rx={streets.parkRx}
          ry={streets.parkRy}
          fill={accent}
          opacity={0.12}
        />
        {/* River */}
        <path
          d={streets.riverPath}
          stroke={accent}
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity={0.4}
          fill="none"
        />
        {/* Side streets */}
        {streets.sideStreets.map((d, i) => (
          <path
            key={`side-${i}`}
            d={d}
            stroke={secondary}
            strokeWidth="0.35"
            strokeLinecap="round"
            opacity={0.6}
          />
        ))}
        {/* Main roads */}
        {streets.mainRoads.map((d, i) => (
          <path
            key={`main-${i}`}
            d={d}
            stroke={primary}
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity={0.8}
          />
        ))}
      </svg>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[35%]"
        style={{
          background: `linear-gradient(to top, ${bg} 0%, ${bg}ee 20%, ${bg}88 50%, ${bg}00 100%)`,
        }}
      />

      {/* Top gradient fade */}
      <div
        className="absolute top-0 left-0 right-0 h-[20%]"
        style={{
          background: `linear-gradient(to bottom, ${bg} 0%, ${bg}88 40%, ${bg}00 100%)`,
        }}
      />

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-[8%] gap-0.5">
        <p
          className="text-[11px] tracking-[0.35em] uppercase font-bold"
          style={{ color: textColor, fontFamily: "'Roboto', sans-serif" }}
        >
          {cityName || 'Your City'}
        </p>
        <div
          className="w-[20%] h-px my-1"
          style={{ backgroundColor: textColor, opacity: 0.5 }}
        />
        <p
          className="text-[7px] tracking-[0.12em] uppercase"
          style={{ color: textColor, opacity: 0.6, fontFamily: "'Roboto', sans-serif" }}
        >
          48.8566° N / 2.3522° E
        </p>
      </div>
    </div>
  );
}

function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived brightness
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
