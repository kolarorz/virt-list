export default function TreeIconItem({ isExpanded }: { isExpanded: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        color: '#333',
        transition: 'transform 0.15s ease',
        transform: isExpanded ? 'rotate(-90deg)' : 'rotate(0deg)',
      }}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      >
        <path d="M39.6 17.443 24.043 33 8.487 17.443" />
      </svg>
    </div>
  );
}
