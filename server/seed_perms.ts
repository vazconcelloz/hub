import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissoes = [
  { chave: 'app.padrao', nome: 'Acesso Padrão', modulo: 'Geral', descricao: 'Dá acesso ao menu inicial, treinamentos e manuais.' },
  { chave: 'app.admin', nome: 'Acesso Administrativo', modulo: 'Geral', descricao: 'Acesso irrestrito a todas as áreas e configurações.' },
  { chave: 'app.segmentacoes', nome: 'Segmentações', modulo: 'Ferramentas', descricao: 'Permite acessar e gerenciar segmentações.' },
  { chave: 'cotacao.saude', nome: 'Cotação - Saúde', modulo: 'Cotações', descricao: 'Permite realizar cotações de plano de saúde.' },
  { chave: 'cotacao.auto', nome: 'Cotação - Auto', modulo: 'Cotações', descricao: 'Permite realizar cotações de seguro automóvel.' },
  { chave: 'cotacao.vida', nome: 'Cotação - Vida', modulo: 'Cotações', descricao: 'Permite realizar cotações de seguro de vida.' },
];

async function main() {
  console.log('Semeando permissões iniciais...');
  for (const perm of permissoes) {
    await prisma.permissao.upsert({
      where: { chave: perm.chave },
      update: perm,
      create: perm,
    });
  }
  console.log('Permissões inseridas com sucesso!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
