import Concat = require('concat-with-sourcemaps')
import { Transform } from 'stream'
import * as through from 'through2'
import * as Vinyl from 'vinyl'
import VinylWithRequirements from '../VinylWithRequirements'

export default function wrap (): Transform {
  const stream = through.obj((file: VinylWithRequirements, enc, cb) => {
    if (file.wrapper) {
      const concat = new Concat(!!file.sourceMap, file.relative)
      const { pre, post } = file.wrapper
      concat.add(pre.relative, pre.contents, pre.sourceMap)
      concat.add(file.relative, file.contents, file.sourceMap)
      concat.add(post.relative, post.contents, post.sourceMap)

      console.log('merging: ', pre.relative, file.relative, post.relative)

      file.contents = concat.content
      file.sourceMap = JSON.parse(concat.sourceMap)
      cb(null, file)
    } else {
      console.log('file has no wrappers', file.relative)
      // ignore this file because it's a prefix or postfix
      cb()
    }
  })

  return stream
}
