import { EventEmitter } from 'events'
import * as fs from 'mz/fs'
import * as path from 'path'
import * as Vinyl from 'vinyl'
import initSourcemap from '../lib/initSourcemap'
import mergeWithSourcemaps from '../lib/mergeWithSourcemaps'
import SourceMap from '../lib/SourceMap'
import File from './File'
import Parser, { ParserOptions } from './Parser'

export type LinkerOptions = ParserOptions

declare interface Linker {
  on (event: 'file', listener: (file: Vinyl, requirements: string[]) => void): this
  emit (event: 'file', file: Vinyl, requirements: string[]): boolean
}

class Linker extends EventEmitter {
  private history: string[] = []
  private options: LinkerOptions
  private parser: Parser

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

    // Remove trailing slashes.
    origin.base = path.join('/', ...origin.base.split(path.sep))

    const requirements = this.parser.parse(origin)

    const promises = requirements.map(fileHandle => {
      if (fileHandle.isModule) {
        return this.import(fileHandle)
      }
    })

    const files = await Promise.all(promises)

    this.wrap(requirements, origin)

    const requirementStrings = requirements.map(file => file.finalName)

    this.emit('file', origin, requirementStrings)
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

    const requirements = this.parser.parse(file)

    // Import all requirements.
    const promises = requirements.map(requirement => this.import(requirement))
    await Promise.all(promises)

    this.wrap(requirements, file)

    this.emit('file', file, [])
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
