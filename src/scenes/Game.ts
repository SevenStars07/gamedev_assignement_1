import Phaser from 'phaser';

export default class Main extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  cursors: any;
  platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  endPlatforms: Phaser.Types.Physics.Arcade.SpriteWithStaticBody[] = [];
  lives: number = 10000;
  score: number = 0;
  livesText!: Phaser.GameObjects.Text;
  gameOverText!: Phaser.GameObjects.Text;
  scoreText!: Phaser.GameObjects.Text;
  isDead: boolean = false;
  enemies: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
  timeSinceLastSpawn: number = 0;
  enemySpawnTime: number = 1000;
  timeSinceLastAttack: number = 0;
  attackTime: number = 750;
  shouldPlayIdleAnimation: boolean = true;
  flag: any;

  preload() {
    this.load.image("leftTile", "assets/map/tiles/Tile_01.png");
    this.load.image("middleTile", "assets/map/tiles/Tile_02.png");
    this.load.image("rightTile", "assets/map/tiles/Tile_03.png");
    this.load.image("dude", "assets/entities/dude.png");
    this.load.image("flag", "assets/map/flag.png");
    this.load.image("lava1", "assets/map/lava/lava_tile1.png");
    this.load.image("lava2", "assets/map/lava/lava_tile2.png");
    this.load.image("lava3", "assets/map/lava/lava_tile3.png");
    this.load.image("lava4", "assets/map/lava/lava_tile4.png");
    this.load.spritesheet("enemy", "assets/entities/enemy1/idle.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("enemy1_walk", "assets/entities/enemy1/walk.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("enemy1_hurt", "assets/entities/enemy1/hurt.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("dude_idle", "assets/entities/dude/Idle.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("walk_left", "assets/entities/dude/walk_left.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("walk_right", "assets/entities/dude/walk_right.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("dude_attack", "assets/entities/dude/attack.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("dude_hurt", "assets/entities/dude/hurt.png", {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet("dude_death", "assets/entities/dude/death.png", {
      frameWidth: 48,
      frameHeight: 48,
    });

    this.handleEnemyCollision = this.handleEnemyCollision.bind(this);
    this.onHitEnemy = this.onHitEnemy.bind(this);
  }

  create() {
    this.physics.world.setBoundsCollision(false, false, false, true);
    this.cursors = this.input.keyboard.createCursorKeys();

    this.createWorld();
    this.createPlayerAndAnimations();
    this.createEnemyAnimations();

    this.addCollisions();
    this.cameras.main.startFollow(this.player, true, 0.5, 0.5, -100, 0);
    this.createUi();

    this.physics.world.on(
      "worldbounds",
      (
        body: any,
        blockedUp: any,
        blockedDown: any,
        blockedLeft: any,
        blockedRight: any
      ) => {
        if (blockedDown) {
          if (body === this.player.body) {
            this.stopGame();
          } else {
            let go = this.enemies.find((enemy) => enemy.body === body);
            go?.destroy();
          }
        }
      }
    );
  }

  private addCollisions() {
    this.physics.add.collider(this.player, this.platformGroup);

    this.physics.add.collider(this.player, this.flag, () => {
      let time = this.time.now;
      let minutes = Math.floor(time / 60000);
      let seconds = Math.floor((time % 60000) / 1000);
      let formattedTime = `${minutes} minutes and ${seconds} seconds`;
      this.scene.start("GameOverScene", {
        score: this.score,
        time: formattedTime,
        didWin: true,
      });
    });
  }

  update(time: number, delta: number): void {
    if (this.isDead) return;

    // spawn enemies every 1 second
    this.timeSinceLastSpawn += delta;
    if (this.timeSinceLastSpawn > this.enemySpawnTime) {
      this.createEnemies();
      this.timeSinceLastSpawn = 0;
    }

    this.playerMovement();

    this.timeSinceLastAttack += delta;
    // if space is pressed, attack
    if (this.cursors.space.isDown) {
      if (this.timeSinceLastAttack < this.attackTime) return;
      this.attack();
    }
  }

  attack() {
    this.shouldPlayIdleAnimation = false;
    this.player.anims.play("attack");
    var attackRect = this.add.rectangle(
      this.player.x + 32,
      this.player.y,
      32,
      32,
      0xffffff,
      0
    );
    this.physics.world.enable(attackRect, Phaser.Physics.Arcade.STATIC_BODY);
    this.physics.add.overlap(attackRect, this.enemies, this.onHitEnemy);
    this.timeSinceLastAttack = 0;
    setTimeout(() => {
      this.shouldPlayIdleAnimation = true;
      attackRect.destroy();
    }, 500);
  }

  onHitEnemy(
    sword: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemy: any
  ) {
    this.score += 20;
    this.scoreText.setText(`Score: ${this.score}`);
    enemy.body.enable = false;
    enemy.anims.play("enemy1_hurt");
    sword.destroy();
    setTimeout(() => {
      enemy.destroy();
    }, 500);
  }

  createEnemies() {
    this.endPlatforms.forEach((endPlatform) => {
      if (Phaser.Math.Between(0, 100) > 50) return;
      const nextSpawnX = Phaser.Math.Between(
        endPlatform.x - endPlatform.width / 2,
        endPlatform.x
      );

      //if nextSpawnX is slightly ahead of player, don't spawn
      if (nextSpawnX < this.player.x + 50) return;

      let enemy = this.physics.add.sprite(
        nextSpawnX,
        endPlatform.y - 32,
        "enemy"
      );
      enemy.body.setSize(32, 32, true);
      enemy.setCollideWorldBounds(true);
      enemy.setBounce(0.1);
      enemy.setVelocityX(-100);

      enemy.anims.play("enemy1_walk_left", true);
      enemy.scaleX = -1;
      enemy.body.offset.x = 32;

      enemy.body.onWorldBounds = true;
      this.enemies.push(enemy);
      this.physics.add.collider(enemy, this.platformGroup);
      this.physics.add.collider(enemy, this.player, () => {
        this.handleEnemyCollision(enemy);
      });
    });
  }

  createEnemyAnimations() {
    this.anims.create({
      key: "enemy1_walk_left",
      frames: this.anims.generateFrameNumbers("enemy1_walk", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy1_stay",
      frames: this.anims.generateFrameNumbers("enemy", {
        start: 0,
        end: 3,
      }),
      frameRate: 20,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy1_walk_right",
      frames: this.anims.generateFrameNumbers("enemy1_walk", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy1_hurt",
      frames: this.anims.generateFrameNumbers("enemy1_hurt", {
        start: 0,
        end: 1,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  handleEnemyCollision(enemy: any) {
    // play hurt animation
    this.shouldPlayIdleAnimation = false;
    this.player.anims.stop();
    this.player.anims.play("hurt");
    this.lives -= 1;
    this.livesText.setText(`Lives: ${this.lives}`);
    enemy.destroy();

    if (this.lives <= 0) {
      this.player.anims.stop();
      this.player.anims.play("death");
      this.player.body.setEnable(false);
      setTimeout(() => {
        this.stopGame();
      }, 500);
      return;
    }

    setTimeout(() => {
      this.shouldPlayIdleAnimation = true;
    }, 500);
  }

  stopGame() {
    this.isDead = true;
    this.player.destroy();

    this.enemies.forEach((enemy) => {
      enemy.destroy();
    });

    // this.gameOverText.setVisible(true);
    // transform milliseconds in minutes:seconds
    let time = this.time.now;
    let minutes = Math.floor(time / 60000);
    let seconds = Math.floor((time % 60000) / 1000);
    let formattedTime = `${minutes} minutes and ${seconds} seconds`;
    this.scene.start("GameOverScene", {
      score: this.score,
      time: formattedTime,
      didWin: false,
    });
  }

  createWorld() {
    this.platformGroup = this.physics.add.staticGroup();

    this.createPlatform(10, 570, 10);
    this.createPlatform(100, 400, 3);
    this.createPlatform(400, 570, 8);
    this.createPlatform(500, 400, 5);
    this.createLava();

    let lastX = 500;
    let lastY = 400;
    let lastLength = 5;

    for (let i = 0; i < 10; i++) {
      lastX = Phaser.Math.Between(
        lastX + lastLength * 32 + 50,
        lastX + lastLength * 32 + 250
      );
      lastY = Phaser.Math.Between(400, lastY - 50);
      lastLength = Phaser.Math.Between(1, 10);
      this.createPlatform(lastX, lastY, lastLength);
      lastX = lastX + lastLength * 32 + 50;
      lastY = Phaser.Math.Between(570, 400);
      lastLength = Phaser.Math.Between(1, 10);
      this.createPlatform(lastX, lastY, lastLength);

      // spawn flag on last platform
      if (i === 9) {
        const position =
          this.endPlatforms[this.endPlatforms.length - 1].body.position;

        this.flag = this.physics.add
          .sprite(position.x + 10, position.y - 32, "flag")
          .setScale(0.5);

        this.flag.body.setAllowGravity(false);
      }
    }
  }

  createPlatform(x: number, y: number, length: number) {
    this.platformGroup.create(x, y, "leftTile");
    let i = 0;
    for (i = 1; i <= length - 2; i++) {
      this.platformGroup.create(x + i * 32, y, "middleTile");
    }

    const endPlatform = this.platformGroup.create(
      x + (length - 1) * 32,
      y,
      "rightTile"
    );
    this.endPlatforms.push(endPlatform);
  }

  createPlayerAndAnimations() {
    this.player = this.physics.add.sprite(30, 500, "dude");
    this.player.body.setSize(32, 32, true);
    this.lives = 3;
    this.player.setCollideWorldBounds(true);
    this.player.body.onWorldBounds = true;
    this.player.setBounce(0.1);

    this.anims.create({
      key: "left",
      frames: this.anims.generateFrameNumbers("walk_left", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "stay",
      frames: this.anims.generateFrameNumbers("dude_idle", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "right",
      frames: this.anims.generateFrameNumbers("walk_right", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "attack",
      frames: this.anims.generateFrameNumbers("dude_attack", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
    });

    this.anims.create({
      key: "hurt",
      frames: this.anims.generateFrameNumbers("dude_hurt", {
        start: 0,
        end: 1,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "death",
      frames: this.anims.generateFrameNumbers("dude_death", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  playerMovement() {
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
      if (this.shouldPlayIdleAnimation) {
        this.player.anims.play("left", true);
      }
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
      if (this.shouldPlayIdleAnimation) {
        this.player.anims.play("right", true);
      }
    } else {
      this.player.setVelocityX(0);
      if (this.shouldPlayIdleAnimation) {
        this.player.anims.play("stay", true);
      }
    }

    if (this.cursors.up.isDown && this.player.body.touching.down) {
      this.player.setVelocityY(-330);
    }
  }

  createUi() {
    this.gameOverText = this.add
      .text(
        Number(this.game.config.width) / 2,
        Number(this.game.config.height) / 2,
        "Game Over",
        {
          fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
        }
      )
      .setOrigin(0.5);
    this.gameOverText.setScrollFactor(0);
    this.gameOverText.setVisible(false);

    this.scoreText = this.add.text(700, 50, `Score: ${this.score}`, {
      fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
    });
    this.scoreText.setScrollFactor(0);

    this.livesText = this.add.text(50, 50, `Lives: ${this.lives}`, {
      fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif',
    });

    this.livesText.setScrollFactor(0);
  }

  createLava() {
    let lastX = -300;
    let lastY = 600;
    for (let i = 0; i < 1000; i++) {
      this.add.image(lastX, lastY, "lava3").setScale(2, 1);

      for (let j = 1; j < 5; j++) {
        this.add.image(lastX, lastY + j * 64, "lava1").setScale(2, 1);
      }
      lastX = lastX + 128;
    }
  }
}