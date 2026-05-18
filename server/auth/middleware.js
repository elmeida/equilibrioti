import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'change-this-secret';

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
  if (!['admin', 'administrador'].includes(String(req.user?.perfil || '').toLowerCase())) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  return next();
}

export function requireEmpresa(req, res, next) {
  let empresaId = req.user.empresa_id;
  if (req.user.perfil === 'admin') {
    empresaId = req.headers['x-empresa-id'] || req.query.empresaId || empresaId;
  }
  if (!empresaId) {
    return res.status(400).json({ error: 'Empresa não selecionada ou não vinculada.' });
  }
  req.empresaId = empresaId;
  next();
}
