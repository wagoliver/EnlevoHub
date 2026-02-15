const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const url = 'https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-2026-01-formato-xlsx.zip'
const dest = path.join(__dirname, 'test-download.zip')

console.log('=== Teste download SINAPI (https.get nativo) ===')
console.log('URL:', url)
console.log('Sem VPN')
console.log('Iniciando...', new Date().toISOString())

let redirectCount = 0
const maxRedirects = 10

function doRequest(targetUrl) {
  const client = targetUrl.startsWith('https') ? https : http
  const startTime = Date.now()
  
  const req = client.get(targetUrl, { timeout: 30000 }, (res) => {
    const elapsed = Date.now() - startTime
    console.log(`  [${elapsed}ms] Status: ${res.statusCode} | URL: ${targetUrl.substring(0, 80)}...`)
    console.log(`  Headers:`, JSON.stringify({
      location: res.headers.location,
      'content-type': res.headers['content-type'],
      'content-length': res.headers['content-length'],
      server: res.headers.server,
    }, null, 2))

    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      redirectCount++
      console.log(`  -> Redirect #${redirectCount} para: ${res.headers.location}`)
      if (redirectCount > maxRedirects) {
        console.log('ERRO: Too many redirects!')
        process.exit(1)
      }
      const next = new URL(res.headers.location, targetUrl).toString()
      doRequest(next)
      return
    }

    if (res.statusCode !== 200) {
      console.log(`ERRO: HTTP ${res.statusCode}`)
      let body = ''
      res.on('data', (chunk) => body += chunk.toString().substring(0, 500))
      res.on('end', () => {
        console.log('Body:', body.substring(0, 300))
        process.exit(1)
      })
      return
    }

    console.log('  Status 200 - Baixando...')
    const file = fs.createWriteStream(dest)
    let downloaded = 0
    res.on('data', (chunk) => {
      downloaded += chunk.length
      if (downloaded % (1024 * 1024) < chunk.length) {
        console.log(`  ${(downloaded / 1024 / 1024).toFixed(1)} MB...`)
      }
    })
    res.pipe(file)
    file.on('finish', () => {
      file.close()
      const stat = fs.statSync(dest)
      console.log(`\nSUCESSO! Arquivo: ${stat.size} bytes (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
      fs.unlinkSync(dest)
      process.exit(0)
    })
  })

  req.on('error', (err) => {
    console.log('ERRO:', err.message)
    process.exit(1)
  })
  req.on('timeout', () => {
    req.destroy()
    console.log('ERRO: Timeout (30s)')
    process.exit(1)
  })
}

doRequest(url)
