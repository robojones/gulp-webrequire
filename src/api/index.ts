import * as fs from 'fs'
import * as path from 'path'
import List from '../lib/List'
import getRelatedPacks from './getRelatedPacks'
import contentsCache from './parseModule'


const snippetPath = require.resolve('../browser/snippet.min.js')
/** A string containing the inline snippet of the current webrequire version. */
export const snippet = fs.readFileSync(snippetPath).toString()

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
type TagGenerator = (packagePath: string, contents: Buffer) => string

export const defaultTagGenerator: TagGenerator = (packagePath: string, contents: Buffer): string => {
  return `<script src="${path.join(path.sep, packagePath)}" async></script>`
}

/**
 * Generate script tags for all packs that are related to your entry point(s).
 * @param base - The directory that contains your public javascript files.
 * @param entryPoints - Entry points to your code relative to the base directory.
 * @param tagGenerator - A function that generates script tags.
 */
export default function tags (
  base: string,
  entryPoint: string | string[],
  options: {
    tagGenerator?: TagGenerator,
    cacheTags?: false
  } = {}
): string {
  let html = `<script>${snippet}</script>`

  const entryPoints: string[] = Array.isArray(entryPoint) ? entryPoint : [entryPoint]
  const related = getRelatedPacks(base, ...entryPoints)

  for (const pack of related) {
    if (!tagCache[pack] || options.cacheTags === false) {
      tagCache[pack] = (options.tagGenerator || defaultTagGenerator)(pack, contentsCache[pack])
    }

    html += tagCache[pack]
  }

  return html
}
