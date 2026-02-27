// @file: apps/web/src/components/instructor-application/pdf/components/PageOne.tsx
import { Page } from "@react-pdf/renderer";
import type { InstructorApplicationDetail } from "@hss/schemas";
import { PageFooter, s } from "../helpers";
import {
  CandidateDataSection,
  PageOneHeader,
  ResultsSection,
  ServiceHistorySection,
  TrialInfoSection,
} from "./PageOneSections";

export function PageOne({ data }: { data: InstructorApplicationDetail }) {
  return (
    <Page size="A4" style={s.page} wrap>
      <PageOneHeader data={data} />
      <CandidateDataSection data={data} />
      <ServiceHistorySection data={data} />
      <ResultsSection data={data} />
      <TrialInfoSection data={data} />

      <PageFooter />
    </Page>
  );
}
