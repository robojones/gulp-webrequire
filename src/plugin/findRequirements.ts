import { tokenize } from 'esprima'
import * as Vinyl from 'vinyl'
import File from './File'

/**
 * Finds and returns the paths to all files that are required or imported in the file.
 * @param origin - The file that contains the code of the program.
 * @param modulesDir - The directory that contains imported modules.
 */
export default function findRequirements (origin: Vinyl, modulesDir: string = 'modules'): File[] {
  const tokens = tokenize(origin.contents.toString())
  const result: File[] = []
  let waitForString = false

  for (const { type, value } of tokens) {
    if (waitForString && type === 'String') {
      waitForString = false

      // remove quotes
      const filename = value.substring(1, value.length - 1)

      result.push(new File(origin, filename, modulesDir))

    } else if (type === 'Identifier' && value === 'require') {
      waitForString = true
    } else if (type === 'Keyword' && value === 'import') {
      throw new Error(`The import syntax is not supported! (${origin.path})`)
    }
  }

  return result
}
