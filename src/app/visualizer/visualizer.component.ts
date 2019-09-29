import { Component, OnInit } from '@angular/core';

interface Point {
  x: number;
  y: number;
}
export interface SelectOption {
  value: string;
  viewValue: string;
}

type VizType = 'CLASSIC' | 'LINES' | 'SPOT' | 'LOGO' | 'PARAM_LINE' | 'CIRCLE' | 'XGONE';

@Component({
  selector: 'app-visualizer',
  templateUrl: './visualizer.component.html',
  styleUrls: ['./visualizer.component.scss']
})
export class VisualizerComponent implements OnInit {

  globalCompositeOperations: SelectOption[] = [
    {value: 'source-over', viewValue: 'source-over'},
    {value: 'source-in', viewValue: 'source-in'},
    {value: 'source-out', viewValue: 'source-out'},
    {value: 'source-atop', viewValue: 'source-atop'},
    {value: 'destination-over', viewValue: 'destination-over'},
    {value: 'destination-in', viewValue: 'destination-in'},
    {value: 'destination-out', viewValue: 'destination-out'},
    {value: 'destination-atop', viewValue: 'destination-atop'},
    {value: 'lighter', viewValue: 'lighter'},
    {value: 'copy', viewValue: 'copy'},
    {value: 'xor', viewValue: 'xor'},
    {value: 'multiply', viewValue: 'multiply'},
    {value: 'screen', viewValue: 'screen'},
    {value: 'overlay', viewValue: 'overlay'},
    {value: 'darken', viewValue: 'darken'},
    {value: 'lighten', viewValue: 'lighten'},
    {value: 'color-dodge', viewValue: 'color-dodge'},
    {value: 'color-burn', viewValue: 'color-burn'},
    {value: 'hard-light', viewValue: 'hard-light'},
    {value: 'soft-light', viewValue: 'soft-light'},
    {value: 'difference', viewValue: 'difference'},
    {value: 'exclusion', viewValue: 'exclusion'},
    {value: 'hue', viewValue: 'hue'},
    {value: 'saturation', viewValue: 'saturation'},
    {value: 'color', viewValue: 'color'},
    {value: 'luminosity', viewValue: 'luminosity'}
  ];

  vizTypes: SelectOption[] = [
    {value: 'CLASSIC', viewValue: 'Classic'},
    {value: 'LINES', viewValue: 'Lines'},
    {value: 'SPOT', viewValue: 'Spot light'},
    {value: 'LOGO', viewValue: 'Logo poly'},
    {value: 'PARAM_LINE', viewValue: 'Param line'},
    {value: 'CIRCLE', viewValue: 'Circle'},
    {value: 'XGONE', viewValue: 'XGone'},
  ];

  // PARAMETERS
  vizTypeSelected = 'CLASSIC';
  GlobalCompositeOperationBeforeClean = 'destination-out';
  GlobalCompositeOperationAfterClean = 'lighter';
  currentColorHue = 340;
  currentColorSaturation = 100;
  currentColorLightness = 50;
  currentColorAlpha = 1;
  clearRate = 1;
  clearCounter = 0;
  clearAlpha = 0.1;
  visualizationSize = 0;
  minDecibels = -100;
  maxDecibels = 0;
  smoothingTimeConstant = 0.85;
  amplificator = 1.2; // pow

  

  // INTERNAL
  frameCounter = 0;
  fileReader;
  audioContext;
  canvas;
  ctx;
  analyser;
  audioSourceNode;
  bufferSize = 2048; // fftSize;
  w; // canvas width
  h; // canvas height
  cw; // center canvas x
  ch; // center canvas y

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
  circle;
  // LINE
  lineMemoryCount = 15;
  lineMemoryBuffer = new Array(this.lineMemoryCount);
  generateLineEvery = 5; // frames
  removeBassPercent = 5;
  removeTreblePercent = 15;
  backgroundImage = new Image();

  constructor() {
  }

  ngOnInit(): void {
    this.canvas = document.getElementById('main-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.w = this.canvas.width;
    this.h = this.canvas.height;
    this.cw = this.w / 2;
    this.ch = this.h / 2;
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
    this.setCanvasStyles();
    this.ctx.fillText('Audio Visualizer', this.canvas.width / 2 + 10, this.canvas.height / 2);
  }

  setCanvasStyles() {
    const { ctx, backgroundImage } = this;
    this.gradient = this.ctx.createLinearGradient(0, 0, 0, 300);
    this.gradient.addColorStop(1, this.barColor);
    ctx.fillStyle = this.gradient;
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowColor = this.shadowColor;
    ctx.font = this.font.join(' ');
    ctx.textAlign = 'center';
  }

  handleMinDecibelsChange(event) {
    this.analyser.minDecibels = event.value;
  }

  handleMaxDecibelsChange(event) {
    this.analyser.maxDecibels = event.value;
  }

  handleSmoothingTimeConstantChange(event) {
    this.analyser.smoothingTimeConstant = event.value;
  }

  onFileSelected(event) {
    if (this.audioSourceNode) {
      this.audioSourceNode.stop();
    }
    this.fileReader = new FileReader();
    this.audioContext = new AudioContext();
    this.fileReader.readAsArrayBuffer(event.target.files[0]);
    this.fileReader.onload = this.onFileLoadedHandler.bind(this);
  }

  getBackgroundColor() {
    return 'rgba(0, 0, 0, ' + this.clearAlpha + ')';
  }

  getCurrentColor(hueModifier = 0) {
    return 'hsla(' + (this.currentColorHue + hueModifier % 340) + ', '
      + this.currentColorSaturation + '%, '
      + this.currentColorLightness + '%, '
      + this.currentColorAlpha + ')';
  }

  random(min, max ) {
    return Math.random() * (max - min) + min;
  }

  dToR(degrees) {
    return degrees * (Math.PI / 180);
  }

  onFileLoadedHandler() {
    const audioData = this.fileReader.result;
    this.audioContext
      .decodeAudioData(audioData)
      .then((decodedData) => {
        this.audioSourceNode = new AudioBufferSourceNode(this.audioContext);
        this.audioSourceNode.buffer = decodedData;
        this.audioSourceNode.start();
        this.analyseAudio(this.audioSourceNode);
      });
  }

  analyseAudio(audioSourceNode) {
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.bufferSize;
    this.analyser.smoothingTimeConstant = 0.85;
    audioSourceNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    console.log(this.analyser);
    this.renderLoop();
  }

  clear() {
    const { ctx, w, h, cw, ch } = this;
    if (this.clearCounter % this.clearRate === 0) {
      ctx.save();
      // const zoomfactor = 1.5;
      // ctx.setTransform(
      //   zoomfactor, 0, 0,
      //   zoomfactor, -(zoomfactor - 1) * cw,
      //   -(zoomfactor - 1) * ch / 2);
      ctx.globalCompositeOperation = this.GlobalCompositeOperationBeforeClean;
      //ctx.translate(cw, ch);
      ctx.scale(2.1, 2.1);

      ctx.drawImage(ctx, 0, 0);

      // ctx.translate(cw, ch);
      // ctx.rotate(1);

      ctx.fillStyle = this.getBackgroundColor();
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      ctx.restore();
      ctx.globalCompositeOperation = this.GlobalCompositeOperationAfterClean;

      // IDENTITY
      // ctx.setTransform(1, 0, 0, 1, 0, 0);
    }


    if (this.clearCounter++ === Number.MAX_SAFE_INTEGER) {
      this.clearCounter = 1;
    }
  }

  renderLoop() {
    window.requestAnimationFrame(this.renderLoop.bind(this));
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.clear();
    switch (this.vizTypeSelected) {
      case 'CLASSIC' : this.renderAudioGoneMirror(); break;
      case 'SPOT': this.renderSpotLight(); break;
      case 'LOGO': this.renderLogoPoly(); break;
      case 'PARAM_LINE': this.renderParameterizedLine(); break;
      case 'CIRCLE': this.renderCircle(); break;
      case 'LINES': this.renderMultiLines(); break;
      case 'XGONE': this.renderXgone(); break;
    }

    if (this.frameCounter++ === Number.MAX_SAFE_INTEGER) {
      this.frameCounter = 1;
    }
  }

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

  renderLogoPolyInit() {
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
    const { ctx, ch, cw, frequencyData, amplificator } = this;
    const size = this.visualizationSize;
    const numberOfSides = this.bufferSize / Math.PI;
    const startPt = {
      x: cw,
      y: ch + 100,
    };
    this.analyser.getByteFrequencyData(frequencyData);

    ctx.beginPath();
    ctx.moveTo(
      startPt.x + (size + frequencyData[1] * amplificator) * -Math.sin(0),
      startPt.y + (size + frequencyData[1] * amplificator) * -Math.cos(0));
    for (let i = 1; i < numberOfSides; i++) {
      let pulse;
      if (i < (numberOfSides / 2)) {
        pulse = frequencyData[i] * amplificator;
      } else {
        pulse = frequencyData[(Math.floor(numberOfSides - i))] * amplificator;
      }
      ctx.lineTo(
        startPt.x + (size + pulse) * -Math.sin(i * 2 * Math.PI / numberOfSides),
        startPt.y + (size + pulse) * -Math.cos(i * 2 * Math.PI / numberOfSides)
      );
    }
    ctx.lineTo(
      startPt.x + (size + frequencyData[1] * amplificator) * -Math.sin(0),
      startPt.y + (size + frequencyData[1] * amplificator) * -Math.cos(0)
    );
    ctx.strokeStyle = this.getCurrentColor();
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
    if (circle.rotation < 360) {
      circle.rotation += circle.speed;
    } else {
      circle.rotation = 0;
    }
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

  renderSpotLight() {
    this.analyser.getByteFrequencyData(this.frequencyData);

    let bassAmplitude = 0;
    for (let i = 0; i < 5; i++) {
      bassAmplitude += this.frequencyData[i];
    }
    bassAmplitude = Math.round(Math.pow(bassAmplitude / 400, 6));
    const x = Math.round(this.w / 2);
    const y = Math.round(this.h / 2);
    this.drawGradient(x, y, bassAmplitude, this.getCurrentColor());

    let medAmplitude = 0;
    for (let i = 40; i < 50; i++) {
      medAmplitude += this.frequencyData[i];
    }
    medAmplitude = Math.round(Math.pow(medAmplitude / 200, 2));
    this.drawGradient(x - 400, y, medAmplitude, this.getCurrentColor(50));
    this.drawGradient(x + 400, y, medAmplitude, this.getCurrentColor(50));

    let trebleAmplitude = 0;
    for (let i = 80; i < 100; i++) {
      trebleAmplitude += this.frequencyData[i];
    }
    trebleAmplitude = Math.round(Math.pow(trebleAmplitude / 200, 2));
    this.drawGradient(x - 200, y, trebleAmplitude, this.getCurrentColor(150));
    this.drawGradient(x + 200, y, trebleAmplitude, this.getCurrentColor(150));
  }

  renderXgone() {
    const { ctx, ch, cw, frequencyData } = this;
    const numberOfSides = 128;
    const size = 150;
    const centerX = cw;
    const centerY = ch;

    ctx.beginPath();
    ctx.moveTo (centerX + size * Math.cos(0), centerY +  size *  Math.sin(0));
    for (let i = 1; i <= numberOfSides; i++) {
      ctx.lineTo(
        centerX + size * Math.cos(i * 2 * Math.PI / numberOfSides),
        centerY + size * Math.sin(i * 2 * Math.PI / numberOfSides));
    }
    ctx.strokeStyle = '#F00';
    ctx.lineWidth = 1;
    ctx.stroke();
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
    grad1.addColorStop(1, this.getBackgroundColor());
    this.ctx.globalCompositeOperation = 'color';
    this.ctx.fillStyle = grad1;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }
}


//////////////////////////////////
// Crée un nouvel élément Image
//   backgroundImage.onload = () => {
//     ctx.drawImage(backgroundImage, 0, 0);
//   };
//   backgroundImage.src = 'https://wallpaperplay.com/walls/full/f/6/8/131287.jpg'; // Définit le chemin vers sa source

