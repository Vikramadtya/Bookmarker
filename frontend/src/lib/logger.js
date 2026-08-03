export const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  NONE: 50,
};

// Default to INFO in dev, NONE in prod unless explicitly set
const envLogLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();
const currentLevel = envLogLevel
  ? LOG_LEVELS[envLogLevel] || LOG_LEVELS.INFO
  : import.meta.env.DEV
    ? LOG_LEVELS.INFO
    : LOG_LEVELS.NONE;

export const logger = {
  debug: (...args) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) console.debug("[DEBUG]", ...args);
  },
  info: (...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) console.info("[INFO]", ...args);
  },
  warn: (...args) => {
    if (currentLevel <= LOG_LEVELS.WARN) console.warn("[WARN]", ...args);
  },
  error: (...args) => {
    if (currentLevel <= LOG_LEVELS.ERROR) console.error("[ERROR]", ...args);
  },
};
