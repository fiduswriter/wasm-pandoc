#!/usr/bin/env node

/**
 * Setup demo by copying pandoc.wasm to demo directory
 * Run this after npm install to prepare the local demo
 */

import fs from "fs"
import path from "path"
import {fileURLToPath} from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WASM_SOURCE = path.join(__dirname, "..", "src", "pandoc.wasm")
const WASM_DEST = path.join(__dirname, "..", "demo", "pandoc.wasm")

console.log("Setting up demo...")

// Check if source exists
if (!fs.existsSync(WASM_SOURCE)) {
    console.error("Error: src/pandoc.wasm not found")
    console.error("Please run: npm install")
    console.error("This will download pandoc.wasm via the postinstall script")
    process.exit(1)
}

// Copy to demo directory
try {
    fs.copyFileSync(WASM_SOURCE, WASM_DEST)
    console.log(`✓ Copied pandoc.wasm to demo/ directory`)
    console.log(`\nDemo is ready!`)
    console.log(`\nTo run the demo locally:`)
    console.log(`  cd demo`)
    console.log(`  python3 -m http.server 8000`)
    console.log(`  Open http://localhost:8000 in your browser`)
} catch (error) {
    console.error("Error copying file:", error.message)
    process.exit(1)
}
