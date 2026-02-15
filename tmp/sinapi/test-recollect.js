const { PrismaClient } = require('@prisma/client')
const { SinapiCollectorService } = require('../../packages/backend/dist/modules/sinapi/sinapi-collector.service')

async function main() {
  const prisma = new PrismaClient()
  const collector = new SinapiCollectorService(prisma)

  console.log('Re-collecting SINAPI 2026-01 with full composition tree...')
  console.log('This may take several minutes.\n')

  try {
    const result = await collector.collect(2026, 1, 'system', (msg) => {
      console.log(`  ${msg}`)
    })

    console.log('\n=== RESULT ===')
    console.log(JSON.stringify(result, null, 2))

    // Verify: check composition 103324 (alvenaria) tree
    console.log('\n=== VERIFY: Alvenaria 103324 ===')
    const comp = await prisma.sinapiComposicao.findUnique({
      where: { codigo: '103324' },
      include: {
        itens: { include: { insumo: true } },
        filhos: { include: { filho: true } },
      },
    })

    if (comp) {
      console.log(`\nComposição: ${comp.descricao}`)
      console.log(`\nInsumos diretos (${comp.itens.length}):`)
      for (const it of comp.itens) {
        console.log(`  [${it.insumo.tipo}] ${it.insumo.codigo} - ${it.insumo.descricao.substring(0, 60)} | coef: ${it.coeficiente}`)
      }
      console.log(`\nSub-composições (${comp.filhos.length}):`)
      for (const f of comp.filhos) {
        console.log(`  ${f.filho.codigo} - ${f.filho.descricao.substring(0, 60)} | coef: ${f.coeficiente}`)

        // Load sub-comp items
        const sub = await prisma.sinapiComposicao.findUnique({
          where: { id: f.filhoId },
          include: {
            itens: { include: { insumo: true } },
            filhos: { include: { filho: true } },
          },
        })
        if (sub) {
          for (const sit of sub.itens) {
            console.log(`    └─ [${sit.insumo.tipo}] ${sit.insumo.codigo} - ${sit.insumo.descricao.substring(0, 50)} | coef: ${sit.coeficiente}`)
          }
          for (const sf of sub.filhos) {
            console.log(`    └─ [SUB] ${sf.filho.codigo} - ${sf.filho.descricao.substring(0, 50)} | coef: ${sf.coeficiente}`)
          }
        }
      }
    }

    // Stats
    const totalFilhos = await prisma.sinapiComposicaoFilho.count()
    const totalInsumoLinks = await prisma.sinapiComposicaoInsumo.count()
    console.log(`\n=== STATS ===`)
    console.log(`Total insumo links: ${totalInsumoLinks}`)
    console.log(`Total sub-composition links: ${totalFilhos}`)
  } catch (err) {
    console.error('ERROR:', err.message)
    console.error(err.stack)
  } finally {
    await prisma.$disconnect()
  }
}

main()
