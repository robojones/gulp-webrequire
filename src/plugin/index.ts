import * as fs from 'fs'
import '../lib/logs'
import Project, { ProjectOptions } from './Project'

export {
  Project
}

/**
 * Use require in the browser with this gulp plugin.
 * @example
 *  gulp.src('src/*.ts')
 *    .pipe(webrequire().through())
 *    .pipe(gulp.dest('build'))
 */
export function webrequire (options: ProjectOptions = {}): Project {
  return new Project(options)
}

export default webrequire
