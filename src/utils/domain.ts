const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'seznam.cz',
  'email.cz',
  'centrum.cz',
  'atlas.cz',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'yahoo.com',
]);

export const normalizeCompanyDomain = (value: string): string => {
  const raw = (value || '').toString().trim();
  if (!raw) return '';

  let v = raw;
  v = v.replace(/^https?:\/\//i, '');
  v = v.replace(/^www\./i, '');
  v = v.split('/')[0] || '';
  v = v.split('?')[0] || '';
  v = v.split('#')[0] || '';
  v = v.trim().toLowerCase();
  return v;
};

export const inferDomainFromEmail = (email: string | undefined | null) => {
  const e = (email || '').toString().trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at <= 0) return '';
  const domain = e.slice(at + 1).trim();
  if (!domain) return '';
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) return '';
  return normalizeCompanyDomain(domain);
};

