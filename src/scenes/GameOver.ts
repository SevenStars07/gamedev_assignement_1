export interface GameOverSceneProps {
  score: number;
  time: string;
  didWin: boolean;
}

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  gameOverText!: Phaser.GameObjects.Text;
  score: number = 0;
  lastedTime: string = "";
  didWin: boolean = false;

  init(data: GameOverSceneProps) {
    this.score = data.score;
    this.lastedTime = data.time;
    this.didWin = data.didWin;
  }

  preload() {}

  create() {
    const text = this.didWin
      ? `Congratulations!\nYou finished in ${this.lastedTime} and scored ${this.score} points!`
      : `Game Over!\nYou scored ${this.score} points.\nYou lasted ${this.lastedTime}.`;
    this.gameOverText = this.add
      .text(
        Number(this.game.config.width) / 2,
        Number(this.game.config.height) / 2,
        text,
        {
          fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
        }
      )
      .setOrigin(0.5);
  }
}
