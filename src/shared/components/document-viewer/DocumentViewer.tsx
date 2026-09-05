import { useEffect, useRef, useState } from "react";
import {
  FilePdfOutlined,
  FileWordOutlined,
  LeftOutlined,
  MinusOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Alert, Button, Empty, Space, Spin, Tag, Typography } from "antd";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy } from "pdfjs-dist";

import {
  getDocumentPreviewKind,
  type DocumentPreviewKind,
} from "./documentTypes";
import styles from "./DocumentViewer.module.css";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_SCALE = 0.6;
const MAX_SCALE = 2;
const SCALE_STEP = 0.2;

export interface DocumentViewerProps {
  documentBlob?: Blob | null;
  fileName?: string;
}

export function DocumentViewer({
  documentBlob,
  fileName,
}: DocumentViewerProps) {
  const previewKind = getDocumentPreviewKind(fileName);
  const description = getViewerDescription(
    previewKind,
    Boolean(documentBlob),
  );

  return (
    <section className={styles.viewer}>
      <div className={styles.viewerHeading}>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>

      {previewKind === "pdf" ? (
        <PdfViewer pdfBlob={documentBlob} initialFileName={fileName} />
      ) : previewKind === "docx" ? (
        <WordViewer documentBlob={documentBlob} initialFileName={fileName} />
      ) : (
        <UnsupportedDocumentState kind={previewKind} />
      )}
    </section>
  );
}

function getViewerDescription(
  previewKind: DocumentPreviewKind,
  hasDocument: boolean,
): string {
  if (!hasDocument) {
    if (previewKind === "legacy-doc") {
      return "旧版 DOC 文件需要先转换为 DOCX 或 PDF 才能预览。";
    }
    if (previewKind === "unsupported") {
      return "当前支持直接预览 PDF 和 DOCX 文件。";
    }
    return `请先读取所选${previewKind === "pdf" ? " PDF" : " DOCX"} 文件。`;
  }

  return previewKind === "pdf"
    ? "已读取所选 PDF，可在页面中翻页和缩放查看。"
    : "已读取所选 DOCX，可在页面中查看分页、表格和图片。";
}

function UnsupportedDocumentState({ kind }: { kind: DocumentPreviewKind }) {
  const description =
    kind === "legacy-doc"
      ? "暂不支持旧版 .doc，请另存为 .docx 或 PDF 后预览"
      : "请选择 PDF 或 DOCX 文件";

  return (
    <div className={styles.unsupportedStage}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={description}
      />
    </div>
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
    if (!pdfBlob) return;

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
          setError(getErrorMessage(reason, "无法读取 PDF 文件。"));
          setIsPdfLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [pdfBlob]);

  useEffect(() => {
    if (!pdfData) return;

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
        if (!disposed && !documentLoaded) setIsPdfLoading(false);
      });

    return () => {
      disposed = true;
      void loadingTask.destroy();
    };
  }, [pdfData]);

  useEffect(() => {
    if (!pdfDocument) return;

    let disposed = false;
    let renderTask: ReturnType<
      Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]
    > | null = null;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (!canvas || disposed) return;

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
          !(reason instanceof Error &&
            reason.name === "RenderingCancelledException")
        ) {
          setError(getErrorMessage(reason, "PDF 页面渲染失败。"));
        }
      } finally {
        if (!disposed) setIsPdfLoading(false);
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
    <div className={styles.documentViewer}>
      <div className={styles.toolbar}>
        <FileName
          fileName={initialFileName}
          icon={<FilePdfOutlined />}
          format="PDF"
        />

        {pdfDocument ? (
          <Space size={8} wrap>
            <Button
              icon={<LeftOutlined />}
              disabled={pageNumber <= 1}
              onClick={() => changePage(pageNumber - 1)}
            >
              上一页
            </Button>
            <Typography.Text className={styles.pageCount}>
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
        ) : null}
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <div className={styles.stage}>
        {!pdfBlob ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请先从文件列表中选择一个 PDF 文件"
          />
        ) : null}

        {pdfBlob && isPdfLoading ? (
          <LoadingOverlay tip="正在加载 PDF..." />
        ) : null}

        <canvas
          ref={canvasRef}
          className={pdfDocument ? styles.canvas : styles.canvasHidden}
        />
      </div>
    </div>
  );
}

interface WordViewerProps {
  documentBlob?: Blob | null;
  initialFileName?: string;
}

function WordViewer({ documentBlob, initialFileName }: WordViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(Boolean(documentBlob));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!documentBlob || !contentRef.current || !styleRef.current) return;

    let disposed = false;
    const contentContainer = contentRef.current;
    const styleContainer = styleRef.current;
    const stagingContent = document.createElement("div");
    const stagingStyles = document.createElement("div");
    contentContainer.replaceChildren();
    styleContainer.replaceChildren();

    const renderWordDocument = async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        if (disposed) return;

        await renderAsync(documentBlob, stagingContent, stagingStyles, {
          breakPages: true,
          className: "docx",
          experimental: false,
          ignoreFonts: false,
          ignoreHeight: false,
          ignoreLastRenderedPageBreak: false,
          ignoreWidth: false,
          inWrapper: true,
          renderAltChunks: false,
          renderChanges: false,
          renderComments: false,
          renderEndnotes: true,
          renderFooters: true,
          renderFootnotes: true,
          renderHeaders: true,
          trimXmlDeclaration: true,
          useBase64URL: true,
        });

        if (!disposed) {
          secureDocumentLinks(stagingContent);
          styleContainer.replaceChildren(...stagingStyles.childNodes);
          contentContainer.replaceChildren(...stagingContent.childNodes);
        }
      } catch (reason) {
        if (!disposed) {
          setError(getErrorMessage(reason, "无法读取这个 DOCX 文件。"));
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void renderWordDocument();

    return () => {
      disposed = true;
      contentContainer.replaceChildren();
      styleContainer.replaceChildren();
    };
  }, [documentBlob]);

  return (
    <div className={styles.documentViewer}>
      <div className={styles.toolbar}>
        <FileName
          fileName={initialFileName}
          icon={<FileWordOutlined />}
          format="DOCX"
        />
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <div className={styles.wordStage}>
        <div ref={styleRef} className={styles.wordStyles} />
        {!documentBlob ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请先从文件列表中选择一个 DOCX 文件"
          />
        ) : null}
        {documentBlob && loading ? (
          <LoadingOverlay tip="正在解析 Word 文档..." />
        ) : null}
        <div ref={contentRef} className={styles.wordContent} />
      </div>
    </div>
  );
}

function FileName({
  fileName,
  icon,
  format,
}: {
  fileName: string | undefined;
  icon: React.ReactNode;
  format: string;
}) {
  return (
    <Space size={8} wrap>
      {fileName ? (
        <Typography.Text className={styles.filename} ellipsis>
          {icon} {fileName}
        </Typography.Text>
      ) : null}
      <Tag>{format}</Tag>
    </Space>
  );
}

function LoadingOverlay({ tip }: { tip: string }) {
  return (
    <div className={styles.loadingOverlay}>
      <Spin size="large" tip={tip} />
    </div>
  );
}

function secureDocumentLinks(container: HTMLElement) {
  container.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    try {
      const url = new URL(href, window.location.href);
      if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
        link.removeAttribute("href");
        return;
      }

      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } catch {
      link.removeAttribute("href");
    }
  });
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}
