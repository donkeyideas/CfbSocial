// ============================================================
// Stadium coordinates (lat/lon)
// Keyed by ESPN team abbreviation (uppercase).
// Covers Power-4 + Notre Dame + major G5 programs.
// Used by the War Room weather badge — teams not in this map
// simply show no weather widget (graceful degrade).
// ============================================================

export interface StadiumCoord {
  lat: number;
  lon: number;
  stadium: string;
}

export const STADIUM_COORDS: Record<string, StadiumCoord> = {
  // SEC
  ALA:  { lat: 33.2083, lon: -87.5504, stadium: 'Bryant-Denny Stadium' },
  ARK:  { lat: 36.0679, lon: -94.1787, stadium: 'Donald W. Reynolds Razorback Stadium' },
  AUB:  { lat: 32.6024, lon: -85.4893, stadium: 'Jordan-Hare Stadium' },
  FLA:  { lat: 29.6500, lon: -82.3486, stadium: 'Ben Hill Griffin Stadium' },
  UGA:  { lat: 33.9497, lon: -83.3734, stadium: 'Sanford Stadium' },
  UK:   { lat: 38.0221, lon: -84.5050, stadium: 'Kroger Field' },
  LSU:  { lat: 30.4118, lon: -91.1839, stadium: 'Tiger Stadium' },
  MIZ:  { lat: 38.9360, lon: -92.3330, stadium: 'Faurot Field' },
  MISS: { lat: 34.3618, lon: -89.5365, stadium: 'Vaught-Hemingway Stadium' },
  MSST: { lat: 33.4559, lon: -88.7899, stadium: 'Davis Wade Stadium' },
  OU:   { lat: 35.2058, lon: -97.4425, stadium: 'Gaylord Family Oklahoma Memorial Stadium' },
  SC:   { lat: 34.0124, lon: -80.9858, stadium: 'Williams-Brice Stadium' },
  TAMU: { lat: 30.6100, lon: -96.3403, stadium: 'Kyle Field' },
  TENN: { lat: 35.9550, lon: -83.9250, stadium: 'Neyland Stadium' },
  TEX:  { lat: 30.2833, lon: -97.7325, stadium: 'Darrell K Royal-Texas Memorial Stadium' },
  VAN:  { lat: 36.1437, lon: -86.8094, stadium: 'FirstBank Stadium' },

  // Big Ten
  ILL:  { lat: 40.0992, lon: -88.2358, stadium: 'Memorial Stadium' },
  IND:  { lat: 39.1804, lon: -86.5258, stadium: 'Memorial Stadium' },
  IOWA: { lat: 41.6586, lon: -91.5514, stadium: 'Kinnick Stadium' },
  MD:   { lat: 38.9897, lon: -76.9472, stadium: 'SECU Stadium' },
  MICH: { lat: 42.2658, lon: -83.7487, stadium: 'Michigan Stadium' },
  MINN: { lat: 44.9764, lon: -93.2244, stadium: 'Huntington Bank Stadium' },
  MSU:  { lat: 42.7282, lon: -84.4843, stadium: 'Spartan Stadium' },
  NEB:  { lat: 40.8205, lon: -96.7056, stadium: 'Memorial Stadium' },
  NW:   { lat: 42.0648, lon: -87.6929, stadium: 'Ryan Field' },
  OSU:  { lat: 40.0017, lon: -83.0197, stadium: 'Ohio Stadium' },
  PSU:  { lat: 40.8122, lon: -77.8562, stadium: 'Beaver Stadium' },
  PUR:  { lat: 40.4350, lon: -86.9188, stadium: 'Ross-Ade Stadium' },
  RUTG: { lat: 40.5135, lon: -74.4642, stadium: 'SHI Stadium' },
  WIS:  { lat: 43.0697, lon: -89.4122, stadium: 'Camp Randall Stadium' },
  ORE:  { lat: 44.0586, lon: -123.0681, stadium: 'Autzen Stadium' },
  WASH: { lat: 47.6503, lon: -122.3016, stadium: 'Husky Stadium' },
  USC:  { lat: 34.0141, lon: -118.2879, stadium: 'Los Angeles Memorial Coliseum' },
  UCLA: { lat: 34.1614, lon: -118.1677, stadium: 'Rose Bowl' },

  // Big 12
  ARIZ: { lat: 32.2288, lon: -110.9483, stadium: 'Arizona Stadium' },
  ASU:  { lat: 33.4263, lon: -111.9326, stadium: 'Mountain America Stadium' },
  BAY:  { lat: 31.5583, lon: -97.1154, stadium: 'McLane Stadium' },
  BYU:  { lat: 40.2573, lon: -111.6548, stadium: 'LaVell Edwards Stadium' },
  CIN:  { lat: 39.1313, lon: -84.5158, stadium: 'Nippert Stadium' },
  COLO: { lat: 40.0094, lon: -105.2668, stadium: 'Folsom Field' },
  HOU:  { lat: 29.7216, lon: -95.3491, stadium: 'TDECU Stadium' },
  ISU:  { lat: 42.0141, lon: -93.6359, stadium: 'Jack Trice Stadium' },
  KU:   { lat: 38.9637, lon: -95.2448, stadium: 'David Booth Kansas Memorial Stadium' },
  KSU:  { lat: 39.2020, lon: -96.5942, stadium: 'Bill Snyder Family Stadium' },
  OKST: { lat: 36.1252, lon: -97.0663, stadium: 'Boone Pickens Stadium' },
  TCU:  { lat: 32.7096, lon: -97.3685, stadium: 'Amon G. Carter Stadium' },
  TTU:  { lat: 33.5910, lon: -101.8728, stadium: 'Jones AT&T Stadium' },
  UCF:  { lat: 28.6074, lon: -81.1920, stadium: 'FBC Mortgage Stadium' },
  UTAH: { lat: 40.7601, lon: -111.8483, stadium: 'Rice-Eccles Stadium' },
  WVU:  { lat: 39.6518, lon: -79.9541, stadium: 'Milan Puskar Stadium' },

  // ACC
  BC:   { lat: 42.3350, lon: -71.1666, stadium: 'Alumni Stadium' },
  CAL:  { lat: 37.8715, lon: -122.2506, stadium: 'California Memorial Stadium' },
  CLEM: { lat: 34.6786, lon: -82.8434, stadium: 'Memorial Stadium' },
  DUKE: { lat: 36.0011, lon: -78.9433, stadium: 'Wallace Wade Stadium' },
  FSU:  { lat: 30.4383, lon: -84.3046, stadium: 'Doak S. Campbell Stadium' },
  GT:   { lat: 33.7725, lon: -84.3925, stadium: 'Bobby Dodd Stadium' },
  LOU:  { lat: 38.2065, lon: -85.7591, stadium: 'L&N Federal Credit Union Stadium' },
  MIA:  { lat: 25.9580, lon: -80.2389, stadium: 'Hard Rock Stadium' },
  NCST: { lat: 35.8017, lon: -78.7211, stadium: 'Carter-Finley Stadium' },
  UNC:  { lat: 35.9075, lon: -79.0473, stadium: 'Kenan Memorial Stadium' },
  PITT: { lat: 40.4468, lon: -80.0158, stadium: 'Acrisure Stadium' },
  SMU:  { lat: 32.8387, lon: -96.7843, stadium: 'Gerald J. Ford Stadium' },
  STAN: { lat: 37.4349, lon: -122.1614, stadium: 'Stanford Stadium' },
  SYR:  { lat: 43.0363, lon: -76.1365, stadium: 'JMA Wireless Dome' },
  UVA:  { lat: 38.0317, lon: -78.5136, stadium: 'Scott Stadium' },
  VT:   { lat: 37.2203, lon: -80.4186, stadium: 'Lane Stadium' },
  WAKE: { lat: 36.1328, lon: -80.2580, stadium: 'Allegacy Federal Credit Union Stadium' },

  // Independent
  ND:   { lat: 41.6983, lon: -86.2335, stadium: 'Notre Dame Stadium' },

  // AAC / Sun Belt / MWC / CUSA / MAC notables
  APP:  { lat: 36.2119, lon: -81.6864, stadium: 'Kidd Brewer Stadium' },
  ARMY: { lat: 41.3800, lon: -73.9680, stadium: 'Michie Stadium' },
  BGSU: { lat: 41.3800, lon: -83.6333, stadium: 'Doyt L. Perry Stadium' },
  BOIS: { lat: 43.6028, lon: -116.1953, stadium: 'Albertsons Stadium' },
  BSU:  { lat: 40.2116, lon: -85.4091, stadium: 'Scheumann Stadium' },
  CCU:  { lat: 33.7938, lon: -79.0108, stadium: 'Brooks Stadium' },
  CHAR: { lat: 35.3081, lon: -80.7353, stadium: 'Jerry Richardson Stadium' },
  CONN: { lat: 41.7498, lon: -72.4551, stadium: 'Rentschler Field' },
  CMU:  { lat: 43.5893, lon: -84.7847, stadium: 'Kelly/Shorts Stadium' },
  ECU:  { lat: 35.5956, lon: -77.3658, stadium: 'Dowdy-Ficklen Stadium' },
  FAU:  { lat: 26.3778, lon: -80.1033, stadium: 'FAU Stadium' },
  FIU:  { lat: 25.7553, lon: -80.3781, stadium: 'Riccardo Silva Stadium' },
  FRES: { lat: 36.8163, lon: -119.7473, stadium: 'Valley Childrens Stadium' },
  GASO: { lat: 32.4239, lon: -81.7812, stadium: 'Allen E. Paulson Stadium' },
  GAST: { lat: 33.7355, lon: -84.3894, stadium: 'Center Parc Stadium' },
  HAW:  { lat: 21.3052, lon: -157.8467, stadium: 'Ching Athletics Complex' },
  JMU:  { lat: 38.4331, lon: -78.8686, stadium: 'Bridgeforth Stadium' },
  KENT: { lat: 41.1462, lon: -81.3488, stadium: 'Dix Stadium' },
  LIB:  { lat: 37.3559, lon: -79.1740, stadium: 'Williams Stadium' },
  LT:   { lat: 32.5322, lon: -92.6451, stadium: 'Joe Aillet Stadium' },
  MARS: { lat: 38.4104, lon: -82.4228, stadium: 'Joan C. Edwards Stadium' },
  MEM:  { lat: 35.1214, lon: -89.9703, stadium: 'Simmons Bank Liberty Stadium' },
  MTSU: { lat: 35.8479, lon: -86.3656, stadium: 'Floyd Stadium' },
  NAVY: { lat: 38.9859, lon: -76.5103, stadium: 'Navy-Marine Corps Memorial Stadium' },
  NEV:  { lat: 39.5446, lon: -119.8152, stadium: 'Mackay Stadium' },
  NIU:  { lat: 41.9361, lon: -88.7619, stadium: 'Brigham Field at Huskie Stadium' },
  NMSU: { lat: 32.2791, lon: -106.7450, stadium: 'Aggie Memorial Stadium' },
  NTEX: { lat: 33.2068, lon: -97.1569, stadium: 'DATCU Stadium' },
  OHIO: { lat: 39.3237, lon: -82.1035, stadium: 'Peden Stadium' },
  ODU:  { lat: 36.8855, lon: -76.3061, stadium: 'S.B. Ballard Stadium' },
  RICE: { lat: 29.7188, lon: -95.4093, stadium: 'Rice Stadium' },
  SDSU: { lat: 32.7830, lon: -117.1196, stadium: 'Snapdragon Stadium' },
  SHSU: { lat: 30.7102, lon: -95.5393, stadium: 'Bowers Stadium' },
  SJSU: { lat: 37.3193, lon: -121.9204, stadium: 'CEFCU Stadium' },
  SMIS: { lat: 31.3411, lon: -89.3392, stadium: 'M.M. Roberts Stadium' },
  STAT: { lat: 31.0927, lon: -97.3290, stadium: 'Bill Yung Stadium' },
  TLSA: { lat: 36.1527, lon: -95.9484, stadium: 'H.A. Chapman Stadium' },
  TLNE: { lat: 29.9436, lon: -90.1165, stadium: 'Yulman Stadium' },
  TROY: { lat: 31.7993, lon: -85.9546, stadium: 'Veterans Memorial Stadium' },
  TULN: { lat: 29.9436, lon: -90.1165, stadium: 'Yulman Stadium' },
  TXST: { lat: 29.8866, lon: -97.9308, stadium: 'Jim Wacker Field at UFCU Stadium' },
  UAB:  { lat: 33.5278, lon: -86.8100, stadium: 'Protective Stadium' },
  UMAS: { lat: 42.3762, lon: -72.5297, stadium: 'Warren McGuirk Alumni Stadium' },
  UNLV: { lat: 36.0909, lon: -115.1833, stadium: 'Allegiant Stadium' },
  USA:  { lat: 30.6954, lon: -88.1787, stadium: 'Hancock Whitney Stadium' },
  USF:  { lat: 27.9797, lon: -82.5033, stadium: 'Raymond James Stadium' },
  USM:  { lat: 31.3272, lon: -89.3347, stadium: 'M.M. Roberts Stadium' },
  UTEP: { lat: 31.7743, lon: -106.5051, stadium: 'Sun Bowl' },
  UTSA: { lat: 29.4242, lon: -98.4373, stadium: 'Alamodome' },
  WYO:  { lat: 41.3125, lon: -105.5692, stadium: 'War Memorial Stadium' },
  WKU:  { lat: 36.9712, lon: -86.4721, stadium: 'L.T. Smith Stadium' },
  WMU:  { lat: 42.2836, lon: -85.6128, stadium: 'Waldo Stadium' },
};

/**
 * Look up stadium coordinates by ESPN team abbreviation.
 * Returns null when abbr is not in the map (caller should hide the widget).
 */
export function getStadiumCoord(abbr: string | null | undefined): StadiumCoord | null {
  if (!abbr) return null;
  return STADIUM_COORDS[abbr.toUpperCase()] ?? null;
}
