# gulp-webrequire

Use require in the browser with this gulp plugin.

[![CircleCI](https://circleci.com/gh/robojones/gulp-webrequire.svg?style=shield)](https://circleci.com/gh/robojones/gulp-webrequire)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```
npm install --save gulp-webrequire
```

## Key features
- Use __require__ in you client side javascript.
- Require __NPM modules__.
- Full __sourcemap__ support with [gulp-sourcemaps](https://npmjs.com/package/gulp-sourcemaps).
- Dynamic package creation with __smart packing__.
- __Script tag__ generator.

## Table of contents
- [How it works](#how-it-works)
- [Setup with gulp](#setup-with-gulp)
  - [Project](#project)
    - [Options](#options)
    - [Project#through](#projectthrough)
- [How to find out what script tags need to be added to your HTML](#how-to-find-out-what-script-tags-need-to-be-added-to-your-html)
  - [generateTags()](#setup)
  - [setup()](#setup)
  - [Examples](#examples)

## How it works

The difference between this plugin and other solution like webpack is, that it does not create a single .js file containing all of your code.
Instead it detects the references between your modules and builds packages out of them using a __smart packing__ algorithm.

__Smart packing?__

The most important facts are:
- Every module that is not required by any other module is considered an entry point. You can generate script tags for these entry points later on by using the [api](#how-to-find-out-what-script-tags-need-to-be-added).
- No module will be included multiple packs. → All files can be cached by the browser and no module will be loaded twice.

__So why should I use this?__

The advantage of __not packing__ all your code into __one big `.js` file__ is, that you can decide when a resource is loaded.
So instead of downloading a whole bunch of JavaScript, where you only need a fraction of it, you can load only what's needed.
This lets you take advantage of the browser cache and improves your website performance.

__How is this better than adding script-tags the old-fashioned way?__

`gulp-webrequire` generates script tags with the `async` attribute.
This will allow your JavaScript files to be loaded parallely.
You don't need to worry about the order in which your scripts are executed - If one of your scripts requires another one,
`gulp-webrequire` will make sure that the required file is executed first.
It is also guaranteed that your scripts will be __executed after the "DOMContentLoaded" event__ was emitted.


## Setup with gulp

Example with `gulp-webrequire` and `gulp-minify`

In your `gulpfile.json`:

```javascript
const gulp = require('gulp')
const minify = require('gulp-minify')
const sourcemaps = require('gulp-sourcemaps')
const { webrequire } = require('gulp-webrequire')

const project = webrequire()

gulp.task('javascript', function () {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(project.through())
    .pipe(minify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('public/'))
})

gulp.task('default', ['javascript'])
```

### Project

You can create a project using the factory:

```javascript
const { webrequire } = require('gulp-webrequire')
const project = webrequire(options)
```

Or by using the class directly:

```javascript
const { Project } = require('gulp-webrequire')
const project = new Project(options)
```


- options
  - __entryPoints__ `<string[]>` - Manually add entry points if they are not automatically detected. (In theory you will never have to use this)
  - __modulesDir___ `<string>` - Will be used in the sourcemaps as the directory that contains NPM modules that you use in your code. This is purely aesthetic. (Default: `modues/`)

### Project#through()
This method returns a stream that you can use in your gulp task to pipe files through. You **must** create a new stream for each gulp task.

```javascript
const gulp = require('gulp')
const { webrequire } = require('gulp-webrequire')

// Create a project
const project = webrequire()

gulp.task('javascript', function () {
  return gulp.src('src/**/*.js')
    .pipe(project.through()) // This is where the magic happens.
    .pipe(gulp.dest('public/'))
})
```

## How to find out what script tags need to be added to your HTML

Gulp-webrequire comes with an extremely nice api that you can use in your code (e.g. directly in your view engine).
```javascript
const { generateTags, setup } = require('gulp-webrequire')

setup({ base: 'public/js' })
generateTags(['login.js', 'menu.js'])
```

The generateTags method will find all js files that are being imported in the `login.js` and `menu.js` file.
It will then return HTML script tags for these files as one big string.
Your can use the returned string to render it into your website's HTML.

### generateTags()

This method allows you to generate scripttags for all files that are related to an entry point.

```javascript
const { generateTags } = require('gulp-webrequire')
generateTags(entryPoint, options)
```

- entryPoints `<string|string[]>` - Entry points to your code relative to the base directory. (The file extension should be set.)
- options
  - base `<string>` - The directory that contains your public javascript files.
  - tagGenerator `<function>` - A function that receives a path and generates a script-tag for it. The path is relative to the base directory and does not begin with a `/`.
  - cache `<boolean>` - Gulp-webrequire will cache which files are in which packs. To disable this behaviour you can set this option to false. (default: `true`)

### setup()

With this method you can change default options for the generateTags method.

```javascript
const { setup } = require('gulp-webrequire')
setup (options)
```

- options - The same ones that your can set in the [generateTags](#generatetags-method) method.

### Examples

#### Express & EJS

Your nodejs app:

```javascript
const app = require('express')()
const { generateTags, setup } = require('gulp-webrequire')

setup({
  base: 'public/js'
})

app.get('/login', function(req, res){ 
  const tags = generateTags('login.js')
  res.render('index', {
    scriptTags: tags
  })
})

app.listen(80)
```

In your EJS view:

```html
<html>
  <head>
    <title>Login</title>
    <%- scriptTags %>
  </head>
  <body>
    ...your html...
  </body>
</html>
```

#### Marko view engine
```marko
$ var webrequire = require('gulp-webrequire').generateTags;
html
  head
    title -- Login
    -- $!{webrequire('login.js', { base: 'public/js' })}
  body
    ...your website...
```
