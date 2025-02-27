# `wasm-pandoc`

**Looking for maintainer:** Johannes Wilm has temporarily taken over maintainership of this package due to there being no package on NPM.
However, he knows very little about wasm and haskell and would like for someone else to take this package again.


The latest version of `pandoc` CLI compiled as a standalone `wasm32-wasi` module that can be run by browsers.

## [Live demo](https://fiduswriter.github.io/wasm-pandoc)

Stdin on the left, stdout on the right, command line arguments at the
bottom. No convert button, output is produced dynamically as input
changes.


## To use

1. Make `wasm-pandoc` a dependency in your project.json.

2. In your bundler mark "wasm" as an asset/resource. For example in rspack, in your config file:

```js
module.exports = {
    ...
    module: {
        ...
        rules: [
            ...
            {
                test: /\.(wasm)$/,
                type: "asset/resource"
            }
            ...
        ]
        ...
    }
    ...
}
```

3. Import `pandoc` from `wasm-pandoc` like this:

```js
import { pandoc } from "wasm-pandoc"
```

4. Execute it like this (it's async):

```js
const output = await pandoc(
    '-s -f json -t markdown', // command line switches
    inputFileContents, // string for text formats or blob for binary formats
    [ // Additional files - for example bibliography or images
        {
            filename: 'image13.png',
            contents: ..., // string for text formats or blob for binary formats
        },
        ...
    ]
)

console.log(output)

{
  out: '...',
  mediaFiles: Map {'media': Map {'image1.jpg' => Blob, 'image2.png' => Blob, ...}}
}

```

`out` will either be a string (for text formats) or a Blob for binary formats of the main output. `mediaFiles` will be a map of all additional dirs/files that pandoc has created during the process.



## Acknowledgements

Thanks to John MacFarlane and all the contributors who made `pandoc`
possible: a fantastic tool that has benefited many developers and is a
source of pride for the Haskell community!

Thanks to all efforts to make `pandoc` run with wasm, including but not limited to:

- amesgen [`Don't patch out network`](https://github.com/haskell-wasm/pandoc/pull/1)
- Cheng Shao [`pandoc-wasm`](https://github.com/tweag/pandoc-wasm)
- George Stagg's [`pandoc-wasm`](https://github.com/georgestagg/pandoc-wasm)
- Yuto Takahashi's [`wasm-pandoc`](https://github.com/y-taka-23/wasm-pandoc)
- TerrorJack's asterius pandoc [demo](https://asterius.netlify.app/demo/pandoc/pandoc.html)
