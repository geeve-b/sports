export const ROLES = ['admin', 'coach', 'player'];
export const POSITIONS = ['GK', 'DF', 'MF', 'FW'];
export const PLAYER_STATUSES = ['fit', 'doubtful', 'injured', 'suspended'];
export const FEET = ['left', 'right', 'both'];
export const MATCH_STATUSES = ['scheduled', 'live', 'ht', 'ft', 'postponed'];
export const EVENT_TYPES = ['goal', 'own_goal', 'assist', 'yellow', 'red', 'sub_in', 'sub_out', 'injury', 'goal_against'];
export const PRIORITIES = ['normal', 'high', 'urgent'];
export const AUTH_COOKIE = 'wp_token';
export const BCRYPT_ROUNDS = 12;

// Slot ids per formation. Must match client/src/utils/formations.js.
export const FORMATIONS = {
  '4-4-2': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LST', 'RST'],
  '4-3-3': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'LW', 'ST', 'RW'],
  '3-5-2': ['GK', 'LCB', 'CB', 'RCB', 'LWB', 'LCM', 'CM', 'RCM', 'RWB', 'LST', 'RST'],
  '4-2-3-1': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LDM', 'RDM', 'LAM', 'CAM', 'RAM', 'ST'],
  '5-3-2': ['GK', 'LWB', 'LCB', 'CB', 'RCB', 'RWB', 'LCM', 'CM', 'RCM', 'LST', 'RST'],
  '4-1-4-1': ['GK', 'LB', 'LCB', 'RCB', 'RB', 'DM', 'LM', 'LCM', 'RCM', 'RM', 'ST'],
};
