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
  currentColorHue = 340;
  currentColorSaturation = 100;
  currentColorLightness = 50;
  currentColorAlpha = 1;
  clearRate = 1;
  clearCounter = 0;
  clearAlpha = 0.6;
  visualizationSize = 0;
  minDecibels = -100;
  maxDecibels = 0;
  smoothingTimeConstant = 0.85;
  amplificator = 1.4; // pow
  mainLayerParameters = {
    globalCompositeOperationBeforeClean: 'destination-out',
    globalCompositeOperationAfterClean: 'lighter'
  };
  vizLayerParameters = {
    globalCompositeOperationBeforeClean: 'destination-out',
    globalCompositeOperationAfterClean: 'lighter'
  };



  // INTERNAL
  frameCounter = 0;
  fileReader;
  audioContext;
  canvas;
  vizLayer;
  vizCtx;
  mainCtx;
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
    this.mainCtx = this.canvas.getContext('2d');
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
    this.vizLayer = document.createElement('canvas');
    this.vizLayer.width = this.w;
    this.vizLayer.height = this.h;
    this.vizCtx = this.vizLayer.getContext('2d');
    this.setContextStyles(this.vizCtx);
    // this.setContextStyles(this.mainCtx);
    this.mainCtx.drawImage(this.vizLayer, 0, 0, this.w, this.h);
  }

  setContextStyles(ctx) {
    const { w, h } = this;
    // this.gradient = mainCtx.createLinearGradient(0, 0, 0, 300);
    // this.gradient.addColorStop(1, this.barColor);
    // mainCtx.fillStyle = this.gradient;
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowColor = this.shadowColor;
    ctx.font = this.font.join(' ');
    ctx.textAlign = 'center';
    ctx.fillText('Audio Visualizer', w / 2 + 10, h / 2);
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
    this.renderLoop();
  }

  renderLoop() {
    window.requestAnimationFrame(this.renderLoop.bind(this));
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.clear();

    switch (this.vizTypeSelected) {
      case 'CLASSIC' : this.renderAudioGoneMirror(this.vizCtx); break;
      case 'SPOT': this.renderSpotLight(); break;
      case 'LOGO': this.renderLogoPoly(); break;
      case 'PARAM_LINE': this.renderParameterizedLine(); break;
      case 'CIRCLE': this.renderCircle(); break;
      case 'LINES': this.renderMultiLines(); break;
      case 'XGONE': this.renderXgone(); break;
    }

    this.mainCtx.drawImage(this.vizLayer, 0, 0);

    if (this.frameCounter++ === Number.MAX_SAFE_INTEGER) {
      this.frameCounter = 1;
    }
  }

  clear() {
    const { mainCtx, vizCtx, w, h, cw, ch } = this;

    mainCtx.globalCompositeOperation = this.mainLayerParameters.globalCompositeOperationBeforeClean;
    mainCtx.fillStyle = this.getBackgroundColor();
    mainCtx.fillRect(0, 0, w, h);
    mainCtx.globalCompositeOperation = this.mainLayerParameters.globalCompositeOperationAfterClean;

    vizCtx.globalCompositeOperation = this.vizLayerParameters.globalCompositeOperationBeforeClean;
    if (this.clearCounter % this.clearRate === 0) {
      vizCtx.fillStyle = this.getBackgroundColor();
      vizCtx.fillRect(0, 0, w, h);
    }
    vizCtx.globalCompositeOperation = this.vizLayerParameters.globalCompositeOperationAfterClean;

    // const zoomfactor = 1.1;
    // mainCtx.setTransform(
    //   zoomfactor, 0, 0,
    //   zoomfactor, -(zoomfactor - 1) * cw,
    //   -(zoomfactor - 1) * ch / 2);
    // mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    // mainCtx.scale(1.001, 1.001);
    if (this.clearCounter++ === Number.MAX_SAFE_INTEGER) {
      this.clearCounter = 1;
    }
  }

  renderParameterizedLine() {
    const { mainCtx, ch, h, frequencyData } = this;
    const offsetY = ch;
    mainCtx.strokeStyle = this.getCurrentColor();
    mainCtx.lineWidth = 1;
    mainCtx.beginPath();
    mainCtx.moveTo(0, offsetY);
    for (let i = 1; i < frequencyData.length; i++) {
      mainCtx.lineTo(i * 2, offsetY - frequencyData[i]);
    }
    mainCtx.stroke();
  }

  renderLogoPoly() {
    const { mainCtx, ch, cw, frequencyData } = this;
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

    mainCtx.strokeStyle = '#F00';
    mainCtx.lineWidth = 1;
    mainCtx.stroke();
  }

  private drawSide(pts, freqBySide) {
    const { mainCtx, frequencyData } = this;
    const incX = Math.abs(pts[0] - pts[2]) / freqBySide;
    const incY = Math.abs(pts[1] - pts[3]) / freqBySide;

    mainCtx.moveTo(pts[0], pts[1]);
    for (let i = 1; i < freqBySide; i++) {
      mainCtx.lineTo(pts[0] + incX * i, pts[1] - incY * i );
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
    const { mainCtx } = this;
    mainCtx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) {
      mainCtx.lineTo(pts[i], pts[i + 1]);
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
    const { mainCtx, ch, cw, frequencyData } = this;
    const size = 100;

    const startPt = {
      x: cw - 100 / 2,
      y: ch - 100 / 2
    };

    mainCtx.moveTo(startPt.x, startPt.y);
    mainCtx.lineTo(startPt.x + size, startPt.y);
    mainCtx.lineTo(startPt.x + size, startPt.y + 100 * 0.9085);
    mainCtx.lineTo(startPt.x + size / 2, startPt.y + 100 * 1.1851);
    mainCtx.lineTo(startPt.x, startPt.y + 100 * 0.9085);
    mainCtx.lineTo(startPt.x, startPt.y);

    mainCtx.strokeStyle = '#F00';
    mainCtx.lineWidth = 1;
    mainCtx.stroke();
  }

  renderAudioGoneMirror(ctx) {
    const { ch, cw, frequencyData, amplificator } = this;
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
    const { mainCtx, ch, cw, frequencyData } = this;
    const size = 120;
    const numberOfSides = this.bufferSize / Math.PI - 5;

    this.analyser.getByteFrequencyData(frequencyData);

    mainCtx.beginPath();
    mainCtx.moveTo(
      cw + (size + frequencyData[0]) * Math.cos(0),
      ch + (size + frequencyData[0]) * Math.sin(0));
    for (let i = 1; i < numberOfSides; i++) {
      const pulse = frequencyData[i];
      mainCtx.lineTo(
        cw + (size + pulse) * Math.cos(i * 2 * Math.PI / numberOfSides),
        ch + (size + pulse) * Math.sin(i * 2 * Math.PI / numberOfSides)
      );
    }
    mainCtx.lineTo(
      cw + (size + frequencyData[0]) * Math.cos(0),
      ch + (size + frequencyData[0]) * Math.sin(0)
    );
    mainCtx.strokeStyle = '#F00';
    mainCtx.lineWidth = 1;
    mainCtx.stroke();

  }

  renderMultiLines() {
    const { mainCtx, ch, frequencyData, freqBinCount } = this;
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
    const { mainCtx, ch, h } = this;
    const color = (lineIdx / this.lineMemoryCount * 340);
    const opacity = 1 - (lineIdx / this.lineMemoryCount);
    const offsetY = h - lineIdx * 20;
    mainCtx.strokeStyle = 'hsla(' + color + ', 100%, 50%, ' + opacity + ')';
    mainCtx.lineWidth = 2;
    mainCtx.beginPath();
    mainCtx.moveTo(0, offsetY);
    for (let i = 1; i < frequencyData.length; i++) {
      mainCtx.lineTo(i * 2, offsetY - frequencyData[i]);
    }
    mainCtx.stroke();
  }

  renderCircle() {
    const { mainCtx, circle, dToR } = this;

    const gradient4 = mainCtx.createRadialGradient(0, circle.radius, 0, 0, circle.radius, 25);
    gradient4.addColorStop(0, 'hsla(359,100%,50%,0.8)');
    gradient4.addColorStop(1, 'hsla(30, 100%, 50%, 0)');
    mainCtx.fillStyle = gradient4;

    mainCtx.save();
    mainCtx.translate(circle.x, circle.y);
    mainCtx.rotate(dToR(circle.rotation));
    mainCtx.beginPath();
    mainCtx.arc(0, 0, circle.radius, dToR(circle.angleStart), dToR(circle.angleEnd), true);
    mainCtx.lineWidth = circle.thickness;
    mainCtx.strokeStyle = gradient4;
    mainCtx.stroke();
    mainCtx.restore();
    if (circle.rotation < 360) {
      circle.rotation += circle.speed;
    } else {
      circle.rotation = 0;
    }
  }

  renderClassic() {
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.mainCtx.fillStyle = this.barColor;
    this.mainCtx.clearRect(0, 0, this.w, this.h);
    let x = 0;
    for (let i = 0; i < this.freqBinCount ; i++) {
      this.barHeight = (150 + this.frequencyData[i]) * this.multiplier;
      this.mainCtx.fillRect(x, this.h - this.barHeight, this.barWidth, this.barHeight);
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
    const { mainCtx, ch, cw, frequencyData } = this;
    const numberOfSides = 128;
    const size = 150;
    const centerX = cw;
    const centerY = ch;

    mainCtx.beginPath();
    mainCtx.moveTo (centerX + size * Math.cos(0), centerY +  size *  Math.sin(0));
    for (let i = 1; i <= numberOfSides; i++) {
      mainCtx.lineTo(
        centerX + size * Math.cos(i * 2 * Math.PI / numberOfSides),
        centerY + size * Math.sin(i * 2 * Math.PI / numberOfSides));
    }
    mainCtx.strokeStyle = '#F00';
    mainCtx.lineWidth = 1;
    mainCtx.stroke();
  }

  drawGradient(x, y, amplitude, color) {
    const grad1 = this.mainCtx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      amplitude
    );
    grad1.addColorStop(0, color);
    grad1.addColorStop(1, this.getBackgroundColor());
    this.mainCtx.globalCompositeOperation = 'color';
    this.mainCtx.fillStyle = grad1;
    this.mainCtx.fillRect(0, 0, this.w, this.h);
  }
}


//////////////////////////////////
// Crée un nouvel élément Image
//   backgroundImage.onload = () => {
//     mainCtx.drawImage(backgroundImage, 0, 0);
//   };
//   backgroundImage.src = 'https://wallpaperplay.com/walls/full/f/6/8/131287.jpg'; // Définit le chemin vers sa source

