import * as Vinyl from 'vinyl'
import SourceMap from './SourceMap'

/**
 * Initializes a sourcemap for the file.
 * @param name - The name to use in the sourcemap.
 * @param options - Options for the sourcemap.
 * @example
 * // code from a vinyl object
 * initSourcemap(vinyl.relative, vinyl.contents)
 * // code from a string
 * initSourcemap(null, 'this is some code')
 */
export default function initSourcemap (name: string|null, contents: Buffer|string): SourceMap {
  return {
    file: name,
    mappings: '',
    names: [],
    sources: [ name ],
    sourcesContent: [ contents.toString() ],
    version: 3,
  }
}
