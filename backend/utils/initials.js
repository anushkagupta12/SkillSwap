/** Single source of truth for avatar initials. Never returns "UNDEFINED". */
function makeInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  const first = Array.from(parts[0])[0];
  const second = parts[1] ? Array.from(parts[1])[0] : '';
  return (first + second).toUpperCase();
}

module.exports = { makeInitials };
