import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: 'public',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
    // Agent worktrees live under .claude/; their edits must not reload the game.
    watch: { ignored: ['**/.claude/**', '**/test-results/**', '**/playwright-report/**'] },
  },
})
