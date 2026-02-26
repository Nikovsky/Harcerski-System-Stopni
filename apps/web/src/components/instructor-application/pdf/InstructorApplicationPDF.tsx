// @file: apps/web/src/components/instructor-application/pdf/InstructorApplicationPDF.tsx
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { InstructorApplicationDetail } from "@hss/schemas";
import { ZHR_LOGO } from "./zhr-logo";

// ── Font (Arial) ────────────────────────────────────────────────────────────

Font.register({
  family: "Arial",
  fonts: [
    { src: "/fonts/Arial-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Arial-Bold.ttf", fontWeight: 700 },
    { src: "/fonts/Arial-Italic.ttf", fontWeight: 400, fontStyle: "italic" },
    { src: "/fonts/Arial-Bold-Italic.ttf", fontWeight: 700, fontStyle: "italic" },
  ],
});

// Disable word hyphenation — never split words
Font.registerHyphenationCallback((word) => [word]);

// ── Styles (based on DOCX measurements) ─────────────────────────────────────
// Page: A4 (595.3pt x 841.9pt)
// Margins: top=28.4pt, left=28.4pt, right=28.4pt, bottom=44.4pt
// Usable width: 595.3 - 28.4 - 28.4 ≈ 538.5pt

const B = "#000";
const GRAY = "#d9d9d9";

const s = StyleSheet.create({
  page: {
    fontFamily: "Arial",
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 28,
    color: B,
  },

  // ── Header (Table 0: col0=86.2pt logo, col1=452.4pt text) ──
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  headerLogo: { width: 91, height: 94 },
  headerTextBlock: {
    flex: 1,
    paddingLeft: 12,
  },
  // "ZWIĄZEK HARCERSTWA RZECZYPOSPOLITEJ" — Arial 11pt bold, centered
  headerOrg: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center" as const,
  },
  // "Komisja Instruktorska..." — Arial 11pt bold, centered
  headerCommission: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center" as const,
    marginTop: 4,
  },
  // "Karta próby na stopień PRZEWODNIKA" — Arial 12pt bold, centered
  headerTitle: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center" as const,
    marginTop: 8,
    marginBottom: 8,
  },

  // ── Section titles — DOCX: h2 = 15pt bold ──
  sectionHeading: {
    fontSize: 15,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
  },

  // ── Table primitives ──
  table: {},
  row: { flexDirection: "row" as const },
  cell: {
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: B,
    paddingVertical: 2,
    paddingHorizontal: 3,
    fontSize: 9,
  },
  cellLabel: { fontSize: 9 },
  cellValue: { fontSize: 9, marginTop: 1 },

  // ── Checkbox (☐ / ☑) ──
  cbRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginRight: 6,
    marginVertical: 1,
  },
  cbBox: {
    width: 8,
    height: 8,
    borderWidth: 0.5,
    borderColor: B,
    marginRight: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cbChecked: {
    width: 8,
    height: 8,
    borderWidth: 0.5,
    borderColor: B,
    marginRight: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: B,
  },
  cbMark: { fontSize: 6, fontWeight: 700, color: "#ffffff" },
  cbLabel: { fontSize: 9 },

  // ── Requirements table ──
  reqHeaderRow: {
    flexDirection: "row" as const,
    backgroundColor: GRAY,
  },
  reqGroupRow: { flexDirection: "row" as const },
  reqItemRow: { flexDirection: "row" as const, minHeight: 20 },

  // ── Page footer ──
  pageNum: {
    position: "absolute" as const,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center" as const,
    fontSize: 9,
    color: B,
  },

  // ── Signatures (page 4) ──
  sigBlock: { marginTop: 14 },
  // DOCX: section headings on page 4 — h2/h3 style (14-15pt bold)
  sigHeading: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  sigSubHeading: { fontSize: 14, fontWeight: 700, marginTop: 12, marginBottom: 4 },
  // DOCX: confirmation text is Arial 10pt normal
  sigText: { fontSize: 10, marginBottom: 4, lineHeight: 1.4 },
  // DOCX: signature table = 3 cols: 196pt + 137pt + 205pt
  sigLine: {
    flexDirection: "row" as const,
    marginTop: 20,
  },
  sigLabelLeft: {
    width: "36.4%", // 196/538
    fontSize: 9,
    textAlign: "center" as const,
  },
  sigSpacer: { width: "25.5%" }, // 137/538
  sigLabelRight: {
    width: "38.1%", // 205/538
    fontSize: 9,
    textAlign: "center" as const,
  },
  sigUnderline: {
    borderTopWidth: 0.5,
    borderTopColor: B,
    paddingTop: 2,
  },
  sigSeparator: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#808080",
    marginTop: 12,
  },
  // DOCX: commission roles at 9pt normal, line-height 1.5
  commissionLine: { fontSize: 9, marginTop: 3, lineHeight: 1.5 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("pl-PL");
  } catch {
    return value;
  }
}

const DEGREE_LABEL: Record<string, string> = {
  PWD: "PRZEWODNIKA",
  PHM: "PODHARCMISTRZA",
  PRZEWODNIK: "PRZEWODNIKA",
  PODHARCMISTRZ: "PODHARCMISTRZA",
  PODHARCMISTRZ_OTWARTA_PROBA: "PODHARCMISTRZA",
};

const DEGREE_LABEL_GENITIVE: Record<string, string> = {
  PWD: "przewodnika",
  PHM: "podharcmistrza",
  PRZEWODNIK: "przewodnika",
  PODHARCMISTRZ: "podharcmistrza",
  PODHARCMISTRZ_OTWARTA_PROBA: "podharcmistrza",
};

const SCOUT_RANK: Record<string, string> = {
  HARCERZ_ORLI: "Harcerz Orli",
  HARCERZ_RZECZYPOSPOLITEJ: "HR",
};

// ── Shared sub-components ─────────────────────────────────────────────────────

function Cb({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={s.cbRow}>
      <View style={checked ? s.cbChecked : s.cbBox}>
        {checked && <Text style={s.cbMark}>X</Text>}
      </View>
      <Text style={s.cbLabel}>{label}</Text>
    </View>
  );
}

function LabelCell({
  label,
  value,
  width,
}: {
  label: string;
  value?: string;
  width: string;
}) {
  return (
    <View style={{ ...s.cell, width }}>
      <Text style={s.cellLabel}>{label}</Text>
      {value !== undefined && <Text style={s.cellValue}>{value}</Text>}
    </View>
  );
}

function GrayLabel({ label, width }: { label: string; width: string }) {
  return (
    <View
      style={{
        ...s.cell,
        width,
        backgroundColor: GRAY,
        justifyContent: "center",
      }}
    >
      <Text style={s.cellLabel}>{label}</Text>
    </View>
  );
}

function ValueCell({ value, width }: { value?: string; width: string }) {
  return (
    <View style={{ ...s.cell, width, justifyContent: "center" }}>
      <Text style={s.cellValue}>{value ?? ""}</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <Text
      style={s.pageNum}
      render={({ pageNumber }) => `- ${pageNumber} -`}
      fixed
    />
  );
}

// ── Requirement description rendering ────────────────────────────────────────
//
// Original document formatting rules:
//  • Codes ending with letter (1A, 1G, 4B, A…): narrow left column (letter only) + right body
//  • Pure numeric codes (2, 3, 5…): full-width, code inline in single Text block
//  Body formatting:
//  – preamble (text before first ●) → bold
//  – "● met. X: text np. example"  → ● + bold "met. X:" + regular text + italic "np. …"
//  – plain text (no bullets)       → bold main + italic "np. …" part

// Splits text at first " np." occurrence → [before, "np. after"] | null
function splitAtNp(text: string): [string, string] | null {
  const idx = text.indexOf(" np.");
  if (idx === -1) return null;
  return [text.slice(0, idx), text.slice(idx + 1)];
}

// Extracts only the letter part from composite codes: "1G" → "G", "4A" → "A", "A" → "A"
function letterPart(code: string): string {
  return code.replace(/^\d+/, "");
}

// Renders one "● met. X: text np. example" bullet line
function BulletLine({ content }: { content: string }) {
  const metMatch = content.match(/^(met\.[^:]+:)([\s\S]*)/);
  if (metMatch) {
    const label = metMatch[1];
    const rest = metMatch[2];
    const np = splitAtNp(rest);
    return (
      <View style={{ flexDirection: "row", marginTop: 2 }}>
        <Text style={{ fontSize: 9, lineHeight: 1.3 }}>{"● "}</Text>
        <Text style={{ fontSize: 9, lineHeight: 1.3, flex: 1 }}>
          <Text style={{ fontWeight: 700 }}>{label}</Text>
          {np ? (
            <>
              <Text>{np[0]}</Text>
              <Text style={{ fontStyle: "italic" }}>{" " + np[1]}</Text>
            </>
          ) : (
            <Text>{rest}</Text>
          )}
        </Text>
      </View>
    );
  }
  // No "met." prefix — render as italic
  return (
    <View style={{ flexDirection: "row", marginTop: 2 }}>
      <Text style={{ fontSize: 9, lineHeight: 1.3 }}>{"● "}</Text>
      <Text style={{ fontSize: 9, lineHeight: 1.3, flex: 1, fontStyle: "italic" }}>
        {content}
      </Text>
    </View>
  );
}

// Full-width cell for numeric codes — code + description as inline Text
function NumericReqCell({ code, description }: { code: string; description: string }) {
  const text = description.trim();
  const hasBullets = text.includes("●");

  if (hasBullets) {
    // Preamble inline with code, then bullets below
    const lines = text.split("\n");
    let bulletStarted = false;
    const preambleLines: string[] = [];
    const bulletLines: string[] = [];
    for (const line of lines) {
      if (line.trimStart().startsWith("●")) bulletStarted = true;
      if (bulletStarted) {
        if (line.trim()) bulletLines.push(line);
      } else {
        preambleLines.push(line);
      }
    }
    const preamble = preambleLines.join(" ").trim();
    return (
      <View>
        <Text style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3 }}>
          {code}. {preamble}
        </Text>
        {bulletLines.map((line, i) => {
          const content = line.trimStart().startsWith("●")
            ? line.trimStart().slice(1).trim()
            : line.trim();
          return <BulletLine key={i} content={content} />;
        })}
      </View>
    );
  }

  // Simple: bold code + description, italic after "np."
  const np = splitAtNp(text);
  if (np) {
    return (
      <Text style={{ fontSize: 9, lineHeight: 1.3 }}>
        <Text style={{ fontWeight: 700 }}>{code}. {np[0]} </Text>
        <Text style={{ fontStyle: "italic" }}>{np[1]}</Text>
      </Text>
    );
  }
  return (
    <Text style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3 }}>
      {code}. {text}
    </Text>
  );
}

// Renders description body (without code prefix)
function DescriptionBody({ description }: { description: string }) {
  const lines = description.split("\n");
  let bulletStarted = false;
  const preambleLines: string[] = [];
  const bulletLines: string[] = [];
  for (const line of lines) {
    if (line.trimStart().startsWith("●")) bulletStarted = true;
    if (bulletStarted) {
      if (line.trim()) bulletLines.push(line);
    } else {
      preambleLines.push(line);
    }
  }

  if (bulletLines.length > 0) {
    const preamble = preambleLines.join(" ").trim();
    return (
      <View>
        {preamble ? (
          <Text style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3 }}>
            {preamble}
          </Text>
        ) : null}
        {bulletLines.map((line, i) => {
          const content = line.trimStart().startsWith("●")
            ? line.trimStart().slice(1).trim()
            : line.trim();
          return <BulletLine key={i} content={content} />;
        })}
      </View>
    );
  }

  // No bullets — bold main text + italic "np." part
  const text = description.trim();
  const np = splitAtNp(text);
  if (np) {
    return (
      <Text style={{ fontSize: 9, lineHeight: 1.3 }}>
        <Text style={{ fontWeight: 700 }}>{np[0]} </Text>
        <Text style={{ fontStyle: "italic" }}>{np[1]}</Text>
      </Text>
    );
  }
  return (
    <Text style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.3 }}>
      {text}
    </Text>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — Dane o kandydacie + Przebieg służby + Sukcesy/Porażki + Info o próbie
// ═══════════════════════════════════════════════════════════════════════════════

function PageOne({ data }: { data: InstructorApplicationDetail }) {
  const p = data.candidateProfile;
  const fullName = [p.firstName, p.surname].filter(Boolean).join(" ");
  const supervisorName = [data.supervisorFirstName, data.supervisorSurname]
    .filter(Boolean)
    .join(" ");
  const degreeCode = data.template.degreeCode;

  const supervisorFn = data.supervisorInstructorFunction ?? "";
  const fnIsPreset = ["drużynowy", "opiekun drużyny"].includes(
    supervisorFn.toLowerCase(),
  );

  // DOCX Table 1 (Dane kandydata): 11 cols with merges
  // Simplified to paired label-value cells matching DOCX proportions
  // Total DOCX width: 10780 twips. Key split points:
  //   Row 1-4: ~55% left, ~45% right (matching col spans)
  //   Row 5: 4 cells ~27.5% + 27.5% + 22.5% + 22.5%
  //   Row 6: 3 cells ~27.5% + 27.5% + 45%

  // DOCX Table 2 (Przebieg): 3 cols: 3516+3316+3948 = 10780
  //   → 32.6% + 30.8% + 36.6%
  const przebiegW = { c1: "32.6%", c2: "30.8%", c3: "36.6%" };

  // DOCX Table 3 (Sukcesy): 2 cols: 5216+5564 = 10780
  //   → 48.4% + 51.6%
  const sukcesyW = { c1: "48.4%", c2: "51.6%" };

  // DOCX Table 4 (Info o próbie): 4 cols: 2551+1559+3402+3268 = 10780
  //   → 23.7% + 14.5% + 31.5% + 30.3%
  const infoW = { c1: "23.7%", c2: "14.5%", c3: "31.5%", c4: "30.3%" };

  return (
    <Page size="A4" style={s.page} wrap>
      {/* ── Header ── */}
      <View style={s.headerRow} fixed>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={s.headerLogo} src={ZHR_LOGO} />
        <View style={s.headerTextBlock}>
          <Text style={s.headerOrg}>ZWIĄZEK HARCERSTWA RZECZYPOSPOLITEJ</Text>
          <Text style={s.headerCommission}>
            Komisja Instruktorska Chorągwi Harcerzy Ziemi Opolskiej
          </Text>
        </View>
      </View>
      <Text style={s.headerTitle}>
        Karta próby na stopień {DEGREE_LABEL[degreeCode] ?? degreeCode}
      </Text>

      {/* ── Dane o kandydacie ── */}
      <View wrap={false}>
      <Text style={s.sectionHeading}>Dane o kandydacie</Text>
      <View style={s.table}>
        {/* Row 1: Imię i nazwisko | Data urodzenia */}
        <View style={s.row}>
          <GrayLabel label="Imię i nazwisko" width="13.1%" />
          <ValueCell value={fullName} width="40.8%" />
          <GrayLabel label="Data urodzenia" width="14.5%" />
          <ValueCell value={fmt(p.birthDate)} width="31.6%" />
        </View>
        {/* Row 2: Adres e-mail | Nr telefonu */}
        <View style={s.row}>
          <GrayLabel label="Adres e-mail" width="13.1%" />
          <ValueCell value={p.email ?? ""} width="40.8%" />
          <GrayLabel label="Nr telefonu" width="14.5%" />
          <ValueCell value={p.phone ?? ""} width="31.6%" />
        </View>
        {/* Row 3: Drużyna | Pełniona funkcja */}
        <View style={s.row}>
          <GrayLabel label="Drużyna" width="7.9%" />
          <ValueCell value={p.druzynaName ?? p.druzynaCode ?? ""} width="46.0%" />
          <GrayLabel label="Pełniona funkcja" width="14.5%" />
          <ValueCell value={data.teamFunction ?? ""} width="31.6%" />
        </View>
        {/* Row 4: Hufiec | Pełniona funkcja */}
        <View style={s.row}>
          <GrayLabel label="Hufiec" width="7.9%" />
          <ValueCell value={p.hufiecName ?? p.hufiecCode ?? ""} width="46.0%" />
          <GrayLabel label="Pełniona funkcja" width="14.5%" />
          <ValueCell value={data.hufiecFunction ?? ""} width="31.6%" />
        </View>
        {/* Row 5: Stopień harcerski | Data przyznania | Otwarta próba | Termin */}
        <View style={s.row}>
          <GrayLabel label="Stopień harcerski" width="14.5%" />
          <ValueCell
            value={
              p.scoutRank ? (SCOUT_RANK[p.scoutRank] ?? p.scoutRank) : ""
            }
            width="14.5%"
          />
          <GrayLabel label="Data przyznania" width="10.5%" />
          <ValueCell value={fmt(p.scoutRankAwardedAt)} width="14.5%" />
          <GrayLabel label="Otwarta próba na" width="9.2%" />
          <ValueCell
            value={
              data.openTrialForRank
                ? (SCOUT_RANK[data.openTrialForRank] ?? data.openTrialForRank)
                : ""
            }
            width="14.5%"
          />
          <GrayLabel label="Termin ukończenia" width="10.5%" />
          <ValueCell value={fmt(data.openTrialDeadline)} width="11.9%" />
        </View>
        {/* Row 6: W harcerstwie od | W ZHR od | Data złożenia przyrzeczenia */}
        <View style={s.row}>
          <GrayLabel label="W harcerstwie od" width="14.5%" />
          <ValueCell value={fmt(p.inScoutingSince)} width="14.5%" />
          <GrayLabel label="W ZHR od" width="10.5%" />
          <ValueCell value={fmt(p.inZhrSince)} width="14.5%" />
          <GrayLabel label="Data złożenia przyrzeczenia" width="23.7%" />
          <ValueCell value={fmt(p.oathDate)} width="22.4%" />
        </View>
      </View>
      </View>

      {/* ── Przebieg dotychczasowej służby ── */}
      <View wrap={false}>
      <Text style={s.sectionHeading}>Przebieg dotychczasowej służby</Text>
      <View style={s.table}>
        <View style={s.row}>
          <View
            style={{
              ...s.cell,
              width: przebiegW.c1,
              backgroundColor: GRAY,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9, textAlign: "center" }}>
              Pełnione funkcje, oraz okres ich pełnienia
            </Text>
          </View>
          <View
            style={{
              ...s.cell,
              width: przebiegW.c2,
              backgroundColor: GRAY,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9, textAlign: "center" }}>
              Odbyte kursy instruktorskie, harcerskie
            </Text>
          </View>
          <View
            style={{
              ...s.cell,
              width: przebiegW.c3,
              backgroundColor: GRAY,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9 }}>
              Obozy harcerskie, pełnione na nich funkcje
            </Text>
          </View>
        </View>
        <View style={{ ...s.row, minHeight: 80 }}>
          <View style={{ ...s.cell, width: przebiegW.c1 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.functionsHistory || ""}
            </Text>
          </View>
          <View style={{ ...s.cell, width: przebiegW.c2 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.coursesHistory || ""}
            </Text>
          </View>
          <View style={{ ...s.cell, width: przebiegW.c3 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.campsHistory || ""}
            </Text>
          </View>
        </View>
      </View>
      </View>

      {/* ── Sukcesy i porażki ── */}
      <View wrap={false}>
      <Text style={s.sectionHeading}>
        Sukcesy i porażki w pracy harcerskiej
      </Text>
      <View style={s.table}>
        <View style={s.row}>
          <View
            style={{
              ...s.cell,
              width: sukcesyW.c1,
              backgroundColor: GRAY,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9, textAlign: "center" }}>Sukcesy</Text>
          </View>
          <View
            style={{
              ...s.cell,
              width: sukcesyW.c2,
              backgroundColor: GRAY,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9, textAlign: "center" }}>Porażki</Text>
          </View>
        </View>
        <View style={{ ...s.row, minHeight: 70 }}>
          <View style={{ ...s.cell, width: sukcesyW.c1 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.successes || ""}
            </Text>
          </View>
          <View style={{ ...s.cell, width: sukcesyW.c2 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.failures || ""}
            </Text>
          </View>
        </View>
      </View>
      </View>

      {/* ── Informacje o próbie ── */}
      <View wrap={false}>
      <Text style={s.sectionHeading}>Informacje o próbie</Text>
      <View style={s.table}>
        {/* Proponowany opiekun próby — 1 scalona komórka na 3 pod-wiersze */}
        <View style={s.row}>
          {/* Lewa: jedna duża komórka na całą wysokość */}
          <View
            style={{
              ...s.cell,
              width: infoW.c1,
              backgroundColor: GRAY,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9 }}>Proponowany opiekun próby</Text>
          </View>
          {/* Prawa: 3 pod-wiersze */}
          <View
            style={{
              width: `${parseFloat(infoW.c2) + parseFloat(infoW.c3) + parseFloat(infoW.c4)}%`,
            }}
          >
            {/* Sub-row 1: Imię i nazwisko */}
            <View style={s.row}>
              <View
                style={{
                  ...s.cell,
                  width: "19.0%",
                  backgroundColor: "#f2f2f2",
                }}
              >
                <Text style={s.cellLabel}>Imię i nazwisko</Text>
              </View>
              <View style={{ ...s.cell, width: "81.0%" }}>
                <Text style={s.cellValue}>{supervisorName}</Text>
              </View>
            </View>
            {/* Sub-row 2: Stopień instruktorski */}
            <View style={s.row}>
              <View
                style={{
                  ...s.cell,
                  width: "19.0%",
                  backgroundColor: "#f2f2f2",
                }}
              >
                <Text style={s.cellLabel}>Stopień instruktorski</Text>
              </View>
              <View
                style={{
                  ...s.cell,
                  width: "81.0%",
                  paddingVertical: 3,
                }}
              >
                {/* Row 1: Przewodnik + Podharcmistrz */}
                <View style={{ flexDirection: "row", marginBottom: 2 }}>
                  <Cb
                    checked={data.supervisorInstructorRank === "PRZEWODNIK"}
                    label="Przewodnik"
                  />
                  <View style={{ width: 40 }} />
                  <Cb
                    checked={data.supervisorInstructorRank === "PODHARCMISTRZ"}
                    label="Podharcmistrz"
                  />
                </View>
                {/* Row 2: Otwarta próba + Harcmistrz */}
                <View style={{ flexDirection: "row" }}>
                  <Cb
                    checked={
                      data.supervisorInstructorRank ===
                      "PODHARCMISTRZ_OTWARTA_PROBA"
                    }
                    label="Otwarta próba podharcmistrzowska"
                  />
                  <View style={{ width: 40 }} />
                  <Cb
                    checked={data.supervisorInstructorRank === "HARCMISTRZ"}
                    label="Harcmistrz"
                  />
                </View>
              </View>
            </View>
            {/* Sub-row 3: Pełniona funkcja */}
            <View style={s.row}>
              <View
                style={{
                  ...s.cell,
                  width: "19.0%",
                  backgroundColor: "#f2f2f2",
                }}
              >
                <Text style={s.cellLabel}>Pełniona funkcja</Text>
              </View>
              <View
                style={{
                  ...s.cell,
                  width: "81.0%",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Cb
                  checked={supervisorFn.toLowerCase() === "drużynowy"}
                  label="Drużynowy"
                />
                <Cb
                  checked={supervisorFn.toLowerCase() === "opiekun drużyny"}
                  label="Opiekun drużyny"
                />
                <Cb
                  checked={!!supervisorFn && !fnIsPreset}
                  label={`Inna: ${!fnIsPreset && supervisorFn ? supervisorFn : ""}`}
                />
              </View>
            </View>
          </View>
        </View>
        {/* Obecność hufcowego */}
        <View style={s.row}>
          <View
            style={{
              ...s.cell,
              width: infoW.c1,
              backgroundColor: GRAY,
            }}
          >
            <Text style={{ fontSize: 9 }}>
              Obecność hufcowego przy otwarciu
            </Text>
          </View>
          <View
            style={{
              ...s.cell,
              width: `${parseFloat(infoW.c2) + parseFloat(infoW.c3) + parseFloat(infoW.c4)}%`,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Cb
              checked={data.hufcowyPresence === "IN_PERSON"}
              label="Obecność osobista"
            />
            <Cb
              checked={data.hufcowyPresence === "REMOTE"}
              label="Obecność zdalna"
            />
            <Cb
              checked={data.hufcowyPresence === "ATTACHMENT_OPINION"}
              label="Opinia w załączniku"
            />
          </View>
        </View>
        {/* Planowany termin */}
        <View style={s.row}>
          <View
            style={{
              ...s.cell,
              width: infoW.c1,
              backgroundColor: GRAY,
            }}
          >
            <Text style={{ fontSize: 9 }}>
              Planowany termin ukończenia próby
            </Text>
          </View>
          <View
            style={{
              ...s.cell,
              width: `${parseFloat(infoW.c2) + parseFloat(infoW.c3) + parseFloat(infoW.c4)}%`,
            }}
          >
            <Text style={s.cellValue}>{fmt(data.plannedFinishAt)}</Text>
          </View>
        </View>
      </View>
      </View>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES 2-3 — Proponowane zadania (requirements table)
// ═══════════════════════════════════════════════════════════════════════════════

function RequirementsPages({ data }: { data: InstructorApplicationDetail }) {
  const requirements = data.requirements;
  const groupDefs = data.template.groupDefinitions ?? [];

  // Map children by parentId
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

  // Build flat rows: merge group definitions + requirement items, sorted by sortOrder
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

  // DOCX Table 5 column widths (twips → proportions):
  // Col 0+1 (Wymaganie): 317+2944 = 3261 → 30.5%
  // Col 2 (wykonałem): 1062 → 10.0%
  // Col 3+4 (wykonam): 134+930 = 1064 → 10.0%
  // Col 5 (Działanie): 2543 → 23.8%
  // Col 6 (Weryfikacja): 2748 → 25.7%
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
        {/* ── Table header ── */}
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

        {/* ── Data rows ── */}
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

          // Codes containing a letter (1A, 1G, 4B, A…) → narrow letter column + body
          // Pure numeric codes (2, 3, 5…) → full-width inline Text block
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
                  {/* Narrow letter column — show only letter part (strips leading digits) */}
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
                  {/* Description body */}
                  <View
                    style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 3 }}
                  >
                    <DescriptionBody description={row.description} />
                  </View>
                </View>
              ) : (
                // Numeric code: single inline Text block (avoids Text+View stacking)
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

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — Potwierdzenia + Decyzja komisji
// ═══════════════════════════════════════════════════════════════════════════════

function PageSignatures({ degreeCode }: { degreeCode: string }) {
  const degreeName = DEGREE_LABEL_GENITIVE[degreeCode] ?? degreeCode;

  return (
    <Page size="A4" style={s.page}>
      {/* ── Potwierdzenie kandydata ── */}
      <View style={s.sigBlock}>
        <Text style={s.sigHeading}>Potwierdzenie kandydata</Text>
        <Text style={s.sigText}>
          Wnioskuję o otwarcie mi próby na stopień {degreeName} w powyższym
          kształcie.
        </Text>
        {/* DOCX Table 6: 3 cols 196+137+205pt → signature line */}
        <View style={s.sigLine}>
          <View style={{ width: "36.4%" }}>
            <View style={s.sigUnderline}>
              <Text style={s.sigLabelLeft}>miejscowość, data</Text>
            </View>
          </View>
          <View style={s.sigSpacer} />
          <View style={{ width: "38.1%" }}>
            <View style={s.sigUnderline}>
              <Text style={s.sigLabelRight}>podpis kandydata</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.sigSeparator} />

      {/* ── Potwierdzenie opiekuna ── */}
      <View style={s.sigBlock}>
        <Text style={s.sigSubHeading}>Potwierdzenie opiekuna próby</Text>
        <Text style={s.sigText}>
          Potwierdzam, że przed otwarciem próby kandydat posiadł umiejętności i
          zrealizował zadania oznaczone jako {"\u201E"}zrealizowałem{"\u201D"}.
          Proponuję powyższe zadania do zrealizowania przez kandydata w trakcie
          trwania próby.
        </Text>
        {/* DOCX Table 7: same as Table 6 */}
        <View style={s.sigLine}>
          <View style={{ width: "36.4%" }}>
            <View style={s.sigUnderline}>
              <Text style={s.sigLabelLeft}>miejscowość, data</Text>
            </View>
          </View>
          <View style={s.sigSpacer} />
          <View style={{ width: "38.1%" }}>
            <View style={s.sigUnderline}>
              <Text style={s.sigLabelRight}>podpis opiekuna próby</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.sigSeparator} />

      {/* ── Uwagi komisji ── */}
      <View style={s.sigBlock}>
        <Text style={s.sigSubHeading}>Uwagi komisji dotyczące zadań</Text>
        <View style={{ height: 60 }} />
      </View>

      {/* ── Decyzja komisji ── */}
      <View style={s.sigBlock}>
        <Text style={s.sigSubHeading}>Decyzja komisji</Text>
        <Text style={{ fontSize: 9 }}>
          Komisja wnioskuje o otwarcie / odrzuca otwarcie próby na stopień{" "}
          {degreeName}.
        </Text>
        <Text style={s.commissionLine}>Przewodniczący:</Text>
        <Text style={s.commissionLine}>Sekretarz:</Text>
        <Text style={s.commissionLine}>Członek:</Text>
        <Text style={s.commissionLine}>Członek:</Text>
        <Text style={s.commissionLine}>Członek:</Text>
        <Text style={s.commissionLine}>Członek:</Text>
        <Text style={s.commissionLine}>Członek:</Text>
        <Text style={s.commissionLine}>Członek:</Text>
      </View>

      <PageFooter />
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════

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
