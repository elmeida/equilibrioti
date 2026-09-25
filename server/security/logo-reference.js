export function isSafeLogoFileName(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}\.(?:png|jpe?g|webp)$/i.test(value);
}

export function isSafeLogoReference(value) {
  if (typeof value !== 'string') return false;
  if (value === '') return true;
  const name = value.startsWith('/uploads/empresas/') ? value.slice('/uploads/empresas/'.length) : value.startsWith('/') ? value.slice(1) : '';
  return isSafeLogoFileName(name);
}

export function safeLogoReference(value) {
  return isSafeLogoReference(value) ? value : '';
}
