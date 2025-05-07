let audioStarted = false;

function mousePressed() {
  if (!audioStarted) {
    userStartAudio();
    audioStarted = true;
  }
}

let bgImage;
let track, donSound, kaSound;
let chart = [];
let notes = [];
let generated = 0;
let speed = 4; 
let startTime = null;
let score = 0;
let combo = 0;
let showHitEffect = false;
let hitEffectTimer = 0;
let amp;
let drumY;
let particles = [];

function preload() {
  bgImage = loadImage('background_2.jpg'); 
  track = loadSound('A Cruel Angels Thesis 02.mp3');
  donSound = loadSound('don.wav');
  kaSound = loadSound('ka.wav');
}

function setup() {
  createCanvas(540, 960);
  textAlign(CENTER, CENTER);
  drumY = height - 80;

  amp = new p5.Amplitude();
  amp.setInput(track);

  const fileInput = createFileInput(handleMIDIFile);
  fileInput.position(10, 10);
}

function draw() {
  background(30);
  image(bgImage, 0, 0, width, height); 

  drawLaneGuides();
  drawDrum();

  if (startTime === null) {
    fill(255);
    textSize(24);
    text('PRESS SPACE TO START', width / 2, height / 2);
    return;
  }

  let t = millis() / 1000 - startTime;
  while (generated < chart.length && t >= chart[generated].time) {
    notes.push(new Note(chart[generated]));
    generated++;
  }

  for (let i = notes.length - 1; i >= 0; i--) {
    notes[i].update();
    notes[i].draw();
    if (notes[i].y > height + 50) {
      notes.splice(i, 1);
      combo = 0;
    }
  }

  // particles effects
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].lifetime <= 0) {
      particles.splice(i, 1);
    }
  }

  // Hit hint
  if (showHitEffect) {
    fill(255, 255, 0, 180);
    textSize(36);
    text("Hit!", width / 2, drumY);
    hitEffectTimer--;
    if (hitEffectTimer <= 0) showHitEffect = false;
  }

  // UI
  fill(255);
  textSize(20);
  textAlign(LEFT, TOP);
  text('Score: ' + score, 20, 20);

  if (combo >= 2) {
    textAlign(CENTER, CENTER);
    textSize(36);
    fill(255, 180, 0);
    text(combo + ' Combo!', width / 2, drumY - 100);
  }
}

function drawLaneGuides() {
  fill(80);
  rect(width * 0.4 - 10, 0, 5, height);
  rect(width * 0.6 + 5, 0, 5, height);
}

function drawDrum() {
  noStroke();
  fill(160, 70, 50);
  ellipse(width * 0.5, drumY, 100, 100);
  fill(80, 30, 20);
  ellipse(width * 0.5, drumY, 70, 70);
}

class Note {
  constructor(obj) {
    this.time = obj.time;
    this.type = obj.type;
    this.x = (this.type === 'don') ? width * 0.4 : width * 0.6;
    this.y = -50;
    this.hit = false;
  }

  update() {
    this.y += speed;
  }

  draw() {
    noStroke();
    fill(this.type === 'don' ? color(255, 80, 80) : color(80, 160, 255));
    ellipse(this.x, this.y, 40);
    fill(0);
    textSize(16);
    text("•ᴗ•", this.x, this.y);
  }
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 5));
    this.alpha = 255;
    this.size = random(5, 12);
    this.color = color(random(200, 255), random(100, 200), random(100, 255));
    this.lifetime = 30;
  }

  update() {
    this.pos.add(this.vel);
    this.alpha -= 8;
    this.lifetime--;
  }

  draw() {
    noStroke();
    this.color.setAlpha(this.alpha);
    fill(this.color);
    ellipse(this.pos.x, this.pos.y, this.size);
  }
}

function keyPressed() {
  if (startTime === null && key === ' ') {
    track.loop();
    startTime = millis() / 1000;
    return;
  }
  if (key === 'd' || key === 'D') tryHit('don', donSound);
  if (key === 'k' || key === 'K') tryHit('ka', kaSound);
}

function tryHit(type, snd) {
  const tolerance = 50;
  for (let i = 0; i < notes.length; i++) {
    let n = notes[i];
    if (!n.hit && n.type === type && abs(n.y - drumY) < tolerance) {
      n.hit = true;
      notes.splice(i, 1);
      snd.play();
      score += 100;
      combo += 1;
      showHitEffect = true;
      hitEffectTimer = 10;

      for (let j = 0; j < 12; j++) {
        particles.push(new Particle(width / 2, drumY));
      }
      break;
    }
  }
}

function windowResized() {
  resizeCanvas(540, 960);
}

async function handleMIDIFile(file) {
  const midi = await Midi.fromUrl(file.data);
  chart = [];

  const bpm = 128;
  const ppq = midi.header.ppq;

  midi.tracks.forEach(track => {
    track.notes.forEach(note => {
      let type = (note.midi === 36) ? 'don' :
                 (note.midi === 38) ? 'ka' : null;
      if (type !== null) {
        const noteTimeInSeconds = (note.ticks / ppq) * (60 / bpm);
        chart.push({ time: noteTimeInSeconds, type });
      }
    });
  });

  chart.sort((a, b) => a.time - b.time);
  generated = 0;
  notes = [];
  combo = 0;
  console.log("Loaded chart from MIDI:", chart);
}
