#!/usr/bin/env node

/**
 * Comprehensive Media Extraction Example
 *
 * This example demonstrates how the new convert() API automatically extracts
 * media files from documents during conversion. This is particularly useful
 * when converting from formats that embed media (DOCX, ODT, EPUB) to formats
 * that reference external media (Markdown, HTML).
 *
 * The new API makes this much simpler than the legacy pandoc() API by:
 * - Automatically detecting and extracting newly created files
 * - Returning all files in a simple dictionary structure
 * - Making it easy to iterate and process extracted media
 */

import {convert} from "../index.js"

console.log("Media Extraction Example\n")
console.log("=".repeat(70))

/**
 * Example 1: Basic media extraction workflow
 *
 * This simulates converting a document with embedded images.
 * In a real scenario, you would provide an actual DOCX file with embedded images.
 */
async function example1_basicExtraction() {
    console.log("\n1. Basic Media Extraction")
    console.log("-".repeat(70))

    // Simulate a markdown document with image references
    const markdown = `# Research Paper

## Introduction

This paper presents our findings.

![Experiment Setup](setup.png)

## Results

The results are shown below:

![Results Chart](results.png)

## Conclusion

As demonstrated in the figures above, our hypothesis is confirmed.
`

    // Create sample image files (tiny PNG files - 1x1 red and blue pixels)
    const redPixel = new Uint8Array([
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10, // PNG signature
        0,
        0,
        0,
        13,
        73,
        72,
        68,
        82, // IHDR chunk
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1,
        8,
        2,
        0,
        0,
        0,
        144,
        119,
        83,
        222,
        0,
        0,
        0,
        12,
        73,
        68,
        65,
        84,
        8,
        215,
        99,
        248,
        15,
        192,
        0,
        0,
        3,
        1,
        1,
        0,
        165,
        221,
        141,
        176,
        0,
        0,
        0,
        0,
        73,
        69,
        78,
        68,
        174,
        66,
        96,
        130
    ])

    const bluePixel = new Uint8Array([
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10, // PNG signature
        0,
        0,
        0,
        13,
        73,
        72,
        68,
        82, // IHDR chunk
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1,
        8,
        2,
        0,
        0,
        0,
        144,
        119,
        83,
        222,
        0,
        0,
        0,
        12,
        73,
        68,
        65,
        84,
        8,
        215,
        99,
        252,
        207,
        192,
        0,
        0,
        3,
        1,
        1,
        0,
        24,
        221,
        141,
        176,
        0,
        0,
        0,
        0,
        73,
        69,
        78,
        68,
        174,
        66,
        96,
        130
    ])

    const options = {
        from: "markdown",
        to: "html",
        standalone: true
    }

    const files = {
        "setup.png": new Blob([redPixel], {type: "image/png"}),
        "results.png": new Blob([bluePixel], {type: "image/png"})
    }

    console.log("Input files:", Object.keys(files).join(", "))

    const result = await convert(options, markdown, files)

    console.log("All files:", Object.keys(result.files).join(", "))
    console.log(
        "Newly created files:",
        Object.keys(result.mediaFiles).join(", ") || "(none)"
    )
    console.log("HTML output length:", result.stdout.length, "characters")

    // Count image references in output
    const imageRefs = (result.stdout.match(/<img/g) || []).length
    console.log("Image references in HTML:", imageRefs)

    console.log("\n✓ Files are preserved in result.files")
    console.log(
        "✓ New files are separate in result.mediaFiles (no filtering needed!)"
    )
}

/**
 * Example 2: Extracting and categorizing media files
 *
 * Shows how to process different types of media files.
 */
async function example2_categorizeMedia() {
    console.log("\n2. Categorizing Extracted Media")
    console.log("-".repeat(70))

    const markdown = `# Multimedia Document

![Photo](photo.png)
![Chart](chart.png)
`

    const pngData = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
        1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
        65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 3, 1, 1, 0, 24, 221, 141, 176,
        0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ])

    const options = {
        from: "markdown",
        to: "html"
    }

    const files = {
        "photo.png": new Blob([pngData], {type: "image/png"}),
        "chart.png": new Blob([pngData], {type: "image/png"})
    }

    const result = await convert(options, markdown, files)

    // Categorize files by type
    const filesByType = {}

    for (const [filename, blob] of Object.entries(result.files)) {
        const ext = filename.split(".").pop().toLowerCase()
        if (!filesByType[ext]) {
            filesByType[ext] = []
        }
        filesByType[ext].push({filename, size: blob.size, type: blob.type})
    }

    console.log("\nAll files by type:")
    for (const [type, files] of Object.entries(filesByType)) {
        console.log(`  ${type.toUpperCase()}: ${files.length} files`)
        for (const file of files) {
            console.log(`    - ${file.filename} (${file.size} bytes)`)
        }
    }

    console.log("\nNewly created files:", Object.keys(result.mediaFiles).length)
    console.log("  (extracted during conversion)")

    console.log(
        "\n✓ Easy to categorize and process files with Object.entries()"
    )
}

/**
 * Example 3: Extract media to a specific directory structure
 *
 * Demonstrates using the extract-media option with a directory path.
 */
async function example3_extractToDirectory() {
    console.log("\n3. Extract Media to Directory Structure")
    console.log("-".repeat(70))

    const markdown = `# Document

![Image 1](img1.png)
![Image 2](img2.png)
`

    const pngData = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
        1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
        65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 3, 1, 1, 0, 24, 221, 141, 176,
        0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ])

    const options = {
        from: "markdown",
        to: "html",
        "extract-media": "assets/images" // Extract to assets/images/ directory
    }

    const files = {
        "img1.png": new Blob([pngData], {type: "image/png"}),
        "img2.png": new Blob([pngData], {type: "image/png"})
    }

    const result = await convert(options, markdown, files)

    console.log("All files in result.files:")
    for (const filename of Object.keys(result.files)) {
        console.log(`  - ${filename}`)
    }

    console.log("\nNewly created files in result.mediaFiles:")
    if (Object.keys(result.mediaFiles).length > 0) {
        for (const filename of Object.keys(result.mediaFiles)) {
            console.log(`  - ${filename}`)
        }
    } else {
        console.log("  (none - images may be referenced directly)")
    }

    console.log("\n✓ Extract-media option allows organizing extracted files")
    console.log("✓ result.mediaFiles contains only new files")
}

/**
 * Example 4: Compare new API with legacy API
 *
 * Shows the differences in how media files are handled.
 */
async function example4_apiComparison() {
    console.log("\n4. API Comparison: New vs Legacy")
    console.log("-".repeat(70))

    const markdown = "# Test\n\n![Image](test.png)"

    const pngData = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
        1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
        65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 3, 1, 1, 0, 24, 221, 141, 176,
        0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ])

    // New API
    const options = {
        from: "markdown",
        to: "html"
    }

    const files = {
        "test.png": new Blob([pngData], {type: "image/png"})
    }

    const result = await convert(options, markdown, files)

    console.log("\nNew convert() API:")
    console.log("  Structure: Plain JavaScript object (dictionary)")
    console.log("  All files access: result.files['filename']")
    console.log("  New files only: result.mediaFiles['filename']")
    console.log("  Iteration: Object.entries(result.mediaFiles)")
    console.log("  Type: ", typeof result.files)
    console.log("  All files count:", Object.keys(result.files).length)
    console.log("  New files count:", Object.keys(result.mediaFiles).length)
    console.log(
        "  Example access:",
        result.files["test.png"] ? "✓ Accessible" : "✗ Not found"
    )

    console.log("\nLegacy pandoc() API would have:")
    console.log("  Structure: Map object")
    console.log("  Access: output.mediaFiles.get('filename')")
    console.log("  Iteration: output.mediaFiles.entries()")
    console.log("  Required filtering to separate input from extracted")

    console.log("\n✓ New API is simpler and more JavaScript-idiomatic")
    console.log("✓ result.mediaFiles contains ONLY newly created files")
}

/**
 * Example 5: Practical use case - Generate file list report
 *
 * Shows a real-world scenario of processing conversion results.
 */
async function example5_fileReport() {
    console.log("\n5. Practical Use Case: File Report Generation")
    console.log("-".repeat(70))

    const markdown = `# Project Documentation

## Architecture

![System Diagram](diagram.png)

## Database Schema

![Schema](schema.png)

## API Endpoints

Details about our REST API...
`

    const pngData = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
        1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
        65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 3, 1, 1, 0, 24, 221, 141, 176,
        0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ])

    const options = {
        from: "markdown",
        to: "html",
        standalone: true
    }

    const files = {
        "diagram.png": new Blob([pngData], {type: "image/png"}),
        "schema.png": new Blob([pngData], {type: "image/png"})
    }

    const result = await convert(options, markdown, files)

    // Generate comprehensive report
    console.log("\n📊 Conversion Report")
    console.log("─".repeat(70))

    const totalSize = Object.values(result.files).reduce(
        (sum, blob) => sum + blob.size,
        0
    )

    console.log(`Total files: ${Object.keys(result.files).length}`)
    console.log(`Total size: ${totalSize} bytes`)
    console.log(`Output size: ${result.stdout.length} characters`)
    console.log(`Warnings: ${result.warnings.length}`)

    console.log("\nAll Files:")
    for (const [filename, blob] of Object.entries(result.files)) {
        const sizeKB = (blob.size / 1024).toFixed(2)
        const type = blob.type || "application/octet-stream"
        console.log(`  📄 ${filename}`)
        console.log(`     Size: ${sizeKB} KB`)
        console.log(`     Type: ${type}`)
    }

    if (Object.keys(result.mediaFiles).length > 0) {
        console.log("\nNewly Created Files:")
        for (const [filename, blob] of Object.entries(result.mediaFiles)) {
            const sizeKB = (blob.size / 1024).toFixed(2)
            console.log(`  ✨ ${filename}`)
            console.log(`     Size: ${sizeKB} KB`)
        }
    }

    if (result.warnings.length > 0) {
        console.log("\n⚠️  Warnings:")
        for (const warning of result.warnings) {
            console.log(`  - ${warning.pretty || warning.type}`)
        }
    }

    console.log("\n✓ Complete file manifest generated from result.files")
    console.log("✓ result.mediaFiles shows only newly created files")
}

/**
 * Example 6: Filtering and processing specific file types
 */
async function example6_filterAndProcess() {
    console.log("\n6. Filtering and Processing Files")
    console.log("-".repeat(70))

    const markdown = `# Assets

![Logo](logo.png)
![Banner](banner.png)
`

    const pngData = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
        1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
        65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 3, 1, 1, 0, 24, 221, 141, 176,
        0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ])

    const options = {from: "markdown", to: "html"}
    const files = {
        "logo.png": new Blob([pngData], {type: "image/png"}),
        "banner.png": new Blob([pngData], {type: "image/png"})
    }

    const result = await convert(options, markdown, files)

    // Check all image files
    const allImageFiles = Object.entries(result.files).filter(([name, _]) =>
        /\.(png|jpg|jpeg|gif|svg)$/i.test(name)
    )

    console.log(`Found ${allImageFiles.length} total image files`)

    // Check only newly created image files
    const newImageFiles = Object.entries(result.mediaFiles).filter(
        ([name, _]) => /\.(png|jpg|jpeg|gif|svg)$/i.test(name)
    )

    console.log(`Newly created: ${newImageFiles.length} image files`)
    for (const [name, blob] of newImageFiles) {
        console.log(`  - ${name} (${blob.size} bytes)`)
    }

    // Group by size
    const small = allImageFiles.filter(([_, blob]) => blob.size < 1000)
    const medium = allImageFiles.filter(
        ([_, blob]) => blob.size >= 1000 && blob.size < 10000
    )
    const large = allImageFiles.filter(([_, blob]) => blob.size >= 10000)

    console.log("\nAll image files by size:")
    console.log(`  Small (<1KB): ${small.length}`)
    console.log(`  Medium (1-10KB): ${medium.length}`)
    console.log(`  Large (>10KB): ${large.length}`)

    console.log("\n✓ Easy filtering with standard JavaScript array methods")
    console.log(
        "✓ result.mediaFiles gives you only new files without filtering"
    )
}

// Run all examples
async function runAllExamples() {
    try {
        await example1_basicExtraction()
        await example2_categorizeMedia()
        await example3_extractToDirectory()
        await example4_apiComparison()
        await example5_fileReport()
        await example6_filterAndProcess()

        console.log("\n" + "=".repeat(70))
        console.log("✓ All media extraction examples completed successfully!")
        console.log("=".repeat(70))

        console.log("\nKey Takeaways:")
        console.log("  • Files are returned as a plain JavaScript object")
        console.log("  • result.mediaFiles contains ONLY newly created files")
        console.log(
            "  • result.files contains all files (input + output + extracted)"
        )
        console.log("  • No filtering needed to find extracted media")
        console.log(
            "  • Use Object.entries(), Object.keys(), etc. for iteration"
        )
        console.log(
            "  • Simple dictionary access: result.mediaFiles['filename']"
        )
        console.log("  • Much easier than the legacy Map-based API")
    } catch (error) {
        console.error("\n✗ Error running examples:", error)
        if (error.stack) {
            console.error(error.stack)
        }
        process.exit(1)
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllExamples()
}

export {
    example1_basicExtraction,
    example2_categorizeMedia,
    example3_extractToDirectory,
    example4_apiComparison,
    example5_fileReport,
    example6_filterAndProcess,
    runAllExamples
}
