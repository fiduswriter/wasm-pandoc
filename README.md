# `pandoc-wasm`

**In search of maintainer:** I have temporarily taken over maintainership of this package due to there being no package on NPM. However, I know very little about wasm and haskell and would like for someone else to take this package again. (@Terrorjack ?)


The latest version of `pandoc` CLI compiled as a standalone
`wasm32-wasi` module that can be run by engines like `wasmtime` as
well as browsers.

## [Live demo](https://johanneswilm.github.io/pandoc-wasm)

Stdin on the left, stdout on the right, command line arguments at the
bottom. No convert button, output is produced dynamically as input
changes.


## To use

1. Make `pandoc-wasm` a dependency in your project.json.

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

3. Import `pandoc` from `pandoc-wasm` like this:

```js
import { pandoc } from "pandoc-wasm"
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
```

The output will either be a string (for text formats) or a blob for binary formats.


**TODO:** Obtain extracted media files. I know too little about wasm to figure out how to get them out.

## Acknowledgements

Thanks to John MacFarlane and all the contributors who made `pandoc`
possible: a fantastic tool that has benefited many developers and is a
source of pride for the Haskell community!

Thanks to all efforts to make `pandoc` run with wasm, including but not limited to:

- amesgen [`Don't patch out network`](https://github.com/haskell-wasm/pandoc/pull/1)
- Cheng Shao [`pandoc-wasm`](https://github.com/tweag/pandoc-wasm)
- George Stagg's [`pandoc-wasm`](https://github.com/georgestagg/pandoc-wasm)
- Yuto Takahashi's [`wasm-pandoc`](https://github.com/y-taka-23/wasm-pandoc)
- My legacy asterius pandoc [demo](https://asterius.netlify.app/demo/pandoc/pandoc.html)
