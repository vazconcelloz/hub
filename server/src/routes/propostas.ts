import { Router } from 'express';
import { prisma } from '../db';

const router = Router();

// Rota pública para buscar a proposta completa em uma única chamada
router.get('/full/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`Buscando proposta saúde: ${slug}`);

    const proposta = await prisma.proposta.findFirst({
      where: { 
        slug: {
          equals: slug,
          mode: 'insensitive'
        }
      },
      include: {
        operadoras: {
          orderBy: {
            ordem_exibicao: 'asc'
          }
        }
      }
    });

    if (!proposta) {
      console.log(`Proposta saúde não encontrada: ${slug}`);
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    // Tracking: incrementa visualizações se não for preview do admin
    if (req.query.tracking !== 'false') {
      prisma.proposta.update({
        where: { id: proposta.id },
        data: {
          visualizacoes: { increment: 1 },
          ultimo_acesso: new Date()
        }
      }).catch(err => console.error('Error updating health tracking:', err));
    }

    console.log(`Proposta saúde encontrada com ${proposta.operadoras.length} operadoras`);

    return res.json({
      proposta: {
        ...proposta,
        operadoras: undefined
      },
      operadoras: proposta.operadoras
    });
  } catch (error: any) {
    console.error('Error fetching full proposal:', error);
    return res.status(500).json({ error: 'Erro ao carregar proposta' });
  }
});

// Rota pública para buscar a proposta auto completa
router.get('/auto/full/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`Buscando proposta auto: ${slug}`);

    const proposta = await prisma.propostaAuto.findFirst({
      where: { 
        slug: {
          equals: slug,
          mode: 'insensitive'
        }
      },
      include: {
        seguradoras: {
          orderBy: {
            ordem_exibicao: 'asc'
          }
        }
      }
    });

    if (!proposta) {
      console.log(`Proposta auto não encontrada: ${slug}`);
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    // Tracking: incrementa visualizações se não for preview do admin
    if (req.query.tracking !== 'false') {
      prisma.propostaAuto.update({
        where: { id: proposta.id },
        data: {
          visualizacoes: { increment: 1 },
          ultimo_acesso: new Date()
        }
      }).catch(err => console.error('Error updating auto tracking:', err));
    }

    console.log(`Proposta auto encontrada com ${proposta.seguradoras.length} seguradoras`);

    return res.json({
      proposta,
      seguradoras: proposta.seguradoras
    });
  } catch (error: any) {
    console.error('Error fetching full auto proposal:', error);
    return res.status(500).json({ error: 'Erro ao carregar proposta' });
  }
});

export default router;
