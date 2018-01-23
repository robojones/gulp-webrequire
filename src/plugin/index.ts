import * as fs from 'fs'
import Project, { ProjectOptions } from './Project'

/**
 * Use require in the browser with this gulp plugin.
 * @example
 *  gulp.src('src/*.ts')
 *    .pipe(webrequire().through())
 *    .pipe(gulp.dest('build'))
 */
export default function webrequire (options: ProjectOptions = {}): Project {
  return new Project(options)
}

const snippetPath = require.resolve('../browser/snippet.min.js')
/** A string containing the inline snippet of the current webrequire version. */
export const snippet = fs.readFileSync(snippetPath).toString()
