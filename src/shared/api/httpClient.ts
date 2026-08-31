import axios from "axios";

const DEFAULT_API_BASE_URL = "http://8.134.38.209:34567";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
  },
});
