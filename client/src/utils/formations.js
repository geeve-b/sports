// Slot layout per formation. x/y are percentages on a vertical pitch,
// our goal at the bottom. Slot ids must match server/config/constants.js.
const GK = { id: 'GK', x: 50, y: 91, group: 'GK' };
const BACK4 = [
  { id: 'LB', x: 13, y: 71, group: 'DF' },
  { id: 'LCB', x: 37, y: 76, group: 'DF' },
  { id: 'RCB', x: 63, y: 76, group: 'DF' },
  { id: 'RB', x: 87, y: 71, group: 'DF' },
];
const PAIR_UP_TOP = [
  { id: 'LST', x: 37, y: 18, group: 'FW' },
  { id: 'RST', x: 63, y: 18, group: 'FW' },
];

export const FORMATIONS = {
  '4-3-3': [
    GK,
    ...BACK4,
    { id: 'LCM', x: 28, y: 50, group: 'MF' },
    { id: 'CM', x: 50, y: 56, group: 'MF' },
    { id: 'RCM', x: 72, y: 50, group: 'MF' },
    { id: 'LW', x: 16, y: 23, group: 'FW' },
    { id: 'ST', x: 50, y: 15, group: 'FW' },
    { id: 'RW', x: 84, y: 23, group: 'FW' },
  ],
  '4-4-2': [
    GK,
    ...BACK4,
    { id: 'LM', x: 13, y: 46, group: 'MF' },
    { id: 'LCM', x: 37, y: 51, group: 'MF' },
    { id: 'RCM', x: 63, y: 51, group: 'MF' },
    { id: 'RM', x: 87, y: 46, group: 'MF' },
    ...PAIR_UP_TOP,
  ],
  '3-5-2': [
    GK,
    { id: 'LCB', x: 27, y: 75, group: 'DF' },
    { id: 'CB', x: 50, y: 78, group: 'DF' },
    { id: 'RCB', x: 73, y: 75, group: 'DF' },
    { id: 'LWB', x: 10, y: 47, group: 'MF' },
    { id: 'LCM', x: 32, y: 52, group: 'MF' },
    { id: 'CM', x: 50, y: 58, group: 'MF' },
    { id: 'RCM', x: 68, y: 52, group: 'MF' },
    { id: 'RWB', x: 90, y: 47, group: 'MF' },
    ...PAIR_UP_TOP,
  ],
  '4-2-3-1': [
    GK,
    ...BACK4,
    { id: 'LDM', x: 37, y: 58, group: 'MF' },
    { id: 'RDM', x: 63, y: 58, group: 'MF' },
    { id: 'LAM', x: 17, y: 35, group: 'MF' },
    { id: 'CAM', x: 50, y: 37, group: 'MF' },
    { id: 'RAM', x: 83, y: 35, group: 'MF' },
    { id: 'ST', x: 50, y: 14, group: 'FW' },
  ],
  '5-3-2': [
    GK,
    { id: 'LWB', x: 9, y: 63, group: 'DF' },
    { id: 'LCB', x: 30, y: 76, group: 'DF' },
    { id: 'CB', x: 50, y: 79, group: 'DF' },
    { id: 'RCB', x: 70, y: 76, group: 'DF' },
    { id: 'RWB', x: 91, y: 63, group: 'DF' },
    { id: 'LCM', x: 28, y: 47, group: 'MF' },
    { id: 'CM', x: 50, y: 52, group: 'MF' },
    { id: 'RCM', x: 72, y: 47, group: 'MF' },
    ...PAIR_UP_TOP,
  ],
  '4-1-4-1': [
    GK,
    ...BACK4,
    { id: 'DM', x: 50, y: 61, group: 'MF' },
    { id: 'LM', x: 13, y: 40, group: 'MF' },
    { id: 'LCM', x: 37, y: 45, group: 'MF' },
    { id: 'RCM', x: 63, y: 45, group: 'MF' },
    { id: 'RM', x: 87, y: 40, group: 'MF' },
    { id: 'ST', x: 50, y: 15, group: 'FW' },
  ],
};

export const FORMATION_NAMES = Object.keys(FORMATIONS);
export const BENCH_SIZE = 9;

// Human names for slot codes, for screen readers and tooltips.
export const SLOT_NAMES = {
  GK: 'Goalkeeper',
  LB: 'Left back',
  RB: 'Right back',
  LCB: 'Left centre-back',
  CB: 'Centre-back',
  RCB: 'Right centre-back',
  LWB: 'Left wing-back',
  RWB: 'Right wing-back',
  DM: 'Defensive midfield',
  LDM: 'Left defensive midfield',
  RDM: 'Right defensive midfield',
  LM: 'Left midfield',
  RM: 'Right midfield',
  LCM: 'Left central midfield',
  CM: 'Central midfield',
  RCM: 'Right central midfield',
  LAM: 'Left attacking midfield',
  CAM: 'Attacking midfield',
  RAM: 'Right attacking midfield',
  LW: 'Left wing',
  RW: 'Right wing',
  ST: 'Striker',
  LST: 'Left striker',
  RST: 'Right striker',
};
