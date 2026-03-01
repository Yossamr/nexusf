
export const generateDeviceId = (mac: string, channel: number): string => {
  return `${mac}_${channel}`;
};

export const isRelayDevice = (type: string): boolean => {
  const lower = type.toLowerCase();
  return lower.includes('relay') || lower.includes('switch') || lower.includes('light') || lower.includes('outlet');
};

export const isFreeKeyDevice = (type: string): boolean => {
  const lower = type.toLowerCase();
  return lower.includes('free') || lower.includes('remote');
};
