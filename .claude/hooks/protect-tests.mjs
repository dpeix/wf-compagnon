// PreToolUse hook — test lock: once a test or fixture is committed, Claude cannot change it
// without explicit approval. Written in Node rather than bash + jq so it runs as-is on Windows.
// Exit code 2 blocks the tool call and shows stderr to Claude.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8'))
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input.cwd
const toolInput = input.tool_input ?? {}

const TEST_PATH = /\.test\.tsx?$|(^|\/)(fixtures|__fixtures__)\//
// Coarse net for shell commands: it stops the obvious cases, not a deliberate workaround.
// The CI job tests-proteges is the real barrier.
const SHELL_WRITE =
  /sed\s+-i|(?<![0-9&])>(?!&)|\b(tee|rm|mv|cp|del|erase|ren)\b|git\s+(checkout|restore|rm|mv)\b|\b(Set-Content|Add-Content|Out-File|Clear-Content|Remove-Item|Move-Item|Copy-Item|Rename-Item)\b/i
const SHELL_TEST_PATH = /\.test\.tsx?\b|(^|[\s'"/\\])(fixtures|__fixtures__)[/\\]/i

function block(reason) {
  process.stderr.write(
    `Verrou des tests : ${reason}. Explique pourquoi le test serait faux et demande un accord explicite avant de le modifier.\n`
  )
  process.exit(2)
}

// Tool paths are absolute, with backslashes on Windows: compare them as project-relative POSIX paths
function toProjectPath(file) {
  return path.relative(projectDir, path.resolve(projectDir, file)).split(path.sep).join('/')
}

function isCommitted(relativePath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', relativePath], {
      cwd: projectDir,
      stdio: 'ignore'
    })
    return true
  } catch {
    return false
  }
}

switch (input.tool_name) {
  case 'Edit':
  case 'Write':
  case 'MultiEdit':
  case 'NotebookEdit': {
    const file = toolInput.file_path ?? toolInput.notebook_path
    if (typeof file !== 'string') break
    const relativePath = toProjectPath(file)
    // A test that is not committed yet stays editable: that is when it gets reviewed
    if (TEST_PATH.test(relativePath) && isCommitted(relativePath)) {
      block(`${relativePath} est déjà commité`)
    }
    break
  }
  case 'Bash':
  case 'PowerShell': {
    const command = typeof toolInput.command === 'string' ? toolInput.command : ''
    if (SHELL_WRITE.test(command) && SHELL_TEST_PATH.test(command)) {
      block('la commande semble modifier un fichier de test ; utilise les outils Edit/Write')
    }
    break
  }
}

process.exit(0)
