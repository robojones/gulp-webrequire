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


    for (let i = 0; (i + 4) <= tokens.length; i++) {
      if (tokens[i].type === 'Keyword' && tokens[i].value === 'import') {
        throw new Error(`The import syntax is not supported! (${origin.path})`)
      }

      if (
        tokens[i].type === 'Identifier' && tokens[i].value === 'require' &&
        tokens[i + 1].type === 'Punctuator' && tokens[i + 1].value === '(' &&
        tokens[i + 2].type === 'String' &&
        tokens[i + 3].type === 'Punctuator' && tokens[i + 3].value === ')'
      ) {
        const match = tokens[i + 2].value
        const name = match.substring(1, match.length - 1)
        result.push(new File(origin, name, this.options.modulesDir))
      }
    }
    return result
  }
}
