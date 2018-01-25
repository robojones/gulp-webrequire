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

const serverTS = ts.createProject(TS_SETTINGS)
gulp.task('server', function () {

  const tsResult = gulp.src(['src/plugin/**/*.ts', 'src/lib/**/*.ts', 'src/api/**/*.ts', 'src/test/**/*.ts', 'src/index.ts'], {
    base: 'src/'
  }).pipe(serverTS())

  return merge([
    tsResult.dts.pipe(gulp.dest('build/')),
    tsResult.js.pipe(gulp.dest('build/'))
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
  gulp.watch(['src/plugin/**/*.ts', 'src/lib/**/*.ts', 'src/api/**/*.ts', 'src/test/**/*.ts'], ['server'])
  gulp.watch('src/browser/**/*.ts', ['browser'])
  gulp.watch('src/test-resources/**/*.ts', ['test-resources'])
})

gulp.task('all', ['server', 'browser'])

gulp.task('default', ['all', 'watch'])
