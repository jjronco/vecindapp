import { useState, useEffect } from "react";

export default function BuildingFacade({ compact = false }) {
  const total = compact ? 12 : 22;
  const [lit, setLit] = useState(() => new Array(total).fill(false));

  useEffect(() => {
    setLit(new Array(total).fill(false).map(() => Math.random() > 0.58));
  }, [total]);

  return (
    <div className={"vpp-facade" + (compact ? " compact" : "")}>
      <div className="vpp-facade-strip">
        {lit.map((on, i) => (
          <span key={i} className={"vpp-dot" + (on ? " lit" : "")} />
        ))}
      </div>
    </div>
  );
}
