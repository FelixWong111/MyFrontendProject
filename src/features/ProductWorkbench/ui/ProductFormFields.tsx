import { Form, Input, Select } from "antd";

export function ProductFormFields() {
  return (
    <>
      <Form.Item
        label="产品名称"
        name="name"
        rules={[
          { required: true, whitespace: true, message: "请输入产品名称" },
          { max: 100, message: "产品名称不能超过 100 个字符" },
        ]}
      >
        <Input maxLength={100} showCount placeholder="例如：烟感探测器" />
      </Form.Item>

      <Form.Item
        label="匹配关键词"
        name="keywords"
        extra="输入后按回车确认，可使用逗号分隔；最多 50 个，每个不超过 50 个字符。"
        rules={[
          {
            validator: (_, value: string[] | undefined) => {
              const keywords = value ?? [];
              if (keywords.length > 50) {
                return Promise.reject(new Error("关键词最多 50 个"));
              }
              if (keywords.some((keyword) => keyword.trim().length > 50)) {
                return Promise.reject(
                  new Error("每个关键词不能超过 50 个字符"),
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Select
          mode="tags"
          open={false}
          placeholder="例如：烟感、火灾报警"
          tokenSeparators={[",", "，"]}
        />
      </Form.Item>

      <Form.Item
        label="产品简介"
        name="description"
        rules={[
          { required: true, whitespace: true, message: "请输入产品简介" },
          { max: 2000, message: "产品简介不能超过 2000 个字符" },
        ]}
      >
        <Input.TextArea
          autoSize={{ minRows: 6, maxRows: 12 }}
          maxLength={2000}
          showCount
          placeholder="说明产品能力、供货范围和适用场景。"
        />
      </Form.Item>
    </>
  );
}
