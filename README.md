# `wasm-pandoc`

Pandoc WASM binary wrapper for use in browsers and Node.js.

This package uses the official pandoc WASM binary distributed by the Pandoc project.

## [Live demo](https://fiduswriter.github.io/wasm-pandoc)

Stdin on the left, stdout on the right, command line arguments at the bottom. No convert button, output is produced dynamically as input changes.

### Running the Demo Locally

To run the demo on your local machine:

```bash
# Install dependencies and download pandoc.wasm
npm install

# Copy pandoc.wasm to demo directory
npm run setup-demo

# Serve the demo
cd demo
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

## Installation

```bash
npm install wasm-pandoc
```

The package will automatically download the official pandoc.wasm binary from GitHub during installation. The Pandoc version is specified in `pandoc-version.txt` (currently 3.9).

## Usage

### Modern API (Recommended)

The package exports two main functions that match the official pandoc WASM API:

#### `convert(options, stdin, files)`

Convert documents using pandoc.

**Parameters:**
- `options` (Object): JavaScript object representing pandoc options. This corresponds to the format used in pandoc's default files. Example: `{ from: "markdown", to: "html", standalone: true }`
- `stdin` (String|null): Input content as a string, or null if using input files
- `files` (Object): Object with filenames as keys and File/Blob objects as values. This includes input files, resources (images, bibliographies, etc.), and will be updated with output files.

**Returns:** Promise resolving to an object with:
- `stdout` (String): The main output (if no output file specified)
- `stderr` (String): Error messages and warnings
- `warnings` (Array): Array of structured warning objects
- `files` (Object): Updated files object including any generated output files

**Example:**

```js
import { convert } from "wasm-pandoc";

const options = {
  from: "markdown",
  to: "html",
  standalone: true,
  "table-of-contents": true
};

const markdown = "# Hello World\n\nThis is a **test**.";

const result = await convert(options, markdown, {});

console.log(result.stdout); // HTML output
console.log(result.warnings); // Any warnings
```

**With files:**

```js
import { convert } from "wasm-pandoc";

const options = {
  from: "markdown",
  to: "docx",
  "output-file": "output.docx",
  bibliography: "references.bib"
};

const files = {
  "references.bib": new Blob([bibContent])
};

const markdown = "# My Paper\n\nSome citation [@smith2020].";

const result = await convert(options, markdown, files);

// Output file is now in result.files["output.docx"]
const docxBlob = result.files["output.docx"];
```

#### `query(options)`

Query pandoc for information about formats, extensions, etc.

**Parameters:**
- `options` (Object): Object with a `query` property and optional `format` property

**Supported queries:**
- `version`: Get pandoc version
- `input-formats`: List of supported input formats
- `output-formats`: List of supported output formats
- `highlight-styles`: Available syntax highlighting styles
- `highlight-languages`: Supported languages for syntax highlighting
- `default-template`: Get default template (requires `format` property)
- `extensions-for-format`: Get extensions for a format (requires `format` property)

**Returns:** Promise resolving to a string, array of strings, or object depending on the query.

**Example:**

```js
import { query } from "wasm-pandoc";

// Get version
const version = await query({ query: "version" });
console.log(version); // "3.9"

// Get input formats
const inputFormats = await query({ query: "input-formats" });
console.log(inputFormats); // ["markdown", "html", "latex", ...]

// Get extensions for markdown
const extensions = await query({
  query: "extensions-for-format",
  format: "markdown"
});
console.log(extensions); // { "smart": true, "emoji": false, ... }
```

### Legacy API (Backward Compatibility)

For backward compatibility with earlier versions of wasm-pandoc:

#### `pandoc(args_str, inData, resources)`

**Parameters:**
- `args_str` (String): Command line arguments as a string (e.g., "-f markdown -t html -s")
- `inData` (String|Blob): Input content
- `resources` (Array): Array of objects with `filename` and `contents` properties

**Returns:** Promise resolving to:
- `out` (String|Blob): Output content
- `mediaFiles` (Map): Map of any additional generated files

**Example:**

```js
import { pandoc } from "wasm-pandoc";

const output = await pandoc(
    "-f markdown -t html -s",
    "# Hello World",
    []
);

console.log(output.out); // HTML output
```

**With resources:**

```js
import { pandoc } from "wasm-pandoc";

const output = await pandoc(
    "-f markdown -t html --extract-media=media",
    markdownContent,
    [
        {
            filename: "image.png",
            contents: imageBlob
        }
    ]
);

console.log(output.out); // HTML output
console.log(output.mediaFiles); // Map of extracted media files
```

## Bundler Configuration

When using a bundler, you need to configure it to handle `.wasm` files as assets/resources.

### Webpack/Rspack

```js
module.exports = {
    module: {
        rules: [
            {
                test: /\.(wasm)$/,
                type: "asset/resource"
            }
        ]
    }
}
```

### Vite

```js
export default {
  assetsInclude: ['**/*.wasm']
}
```

### Rollup

```js
import { wasm } from '@rollup/plugin-wasm';

export default {
  plugins: [
    wasm()
  ]
}
```

## Common Options

Here are some commonly used options for the `convert()` function:

```js
{
  // Input/Output formats
  from: "markdown",           // Input format
  to: "html",                 // Output format
  "output-file": "out.html",  // Write to file instead of stdout

  // Document options
  standalone: true,           // Produce standalone document
  "table-of-contents": true,  // Include table of contents
  "number-sections": true,    // Number section headings

  // Template and styling
  template: "custom.html",    // Custom template
  css: ["style.css"],         // CSS files (can be array)
  "highlight-style": "pygments", // Syntax highlighting

  // Citations
  citeproc: true,             // Process citations
  bibliography: "refs.bib",   // Bibliography file
  csl: "apa.csl",            // Citation style

  // Media
  "extract-media": "media.zip", // Extract media to zip file
  "embed-resources": true,     // Embed resources in output

  // Metadata
  metadata: {
    title: "My Document",
    author: ["John Doe"]
  },

  // Other
  "file-scope": true,         // Parse each file separately
  filters: ["filter.lua"]     // Lua filters
}
```

## Limitations

The WASM version of pandoc has some limitations compared to the native version:

1. **No HTTP requests**: Cannot fetch resources from URLs (operates in WASM sandbox)
2. **No system commands**: Cannot run external programs (filters must be Lua, not executable)
3. **No native PDF**: Cannot produce PDF via LaTeX/ConTeXt (but PDF via Typst works with additional setup)
4. **File access**: All files must be explicitly provided in the `files` object

## Versioning

This package uses **semantic versioning (semver)** independently from Pandoc's version numbers:

- **Major version** (1.x.x): Breaking API changes or major Pandoc updates
- **Minor version** (x.1.x): New features, backward-compatible changes
- **Patch version** (x.x.1): Bug fixes, Pandoc patch updates

**Current version:** 1.0.0 (includes Pandoc 3.9)

### How Versions are Managed

The Pandoc version is specified in `pandoc-version.txt`. The download script automatically reads this file during installation to determine which version to download from GitHub.

**Version caching:** The script creates a `.pandoc-wasm-version` cache file in `src/` to track the currently downloaded version. This ensures the download is skipped if you already have the correct version, but will re-download if `pandoc-version.txt` changes.

**Note:** Pandoc itself doesn't follow semver, but npm packages must. See [VERSIONING.md](VERSIONING.md) for complete details on our versioning strategy.

## Acknowledgements

- **John MacFarlane** and all Pandoc contributors for creating and maintaining this fantastic tool
- **TerrorJack** for the original WASM proof of concept and build configuration
- **The Pandoc team** for official WASM support starting in version 3.9
- Previous maintainers of various pandoc WASM efforts:
  - amesgen
  - Cheng Shao (tweag/pandoc-wasm)
  - George Stagg (georgestagg/pandoc-wasm)
  - Yuto Takahashi (y-taka-23/wasm-pandoc)

## License

MIT License - see LICENSE file for details.

Pandoc itself is licensed under the GPL.
