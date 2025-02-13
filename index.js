import {
    WASI,
    OpenFile,
    File,
    ConsoleStdout,
    PreopenDirectory,
} from "@bjorn3/browser_wasi_shim";
import pandocWasmLocation from "./pandoc.wasm"

const pandocWasmFetch = await fetch(pandocWasmLocation)
const pandocWasm = await pandocWasmFetch.arrayBuffer()
const args = ["pandoc.wasm", "+RTS", "-H64m", "-RTS"]
const env = []
const inFile = new File(new Uint8Array(), {
    readonly: true
})
const outFile = new File(new Uint8Array(), {
    readonly: false
})


async function toUint8Array(inData) {
    let uint8Array

    if (typeof inData === 'string') {
        // If inData is a text string, convert it to a Uint8Array
        const encoder = new TextEncoder()
        uint8Array = encoder.encode(inData)
    } else if (inData instanceof Blob) {
        // If inData is a Blob, read it as an ArrayBuffer and then convert to Uint8Array
        const arrayBuffer = await inData.arrayBuffer()
        uint8Array = new Uint8Array(arrayBuffer)
    } else {
        throw new Error('Unsupported type: inData must be a string or a Blob')
    }

    return uint8Array
}



export async function pandoc(args_str, inData, resources = []) {

    const files = [
        ["in", inFile],
        ["out", outFile],
    ]

    for await(const resource of resources) {
        const contents = await toUint8Array(resource.contents)
        files.push([resource.filename, new File(contents, {
            readonly: true
        })])
    }

    const fds = [
        new OpenFile(new File(new Uint8Array(), {
            readonly: true
        })),
        ConsoleStdout.lineBuffered((msg) => console.log(`[WASI stdout] ${msg}`)),
        ConsoleStdout.lineBuffered((msg) => console.warn(`[WASI stderr] ${msg}`)),
        new PreopenDirectory("/", files),
    ]
    const options = {
        debug: false
    }
    const wasi = new WASI(args, env, fds, options)

    const {
        instance
    } = await WebAssembly.instantiate(
        pandocWasm, {
            wasi_snapshot_preview1: wasi.wasiImport,
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

    const args_ptr = instance.exports.malloc(args_str.length)
    new TextEncoder().encodeInto(
        args_str,
        new Uint8Array(instance.exports.memory.buffer, args_ptr, args_str.length)
    )

    inFile.data = await toUint8Array(inData)

    instance.exports.wasm_main(args_ptr, args_str.length)
    let outData
    try {
        // Attempt to decode the data as UTF-8 text
        const textDecoder = new TextDecoder("utf-8", {
            fatal: true
        })
        // Return as string if successful
        outData = textDecoder.decode(outFile.data)
    } catch (e) {
        // If decoding fails, assume it's binary data and return as Blob
        outData = new Blob([outFile.data])
    }

    return outData
}
