import { EnlevoHubDaemon } from './manager'
import { logger } from './logger'

async function main() {
  const daemon = new EnlevoHubDaemon()

  // Handle process signals
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...')
    await daemon.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...')
    await daemon.stop()
    process.exit(0)
  })

  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception')
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection')
    process.exit(1)
  })

  try {
    await daemon.start()
  } catch (error) {
    logger.error({ error }, 'Failed to start EnlevoHub daemon')
    process.exit(1)
  }
}

main()
