export type EditorialPhoto = {
  src: string;
  alt: string;
  credit: string;
  objectPosition?: string;
};

// Add approved local images under public/editorial, then set the matching slot.
// Player and game slots are keyed by dataset IDs to avoid misidentifying photos.
export const editorialMedia: {
  season: EditorialPhoto | null;
  play: EditorialPhoto | null;
  players: Record<string, EditorialPhoto>;
  opponents: Record<string, EditorialPhoto>;
  games: Record<string, EditorialPhoto>;
} = {
  season: null,
  play: null,
  players: {},
  opponents: {},
  games: {},
};
