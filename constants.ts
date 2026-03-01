
// Firmware v21.0 Color Map
export const COLORS = {
  // Physical Chassis
  bezel: '#333333',
  
  // Firmware Colors (Approximate Hex from 565RGB)
  bg: '#000000',          // COL_BG
  header: '#102040',      // 0x0841 (Dark Blue/Gray)
  cyan: '#00FFFF',        // COL_CYAN
  amber: '#FFBF00',       // COL_AMBER
  pink: '#FF00FF',        // COL_PINK
  dark: '#203050',        // COL_DARK
  off: '#303030',         // COL_OFF
  
  // UI Elements
  textWhite: '#FFFFFF',
  textGray: '#888888',
  gridBorder: '#00FFFF',

  // Component Specific Colors
  acOnBorder: '#00FFFF',
  acOnBg: '#003333',
  stdOnBorder: '#4ADE80',
};

export const BEZEL_DIMS = {
  width: 680,
  height: 540
};

// --- NEXUS CLOUD CREDENTIALS ---

export const MQTT_CONFIG = {
  host: 'e462158e43674f3faf283e5e3390e2ff.s1.eu.hivemq.cloud',
  // Note: HiveMQ Cloud uses port 8884 for Secure WebSockets (WSS) typically, 
  // while 8883 is for TCP/TLS which browsers can't use directly.
  port: 8884, 
  protocol: 'wss' as const,
  path: '/mqtt',
  username: 'nexus_admin',
  password: 'Nexus@2026',
};

export const DB_CONFIG = {
  // CHANGED: Using https:// protocol for Web Client compatibility (Fixes CORS/Fetch errors)
  url: 'https://nexus-yossamr.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzExOTA0MTgsImlkIjoiMDc0MTNmM2YtOTViNC00ZjQxLWJjM2EtNjU0YTQwNmZiZDY0IiwicmlkIjoiZDM5NjNjNTUtYTEzNC00NDY3LTllYTMtYmIwYzI5MjI0NGY1In0.bqV7wh1caal8nLWgekDEOq1Z3lpoeXvuKF7PapUCh4u2e9pUKXrJzQXgBuUmeIFmfljU1rNT8Qr-NTayhBftBQ'
};

// --- GLOBAL REAL-WORLD IR DATABASE (PRODUCTION GRADE) ---
// These map to standard libraries like IRremoteESP8266 / Arduino-IRremote
export const IR_DB_PRESETS: Record<string, Record<string, string[]>> = {
  tv: {
    // MAJOR BRANDS
    'Samsung': ['SAMSUNG', 'SAMSUNG36', 'NEC'], 
    'LG': ['LG', 'LG2', 'NEC'],
    'Sony': ['SONY12', 'SONY15', 'SONY20', 'SONY_BRAVIA'],
    'Panasonic': ['PANASONIC', 'KASEIKYO'],
    'Philips': ['RC5', 'RC6', 'RCMM'],
    'Sharp': ['SHARP', 'DENON'],
    'Toshiba': ['TOSHIBA', 'NEC'],
    'Hisense': ['NEC', 'HISENSE', 'RC5'],
    'TCL': ['NEC', 'RC5', 'TCL_ANDROID'],
    'Vizio': ['NEC', 'RC5'],
    'JVC': ['JVC', 'NEC'],
    'Hitachi': ['HITACHI_AC1', 'NEC'],
    'Pioneer': ['PIONEER', 'NEC'],
    'Sanyo': ['SANYO_LC7461', 'NEC'],
    'Mitsubishi': ['MITSUBISHI', 'MITSUBISHI2'],
    'Thomson': ['RC5', 'RC6'],
    'Grundig': ['RC5', 'NEC'],
    'Aiwa': ['AIWA_RC_T501'],
    'Funai': ['NEC', 'RC5'],
    'Magnavox': ['RC5', 'RC6'],
    'RCA': ['NEC', 'RCA'],
    'Daewoo': ['NEC'],
    'Akai': ['NEC', 'RC5'],
    'Insignia': ['NEC'],
    'Skyworth': ['NEC', 'SKYWORTH'],
    'Haier': ['HAIER', 'NEC'],
    'Changhong': ['NEC'],
    'Konka': ['NEC', 'KONKA'],
    'Vestel': ['RC5', 'NEC'],
    'Xiaomi': ['XIAOMI', 'NEC'],
    
    // REGIONAL / LEGACY
    'GoldStar': ['LG', 'NEC'],
    'Nec': ['NEC'],
    'Onida': ['NEC'],
    'Sansui': ['NEC', 'RC5'],
    'Videocon': ['RC5', 'NEC'],
    'Zenith': ['NEC', 'RC5']
  },
  
  // AC Protocols are complex state-blobs. 
  // These keys represent specific encoding algorithms in the ESP32 firmware.
  ac: {
    'Daikin': ['DAIKIN', 'DAIKIN2', 'DAIKIN64', 'DAIKIN128', 'DAIKIN152', 'DAIKIN176', 'DAIKIN216'],
    'Mitsubishi': ['MITSUBISHI_AC', 'MITSUBISHI_HEAVY_88', 'MITSUBISHI_HEAVY_152'],
    'Samsung': ['SAMSUNG_AC', 'SAMSUNG_AC_EXTENDED'],
    'LG': ['LG_AC', 'LG_AC_2'],
    'Toshiba': ['TOSHIBA_AC', 'TOSHIBA_AC_JB'],
    'Panasonic': ['PANASONIC_AC', 'PANASONIC_AC32', 'PANASONIC_AC64', 'PANASONIC_AC128'],
    'Gree': ['GREE', 'GREE_YAA', 'GREE_YBO'],
    'Midea': ['MIDEA', 'COOLIX'], // Coolix is very common for Midea rebrands
    'Fujitsu': ['FUJITSU_AC'],
    'Hitachi': ['HITACHI_AC', 'HITACHI_AC1', 'HITACHI_AC2', 'HITACHI_AC3', 'HITACHI_AC424'],
    'Carrier': ['CARRIER_AC64', 'CARRIER_AC128', 'CARRIER_CSA', 'TECO'],
    'Sharp': ['SHARP_AC'],
    'Haier': ['HAIER_AC', 'HAIER_AC_YRW02'],
    'Whirlpool': ['WHIRLPOOL_AC', 'DG11J1_3A'],
    'Electrolux': ['ELECTROLUX_AC', 'KELVINATOR'],
    'TCL': ['TCL112AC', 'MIDEA'], // Often uses Midea protocol
    'Hisense': ['HISENSE_AC', 'KELON'],
    'Aux': ['AUX'],
    'Beko': ['BEKO_AC', 'MIDEA'],
    'York': ['YORK', 'MIDEA'], // Often rebadged
    'Voltas': ['MIDEA', 'GREE'], // Often rebadged
    'Blue Star': ['MIDEA', 'GREE'],
    'Kelvinator': ['KELVINATOR'],
    'General': ['FUJITSU_AC'],
    'Neoclima': ['MIDEA'],
    'Chigo': ['CHIGO', 'CHIGO_AC'],
    'Trane': ['TRANE'],
    'Goodweather': ['GOODWEATHER'],
    'Corona': ['CORONA_AC'],
    'Trotec': ['TROTEC', 'TROTEC_3550'],
    'Argo': ['ARGO', 'ARGO_W'],
    'Vestel': ['VESTEL_AC']
  },
  
  fan: {
    'Dyson': ['DYSON', 'DYSON2'],
    'KDK': ['KDK', 'KDK_LITE'],
    'Panasonic': ['PANASONIC', 'KDK'], // Often share protocols
    'Midea': ['MIDEA', 'COOLIX'],
    'Lasko': ['NEC'], // Often uses generic NEC
    'Holmes': ['NEC'],
    'Honeywell': ['NEC'],
    'Crompton': ['NEC'],
    'Orient': ['NEC', 'RC5'],
    'Usha': ['NEC'],
    'Havells': ['NEC'],
    'Bajaj': ['NEC'],
    'Generic': ['NEC', 'RC5', 'SANYO_LC7461'] // Most cheap fans use these
  },
  
  projector: {
    'Epson': ['EPSON', 'NEC'],
    'BenQ': ['BENQ', 'NEC'],
    'Optoma': ['OPTOMA', 'NEC'],
    'Sony': ['SONY15', 'SONY20'],
    'ViewSonic': ['VIEWSONIC', 'NEC'],
    'Acer': ['ACER', 'NEC'],
    'LG': ['LG', 'NEC'],
    'InFocus': ['NEC'],
    'Casio': ['NEC'],
    'Hitachi': ['HITACHI_AC1', 'NEC'], // Often reuse TV/AC protocols
    'Canon': ['NEC'],
    'Christie': ['NEC'],
    'Dell': ['NEC'],
    'Sanyo': ['SANYO_LC7461']
  },
  
  outlet: {
    // IR Controlled Outlets usually use simple NEC
    'Generic': ['NEC', 'RC5'],
    'Etekcity': ['NEC'],
    'Belkin': ['NEC'],
    'Lutron': ['LUTRON']
  },
  
  heater: {
    // IR Heaters
    'Dyson': ['DYSON', 'DYSON2'],
    'Delonghi': ['NEC'],
    'Vornado': ['NEC'],
    'Generic': ['NEC', 'RC5']
  }
};
