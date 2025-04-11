import Phaser from 'phaser';

export class BasicScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super({ key: 'BasicScene' });
    }

    preload() {
        this.load.image('player', 'player.png');
    }

    create() {
        // Posicionar al jugador en el centro inferior
        const centerX = this.cameras.main.width / 2;
        const bottomY = this.cameras.main.height - 50;

        this.player = this.physics.add.sprite(centerX, bottomY, 'player');
        this.player.setCollideWorldBounds(true);
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        const moveSpeed = 200;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-moveSpeed);
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(moveSpeed);
        }
        else {
            this.player.setVelocityX(0);
        }
    }
}
