import * as Concat from 'concat-with-sourcemaps'
import * as path from 'path'
import { Transform } from 'stream'
import * as through from 'through2'
import * as Vinyl from 'vinyl'
import List from '../lib/List'
import mergeWithSourcemaps from '../lib/mergeWithSourcemaps'
import Storage from '../lib/Storage'
import Parser, {ParserOptions} from './Parser'

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

  private build (stream: Transform, entryPoints?: List<string>): void {

    // Find initial entry points if none are passed.
    if (!entryPoints) {
      entryPoints = new List(...this.names.filter(key => {
        return !this.requiredIn.get(key).length
      }))
    }

    const packs = new Storage<List<string>>(List)

    // Generate basic packs.
    for (const entryPoint of entryPoints) {
      const pack = packs.get(entryPoint)
      const discovered = new List<string>(entryPoint)

      let current

      do {
        current = discovered.pop()
        pack.add(current)
        // Prevent duplicate detection in circular structures.
        const requirements = this.requirements.get(current).uncovered(pack)
        // Prevent entrypoints from being packed.
        const noEntryPoints = requirements.uncovered(entryPoints)
        // Add new requirements.
        discovered.add(...noEntryPoints)
      } while (discovered.length)
    }

    // Find duplicate files.
    const duplicate = new List<string>()

    for (const packname of entryPoints) {
      const pack = packs.get(packname)

      for (const secondPackname of entryPoints) {
        if (secondPackname === packname) {
          continue
        }

        const secondPack = packs.get(secondPackname)

        // Add files that are in multiple packages to duplicate.
        duplicate.add(...pack.covered(secondPack))
      }
    }

    const notDuplicate = this.names.uncovered(duplicate)

    // Find new entry points.
    for (const name of duplicate) {
      const requiredIn = this.requiredIn.get(name).uncovered(notDuplicate)

      if (!requiredIn.length) {
        entryPoints.push(name)
      }
    }

    if (duplicate.length) {
      this.build(stream, entryPoints)
    } else {
      this.exportPacks(stream, packs)
    }
  }

  /**
   * Merges the packages into single files and writes them to the output stream.
   * @param stream - The output stream.
   * @param packs - A storage containing the packs.
   */
  private exportPacks (stream: Transform, packs: Storage<List<string>>): void {
    const packNames = packs.keys

    // Merge the files of the packs.
    for (const packName of packNames) {
      const pack = packs.get(packName)
      const mainFile = this.files[packName].clone({contents: true, deep: true})

      console.log('pack', pack)

      // Note: The pack list includes the mainFile.
      const files = pack.map(filename => this.files[filename])

      mergeWithSourcemaps(mainFile, files, {
        fixGulpSourcemaps: true,
        typescript: true
      })

      stream.push(mainFile)
    }
  }
}
