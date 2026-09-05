import type { ReactNode } from "react";
import {
  AuditOutlined,
  BellOutlined,
  DownOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Avatar, Breadcrumb, Button, Layout, Space, Typography } from "antd";
import { ServiceStatus } from "@/shared/components/ServiceStatus/ServiceStatus";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <Layout className={styles.layout}>
      <Layout.Header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="/" aria-label="招采智审首页">
            <span className={styles.brandMark} aria-hidden="true">
              <AuditOutlined />
            </span>
            <span>
              <strong>公告审核</strong>
              <small>公告审核中心</small>
            </span>
          </a>

          <div className={styles.workspaceLabel}>
            <SafetyCertificateOutlined /> 审批管理
          </div>

          <Space className={styles.account} size={10}>
            <ServiceStatus />
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined />}
              aria-label="通知"
            />
            <span className={styles.headerDivider} />
            <Avatar size={32} className={styles.accountAvatar}>
              王
            </Avatar>
            <span className={styles.accountCopy}>
              <Typography.Text>王以乐</Typography.Text>
              <small>审核负责人</small>
            </span>
            <DownOutlined className={styles.accountChevron} />
          </Space>
        </div>
      </Layout.Header>

      <div className={styles.breadcrumbBar}>
        <div className={styles.breadcrumbInner}>
          <Breadcrumb
            items={[
              { title: "招采管理" },
              { title: "工作台" },
            ]}
          />
        </div>
      </div>

      <Layout.Content className={styles.content}>{children}</Layout.Content>
      <Layout.Footer className={styles.footer}>
        招采智审 · 公告与产品工作台
      </Layout.Footer>
    </Layout>
  );
}
