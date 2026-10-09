export const VERTEX_SHADER = `
attribute vec2 aPos;
attribute vec2 aUv;
attribute vec4 aColor;
attribute float aPage;
uniform vec2 uResolution;
varying vec2 vUv;
varying vec4 vColor;
varying float vPage;
void main() {
  vUv = aUv;
  vColor = aColor;
  vPage = aPage;
  vec2 clip = (aPos / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

export const FRAGMENT_SHADER = `
precision mediump float;
uniform sampler2D uPage0;
uniform sampler2D uPage1;
uniform sampler2D uPage2;
uniform sampler2D uPage3;
varying vec2 vUv;
varying vec4 vColor;
varying float vPage;
void main() {
  vec4 texel;
  if (vPage < 0.5) texel = texture2D(uPage0, vUv);
  else if (vPage < 1.5) texel = texture2D(uPage1, vUv);
  else if (vPage < 2.5) texel = texture2D(uPage2, vUv);
  else texel = texture2D(uPage3, vUv);
  gl_FragColor = texel * vColor;
}`;
