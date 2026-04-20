/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactDOM from 'react-dom';
import { type MutableRefObject, type ReactNode, createElement, Fragment, type ReactElement } from 'react';

/**
 * React 16-17 mounting adapter.
 *
 * React 18 introduced `createRoot` / `root.unmount()` as the new client API.
 * React 16-17 use `ReactDOM.render()` and `ReactDOM.unmountComponentAtNode()`.
 * This adapter provides the same `mountReact` / cleanup pattern used in the
 * React 18 package, but backed by the legacy ReactDOM APIs.
 */

export function createReactMounter(mountedEls: MutableRefObject<Set<HTMLElement>>) {
  function mountReact(_mountKey: string, node: ReactNode, el: HTMLElement): void {
    ReactDOM.render(
      createElement(Fragment, null, node) as ReactElement,
      el,
    );
    mountedEls.current.add(el);
  }

  function cleanupAllRoots(): void {
    mountedEls.current.forEach((el) => {
      ReactDOM.unmountComponentAtNode(el);
    });
    mountedEls.current.clear();
  }

  return { mountReact, cleanupAllRoots };
}
