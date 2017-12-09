#! /usr/bin/env node

import * as program from 'commander'
import * as fs from 'fs'
import * as path from 'path'

const indent = ' '.repeat(19)

const MSG =
  `The dependencies of the given file(s) have been analyzed.
You need to include the following <script> tags in the <head> section of you website:\n`

const PREFIX_DESCRIPTION =
  `A string that will prepended the urls in the scripttag.
${indent}By default the paths look like "/script.js" or "/module/jquery.js"
${indent}The prefix can look like "https://example.com/static"
${indent}The final URL would then be "https://example.com/static/script.js"`

const SUFFIX_DESCRIPTION =
  `A string that will appended the urls in the scripttag.
${indent}The prefix can look like "?something=1"
${indent}The final URL would then be "/script.js?something=1"`

interface Options {
  prefix?: string
  suffix?: string
  hint: boolean
}

const g = (global as any)

program
  .version(require('../../package.json').version)
  .option('--prefix <prefix>', PREFIX_DESCRIPTION)
  .option('--suffix <suffix>', SUFFIX_DESCRIPTION)
  .option('--no-hint', 'Hide the message before the script tags.')
  .arguments('[files...]')
  .action((files: string[], options: Options) => {
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

    const snippetPath = require.resolve('../browser/head.min.js')
    const snippet = fs.readFileSync(snippetPath)

    if (options.hint) {
      console.log(MSG)
    }

    console.log(`<script>\n${snippet}\n</script>`)

    for (const url of urls) {
      console.log(`<script src="${url}" async></script>`)
    }
  })

program.parse(process.argv)
