import { Component, OnInit } from '@angular/core';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-visualizer',
  templateUrl: './visualizer.component.html',
  styleUrls: ['./visualizer.component.scss']
})
export class VisualizerComponent {

  DARK_GRAY = 'rgb(48, 48, 48)';
  LIGHT_GRAY = 'rgb(224, 224, 224)';

  fileReader;

  audioContext;
  canvas;
  ctx;
  analyser;
  audioSourceNode;
  bufferSize = 2048; // fftSize;
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

    backgroundColor = 'hsla(340, 0%, 0%, 1)';
  // backgroundColor = 'rgba(0, 0, 0, 0.5)';
  w;
  h;
  cw;
  ch;
  circle;


  // LINE
  lineMemoryCount = 15;
  lineMemoryBuffer = new Array(this.lineMemoryCount);

  generateLineEvery = 5; // frames
  frameCounter = 0;

  removeBassPercent = 5;
  removeTreblePercent = 15;

  constructor() {

    window.onload = () => {
      this.canvas = document.getElementById('main-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.w = this.canvas.width;
      this.h = this.canvas.height;
      this.cw = this.w / 2;
      this.ch = this.h / 2;
      console.log('ctx: ', this.ctx);

      this.circle = {
        x: (this.cw / 2) + 5,
        y: (this.ch / 2) + 22,
        radius: 90,
        speed: 2,
        rotation: 0,
        angleStart: 270,
        angleEnd: 90,
        hue: 220,
        thickness: 18,
        blur: 25
      };
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
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  rand(min, max ) {
    return Math.random() * (max - min) + min;
  }

  dToR(degrees) {
    return degrees * (Math.PI / 180);
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
    console.log('input.files[0] : ', input.files[0]);
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
    // this.analyser.minDecibels = -90;
    // this.analyser.maxDecibels = -10;
    this.analyser.smoothingTimeConstant = 0.85;
    audioSourceNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    console.log(this.analyser);
    this.renderLoop();
  }

  renderLoop() {
    window.requestAnimationFrame(this.renderLoop.bind(this));
    this.analyser.getByteFrequencyData(this.frequencyData);

    this.clearSmooth();
    // this.renderParameterizedLine();

    // this.renderLogoPoly();
     this.renderAudioGoneMirror();
    // this.renderMultiLines();
    // this.updateCircle();
    // this.renderCircle();
    // this.renderLight();
  }
// http://paperjs.org/tutorials/geometry/vector-geometry/
  renderParameterizedLine() {
    const { ctx, ch, h, frequencyData } = this;
    const hue = 340;
    const opacity = 1;
    const offsetY = ch;
    ctx.strokeStyle = 'hsla(' + hue + ', 100%, 50%, ' + opacity + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    for (let i = 1; i < frequencyData.length; i++) {
      ctx.lineTo(i * 2, offsetY - frequencyData[i]);
    }
    ctx.stroke();
  }

  renderLogoPoly() {
    const { ctx, ch, cw, frequencyData } = this;
    const size = 150;
    const startPt = {
      x: cw - size / 2,
      y: ch - size / 2
    };
    const pts = [
      startPt.x, startPt.y,
      startPt.x + size / 2, startPt.y - size * 0.4684,
      startPt.x + size, startPt.y,
      startPt.x + size, startPt.y + size * 0.9085,
      startPt.x + size / 2, startPt.y + size * 1.1851,
      startPt.x, startPt.y + size * 0.9085,
      startPt.x, startPt.y
    ];
    const distances = this.calculateDistances(pts);
    const distPercent = this.calculateDistPercent(distances);
    const freqBySides = this.computeFreqBySide(distPercent, this.bufferSize);

    this.analyser.getByteFrequencyData(frequencyData);


    this.drawSide(pts, freqBySides[0]);

    // if (incX < 1) {
    //   incX = 1;
    // }
    // if (incY < 1) {
    //   incY = 1;
    // }
    // const incX = 1;
    // const incY = 1;


    // if (this.frameCounter === 0) {
    //   console.log('distances: ', distances);
    //   console.log('distPercent: ', distPercent);
    //   console.log('freqBySide: ', freqBySide);
    //   console.log('LINE1 incX: ', incX);
    //   console.log('LINE1 incY: ', incY);
    //     this.frameCounter++;
    //   }



    // this.drawPoints(pts);

    ctx.strokeStyle = '#F00';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawSide(pts, freqBySide) {
    const { ctx, frequencyData } = this;
    const incX = Math.abs(pts[0] - pts[2]) / freqBySide;
    const incY = Math.abs(pts[1] - pts[3]) / freqBySide;

    const pulseX = 10;
    const pulseY = 10;


    ctx.moveTo(pts[0], pts[1]);
    for (let i = 1; i < freqBySide; i++) {
      ctx.lineTo(pts[0] + incX * i, pts[1] - incY * i );
      console.log(
        'moveTo : ' + pts[0] + ', ' + pts[1] + '\n' +
        'lineTo : ' + (pts[0] + incX * i) + ', ' + (pts[1] - incY * i));
    }
  }

  private computeFreqBySide(distPercent, bufferSize) {
    const result = [];
    for (let i = 0; i < distPercent.length; i++) {
      result.push(Math.floor(bufferSize / 100 * distPercent[i]));
    }
    return result;
  }

  drawPoints(pts) {
    const { ctx } = this;
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) {
      ctx.lineTo(pts[i], pts[i + 1]);
    }
  }

  calculateDistPercent(distances) {
    const totalDist = distances.reduce((a, b) => a + b, 0);
    const result = [];

    for (let i = 0; i < distances.length; i++) {
      result.push(distances[i] / totalDist * 100);
    }
    return result;
  }

  calculateDistances(pts) {
    const distances = [];
    if (pts.length < 4) {
      return distances;
    }
    let diffX;
    let diffY;
    for (let i = 0; i < pts.length - 2; i += 2) {
      if (i + 2 === pts.length) {
        diffX = Math.abs(pts[i] - pts[0]);
        diffY = Math.abs(pts[i + 1] - pts[1]);
      } else {
        diffX = Math.abs(pts[i] - pts[i + 2]);
        diffY = Math.abs(pts[i + 1] - pts[i + 3]);
      }
      distances.push(Math.sqrt(diffX * diffX + diffY * diffY));
    }
    return distances;
  }


  enderLogoPolyInit() {
    const { ctx, ch, cw, frequencyData } = this;
    const size = 100;

    const startPt = {
      x: cw - 100 / 2,
      y: ch - 100 / 2
    };

    ctx.moveTo(startPt.x, startPt.y);
    ctx.lineTo(startPt.x + size, startPt.y);
    ctx.lineTo(startPt.x + size, startPt.y + 100 * 0.9085);
    ctx.lineTo(startPt.x + size / 2, startPt.y + 100 * 1.1851);
    ctx.lineTo(startPt.x, startPt.y + 100 * 0.9085);
    ctx.lineTo(startPt.x, startPt.y);

    ctx.strokeStyle = '#F00';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  renderAudioGoneMirror() {
    const { ctx, ch, cw, frequencyData } = this;
    const size = 50;
    const numberOfSides = this.bufferSize / Math.PI;
    const startPt = {
      x: cw,
      y: ch + 100,
    };
    this.analyser.getByteFrequencyData(frequencyData);

    ctx.beginPath();
    ctx.moveTo(
      startPt.x + (size + frequencyData[0]) * -Math.sin(0),
      startPt.y + (size + frequencyData[0]) * -Math.cos(0));
    for (let i = 1; i < numberOfSides; i++) {
      let pulse;
      if (i < (numberOfSides / 2)) {
        pulse = frequencyData[i];
      } else {
        pulse = frequencyData[(Math.floor(numberOfSides - i))];
      }
      ctx.lineTo(
        startPt.x + (size + pulse) * -Math.sin(i * 2 * Math.PI / numberOfSides),
        startPt.y + (size + pulse) * -Math.cos(i * 2 * Math.PI / numberOfSides)
      );
    }
    ctx.lineTo(
      startPt.x + (size + frequencyData[0]) * -Math.sin(0),
      startPt.y + (size + frequencyData[0]) * -Math.cos(0)
    );
    ctx.strokeStyle = '#F00';
    ctx.lineWidth = 1;
    ctx.stroke();

  }

  renderAudioGoneSimple() {
    const { ctx, ch, cw, frequencyData } = this;
    const size = 120;
    const numberOfSides = this.bufferSize / Math.PI - 5;

    this.analyser.getByteFrequencyData(frequencyData);

    ctx.beginPath();
    ctx.moveTo(
      cw + (size + frequencyData[0]) * Math.cos(0),
      ch + (size + frequencyData[0]) * Math.sin(0));
    for (let i = 1; i < numberOfSides; i++) {
      const pulse = frequencyData[i];
      ctx.lineTo(
        cw + (size + pulse) * Math.cos(i * 2 * Math.PI / numberOfSides),
        ch + (size + pulse) * Math.sin(i * 2 * Math.PI / numberOfSides)
      );
    }
    ctx.lineTo(
      cw + (size + frequencyData[0]) * Math.cos(0),
      ch + (size + frequencyData[0]) * Math.sin(0)
    );
    ctx.strokeStyle = '#F00';
    ctx.lineWidth = 1;
    ctx.stroke();

  }

  renderMultiLines() {
    const { ctx, ch, frequencyData, freqBinCount } = this;
    this.analyser.getByteFrequencyData(frequencyData);
    this.frameCounter++;
    if (this.frameCounter === 0 || this.frameCounter === this.generateLineEvery) {
      this.lineMemoryBuffer.unshift(new Uint8Array(frequencyData));
      this.frameCounter = 0;
    }
    if (this.lineMemoryBuffer.length > this.lineMemoryCount) {
      this.lineMemoryBuffer.pop();
    }
    this.renderSingleLine(frequencyData, 0);
    for (let lineIdx = 1; lineIdx < this.lineMemoryBuffer.length;  lineIdx++) {
      const curLine = this.lineMemoryBuffer[lineIdx];
      this.renderSingleLine(curLine, lineIdx);
    }
  }

  renderSingleLine(frequencyData, lineIdx) {
    const { ctx, ch, h } = this;
    const color = (lineIdx / this.lineMemoryCount * 340);
    const opacity = 1 - (lineIdx / this.lineMemoryCount);
    const offsetY = h - lineIdx * 20;
    ctx.strokeStyle = 'hsla(' + color + ', 100%, 50%, ' + opacity + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    for (let i = 1; i < frequencyData.length; i++) {
      ctx.lineTo(i * 2, offsetY - frequencyData[i]);
    }
    ctx.stroke();
  }



  clearRough() {
    const { ctx, w, h, cw, ch } = this;
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, w, h);
  }

  clearSmooth() {
    const { ctx, w, h, cw, ch } = this;
    ctx.globalCompositeOperation = 'destination-out';
    // ctx.fillStyle = 'rgba(0, 0, 0, .1)';
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // this.ctx.clearRect(0, 0, this.w, this.h);
  }

  updateCircle() {
    const { circle } = this;
    if (circle.rotation < 360) {
      circle.rotation += circle.speed;
    } else {
      circle.rotation = 0;
    }
  }

  renderCircle() {
    const { ctx, circle, dToR } = this;

    const gradient4 = ctx.createRadialGradient(0, circle.radius, 0, 0, circle.radius, 25);
    gradient4.addColorStop(0, 'hsla(359,100%,50%,0.8)');
    gradient4.addColorStop(1, 'hsla(30, 100%, 50%, 0)');
    ctx.fillStyle = gradient4;

    ctx.save();
    ctx.translate(circle.x, circle.y);
    ctx.rotate(dToR(circle.rotation));
    ctx.beginPath();
    ctx.arc(0, 0, circle.radius, dToR(circle.angleStart), dToR(circle.angleEnd), true);
    ctx.lineWidth = circle.thickness;
    ctx.strokeStyle = gradient4;
    ctx.stroke();
    ctx.restore();
  }

  renderClassic() {
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.ctx.fillStyle = this.barColor;
    this.ctx.clearRect(0, 0, this.w, this.h);
    let x = 0;
    for (let i = 0; i < this.freqBinCount ; i++) {
      this.barHeight = (150 + this.frequencyData[i]) * this.multiplier;
      this.ctx.fillRect(x, this.h - this.barHeight, this.barWidth, this.barHeight);
      x += this.barWidth + this.barSpacing;
    }
  }

  renderLight() {
    this.analyser.getByteFrequencyData(this.frequencyData);

    let bassAmplitude = 0;
    for (let i = 0; i < 5; i++) {
      bassAmplitude += this.frequencyData[i];
    }
    bassAmplitude = Math.round(Math.pow(bassAmplitude / 400, 6));
    const x = Math.round(this.w / 2);
    const y = Math.round(this.h / 2);
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
    trebleAmplitude = Math.round(Math.pow(trebleAmplitude / 200, 2));
    this.drawGradient(x - 200, y, trebleAmplitude, 'hsl(71,65%,72%)');
    this.drawGradient(x + 200, y, trebleAmplitude, 'hsl(101,63%,74%)');
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

  renderXgone() {
    const { ctx, ch, cw, frequencyData } = this;
    const numberOfSides = 128;
    const size = 150;
    const Xcenter = cw;
    const Ycenter = ch;

    ctx.beginPath();
    ctx.moveTo (Xcenter + size * Math.cos(0), Ycenter +  size *  Math.sin(0));
    for (let i = 1; i <= numberOfSides; i++) {
      ctx.lineTo(
        Xcenter + size * Math.cos(i * 2 * Math.PI / numberOfSides),
        Ycenter + size * Math.sin(i * 2 * Math.PI / numberOfSides));
    }
    ctx.strokeStyle = '#F00';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
