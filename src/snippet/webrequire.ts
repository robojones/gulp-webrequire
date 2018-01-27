type Requirements = Array<[string, string]>
type Name = string
type Code = (module: { exports: any }, exports: any, require: (modulename: string) => any) => void
type RegisterModuleArguments = [Requirements, Name, Code]

// Register module so it can be detected in packs.
(window as any).registerModule([[], 'webrequire.js', () => {}]);

(() => {
  const w = window as any
  if (w.registerModule && !w.moduleQueue) {
    // The file is being parsed.
    return
  }


  const cache: { [name: string]: any } = {}
  const callbacks: { [name: string]: Array<() => void> } = {}

  /**
   * Registers a new module with its requirements and name.
   * @param requirements - An array of arrays containing the requirements of the module. Schema: [localName, realPath]
   * @param name - The name of the module.
   * @param contents - A function containing the module.
   */
  w.registerModule = function registerModule (params: RegisterModuleArguments) {
    const [
      requirements,
      name,
      contents
    ] = params

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

        try {
          contents(module, module.exports, localRequire)
        } catch (error) {
          console.error(error)
        }

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

  // Register modules that have been loaded before webrequire.
  w.moduleQueue.forEach(e => {
    w.registerModule(e)
  })
})()
