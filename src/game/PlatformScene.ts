import Phaser from 'phaser';

interface PlatformSceneResult {
    coins: number;
    experience: number;
}

export class PlatformScene extends Phaser.Scene {
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private stars!: Phaser.Physics.Arcade.Group;
    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private gameOver: boolean = false;
    private coins: number = 0;
    private coinsText!: Phaser.GameObjects.Text;
    private experience: number = 0;
    private lastPlatformY: number = 0;
    private result: PlatformSceneResult = { coins: 0, experience: 0 };
    private powerups!: Phaser.Physics.Arcade.Group;
    private obstacles!: Phaser.Physics.Arcade.Group;
    private level: number = 1;
    private levelText!: Phaser.GameObjects.Text;
    private expToNextLevel: number = 100;
    private expText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'PlatformScene' });
    }

    preload() {
        // Usar colores sólidos en lugar de imágenes para garantizar que funcione
        this.load.spritesheet('character', '/assets/character_sprite.png', { 
            frameWidth: 32, 
            frameHeight: 48 
        });
        this.load.audio('coin', 'sounds/coin.mp3');
        this.load.audio('jump', 'sounds/jump.mp3');
        this.load.audio('levelup', 'sounds/levelup.mp3');
        this.load.audio('powerup', 'sounds/powerup.mp3');
        this.load.audio('hurt', 'sounds/hurt.mp3');
    }

    create() {
        // Crear fondo con gradiente
        const graphics = this.add.graphics();
        const gradient = graphics.createLinearGradient(0, 0, 0, 600);
        gradient.addColorStop(0, '#9dceff');
        gradient.addColorStop(1, '#f8c1ef');
        graphics.fillStyle(gradient);
        graphics.fillRect(0, 0, 800, 600);

        // Crear plataformas con gráficos generados
        this.platforms = this.physics.add.staticGroup();
        this.createPlatform(400, 568, 800, 32); // Suelo
        this.createPlatform(600, 400, 200, 32);
        this.createPlatform(50, 250, 200, 32);
        this.createPlatform(750, 220, 200, 32);

        // Crear jugador
        this.player = this.physics.add.sprite(100, 450, 'character');
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        
        // Si no hay sprite, crear un rectángulo como jugador
        if (!this.textures.exists('character')) {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xff00ff, 1);
            graphics.fillRect(0, 0, 32, 48);
            graphics.generateTexture('character_temp', 32, 48);
            this.player.setTexture('character_temp');
        }

        // Configurar controles
        this.cursors = this.input.keyboard.createCursorKeys();

        // Crear estrellas
        this.stars = this.physics.add.group({
            key: 'star',
            repeat: 11,
            setXY: { x: 12, y: 0, stepX: 70 }
        });

        this.stars.children.iterate((child: any) => {
            child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
            // Si no hay textura de estrella, crear una
            if (!this.textures.exists('star')) {
                const graphics = this.add.graphics();
                graphics.fillStyle(0xffff00, 1);
                graphics.fillStar(0, 0, 5, 15, 8);
                graphics.generateTexture('star_temp', 32, 32);
                child.setTexture('star_temp');
            }
        });

        // Configurar colisiones
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.stars, this.platforms);
        this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);

        // UI
        this.scoreText = this.add.text(16, 16, 'Score: 0', { 
            fontSize: '32px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4
        });

        // Añadir texto de monedas
        this.coinsText = this.add.text(16, 50, 'Coins: 0', {
            fontSize: '32px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4
        });

        // Añadir texto de nivel y experiencia
        this.levelText = this.add.text(16, 84, 'Level: 1', {
            fontSize: '32px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4
        });

        this.expText = this.add.text(16, 118, 'Exp: 0/' + this.expToNextLevel, {
            fontSize: '32px',
            color: '#fff',
            stroke: '#000',
            strokeThickness: 4
        });

        // Botón de retorno
        const backButton = this.add.text(700, 16, 'Volver', { 
            fontSize: '24px',
            backgroundColor: '#fff',
            padding: { x: 10, y: 5 },
            borderRadius: 5
        })
        .setInteractive()
        .on('pointerdown', () => {
            this.endMinigame();
        });

        // Asegurar que el jugador tenga una textura por defecto
        if (!this.textures.exists('character')) {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xff69b4, 1);
            graphics.fillRect(-16, -24, 32, 48);
            graphics.generateTexture('character_temp', 32, 48);
            this.player.setTexture('character_temp');
        }

        // Añadir animaciones del jugador
        if (this.textures.exists('character')) {
            this.anims.create({
                key: 'walk',
                frames: this.anims.generateFrameNumbers('character', { start: 0, end: 3 }),
                frameRate: 10,
                repeat: -1
            });
            this.anims.create({
                key: 'jump',
                frames: this.anims.generateFrameNumbers('character', { start: 4, end: 5 }),
                frameRate: 10,
                repeat: 0
            });
        }

        // Crear powerups
        this.powerups = this.physics.add.group();
        this.createPowerup();

        // Crear obstáculos
        this.obstacles = this.physics.add.group();
        this.createObstacle();

        // Añadir colisiones
        this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, undefined, this);
        this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, undefined, this);

        // Inicializar estado
        this.result = { coins: 0, experience: 0 };
    }

    private createPlatform(x: number, y: number, width: number, height: number) {
        const platform = this.add.graphics();
        platform.fillStyle(0x00ff00, 1);
        platform.fillRect(0, 0, width, height);
        platform.lineStyle(2, 0x008800);
        platform.strokeRect(0, 0, width, height);
        platform.generateTexture(`platform_${x}_${y}`, width, height);
        
        return this.platforms.create(x, y, `platform_${x}_${y}`);
    }

    update() {
        if (this.gameOver) return;

        // Movimiento horizontal con animaciones
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.player.setFlipX(true);
            this.player.anims.play('walk', true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            this.player.setFlipX(false);
            this.player.anims.play('walk', true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.stop();
        }

        // Salto mejorado
        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-400);
            this.player.anims.play('jump');
            this.sound.play('jump');
        }

        // Actualizar plataformas infinitas
        this.updatePlatforms();

        // Actualizar movimiento de powerups y obstáculos
        this.powerups.children.iterate((powerup: any) => {
            if (powerup.y > 550) {
                powerup.y = 0;
                powerup.x = Phaser.Math.Between(0, 800);
            }
        });

        this.obstacles.children.iterate((obstacle: any) => {
            if (obstacle.y > 550) {
                obstacle.y = 0;
                obstacle.x = Phaser.Math.Between(0, 800);
            }
        });
    }

    private collectStar(player: any, star: any) {
        star.disableBody(true, true);
        this.score += 10;
        this.coins += 1;
        this.experience += 5;
        
        this.scoreText.setText('Score: ' + this.score);
        this.coinsText.setText('Coins: ' + this.coins);
        this.sound.play('coin');

        // Efectos visuales
        this.tweens.add({
            targets: star,
            y: star.y - 50,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => star.destroy()
        });

        this.result.coins = this.coins;
        this.result.experience = this.experience;

        // Regenerar estrellas si todas fueron recolectadas
        if (this.stars.countActive(true) === 0) {
            this.createNewStarWave();
        }

        this.checkLevelUp();
    }

    private createNewStarWave() {
        this.stars.children.iterate((child: any) => {
            const x = Phaser.Math.Between(0, 800);
            const y = Phaser.Math.Between(0, 300);
            child.enableBody(true, x, y, true, true);
        });
    }

    private updatePlatforms() {
        // Plataformas infinitas
        if (this.player.y < 300 && this.lastPlatformY > -200) {
            this.createPlatform(
                Phaser.Math.Between(100, 700),
                this.lastPlatformY - 200,
                Phaser.Math.Between(100, 200),
                32
            );
            this.lastPlatformY -= 200;
        }
    }

    private createPowerup() {
        const x = Phaser.Math.Between(0, 800);
        const y = Phaser.Math.Between(0, 300);
        const powerup = this.add.graphics();
        powerup.fillStyle(0x00ffff, 1);
        powerup.fillCircle(0, 0, 10);
        powerup.generateTexture('powerup', 20, 20);
        
        const sprite = this.powerups.create(x, y, 'powerup');
        sprite.setBounce(1);
        sprite.setCollideWorldBounds(true);
        sprite.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }

    private createObstacle() {
        const x = Phaser.Math.Between(0, 800);
        const y = Phaser.Math.Between(0, 300);
        const obstacle = this.add.graphics();
        obstacle.fillStyle(0xff0000, 1);
        obstacle.fillTriangle(0, 20, 10, 0, 20, 20);
        obstacle.generateTexture('obstacle', 20, 20);
        
        const sprite = this.obstacles.create(x, y, 'obstacle');
        sprite.setBounce(1);
        sprite.setCollideWorldBounds(true);
        sprite.setVelocity(Phaser.Math.Between(-150, 150), 20);
    }

    private collectPowerup(player: Phaser.GameObjects.GameObject, powerup: Phaser.GameObjects.GameObject) {
        (powerup as Phaser.Physics.Arcade.Sprite).destroy();
        this.sound.play('powerup');
        this.experience += 20;
        this.checkLevelUp();
        this.createPowerup();
    }

    private hitObstacle(player: Phaser.GameObjects.GameObject, obstacle: Phaser.GameObjects.GameObject) {
        this.sound.play('hurt');
        this.cameras.main.shake(200, 0.01);
        this.score = Math.max(0, this.score - 5);
        this.scoreText.setText('Score: ' + this.score);
        (obstacle as Phaser.Physics.Arcade.Sprite).destroy();
        this.createObstacle();
    }

    private checkLevelUp() {
        if (this.experience >= this.expToNextLevel) {
            this.level++;
            this.experience -= this.expToNextLevel;
            this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
            
            this.sound.play('levelup');
            this.levelText.setText('Level: ' + this.level);
            
            // Efecto visual de subida de nivel
            this.tweens.add({
                targets: this.levelText,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: 200,
                yoyo: true,
                ease: 'Quad.easeInOut'
            });

            // Aumentar dificultad
            this.createObstacle();
            if (this.level % 2 === 0) {
                this.createPowerup();
            }
        }
        
        this.expText.setText(`Exp: ${this.experience}/${this.expToNextLevel}`);
    }

    private endMinigame() {
        this.result = {
            coins: this.coins,
            experience: this.experience + (this.level - 1) * this.expToNextLevel
        };
        this.scene.start('GameScene', this.result);
    }
}
