// Extract markdown from Claude Agent persisted output JSON.
// Usage: node scripts/_extract-agent-output.mjs <input-json> <output-md>
import fs from "node:fs";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node _extract-agent-output.mjs <input> <output>");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
const text = data[0]?.text ?? "";

// Find start: prefer ```markdown fence, fall back to YAML frontmatter.
const fenceOpen = text.indexOf("```markdown");
let mdStart;
if (fenceOpen !== -1) {
  mdStart = fenceOpen + "```markdown\n".length;
} else {
  mdStart = text.indexOf("---\ntitle:");
}
if (mdStart < 0) {
  console.error("Could not locate markdown start");
  console.error("First 1000 chars of agent text:");
  console.error(text.slice(0, 1000));
  process.exit(1);
}

let mdEnd = text.lastIndexOf("```");
if (mdEnd <= mdStart) mdEnd = text.length;
const md = text.slice(mdStart, mdEnd).trim();

fs.writeFileSync(outputPath, md + "\n", "utf-8");
console.log("WROTE", md.length, "chars to", outputPath);
console.log("--- First 200 chars ---");
console.log(md.slice(0, 200));
console.log("--- Last 200 chars ---");
console.log(md.slice(-200));
