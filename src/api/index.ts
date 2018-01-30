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
   * A custom function that gets the path to the file and its contents passed.
   * It returns a string containing the html script-tag for the given file.
   */
  tagGenerator?: TagGenerator
  /**
   * Gulp-webrequire will cache which files are in which packs.
   * To disable this behaviour you can set this option to false.
   * (default: true)
   */
  cache?: boolean
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
  options: Options = {}
): string {
  const mergedOptions = Object.assign({}, globalOptions, options)

  const mappingFilename = path.resolve(base, 'webrequire-mappings.js')

  // Remove old mappings.
  if (mergedOptions.cache) {
    delete require.cache[mappingFilename]
  }

  // Import mappings.
  const mappings = require(mappingFilename)
  mappingFiles.push(mappingFilename)

  const files = (Array.isArray(entryPoint)) ? entryPoint : [entryPoint]
  const packs = new List<string>()

  for (const file of files) {
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
 */
export function setup (options: Options): void {
  Object.assign(globalOptions, options)
}
