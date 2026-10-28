/** Vertical pitch lines (our goal at the bottom). Fills its container. */
export default function PitchMarkings({ className }) {
  return (
    <svg className={className} viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth=".35">
        <rect x="1" y="1" width="66" height="103" />
        <line x1="1" y1="52.5" x2="67" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        {/* top box */}
        <rect x="13.85" y="1" width="40.3" height="16.5" />
        <rect x="24.85" y="1" width="18.3" height="5.5" />
        <path d="M26.7 17.5a9.15 9.15 0 0 0 14.6 0" />
        {/* bottom box */}
        <rect x="13.85" y="87.5" width="40.3" height="16.5" />
        <rect x="24.85" y="98.5" width="18.3" height="5.5" />
        <path d="M26.7 87.5a9.15 9.15 0 0 1 14.6 0" />
        {/* corner arcs */}
        <path d="M1 2a1 1 0 0 0 1-1M66 1a1 1 0 0 0 1 1M1 103a1 1 0 0 1 1 1M66 104a1 1 0 0 1 1-1" />
      </g>
      <g fill="currentColor">
        <circle cx="34" cy="52.5" r=".5" />
        <circle cx="34" cy="12" r=".4" />
        <circle cx="34" cy="93" r=".4" />
      </g>
    </svg>
  );
}
