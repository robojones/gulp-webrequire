import * as sourcemaps from 'gulp-sourcemaps'
import importDependencies from './import'
import detectSourcemaps from './sourcemaps'

function webrequire () {
  const importeur = importDependencies()
  const wrapper = null

  importeur.pipe(wrapper)

  const stream = detectSourcemaps(() => {
    // init sourcemaps for imported files if sourcemaps are enabled
    importeur.unpipe(wrapper)
    importeur.pipe(sourcemaps.init()).pipe(wrapper)
  })

  stream.pipe(importeur)

  return stream
}
