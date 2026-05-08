import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { authMiddleware, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();
const ALLOWED_DOMAIN = '@grupofbn.com.br';

function generateToken(user: any, role: string) {
  return jwt.sign(
    { id: user.id, email: user.email, role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
}

// ---------------------------------------------------------
// SIGN UP
// ---------------------------------------------------------
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith(ALLOWED_DOMAIN)) {
      return res.status(403).json({ error: `Apenas e-mails ${ALLOWED_DOMAIN} são permitidos.` });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existingUser) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: emailLower,
          password_hash: passwordHash,
        },
      });

      // Cria perfil
      await tx.profile.create({
        data: {
          user_id: newUser.id,
          email: newUser.email,
          display_name: newUser.email.split('@')[0],
        },
      });

      // Se for admin@grupofbn.com.br, cria como admin, senao user
      const roleName = emailLower === 'admin@grupofbn.com.br' ? 'admin' : 'user';
      await tx.userRole.create({
        data: {
          user_id: newUser.id,
          role: roleName,
        },
      });

      return { ...newUser, role: roleName };
    });

    const token = generateToken(user, user.role);

    return res.status(201).json({
      message: 'Conta criada com sucesso',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Erro interno ao criar conta' });
  }
});

// ---------------------------------------------------------
// LOGIN
// ---------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const emailLower = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: emailLower },
      include: { roles: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }

    const role = user.roles.length > 0 ? user.roles[0].role : 'user';
    const token = generateToken(user, role);

    return res.json({
      token,
      user: { id: user.id, email: user.email, role }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
});

// ---------------------------------------------------------
// GET ME (Session)
// ---------------------------------------------------------
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roles: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      profile: user.profile,
      role: user.roles[0]?.role || 'user'
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
