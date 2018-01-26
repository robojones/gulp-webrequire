import * as Vinyl from 'vinyl'
import SourceMap from './SourceMap'

/**
 * Initializes a sourcemap for the file.
 * @param file - The file to apply the sourcemaps.
 * @param options - Options for the sourcemap.
 */
export default function initSourcemap (
  file: Vinyl,
  options: {
    /** If set to true, null will be used as source name in the sourcemap. (default: false) */
    noSource?: boolean
  } = {}
) {
    let name: string
    if (options.noSource) {
      name = null
    } else {
      name = file.relative
    }

    const sourceMap: SourceMap = {
      file: name,
      mappings: '',
      names: [],
      sources: [ name ],
      sourcesContent: [ file.contents.toString() ],
      version: 3,
    }

    file.sourceMap = sourceMap
  }
