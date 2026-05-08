import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { Resend } from 'resend';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');

router.post('/invoke/:functionName', authMiddleware, async (req, res) => {
  try {
    const { functionName } = req.params;
    const body = req.body;

    switch (functionName) {
      case 'send-convite-email': {
        const { email, role, token } = body;
        
        if (!process.env.RESEND_API_KEY) {
          console.warn("Resend API Key não configurada. Simulando envio para", email);
          return res.json({ success: true, mocked: true });
        }

        const link = `http://localhost:8081/cadastro?token=${token}`;
        await resend.emails.send({
          from: 'Hub Grupo FBN <onboarding@resend.dev>', // Atualize para seu domínio verificado depois
          to: [email],
          subject: 'Convite - Hub Grupo FBN',
          html: `<p>Você foi convidado para acessar o Hub Grupo FBN como ${role}.</p><p><a href="${link}">Clique aqui para criar sua conta</a></p>`
        });
        
        return res.json({ success: true });
      }

      case 'extract-pdf-data':
      case 'extract-auto-pdf': {
        // Dummy implementation until Gemini API key is available
        console.log(`Simulando extração de IA para a função ${functionName}. Recebido:`, body);
        
        // Retorna um payload genérico que não quebre o frontend
        return res.json({
          sucesso: true,
          dados: {
            operadora: "SulAmérica",
            planos: [
              {
                nome: "Exato",
                valor: 1500.00,
                acomodacao: "Apartamento",
                coparticipacao: "Com Coparticipação"
              }
            ]
          }
        });
      }

      case 'import-rede-credenciada': {
        return res.json({
          sucesso: true,
          registros_processados: 1,
          erros: []
        });
      }

      default:
        return res.status(404).json({ error: `Função ${functionName} não encontrada.` });
    }
  } catch (error: any) {
    console.error(`Error in function ${req.params.functionName}:`, error);
    return res.status(500).json({ error: 'Erro interno ao executar a função.' });
  }
});

export default router;
