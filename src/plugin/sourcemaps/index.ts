import sourcemaps from 'gulp-sourcemaps'
import * as through from 'through2'

export default function detectSourcemaps (active: () => void) {
  let detected = false

  return through((file, enc, cb) => {
    if (file.sourceMap && !detected) {
      detected = true
      active()
    }

    cb(file)
  })
}
