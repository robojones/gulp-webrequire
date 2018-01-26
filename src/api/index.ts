import * as path from 'path'
import List from '../lib/List'
import getRelatedPacks from './getRelatedPacks'
import contentsCache from './parseModule'

/**
 * Contains all related packs of a pack.
 */
const tagCache: {
  [packname: string]: string
} = {}

/**
 * A function that gets called for each pack and generates a script tag for the pack.
 * @param packagePath - The path to the pack relative to the base.
 * @example
 * (packagePath) => `<script src="https://somedomain.com/${packagePath}" async></script>`
 */
export type TagGenerator = (packagePath: string, contents: Buffer) => string

export const defaultTagGenerator: TagGenerator = (packagePath: string, contents: Buffer): string => {
  return `<script src="${path.join(path.sep, packagePath)}" async></script>`
}

/**
 * Generate script tags for all packs that are related to your entry point(s).
 * @param base - The directory that contains your public javascript files.
 * @param entryPoints - Entry points to your code relative to the base directory. (The file extension should be set.)
 * @param options - A function that generates script tags.
 */
export default function generateTags (
  base: string,
  entryPoint: string | string[],
  options: {
    /**
     * A custom function that gets the path to the file and its contents passed.
     * It returns a string containing the html script-tag for the given file.
     */
    tagGenerator?: TagGenerator,
    /**
     * Gulp-webrequire will cache the results of the tagGenerator.
     * The tagGenerator will never be called with the same path twice.
     * This option lets you disable the cache by setting it to false.
     * (default: true)
     */
    cacheTags?: boolean
  } = {}
): string {
  let html = ''

  const entryPoints: string[] = Array.isArray(entryPoint) ? entryPoint : [entryPoint]
  const related = getRelatedPacks(base, ...entryPoints)
  const tagGenerator: TagGenerator = options.tagGenerator || defaultTagGenerator

  for (const pack of related) {
    if (!tagCache[pack] || options.cacheTags === false) {
      const tag = tagGenerator(pack, contentsCache[pack])

      if (typeof tag !== 'string') {
        throw new Error('options.tagGenerator must return a string. Instead got: ' + typeof tag)
      }

      tagCache[pack] = tag
    }

    html += tagCache[pack]
  }

  return html
}
