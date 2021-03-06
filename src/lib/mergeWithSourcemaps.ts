import Concat = require('concat-with-sourcemaps')
import * as path from 'path'
import * as Vinyl from 'vinyl'
import initSourcemap from './initSourcemap'
import SourceMap from './SourceMap'

/**
 * Merges one or multiple files and applies the resulting sourcemap and contents to the target.
 * @param target - The file to merge the other files in.
 * @param files - The other files.
 */
export default function mergeWithSourcemaps (
  target: Vinyl,
  files: Array<Vinyl|string>,
  options: {
    /** If set to true this module will try to fix sourcemaps generated by gulp-sourcemaps. (default: false) */
    fixGulpSourcemaps?: boolean,
    /** If set to true sourcemaps for files with .ts extension will also be fixed. (default: false) */
    typescript?: boolean
  } = {}
): Vinyl {
  const concat = new Concat(!!target.sourceMap, path.basename(target.path))
  for (const file of files) {
    let contents: Buffer|string
    let relative: string
    let sourceMap: SourceMap

    if (typeof file === 'string') {
      contents = file
      relative = null
      sourceMap = initSourcemap(null, file)

    } else {
      contents = file.contents as Buffer
      relative = file.relative
      sourceMap = file.sourceMap as SourceMap

      // Fix gulp-sourcemaps error.
      if (file.sourceMap && options.fixGulpSourcemaps) {
        // Find relative path in sources.
        let i = sourceMap.sources.indexOf(relative)
        if (i === -1 && options.typescript) {
          // Not found? -> Try to find typescript path.
          relative = relative.substr(0, relative.lastIndexOf('.')) + '.ts'
          i = sourceMap.sources.indexOf(relative)
        }

        const absolute = path.join(file.base, relative)
        const filename = path.relative(target.dirname, absolute)

        if (i !== -1) {
          sourceMap.sources[i] = filename
        }
      }
    }
    concat.add(relative, contents, sourceMap)
  }

  target.contents = concat.content
  if (concat.sourceMap) {
    target.sourceMap = JSON.parse(concat.sourceMap)
  }

  return target
}
