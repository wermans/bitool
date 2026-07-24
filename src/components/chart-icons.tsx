// Ícones minimalistas usados no seletor de tipo de gráfico — evitam puxar
// uma lib de ícones inteira só para 5 glifos usados num único lugar.
export function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16" />
    </svg>
  );
}

export function BarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M6 20V10M12 20V4M18 20v-7" strokeLinecap="round" />
    </svg>
  );
}

export function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M4 16l5-6 4 4 7-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PieIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 2v10l8.5 5A10 10 0 1 0 12 2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12.5l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SankeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 6h4M3 12h4M3 18h4M17 5h4M17 19h4" strokeLinecap="round" />
      <path d="M7 6c5 0 5 -1 10 -1M7 12c5 0 5 7 10 7M7 18c5 0 5 -13 10 -13" />
    </svg>
  );
}

export function TreemapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="3" y="3" width="10" height="10" rx="1" />
      <rect x="14" y="3" width="7" height="6" rx="1" />
      <rect x="14" y="10" width="7" height="4" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="11" y="14" width="10" height="7" rx="1" />
    </svg>
  );
}

export function SunburstIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="9.5" strokeDasharray="3 2" />
    </svg>
  );
}

export function GaugeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M4 16a8 8 0 1 1 16 0" />
      <path d="M12 16l4-5" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StreamgraphIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <path d="M2 9c2-2 4 2 6 0s4-4 6-2 4 3 8 1" />
      <path d="M2 13c2-1.5 4 1.5 6 0s4-3 6-1.5 4 2.5 8 1" />
      <path d="M2 17c2-1 4 1 6 0s4-2 6-1 4 2 8 1" />
    </svg>
  );
}

export function BulletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="2" y="10" width="20" height="4" rx="1" opacity="0.35" />
      <rect x="2" y="10" width="13" height="4" rx="1" />
      <path d="M16 7v10" strokeLinecap="round" />
    </svg>
  );
}

export function DependencyWheelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="20" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 4c4 2 6 4 8 8M20 12c-2 4-4 6-8 8M12 20c-4-2-6-4-8-8M4 12c2-4 4-6 8-8" />
    </svg>
  );
}
