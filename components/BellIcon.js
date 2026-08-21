export default function BellIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, verticalAlign: "middle", marginRight: 6 }}
    >
      <path
        d="M12 3.5c-3.3 0-5.5 2.4-5.5 6v2.6c0 .7-.3 1.4-.8 1.9L4.5 15c-.5.5-.2 1.5.6 1.5h13.8c.8 0 1.1-1 .6-1.5l-1.2-1.1c-.5-.5-.8-1.2-.8-1.9V9.5c0-3.6-2.2-6-5.5-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
