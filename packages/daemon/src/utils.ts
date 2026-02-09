import { createServer } from 'net'

export async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(false)
      }
    })

    server.once('listening', () => {
      server.close()
      resolve(true)
    })

    server.listen(port)
  })
}

export async function waitForPort(
  port: number,
  timeout: number = 30000
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const isOpen = await checkPortOpen(port)
    if (isOpen) return

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error(`Port ${port} did not become available within ${timeout}ms`)
}

async function checkPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new (require('net').Socket)()

    socket.setTimeout(1000)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })

    socket.connect(port, '127.0.0.1')
  })
}
