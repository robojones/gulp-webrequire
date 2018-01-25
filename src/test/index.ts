import * as assert from 'assert'
import { generateTags } from '..'

const g = (global as any)

describe('gulp-webrequire', () => {
  before(() => {
    g.window = {}
  })

  it('should work', function (cb) {
    this.timeout(30000)

    // initialize
    require('../browser/snippet.min.js')

    generateTags('build/test-resources', 'main.js', {
      tagGenerator: (packagePath, contents) => {
        require('../test-resources/' + packagePath)
        return ''
      }
    })

    g.window.registerModule([['./main.js', 'main.js']], 'hi', (module, exports, require) => {
      cb()
    })
  })
})
