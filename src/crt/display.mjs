import { LABELS, STORAGE_KEY, machineFor, nextMode, pickMode, pictureWidth, screenBox } from './mode.mjs';
import { platformFor } from '../platform.mjs';

// Each Phaser frame (256x240 NES, 256x224 SNES) is uploaded as a texture and drawn once through this shader onto a
// window-sized canvas laid over the game. Sharp pixels hides that canvas and shows Phaser's own.

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uSrc;
uniform vec2 uSrcSize;
uniform vec2 uOut;
uniform vec4 uBox;
uniform float uFrame;
uniform float uCurve, uScan, uGlow, uBleed, uCrawl, uVignette, uMask, uSharp;
uniform float uPicture, uLinePhase;

vec3 texel(float x, float y) {
  return texture2D(uSrc, (vec2(floor(x), floor(y)) + 0.5) / uSrcSize).rgb;
}

const mat3 TO_YIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
const mat3 TO_RGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);

// One source row as the TV decodes it: sharp luma, chroma smeared sideways, crawl on edges.
vec3 decode(float tx, float row) {
  float x0 = floor(tx - 0.5);
  float f = clamp((fract(tx - 0.5) - 0.5) * uSharp + 0.5, 0.0, 1.0);
  vec3 a = TO_YIQ * texel(x0, row);
  vec3 b = TO_YIQ * texel(x0 + 1.0, row);
  vec3 sharp = mix(a, b, f);
  vec3 l2 = TO_YIQ * texel(x0 - 1.0, row);
  vec3 r2 = TO_YIQ * texel(x0 + 2.0, row);
  vec2 smear = (l2.yz + 2.0 * a.yz + 2.0 * b.yz + r2.yz) / 6.0;
  vec3 yiq = vec3(sharp.x, mix(sharp.yz, smear, uBleed));
  float edge = abs(r2.x - l2.x) + length(r2.yz - l2.yz);
  float phase = 6.2832 * tx * 0.6667 + uLinePhase * (row + uFrame);
  yiq.x += uCrawl * edge * cos(phase);
  yiq.yz += uCrawl * edge * vec2(sin(phase), cos(phase)) * 0.6;
  return clamp(TO_RGB * yiq, 0.0, 1.0);
}

float beam(float d, float lum) {
  float sigma = mix(0.3, 0.5, lum);
  return exp(-d * d / (2.0 * sigma * sigma));
}

void main() {
  vec2 pix = vec2(gl_FragCoord.x, uOut.y - gl_FragCoord.y);
  vec2 c = (pix - uBox.xy) / uBox.zw * 2.0 - 1.0;
  c *= 1.0 + uCurve * c.yx * c.yx;

  // The bezel: dark plastic with a faint lip of light where it meets the glass.
  vec2 q = abs(c) - vec2(1.0 - 0.06);
  float dist = length(max(q, 0.0)) - 0.06;
  float aa = 2.0 / uBox.w;
  if (dist > aa) {
    vec3 plastic = vec3(0.045, 0.043, 0.05) * (1.0 - clamp(dist * 1.5, 0.0, 0.8));
    plastic += vec3(0.05) * exp(-dist * 60.0);
    gl_FragColor = vec4(plastic, 1.0);
    return;
  }

  vec2 uv = c * 0.5 + 0.5;
  vec2 pic = uv;
  if (uPicture < 1.0) {
    pic.x = (uv.x - 0.5) / uPicture + 0.5;
    if (pic.x < 0.0 || pic.x > 1.0) {
      gl_FragColor = vec4(vec3(0.0), 1.0);
      return;
    }
  }
  vec2 t = pic * uSrcSize;
  float row = floor(t.y);
  float d = fract(t.y) - 0.5;
  float other = row + (d < 0.0 ? -1.0 : 1.0);

  vec3 near = decode(t.x, row);
  vec3 far = texel(t.x, other);
  near *= near; far *= far;
  float wn = beam(d, max(near.r, max(near.g, near.b)));
  float wf = beam(1.0 - abs(d), max(far.r, max(far.g, far.b)));
  vec3 lit = mix(near, near * wn * 1.6 + far * wf * 1.6, uScan);

  // Glow: bright pixels bleed light into the dark around them.
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854;
    vec2 o = vec2(cos(a), sin(a));
    vec3 s = texel(t.x + o.x * 2.0, t.y + o.y * 2.0);
    glow += max(s * s - 0.25, 0.0);
  }
  lit += glow / 5.0 * uGlow;

  // The shadow mask: a faint RGB stripe per screen pixel, brightened back up.
  float m = mod(gl_FragCoord.x, 3.0);
  vec3 mask = m < 1.0 ? vec3(1.0, 0.7, 0.7) : m < 2.0 ? vec3(0.7, 1.0, 0.7) : vec3(0.7, 0.7, 1.0);
  lit *= mix(vec3(1.0), mask * 1.25, uMask);

  float vig = pow(clamp(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.0, 1.0), uVignette);
  vec3 colour = sqrt(clamp(lit * vig, 0.0, 1.0));
  gl_FragColor = vec4(colour * (1.0 - smoothstep(-aa, aa, dist)), 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function tube(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return null;
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) {
    gl.texParameteri(gl.TEXTURE_2D, key, value);
  }
  const at = (name) => gl.getUniformLocation(program, name);
  return { gl, at };
}

function remembered() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function remember(mode) {
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* private window: this visit only */ }
}

// Lays the TV over the game. V or the corner button cycles the mode.
export function installCrt(game, params) {
  const canvas = document.createElement('canvas');
  canvas.id = 'crt';
  document.body.appendChild(canvas);

  let screen = null;
  try { screen = tube(canvas); } catch (err) { console.warn('CRT shader unavailable', err); }
  let mode = screen ? pickMode(params.get('crt'), remembered()) : 'sharp';
  const machine = machineFor(platformFor(params).crtLook);

  const button = document.createElement('button');
  button.id = 'crt-toggle';
  button.type = 'button';
  button.hidden = !screen;
  document.body.appendChild(button);

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }

  function show() {
    canvas.hidden = mode === 'sharp';
    button.textContent = LABELS[mode];
    button.title = 'Display: ' + LABELS[mode] + ' (V to change)';
  }

  function cycle() {
    mode = nextMode(mode);
    remember(mode);
    show();
  }

  function draw() {
    if (!screen || mode === 'sharp') return;
    const { gl, at } = screen;
    const look = machine.looks[mode];
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, game.canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const box = screenBox(canvas.width, canvas.height);
    gl.uniform2f(at('uSrcSize'), game.canvas.width, game.canvas.height);
    gl.uniform2f(at('uOut'), canvas.width, canvas.height);
    gl.uniform4f(at('uBox'), box.x, box.y, box.w, box.h);
    gl.uniform1f(at('uFrame'), game.loop.frame % machine.frames);
    gl.uniform1f(at('uLinePhase'), machine.linePhase);
    gl.uniform1f(at('uPicture'), pictureWidth(machine, game.canvas.width, game.canvas.height));
    gl.uniform1f(at('uCurve'), look.curve);
    gl.uniform1f(at('uScan'), look.scan);
    gl.uniform1f(at('uGlow'), look.glow);
    gl.uniform1f(at('uBleed'), look.bleed);
    gl.uniform1f(at('uCrawl'), look.crawl);
    gl.uniform1f(at('uVignette'), look.vignette);
    gl.uniform1f(at('uMask'), look.mask);
    gl.uniform1f(at('uSharp'), look.sharp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  button.addEventListener('click', () => { cycle(); button.blur(); });
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyV' && screen) cycle(); });
  window.addEventListener('resize', resize);
  game.events.on('postrender', draw);
  resize();
  show();
  return { get mode() { return mode; } };
}
