import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'change-this-secret';

export function signUser(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, nome: user.nome, perfil: user.perfil },
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
