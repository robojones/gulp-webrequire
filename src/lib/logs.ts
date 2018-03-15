const debug = process.env.WEBREQUIRE_DEBUG === 'true'

// Unhandled promise rejection listener
if (debug) {
  process.on('unhandledRejection', (error) => {
    error.message = 'Unhandled rejection: ' + error.message
    console.error(error)
    process.exit(1)
  })
}

// Global log function
declare global {
  /**
   * Logs a message if process.env.WEBREQUIRE_DEBUG is set to true.
   * @param msg - The log message.
   */
  function log (...msg: any[]): void
}

const g = global as any

export function debugLog (...msg) {
  if (debug) {
    console.log(...msg)
  }
}

g.log = debugLog
