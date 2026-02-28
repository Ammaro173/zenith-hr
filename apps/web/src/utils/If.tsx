// biome-ignore lint/style/useFilenamingConvention: legacy utility name
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  isTrue: boolean;
}

export const If = ({ isTrue, children }: Props) => (isTrue ? children : null);
