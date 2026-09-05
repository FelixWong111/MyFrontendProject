import { httpClient } from "@/shared/api/httpClient";

export interface ServiceHealth {
  status: "UP" | "DEGRADED";
  docling: {
    status: "UP" | "DOWN";
    version: string | null;
    baseUrl: string | null;
  };
}

export interface ServiceVersion {
  application: string;
  java: string;
  designBaseline: string;
  docling: string | null;
}

export async function getServiceHealth(
  signal?: AbortSignal,
): Promise<ServiceHealth> {
  const response = await httpClient.get<ServiceHealth>("/api/v1/health", {
    signal,
  });
  return response.data;
}

export async function getServiceVersion(
  signal?: AbortSignal,
): Promise<ServiceVersion> {
  const response = await httpClient.get<ServiceVersion>("/api/v1/version", {
    signal,
  });
  return response.data;
}
