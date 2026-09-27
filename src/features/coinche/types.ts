/**
 * Modèle de données d'une partie de coinche.
 * Pensé pour être synchronisé plus tard avec un backend (profils, fil social) :
 * ids stables, dates ISO, joueurs optionnels rattachés aux équipes.
 */

export type TeamId = 'A' | 'B';

export type Team = {
  name: string;
  /** Ids des joueurs (profils) de l'équipe. Vide tant qu'il n'y a pas de comptes. */
  playerIds: string[];
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
  bid: Bid;
  /** Atout annoncé. Facultatif à la saisie : n'influe pas sur le score. */
  trump: Suit | null;
  coinche: Coinche;
  /** Contrat réalisé ou chuté. */
  made: boolean;
  createdAt: string;
};

export type Game = {
  id: string;
  teams: Record<TeamId, Team>;
  targetScore: number;
  rounds: Round[];
  createdAt: string;
  finishedAt: string | null;
  winner: TeamId | null;
};
