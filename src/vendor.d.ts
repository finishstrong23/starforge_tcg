// Ambient declarations for packages that lack TypeScript types or are not
// installed in this environment. These stubs let tsc compile cleanly while
// the real packages supply types in native environments (CI, production).

declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
  const uuidExports: { v4: () => string; v1: () => string; [key: string]: unknown };
  export default uuidExports;
}

declare module 'peerjs' {
  export interface DataConnection {
    open: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send(data: any): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, handler: (...args: any[]) => void): void;
    close(): void;
  }
  export default class Peer {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(id?: string, options?: any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, handler: (...args: any[]) => void): void;
    connect(peerId: string, options?: { reliable?: boolean }): DataConnection;
    destroy(): void;
    disconnect(): void;
  }
}

declare module '@capacitor/core' {
  export const Capacitor: { isNativePlatform(): boolean; getPlatform(): string; [key: string]: unknown };
  export const registerPlugin: (...args: unknown[]) => unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Plugins: Record<string, any>;
}

declare module '@capacitor/status-bar' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const StatusBar: any;
  export enum Style { Dark = 'DARK', Light = 'LIGHT', Default = 'DEFAULT' }
}

declare module '@capacitor/splash-screen' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const SplashScreen: any;
}

declare module '@capacitor/keyboard' {
  export const Keyboard: {
    addListener(event: 'keyboardWillShow', handler: (info: { keyboardHeight: number }) => void): Promise<void>;
    addListener(event: 'keyboardWillHide', handler: () => void): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

declare module '@capacitor/haptics' {
  export const Haptics: {
    impact(options: { style: ImpactStyle }): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  export enum ImpactStyle { Heavy = 'HEAVY', Medium = 'MEDIUM', Light = 'LIGHT' }
  export enum HapticsNotificationType { SUCCESS = 'SUCCESS', WARNING = 'WARNING', ERROR = 'ERROR' }
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
