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

    console.log(`queue for module "${name}:`, queue)

    requirements.forEach(([localName, realPath]) => {
      if (cache[realPath]) {
        removeFromQueue(realPath)
      } else {
        addCallback(realPath, () => {
          removeFromQueue(realPath)
          trigger()
        })
      }
    })

    trigger()

    /** Removes a requirement from the queue. */
    function removeFromQueue (modulename: string) {
      queue = queue.filter(e => e !== modulename)
    }

    /** Tries to execute the module. Aborts if not all requirements are met. */
    function trigger () {
      console.log(`TRIGGER - queue for module "${name}:`, queue)

      if (!queue.length) {
        execute()
      }
    }

    /** Executes the module. */
    function execute () {
      const module = {
        exports: {}
      }

      contents(module, module.exports, localRequire)

      console.log('file', name, 'exported', module.exports)

      resolve(module)
    }

    /** A local require function to pass to the module. */
    function localRequire (modulename: string) {
      const realname = requirements.find(requirement => {
        return requirement[0] === modulename
      })[1]

      return cache[realname]
    }

    /** Adds a callback for a module. */
    function addCallback (modulename: string, callback: () => void) {
      if (!callbacks[modulename]) {
        callbacks[modulename] = []
      }

      callbacks[modulename].push(callback)
    }

    /** Resolves the current module. Adds the exported data to the cache. */
    function resolve (module: { exports: any }) {
      cache[name] = module.exports

      console.log('cache', cache)

      if (callbacks[name]) {
        callbacks[name].forEach(cb => cb())
      }
    }
  }

  return registerModule
})()
