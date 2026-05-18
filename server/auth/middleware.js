import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'change-this-secret';

function isAdminProfile(perfil) {
  return ['admin', 'administrador'].includes(String(perfil || '').toLowerCase());
}

export function signUser(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, nome: user.nome, perfil: user.perfil, empresa_id: user.empresa_id },
    jwtSecret,
    { expiresIn: '12h' },
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : String(req.query.token || '');

  if (!token) {
    return res.status(401).json({ error: 'Sessão não informada. Faça login novamente.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
}

export function requireAdmin(req, res, next) {
  if (!isAdminProfile(req.user?.perfil)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  return next();
}

export function requireEmpresa(req, res, next) {
  const isAdmin = isAdminProfile(req.user?.perfil);
  let empresaId = req.user.empresa_id;

  if (isAdmin) {
    empresaId = req.headers['x-empresa-id'] || req.query.empresaId || req.query.empresa_id || empresaId;
  }

  if (!empresaId) {
    return res.status(400).json({
      error: isAdmin
        ? 'Selecione uma empresa para acessar os dados financeiros.'
        : 'Usuário não vinculado a nenhuma empresa.',
    });
  }

  req.empresaId = empresaId;
  next();
}
