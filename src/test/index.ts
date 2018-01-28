import * as assert from 'assert'
import { generateTags } from '..'

const g = (global as any)

describe('gulp-webrequire', () => {
  before(() => {
    g.window = {}
  })

  it('should work', function () {
    this.timeout(30000)

    const tags = generateTags('build/test-resources', 'main.js', {
      tagGenerator: (packagePath) => {
        return packagePath + '\n'
      }
    })

    console.log(tags)
  })
})
