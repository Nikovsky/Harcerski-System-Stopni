// @file: apps/web/src/components/instructor-application/hooks/useApplicationPdfDownload.tsx
"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { InstructorApplicationDetail } from "@hss/schemas";

const PDF_GENERATION_TIMEOUT_MS = 20_000;

export function useApplicationPdfDownload(app: InstructorApplicationDetail) {
  const t = useTranslations("applications");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleDownloadPdf = useCallback(async () => {
    if (generatingPdf) return;

    setPdfError(null);
    setGeneratingPdf(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { InstructorApplicationPDF } = await import(
        "@/components/instructor-application/pdf/InstructorApplicationPDF"
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("PDF_GENERATION_TIMEOUT")), PDF_GENERATION_TIMEOUT_MS);
      });

      const blob = await Promise.race([
        pdf(<InstructorApplicationPDF data={app} />).toBlob(),
        timeoutPromise,
      ]);

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `karta-proby-${app.template.degreeCode}-${app.candidateProfile.surname ?? t("pdf.defaultFilename")}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF generation error:", error);
      setPdfError(t("messages.pdfGenerationError"));
    } finally {
      setGeneratingPdf(false);
    }
  }, [app, generatingPdf, t]);

  return {
    generatingPdf,
    pdfError,
    handleDownloadPdf,
  };
}