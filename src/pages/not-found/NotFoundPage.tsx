import { Button, Result } from "antd";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="页面不存在"
      subTitle="您访问的招标公告审核页面不存在。"
      extra={
        <Link to="/">
          <Button type="primary">返回审核页面</Button>
        </Link>
      }
    />
  );
}
