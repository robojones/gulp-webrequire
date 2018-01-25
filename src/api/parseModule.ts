import * as fs from 'fs'
import * as path from 'path'
import * as vm from 'vm'
import List from '../lib/List'

const registeredCache: {
  [packname: string]: List<string>
} = {}

const requiredCache: {
  [packname: string]: List<string>
} = {}

export const contentsCache: {
  [packname: string]: Buffer
} = {}

/**
 * Returns all packs that are related to the given pack.
 * @param base - The base directory.
 * @param packname - The name of the pack relative to the base directory.
 */
export default function parseModule (base: string, packname: string) {
  if (!registeredCache[packname]) {
    run(base, packname)
  }

  return {
    contentsCache,
    registered: registeredCache[packname],
    required: requiredCache[packname]
  }
}

/**
 * Executes the contents of a file in a separate context. A callback gets called for each registered file..
 * @param base - The base directory of your public files.
 * @param packname - The path to the file relative to the base directory.
 */
export function run (
  base: string,
  packname: string,
): void {
  const registered = new List<string>()
  const required = new List<string>()

  const context = vm.createContext({
    window: {
      registerModule (requirements: Array<[string, string]>, name: string) {
        for (const [, requirement] of requirements) {
          required.add(requirement)
        }

        registered.add(name)
      }
    }
  })

  // Read file.
  const filePath = path.resolve(base, packname)
  const contents = fs.readFileSync(filePath)
  const code = contents.toString()

  // Run code in context with a window object.
  vm.runInContext(code, context)

  contentsCache[packname] = contents
  registeredCache[packname] = registered
  requiredCache[packname] = required
}
