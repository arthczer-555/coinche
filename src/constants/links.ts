/**
 * Liens publics. Le site GitHub Pages (docs/) redirige vers l'app (`coinche://…`) et propose
 * l'App Store sinon : un lien https passe partout (SMS, WhatsApp), contrairement au schéma de l'app.
 * À passer sur un domaine à nous (liens universels iOS) quand il existera.
 */
export const WEB_URL = 'https://arthczer-555.github.io/coinche';

export const PRIVACY_URL = `${WEB_URL}/confidentialite.html`;
export const SUPPORT_URL = `${WEB_URL}/`;
/** Contact (support, mot de passe oublié) : la même adresse que sur le site. */
export const CONTACT_EMAIL = 'arthur.czernichow14@gmail.com';

/** Lien d'un profil : c'est aussi le contenu du QR code affiché sur le profil. */
export function profileLink(profileId: string): string {
  return `${WEB_URL}/u.html?id=${profileId}`;
}

/** Lien envoyé à un invité pour qu'il récupère ses parties en créant son compte. */
export function inviteLink(guestId: string): string {
  return `${WEB_URL}/invite.html?id=${guestId}`;
}

/** Lien pour rejoindre une bande avec son code. */
export function groupInviteLink(code: string): string {
  return `${WEB_URL}/join.html?code=${code}`;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Id de profil contenu dans un QR code Coinche (lien web ou lien de l'app), sinon null. */
export function parseProfileLink(data: string): string | null {
  const match = data.match(new RegExp(`(?:u\\.html\\?id=|coinche://u/)(${UUID})`, 'i'));
  return match ? match[1].toLowerCase() : null;
}
