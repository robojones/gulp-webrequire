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
    contents: (module: { exports: any }, exports: any, require: (modulename: string) => any) => void
  ) {
    let queue = requirements.map(r => r[1])

    requirements.forEach(([localName, realPath]) => {
      if (cache[realPath]) {
        removeFromQueue(realPath)
      } else {
        if (!callbacks[realPath]) {
          callbacks[realPath] = []
        }

        callbacks[realPath].push(() => {
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
      if (!queue.length) {

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
    }

    /** A local require function to pass to the module. */
    function localRequire (modulename: string) {
      const realname = requirements.filter(requirement => {
        return requirement[0] === modulename
      })[0][1]

      return cache[realname]
    }
  }

  return registerModule
})()
