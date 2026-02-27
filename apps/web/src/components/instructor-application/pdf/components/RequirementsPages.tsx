// @file: apps/web/src/components/instructor-application/pdf/components/RequirementsPages.tsx
/* eslint-disable jsx-a11y/alt-text */
import { Image, Page, Text, View } from "@react-pdf/renderer";
import type { InstructorApplicationDetail } from "@hss/schemas";
import { B, DescriptionBody, GRAY, NumericReqCell, PageFooter, letterPart, s } from "../helpers";

export function RequirementsPages({ data }: { data: InstructorApplicationDetail }) {
  const requirements = data.requirements;
  const groupDefs = data.template.groupDefinitions ?? [];

  const childrenByParent: Record<string, typeof requirements> = {};
  const topLevelReqs: typeof requirements = [];
  for (const r of requirements) {
    if (r.definition.parentId) {
      (childrenByParent[r.definition.parentId] ??= []).push(r);
    } else {
      topLevelReqs.push(r);
    }
  }

  type FlatRow = {
    type: "group" | "item";
    code: string;
    description: string;
    state?: string;
    actionDescription?: string;
    verificationText?: string | null;
  };

  type SortableEntry =
    | { kind: "group"; sortOrder: number; def: (typeof groupDefs)[0] }
    | { kind: "req"; sortOrder: number; req: (typeof requirements)[0] };

  const entries: SortableEntry[] = [];
  for (const g of groupDefs) {
    if (!g.parentId) entries.push({ kind: "group", sortOrder: g.sortOrder, def: g });
  }
  for (const r of topLevelReqs) {
    entries.push({ kind: "req", sortOrder: r.definition.sortOrder, req: r });
  }
  entries.sort((a, b) => a.sortOrder - b.sortOrder);

  const rows: FlatRow[] = [];
  for (const entry of entries) {
    if (entry.kind === "group") {
      rows.push({
        type: "group",
        code: entry.def.code,
        description: entry.def.description,
      });
      const children = (childrenByParent[entry.def.uuid] ?? []).sort(
        (a, b) => a.definition.sortOrder - b.definition.sortOrder,
      );
      for (const child of children) {
        rows.push({
          type: "item",
          code: child.definition.code,
          description: child.definition.description,
          state: child.state,
          actionDescription: child.actionDescription,
          verificationText: child.verificationText,
        });
      }
    } else {
      rows.push({
        type: "item",
        code: entry.req.definition.code,
        description: entry.req.definition.description,
        state: entry.req.state,
        actionDescription: entry.req.actionDescription,
        verificationText: entry.req.verificationText,
      });
    }
  }

  const W = {
    req: "30.5%",
    done: "10%",
    plan: "10%",
    action: "23.8%",
    verif: "25.7%",
  };

  return (
    <Page size="A4" style={s.page} wrap>
      <Text style={s.sectionHeading}>Proponowane zadania</Text>
      <Text
        style={{
          fontSize: 9,
          marginBottom: 6,
          lineHeight: 1.3,
        }}
      >
        Komisja uznaje wymagania zrealizowane od ukończenia 16 r. życia, jednak
        wykonane nie wcześniej niż 2 lata przed otwarciem próby.
      </Text>

      <View style={s.table}>
        <View style={s.reqHeaderRow}>
          <View style={{ ...s.cell, width: W.req }}>
            <Text style={{ fontSize: 9, fontWeight: 700, textAlign: "center" }}>
              Wymaganie
            </Text>
          </View>
          <View style={{ ...s.cell, width: W.done, alignItems: "center", justifyContent: "center" }}>
            <Image src="/images/icon-done.png" style={{ width: 18, height: 18, marginBottom: 2 }} />
            <Text style={{ fontSize: 8, fontWeight: 700, textAlign: "center" }}>
              wykonałem
            </Text>
          </View>
          <View style={{ ...s.cell, width: W.plan, alignItems: "center", justifyContent: "center" }}>
            <Image src="/images/icon-planned.png" style={{ width: 22, height: 12, marginBottom: 2 }} />
            <Text style={{ fontSize: 8, fontWeight: 700, textAlign: "center" }}>
              wykonam
            </Text>
          </View>
          <View style={{ ...s.cell, width: W.action }}>
            <Text style={{ fontSize: 9, fontWeight: 700, textAlign: "center" }}>
              Działanie, w którym{"\n"}wymaganie zostało/zostanie{"\n"}
              zrealizowane
            </Text>
          </View>
          <View style={{ ...s.cell, width: W.verif }}>
            <Text style={{ fontSize: 9, fontWeight: 700, textAlign: "center" }}>
              Weryfikacja zadania{"\n"}(wymagane przy zaliczaniu{"\n"}wymagania)
            </Text>
          </View>
        </View>

        {rows.map((row, i) => {
          if (row.type === "group") {
            return (
              <View key={`g-${i}`} style={s.reqGroupRow} wrap={false}>
                <View style={{ ...s.cell, width: "100%", backgroundColor: GRAY }}>
                  <Text style={{ fontSize: 9, fontWeight: 700 }}>
                    {row.code}. {row.description}
                  </Text>
                </View>
              </View>
            );
          }

          const isLetterCode = /[A-Za-z]/.test(row.code);

          return (
            <View key={`r-${i}`} style={s.reqItemRow} wrap={false}>
              {isLetterCode ? (
                <View
                  style={{
                    ...s.cell,
                    width: W.req,
                    flexDirection: "row",
                    padding: 0,
                  }}
                >
                  <View
                    style={{
                      width: "13%",
                      borderRightWidth: 0.5,
                      borderRightColor: B,
                      paddingVertical: 2,
                      paddingHorizontal: 3,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: 700 }}>
                      {letterPart(row.code)}.
                    </Text>
                  </View>
                  <View
                    style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 3 }}
                  >
                    <DescriptionBody description={row.description} />
                  </View>
                </View>
              ) : (
                <View style={{ ...s.cell, width: W.req }}>
                  <NumericReqCell code={row.code} description={row.description} />
                </View>
              )}
              <View
                style={{
                  ...s.cell,
                  width: W.done,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {row.state === "DONE" && (
                  <Image
                    src="/images/icon-done.png"
                    style={{ width: 14, height: 14 }}
                  />
                )}
              </View>
              <View
                style={{
                  ...s.cell,
                  width: W.plan,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {row.state === "PLANNED" && (
                  <Image
                    src="/images/icon-planned.png"
                    style={{ width: 18, height: 10 }}
                  />
                )}
              </View>
              <View style={{ ...s.cell, width: W.action }}>
                <Text style={{ fontSize: 8, lineHeight: 1.3 }}>
                  {row.actionDescription || ""}
                </Text>
              </View>
              <View style={{ ...s.cell, width: W.verif }}>
                <Text style={{ fontSize: 8, lineHeight: 1.3 }}>
                  {row.verificationText || ""}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <PageFooter />
    </Page>
  );
}
