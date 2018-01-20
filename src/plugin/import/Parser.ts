import Concat = require('concat-with-sourcemaps')
import { EventEmitter } from 'events'
import * as fs from 'mz/fs'
import * as path from 'path'
import * as Vinyl from 'vinyl'
import File from '../File'
import VinylWithRequirements from '../VinylWithRequirements'
import findRequirements from './findRequirements'



declare interface Parser {
  on (event: 'file', listener: (file: VinylWithRequirements) => void): this
  emit (event: 'file', file: VinylWithRequirements): boolean
}

class Parser extends EventEmitter {
  private history: string[] = []

  /**
   * Parses the file and imports external dependencies.
   * The returned promise resolves to an array of Vinyl file objects representing the dependencies.
   * All importet files will also be emitted in the "file" event.
   * @param origin - The file to parse.
   */
  public async parse (origin: VinylWithRequirements): Promise<void> {

    origin.base = path.join('/', ...origin.base.split(path.sep))

    const requirements = findRequirements(origin)

    const promises = requirements.map(fileHandle => {
      if (!fileHandle.isModule) {
        return
      }

      return this.import(fileHandle)
    }).filter(e => e) as Array<Promise<void>>

    const files = await Promise.all(promises)

    origin.wrapper = this.createWrappers(requirements, origin)
    origin.requirements = requirements

    this.emit('file', origin)
  }

  /**
   * Returns a vinyl object representing the exported file of the module
   * @param fileHandle - An object representing the location of the module.
   */
  private async import (fileHandle: File): Promise<void> {
    const finalPath = fileHandle.finalPath

    console.log(fileHandle.resolved, 'history', this.history)

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
    }) as VinylWithRequirements

    if (findRequirements(file).length) {
      throw new Error(
        `External modules are not allowed to require other modules! (${originalPath})`
      )
    }

    file.wrapper = this.createWrappers([], file)
    file.requirements = []

    this.emit('file', file)
  }

  /**
   * Wraps the contents of the file into a registerModule() function.
   * @param requirements - An array of arrays representing the requirements for the file.
   * @param file - A vinyl object representing the file.
   */
  private createWrappers (requirements: File[], file: VinylWithRequirements) {
    console.log('create wrapepr for', file.relative)
    const name = file.path.substr(file.base.length)
    const requirementString = JSON.stringify(requirements.map(fileHandle => fileHandle.final))
    const prefix = Buffer.from(
      `window.registerModule(${requirementString}, ${JSON.stringify(name)}, function (module, exports, require) {\n`
    )

    const postfix = Buffer.from('\n})\n')

    const pre = new Vinyl({
      base: path.join(file.base, 'gulp-webrequire-postfix'),
      contents: prefix,
      cwd: file.cwd,
      path: path.join(file.base, 'gulp-webrequire-postfix', file.relative),
    })

    console.log('emit pre')
    this.emit('file', pre)

    const post = new Vinyl({
      base: path.join(file.base, 'gulp-webrequire-prefix'),
      contents: postfix,
      cwd: file.cwd,
      path: path.join(file.base, 'gulp-webrequire-prefix', file.relative),
    })

    console.log('emit post')
    this.emit('file', post)

    return {
      post,
      pre
    }
  }
}

export default Parser
