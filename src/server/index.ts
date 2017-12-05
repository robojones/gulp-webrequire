import { Transform } from 'stream'
import * as Vinyl from 'vinyl'
import Parser from './Parser'

export interface ParserOptions {
  none: void
}

export function webRequire (options) {
  const parser = new Parser()

  function transform (chunk, enc, cb) {
    const origin = chunk as Vinyl
    const callback = cb as (error: Error, file?: Vinyl) => void

    parser.on('file', file => {
      this.push(file)
    })

    parser.parse(origin).then(() => {
      callback(null, origin)
    }).catch(error => {
      callback(error)
    })
  }

  return new Transform({
    objectMode: true,
    transform
  })
}

export default webRequire
