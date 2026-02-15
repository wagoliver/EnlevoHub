const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Import the compiled collector
const { SinapiCollectorService } = require('../../packages/backend/dist/modules/sinapi/sinapi-collector.service')

async function main() {
  const prisma = new PrismaClient()
  const collector = new SinapiCollectorService(prisma)

  const zipPath = path.resolve(__dirname, 'SINAPI-2026-01.zip')
  if (!fs.existsSync(zipPath)) {
    console.error('ZIP not found:', zipPath)
    return
  }

  console.log('Importing from local ZIP:', zipPath)
  console.log('ZIP size:', (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1), 'MB\n')

  // We need to bypass the download step. Let's monkey-patch downloadFile
  // to just copy the local ZIP instead of downloading
  collector.downloadFile = async function(url, dest) {
    fs.copyFileSync(zipPath, dest)
    console.log('  (Using local cached ZIP)')
  }

  try {
    const result = await collector.collect(2026, 1, 'system', (msg) => {
      console.log(`  ${msg}`)
    })

    console.log('\n=== RESULT ===')
    console.log(JSON.stringify(result, null, 2))

    // Verify: check composition 103324 (alvenaria) full tree
    console.log('\n=== VERIFY: Alvenaria 103324 (full tree) ===')
    const comp = await prisma.sinapiComposicao.findUnique({
      where: { codigo: '103324' },
      include: {
        itens: { include: { insumo: true } },
        filhos: { include: { filho: true } },
      },
    })

    if (comp) {
      console.log(`\n${comp.codigo} - ${comp.descricao}`)
      console.log(`Unidade: ${comp.unidade}\n`)

      if (comp.itens.length > 0) {
        console.log(`Insumos diretos (${comp.itens.length}):`)
        for (const it of comp.itens) {
          console.log(`  [${it.insumo.tipo.padEnd(12)}] ${it.insumo.codigo.padEnd(6)} ${it.insumo.descricao.substring(0, 55).padEnd(55)} ${it.insumo.unidade.padEnd(5)} coef: ${it.coeficiente}`)
        }
      }

      if (comp.filhos.length > 0) {
        console.log(`\nSub-composicoes (${comp.filhos.length}):`)
        for (const f of comp.filhos) {
          console.log(`  [COMP] ${f.filho.codigo.padEnd(6)} ${f.filho.descricao.substring(0, 55).padEnd(55)} coef: ${f.coeficiente}`)

          // Load sub-comp items recursively (1 level)
          const sub = await prisma.sinapiComposicao.findUnique({
            where: { id: f.filhoId },
            include: {
              itens: { include: { insumo: true } },
              filhos: { include: { filho: true } },
            },
          })
          if (sub) {
            for (const sit of sub.itens) {
              console.log(`    |-- [${sit.insumo.tipo.padEnd(12)}] ${sit.insumo.codigo.padEnd(6)} ${sit.insumo.descricao.substring(0, 50).padEnd(50)} coef: ${sit.coeficiente}`)
            }
            for (const sf of sub.filhos) {
              console.log(`    |-- [COMP] ${sf.filho.codigo.padEnd(6)} ${sf.filho.descricao.substring(0, 50).padEnd(50)} coef: ${sf.coeficiente}`)

              // Level 2
              const sub2 = await prisma.sinapiComposicao.findUnique({
                where: { id: sf.filhoId },
                include: {
                  itens: { include: { insumo: true } },
                  filhos: { include: { filho: true } },
                },
              })
              if (sub2) {
                for (const s2it of sub2.itens) {
                  console.log(`      |-- [${s2it.insumo.tipo.padEnd(12)}] ${s2it.insumo.codigo.padEnd(6)} ${s2it.insumo.descricao.substring(0, 45)} coef: ${s2it.coeficiente}`)
                }
              }
            }
          }
        }
      }
    }

    // Stats
    const totalFilhos = await prisma.sinapiComposicaoFilho.count()
    const totalInsumoLinks = await prisma.sinapiComposicaoInsumo.count()
    const totalComps = await prisma.sinapiComposicao.count()
    console.log(`\n=== STATS ===`)
    console.log(`Composicoes: ${totalComps}`)
    console.log(`Insumo links: ${totalInsumoLinks}`)
    console.log(`Sub-composition links: ${totalFilhos}`)
  } catch (err) {
    console.error('ERROR:', err.message)
    console.error(err.stack)
  } finally {
    await prisma.$disconnect()
  }
}

main()
