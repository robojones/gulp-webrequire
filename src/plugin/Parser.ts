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

    let step = 0
    let name: string

    for (const { type, value } of tokens) {
      if (type === 'Keyword' && value === 'import') {
        throw new Error(`The import syntax is not supported! (${origin.path})`)
      } else if (step === 0 && type === 'Identifier' && value === 'require') {
        step += 1
      } else if (step === 1 && type === 'Punctuator' && value === '(') {
        step += 1
      } else if (step === 2 && type === 'String') {
        step += 1
        // Temporarily store the filename.
        name = value.substring(1, value.length - 1)
      } else if (step === 3 && type === 'Punctuator' && value === ')') {
        // The require statement is complete. Reset the step.
        step = 0
        // The require statement is valid. Store the result.
        const fileHandle = new File(origin, name, this.options.modulesDir)
        result.push(fileHandle)
      } else {
        step = 0
      }
    }
    return result
  }
}
