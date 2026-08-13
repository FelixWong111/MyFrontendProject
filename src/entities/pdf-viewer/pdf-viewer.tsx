import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  FilePdfOutlined,
  LeftOutlined,
  MinusOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Alert, Button, Empty, Space, Spin, Typography } from "antd";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";
import styles from "./pdf-viewer.module.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_SCALE = 0.6;
const MAX_SCALE = 2;
const SCALE_STEP = 0.2;

export function PDF_viewer() {
  return (
    <section className="announcement-page">
      <div className="announcement-page__heading">
        <div>
          <Typography.Title level={2}>招标公告 PDF</Typography.Title>
          <Typography.Text type="secondary">
            选择本地 PDF 文件后，可在页面中翻页和缩放查看。
          </Typography.Text>
        </div>
      </div>

      <PdfViewer />
    </section>
  );
}

function PdfViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("");
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pdfData) {
      setPdfDocument(null);
      return;
    }

    let disposed = false;
    const loadingTask = pdfjs.getDocument({ data: pdfData.slice() });

    setIsLoading(true);
    setError("");
    setPdfDocument(null);

    void loadingTask.promise
      .then((document) => {
        if (!disposed) {
          setPdfDocument(document);
          setPageNumber(1);
        }
      })
      .catch((reason: unknown) => {
        if (!disposed) {
          setError(getErrorMessage(reason, "无法读取这个 PDF 文件。"));
        }
      })
      .finally(() => {
        if (!disposed) {
          setIsLoading(false);
        }
      });

    return () => {
      disposed = true;
      void loadingTask.destroy();
    };
  }, [pdfData]);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }

    let disposed = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | null =
      null;

    const renderPage = async () => {
      setIsLoading(true);
      setError("");

      try {
        const page = await pdfDocument.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas || disposed) {
          return;
        }

        const viewport = page.getViewport({ scale });
        const pixelRatio = window.devicePixelRatio || 1;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("浏览器无法创建 Canvas 绘图环境。");
        }

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform:
            pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await renderTask.promise;
      } catch (reason) {
        if (
          !disposed &&
          !(reason instanceof Error && reason.name === "RenderingCancelledException")
        ) {
          setError(getErrorMessage(reason, "PDF 页面渲染失败。"));
        }
      } finally {
        if (!disposed) {
          setIsLoading(false);
        }
      }
    };

    void renderPage();

    return () => {
      disposed = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdfDocument, scale]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("请选择 PDF 格式的文件。");
      return;
    }

    setError("");
    setFileName(file.name);
    setScale(1);
    setPdfData(new Uint8Array(await file.arrayBuffer()));
  };

  const changeScale = (nextScale: number) => {
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)));
  };

  return (
    <div className={styles.pdfViewer}>
      <input
        ref={fileInputRef}
        className={styles.pdfViewer__fileInput}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => void handleFileChange(event)}
      />

      <div className={styles.PdfToolbar}>
        <Space size={10} wrap>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
          >
            选择 PDF
          </Button>

          {fileName && (
            <Typography.Text className={styles.filename} ellipsis>
              <FilePdfOutlined /> {fileName}
            </Typography.Text>
          )}
        </Space>

        {pdfDocument && (
          <Space size={8} wrap>
            <Button
              icon={<LeftOutlined />}
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((page) => page - 1)}
            >
              上一页
            </Button>
            <Typography.Text className={styles.page_count}>
              {pageNumber} / {pdfDocument.numPages}
            </Typography.Text>
            <Button
              disabled={pageNumber >= pdfDocument.numPages}
              onClick={() => setPageNumber((page) => page + 1)}
            >
              下一页
            </Button>
            <Button
              aria-label="缩小"
              icon={<MinusOutlined />}
              disabled={scale <= MIN_SCALE}
              onClick={() => changeScale(scale - SCALE_STEP)}
            />
            <Typography.Text className={styles.scale}>
              {Math.round(scale * 100)}%
            </Typography.Text>
            <Button
              aria-label="放大"
              icon={<PlusOutlined />}
              disabled={scale >= MAX_SCALE}
              onClick={() => changeScale(scale + SCALE_STEP)}
            />
          </Space>
        )}
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      <div className={styles.stage}>
        {!pdfData && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请选择一个 PDF 文件开始查看"
          />
        )}

        {pdfData && isLoading && (
          <div className="pdf-viewer__loading">
            <Spin size="large" tip="正在加载 PDF..." />
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={pdfDocument ? styles.canvas : styles.canvasHidden}
        />
      </div>
    </div>
  );
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}
