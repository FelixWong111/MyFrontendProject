import type { ReactNode } from "react";
import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        cssVar: { key: "tender-scope" },
        token: {
          colorPrimary: "#0f766e",
          colorInfo: "#0f766e",
          colorLink: "#0f766e",
          colorSuccess: "#2f855a",
          colorWarning: "#c58b12",
          colorError: "#c74d39",
          colorText: "#2b3b45",
          colorTextSecondary: "#6c7b84",
          colorBorder: "#dfe6e8",
          borderRadius: 9,
          fontFamily:
            'Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        components: {
          Button: {
            fontWeight: 650,
          },
          Card: {
            bodyPadding: 24,
          },
          Tabs: {
            inkBarColor: "#0f766e",
            itemActiveColor: "#0f766e",
            itemHoverColor: "#0f766e",
            itemSelectedColor: "#0f766e",
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
