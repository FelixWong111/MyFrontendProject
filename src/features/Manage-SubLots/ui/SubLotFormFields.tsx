import { Col, Form, Input, InputNumber, Row } from "antd";
import type { RuleObject } from "antd/es/form";

import type { SubLotFormValues } from "@/features/Manage-SubLots/model/subLotForm";
import { StringListField } from "@/shared/components/StringListField/StringListField";
import { yuanStringToCents } from "@/shared/lib/format";

interface SubLotFormFieldsProps {
  prefix?: Array<string | number>;
}

function fieldName(
  prefix: Array<string | number>,
  name: keyof SubLotFormValues,
) {
  return [...prefix, name];
}

async function validateMoney(_: RuleObject, value?: string | null) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  yuanStringToCents(value);
}

export function SubLotFormFields({ prefix = [] }: SubLotFormFieldsProps) {
  return (
    <>
      <Form.Item
        name={fieldName(prefix, "name")}
        label="子标包名称"
        rules={[
          { required: true, whitespace: true, message: "请输入子标包名称" },
        ]}
      >
        <Input placeholder="例如：第一标段：设备采购" />
      </Form.Item>

      <Row gutter={12}>
        <Col xs={24} md={8}>
          <Form.Item
            name={fieldName(prefix, "estimatedAmount")}
            label="预估金额（元）"
            rules={[{ validator: validateMoney }]}
          >
            <InputNumber<string>
              stringMode
              min="0"
              precision={2}
              controls={false}
              placeholder="0.00"
              prefix="¥"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name={fieldName(prefix, "maxPrice")}
            label="最高限价（元）"
            rules={[{ validator: validateMoney }]}
          >
            <InputNumber<string>
              stringMode
              min="0"
              precision={2}
              controls={false}
              placeholder="0.00"
              prefix="¥"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name={fieldName(prefix, "deposit")}
            label="保证金（元）"
            rules={[{ validator: validateMoney }]}
          >
            <InputNumber<string>
              stringMode
              min="0"
              precision={2}
              controls={false}
              placeholder="0.00"
              prefix="¥"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col xs={24} md={8}>
          <Form.Item
            name={fieldName(prefix, "estimatedAmountNote")}
            label="预估金额说明"
          >
            <Input allowClear placeholder="例如：含税预估" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name={fieldName(prefix, "maxPriceNote")}
            label="最高限价说明"
          >
            <Input allowClear placeholder="补充说明（选填）" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            name={fieldName(prefix, "depositNote")}
            label="保证金说明"
          >
            <Input allowClear placeholder="补充说明（选填）" />
          </Form.Item>
        </Col>
      </Row>

      <StringListField
        name={fieldName(prefix, "qualifications")}
        label="专用资格要求"
        addText="添加专用资格要求"
        placeholder="输入该子标包的资格要求"
      />
    </>
  );
}
