import {
    ConsoleStdout,
    File,
    OpenFile,
    PreopenDirectory,
    WASI
} from "https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.4.2/dist/index.js"

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
const {instance} = await WebAssembly.instantiateStreaming(
    fetch("./pandoc.wasm"),
    {
        wasi_snapshot_preview1: wasi.wasiImport
    }
)

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

async function addFile(filename, blob, readonly) {
    const buffer = await blob.arrayBuffer()
    const file = new File(new Uint8Array(buffer), {readonly: readonly})
    fileSystem.set(filename, file)
}

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

    fileSystem.clear()
    const in_file = new File(new Uint8Array(), {readonly: true})
    const out_file = new File(new Uint8Array(), {readonly: false})
    const err_file = new File(new Uint8Array(), {readonly: false})
    const warnings_file = new File(new Uint8Array(), {readonly: false})
    fileSystem.set("stdin", in_file)
    fileSystem.set("stdout", out_file)
    fileSystem.set("stderr", err_file)
    fileSystem.set("warnings", warnings_file)

    for (const file in files) {
        await addFile(file, files[file], true)
    }

    if (options["output-file"]) {
        await addFile(options["output-file"], new Blob(), false)
    }

    if (options["extract-media"]) {
        await addFile(options["extract-media"], new Blob(), false)
    }

    if (stdin) {
        in_file.data = new TextEncoder().encode(stdin)
    }

    instance.exports.convert(opts_ptr, opts_str.length)

    if (options["output-file"]) {
        files[options["output-file"]] = new Blob([
            fileSystem.get(options["output-file"]).data
        ])
    }
    if (options["extract-media"]) {
        const mediaFile = fileSystem.get(options["extract-media"])
        if (mediaFile && mediaFile.data && mediaFile.data.length > 0) {
            files[options["extract-media"]] = new Blob([mediaFile.data], {
                type: "application/zip"
            })
        }
    }
    const rawWarnings = new TextDecoder("utf-8", {fatal: true}).decode(
        warnings_file.data
    )
    let warnings = []
    if (rawWarnings) {
        warnings = JSON.parse(rawWarnings)
    }
    return {
        stdout: new TextDecoder("utf-8", {fatal: true}).decode(out_file.data),
        stderr: new TextDecoder("utf-8", {fatal: true}).decode(err_file.data),
        warnings: warnings
    }
}

// Legacy API for backward compatibility - converts command-line args to options
export async function pandoc(args_str, in_str) {
    // Parse command line arguments into options object
    const argParts = args_str.trim().split(/\s+/)
    const options = {}

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
        } else if (arg === "--toc" || arg === "--table-of-contents") {
            options["table-of-contents"] = true
        }
        i++
    }

    // Call convert with parsed options
    const result = await convert(options, in_str, {})
    return result.stdout
}
