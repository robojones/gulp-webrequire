import * as fs from 'fs'
import * as path from 'path'
import * as Vinyl from 'vinyl'
import initSourcemap from '../lib/initSourcemap'

const snippetPath = require.resolve('../snippet/webrequire.min.js')

const stat = fs.statSync(snippetPath)

/** A string containing the inline snippet of the current webrequire version. */
export const snippet = fs.readFileSync(snippetPath)

export default function getSnippet (cwd: string, base: string, modulesDir: string): Vinyl {
  const file = new Vinyl({
    base,
    contents: snippet,
    cwd,
    path: path.join(cwd, base, modulesDir, 'webrequire.js'),
    stat,
  })

  file.sourceMap = initSourcemap(file.relative, file.contents)

  return file
}
