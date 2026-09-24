import { defineConfig, devices } from '@playwright/test'

const PORT = 5188

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
