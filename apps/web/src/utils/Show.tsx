import { Children, type ReactElement, type ReactNode } from "react";

import { If } from "./If";

type ShowChild = ReactElement<{ isTrue?: boolean }>;
type Props = {
  children: ShowChild | ShowChild[];
};

type ElseProps = {
  render?: () => ReactNode;
  children?: ReactNode;
};

export const Show = ({ children }: Props) => {
  let when: ReactNode | null = null;
  let otherwise: ReactNode | null = null;

  Children.forEach(children, (child) => {
    if (child.props.isTrue === undefined) {
      otherwise = child;
    } else if (!when && child.props.isTrue === true) {
      when = child;
    }
  });

  return (when || otherwise) as ReactNode;
};

Show.When = If;
Show.Else = ({ render, children }: ElseProps) => (render ? render() : children);
