// @file: apps/web/src/components/instructor-application/pdf/styles.ts
import { Font, StyleSheet } from "@react-pdf/renderer";

Font.register({
  family: "Arial",
  fonts: [
    { src: "/fonts/Arial-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Arial-Bold.ttf", fontWeight: 700 },
    { src: "/fonts/Arial-Italic.ttf", fontWeight: 400, fontStyle: "italic" },
    { src: "/fonts/Arial-Bold-Italic.ttf", fontWeight: 700, fontStyle: "italic" },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

export const B = "#000";
export const GRAY = "#d9d9d9";

export const s = StyleSheet.create({
  page: {
    fontFamily: "Arial",
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 28,
    color: B,
  },
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
  headerOrg: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center" as const,
  },
  headerCommission: {
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center" as const,
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center" as const,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
  },
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
  reqHeaderRow: {
    flexDirection: "row" as const,
    backgroundColor: GRAY,
  },
  reqGroupRow: { flexDirection: "row" as const },
  reqItemRow: { flexDirection: "row" as const, minHeight: 20 },
  pageNum: {
    position: "absolute" as const,
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center" as const,
    fontSize: 9,
    color: B,
  },
  sigBlock: { marginTop: 14 },
  sigHeading: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  sigSubHeading: { fontSize: 14, fontWeight: 700, marginTop: 12, marginBottom: 4 },
  sigText: { fontSize: 10, marginBottom: 4, lineHeight: 1.4 },
  sigLine: {
    flexDirection: "row" as const,
    marginTop: 20,
  },
  sigLabelLeft: {
    width: "36.4%",
    fontSize: 9,
    textAlign: "center" as const,
  },
  sigSpacer: { width: "25.5%" },
  sigLabelRight: {
    width: "38.1%",
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
  commissionLine: { fontSize: 9, marginTop: 3, lineHeight: 1.5 },
});
