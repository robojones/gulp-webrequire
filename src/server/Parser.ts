import { EventEmitter } from 'events'
import * as fs from 'mz/fs'
import * as path from 'path'
import * as Vinyl from 'vinyl'
import File from './File'
import findRequirements from './findRequirements'

declare interface Parser {
  on (event: 'file', listener: (file: Vinyl) => void): this
}

class Parser extends EventEmitter {
  private history: string[] = []

  /**
   * Parses the file and imports external dependencies.
   * The returned promise resolves to an array of Vinyl file objects representing the dependencies.
   * All importet files will also be emitted in the "file" event.
   * @param origin - The file to parse.
   */
  public async parse (origin: Vinyl): Promise<Vinyl[]> {

    origin.base = path.join('/', ...origin.base.split(path.sep))

    const requirements = findRequirements(origin)

    const promises = requirements.map(fileHandle => {
      if (!fileHandle.isModule) {
        return null
      }

      return this.import(fileHandle)
    }).filter(e => e) as Array<Promise<Vinyl>>

    const files = await Promise.all(promises)

    this.wrap(requirements, origin)

    return files
  }

  private async import (fileHandle: File): Promise<Vinyl> {
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
    })

    if (findRequirements(file).length) {
      throw new Error(
        `External modules are not allowed to require other modules! (${originalPath})`
      )
    }

    this.wrap([], file)

    this.emit('file', file)

    return file
  }

  private wrap (requirements: File[], file: Vinyl) {
    const name = file.path.substr(file.base.length)
    const requirementString = JSON.stringify(requirements.map(fileHandle => fileHandle.final))
    const prefix = Buffer.from(
      `window.registerModule(${requirementString}, ${JSON.stringify(name)}, function (module, exports, require) {\n`
    )

    const postfix = Buffer.from('\n})\n')

    const parts = [prefix, file.contents as Buffer, postfix]
    file.contents = Buffer.concat(parts)
  }
}

export default Parser
