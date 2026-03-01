// @file: apps/web/src/components/instructor-application/pdf/components/PageSignatures.tsx
import { Page, Text, View } from "@react-pdf/renderer";
import { DEGREE_LABEL_GENITIVE, PageFooter, s } from "../helpers";

export function PageSignatures({ degreeCode }: { degreeCode: string }) {
  const degreeName = DEGREE_LABEL_GENITIVE[degreeCode] ?? degreeCode;

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sigBlock}>
        <Text style={s.sigHeading}>Potwierdzenie kandydata</Text>
        <Text style={s.sigText}>
          Wnioskuję o otwarcie mi próby na stopień {degreeName} w powyższym
          kształcie.
        </Text>
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

      <View style={s.sigBlock}>
        <Text style={s.sigSubHeading}>Potwierdzenie opiekuna próby</Text>
        <Text style={s.sigText}>
          Potwierdzam, że przed otwarciem próby kandydat posiadł umiejętności i
          zrealizował zadania oznaczone jako {"\u201E"}zrealizowałem{"\u201D"}.
          Proponuję powyższe zadania do zrealizowania przez kandydata w trakcie
          trwania próby.
        </Text>
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

      <View style={s.sigBlock}>
        <Text style={s.sigSubHeading}>Uwagi komisji dotyczące zadań</Text>
        <View style={{ height: 60 }} />
      </View>

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
