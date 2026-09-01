interface AppRuntimeConfig {
  readonly API_BASE_URL?: string;
}

declare global {
  interface Window {
    readonly __APP_CONFIG__?: AppRuntimeConfig;
  }
}

export {};
