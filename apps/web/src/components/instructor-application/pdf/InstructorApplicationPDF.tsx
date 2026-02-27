// @file: apps/web/src/components/instructor-application/pdf/InstructorApplicationPDF.tsx
import { Document } from "@react-pdf/renderer";
import type { InstructorApplicationDetail } from "@hss/schemas";
import { PageOne } from "@/components/instructor-application/pdf/components/PageOne";
import { RequirementsPages } from "@/components/instructor-application/pdf/components/RequirementsPages";
import { PageSignatures } from "@/components/instructor-application/pdf/components/PageSignatures";
import "@/components/instructor-application/pdf/styles";

export function InstructorApplicationPDF({
  data,
}: {
  data: InstructorApplicationDetail;
}) {
  return (
    <Document
      title={`Karta próby — ${data.candidateProfile.firstName ?? ""} ${data.candidateProfile.surname ?? ""}`}
      author="HSS — Harcerski System Stopni"
    >
      <PageOne data={data} />
      <RequirementsPages data={data} />
      <PageSignatures degreeCode={data.template.degreeCode} />
    </Document>
  );
}
