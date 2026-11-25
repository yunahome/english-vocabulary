import { spawn } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

const host = process.env.PGLITE_HOST || '127.0.0.1'
const port = Number(process.env.PGLITE_PORT || 5432)
const dataDir = process.env.PGLITE_DATA_DIR || './database/.pglite'
const shouldInit = process.argv.includes('--init')
const shouldSeed = process.argv.includes('--seed')

const db = await PGlite.create(
  dataDir === 'memory://' ? undefined : dataDir,
)

async function applyMigrations() {
  const migrationsDir = path.resolve('apps/server/prisma/migrations')
  const entries = (await readdir(migrationsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  for (const name of entries) {
    const sql = await readFile(
      path.join(migrationsDir, name, 'migration.sql'),
      'utf8',
    )
    await db.exec(sql)
    console.log(`[PGlite] applied migration ${name}`)
  }
}

function runSeed() {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['db:seed'], {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd(),
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`pnpm db:seed exited with code ${code}`))
    })
  })
}

if (shouldInit) {
  const existing = await db.query(
    `SELECT to_regclass('public."Word"') AS "exists"`,
  )
  if (!existing.rows[0]?.exists) {
    await applyMigrations()
  } else {
    console.log('[PGlite] schema already present, skip migrations')
  }
}

const server = new PGLiteSocketServer({
  db,
  host,
  port,
  maxConnections: 10,
})

await server.start()

console.log(
  `[PGlite] ready on ${host}:${port} (data: ${dataDir === 'memory://' ? 'memory' : dataDir})`,
)

if (shouldSeed) {
  await runSeed()
}

let stopping = false
const shutdown = async (signal) => {
  if (stopping) return
  stopping = true
  console.log(`[PGlite] ${signal} received, shutting down...`)
  await server.stop()
  await db.close()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
