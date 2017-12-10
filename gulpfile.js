const gulp = require('gulp')
const ts = require('gulp-typescript')
const { Transform } = require('stream')
const merge = require('merge2')
const minify = require('gulp-minify')
const pump = require('pump')

const TS_SETTINGS = {
  declaration: true,
  target: 'esnext',
  lib: ['es2017'],
  moduleResolution: 'node',
  module: 'commonjs',
  declaration: true,
  importHelpers: true,
  inlineSourceMap: true,
  listFiles: false,
  traceResolution: false,
  pretty: true
}

const serverTS = ts.createProject(TS_SETTINGS)

gulp.task('typescript-server', function () {

  const tsResult = gulp.src(['src/server/**/*.ts'])
    .pipe(serverTS())

  return merge([
    tsResult.dts.pipe(gulp.dest('build/server')),
    tsResult.js.pipe(gulp.dest('build/server'))
  ])
})

const cliTS = ts.createProject(TS_SETTINGS)

gulp.task('typescript-cli', function () {

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

gulp.task('typescript-browser', function () {

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

gulp.task('typescript-test', function () {

  const tsResult = gulp.src(['src/test/**/*.ts'])
    .pipe(testTS())

  return merge([
    tsResult.dts.pipe(gulp.dest('build/test')),
    tsResult.js.pipe(gulp.dest('build/test'))
  ])
})

const resourcesTS = ts.createProject(TS_SETTINGS)

gulp.task('typescript-test-resources', function () {

  const tsResult = gulp.src('src/test-resources/**/*.ts')
    .pipe(resourcesTS())

  const webRequire = require('.').default

  return merge([
    tsResult.dts.pipe(gulp.dest('build/test-resources')),
    tsResult.js.pipe(webRequire()).pipe(gulp.dest('build/test-resources')).on('error', err => console.log(err.toString()))
  ])
})

gulp.task('typescript-watch', function () {
  gulp.watch('src/server/**/*.ts', ['typescript-server'])
  gulp.watch('src/browser/**/*.ts', ['typescript-browser'])
  gulp.watch('src/cli/**/*.ts', ['typescript-cli'])
  gulp.watch('src/test/**/*.ts', ['typescript-test'])
  gulp.watch('src/test-resources/**/*.ts', ['typescript-test-resources'])
})

gulp.task('typescript', ['typescript-server', 'typescript-browser', 'typescript-cli'])
gulp.task('test', ['typescript-test', 'typescript-test-resources'])
gulp.task('default', ['typescript', 'test', 'typescript-watch'])
