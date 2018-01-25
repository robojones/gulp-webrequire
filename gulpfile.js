const gulp = require('gulp')
const ts = require('gulp-typescript')
const { Transform } = require('stream')
const merge = require('merge2')
const minify = require('gulp-minify')
const pump = require('pump')
const sourcemaps = require('gulp-sourcemaps')

const TS_SETTINGS = {
  declaration: true,
  target: 'esnext',
  lib: ['es2017'],
  moduleResolution: 'node',
  module: 'commonjs',
  importHelpers: true,
  inlineSourceMap: true,
  listFiles: false,
  traceResolution: false,
  pretty: true
}

const pluginTS = ts.createProject(TS_SETTINGS)

gulp.task('plugin', function () {

  const tsResult = gulp.src(['src/plugin/**/*.ts'])
    .pipe(pluginTS())

  return merge([
    tsResult.dts.pipe(gulp.dest('build/plugin')),
    tsResult.js.pipe(gulp.dest('build/plugin'))
  ])
})

const libTS = ts.createProject(TS_SETTINGS)
gulp.task('lib', function () {

  const tsResult = gulp.src(['src/lib/**/*.ts'])
    .pipe(libTS())

  return merge([
    tsResult.dts.pipe(gulp.dest('build/lib')),
    tsResult.js.pipe(gulp.dest('build/lib'))
  ])
})

const apiTS = ts.createProject(TS_SETTINGS)
gulp.task('api', function () {

  const tsResult = gulp.src(['src/api/**/*.ts'])
    .pipe(libTS())

  return merge([
    tsResult.dts.pipe(gulp.dest('build/api')),
    tsResult.js.pipe(gulp.dest('build/api'))
  ])
})

const cliTS = ts.createProject(TS_SETTINGS)

gulp.task('cli', function () {

  const tsResult = gulp.src(['src/cli/**/*.ts'])
    .pipe(cliTS())

  return merge([
    tsResult.dts.pipe(gulp.dest('build/cli')),
    tsResult.js.pipe(gulp.dest('build/cli'))
  ])
})

const browserTS = ts.createProject(Object.assign({}, TS_SETTINGS, {
  target: 'es5',
  lib: ['es5', 'dom']
}))

gulp.task('browser', function () {

  const tsResult = gulp.src('src/browser/**/*.ts')
    .pipe(browserTS())

  return merge([
    tsResult.dts.pipe(gulp.dest('build/browser')),
    tsResult.js.pipe(minify({
      ext: {
        src: '.js',
        min: '.min.js'
      }
    }).on('error', console.log)).pipe(gulp.dest('build/browser'))
  ])
})

const testTS = ts.createProject(TS_SETTINGS)

gulp.task('test', function () {

  const tsResult = gulp.src(['src/test/**/*.ts'])
    .pipe(testTS())

  return merge([
    tsResult.dts.pipe(gulp.dest('build/test')),
    tsResult.js.pipe(gulp.dest('build/test'))
  ])
})

const resourcesTS = ts.createProject(TS_SETTINGS)

gulp.task('test-resources', function () {

  const tsResult = gulp.src('src/test-resources/**/*.ts')
  .pipe(sourcemaps.init())  
  .pipe(resourcesTS())

  const webrequire = require('.').default

  return merge([
    tsResult.dts.pipe(gulp.dest('build/test-resources')),
    tsResult.js
      .pipe(webrequire().through())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('build/test-resources')).on('error', err => console.log(err.toString()))
  ])
})

gulp.task('watch', function () {
  gulp.watch('src/plugin/**/*.ts', ['plugin'])
  gulp.watch('src/lib/**/*.ts', ['lib'])
  gulp.watch('src/api/**/*.ts', ['api'])
  gulp.watch('src/browser/**/*.ts', ['browser'])
  gulp.watch('src/cli/**/*.ts', ['cli'])
  gulp.watch('src/test/**/*.ts', ['test'])
  gulp.watch('src/test-resources/**/*.ts', ['test-resources'])
})

gulp.task('typescript', ['lib', 'plugin', 'api', 'browser', 'cli'])
gulp.task('test', ['test', 'test-resources'])
gulp.task('default', ['typescript', 'test', 'watch'])
