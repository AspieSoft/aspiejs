# Aspie JS

![npm version](https://img.shields.io/npm/v/@aspiesoft/aspiejs)
![GitHub top language](https://img.shields.io/github/languages/top/aspiesoft/aspiejs)
![GitHub license](https://img.shields.io/github/license/aspiesoft/aspiejs)

![npm downloads](https://img.shields.io/npm/dw/@aspiesoft/aspiejss)
![npm downloads](https://img.shields.io/npm/dm/@aspiesoft/aspiejs)
![jsDelivr hits (GitHub)](https://img.shields.io/jsdelivr/gh/hm/aspiesoft/aspiejs)

[![paypal](https://img.shields.io/badge/buy%20me%20a%20coffee-paypal-blue)](https://buymeacoffee.aspiesoft.com/)

## A modified script that compiles to JavaScript

This project is still in beta, and is mostly the same as JavaScript.
This purpose of this module is to add some additional syntax to JavaScript.
This may be updated with new features added in the future.

## Whats New

- added import and export key words (similar to typescript syntax)

## Installation

```shell script
npm install @aspiesoft/aspiejs

# install without terser (optional)
npm install --no-optional @aspiesoft/aspiejs
```

## Setup

```js
const aspieJS = require('@aspiesoft/aspiejs');
```

## Usage

```js

// to compile a file from aspieJS to JavaScript
aspieJS.file(__dirname+'/path/to/file.js', __dirname+'/path/to/file.min.js');

// to compile a string
const output = aspieJS.script(`
validFunction(){
  console.log('This function is valid in Aspie JS!')
}

log(2^2) // => console.log(Math.pow(2^2))
`);

// to compile a string in async (and minify with terser if available)
aspieJS.scriptAsync('My AspieJS Script!').then(output => {
  // do stuff...
});

// to compile a file in sync
aspieJS.fileSync(__dirname+'/path/to/file', __dirname+'/path/to/file.output');

```

## Custom Syntax

```js

// Math.pow
let n = 2 ^ 2
n ^= 5

// nth root (Math.sqrt)
let n = 4 \ 2
n \= 5 // 5th root (n = Math.pow(n, 1/5))

// absolute value (Math.abs)
|2 - 10| // output: 8
2 - 10 // output: -8

let circumference = pi // => let circumference = Math.PI

// rounding (used Math.round with some multiplication and division)
// JavaScripts .toFixed method does not handle negative values
log(circumference ~ 0) // output: 3
circumference ~= 2
log(circumference) // output 3.14

// typeof is modified to output other common var types
typeof 'string' === 'string'
typeof /regex/ === 'regex'
typeof [1, 2, 3] === 'array'
typeof {key: 'value'} === 'object'
typeof null === 'null'

// regex modifications
/number \c/ // => /number (?:-?[0-9]+(?:\\.[0-9]+|)|-?\\.[0-9]+)/

// in addition, objects are auto closed to prevent errors
{[1, 2], [3, 4} // compiles to => {[1, 2], [3, 4]}

```
