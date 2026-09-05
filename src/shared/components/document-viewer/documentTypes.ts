export type DocumentPreviewKind =
  | "pdf"
  | "docx"
  | "legacy-doc"
  | "unsupported";

export function getDocumentPreviewKind(
  fileName: string | undefined,
): DocumentPreviewKind {
  const normalizedName = fileName?.trim().toLowerCase() ?? "";

  if (normalizedName.endsWith(".pdf")) return "pdf";
  if (normalizedName.endsWith(".docx")) return "docx";
  if (normalizedName.endsWith(".doc")) return "legacy-doc";
  return "unsupported";
}

export function canPreviewDocument(fileName: string | undefined): boolean {
  const kind = getDocumentPreviewKind(fileName);
  return kind === "pdf" || kind === "docx";
}
