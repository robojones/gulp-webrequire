import * as browserResolve from 'browser-resolve'
import * as path from 'path'
import { dirname } from 'path'
import * as Vinyl from 'vinyl'

const resolve = browserResolve.sync

const MODULES = 'node_modules'

export default class File {
  /** A regexp that matches all path separators. */
  public static sep = /[\\\/]/g

  /** The working directory of the origin file. */
  public cwd: string

  /** The base directory of the file. */
  public base: string

  /** How the file was mentioned in the origin file. */
  public mention: string

  /** The absolute path to the directory containing the file that originally mentioned this file. */
  public origin: string

  /** The absolute path to the file that originally mentioned this file. */
  public originPath: string

  /** The directory that contains imported modules. */
  private modulesDir: string

  /** If set to true /index.js will be appended to the resolved filename. */
  private isDirectory: boolean = false

  constructor (origin: Vinyl, mention: string, modulesDir?: string) {
    if (path.isAbsolute(mention)) {
      throw new Error(`Absolute paths are forbidden! (${origin.path})`)
    }

    this.modulesDir = modulesDir
    this.cwd = origin.cwd
    this.base = origin.base
    this.mention = mention
    this.origin = path.dirname(origin.path)
    this.originPath = origin.path
  }

  /** If set to true /index.js will be appended to the resolved filename. */
  set isDir (value: boolean) {
    if (this.ext) {
      throw new Error(`The file "${this.resolved}" has a file extension. It cannot be a directory.`)
    }

    this.isDirectory = value
  }

  get isDir () {
    return this.isDirectory
  }

  /** The absolute path to the file. */
  get resolved () {
    if (this.isModule) {
      return resolve(this.mention, {
        basedir: dirname(this.origin)
      })
    }

    let name = this.mention

    if (this.isDirectory) {
      name = path.join(name, 'index')
    }

    if (!this.ext) {
      name += '.js'
    }

    return path.join(this.origin, name)
  }

  /** Is true if the mention does not start with "./" or "../" */
  get isModule () {
    const first = this.mention.split(File.sep)[0]
    return first !== '.' && first !== '..'
  }

  /**
   * The absolute final path.
   */
  get finalPath () {
    return path.join(this.base, this.finalName)
  }

  /**
   * The final path relative to the output directory.
   * @example
   * "modules/jquery/dist/jquery.js"
   */
  get finalName () {
    if (this.isModule) {
      const fullPath = this.resolved
      const baseIndex = fullPath.indexOf(MODULES) + MODULES.length
      return path.join(this.modulesDir, fullPath.substr(baseIndex))
    }

    const resolved = this.resolved

    if (!resolved.startsWith(this.base)) {
      throw new Error(`File (${resolved}) is not in cwd (${this.base})!`)
    }

    // Remove base and "/" in the beginning.
    return resolved.substr(this.base.length + 1)
  }

  /** An array containing the mention [0] and the path [1] to the file relative to the cwd. */
  get final (): [string, string] {
    return [this.mention, this.finalName]
  }

  /** Returns the file extension. */
  get ext (): string {
    const { ext } = path.parse(this.mention)
    return ext
  }
}
