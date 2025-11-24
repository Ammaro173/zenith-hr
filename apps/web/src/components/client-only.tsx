"use client";

import { useLayoutEffect, useState } from "react";

type ClientOnlyProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return fallback;
  }

  return children;
}

export { ClientOnly };
