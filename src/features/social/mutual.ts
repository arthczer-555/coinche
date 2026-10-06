import { plural } from '@/features/coinche/format';
import { firstName } from '@/features/coinche/players';

/**
 * Les amis en commun en une ligne : "En commun : Léa", "En commun : Léa et Paul",
 * "En commun : Léa, Paul et Zoé", "En commun : Léa, Paul et 3 autres".
 * `names` : quelques-uns de ces amis (noms complets), `count` : leur nombre exact.
 */
export function mutualFriendsLabel(names: string[], count: number): string {
  const firsts = names.map(firstName);
  if (count <= 0 || firsts.length === 0) return count > 0 ? `${plural(count, 'ami')} en commun` : '';
  if (count <= firsts.length && count <= 3) {
    const shown = firsts.slice(0, count);
    const list = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(', ')} et ${shown[shown.length - 1]}`;
    return `En commun : ${list}`;
  }
  const shown = firsts.slice(0, 2);
  return `En commun : ${shown.join(', ')} et ${plural(count - shown.length, 'autre')}`;
}
