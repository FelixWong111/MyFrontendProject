import { UploadOutlined } from "@ant-design/icons";
import { App, Button, Space, Upload } from "antd";
import type { UploadFile as AntUploadFile } from "antd";
import { useState } from "react";

import {
  uploadFile,
  type UploadedFile,
} from "@/features/Upload-file/api/uploadFile";
import { getApiErrorMessage } from "@/shared/api/apiError";

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

interface UploadFileProps {
  onUploaded: (file: UploadedFile) => void;
}

export function UploadFile({ onUploaded }: UploadFileProps) {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<AntUploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile || uploading) {
      return;
    }

    if (selectedFile.size === 0) {
      message.error("不能上传空文件。");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      message.error("文件不能超过 100 MiB。");
      return;
    }

    setUploading(true);

    try {
      const uploadedFile = await uploadFile(selectedFile);
      setSelectedFile(null);
      setFileList([]);
      message.success(`“${uploadedFile.originalName}”上传成功。`);
      onUploaded(uploadedFile);
    } catch (reason) {
      message.error(
        getApiErrorMessage(reason, "文件上传失败，请稍后重试。", {
          INVALID_REQUEST: "请选择一个非空文件后再上传。",
          UPLOAD_TOO_LARGE: "文件超过后端允许的 100 MiB 上限。",
        }),
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Space align="start" wrap>
      <Upload
        beforeUpload={(file) => {
          setSelectedFile(file);
          return false;
        }}
        disabled={uploading}
        fileList={fileList}
        maxCount={1}
        onChange={({ fileList: nextFileList }) => {
          setFileList(nextFileList.slice(-1));
        }}
        onRemove={() => {
          setSelectedFile(null);
        }}
        showUploadList={{ showPreviewIcon: false }}
      >
        <Button icon={<UploadOutlined />} disabled={uploading}>
          选择文件
        </Button>
      </Upload>
      <Button
        type="primary"
        disabled={!selectedFile}
        loading={uploading}
        onClick={() => void handleUpload()}
      >
        上传
      </Button>
    </Space>
  );
}
