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
  private bars: { [key: string]: Phaser.GameObjects.Graphics } = {};

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

    // Reducir valores con el tiempo y guardar en IndexedDB
    this.time.addEvent({
      delay: 3000, // Cada 3 segundos
      callback: this.decreaseStats,
      callbackScope: this,
      loop: true,
    });
  }

  private createStatusBar(stat: string, x: number, y: number, color: number) {
    const bar = this.add.graphics();
    bar.fillStyle(color, 1);
    bar.fillRect(x, y, 200, 20);
    this.bars[stat] = bar;
  }

  private updateStatusBar(stat: string) {
    const value = this[stat as keyof this] as number;
    this.bars[stat].clear();
    this.bars[stat].fillStyle(stat === 'hunger' ? 0xff0000 : stat === 'hygiene' ? 0x00ff00 : stat === 'energy' ? 0x0000ff : 0xffff00, 1);
    this.bars[stat].fillRect(20, stat === 'hunger' ? 20 : stat === 'hygiene' ? 50 : stat === 'energy' ? 80 : 110, (value / 100) * 200, 20);
  }

  private updateAllStatusBars() {
    this.updateStatusBar('hunger');
    this.updateStatusBar('hygiene');
    this.updateStatusBar('energy');
    this.updateStatusBar('fun');
  }

  private async decreaseStats() {
    this.hunger = Math.max(0, this.hunger - 5);
    this.hygiene = Math.max(0, this.hygiene - 3);
    this.energy = Math.max(0, this.energy - 2);
    this.fun = Math.max(0, this.fun - 4);

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

  public async feed() {
    this.hunger = Math.min(100, this.hunger + 20);
    this.updateStatusBar('hunger');
    await this.saveGameState();
  }

  public async clean() {
    this.hygiene = Math.min(100, this.hygiene + 20);
    this.player.setTexture('bathing');
    this.sound.play('bath');
    this.updateStatusBar('hygiene');
    await this.saveGameState();

    setTimeout(() => this.player.setTexture('idle'), 1000);
  }

  public async sleep() {
    this.energy = Math.min(100, this.energy + 20);
    this.player.setTexture('sleeping');
    this.sound.play('sleep');
    this.updateStatusBar('energy');
    await this.saveGameState();

    setTimeout(() => this.player.setTexture('idle'), 2000);
  }

  public async play() {
    this.fun = Math.min(100, this.fun + 20);
    this.sound.play('play');
    this.updateStatusBar('fun');
    await this.saveGameState();
  }

  private async saveGameState() {
    await saveCharacterState({
      hunger: this.hunger,
      hygiene: this.hygiene,
      energy: this.energy,
      fun: this.fun,
    });
  }
}

