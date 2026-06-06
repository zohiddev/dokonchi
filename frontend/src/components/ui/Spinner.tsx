export function Spinner({ size = 24, label }: { size?: number; label?: string }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" style={{ width: size, height: size }} />
      {label && <span className="spinner-label">{label}</span>}
      <style>{`
        .spinner-wrap { display: inline-flex; align-items: center; gap: 10px; color: var(--ink-soft); }
        .spinner {
          border: 2.5px solid var(--line);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }
        .spinner-label { font-size: 13px; }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
