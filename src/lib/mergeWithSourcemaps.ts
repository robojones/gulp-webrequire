import Concat = require('concat-with-sourcemaps')
import * as path from 'path'
import * as Vinyl from 'vinyl'
import sourceMap from './SourceMap'
import SourceMap from './SourceMap'

/**
 * Merges one or multiple files and applies the resulting sourcemap and contents to the target.
 * @param target - The file to merge the other files in.
 * @param files - The other files.
 */
export default function mergeWithSourcemaps (
  target: Vinyl,
  files: Vinyl[],
  options: {
    fixGulpSourcemaps?: true,
    typescript?: true
  } = {}
): Vinyl {
  const concat = new Concat(!!target.sourceMap, path.basename(target.path))
  for (const file of files) {
    // Fix gulp-sourcemaps error.
    if (file.sourceMap && options.fixGulpSourcemaps) {
      let relative = file.relative

      const map = file.sourceMap as SourceMap

      // Find relative path in sources.
      let i = map.sources.indexOf(relative)
      if (i === -1 && options.typescript) {
        // Not found? -> Try to find typescript path.
        relative = relative.substr(0, relative.lastIndexOf('.')) + '.ts'
        i = map.sources.indexOf(relative)
      }

      const absolute = path.join(file.base, relative)
      const filename = path.relative(target.dirname, absolute)

      if (i !== -1) {
        map.sources[i] = filename
      }
    }

    concat.add(file.relative, file.contents, file.sourceMap)
  }

  target.contents = concat.content
  if (concat.sourceMap) {
    target.sourceMap = JSON.parse(concat.sourceMap)
  }

  return target
}
