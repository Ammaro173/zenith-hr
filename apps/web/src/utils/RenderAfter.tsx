// biome-ignore lint/style/useFilenamingConvention: legacy utility name
import { type ReactNode, useEffect, useState } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
}

export function RenderAfter({ delay = 1000, children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return ready ? children : null;
}
