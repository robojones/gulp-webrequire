#! /usr/bin/env node

import * as program from 'commander'
import * as fs from 'fs'
import * as path from 'path'

const indent = ' '.repeat(19)

const MSG =
  `The dependencies of the given file(s) have been analyzed.
You need to include the following <script> tags in the <head> section of you website:\n`

const PREFIX_DESCRIPTION =
  `A string that will prepended to the urls.
${indent}By default the paths look like "/script.js" or
${indent}"/module/jquery.js"
${indent}The prefix can look like "https://example.com/static"
${indent}The final URL would then be
${indent}"https://example.com/static/script.js"`

const SUFFIX_DESCRIPTION =
  `A string that will appended to the urls.
${indent}The prefix can look like "?something=1"
${indent}The final URL would then be "/script.js?something=1"`

interface Options {
  prefix?: string
  suffix?: string
  hideSnippet: boolean|undefined
  hideHint: boolean|undefined
}

const g = (global as any)

program
  .version(require('../../package.json').version)
  .option('--prefix <prefix>', PREFIX_DESCRIPTION)
  .option('--suffix <suffix>', SUFFIX_DESCRIPTION)
  .option('--hide-hint', 'Hide the message before the script tags.')
  .option('--hide-snippet', 'Hide the inline script tag.')
  .arguments('[files...]')
  .action(action)

program.parse(process.argv)

function action (files: string[], options: Options) {
  const prefix = options.prefix || ''
  const suffix = options.suffix || ''

  const entryPaths: string[] = files.map(file => path.resolve(file))
  const urls: string[] = []

  for (const entryPath of entryPaths) {
    let baseDir: string = null

    g.window = {
      registerModule (requirements: Array<[string, string]>, name: string) {
        if (!baseDir) {
          baseDir = entryPath.substr(0, entryPath.length - name.length)
        }

        // add the url
        const url = prefix + name + suffix
        if (urls.includes(url)) {
          return
        }

        urls.push(url)

        for (const [, requirement] of requirements) {
          const file = path.join(baseDir, requirement)
          require(file)
        }
      }
    }

    require(entryPath)
  }

  urls.sort()

  if (!options.hideHint) {
    console.log(MSG)
  }

  if (!options.hideSnippet) {
    const snippetPath = require.resolve('../browser/snippet.min.js')
    const snippet = fs.readFileSync(snippetPath)
    console.log(`<script>\n${snippet}\n</script>`)
  }

  for (const url of urls) {
    console.log(`<script src="${url}" async></script>`)
  }
}
