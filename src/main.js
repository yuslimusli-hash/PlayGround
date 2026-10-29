import { AudioEngine } from "./audio.js";
import { InputController } from "./input.js";
import { Game } from "./game.js";

const canvas = document.getElementById("game");
const audio = new AudioEngine();
const input = new InputController(canvas);
const game = new Game(canvas, audio, input);

window.rotgold = game;
