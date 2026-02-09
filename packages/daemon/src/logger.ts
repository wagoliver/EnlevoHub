import pino from 'pino'
import path from 'path'
import fs from 'fs'

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
        level: 'info',
      },
      {
        target: 'pino/file',
        options: {
          destination: path.join(logsDir, 'enlevohub.log'),
          mkdir: true,
        },
        level: 'info',
      },
    ],
  },
})
