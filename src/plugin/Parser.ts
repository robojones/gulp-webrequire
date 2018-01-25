import { EventEmitter } from 'events'
import * as fs from 'mz/fs'
import * as path from 'path'
import * as Vinyl from 'vinyl'
import mergeWithSourcemaps from '../lib/mergeWithSourcemaps'
import SourceMap from '../lib/SourceMap'
import File from './File'
import findRequirements from './findRequirements'

export interface ParserOptions {
  /**
   * The directory that external modules get imported to. (default: 'modules')
   * @example
   * { modulesDir: 'lib' }
   */
  modulesDir?: string
  [option: string]: any
}

declare interface Parser {
  on (event: 'file', listener: (file: Vinyl, requirements: string[]) => void): this
  emit (event: 'file', file: Vinyl, requirements: string[]): boolean
}

class Parser extends EventEmitter {
  private history: string[] = []
  private options: ParserOptions

  public constructor (options: ParserOptions) {
    super()
    this.options = options
  }

  /**
   * Parses the file and imports external dependencies.
   * The returned promise resolves to an array of Vinyl file objects representing the dependencies.
   * All importet files will also be emitted in the "file" event.
   * @param origin - The file to parse.
   */
  public async parse (origin: Vinyl): Promise<void> {

    origin.base = path.join('/', ...origin.base.split(path.sep))

    const requirements = findRequirements(origin, this.options.modulesDir)

    const promises = requirements.map(fileHandle => {
      if (!fileHandle.isModule) {
        return
      }

      return this.import(fileHandle)
    }).filter(e => e) as Array<Promise<void>>

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

    this.initSourcemap(file)

    if (findRequirements(file).length) {
      throw new Error(
        `External modules are not allowed to require other modules! (${originalPath})`
      )
    }

    this.wrap([], file)

    this.emit('file', file, [])
  }

  /**
   * Wraps the contents of the file into a registerModule() function.
   * @param requirements - An array of arrays representing the requirements for the file.
   * @param file - A vinyl object representing the file.
   */
  private wrap (requirements: File[], file: Vinyl) {
    const { pre, post } = this.createWrappers(requirements, file)

    mergeWithSourcemaps(file, [pre, file, post])
  }

  /**
   * Creates the prefix and suffix (with sourcemaps) for the file.
   * @param requirements - An array of arrays representing the requirements for the file.
   * @param file - A vinyl object representing the file.
   */
  private createWrappers (requirements: File[], file: Vinyl): {post: Vinyl, pre: Vinyl} {
    const name = file.relative
    const requirementString = JSON.stringify(requirements.map(fileHandle => fileHandle.final))
    const prefix = Buffer.from(
      `window.registerModule(${requirementString}, ${JSON.stringify(name)}, function (module, exports, require) {\n`
    )

    const postfix = Buffer.from('\n})\n')

    const pre = new Vinyl({
      base: file.base,
      contents: prefix,
      cwd: file.cwd,
      path: path.join(file.base, 'webrequire', file.relative + '.part1'),
    })

    this.initSourcemap(pre, file)

    const post = new Vinyl({
      base: file.base,
      contents: postfix,
      cwd: file.cwd,
      path: path.join(file.base, 'webrequire', file.relative + '.part2'),
    })

    this.initSourcemap(post, file)

    return {
      post,
      pre
    }
  }

  /**
   * Initializes a sourcemap for the file.
   * @param file - The file to apply the sourcemaps.
   * @param origin - An optional origin file. The file path in the sourcemap will be relative to this file.
   * If not provided, the sourcemap will be relative to the base directory.
   */
  private initSourcemap (file: Vinyl, origin?: Vinyl) {
    let name: string
    if (origin) {
      name = path.relative(origin.dirname, file.path)
    } else {
      name = file.relative
    }

    const sourceMap: SourceMap = {
      file: name,
      mappings: '',
      names: [],
      sources: [ name ],
      sourcesContent: [ file.contents.toString() ],
      version: 3,
    }

    file.sourceMap = sourceMap
  }
}

export default Parser
