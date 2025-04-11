import Phaser from 'phaser';
import { saveCharacterState, loadCharacterState } from '../utils/db';

async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notificaciones permitidas.');
    }
  }
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private hunger: number = 100;
  private hygiene: number = 100;
  private energy: number = 100;
  private fun: number = 100;
  private coins: number = 1000;
  private coinsText!: Phaser.GameObjects.Text;
  private bars: { [key: string]: Phaser.GameObjects.Container } = {};
  private buttons: Phaser.GameObjects.Container[] = [];
  private shopWindow!: Phaser.GameObjects.Container;
  private shopItems = [
    { emoji: '🥕', name: 'Zanahoria', price: 50, hunger: 10 },
    { emoji: '🍎', name: 'Manzana', price: 100, hunger: 25 },
    { emoji: '🥬', name: 'Lechuga', price: 75, hunger: 15 },
    { emoji: '🌾', name: 'Heno', price: 150, hunger: 40 }
  ];
  private foodItems = [
    { emoji: '🥕', value: 15 },
    { emoji: '🍎', value: 20 },
    { emoji: '🥬', value: 10 },
    { emoji: '🌾', value: 25 }
  ];
  private foodContainer!: Phaser.GameObjects.Container;
  private toyEmojis = ['🎈', '⭐', '🎾', '🦋', '🌸'];
  private isPlaying: boolean = false;
  private playScore: number = 0;
  private playScoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.image('player', '/player.png');
    this.load.audio('bath', 'sounds/bath.mp3');
    this.load.audio('sleep', 'sounds/sleep.mp3');
    this.load.audio('play', 'sounds/play.mp3');
    this.load.image('idle', '/player.png');
    this.load.image('bathing', '/player.png');
    this.load.image('sleeping', '/player.png');
    this.load.image('background', 'background.png'); 
    // Eliminamos la carga de imágenes de corazones ya que usaremos emojis
  }

  async create() {
    await requestNotificationPermission();
    
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'background')
    .setOrigin(0.5, 0.5)
    .setScale(1.2); 
    const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
    bg.displayWidth = this.scale.width;
    bg.displayHeight = this.scale.height;

    this.player = this.physics.add.sprite(400, 300, 'player');

    // Intentar cargar datos desde IndexedDB
    const savedState = await loadCharacterState();
    if (savedState) {
      this.hunger = savedState.hunger;
      this.hygiene = savedState.hygiene;
      this.energy = savedState.energy;
      this.fun = savedState.fun;
    }

    // Dibujar las barras de estado
    this.createStatusBar('hunger', 20, 20, 0xff0000);
    this.createStatusBar('hygiene', 20, 50, 0x00ff00);
    this.createStatusBar('energy', 20, 80, 0x0000ff);
    this.createStatusBar('fun', 20, 110, 0xffff00);

    this.updateAllStatusBars();

    // Agregar título del juego
    this.add.text(
      this.scale.width / 2,
      10,
      'Dear Dreams',
      {
        fontSize: '48px',
        fontFamily: 'cursive',
        color: '#FF69B4',
        stroke: '#FFFFFF',
        strokeThickness: 2,
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
      }
    ).setOrigin(0.5, 0);

    // Contador de monedas (ajustado para dar espacio al título)
    this.coinsText = this.add.text(
      this.scale.width / 2,
      100,
      `🪙 ${this.coins}`,
      {
        fontSize: '32px',
        color: '#FFD700',
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 4 }
      }
    ).setOrigin(0.5, 0);

    // Crear botones interactivos
    this.createButton('Dormir', this.scale.width - 150, this.scale.height - 200, () => this.sleep());
    this.createButton('Comer', this.scale.width - 150, this.scale.height - 150, () => this.feed());
    this.createButton('Jugar', this.scale.width - 150, this.scale.height - 100, () => this.play());
    this.createButton('Bañar', this.scale.width - 150, this.scale.height - 50, () => this.clean());
    this.createButton('Tienda 🏪', this.scale.width - 150, this.scale.height - 250, () => this.openShop());

    // Reducir valores más lentamente
    this.time.addEvent({
      delay: 5000, // Cada 5 segundos en lugar de 3
      callback: this.decreaseStats,
      callbackScope: this,
      loop: true,
    });

    // Crear el contenedor de la tienda pero mantenerlo invisible
    this.createShopWindow();

    // Añadir antes del final de create()
    this.createFoodContainer();
  }

  private createStatusBar(stat: string, x: number, y: number, color: number) {
    const heartsContainer = this.add.container(x, y);
    const hearts: Phaser.GameObjects.Text[] = [];
    
    for (let i = 0; i < 5; i++) {
      const heart = this.add.text(i * 35, 0, '❤️', {
        fontSize: '24px'
      });
      hearts.push(heart);
      heartsContainer.add(heart);
    }
    
    this.bars[stat] = heartsContainer;
    this.bars[stat].getData = () => hearts;
  }

  private updateStatusBar(stat: string) {
    const value = this[stat as keyof this] as number;
    const hearts = this.bars[stat].getData();
    // Cambiamos el cálculo para que se redondee hacia abajo en lugar de hacia arriba
    const heartsFull = Math.floor((value / 100) * 5);
    
    hearts.forEach((heart, index) => {
      // Aseguramos que los corazones se vacíen cuando el valor baje
      heart.setText(index < heartsFull ? '❤️' : '🤍');
    });
  }

  private updateAllStatusBars() {
    this.updateStatusBar('hunger');
    this.updateStatusBar('hygiene');
    this.updateStatusBar('energy');
    this.updateStatusBar('fun');
  }

  private async decreaseStats() {
    this.hunger = Math.max(0, this.hunger - 2);    // Reducido de 5 a 2
    this.hygiene = Math.max(0, this.hygiene - 1);  // Reducido de 3 a 1
    this.energy = Math.max(0, this.energy - 1);    // Reducido de 2 a 1
    this.fun = Math.max(0, this.fun - 2);          // Reducido de 4 a 2

    this.updateAllStatusBars();
    await this.saveGameState();

    if (this.hunger < 20) this.sendNotification('¡Tu personaje tiene hambre!', 'Dale de comer para que esté feliz.');
    if (this.hygiene < 20) this.sendNotification('¡Tu personaje necesita un baño!', 'Límpialo antes de que se ensucie más.');
    if (this.energy < 20) this.sendNotification('¡Tu personaje está cansado!', 'Déjalo dormir para recuperar energía.');
    if (this.fun < 20) this.sendNotification('¡Tu personaje está aburrido!', 'Juega con él para que se divierta.');
  }

  private sendNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.showNotification(title, {
            body,
            icon: '/icon.png',
          });
        }
      });
    }
  }

  public feed() {
    if (this.foodContainer.visible) {
      this.foodContainer.setVisible(false);
      return;
    }

    this.foodContainer.removeAll(true);
    
    // Crear opciones de comida (ajustando la posición Y para que aparezca más arriba)
    this.foodItems.forEach((food, index) => {
      const foodEmoji = this.add.text(
        this.scale.width/2 - 100 + (index * 50),
        this.scale.height/2 - 100, // Modificado para que aparezca más arriba
        food.emoji,
        { fontSize: '40px' }
      )
      .setInteractive({ draggable: true, useHandCursor: true });

      // Configurar eventos de arrastre
      foodEmoji.on('dragstart', () => {
        foodEmoji.setAlpha(0.8);
      });

      foodEmoji.on('drag', (pointer: Phaser.Input.Pointer) => {
        foodEmoji.x = pointer.x;
        foodEmoji.y = pointer.y;
      });

      foodEmoji.on('dragend', () => {
        foodEmoji.setAlpha(1);
        // Verificar si la comida está cerca del cervatillo
        const distance = Phaser.Math.Distance.Between(
          foodEmoji.x,
          foodEmoji.y,
          this.player.x,
          this.player.y
        );

        if (distance < 100) { // Si está lo suficientemente cerca
          this.feedAnimal(food.value);
          // Animación de comida
          this.tweens.add({
            targets: foodEmoji,
            scale: 0,
            duration: 500,
            onComplete: () => {
              foodEmoji.destroy();
              // Si no quedan más comidas visibles, ocultar el contenedor
              if (this.foodContainer.length === 0) {
                this.foodContainer.setVisible(false);
              }
            }
          });
        } else {
          // Regresar la comida a su posición original si no llegó al cervatillo
          this.tweens.add({
            targets: foodEmoji,
            x: this.scale.width/2 - 100 + (index * 50),
            y: this.scale.height/2,
            duration: 300
          });
        }
      });

      this.foodContainer.add(foodEmoji);
    });

    this.foodContainer.setVisible(true);
  }

  private feedAnimal(value: number) {
    this.hunger = Math.min(100, this.hunger + value);
    this.updateStatusBar('hunger');
    
    // Mostrar emoji de corazón sobre el cervatillo
    const heart = this.add.text(this.player.x, this.player.y - 50, '❤️', { fontSize: '32px' });
    this.tweens.add({
      targets: heart,
      y: this.player.y - 100,
      alpha: 0,
      duration: 1000,
      onComplete: () => heart.destroy()
    });
  }

  public async clean() {
    this.hygiene = Math.min(100, this.hygiene + 20);
    this.player.setTexture('bathing');
    this.sound.play('bath');
    this.updateStatusBar('hygiene');

    // Añadir animación de burbujas y agua
    const bubbles = ['🫧', '🛁', '💧'];
    let delay = 0;
    
    // Crear múltiples burbujas alrededor del cervatillo
    for (let i = 0; i < 8; i++) {
      delay += 150;
      const randomBubble = bubbles[Math.floor(Math.random() * bubbles.length)];
      const randomX = this.player.x + Phaser.Math.Between(-50, 50);
      const randomY = this.player.y + Phaser.Math.Between(-30, 30);
      
      const bubble = this.add.text(randomX, randomY, randomBubble, {
        fontSize: '24px'
      }).setAlpha(0);

      this.tweens.add({
        targets: bubble,
        alpha: { from: 0, to: 1 },
        y: '-=30',
        duration: 1000,
        ease: 'Power2',
        delay: delay,
        onComplete: () => {
          this.tweens.add({
            targets: bubble,
            alpha: 0,
            y: '-=20',
            duration: 500,
            onComplete: () => bubble.destroy()
          });
        }
      });
    }

    await this.saveGameState();
    setTimeout(() => this.player.setTexture('idle'), 1000);
  }

  public async sleep() {
    this.energy = Math.min(100, this.energy + 20);
    this.player.setTexture('sleeping');
    this.sound.play('sleep');
    this.updateStatusBar('energy');
    
    // Añadir animación de Zs
    let delay = 0;
    const zs = ['💤', '💤', '💤'];
    zs.forEach((z, index) => {
      delay += 200;
      const zText = this.add.text(
        this.player.x + 20 + (index * 15),
        this.player.y - 30 - (index * 15),
        z,
        { fontSize: '24px' }
      ).setAlpha(0);

      this.tweens.add({
        targets: zText,
        alpha: { from: 0, to: 1 },
        y: '-=20',
        duration: 1000,
        ease: 'Power2',
        delay: delay,
        onComplete: () => {
          this.tweens.add({
            targets: zText,
            alpha: 0,
            y: '-=10',
            duration: 500,
            onComplete: () => zText.destroy()
          });
        }
      });
    });

    await this.saveGameState();
    setTimeout(() => this.player.setTexture('idle'), 2000);
  }

  public async play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playScore = 0;
    
    // Crear texto de puntuación
    this.playScoreText = this.add.text(
      this.scale.width/2,
      50,
      '🎮 0',
      { fontSize: '32px' }
    ).setOrigin(0.5);

    // Iniciar bucle de juego
    const gameLoop = this.time.addEvent({
      delay: 1000,
      callback: this.spawnToy,
      callbackScope: this,
      repeat: 9 // 10 juguetes en total
    });

    // Terminar juego después de cierto tiempo
    this.time.delayedCall(12000, async () => {
      this.isPlaying = false;
      this.playScoreText.destroy();
      
      // Recompensa basada en la puntuación
      const funIncrease = Math.min(50, this.playScore * 5);
      this.fun = Math.min(100, this.fun + funIncrease);
      this.updateStatusBar('fun');
      
      // Mostrar emoji de celebración
      const celebration = this.add.text(
        this.player.x,
        this.player.y - 50,
        '🎉',
        { fontSize: '40px' }
      );
      
      this.tweens.add({
        targets: celebration,
        y: '-=50',
        alpha: 0,
        duration: 1000,
        onComplete: () => celebration.destroy()
      });

      await this.saveGameState();
    });
  }

  private spawnToy() {
    if (!this.isPlaying) return;
    
    const randomToy = this.toyEmojis[Math.floor(Math.random() * this.toyEmojis.length)];
    const x = Phaser.Math.Between(100, this.scale.width - 100);
    const y = Phaser.Math.Between(100, this.scale.height - 100);
    
    const toy = this.add.text(x, y, randomToy, {
      fontSize: '40px'
    })
    .setInteractive({ useHandCursor: true });

    // Hacer que el juguete brille
    this.tweens.add({
      targets: toy,
      scale: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Hacer que el juguete desaparezca después de un tiempo
    this.time.delayedCall(2000, () => {
      if (toy.active) {
        toy.destroy();
      }
    });

    // Evento de clic en el juguete
    toy.on('pointerdown', () => {
      this.playScore++;
      this.playScoreText.setText(`🎮 ${this.playScore}`);
      
      // Efecto de recolección
      this.tweens.add({
        targets: toy,
        scale: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => toy.destroy()
      });

      // Efecto de partículas de estrellas
      const stars = ['✨', '⭐', '💫'];
      for (let i = 0; i < 3; i++) {
        const star = this.add.text(toy.x, toy.y, 
          stars[Math.floor(Math.random() * stars.length)],
          { fontSize: '24px' }
        );
        
        this.tweens.add({
          targets: star,
          x: toy.x + Phaser.Math.Between(-50, 50),
          y: toy.y + Phaser.Math.Between(-50, 50),
          alpha: 0,
          duration: 500,
          onComplete: () => star.destroy()
        });
      }
    });
  }

  private async saveGameState() {
    await saveCharacterState({
      hunger: this.hunger,
      hygiene: this.hygiene,
      energy: this.energy,
      fun: this.fun,
    });
  }

  private createButton(text: string, x: number, y: number, callback: () => void) {
    const button = this.add.container(x, y);
    
    const bg = this.add.rectangle(0, 0, 120, 40, 0xFF69B4)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '20px',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    button.add([bg, buttonText]);
    
    bg.on('pointerdown', callback);
    bg.on('pointerover', () => bg.setFillStyle(0xFF1493));
    bg.on('pointerout', () => bg.setFillStyle(0xFF69B4));
    
    this.buttons.push(button);
  }

  private createShopWindow() {
    this.shopWindow = this.add.container(this.scale.width / 2, this.scale.height / 2);
    
    // Fondo semi-transparente
    const bg = this.add.rectangle(0, 0, 400, 500, 0x000000, 0.8)
      .setOrigin(0.5);
    
    // Título de la tienda
    const title = this.add.text(0, -200, '🏪 Tienda 🏪', {
      fontSize: '32px',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    this.shopWindow.add([bg, title]);

    // Añadir items de la tienda
    this.shopItems.forEach((item, index) => {
      const y = -100 + (index * 80);
      const itemContainer = this.add.container(0, y);

      const itemText = this.add.text(0, 0, 
        `${item.emoji} ${item.name} - 🪙 ${item.price}`, 
        { fontSize: '24px', color: '#FFFFFF' }
      ).setOrigin(0.5);

      const buyButton = this.add.text(100, 0, '🛍️', 
        { fontSize: '24px' }
      )
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.buyItem(item));

      itemContainer.add([itemText, buyButton]);
      this.shopWindow.add(itemContainer);
    });

    // Botón cerrar
    const closeButton = this.add.text(160, -220, '❌', 
      { fontSize: '24px' }
    )
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => this.closeShop());

    this.shopWindow.add(closeButton);
    this.shopWindow.setVisible(false);
  }

  private openShop() {
    this.shopWindow.setVisible(true);
  }

  private closeShop() {
    this.shopWindow.setVisible(false);
  }

  private buyItem(item: { price: number, hunger: number, emoji: string }) {
    if (this.coins >= item.price) {
      this.coins -= item.price;
      this.hunger = Math.min(100, this.hunger + item.hunger);
      this.coinsText.setText(`🪙 ${this.coins}`);
      this.updateStatusBar('hunger');
      
      // Mostrar emoji flotante del item comprado
      const floatingEmoji = this.add.text(this.player.x, this.player.y - 50, item.emoji, { fontSize: '32px' });
      this.tweens.add({
        targets: floatingEmoji,
        y: this.player.y - 100,
        alpha: 0,
        duration: 1000,
        onComplete: () => floatingEmoji.destroy()
      });
    } else {
      // Mostrar mensaje de error si no hay suficientes monedas
      const errorText = this.add.text(this.shopWindow.x, this.shopWindow.y + 200, 
        '❌ No tienes suficientes monedas', 
        { fontSize: '20px', color: '#FF0000' }
      ).setOrigin(0.5);
      
      this.time.delayedCall(1000, () => errorText.destroy());
    }
  }

  private createFoodContainer() {
    this.foodContainer = this.add.container(0, 0);
    this.foodContainer.setVisible(false);
  }
}

