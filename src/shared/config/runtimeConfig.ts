const DEFAULT_API_BASE_URL = "http://8.134.38.209:34567";

function readApiBaseUrl(value: unknown, source: string): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const normalizedValue = value.trim().replace(/\/+$/, "");

  try {
    const url = new URL(normalizedValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("only HTTP and HTTPS protocols are supported");
    }

    if (url.username || url.password || url.search || url.hash) {
      throw new Error("credentials, query strings, and fragments are not supported");
    }

    return normalizedValue;
  } catch (error) {
    console.error(
      `[runtimeConfig] ${source} 不是有效的 HTTP(S) API Base URL，已忽略该值。`,
      error,
    );
    return undefined;
  }
}

const runtimeApiBaseUrl = readApiBaseUrl(
  typeof window === "undefined"
    ? undefined
    : window.__APP_CONFIG__?.API_BASE_URL,
  "window.__APP_CONFIG__.API_BASE_URL",
);

const developmentApiBaseUrl = import.meta.env.DEV
  ? readApiBaseUrl(
      import.meta.env.VITE_API_BASE_URL,
      "import.meta.env.VITE_API_BASE_URL",
    )
  : undefined;

const fallbackApiBaseUrl = developmentApiBaseUrl ?? DEFAULT_API_BASE_URL;

if (import.meta.env.DEV && runtimeApiBaseUrl === undefined) {
  console.error(
    "[runtimeConfig] 未找到有效的 window.__APP_CONFIG__.API_BASE_URL。" +
      `当前仅作为开发回退使用：${fallbackApiBaseUrl}`,
  );
}

export const runtimeConfig = Object.freeze({
  apiBaseUrl: runtimeApiBaseUrl ?? fallbackApiBaseUrl,
});
