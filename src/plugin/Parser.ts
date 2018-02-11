import { tokenize } from 'esprima'
import * as Vinyl from 'vinyl'
import File from './File'

export interface ParserOptions {
  /**
   * The directory that external modules get imported to.
   */
  modulesDir: string
  [option: string]: any
}

/**
 * Class representing a JS parser.
 */
export default class Parser {
  private options: ParserOptions

  constructor (options: ParserOptions) {
    this.options = options
  }

  /**
   * Finds and returns the paths to all files that are required or imported in the file.
   * @param origin - The file that contains the code of the program.
   * @param modulesDir - The directory that contains imported modules.
   */
  public parse (origin: Vinyl): File[] {
    const tokens = tokenize(origin.contents.toString())
    const result: File[] = []
    let waitForString = false

    for (const { type, value } of tokens) {
      if (waitForString && type === 'String') {
        waitForString = false

        // remove quotes
        const filename = value.substring(1, value.length - 1)

        result.push(new File(origin, filename, this.options.modulesDir))

      } else if (type === 'Identifier' && value === 'require') {
        waitForString = true
      } else if (type === 'Keyword' && value === 'import') {
        throw new Error(`The import syntax is not supported! (${origin.path})`)
      }
    }
    return result
  }
}
