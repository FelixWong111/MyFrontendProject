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
import styles from "./AnnouncementPage.module.css";

import { ReviewPanel } from "../../../features/ReviewPanel/ReviewPanel";
import { SectionCard } from "../../../shared/components/SectionCard/SectionCard";
import { PDF_viewer } from "../../../entities/pdf-viewer/pdf-viewer";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_SCALE = 0.6;
const MAX_SCALE = 2;
const SCALE_STEP = 0.2;

export function AnnouncementPage(){
  return(
    <div className={styles.page}>
      <header className={styles.hero}>

      </header>

      <div className={styles.contentGrid}>
        <main className={styles.mainColumn}>
          <SectionCard
            title="招标项目概况"
            description="从来源公告中提取的核心采购信息"
          >
            
          </SectionCard>
          <SectionCard>
            <PDF_viewer />
          </SectionCard>
        </main>

        <div className={styles.reviewColumn}>
          <ReviewPanel

          />
        </div>

      </div>

    </div>

  );
}