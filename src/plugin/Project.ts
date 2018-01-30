import * as Concat from 'concat-with-sourcemaps'
import * as crypto from 'crypto'
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

const prefixPath = require.resolve('../snippet/packagePrefix')
/**
 * A snippet of code that initializes the registerModule method
 * in the beginning of the package, if it does not exist yet.
 */
const packagePrefix = fs.readFileSync(prefixPath).toString()

export interface ProjectOptions {
  /**
   * The directory that external modules get imported to. (default: 'module')
   * @example
   * { modulesDir: 'lib' }
   */
  modulesDir?: string

  /**
   * Specify some additional entry-points.
   * In some cases you might want to have a file as entry point that is being required in other files.
   * You can do this with this option.
   */
  entryPoints?: string[]
}

type PackList = Array<{
  entryPoints: List<string>
  files: string[]
}>

/** Contains the names of all files the names of their pack. */
interface Locations {
  [filename: string]: string
}

export default class Project {
  private options: ProjectOptions = {
    entryPoints: [],
    modulesDir: 'module'
  }
  private parser: Parser

  private files: {[name: string]: Vinyl} = {}
  private names = new List<string>()
  private requirements = new Storage<List<string>>(List)
  private requiredIn = new Storage<List<string>>(List)

  constructor (options: ProjectOptions) {
    Object.assign(this.options, options)

    this.parser = new Parser(this.options as ParserOptions)

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
      try {
        this.build(stream)
        cb()
      } catch (error) {
        stream.emit('error', error)
      }
    })

    return stream
  }

  private get entryPoints (): List<string> {
    const result = new List<string>()
    result.add(...this.names.filter(name => !this.requiredIn.get(name).length))
    result.add(...this.options.entryPoints)
    return result
  }

  private build (stream: Transform): void {
    const packs: PackList = []

    const entryPoints = this.entryPoints
    const fileEntryPoints = new Storage<List<string>>(List)

    // Find entryPoints for each file.
    for (const filename of this.names) {
      const queue = new List<string>(filename)
      for (const current of queue) {
        const requiredIn = this.requiredIn.get(current)
        if (requiredIn.length) {
          queue.add(...requiredIn)
        }

        if (entryPoints.includes(current)) {
          fileEntryPoints.get(filename).add(current)
        }
      }
    }

    // Group by same entry points.
    for (const filename of this.names) {
      const entry = fileEntryPoints.get(filename)

      // Find pack if it already exists.
      let pack = packs.find(p => {
        return p.entryPoints.diff(entry).length === 0
      })

      if (!pack) {
        // Create new pack.
        pack = {
          entryPoints: entry,
          files: []
        }
        packs.push(pack)
      }

      // Add this file to pack.
      pack.files.push(filename)
    }

    const locations = this.exportPacks(stream, packs)
    this.exportMappings(stream, locations)
  }

  /**
   * Merges the packages into single files and writes them to the output stream.
   * It also generates and sets the names of the packages.
   * @param stream - The output stream.
   * @param packs - A storage containing the packs.
   */
  private exportPacks (stream: Transform, packs: PackList): Locations {
    const locations: Locations = {}

    // Merge the files of the packs.
    for (const pack of packs) {
      const mainFile = this.createVinyl('pack.js')

      const files: Array<Vinyl|string> = pack.files.map(filename => this.files[filename])

      // Activate sourcemaps.
      mainFile.sourceMap = (files[0] as Vinyl).sourceMap

      // Add the prefix.
      files.unshift(packagePrefix)

      mergeWithSourcemaps(mainFile, files, {
        fixGulpSourcemaps: true,
        typescript: true
      })

      const hash = crypto.createHash('sha256')
      hash.update(mainFile.contents as Buffer)
      const packname = hash.digest().toString('base64', 0, 6).replace(/\+/g, '-').replace(/\//g, '_') + '.js'

      mainFile.path = path.join(mainFile.base, packname)

      for (const filename of pack.files) {
        locations[filename] = packname
      }

      stream.push(mainFile)
    }

    return locations
  }

  /**
   * Exports the locations of the files and their requirements into
   * the "webrequire-mappings.js" file in the base directory.
   * @param stream - The output stream.
   * @param locations - An object that contains the files with the names of their packs.
   */
  private exportMappings (stream: Transform, locations: Locations): void {
    const entryPoints = this.entryPoints
    const mappings: {[filename: string]: string[]} = {}

    for (const filename of entryPoints) {
      const relatedFiles = new List<string>(filename)
      const relatedPacks = new List<string>()

      for (const current of relatedFiles) {
        relatedPacks.add(locations[current])
        relatedFiles.add(...this.requirements.get(current))
      }

      mappings[filename] = relatedPacks
    }

    const mappingsData = 'module.exports = ' + JSON.stringify(mappings, null, 2)
    const outputFile = this.createVinyl('webrequire-mappings.js', Buffer.from(mappingsData))

    stream.push(outputFile)
  }

  /**
   * Creates a new vinyl with a given name and contents.
   * All other missing information will be filled from the first known file.
   * @param name - The name of the file relative to the base directory.
   * @param contents - The contents of the file (default: null).
   */
  private createVinyl (name?: string, contents: Buffer = null): Vinyl {
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
