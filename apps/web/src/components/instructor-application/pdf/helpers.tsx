// @file: apps/web/src/components/instructor-application/pdf/helpers.ts
import { Text, View } from "@react-pdf/renderer";
import { B, GRAY, s } from "./styles";

export function fmt(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("pl-PL");
  } catch {
    return value;
  }
}

export const DEGREE_LABEL: Record<string, string> = {
  PWD: "PRZEWODNIKA",
  PHM: "PODHARCMISTRZA",
  PRZEWODNIK: "PRZEWODNIKA",
  PODHARCMISTRZ: "PODHARCMISTRZA",
  PODHARCMISTRZ_OTWARTA_PROBA: "PODHARCMISTRZA",
};

export const DEGREE_LABEL_GENITIVE: Record<string, string> = {
  PWD: "przewodnika",
  PHM: "podharcmistrza",
  PRZEWODNIK: "przewodnika",
  PODHARCMISTRZ: "podharcmistrza",
  PODHARCMISTRZ_OTWARTA_PROBA: "podharcmistrza",
};

export const SCOUT_RANK: Record<string, string> = {
  HARCERZ_ORLI: "Harcerz Orli",
  HARCERZ_RZECZYPOSPOLITEJ: "HR",
};

export function Cb({ checked, label }: { checked: boolean; label: string }) {
  return (
    <View style={s.cbRow}>
      <View style={checked ? s.cbChecked : s.cbBox}>
        {checked && <Text style={s.cbMark}>X</Text>}
      </View>
      <Text style={s.cbLabel}>{label}</Text>
    </View>
  );
}

export function GrayLabel({ label, width }: { label: string; width: string }) {
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

export function ValueCell({ value, width }: { value?: string; width: string }) {
  return (
    <View style={{ ...s.cell, width, justifyContent: "center" }}>
      <Text style={s.cellValue}>{value ?? ""}</Text>
    </View>
  );
}

export function PageFooter() {
  return (
    <Text
      style={s.pageNum}
      render={({ pageNumber }) => `- ${pageNumber} -`}
      fixed
    />
  );
}

function splitAtNp(text: string): [string, string] | null {
  const idx = text.indexOf(" np.");
  if (idx === -1) return null;
  return [text.slice(0, idx), text.slice(idx + 1)];
}

export function letterPart(code: string): string {
  return code.replace(/^\d+/, "");
}

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

  return (
    <View style={{ flexDirection: "row", marginTop: 2 }}>
      <Text style={{ fontSize: 9, lineHeight: 1.3 }}>{"● "}</Text>
      <Text style={{ fontSize: 9, lineHeight: 1.3, flex: 1, fontStyle: "italic" }}>
        {content}
      </Text>
    </View>
  );
}

export function NumericReqCell({ code, description }: { code: string; description: string }) {
  const text = description.trim();
  const hasBullets = text.includes("●");

  if (hasBullets) {
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

export function DescriptionBody({ description }: { description: string }) {
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

export { B, GRAY, s };
