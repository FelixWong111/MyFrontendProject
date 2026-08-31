import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Space } from "antd";
import type { NamePath } from "antd/es/form/interface";

interface StringListFieldProps {
  name: NamePath;
  label: string;
  addText: string;
  placeholder: string;
}

export function StringListField({
  name,
  label,
  addText,
  placeholder,
}: StringListFieldProps) {
  return (
    <Form.Item label={label}>
      <Form.List name={name}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {fields.map((field) => (
              <div
                key={field.key}
                style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
              >
                <Form.Item
                  name={field.name}
                  style={{ flex: 1, marginBottom: 0 }}
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: `请填写${label}`,
                    },
                  ]}
                >
                  <Input placeholder={placeholder} />
                </Form.Item>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`删除${label}`}
                  onClick={() => remove(field.name)}
                />
              </div>
            ))}
            <Button
              block
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => add("")}
            >
              {addText}
            </Button>
          </Space>
        )}
      </Form.List>
    </Form.Item>
  );
}
