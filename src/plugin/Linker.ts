import { EventEmitter } from 'events'
import * as fs from 'mz/fs'
import * as path from 'path'
import * as Vinyl from 'vinyl'
import initSourcemap from '../lib/initSourcemap'
import List from '../lib/List'
import mergeWithSourcemaps from '../lib/mergeWithSourcemaps'
import SourceMap from '../lib/SourceMap'
import File from './File'
import Parser, { ParserOptions } from './Parser'

export type LinkerOptions = ParserOptions

declare interface Linker {
  on (event: 'file', listener: (file: Vinyl, requirements: string[]) => void): this
  on (event: 'build', listener: () => void): this
  emit (event: 'file', file: Vinyl, requirements: string[]): boolean
  emit (event: 'build'): boolean
}

class Linker extends EventEmitter {
  private options: LinkerOptions
  private parser: Parser
  private buildListeners: {
    [resolvedPath: string]: () => void
  } = {}

  /** Contains the paths to all modules that have been imported. */
  private history: string[] = []

  /** The number of files that have been imported but are not emitted yet. */
  private queueLength = 0

  /** Contains all paths to all files. */
  private paths = new List<string>()

  public constructor (options: LinkerOptions) {
    super()
    this.options = options
    this.parser = new Parser(options)
  }

  /**
   * Parses the file and imports external dependencies.
   * The returned promise resolves to an array of Vinyl file objects representing the dependencies.
   * All importet files will also be emitted in the "file" event.
   * @param origin - The file to parse.
   */
  public async update (origin: Vinyl): Promise<void> {
    this.queueLength += 1

    // Remove trailing slashes.
    if (origin.base.endsWith('/') || origin.base.endsWith('\\')) {
      origin.base = origin.base.substr(0, origin.base.length - 1)
    }

    const requirements = this.parser.parse(origin)

    log('Linker: Imports for', origin.path)

    const promises = requirements.map(fileHandle => {
      if (fileHandle.isModule) {
        log('  Linker: Importing external module', fileHandle.mention)
        return this.import(fileHandle)
      } else {
        log('  Linker: File is not external:', fileHandle.mention)
      }
    })

    const files = await Promise.all(promises)

    this.wrap(requirements, origin)

    this.paths.add(origin.path)

    const removedOld = this.listenForBuild(origin, () => {
      this.verifyRequirements(requirements)
      const requirementStrings = requirements.map(file => file.finalName)

      this.queueLength -= 1
      this.emit('file', origin, requirementStrings)
    })

    if (removedOld) {
      this.queueLength -= 1
    }
  }

  public async build (): Promise<void> {
    this.emit('build')

    if (this.queueLength) {
      await new Promise((resolve) => {
        this.on('file', function listener () {
          if (!this.queueLength) {
            this.off('file', listener)
            resolve()
          }
        })
      })
    }
  }

  /**
   * Adds a listener for the "build" event. Removes the old listener if one exists for the same origin.
   * Returns true if an old listener was removed.
   * @param origin - The file that will be emitted by the listener.
   * @param listener - A function that will be executed when the build event is emitted.
   */
  private listenForBuild (origin: Vinyl, listener: () => void): boolean {
    let removed = false

    // Remove old listeners for same file.
    const oldListener = this.buildListeners[origin.path]
    if (oldListener) {
      this.removeListener('build', oldListener)
      removed = true
    }

    // Apply new listener.
    const newListener = () => {
      delete this.buildListeners[origin.path]
      listener()
    }
    this.buildListeners[origin.path] = newListener
    this.once('build', newListener)

    return removed
  }

  private verifyRequirements (files: File[]) {
    for (const file of files) {
      if (this.paths.includes(file.finalPath)) {
        continue
      }

      file.isDir = true
      if (this.paths.includes(file.finalPath)) {
        continue
      }
      file.isDir = false


      throw new Error(`File "${file.resolved}" not found. Please make sure that you pass all files to the project.`)
    }
  }

  /**
   * Returns a vinyl object representing the exported file of the module
   * @param fileHandle - An object representing the location of the module.
   */
  private async import (fileHandle: File): Promise<void> {
    const finalPath = fileHandle.finalPath

    if (this.history.includes(finalPath)) {
      return
    }

    this.history.push(finalPath)
    const originalPath = fileHandle.resolved

    if (originalPath === fileHandle.mention) {
      throw new Error(
        `The internal module "${fileHandle.mention}" was required in "${fileHandle.originPath}". `
        + 'Internal modules cannot be imported.'
      )
    }

    const stat = await fs.stat(originalPath)
    const contents = await fs.readFile(originalPath)

    const file = new Vinyl({
      base: fileHandle.base,
      contents,
      cwd: fileHandle.cwd,
      path: finalPath,
      stat,
    }) as Vinyl

    file.sourceMap = initSourcemap(file.relative, contents)

    log('Linker: Imported:', fileHandle.mention)

    await this.update(file)

    // const requirements = this.parser.parse(file)

    // // Import all requirements.
    // const promises = requirements.map(requirement => this.import(requirement))
    // await Promise.all(promises)

    // this.wrap(requirements, file)

    // this.emit('file', file, [])
  }

  /**
   * Wraps the contents of the file into a registerModule() function.
   * @param requirements - An array of arrays representing the requirements for the file.
   * @param file - A vinyl object representing the file.
   */
  private wrap (requirements: File[], file: Vinyl) {
    const name = file.relative
    const requirementString = JSON.stringify(requirements.map(fileHandle => fileHandle.final))
    const n = JSON.stringify(name)
    const prefix = `window.registerModule([${requirementString}, ${n}, function (module, exports, require) {\n`
    const postfix = '}]);\n'

    mergeWithSourcemaps(file, [prefix, file, postfix])
  }
}

export default Linker
