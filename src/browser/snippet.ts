(window as any).registerModule = (() => {
  const cache: { [name: string]: any } = {}
  const callbacks: { [name: string]: Array<() => void> } = {}

  /**
   * Registers a new module with its requirements and name.
   * @param requirements - An array of arrays containing the requirements of the module. Schema: [localName, realPath]
   * @param name - The name of the module.
   * @param contents - A function containing the module.
   */
  function registerModule (
    requirements: Array<[string, string]>,
    name: string,
    contents: (module: { exports: {} }, exports: {}, require: (modulename: string) => any) => void
  ) {
    let queue = requirements.map(r => r[1])

    requirements.forEach(([localName, realPath]) => {
      if (cache[realPath]) {
        removeFromQueue(realPath)
      } else {
        addCallback(realPath, () => {
          removeFromQueue(realPath)
          execute()
        })
      }
    })

    execute()

    /** Removes a requirement from the queue. */
    function removeFromQueue (modulename: string) {
      queue = queue.filter(e => e !== modulename)
    }

    /** Tries to execute the module. Aborts if not all requirements are met. */
    function execute () {
      if (queue.length) {
        return
      }
      const module = {
        exports: {}
      }

      contents(module, module.exports, localRequire)

      cache[name] = module.exports

      // trigger the callbacks
      if (callbacks[name]) {
        callbacks[name].forEach(cb => cb())
      }
    }

    /** A local require function to pass to the module. */
    function localRequire (modulename: string) {
      const realname = requirements.filter(requirement => {
        return requirement[0] === modulename
      })[0][1]

      return cache[realname]
    }

    /** Adds a callback for a module. */
    function addCallback (modulename: string, callback: () => void) {
      if (!callbacks[modulename]) {
        callbacks[modulename] = []
      }

      callbacks[modulename].push(callback)
    }
  }

  return registerModule
})()
