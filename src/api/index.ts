import * as path from 'path'
import List from '../lib/List'

/**
 * A list containing the paths to all mapping files that have been imported.
 */
const mappingFiles = new List<string>()

export const defaultTagGenerator: TagGenerator = (packagePath: string): string => {
  return `<script src="${packagePath}" async></script>`
}

const globalOptions: Options = {
  cache: true,
  tagGenerator: defaultTagGenerator
}

/**
 * A function that gets called for each pack and generates a script tag for the pack.
 * @param packagePath - The path to the pack relative to the base.
 * @example
 * (packagePath) => `<script src="https://somedomain.com/${packagePath}" async></script>`
 */
export type TagGenerator = (packagePath: string) => string

export interface Options {
  /**
   * The directory where your public javascript files are located.
   * @example
   * { base: 'public/js' }
   */
  base?: string
  /**
   * Gulp-webrequire will cache which files are in which packs.
   * To disable this behaviour you can set this option to false.
   * (default: true)
   * @example
   * { cache: process.env.NODE_ENV !== 'development' }
   */
  cache?: boolean
  /**
   * A custom function that gets the path to the file and its contents passed.
   * It returns a string containing the html script-tag for the given file.
   * @example
   * { tagGenerator: (path) => `<script src="https://example.com/${path}" async></script>` }
   */
  tagGenerator?: TagGenerator
}

/**
 * Generate script tags for all packs that are related to your entry point(s).
 * @param entryPoints - Entry points to your code relative to the base directory. (The file extension should be set.)
 * @param options - A function that generates script tags.
 */
export default function generateTags (
  entryPoint: string | string[],
  options: Options = {}
): string {
  const mergedOptions = Object.assign({}, globalOptions, options)

  if (typeof mergedOptions.base === 'undefined') {
    throw new TypeError('gulp-webrequire: '
    + 'base not set!'
    + 'You need to set a base directory where your javascript files are located (e.g. "public/js").'
    + 'Your can specify it using the setup() method or directly in the generateTags method.')
  }

  const mappingFilename = path.resolve(mergedOptions.base, 'webrequire-mappings.js')

  // Remove old mappings.
  if (!mergedOptions.cache) {
    delete require.cache[mappingFilename]
  }

  // Import mappings.
  const mappings = require(mappingFilename)
  mappingFiles.push(mappingFilename)

  const files = (Array.isArray(entryPoint)) ? entryPoint : [entryPoint]
  const packs = new List<string>()

  for (const file of files) {
    if (!mappings[file]) {
      throw new Error(`File "${file}" is not an entry point.`
       + 'If it should be an entry point you can add it to the entryPoints option of gulp-webrequire.')
    }

    packs.add(...mappings[file])
  }

  let html = ''

  const tagGenerator: TagGenerator = mergedOptions.tagGenerator

  for (const pack of packs) {
    // set/overwrite tagCache
    const tag = tagGenerator(pack)

    if (typeof tag !== 'string') {
      throw new Error('options.tagGenerator must return a string. Instead got: ' + typeof tag)
    }

    html += tag
  }

  return html
}

/**
 * Set options for the generateTags() method.
 * The options will be overloaded by the ones that you set in the generateTags() method.
 * @example
 * setup({
 *   base: 'public/js',
 *   cache: process.env.NODE_ENV !== 'development'
 * })
 */
export function setup (options: Options): void {
  Object.assign(globalOptions, options)
}
