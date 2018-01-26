# gulp-webrequire

Use require in the browser with this gulp plugin.

[![CircleCI](https://circleci.com/gh/robojones/gulp-webrequire.svg?style=shield)](https://circleci.com/gh/robojones/gulp-webrequire)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```
npm install --save gulp-webrequire
```

## How it works

The difference between this plugin and other solution like webpack is, that it does not create a single .js file containing all of your code.
Instead it detects the references between your files and builds packages out of them using a __smart packing__ algorithm.

__Smart packing?__
It is really nice, trust me! I am planning to write a small wiki page about it.

The most important facts are:
- The files will be bundled.
- The packs can be cached from the browser.
- No file will be included multiple packs.

__So why should I use this?__

In your code your can use the [api](#how-to-find-out-what-scripts-tags-need-to-be-added.) to __generate script tags__ for all packs that are related to one or more entry points.

The advantage of __not packing__ all your code into one big `.js` file is, that you can decide when a resource is loaded.
So instead of downloading a whole bunch of JavaScript at once, where you only need a fraction of it, you can load only what's needed.
This lets you take advantage of the browser cache and improves your website performance.

__How is this better than adding script-tags the old-fashioned way?__

`gulp-webrequire` generates script tags with the `async` attribute.
This will allow your script files to be loaded parallely.
You don't need to worry about the order in which your scripts are executed - If one of your scripts requires another one,
`gulp-webrequire` will make sure that the required file is executed first.

## Setup with gulp

Example with `gulp-webrequire` and `gulp-minify`

In your `gulpfile.json`:

```javascript
const gulp = require('gulp')
const minify = require('gulp-minify')
const { webrequire } = require('gulp-webrequire')

gulp.task('javascript', function () {
  return gulp.src('src/**/*.js')
    .pipe(webrequire())
    .pipe(minify())
    .pipe(gulp.dest('public/'))
})

gulp.task('default', ['javascript'])
```

## How to find out what scripts tags need to be added

Gulp-webrequire comes with an extremely nice api that you can use in your code (e.g. directly in your view engine).
```javascript
const { generateTags } = require('gulp-webrequire')

generateTags('public/js', ['login.js', 'menu.js'])
```

The generateTags method will find all js files that are being imported in the `login.js` and `menu.js` file.
It will then return HTML script tags for these files as one big string.
Your can use the returned string to render it into your website's HTML.

## generateTags method

```typescript
/**
 * Generate script tags for all packs that are related to your entry point(s).
 * @param base - The directory that contains your public javascript files.
 * @param entryPoints - Entry points to your code relative to the base directory. (The file extension should be set.)
 * @param options - A function that generates script tags.
 */
export default function generateTags (
  base: string,
  entryPoint: string | string[],
  options: {
    /** 
     * A custom function that gets the path to the file and its contents passed.
     * It returns a string containing the html script-tag for the given file.
     */
    tagGenerator?: TagGenerator,
    /**
     * Gulp-webrequire will cache the results of the tagGenerator.
     * The tagGenerator will never be called with the same path twice.
     * This option lets you disable the cache by setting it to false.
     * (default: true)
     */
    cacheTags?: boolean
  } = {}
): string
```
