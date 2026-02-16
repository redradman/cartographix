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
      // Straight segment
      sideStreets.push(`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    } else {
      // Slightly curved
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

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      <div className="flex-1 relative" style={{ backgroundColor: bg }}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Side streets */}
          {streets.sideStreets.map((d, i) => (
            <path
              key={`side-${i}`}
              d={d}
              stroke={secondary}
              strokeWidth="0.4"
              strokeLinecap="round"
              opacity={0.7}
            />
          ))}
          {/* Main roads */}
          {streets.mainRoads.map((d, i) => (
            <path
              key={`main-${i}`}
              d={d}
              stroke={primary}
              strokeWidth="0.9"
              strokeLinecap="round"
              opacity={0.85}
            />
          ))}
          {/* River */}
          <path
            d={streets.riverPath}
            stroke={accent}
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity={0.5}
            fill="none"
          />
          {/* Park */}
          <ellipse
            cx={streets.parkCx}
            cy={streets.parkCy}
            rx={streets.parkRx}
            ry={streets.parkRy}
            fill={accent}
            opacity={0.15}
          />
        </svg>
      </div>
      <div className="px-4 py-3 flex items-end" style={{ backgroundColor: bg }}>
        <p
          className="text-[10px] tracking-[0.25em] uppercase font-medium"
          style={{ color: primary }}
        >
          {cityName || 'Your City'}
        </p>
      </div>
    </div>
  );
}
