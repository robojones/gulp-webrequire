import List from '../lib/List'
import parseModule from './parseModule'

/**
 * Returns all packages that are being required in the given packages. (detects direct and nested dependencies)
 * @param base - The base directory of your public files.
 * @param packname - One or more entry points.
 */
export default function getRelatedPacks (base: string, ...packname: string[]): List<string> {
  const related = new List<string>()
  const discovered = new List<string>(...packname)

  do {
    const current = discovered.pop()
    related.add(current)

    const {
      required,
      registered
    } = parseModule(base, current)

    const uncovered = required.uncovered(registered).uncovered(related)

    discovered.add(...uncovered)
  } while (discovered.length)

  return related
}
