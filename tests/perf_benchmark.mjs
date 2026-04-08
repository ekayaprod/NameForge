import { extractJsonObjects } from '../js/utils.js';
import { performance } from 'perf_hooks';

const generateLargeJson = (numObjects) => {
    let json = '[';
    for (let i = 0; i < numObjects; i++) {
        json += JSON.stringify({
            id: i,
            name: `Name_${i}`,
            description: `This is a long description for object ${i} to make the string larger.`.repeat(10),
            data: Array.from({ length: 10 }, (_, j) => ({ key: `key_${j}`, value: j }))
        });
        if (i < numObjects - 1) json += ', ';
    }
    json += ']';
    return json;
};

const numObjects = 500;
const fullText = generateLargeJson(numObjects);

console.log(`Benchmarking extractJsonObjects with ${numObjects} objects...`);
console.log(`Total string length: ${fullText.length} characters`);

// Baseline comparison (calling without startIndex)
const baselineStart = performance.now();
let totalExtractedBaseline = 0;
const numChunks = 50;
const chunkSize = Math.floor(fullText.length / numChunks);

for (let i = 1; i <= numChunks; i++) {
    const chunk = fullText.substring(0, i * chunkSize);
    const results = extractJsonObjects(chunk);
    totalExtractedBaseline = results.length;
}
const baselineEnd = performance.now();
const baselineTime = baselineEnd - baselineStart;
console.log(`Baseline time (re-parsing everything): ${baselineTime.toFixed(2)}ms`);

// Optimized comparison (using startIndex)
const optimizedStart = performance.now();
let totalExtractedOptimized = 0;
let lastProcessedIndex = 0;

for (let i = 1; i <= numChunks; i++) {
    const chunk = fullText.substring(0, i * chunkSize);
    const { results, lastIndex } = extractJsonObjects(chunk, lastProcessedIndex, true);
    totalExtractedOptimized += results.length;
    lastProcessedIndex = lastIndex;
}
const optimizedEnd = performance.now();
const optimizedTime = optimizedEnd - optimizedStart;
console.log(`Optimized time (incremental parsing): ${optimizedTime.toFixed(2)}ms`);

const improvement = ((baselineTime - optimizedTime) / baselineTime * 100).toFixed(2);
console.log(`Improvement: ${improvement}%`);
console.log(`Extracted ${totalExtractedOptimized} objects`);
