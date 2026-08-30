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
  { provinceCode: "VT", municipality: "Tarquinia", value: "Lido di Tarquinia", label: "Lido di Tarquinia · Tarquinia" },
  { provinceCode: "VT", municipality: "Tarquinia", value: "Saline di Tarquinia", label: "Saline di Tarquinia · Tarquinia" },
  { provinceCode: "VT", municipality: "Tarquinia", value: "Riva dei Tarquini", label: "Riva dei Tarquini · Tarquinia" },

  { provinceCode: "RM", municipality: "Civitavecchia", value: "Civitavecchia", label: "Civitavecchia" },
  { provinceCode: "RM", municipality: "Civitavecchia", value: "La Frasca", label: "La Frasca · Civitavecchia" },
  { provinceCode: "RM", municipality: "Santa Marinella", value: "Santa Marinella", label: "Santa Marinella" },
  { provinceCode: "RM", municipality: "Santa Marinella", value: "Santa Severa", label: "Santa Severa · Santa Marinella" },
  { provinceCode: "RM", municipality: "Cerveteri", value: "Campo di Mare", label: "Campo di Mare · Cerveteri" },
  { provinceCode: "RM", municipality: "Cerveteri", value: "Cerenova", label: "Cerenova · Cerveteri" },
  { provinceCode: "RM", municipality: "Ladispoli", value: "Ladispoli", label: "Ladispoli" },
  { provinceCode: "RM", municipality: "Ladispoli", value: "Marina di San Nicola", label: "Marina di San Nicola · Ladispoli" },
  { provinceCode: "RM", municipality: "Fiumicino", value: "Passoscuro", label: "Passoscuro · Fiumicino" },
  { provinceCode: "RM", municipality: "Fiumicino", value: "Maccarese", label: "Maccarese · Fiumicino" },
  { provinceCode: "RM", municipality: "Fiumicino", value: "Fregene", label: "Fregene · Fiumicino" },
  { provinceCode: "RM", municipality: "Fiumicino", value: "Focene", label: "Focene · Fiumicino" },
  { provinceCode: "RM", municipality: "Fiumicino", value: "Isola Sacra", label: "Isola Sacra · Fiumicino" },
  { provinceCode: "RM", municipality: "Fiumicino", value: "Fiumicino", label: "Fiumicino" },
  { provinceCode: "RM", municipality: "Roma", value: "Ostia", label: "Ostia · Roma" },
  { provinceCode: "RM", municipality: "Roma", value: "Castel Fusano", label: "Castel Fusano · Roma" },
  { provinceCode: "RM", municipality: "Roma", value: "Castel Porziano", label: "Castel Porziano · Roma" },
  { provinceCode: "RM", municipality: "Roma", value: "Capocotta", label: "Capocotta · Roma" },
  { provinceCode: "RM", municipality: "Pomezia", value: "Torvaianica", label: "Torvaianica · Pomezia" },
  { provinceCode: "RM", municipality: "Pomezia", value: "Campo Ascolano", label: "Campo Ascolano · Pomezia" },
  { provinceCode: "RM", municipality: "Ardea", value: "Marina di Ardea", label: "Marina di Ardea · Ardea" },
  { provinceCode: "RM", municipality: "Ardea", value: "Tor San Lorenzo", label: "Tor San Lorenzo · Ardea" },
  { provinceCode: "RM", municipality: "Ardea", value: "Lido dei Pini", label: "Lido dei Pini · Ardea" },
  { provinceCode: "RM", municipality: "Anzio", value: "Anzio", label: "Anzio" },
  { provinceCode: "RM", municipality: "Anzio", value: "Lavinio", label: "Lavinio · Anzio" },
  { provinceCode: "RM", municipality: "Anzio", value: "Lido delle Sirene", label: "Lido delle Sirene · Anzio" },
  { provinceCode: "RM", municipality: "Anzio", value: "Cincinnato", label: "Cincinnato · Anzio" },
  { provinceCode: "RM", municipality: "Nettuno", value: "Nettuno", label: "Nettuno" },
  { provinceCode: "RM", municipality: "Nettuno", value: "Torre Astura", label: "Torre Astura · Nettuno" },

  { provinceCode: "LT", municipality: "Latina", value: "Borgo Sabotino", label: "Borgo Sabotino · Latina" },
  { provinceCode: "LT", municipality: "Latina", value: "Foce Verde", label: "Foce Verde · Latina" },
  { provinceCode: "LT", municipality: "Latina", value: "Capoportiere", label: "Capoportiere · Latina" },
  { provinceCode: "LT", municipality: "Latina", value: "Rio Martino", label: "Rio Martino · Latina" },
  { provinceCode: "LT", municipality: "Sabaudia", value: "Sabaudia", label: "Sabaudia" },
  { provinceCode: "LT", municipality: "Sabaudia", value: "Torre Paola", label: "Torre Paola · Sabaudia" },
  { provinceCode: "LT", municipality: "Sabaudia", value: "Bella Farnia", label: "Bella Farnia · Sabaudia" },
  { provinceCode: "LT", municipality: "San Felice Circeo", value: "San Felice Circeo", label: "San Felice Circeo" },
  { provinceCode: "LT", municipality: "Terracina", value: "Terracina", label: "Terracina" },
  { provinceCode: "LT", municipality: "Terracina", value: "Borgo Hermada", label: "Borgo Hermada · Terracina" },
  { provinceCode: "LT", municipality: "Fondi", value: "Lido di Fondi", label: "Lido di Fondi · Fondi" },
  { provinceCode: "LT", municipality: "Fondi", value: "Salto di Fondi", label: "Salto di Fondi · Fondi" },
  { provinceCode: "LT", municipality: "Sperlonga", value: "Sperlonga", label: "Sperlonga" },
  { provinceCode: "LT", municipality: "Itri", value: "Litorale Flacca", label: "Litorale Flacca · Itri" },
  { provinceCode: "LT", municipality: "Gaeta", value: "Gaeta", label: "Gaeta" },
  { provinceCode: "LT", municipality: "Gaeta", value: "Serapo", label: "Serapo · Gaeta" },
  { provinceCode: "LT", municipality: "Gaeta", value: "Sant’Agostino", label: "Sant’Agostino · Gaeta" },
  { provinceCode: "LT", municipality: "Formia", value: "Formia", label: "Formia" },
  { provinceCode: "LT", municipality: "Formia", value: "Vindicio", label: "Vindicio · Formia" },
  { provinceCode: "LT", municipality: "Formia", value: "Gianola", label: "Gianola · Formia" },
  { provinceCode: "LT", municipality: "Minturno", value: "Scauri", label: "Scauri · Minturno" },
  { provinceCode: "LT", municipality: "Minturno", value: "Marina di Minturno", label: "Marina di Minturno · Minturno" },
  { provinceCode: "LT", municipality: "Ponza", value: "Ponza", label: "Ponza" },
  { provinceCode: "LT", municipality: "Ponza", value: "Le Forna", label: "Le Forna · Ponza" },
  { provinceCode: "LT", municipality: "Ventotene", value: "Ventotene", label: "Ventotene" },
];

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT")
    .trim();
}

export function coastalZonesForProvince(provinceCode: string): ReadonlyArray<LazioCoastalZone> {
  return LAZIO_COASTAL_ZONES.filter((zone) => zone.provinceCode === provinceCode);
}

export function findCoastalZone(value: string) {
  const target = normalized(value);
  return LAZIO_COASTAL_ZONES.find((zone) => normalized(zone.value) === target) ?? null;
}

export function searchCoastalZones(query: string, provinceCode = "", limit = 8) {
  const needle = normalized(query);
  const candidates = needle
    ? LAZIO_COASTAL_ZONES.filter((zone) => normalized([zone.value, zone.municipality, zone.label].join(" ")).includes(needle))
    : LAZIO_COASTAL_ZONES.filter((zone) => !provinceCode || zone.provinceCode === provinceCode);

  return candidates.slice(0, limit);
}

export function isLazioCoastalProvince(provinceCode: string): provinceCode is LazioCoastalProvinceCode {
  return LAZIO_COASTAL_PROVINCES.some((province) => province.code === provinceCode);
}
