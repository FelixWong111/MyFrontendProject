import axios from "axios";

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface ApiErrorInfo {
  code?: string;
  message?: string;
  status?: number;
}

export type ApiErrorMessages = Readonly<Partial<Record<string, string>>>;

export function getApiError(reason: unknown): ApiErrorInfo {
  if (!axios.isAxiosError(reason)) {
    return {
      message: reason instanceof Error ? reason.message : undefined,
    };
  }

  const responseData: unknown = reason.response?.data;

  if (isApiErrorResponse(responseData)) {
    return {
      code: responseData.error.code,
      message: responseData.error.message,
      status: reason.response?.status,
    };
  }

  return {
    message: reason.message,
    status: reason.response?.status,
  };
}

export function getApiErrorMessage(
  reason: unknown,
  fallback: string,
  messages: ApiErrorMessages = {},
): string {
  const error = getApiError(reason);
  const mappedMessage = error.code ? messages[error.code] : undefined;

  if (mappedMessage) {
    return mappedMessage;
  }

  return error.code && error.message ? error.message : fallback;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as { error?: unknown };

  if (typeof candidate.error !== "object" || candidate.error === null) {
    return false;
  }

  const error = candidate.error as { code?: unknown; message?: unknown };
  return typeof error.code === "string" && typeof error.message === "string";
}
