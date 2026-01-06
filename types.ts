
export type Point = {
  x: number;
  y: number;
};

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface GameState {
  snake: Point[];
  food: Point;
  direction: Direction;
  score: number;
  status: GameStatus;
  speed: number;
  highScore: number;
  commentary: string;
  theme: string;
}

export interface AIResponse {
  commentary: string;
  themeDescription?: string;
  advice?: string;
}
