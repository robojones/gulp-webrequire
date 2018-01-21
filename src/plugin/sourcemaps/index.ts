import sourcemaps from 'gulp-sourcemaps'
import { Transform } from 'stream'
import * as through from 'through2'

export default function detectSourcemaps (active: () => void): Transform {
  let detected = false


  return through.obj((file, enc, cb) => {
    console.log('original sourcemap type:', typeof file.sourceMap)
    if (file.sourceMap && !detected) {
      detected = true
      active()
    }

    cb(null, file)
  })
}
