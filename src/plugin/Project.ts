import * as Concat from 'concat-with-sourcemaps'
import * as fs from 'fs'
import * as path from 'path'
import { Transform } from 'stream'
import * as through from 'through2'
import * as Vinyl from 'vinyl'
import List from '../lib/List'
import mergeWithSourcemaps from '../lib/mergeWithSourcemaps'
import Storage from '../lib/Storage'
import getBrowserLib from './getBrowserLib'
import Parser, {ParserOptions} from './Parser'

const prefixPath = require.resolve('../snippet/packagePrefix')
/** A snippet of code that initializes the registerModule method
 * in the beginning of the package, if it does not exist yet.
 */
const packagePrefix = fs.readFileSync(prefixPath).toString()

export interface ProjectOptions {
  /**
   * If set to false no packages will be generated.
   * All input files will stay separate files.
   * (default: true)
   * @example
   * { smartPacking: false }
   */
  smartPacking?: boolean

  /**
   * The directory that external modules get imported to. (default: 'module')
   * @example
   * { modulesDir: 'lib' }
   */
  modulesDir?: string
}

export default class Project {
  private options: ProjectOptions
  private parser: Parser

  private files: {[name: string]: Vinyl} = {}
  private names = new List<string>()
  private requirements = new Storage<List<string>>(List)
  private requiredIn = new Storage<List<string>>(List)

  constructor (options: ProjectOptions) {

    if (!options.modulesDir) {
      options.modulesDir = 'module'
    }

    this.options = options
    this.parser = new Parser(options as ParserOptions)

    this.parser.on('file', (file, requirements) => {
      const current = file.relative
      const snippetName = path.join(this.options.modulesDir, 'snippet.ts')

      if (!this.files[snippetName]) {
        // Init snippet.
        this.files[snippetName] = getBrowserLib(file.cwd, file.base, this.options.modulesDir)
        this.names.add(snippetName)
      }

      // Set all files as requirements for the snippet.
      const namesExcludingSnippet = this.names.uncovered([snippetName])
      this.requirements.set(snippetName, namesExcludingSnippet)

      // Add snippet to requirements of this file.
      requirements.push(snippetName)

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
      this.parser.parse(file).then(() => cb()).catch(err => stream.emit('error', err))
    }, (cb) => {
      this.build(stream)
      cb()
    })

    return stream
  }

  private build (stream: Transform, entryPoints ?: List<string>): void {

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

      // Note: The pack list includes the mainFile.
      const files: Array<Vinyl|string> = pack.map(filename => this.files[filename])

      // Add the prefix.
      files.unshift(packagePrefix)

      mergeWithSourcemaps(mainFile, files, {
        fixGulpSourcemaps: true,
        typescript: true
      })

      stream.push(mainFile)
    }
  }
}
