import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Result } from "antd";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("应用发生未处理错误", error, info.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="审核工作台发生错误"
          subTitle="请重新加载页面以恢复当前招标公告数据。"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
