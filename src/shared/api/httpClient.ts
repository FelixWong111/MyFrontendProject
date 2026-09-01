import axios from "axios";
import { runtimeConfig } from "@/shared/config/runtimeConfig";

export const httpClient = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
  },
});
