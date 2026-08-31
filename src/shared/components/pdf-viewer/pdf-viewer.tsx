import { useEffect, useRef, useState } from "react";
import {
  FilePdfOutlined,
  LeftOutlined,
  MinusOutlined,
  PlusOutlined,
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

export interface PDFViewerProps {
  pdfBlob?: Blob | null;
  fileName?: string;
}

export function PDF_viewer({
  pdfBlob,
  fileName,
}: PDFViewerProps) {
  return (
    <section className={styles["announcement-page"]}>
      <div className={styles["announcement-page__heading"]}>
        <div>
          <Typography.Text type="secondary">
            {pdfBlob
              ? "已读取所选 PDF，可在页面中翻页和缩放查看。"
              : "请先从文件列表中选择一个 PDF 文件。"}
          </Typography.Text>
        </div>
      </div>

      <PdfViewer
        pdfBlob={pdfBlob}
        initialFileName={fileName}
      />
    </section>
  );
}

interface PdfViewerProps {
  pdfBlob?: Blob | null;
  initialFileName?: string;
}

function PdfViewer({ pdfBlob, initialFileName }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [isPdfLoading, setIsPdfLoading] = useState(Boolean(pdfBlob));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pdfBlob) {
      return;
    }

    let disposed = false;

    void pdfBlob
      .arrayBuffer()
      .then((buffer) => {
        if (!disposed) {
          setError("");
          setPdfDocument(null);
          setIsPdfLoading(true);
          setPdfData(new Uint8Array(buffer));
        }
      })
      .catch((reason: unknown) => {
        if (!disposed) {
          setError(getErrorMessage(reason, "无法读取 PDF Blob。"));
          setIsPdfLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [pdfBlob]);

  useEffect(() => {
    if (!pdfData) {
      return;
    }

    let disposed = false;
    let documentLoaded = false;
    const loadingTask = pdfjs.getDocument({ data: pdfData.slice() });

    void loadingTask.promise
      .then((document) => {
        if (!disposed) {
          documentLoaded = true;
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
        if (!disposed && !documentLoaded) {
          setIsPdfLoading(false);
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
          setIsPdfLoading(false);
        }
      }
    };

    void renderPage();

    return () => {
      disposed = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdfDocument, scale]);

  const changeScale = (nextScale: number) => {
    setError("");
    setIsPdfLoading(true);
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)));
  };

  const changePage = (nextPage: number) => {
    setError("");
    setIsPdfLoading(true);
    setPageNumber(nextPage);
  };

  return (
    <div className={styles["pdf-viewer"]}>
      <div className={styles["pdf-viewer__toolbar"]}>
        <Space size={10} wrap>
          {initialFileName && (
            <Typography.Text className={styles.filename} ellipsis>
              <FilePdfOutlined /> {initialFileName}
            </Typography.Text>
          )}
        </Space>

        {pdfDocument && (
          <Space size={8} wrap>
            <Button
              icon={<LeftOutlined />}
              disabled={pageNumber <= 1}
              onClick={() => changePage(pageNumber - 1)}
            >
              上一页
            </Button>
            <Typography.Text className={styles.page_count}>
              {pageNumber} / {pdfDocument.numPages}
            </Typography.Text>
            <Button
              disabled={pageNumber >= pdfDocument.numPages}
              onClick={() => changePage(pageNumber + 1)}
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
        {!pdfBlob && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请先从文件列表中选择一个 PDF 文件"
          />
        )}

        {pdfBlob && isPdfLoading && (
          <div className={styles["pdf-viewer__loading"]}>
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
