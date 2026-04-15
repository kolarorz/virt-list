import { useRef, useEffect, createElement, type CSSProperties, type ReactNode } from 'react';
// ======================== ObserverItem ========================
// React equivalent of Vue's ObserverItem component.
// Wraps each list item in a div observed by ResizeObserver for size tracking.

interface ObserverItemProps {
  id: string | number;
  resizeObserver?: ResizeObserver;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function ObserverItem({
  id,
  resizeObserver,
  className,
  style,
  children,
}: ObserverItemProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || !resizeObserver) return;
    resizeObserver.observe(el);
    return () => resizeObserver.unobserve(el);
  }, [resizeObserver]);

  return createElement(
    'div',
    {
      ref: elRef,
      'data-id': String(id),
      className: className || undefined,
      style,
    },
    children,
  );
}