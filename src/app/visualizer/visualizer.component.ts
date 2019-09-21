import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-visualizer',
  templateUrl: './visualizer.component.html',
  styleUrls: ['./visualizer.component.scss']
})
export class VisualizerComponent implements OnInit {

  fileReader;

  audioContext;
  canvas;
  canvasContext;
  analyser;
  audioSourceNode;
  bufferSize = 256; // 4096;
  freqBinCount = this.bufferSize;
  barWidth;
  barHeight;
  multiplier = 2;
  cutoff = 0;
  dataArray = new Float32Array(this.bufferSize);

  WIDTH = 1200;
  HEIGHT = 512;

  constructor() {

    window.onload = () => {
      this.canvas = document.getElementById('main-canvas');
      this.canvasContext = this.canvas.getContext('2d');
    };

  }

  ngOnInit() {
  }

  visualize() {
    if (this.audioSourceNode) {
      this.audioSourceNode.stop();
    }
    this.fileReader = new FileReader();
    this.audioContext = new AudioContext();
    const input: HTMLInputElement = document.getElementById('audio-file') as HTMLInputElement;
    this.fileReader.readAsArrayBuffer(input.files[0]);
    this.fileReader.onload = this.onFileLoadedHandler.bind(this);
  }

  onFileLoadedHandler() {
    const audioData = this.fileReader.result;
    console.log('audioData', audioData);
    this.audioContext
      .decodeAudioData(audioData)
      .then((decodedData) => {
        console.log(decodedData);
        this.audioSourceNode = new AudioBufferSourceNode(this.audioContext);
        this.audioSourceNode.buffer = decodedData;
        this.audioSourceNode.start();
        this.analyseAudio(this.audioSourceNode);
      });
  }

  analyseAudio(audioSourceNode) {
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.bufferSize;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    this.analyser.smoothingTimeConstant = 0.85;

    audioSourceNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    console.log(this.analyser);
    window.requestAnimationFrame(this.draw.bind(this));
  }

  draw() {
    window.requestAnimationFrame(this.draw.bind(this));
    this.analyser.getFloatFrequencyData(this.dataArray);
    this.canvasContext.fillStyle = '#33cc33';
    this.barWidth = this.WIDTH / this.freqBinCount * 2;

    this.canvasContext.clearRect(0, 0, this.WIDTH, this.HEIGHT);

    let x = 0;
    for (let i = 0; i < this.freqBinCount ; i++) {
      this.barHeight = (150 + this.dataArray[i]) * this.multiplier;
      this.canvasContext.fillRect(x, this.HEIGHT - this.barHeight, this.barWidth, this.barHeight);
      x += this.barWidth;
    }
  }

}
