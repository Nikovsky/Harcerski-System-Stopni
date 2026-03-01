// @file: apps/web/src/components/instructor-application/pdf/components/PageOneSections.tsx
/* eslint-disable jsx-a11y/alt-text */
import { Image, Text, View } from "@react-pdf/renderer";
import type { InstructorApplicationDetail } from "@hss/schemas";
import { ZHR_LOGO } from "../zhr-logo";
import { Cb, DEGREE_LABEL, GRAY, SCOUT_RANK, fmt, s, GrayLabel, ValueCell } from "../helpers";

const SERVICE_WIDTHS = { c1: "32.6%", c2: "30.8%", c3: "36.6%" };
const RESULTS_WIDTHS = { c1: "48.4%", c2: "51.6%" };
const TRIAL_INFO_WIDTHS = { c1: "23.7%", c2: "14.5%", c3: "31.5%", c4: "30.3%" };
const TRIAL_INFO_DETAILS_WIDTH = `${parseFloat(TRIAL_INFO_WIDTHS.c2) + parseFloat(TRIAL_INFO_WIDTHS.c3) + parseFloat(TRIAL_INFO_WIDTHS.c4)}%`;

export function PageOneHeader({ data }: { data: InstructorApplicationDetail }) {
  const degreeCode = data.template.degreeCode;

  return (
    <>
      <View style={s.headerRow} fixed>
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
    </>
  );
}

export function CandidateDataSection({ data }: { data: InstructorApplicationDetail }) {
  const profile = data.candidateProfile;
  const fullName = [profile.firstName, profile.surname].filter(Boolean).join(" ");

  return (
    <View wrap={false}>
      <Text style={s.sectionHeading}>Dane o kandydacie</Text>
      <View style={s.table}>
        <View style={s.row}>
          <GrayLabel label="Imię i nazwisko" width="13.1%" />
          <ValueCell value={fullName} width="40.8%" />
          <GrayLabel label="Data urodzenia" width="14.5%" />
          <ValueCell value={fmt(profile.birthDate)} width="31.6%" />
        </View>
        <View style={s.row}>
          <GrayLabel label="Adres e-mail" width="13.1%" />
          <ValueCell value={profile.email ?? ""} width="40.8%" />
          <GrayLabel label="Nr telefonu" width="14.5%" />
          <ValueCell value={profile.phone ?? ""} width="31.6%" />
        </View>
        <View style={s.row}>
          <GrayLabel label="Drużyna" width="7.9%" />
          <ValueCell value={profile.druzynaName ?? profile.druzynaCode ?? ""} width="46.0%" />
          <GrayLabel label="Pełniona funkcja" width="14.5%" />
          <ValueCell value={data.teamFunction ?? ""} width="31.6%" />
        </View>
        <View style={s.row}>
          <GrayLabel label="Hufiec" width="7.9%" />
          <ValueCell value={profile.hufiecName ?? profile.hufiecCode ?? ""} width="46.0%" />
          <GrayLabel label="Pełniona funkcja" width="14.5%" />
          <ValueCell value={data.hufiecFunction ?? ""} width="31.6%" />
        </View>
        <View style={s.row}>
          <GrayLabel label="Stopień harcerski" width="14.5%" />
          <ValueCell
            value={
              profile.scoutRank ? (SCOUT_RANK[profile.scoutRank] ?? profile.scoutRank) : ""
            }
            width="14.5%"
          />
          <GrayLabel label="Data przyznania" width="10.5%" />
          <ValueCell value={fmt(profile.scoutRankAwardedAt)} width="14.5%" />
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
        <View style={s.row}>
          <GrayLabel label="W harcerstwie od" width="14.5%" />
          <ValueCell value={fmt(profile.inScoutingSince)} width="14.5%" />
          <GrayLabel label="W ZHR od" width="10.5%" />
          <ValueCell value={fmt(profile.inZhrSince)} width="14.5%" />
          <GrayLabel label="Data złożenia przyrzeczenia" width="23.7%" />
          <ValueCell value={fmt(profile.oathDate)} width="22.4%" />
        </View>
      </View>
    </View>
  );
}

export function ServiceHistorySection({ data }: { data: InstructorApplicationDetail }) {
  return (
    <View wrap={false}>
      <Text style={s.sectionHeading}>Przebieg dotychczasowej służby</Text>
      <View style={s.table}>
        <View style={s.row}>
          <View
            style={{
              ...s.cell,
              width: SERVICE_WIDTHS.c1,
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
              width: SERVICE_WIDTHS.c2,
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
              width: SERVICE_WIDTHS.c3,
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
          <View style={{ ...s.cell, width: SERVICE_WIDTHS.c1 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.functionsHistory || ""}
            </Text>
          </View>
          <View style={{ ...s.cell, width: SERVICE_WIDTHS.c2 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.coursesHistory || ""}
            </Text>
          </View>
          <View style={{ ...s.cell, width: SERVICE_WIDTHS.c3 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.campsHistory || ""}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ResultsSection({ data }: { data: InstructorApplicationDetail }) {
  return (
    <View wrap={false}>
      <Text style={s.sectionHeading}>Sukcesy i porażki w pracy harcerskiej</Text>
      <View style={s.table}>
        <View style={s.row}>
          <View
            style={{
              ...s.cell,
              width: RESULTS_WIDTHS.c1,
              backgroundColor: GRAY,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9, textAlign: "center" }}>Sukcesy</Text>
          </View>
          <View
            style={{
              ...s.cell,
              width: RESULTS_WIDTHS.c2,
              backgroundColor: GRAY,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9, textAlign: "center" }}>Porażki</Text>
          </View>
        </View>
        <View style={{ ...s.row, minHeight: 70 }}>
          <View style={{ ...s.cell, width: RESULTS_WIDTHS.c1 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.successes || ""}
            </Text>
          </View>
          <View style={{ ...s.cell, width: RESULTS_WIDTHS.c2 }}>
            <Text style={{ fontSize: 8, lineHeight: 1.4 }}>
              {data.failures || ""}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function TrialInfoSection({ data }: { data: InstructorApplicationDetail }) {
  const supervisorName = [data.supervisorFirstName, data.supervisorSurname].filter(Boolean).join(" ");
  const supervisorFunction = data.supervisorInstructorFunction ?? "";
  const supervisorFunctionLower = supervisorFunction.toLowerCase();
  const functionIsPreset = ["drużynowy", "opiekun drużyny"].includes(supervisorFunctionLower);

  return (
    <View wrap={false}>
      <Text style={s.sectionHeading}>Informacje o próbie</Text>
      <View style={s.table}>
        <View style={s.row}>
          <View
            style={{
              ...s.cell,
              width: TRIAL_INFO_WIDTHS.c1,
              backgroundColor: GRAY,
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 9 }}>Proponowany opiekun próby</Text>
          </View>
          <View style={{ width: TRIAL_INFO_DETAILS_WIDTH }}>
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
                <View style={{ flexDirection: "row", marginBottom: 2 }}>
                  <Cb checked={data.supervisorInstructorRank === "PRZEWODNIK"} label="Przewodnik" />
                  <View style={{ width: 40 }} />
                  <Cb checked={data.supervisorInstructorRank === "PODHARCMISTRZ"} label="Podharcmistrz" />
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Cb
                    checked={data.supervisorInstructorRank === "PODHARCMISTRZ_OTWARTA_PROBA"}
                    label="Otwarta próba podharcmistrzowska"
                  />
                  <View style={{ width: 40 }} />
                  <Cb checked={data.supervisorInstructorRank === "HARCMISTRZ"} label="Harcmistrz" />
                </View>
              </View>
            </View>
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
                <Cb checked={supervisorFunctionLower === "drużynowy"} label="Drużynowy" />
                <Cb checked={supervisorFunctionLower === "opiekun drużyny"} label="Opiekun drużyny" />
                <Cb
                  checked={!!supervisorFunction && !functionIsPreset}
                  label={`Inna: ${!functionIsPreset && supervisorFunction ? supervisorFunction : ""}`}
                />
              </View>
            </View>
          </View>
        </View>
        <View style={s.row}>
          <View
            style={{
              ...s.cell,
              width: TRIAL_INFO_WIDTHS.c1,
              backgroundColor: GRAY,
            }}
          >
            <Text style={{ fontSize: 9 }}>Obecność hufcowego przy otwarciu</Text>
          </View>
          <View
            style={{
              ...s.cell,
              width: TRIAL_INFO_DETAILS_WIDTH,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Cb checked={data.hufcowyPresence === "IN_PERSON"} label="Obecność osobista" />
            <Cb checked={data.hufcowyPresence === "REMOTE"} label="Obecność zdalna" />
            <Cb checked={data.hufcowyPresence === "ATTACHMENT_OPINION"} label="Opinia w załączniku" />
          </View>
        </View>
        <View style={s.row}>
          <View
            style={{
              ...s.cell,
              width: TRIAL_INFO_WIDTHS.c1,
              backgroundColor: GRAY,
            }}
          >
            <Text style={{ fontSize: 9 }}>Planowany termin ukończenia próby</Text>
          </View>
          <View
            style={{
              ...s.cell,
              width: TRIAL_INFO_DETAILS_WIDTH,
            }}
          >
            <Text style={s.cellValue}>{fmt(data.plannedFinishAt)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}