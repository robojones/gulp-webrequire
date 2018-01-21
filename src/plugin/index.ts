import * as fs from 'fs'
import * as sourcemaps from 'gulp-sourcemaps'
import { Transform } from 'stream'
import * as through from 'through2'
import importDependencies from './import'
import detectSourcemaps from './sourcemaps'
import VinylWithRequirements from './VinylWithRequirements'
import wrapFile from './wrap'

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason)
  // application specific logging, throwing an error, or other logic here
})

/**
 * Use require in the browser with this gulp plugin.
 * @example
 *  gulp.src('src/*.ts')
 *    .pipe(webRequire())
 *    .pipe(gulp.dest('build'))
 */
export default function webRequire (): Transform {
  const importeur = importDependencies()
  const wrapper = wrapFile()

  const initSourcemaps = detectSourcemaps(() => {
    console.log('SOURCEMAPS DETECTED!')
    // init sourcemaps for imported files if sourcemaps are enabled
    importeur.unpipe(wrapper)
    importeur.pipe(sourcemaps.init()).pipe(wrapper)
  })

  initSourcemaps.pipe(importeur)
  importeur.pipe(wrapper)


  const inOut = through.obj((file, enc, cb) => {
    initSourcemaps.write(file, cb)
  }, function flush (cb) {
    initSourcemaps.end()
    wrapper.on('end', cb)
    console.log('END')
  })

  wrapper.on('data', (file) => inOut.push(file))
  inOut.on('data', (file: VinylWithRequirements) => {
    console.log('RESULT', typeof file.sourceMap)
  })

  return inOut
}

const snippetPath = require.resolve('../browser/snippet.min.js')
/** A string containing the inline snippet of the current webRequire version. */
export const snippet = fs.readFileSync(snippetPath).toString()
