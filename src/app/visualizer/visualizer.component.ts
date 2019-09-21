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
  ctx;
  analyser;
  audioSourceNode;
  bufferSize = 256; // 4096;
  freqBinCount = this.bufferSize;
  barWidth;
  barSpacing = 5;
  barHeight;
  multiplier = 2;
  cutoff = 0;
  frequencyData = new Uint8Array(this.bufferSize);
  gradient;
  barColor = '#cafdff';
  shadowBlur = 10;
  shadowColor = '#ffffff';
  font = ['12px', 'Helvetica'];

  backgroundColor = 'hsla(340, 0%, 0%, 0)';

  WIDTH = 1200;
  HEIGHT = 512;

  constructor() {

    window.onload = () => {
      this.canvas = document.getElementById('main-canvas');
      this.ctx = this.canvas.getContext('2d');

      console.log('ctx: ', this.ctx);

    };

  }

  drawGradient(x, y, amplitude, color) {
    const grad1 = this.ctx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      amplitude
    );
    grad1.addColorStop(0, color);
    grad1.addColorStop(1, this.backgroundColor);
    this.ctx.globalCompositeOperation = 'color';
    this.ctx.fillStyle = grad1;
    this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
  }


  ngOnInit() {

  }

  rand(min, max ) {
    return Math.random() * (max - min) + min;
  }

  visualize() {
    if (this.audioSourceNode) {
      this.audioSourceNode.stop();
    }
    this.fileReader = new FileReader();
    this.audioContext = new AudioContext();
    const input: HTMLInputElement = document.getElementById('audio-file') as HTMLInputElement;
    this.setCanvasStyles();
    this.ctx.fillText('Audio Visualizer', this.canvas.width / 2 + 10, this.canvas.height / 2);
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

    // this.barWidth = 2;
    // this.renderCircle();

    // this.barWidth = this.WIDTH / (this.freqBinCount + this.barSpacing) * 2;
    // this.renderClassic();

    this.renderLight();
  }

  renderClassic() {
    window.requestAnimationFrame(this.renderClassic.bind(this));
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.ctx.fillStyle = this.barColor;
    this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
    let x = 0;
    for (let i = 0; i < this.freqBinCount ; i++) {
      this.barHeight = (150 + this.frequencyData[i]) * this.multiplier;
      this.ctx.fillRect(x, this.HEIGHT - this.barHeight, this.barWidth, this.barHeight);
      x += this.barWidth + this.barSpacing;
    }
  }

  renderLight() {
    window.requestAnimationFrame(this.renderLight.bind(this));
    this.analyser.getByteFrequencyData(this.frequencyData);


    this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

    let bassAmplitude = 0;
    for (let i = 0; i < 5; i++) {
      bassAmplitude += this.frequencyData[i];
    }
    bassAmplitude = Math.round(Math.pow(bassAmplitude / 400, 6));
    const x = Math.round(this.canvas.width / 2);
    const y = Math.round(this.canvas.height / 2);
    this.drawGradient(x, y, bassAmplitude, 'hsl(221,63%,49%)');

    let medAmplitude = 0;
    for (let i = 40; i < 50; i++) {
      medAmplitude += this.frequencyData[i];
    }
    medAmplitude = Math.round(Math.pow(medAmplitude / 200, 2));
    this.drawGradient(x - 400, y, medAmplitude, 'hsl(21,80%,52%)');
    this.drawGradient(x + 400, y, medAmplitude, 'hsl(5,78%,57%)');

    let trebleAmplitude = 0;
    for (let i = 80; i < 100; i++) {
      trebleAmplitude += this.frequencyData[i];
    }
    trebleAmplitude = Math.round(Math.pow(trebleAmplitude / 50, 2));
    this.drawGradient(x - 200, y, trebleAmplitude, 'hsl(71,65%,72%)');
    this.drawGradient(x + 200, y, trebleAmplitude, 'hsl(101,63%,74%)');
  }


  renderCircle() {
    window.requestAnimationFrame(this.renderCircle.bind(this));
    const cx = this.WIDTH / 2;
    const cy = this.HEIGHT / 2;
    const radius = 140;
    const maxBarNum = Math.floor((radius * 2 * Math.PI) / (this.barWidth + this.barSpacing));
    const slicedPercent = Math.floor((maxBarNum * 25) / 100);
    const barNum = maxBarNum - slicedPercent;
    const freqJump = Math.floor(this.frequencyData.length / maxBarNum);
    //
    // radius :  140
    // visualizer.component.ts:115 maxBarNum :  29
    // visualizer.component.ts:116 slicedPercent :  7
    // visualizer.component.ts:117 barNum :  22
    // visualizer.component.ts:118 freqJump :  8

    console.log('radius : ', radius);
    console.log('maxBarNum : ', maxBarNum);
    console.log('slicedPercent : ', slicedPercent);
    console.log('barNum : ', barNum);
    console.log('freqJump : ', freqJump);
    for (let i = 0; i < barNum; i++) {
      const amplitude = this.frequencyData[i * freqJump];
      const alfa = (i * 2 * Math.PI ) / maxBarNum;
      const beta = (3 * 45 - this.barWidth) * Math.PI / 180;
      const x = 0;
      const y = radius - (amplitude / 12 - this.barHeight);
      const w = this.barWidth;
      const h = amplitude / 6 + this.barHeight;

      this.ctx.save();
      this.ctx.translate(cx + this.barSpacing, cy + this.barSpacing);
      this.ctx.rotate(alfa - beta);
      this.ctx.fillRect(x, y, w, h);
      this.ctx.restore();
    }
  }



  setCanvasStyles() {
    this.gradient = this.ctx.createLinearGradient(0, 0, 0, 300);
    this.gradient.addColorStop(1, this.barColor);
    this.ctx.fillStyle = this.gradient;
    this.ctx.shadowBlur = this.shadowBlur;
    this.ctx.shadowColor = this.shadowColor;
    this.ctx.font = this.font.join(' ');
    this.ctx.textAlign = 'center';
  }


}
