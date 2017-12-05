import { PluginError } from 'gulp-util'
import * as path from 'path'
import * as Vinyl from 'vinyl'
const gutil = require('gulp-util')

export default class File {

  /** The working directory of the origin file. */
  public cwd: string

  /** The base directory of the file. */
  public base: string

  /** How the file was mentioned in the origin file. */
  public mention: string

  /** The absolute path to the directory containing the file that originally mentioned this file. */
  public origin: string

  constructor (origin: Vinyl, mention: string) {
    if (path.isAbsolute(mention)) {
      throw new PluginError({
        message: `Absolute paths are forbidden! (${origin.path})`,
        plugin: 'gulp-webrequire'
      })
    }

    gutil.log(origin.base)

    this.cwd = origin.cwd
    this.base = origin.base
    this.mention = mention
    this.origin = path.dirname(origin.path)
  }

  /** The absolute path to the file. */
  get resolved () {
    if (this.isModule) {
      return require.resolve(this.mention)
    }

    const { ext } = path.parse(this.mention)
    if (!ext) {
      this.mention += '.js'
    }

    return path.join(this.origin, this.mention)
  }

  /** Is true if the mention does not start with "./" or "../" */
  get isModule () {
    const first = this.mention.split(path.sep)[0]
    return first !== '.' && first !== '..'
  }

  /** The absolute final path. */
  get finalPath () {
    return path.join(this.base, this.finalName)
  }

  /** The final path relative to the output directory. */
  get finalName () {
    if (this.isModule) {
      return path.join('/module', this.mention + '.js')
    }

    const resolved = this.resolved

    if (!resolved.startsWith(this.base)) {
      throw new PluginError({
        message: `File is not in cwd! (${resolved})`,
        plugin: 'gulp-webrequire'
      })
    }

    return resolved.substr(this.base.length)
  }

  /** An array containing the mention [0] and the path [1] to the file relative to the cwd */
  get final (): [string, string] {
    return [this.mention, this.finalName]
  }
}
