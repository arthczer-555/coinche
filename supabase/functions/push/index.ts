// Fonction Edge `push` : envoie une notification push (Expo) à chaque nouvelle ligne de `notifications`.
// Appelée par le déclencheur notifications_push (migration push_trigger, même message qu'un Database Webhook).
// Secrets : PUSH_WEBHOOK_SECRET (même valeur que l'en-tête x-webhook-secret, rangé dans Vault). Tout est posé par supabase/setup.sh.
import { createClient } from 'jsr:@supabase/supabase-js@2';

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: 'tag' | 'tag_accepted' | 'kudos' | 'comment' | 'friend_request' | 'friend_accepted';
  game_id: string | null;
};

const TEXT: Record<NotificationRow['type'], (name: string) => string> = {
  tag: (name) => `${name} t’a ajouté à une partie.`,
  tag_accepted: (name) => `${name} a confirmé votre partie.`,
  kudos: (name) => `${name} dit bravo pour ta partie !`,
  comment: (name) => `${name} a commenté une partie.`,
  friend_request: (name) => `${name} veut t’ajouter à ses amis.`,
  friend_accepted: (name) => `${name} a accepté ta demande d’ami.`,
};

/** Écran ouvert au tap (route Expo Router). */
function urlFor(n: NotificationRow): string {
  if ((n.type === 'friend_request' || n.type === 'friend_accepted') && n.actor_id) return `/u/${n.actor_id}`;
  if (n.type === 'comment' && n.game_id) return `/game/${n.game_id}/comments`;
  // Tag : la partie (déjà sur son profil ; "Pas moi" dans le menu "…" s'il n'y était pas).
  return n.game_id ? `/game/${n.game_id}` : '/notifications';
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return new Response('Non autorisé', { status: 401 });
  }

  const payload = await req.json();
  const n = payload?.record as NotificationRow | undefined;
  if (payload?.type !== 'INSERT' || !n) return new Response('Ignoré', { status: 200 });

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const [actor, tokens, unread] = await Promise.all([
    n.actor_id ? sb.from('profiles').select('display_name').eq('id', n.actor_id).maybeSingle() : Promise.resolve({ data: null }),
    sb.from('push_tokens').select('token').eq('profile_id', n.recipient_id),
    sb.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', n.recipient_id).is('read_at', null),
  ]);
  const list = tokens.data ?? [];
  if (list.length === 0) return new Response('Pas de jeton', { status: 200 });

  const name = (actor.data?.display_name ?? 'Quelqu’un').trim().split(/\s+/)[0];
  const messages = list.map(({ token }) => ({
    to: token,
    title: 'Coinche',
    body: TEXT[n.type](name),
    data: { url: urlFor(n) },
    sound: 'default',
    badge: unread.count ?? 1,
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = await response.json();

  // Jetons expirés (app supprimée) : on fait le ménage.
  const dead = (result?.data ?? [])
    .map((ticket: { status: string; details?: { error?: string } }, i: number) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' ? list[i].token : null,
    )
    .filter(Boolean);
  if (dead.length > 0) await sb.from('push_tokens').delete().in('token', dead);

  return new Response(JSON.stringify({ sent: messages.length, removed: dead.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
