/**
 * /.well-known/security.txt — RFC 9116
 *
 * Permet aux chercheurs en sécurité de signaler des vulnérabilités.
 * Servi statiquement avec Cache-Control long.
 */

export const runtime = "edge";
export const revalidate = 86400 * 30; // 30 jours

export async function GET(): Promise<Response> {
  // RFC 9116 : Contact, Expires, Preferred-Languages, Canonical sont les champs principaux.
  // Expires = 1 an dans le futur (à renouveler annuellement).
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  const body = `# Cryptoreflex security.txt — RFC 9116
Contact: mailto:contact@cryptoreflex.fr
Expires: ${expiresAt.toISOString()}
Preferred-Languages: fr, en
Canonical: https://www.cryptoreflex.fr/.well-known/security.txt
Policy: https://www.cryptoreflex.fr/charte
`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=2592000",
    },
  });
}
