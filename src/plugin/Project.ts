import * as Concat from 'concat-with-sourcemaps'
import * as path from 'path'
import { Transform } from 'stream'
import * as through from 'through2'
import * as Vinyl from 'vinyl'
import List from './List'
import Parser, {ParserOptions} from './Parser'
import Storage from './Storage'

export interface ProjectOptions extends ParserOptions {
  /**
   * If set to false no packages will be generated.
   * All input files will stay separate files.
   * (default: true)
   * @example
   * { smartPacking: false }
   */
  smartPacking?: boolean
}

export default class Project {
  private options: ProjectOptions
  private parser: Parser

  private files: {[name: string]: Vinyl} = {}
  private names = new List<string>()
  private requirements = new Storage<List<string>>(List)
  private requiredIn = new Storage<List<string>>(List)

  constructor (options: ProjectOptions) {
    this.options = options
    this.parser = new Parser(options)

    this.parser.on('file', (file, requirements) => {
      const current = file.relative

      // Remove old requirements of this file from requiredIn.
      const oldRequirements = this.requirements.get(current)
      for (const name of oldRequirements) {
        this.requiredIn.get(name).remove(current)
      }

      // Add new requirements of this file to requiredIn.
      for (const name of requirements) {
        this.requiredIn.get(name).add(current)
      }

      // Overwrite old requirements
      this.requirements.set(current, new List(...requirements))

      // Add to files.
      this.files[current] = file
      this.names.add(current)
    })
  }

  /**
   * Creates a new stream for the current project.
   */
  public through (): Transform {
    const stream = through.obj((file: Vinyl, enc, cb) => {
      this.parser.parse(file).then(() => cb()).catch(cb)
    }, (cb) => {
      this.build(stream)
      cb()
    })

    return stream
  }

  private build (stream: Transform) {

    const packs = new Storage<List<string>>(List)

    for (const name of this.names) {
      const trace = new List<string>(name)

      while (true) {
        const current = trace[0]
        const requiredIn = this.requiredIn.get(current)
        const next = requiredIn[0]

        if (trace.includes(next)) {
          // Circular structure detected.
          break
        }

        if (requiredIn.length === 1) {
          // File is required in only one other file -> file gets merged into next file.
          trace.unshift(next)
        } else {
          // If file is not required anywhere or in mulitple files -> file becomes a pack.
          break
        }
      }

      // Add filename to pack.
      const packname = trace[0]
      packs.get(trace[0]).add(name)
    }

    const packNames = packs.keys

    // Merge the files of the packs.
    for (const packName of packNames) {
      const pack = packs.get(packName)
      const mainFile = this.files[packName].clone({contents: true, deep: true})

      const concat = new Concat(!!mainFile.sourceMap, path.basename(mainFile.path))

      for (const name of pack) {
        const file = this.files[name]
        concat.add(file.relative, file.contents, file.sourceMap)
      }

      mainFile.contents = concat.content

      if (concat.sourceMap) {
        mainFile.sourceMap = JSON.parse(concat.sourceMap)
      }

      stream.push(mainFile)
    }
  }
}
