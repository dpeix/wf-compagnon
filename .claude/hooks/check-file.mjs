// PostToolUse hook — formats and lints each file Claude edits, so lint errors are fixed right away
// instead of piling up until the commit. Exit code 2 shows stderr to Claude (the edit is kept).
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8'))
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd
const file = input.tool_input?.file_path

if (typeof file !== 'string' || !/\.(ts|tsx|js|mjs|cjs)$/.test(file)) process.exit(0)
const relativePath = path.relative(projectDir, path.resolve(projectDir, file))
if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) process.exit(0)

// Call the local CLIs through node directly: npx would need a shell on Windows (npx.cmd)
function run(cliPath, args) {
  return spawnSync(process.execPath, [path.join(projectDir, cliPath), ...args], {
    cwd: projectDir,
    encoding: 'utf8'
  })
}

const prettier = run('node_modules/prettier/bin/prettier.cjs', [
  '--write',
  '--ignore-unknown',
  '--log-level',
  'warn',
  relativePath
])
if (prettier.status !== 0) {
  process.stderr.write(`Prettier a échoué sur ${relativePath} :\n${prettier.stderr}`)
  process.exit(2)
}

const eslint = run('node_modules/eslint/bin/eslint.js', [
  '--max-warnings',
  '0',
  '--no-warn-ignored',
  relativePath
])
if (eslint.status !== 0) {
  process.stderr.write(
    `ESLint signale des problèmes dans ${relativePath} ; corrige-les sans désactiver de règle :\n${eslint.stdout}${eslint.stderr}`
  )
  process.exit(2)
}

process.exit(0)
