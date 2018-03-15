declare global {
  /**
   * Logs a message if process.env.WEBREQUIRE_DEBUG is set to true.
   * @param msg - The log message.
   */
  function log (...msg: any[]): void
}

const g = global as any

export function debugLog (...msg) {
  if (process.env.WEBREQUIRE_DEBUG === 'true') {
    console.log(...msg)
  }
}

g.log = debugLog
