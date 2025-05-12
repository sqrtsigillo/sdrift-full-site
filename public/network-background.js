
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '-1';
canvas.style.opacity = '0.15';
canvas.style.pointerEvents = 'none';

let width, height;
let mouse = { x: null, y: null };
let lastMouseTime = Date.now();

const NODE_COUNT = 40;
const MAX_CONNECTIONS = 6;
const nodes = [];

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

class Node {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 2 + Math.random() * 3;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.connections = [];
  }

  update() {
    let damp = Date.now() - lastMouseTime > 91000 ? 0.003 : 0.05;
    this.x += this.vx * damp;
    this.y += this.vy * damp;

    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ccc';
    ctx.fill();
  }
}

function connectNodes() {
  nodes.forEach(n => n.connections = []);
  for (let i = 0; i < nodes.length; i++) {
    let others = nodes.slice().sort(() => Math.random() - 0.5);
    for (let j = 0; j < MAX_CONNECTIONS && j < others.length; j++) {
      if (others[j] !== nodes[i] && !nodes[i].connections.includes(others[j])) {
        nodes[i].connections.push(others[j]);
        others[j].connections.push(nodes[i]);
      }
    }
  }
}

function drawConnections() {
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.1)';
  ctx.lineWidth = 1;
  nodes.forEach(n => {
    n.connections.forEach(c => {
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    });
  });
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  drawConnections();
  nodes.forEach(n => {
    n.update();
    n.draw();
  });
  requestAnimationFrame(animate);
}

canvas.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  lastMouseTime = Date.now();
  nodes.forEach(n => {
    const dx = n.x - mouse.x;
    const dy = n.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const force = 80 / (dist + 40);
    n.vx += (dx / dist) * force * 0.002;
    n.vy += (dy / dist) * force * 0.002;
  });
});

for (let i = 0; i < NODE_COUNT; i++) {
  nodes.push(new Node(Math.random() * width, Math.random() * height));
}

connectNodes();
animate();
