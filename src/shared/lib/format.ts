import dayjs from "dayjs";

export function formatDateTime(value: string): string {
  const date = dayjs(value);
  return date.isValid() ? date.format("YYYY-MM-DD HH:mm:ss") : value;
}

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = sizeBytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unitIndex]}`;
}

export function formatCurrencyFromCents(value: number | null): string {
  if (value === null) {
    return "未填写";
  }

  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(value / 100);
}

export function yuanStringToCents(
  value: string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new Error("金额最多保留两位小数");
  }

  const yuan = BigInt(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = yuan * 100n + BigInt(fraction || "0");

  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("金额超出浏览器可安全处理的范围");
  }

  return Number(cents);
}

export function centsToYuanString(value: number | null): string | null {
  if (value === null) {
    return null;
  }

  const yuan = Math.floor(value / 100);
  const cents = value % 100;
  return `${yuan}.${String(cents).padStart(2, "0")}`;
}
