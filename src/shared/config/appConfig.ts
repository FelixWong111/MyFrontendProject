const isMockEnvironment = import.meta.env.DEV || import.meta.env.MODE === "demo";
const mockApiPreference = import.meta.env.VITE_USE_MOCK_API;

export const appConfig = {
  name: "招采智审",
  defaultTenderId:
    import.meta.env.VITE_DEFAULT_TENDER_ID ?? "TND-2026-0718-042",
  useMockApi:
    isMockEnvironment &&
    (mockApiPreference === undefined || mockApiPreference === "true"),
} as const;
