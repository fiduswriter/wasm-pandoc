// Basic usage examples for wasm-pandoc

import {convert, pandoc, query} from "../index.js"

// Example 1: Simple markdown to HTML conversion
async function example1() {
    console.log("Example 1: Markdown to HTML")

    const options = {
        from: "markdown",
        to: "html",
        standalone: true
    }

    const markdown = `# Hello World

This is a **bold** statement and this is *italic*.

- Item 1
- Item 2
- Item 3
`

    const result = await convert(options, markdown, {})
    console.log("HTML Output:", result.stdout)
    console.log("Warnings:", result.warnings)
}

// Example 2: Query pandoc version and formats
async function example2() {
    console.log("\nExample 2: Query pandoc information")

    // Get version
    const version = await query({query: "version"})
    console.log("Pandoc version:", version)

    // Get input formats
    const inputFormats = await query({query: "input-formats"})
    console.log("Input formats:", inputFormats.slice(0, 5), "... and more")

    // Get output formats
    const outputFormats = await query({query: "output-formats"})
    console.log("Output formats:", outputFormats.slice(0, 5), "... and more")

    // Get extensions for markdown
    const extensions = await query({
        query: "extensions-for-format",
        format: "markdown"
    })
    console.log(
        "Markdown extensions (first 5):",
        Object.keys(extensions).slice(0, 5)
    )
}

// Example 3: Convert with bibliography
async function example3() {
    console.log("\nExample 3: Convert with bibliography")

    const markdown = `# Research Paper

According to recent studies [@smith2020], this is important.

# References
`

    const bibContent = `@article{smith2020,
  author = {Smith, John},
  title = {Important Research},
  journal = {Science Journal},
  year = {2020}
}`

    const options = {
        from: "markdown",
        to: "html",
        standalone: true,
        citeproc: true,
        bibliography: "references.bib"
    }

    const files = {
        "references.bib": new Blob([bibContent])
    }

    const result = await convert(options, markdown, files)
    console.log("HTML with citations:", result.stdout.substring(0, 200) + "...")
}

// Example 4: Generate DOCX file
async function example4() {
    console.log("\nExample 4: Generate DOCX file")

    const markdown = `# My Document

This is a paragraph with **bold** and *italic* text.

## Subsection

- List item 1
- List item 2
`

    const options = {
        from: "markdown",
        to: "docx",
        "output-file": "output.docx",
        standalone: true
    }

    const files = {}
    const result = await convert(options, markdown, files)

    // The DOCX file is now in result.files['output.docx']
    const docxBlob = result.files["output.docx"]
    console.log("DOCX file generated, size:", docxBlob.size, "bytes")

    // In browser: you could create a download link
    // In Node.js: you could write it to disk
    // const arrayBuffer = await docxBlob.arrayBuffer();
    // fs.writeFileSync('output.docx', Buffer.from(arrayBuffer));
}

// Example 5: Legacy API (backward compatibility)
async function example5() {
    console.log("\nExample 5: Legacy API")

    const output = await pandoc(
        "-f markdown -t html -s",
        "# Hello from Legacy API\n\nThis uses the old interface.",
        []
    )

    console.log("Legacy output:", output.out.substring(0, 100) + "...")
}

// Example 6: Extract media from document
async function example6() {
    console.log("\nExample 6: Extract media")

    const markdown = `# Document with Image

![Alt text](image.png)
`

    const imageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG header

    const options = {
        from: "markdown",
        to: "html",
        "extract-media": "media.zip"
    }

    const files = {
        "image.png": new Blob([imageData])
    }

    const result = await convert(options, markdown, files)

    if (result.files["media.zip"]) {
        console.log(
            "Media extracted to zip, size:",
            result.files["media.zip"].size,
            "bytes"
        )
    }
}

// Run all examples
async function runAllExamples() {
    try {
        await example1()
        await example2()
        await example3()
        await example4()
        await example5()
        await example6()
        console.log("\n✓ All examples completed successfully!")
    } catch (error) {
        console.error("Error running examples:", error)
    }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllExamples()
}

export {
    example1,
    example2,
    example3,
    example4,
    example5,
    example6,
    runAllExamples
}
