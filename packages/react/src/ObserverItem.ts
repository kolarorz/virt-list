import { useRef, useEffect, createElement, type CSSProperties, type ReactNode } from 'react';


// ======================== ObserverItem ========================

interface ObserverItemProps {
  itemKey: string;
  resizeObserver?: ResizeObserver;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const ObserverItem = (props: ObserverItemProps) => {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || !props.resizeObserver) return;
    props.resizeObserver.observe(el);
    return () => { props.resizeObserver!.unobserve(el); };
  }, [props.resizeObserver]);

  return createElement(
    'div',
    { ref: elRef, 'data-id': props.itemKey, className: props.className, style: props.style },
    props.children,
  );
}