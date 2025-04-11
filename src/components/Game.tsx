import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameScene } from '../game/GameScene';

const Game = () => {
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameScene, setGameScene] = useState<GameScene | null>(null);

  useEffect(() => {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      physics: { default: 'arcade', arcade: { debug: false } },
      scene: [GameScene],
      parent: gameRef.current || undefined,
    };

    const game = new Phaser.Game(config);
    game.events.on('ready', () => {
      setGameScene(game.scene.getScene('GameScene') as GameScene);
    });

    return () => {
      game.destroy(true);
    };
  }, []);
};

export default Game;
