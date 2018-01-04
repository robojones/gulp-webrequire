import * as fs from 'fs'
import { PluginError } from 'gulp-util'
import { Transform } from 'stream'
import * as Vinyl from 'vinyl'
import Parser from './Parser'

/**
 * Use require in the browser with this gulp plugin.
 * @example
 *  gulp.src('src/*.ts')
 *    .pipe(webRequire())
 *    .pipe(gulp.dest('build'))
 */
export function webRequire (): Transform {
  const parser = new Parser()

  function transform (chunk, enc, cb) {
    const origin = chunk as Vinyl
    const callback = cb as (error?: Error, file?: Vinyl) => void

    parser.on('file', file => {
      this.push(file)
    })

    parser.parse(origin).then(() => {
      callback(null, origin)
    }).catch(error => {
      const gulpError = new PluginError('gulp-webrequire', error, {
        showProperties: false
      })

      this.emit('error', gulpError)
      callback()
    })
  }

  return new Transform({
    objectMode: true,
    transform
  })
}

const snippetPath = require.resolve('../browser/head.min.js')
/** A string containing the inline snippet of the current webRequire version. */
export const snippet = fs.readFileSync(snippetPath).toString()

export default webRequire
