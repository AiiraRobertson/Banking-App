import { useEffect, useState } from 'react';

export default function AnalogClock({ size = 200 }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  const secAngle = seconds * 6;
  const minAngle = minutes * 6;
  const hourAngle = hours * 30;

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString(undefined, { hour12: false });

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        role="img"
        aria-label={`Current time ${timeLabel}`}
      >
        <defs>
          <radialGradient id="clockFace" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="80%" stopColor="#eef2ff" />
            <stop offset="100%" stopColor="#c7d2fe" />
          </radialGradient>
          <linearGradient id="clockRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#clockRim)" />
        <circle cx="100" cy="100" r="88" fill="url(#clockFace)" />

        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i * 6 * Math.PI) / 180;
          const isHour = i % 5 === 0;
          const inner = isHour ? 76 : 82;
          const outer = 86;
          const x1 = 100 + inner * Math.sin(angle);
          const y1 = 100 - inner * Math.cos(angle);
          const x2 = 100 + outer * Math.sin(angle);
          const y2 = 100 - outer * Math.cos(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isHour ? '#1e1b4b' : '#94a3b8'}
              strokeWidth={isHour ? 2.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {[12, 3, 6, 9].map((n) => {
          const angle = (n * 30 * Math.PI) / 180;
          const r = 64;
          const x = 100 + r * Math.sin(angle);
          const y = 100 - r * Math.cos(angle) + 5;
          return (
            <text
              key={n}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#1e1b4b"
              fontFamily="system-ui, sans-serif"
            >
              {n}
            </text>
          );
        })}

        <g transform={`rotate(${hourAngle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="55" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round" />
        </g>
        <g transform={`rotate(${minAngle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="35" stroke="#312e81" strokeWidth="3.5" strokeLinecap="round" />
        </g>
        <g
          transform={`rotate(${secAngle} 100 100)`}
          style={{ transition: 'transform 0.15s cubic-bezier(0.4, 2.3, 0.3, 1)' }}
        >
          <line x1="100" y1="108" x2="100" y2="28" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="100" cy="108" r="3" fill="#dc2626" />
        </g>

        <circle cx="100" cy="100" r="5" fill="#1e1b4b" />
        <circle cx="100" cy="100" r="2" fill="#fbbf24" />
      </svg>

      <div className="text-center">
        <p className="text-sm font-semibold text-t-primary tabular-nums">{timeLabel}</p>
        <p className="text-xs text-t-tertiary">{dateLabel}</p>
      </div>
    </div>
  );
}
