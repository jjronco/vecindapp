export default function Mark({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle", marginRight: 8 }}
    >
      <rect width="28" height="28" rx="8" style={{ fill: "var(--panel-deep)" }} />
      <rect x="6" y="6" width="6" height="6" rx="1.4" style={{ fill: "var(--brass)" }} />
      <rect x="16" y="6" width="6" height="6" rx="1.4" style={{ fill: "rgba(255,255,255,0.14)" }} />
      <rect x="6" y="16" width="6" height="6" rx="1.4" style={{ fill: "rgba(255,255,255,0.14)" }} />
      <rect x="16" y="16" width="6" height="6" rx="1.4" style={{ fill: "var(--brass)" }} />
    </svg>
  );
}
