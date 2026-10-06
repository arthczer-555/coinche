/**
 * Modèle de données d'une partie de coinche.
 * Synchronisé avec Supabase quand le joueur a un compte (voir src/features/sync) :
 * ids UUID générés sur le téléphone, dates ISO, joueurs rattachés aux équipes.
 */

export type TeamId = 'A' | 'B';

/**
 * Joueur assis à la table.
 * - `user` : un compte Coinche (ou, tant qu'on n'est pas connecté, l'identité locale du téléphone).
 * - `guest` : un invité sans compte, juste un prénom. Il pourra réclamer sa place plus tard.
 */
export type Seat =
  | { kind: 'user'; id: string; name: string; username?: string | null; avatarUrl?: string | null }
  | { kind: 'guest'; id: string; name: string };

export type Team = {
  name: string;
  /** 0 à 2 joueurs identifiés. Une partie sans joueurs reste valide. */
  players: Seat[];
};

/** Valeur d'une annonce : 80 à 160 par pas de 10, capot ou générale. */
export type Bid = number | 'capot' | 'generale';

export type Coinche = 'none' | 'coinche' | 'surcoinche';

/** Couleur de carte : atout d'une mène et identité visuelle des équipes. */
export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs' | 'no-trump' | 'all-trump';

export type Score = Record<TeamId, number>;

export type Round = {
  id: string;
  /** Équipe qui a pris le contrat. */
  bidder: TeamId;
  /** Ancien champ : joueur qui a pris. Plus saisi, gardé pour les mènes déjà enregistrées. */
  takerId?: string | null;
  bid: Bid;
  /** Atout annoncé. Facultatif à la saisie : n'influe pas sur le score. */
  trump: Suit | null;
  coinche: Coinche;
  /** Contrat réalisé ou chuté. */
  made: boolean;
  createdAt: string;
};

/** Qui peut voir la partie une fois synchronisée. */
export type Visibility = 'public' | 'friends' | 'private';

export type Game = {
  id: string;
  /** Compte qui compte les points (seul à pouvoir modifier la partie). Null tant qu'on n'est pas connecté. */
  ownerId: string | null;
  teams: Record<TeamId, Team>;
  targetScore: number;
  rounds: Round[];
  visibility: Visibility;
  /** Récit facultatif, ajouté après la partie par son auteur. */
  note?: string | null;
  /** Où on a joué ("Café des Amis, Lyon"). */
  location?: string | null;
  /** Photo de la tablée (chemin dans le stockage Supabase, bucket privé game-photos). */
  photoPath?: string | null;
  /** Bande (club) dans laquelle la partie est rangée. */
  groupId?: string | null;
  /**
   * Partie classée, choisie au lancement : elle compte pour la cote Elo si, à la fin, la table compte
   * 4 comptes tous amis avec l'auteur (voir features/players/ranked.ts et try_rate_game côté base).
   */
  ranked?: boolean;
  /**
   * "Juste les points", comme la v1.0 : seul l'auteur est à la table, personne n'est tagué, et la partie
   * reste privée (dans son fil, nulle part ailleurs). Ni récit, ni bravos, ni commentaires, ni classements.
   */
  simple?: boolean;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  winner: TeamId | null;
};
