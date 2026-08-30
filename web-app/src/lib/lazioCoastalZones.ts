export type LazioCoastalProvinceCode = "VT" | "RM" | "LT";

export type LazioCoastalZone = {
  provinceCode: LazioCoastalProvinceCode;
  municipality: string;
  value: string;
  label: string;
};

export const LAZIO_COASTAL_PROVINCES: ReadonlyArray<{ code: LazioCoastalProvinceCode; name: string }> = [
  { code: "VT", name: "Viterbo" },
  { code: "RM", name: "Roma" },
  { code: "LT", name: "Latina" },
];

export const LAZIO_COASTAL_ZONES: ReadonlyArray<LazioCoastalZone> = [
  { provinceCode: "VT", municipality: "Montalto di Castro", value: "Pescia Romana", label: "Pescia Romana · Montalto di Castro" },
  { provinceCode: "VT", municipality: "Montalto di Castro", value: "Marina di Montalto", label: "Marina di Montalto · Montalto di Castro" },
  { provinceCode: "VT", municipality: "Tarquinia", value: "Lido di Tarquinia / Saline", label: "Lido di Tarquinia / Saline · Tarquinia" },
  { provinceCode: "RM", municipality: "Civitavecchia", value: "Civitavecchia", label: "Civitavecchia" },
  { provinceCode: "RM", municipality: "Santa Marinella", value: "Santa Marinella", label: "Santa Marinella" },
  { provinceCode: "RM", municipality: "Santa Marinella", value: "Santa Severa", label: "Santa Severa · Santa Marinella" },
  { provinceCode: "RM", municipality: "Cerveteri", value: "Campo di Mare / Marina di Cerveteri", label: "Campo di Mare / Marina di Cerveteri · Cerveteri" },
  { provinceCode: "RM", municipality: "Ladispoli", value: "Ladispoli", label: "Ladispoli" },
  { provinceCode: "RM", municipality: "Fiumicino", value: "Passoscuro", label: "Passoscuro · Fiumicino" },
  { provinceCode: "RM", municipality: "Fiumicino", value: "Fregene / Maccarese", label: "Fregene / Maccarese · Fiumicino" },
  { provinceCode: "RM", municipality: "Fiumicino", value: "Focene / Isola Sacra", label: "Focene / Isola Sacra · Fiumicino" },
  { provinceCode: "RM", municipality: "Roma", value: "Ostia", label: "Ostia · Roma" },
  { provinceCode: "RM", municipality: "Roma", value: "Castel Fusano / Capocotta", label: "Castel Fusano / Capocotta · Roma" },
  { provinceCode: "RM", municipality: "Pomezia", value: "Torvaianica", label: "Torvaianica · Pomezia" },
  { provinceCode: "RM", municipality: "Ardea", value: "Marina di Ardea / Tor San Lorenzo", label: "Marina di Ardea / Tor San Lorenzo · Ardea" },
  { provinceCode: "RM", municipality: "Anzio", value: "Anzio / Lavinio", label: "Anzio / Lavinio" },
  { provinceCode: "RM", municipality: "Nettuno", value: "Nettuno", label: "Nettuno" },
  { provinceCode: "LT", municipality: "Latina", value: "Foce Verde / Capoportiere", label: "Foce Verde / Capoportiere · Latina" },
  { provinceCode: "LT", municipality: "Latina", value: "Rio Martino", label: "Rio Martino · Latina" },
  { provinceCode: "LT", municipality: "Sabaudia", value: "Sabaudia", label: "Sabaudia" },
  { provinceCode: "LT", municipality: "San Felice Circeo", value: "San Felice Circeo", label: "San Felice Circeo" },
  { provinceCode: "LT", municipality: "Terracina", value: "Terracina", label: "Terracina" },
  { provinceCode: "LT", municipality: "Fondi", value: "Lido di Fondi", label: "Lido di Fondi · Fondi" },
  { provinceCode: "LT", municipality: "Sperlonga", value: "Sperlonga", label: "Sperlonga" },
  { provinceCode: "LT", municipality: "Itri", value: "Itri / Litorale Flacca", label: "Itri / Litorale Flacca" },
  { provinceCode: "LT", municipality: "Gaeta", value: "Gaeta", label: "Gaeta" },
  { provinceCode: "LT", municipality: "Formia", value: "Formia", label: "Formia" },
  { provinceCode: "LT", municipality: "Minturno", value: "Scauri / Marina di Minturno", label: "Scauri / Marina di Minturno · Minturno" },
  { provinceCode: "LT", municipality: "Ponza", value: "Ponza", label: "Ponza" },
  { provinceCode: "LT", municipality: "Ventotene", value: "Ventotene", label: "Ventotene" },
];

export function coastalZonesForProvince(provinceCode: string): ReadonlyArray<LazioCoastalZone> {
  return LAZIO_COASTAL_ZONES.filter((zone) => zone.provinceCode === provinceCode);
}

export function isLazioCoastalProvince(provinceCode: string): provinceCode is LazioCoastalProvinceCode {
  return LAZIO_COASTAL_PROVINCES.some((province) => province.code === provinceCode);
}
