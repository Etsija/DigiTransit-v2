import type * as React from 'react';

declare module 'react-dom/client' {
  export type Root = {
    render(children: React.ReactNode): void;
    unmount(): void;
  };

  export function createRoot(container: Element | DocumentFragment): Root;
}
