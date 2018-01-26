import * as fs from 'fs'
import * as path from 'path'
import * as Vinyl from 'vinyl'
import initSourcemap from '../lib/initSourcemap'

const snippetPath = require.resolve('../browser/snippet.min.js')

const stat = fs.statSync(snippetPath)

/** A string containing the inline snippet of the current webrequire version. */
export const snippet = fs.readFileSync(snippetPath)

export default function importSnippet (cwd: string, base: string): Vinyl {
  const file = new Vinyl({
    base,
    contents: snippet,
    cwd,
    path: path.resolve(base, 'module(/webrequire.js'),
    stat,
  })

  initSourcemap(file)

  return file
}
