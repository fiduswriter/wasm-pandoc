/* wasm-pandoc: JavaScript interface to official pandoc.wasm binary.

   This package wraps the official pandoc WASM binary (v3.9+) from
   https://github.com/jgm/pandoc/releases

   Interface:

   await convert(options, stdin, files)
   - options: JavaScript object representing pandoc options (corresponds to pandoc's default files format)
   - stdin: string or null
   - files: JavaScript object with filenames as keys and File/Blob objects as values

   Returns: { stdout, stderr, warnings, files }
   - stdout: string output
   - stderr: string errors
   - warnings: array of warning objects
   - files: updated files object (includes output file if specified)

   await query(options)
   - options: object with 'query' property and optional 'format' property
   - Possible queries: 'version', 'highlight-styles', 'highlight-languages',
     'input-formats', 'output-formats', 'default-template', 'extensions-for-format'

   Returns: string or array of strings depending on query

   Legacy API (for backward compatibility):

   await pandoc(args_str, inData, resources)
   - args_str: command line arguments as string
   - inData: input content as string or Blob
   - resources: array of {filename, contents} objects

   Returns: { out, mediaFiles }
*/

import {readFileSync} from "node:fs"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"
import {
    ConsoleStdout,
    File,
    OpenFile,
    PreopenDirectory,
    WASI
} from "@bjorn3/browser_wasi_shim"

// Detect environment
const isNode =
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null

// Load WASM file based on environment
let pandocWasm
if (isNode) {
    // Node.js: Load WASM file from filesystem
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const wasmPath = join(__dirname, "pandoc.wasm")
    pandocWasm = readFileSync(wasmPath)
} else {
    // Browser: Use dynamic import (requires bundler support)
    const pandocWasmModule = await import("./pandoc.wasm")
    const pandocWasmLocation = pandocWasmModule.default
    const pandocWasmFetch = await fetch(pandocWasmLocation)
    pandocWasm = await pandocWasmFetch.arrayBuffer()
}

// Initialize WASM module
const args = ["pandoc.wasm", "+RTS", "-H64m", "-RTS"]
const env = []
const fileSystem = new Map()
const fds = [
    new OpenFile(new File(new Uint8Array(), {readonly: true})),
    ConsoleStdout.lineBuffered(msg => console.log(`[WASI stdout] ${msg}`)),
    ConsoleStdout.lineBuffered(msg => console.warn(`[WASI stderr] ${msg}`)),
    new PreopenDirectory("/", fileSystem)
]
const options = {debug: false}
const wasi = new WASI(args, env, fds, options)

const {instance} = await WebAssembly.instantiate(pandocWasm, {
    wasi_snapshot_preview1: wasi.wasiImport
})

wasi.initialize(instance)
instance.exports.__wasm_call_ctors()

function memory_data_view() {
    return new DataView(instance.exports.memory.buffer)
}

const argc_ptr = instance.exports.malloc(4)
memory_data_view().setUint32(argc_ptr, args.length, true)
const argv = instance.exports.malloc(4 * (args.length + 1))
for (let i = 0; i < args.length; ++i) {
    const arg = instance.exports.malloc(args[i].length + 1)
    new TextEncoder().encodeInto(
        args[i],
        new Uint8Array(instance.exports.memory.buffer, arg, args[i].length)
    )
    memory_data_view().setUint8(arg + args[i].length, 0)
    memory_data_view().setUint32(argv + 4 * i, arg, true)
}
memory_data_view().setUint32(argv + 4 * args.length, 0, true)
const argv_ptr = instance.exports.malloc(4)
memory_data_view().setUint32(argv_ptr, argv, true)

instance.exports.hs_init_with_rtsopts(argc_ptr, argv_ptr)

// Helper function to add file to filesystem
async function addFile(filename, blob, readonly) {
    const buffer = await blob.arrayBuffer()
    const file = new File(new Uint8Array(buffer), {readonly: readonly})
    fileSystem.set(filename, file)
}

// Main API: query function
export function query(options) {
    const opts_str = JSON.stringify(options)
    const opts_ptr = instance.exports.malloc(opts_str.length)
    new TextEncoder().encodeInto(
        opts_str,
        new Uint8Array(
            instance.exports.memory.buffer,
            opts_ptr,
            opts_str.length
        )
    )

    // Setup filesystem
    fileSystem.clear()
    const out_file = new File(new Uint8Array(), {readonly: false})
    const err_file = new File(new Uint8Array(), {readonly: false})
    fileSystem.set("stdout", out_file)
    fileSystem.set("stderr", err_file)

    instance.exports.query(opts_ptr, opts_str.length)

    const err_text = new TextDecoder("utf-8", {fatal: true}).decode(
        err_file.data
    )
    if (err_text) {
        console.log(err_text)
    }
    const out_text = new TextDecoder("utf-8", {fatal: true}).decode(
        out_file.data
    )
    return JSON.parse(out_text)
}

// Main API: convert function
export async function convert(options, stdin, files) {
    const opts_str = JSON.stringify(options)
    const opts_ptr = instance.exports.malloc(opts_str.length)
    new TextEncoder().encodeInto(
        opts_str,
        new Uint8Array(
            instance.exports.memory.buffer,
            opts_ptr,
            opts_str.length
        )
    )

    // Setup filesystem
    fileSystem.clear()
    const in_file = new File(new Uint8Array(), {readonly: true})
    const out_file = new File(new Uint8Array(), {readonly: false})
    const err_file = new File(new Uint8Array(), {readonly: false})
    const warnings_file = new File(new Uint8Array(), {readonly: false})
    fileSystem.set("stdin", in_file)
    fileSystem.set("stdout", out_file)
    fileSystem.set("stderr", err_file)
    fileSystem.set("warnings", warnings_file)

    // Add input files
    for (const filename in files) {
        await addFile(filename, files[filename], true)
    }

    // Add output file placeholder if specified
    if (options["output-file"]) {
        await addFile(options["output-file"], new Blob(), false)
    }

    // Add media file placeholder for extracted media
    if (options["extract-media"]) {
        await addFile(options["extract-media"], new Blob(), false)
    }

    // Set stdin content
    if (stdin) {
        in_file.data = new TextEncoder().encode(stdin)
    }

    // Run conversion
    instance.exports.convert(opts_ptr, opts_str.length)

    // Collect output file if generated
    if (options["output-file"]) {
        const outputFile = fileSystem.get(options["output-file"])
        if (outputFile && outputFile.data && outputFile.data.length > 0) {
            files[options["output-file"]] = new Blob([outputFile.data])
        }
    }

    // Collect extracted media if generated
    if (options["extract-media"]) {
        const mediaFile = fileSystem.get(options["extract-media"])
        if (mediaFile && mediaFile.data && mediaFile.data.length > 0) {
            files[options["extract-media"]] = new Blob([mediaFile.data], {
                type: "application/zip"
            })
        }
    }

    // Parse warnings
    const rawWarnings = new TextDecoder("utf-8", {fatal: true}).decode(
        warnings_file.data
    )
    let warnings = []
    if (rawWarnings) {
        try {
            warnings = JSON.parse(rawWarnings)
        } catch (e) {
            console.warn("Failed to parse warnings:", e)
        }
    }

    return {
        stdout: new TextDecoder("utf-8", {fatal: true}).decode(out_file.data),
        stderr: new TextDecoder("utf-8", {fatal: true}).decode(err_file.data),
        warnings: warnings,
        files: files
    }
}

// Helper function to convert data to Uint8Array
async function toUint8Array(inData) {
    let uint8Array

    if (typeof inData === "string") {
        const encoder = new TextEncoder()
        uint8Array = encoder.encode(inData)
    } else if (inData instanceof Blob) {
        const arrayBuffer = await inData.arrayBuffer()
        uint8Array = new Uint8Array(arrayBuffer)
    } else {
        throw new Error("Unsupported type: inData must be a string or a Blob")
    }

    return uint8Array
}

const textDecoder = new TextDecoder("utf-8", {fatal: true})

function convertData(data) {
    let outData
    try {
        // Attempt to decode as UTF-8 text
        outData = textDecoder.decode(data)
    } catch (_e) {
        // If decoding fails, return as Blob
        outData = new Blob([data])
    }
    return outData
}

// Legacy API: pandoc function (for backward compatibility)
export async function pandoc(args_str, inData, resources = []) {
    // Parse command line arguments into options object
    const argParts = args_str.trim().split(/\s+/)
    const options = {}
    const files = {}

    let i = 0
    while (i < argParts.length) {
        const arg = argParts[i]

        if (arg === "-f" || arg === "--from") {
            options.from = argParts[++i]
        } else if (arg === "-t" || arg === "--to") {
            options.to = argParts[++i]
        } else if (arg === "-o" || arg === "--output") {
            options["output-file"] = argParts[++i]
        } else if (arg === "-s" || arg === "--standalone") {
            options.standalone = true
        } else if (arg === "--extract-media") {
            options["extract-media"] = argParts[++i]
        } else if (arg === "--toc" || arg === "--table-of-contents") {
            options["table-of-contents"] = true
        }
        i++
    }

    // Add resource files
    for (const resource of resources) {
        const contents = await toUint8Array(resource.contents)
        files[resource.filename] = new Blob([contents])
    }

    // Convert stdin to string
    let stdin = null
    if (inData) {
        if (typeof inData === "string") {
            stdin = inData
        } else {
            const uint8Array = await toUint8Array(inData)
            stdin = new TextDecoder("utf-8").decode(uint8Array)
        }
    }

    // Call convert
    const result = await convert(options, stdin, files)

    // Find any generated media files
    const knownFileNames = new Set(
        Object.keys(
            resources.reduce((acc, r) => {
                acc[r.filename] = true
                return acc
            }, {})
        )
    )

    if (options["output-file"]) {
        knownFileNames.add(options["output-file"])
    }

    const mediaFiles = new Map()
    for (const [name, _value] of fileSystem.entries()) {
        if (
            !["stdin", "stdout", "stderr", "warnings"].includes(name) &&
            !knownFileNames.has(name)
        ) {
            const fileData = fileSystem.get(name)
            if (fileData && fileData.data) {
                mediaFiles.set(name, convertData(fileData.data))
            }
        }
    }

    // Return in legacy format
    let out
    if (options["output-file"] && result.files[options["output-file"]]) {
        out = convertData(
            new Uint8Array(
                await result.files[options["output-file"]].arrayBuffer()
            )
        )
    } else {
        out = result.stdout
    }

    return {
        out: out,
        mediaFiles: mediaFiles
    }
}
