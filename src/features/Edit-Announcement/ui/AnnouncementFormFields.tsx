import { Col, DatePicker, Form, Input, Row } from "antd";

import type { AnnouncementFormValues } from "@/features/Edit-Announcement/model/announcementForm";
import { StringListField } from "@/shared/components/StringListField/StringListField";

export function AnnouncementFormFields() {
  return (
    <>
      <Form.Item<AnnouncementFormValues>
        name="name"
        label="公告名称"
        rules={[
          { required: true, whitespace: true, message: "请输入公告名称" },
        ]}
      >
        <Input maxLength={200} placeholder="例如：某项目采购招标公告" />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item<AnnouncementFormValues>
            name="projectCode"
            label="项目编号"
          >
            <Input allowClear placeholder="例如：ZC-2026-001" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item<AnnouncementFormValues>
            name="deadline"
            label="截止日期"
          >
            <DatePicker
              allowClear
              format="YYYY-MM-DD"
              placeholder="选择截止日期"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <StringListField
            name="tenderers"
            label="招标机构"
            addText="添加招标机构"
            placeholder="输入招标机构名称"
          />
        </Col>
        <Col xs={24} md={12}>
          <StringListField
            name="agents"
            label="代理机构"
            addText="添加代理机构"
            placeholder="输入代理机构名称"
          />
        </Col>
      </Row>

      <StringListField
        name="qualifications"
        label="通用资格要求"
        addText="添加通用资格要求"
        placeholder="输入资格要求"
      />
    </>
  );
}
