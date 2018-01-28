const Charcoder = require('charcoder')
import * as Concat from 'concat-with-sourcemaps'
import { fs } from 'mz'
import * as path from 'path'
import { Transform } from 'stream'
import * as through from 'through2'
import * as Vinyl from 'vinyl'
import List from '../lib/List'
import mergeWithSourcemaps from '../lib/mergeWithSourcemaps'
import Storage from '../lib/Storage'
import getBrowserLib from './getBrowserLib'
import Parser, {ParserOptions} from './Parser'

const b62 = new Charcoder(Charcoder.B62)

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

type PackList = Array<{
  name: string,
  entryPoints: List<string>
  files: string[]
}>

/** Contains the names of all files the names of their pack. */
interface Locations {
  [filename: string]: string
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
      const snippetName = path.join(this.options.modulesDir, 'webrequire.js')

      if (!this.files[snippetName]) {
        // Init snippet.
        this.files[snippetName] = getBrowserLib(file.cwd, file.base, this.options.modulesDir)
        this.names.add(snippetName)
      }

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
      this.parser.parse(file).then(cb).catch(err => stream.emit('error', err))
    }, (cb) => {
      this.build(stream).then(cb).catch(err => stream.emit('error', err))
    })

    return stream
  }

  private async build (stream: Transform): Promise<void> {
    const packs: PackList = []
    const locations: Locations = {}

    // Find initial entry points if none are passed.
    const entryPoints = new Storage<List<string>>(List)

    // Find entryPoints for each file.
    for (const filename of this.names) {
      const queue = new List<string>(filename)
      for (const current of queue) {
        const requiredIn = this.requiredIn.get(current)
        if (requiredIn.length) {
          queue.add(...requiredIn)
        } else {
          entryPoints.get(filename).add(current)
        }
      }
    }

    // Group by same entry points.
    for (const filename of this.names) {
      const entry = entryPoints.get(filename)

      // Find pack if it already exists.
      let pack = packs.find(p => {
        return p.entryPoints.diff(entry).length === 0
      })

      if (!pack) {
        // Create new pack.
        pack = {
          entryPoints: entry,
          files: [],
          name: b62.encode(packs.length) + '.js'
        }
        packs.push(pack)
      }

      // Add this file to pack.
      pack.files.push(filename)
      locations[filename] = pack.name
    }

    this.exportPacks(stream, packs)
    await this.exportMappings(stream, locations)
  }

  /**
   * Merges the packages into single files and writes them to the output stream.
   * @param stream - The output stream.
   * @param packs - A storage containing the packs.
   */
  private exportPacks (stream: Transform, packs: PackList): void {

    // Merge the files of the packs.
    for (const pack of packs) {
      const mainFile = this.createVinyl(pack.name)

      const files: Array<Vinyl|string> = pack.files.map(filename => this.files[filename])

      // Add the prefix.
      files.unshift(packagePrefix)

      mergeWithSourcemaps(mainFile, files, {
        fixGulpSourcemaps: true,
        typescript: true
      })

      stream.push(mainFile)
    }
  }

  /**
   * Exports the locations of the files and their requirements into a "mappings.json" file in the base directory.
   * @param stream - The output stream.
   * @param locations - An object that contains the files with the names of their packs.
   */
  private async exportMappings (stream: Transform, locations: Locations): Promise<void> {
    const { base } = this.files[this.names[0]]

    const mappings = {}

    for (const filename of this.names) {
      const relatedFiles = new List<string>(filename)
      const relatedPacks = new List<string>()

      for (const current of relatedFiles) {
        relatedPacks.add(locations[current])
        relatedFiles.add(...this.requirements.get(current))
      }

      mappings[filename] = relatedPacks
    }

    console.log('mappings:', mappings)

    const mappingsData = 'module.exports = ' + JSON.stringify(mappings, null, 2)
    const outputFile = this.createVinyl('mappings.js', Buffer.from(mappingsData))

    stream.push(outputFile)
  }

  /**
   * Creates a new vinyl with a given name and contents.
   * All other missing information will be filled from the first known file.
   * @param name - The name of the file relative to the base directory.
   * @param contents - The contents of the file (default: null).
   */
  private createVinyl (name: string, contents: Buffer = null): Vinyl {
    const anyFile = this.files[this.names[0]]
    return new Vinyl({
      base: anyFile.base,
      contents,
      cwd: anyFile.cwd,
      path: path.join(anyFile.base, name),
      stat: anyFile.stat
    })
  }
}
