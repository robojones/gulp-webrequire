import * as fs from 'fs'
import { Transform } from 'stream'
import * as through from 'through2'
import * as Vinyl from 'vinyl'
import VinylWithRequirements from '../VinylWithRequirements'
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

  const stream = through.obj(function transform (origin: Vinyl, enc, cb) {
    const callback = cb as (error?: Error, file?: Vinyl) => void

    console.log('origin', origin.relative)

    parser.parse(origin).then(() => {
      callback()
    }).catch(error => {
      this.emit('error', error)
      callback()
    })
  })

  parser.on('file', file => {
    console.log('got file:', file.path)
    stream.push(file)
  })

  return stream
}

const snippetPath = require.resolve('../browser/snippet.min.js')
/** A string containing the inline snippet of the current webRequire version. */
export const snippet = fs.readFileSync(snippetPath).toString()

export default webRequire