
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  exampleSentence: string;
  status: 'new' | 'known' | 'unknown' | 'half-known';
  nextReview?: number; // Timestamp
}

export interface Deck {
  id: string;
  authorId: string; // Connects to User
  name: string;
  cards: Flashcard[];
  createdAt: number;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  authorId: string;
  memberIds: string[]; // List of user IDs in this course
  deckIds: string[]; // List of deck IDs in this course
  createdAt: number;
}

export interface Folder {
  id: string;
  name: string;
  authorId: string;
  deckIds: string[]; // List of deck IDs in this folder
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  userId: string; // Connects to User
  deckId: string;
  deckName: string;
  action: 'created' | 'imported';
  timestamp: number;
}

export enum SwipeDirection {
  LEFT = 'LEFT',   // Don't Know
  RIGHT = 'RIGHT', // Know
  UP = 'UP',       // Half-known
}

export type FileInput = {
  data: string; // Base64
  mimeType: string;
  name: string;
};

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}
