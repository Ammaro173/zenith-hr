// biome-ignore lint/style/useFilenamingConvention: legacy utility name
import type { ReactNode } from "react";

interface Props {
  isTrue: boolean;
  children: ReactNode;
}

export const If = ({ isTrue, children }: Props) => (isTrue ? children : null);
