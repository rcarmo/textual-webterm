var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// node_modules/@xterm/addon-fit/lib/addon-fit.js
var require_addon_fit = __commonJS((exports, module) => {
  (function(e, t) {
    typeof exports == "object" && typeof module == "object" ? module.exports = t() : typeof define == "function" && define.amd ? define([], t) : typeof exports == "object" ? exports.FitAddon = t() : e.FitAddon = t();
  })(self, () => (() => {
    var e = {};
    return (() => {
      var t = e;
      Object.defineProperty(t, "__esModule", { value: true }), t.FitAddon = undefined, t.FitAddon = class {
        activate(e2) {
          this._terminal = e2;
        }
        dispose() {}
        fit() {
          const e2 = this.proposeDimensions();
          if (!e2 || !this._terminal || isNaN(e2.cols) || isNaN(e2.rows))
            return;
          const t2 = this._terminal._core;
          this._terminal.rows === e2.rows && this._terminal.cols === e2.cols || (t2._renderService.clear(), this._terminal.resize(e2.cols, e2.rows));
        }
        proposeDimensions() {
          if (!this._terminal)
            return;
          if (!this._terminal.element || !this._terminal.element.parentElement)
            return;
          const e2 = this._terminal._core, t2 = e2._renderService.dimensions;
          if (t2.css.cell.width === 0 || t2.css.cell.height === 0)
            return;
          const r = this._terminal.options.scrollback === 0 ? 0 : e2.viewport.scrollBarWidth, i = window.getComputedStyle(this._terminal.element.parentElement), o = parseInt(i.getPropertyValue("height")), s15 = Math.max(0, parseInt(i.getPropertyValue("width"))), n = window.getComputedStyle(this._terminal.element), l = o - (parseInt(n.getPropertyValue("padding-top")) + parseInt(n.getPropertyValue("padding-bottom"))), a = s15 - (parseInt(n.getPropertyValue("padding-right")) + parseInt(n.getPropertyValue("padding-left"))) - r;
          return { cols: Math.max(2, Math.floor(a / t2.css.cell.width)), rows: Math.max(1, Math.floor(l / t2.css.cell.height)) };
        }
      };
    })(), e;
  })());
});

// node_modules/@xterm/addon-webgl/lib/addon-webgl.js
var require_addon_webgl = __commonJS((exports, module) => {
  (function(e, t) {
    typeof exports == "object" && typeof module == "object" ? module.exports = t() : typeof define == "function" && define.amd ? define([], t) : typeof exports == "object" ? exports.WebglAddon = t() : e.WebglAddon = t();
  })(self, () => (() => {
    var e = { 965: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.GlyphRenderer = undefined;
      const s16 = i2(374), r = i2(509), o = i2(855), n = i2(859), a = i2(381), h = 11, l = h * Float32Array.BYTES_PER_ELEMENT;
      let c, d = 0, _ = 0, u = 0;

      class g extends n.Disposable {
        constructor(e3, t3, i3, o2) {
          super(), this._terminal = e3, this._gl = t3, this._dimensions = i3, this._optionsService = o2, this._activeBuffer = 0, this._vertices = { count: 0, attributes: new Float32Array(0), attributesBuffers: [new Float32Array(0), new Float32Array(0)] };
          const h2 = this._gl;
          r.TextureAtlas.maxAtlasPages === undefined && (r.TextureAtlas.maxAtlasPages = Math.min(32, (0, s16.throwIfFalsy)(h2.getParameter(h2.MAX_TEXTURE_IMAGE_UNITS))), r.TextureAtlas.maxTextureSize = (0, s16.throwIfFalsy)(h2.getParameter(h2.MAX_TEXTURE_SIZE))), this._program = (0, s16.throwIfFalsy)((0, a.createProgram)(h2, `#version 300 es
layout (location = 0) in vec2 a_unitquad;
layout (location = 1) in vec2 a_cellpos;
layout (location = 2) in vec2 a_offset;
layout (location = 3) in vec2 a_size;
layout (location = 4) in float a_texpage;
layout (location = 5) in vec2 a_texcoord;
layout (location = 6) in vec2 a_texsize;

uniform mat4 u_projection;
uniform vec2 u_resolution;

out vec2 v_texcoord;
flat out int v_texpage;

void main() {
  vec2 zeroToOne = (a_offset / u_resolution) + a_cellpos + (a_unitquad * a_size);
  gl_Position = u_projection * vec4(zeroToOne, 0.0, 1.0);
  v_texpage = int(a_texpage);
  v_texcoord = a_texcoord + a_unitquad * a_texsize;
}`, function(e4) {
            let t4 = "";
            for (let i4 = 1;i4 < e4; i4++)
              t4 += ` else if (v_texpage == ${i4}) { outColor = texture(u_texture[${i4}], v_texcoord); }`;
            return `#version 300 es
precision lowp float;

in vec2 v_texcoord;
flat in int v_texpage;

uniform sampler2D u_texture[${e4}];

out vec4 outColor;

void main() {
  if (v_texpage == 0) {
    outColor = texture(u_texture[0], v_texcoord);
  } ${t4}
}`;
          }(r.TextureAtlas.maxAtlasPages))), this.register((0, n.toDisposable)(() => h2.deleteProgram(this._program))), this._projectionLocation = (0, s16.throwIfFalsy)(h2.getUniformLocation(this._program, "u_projection")), this._resolutionLocation = (0, s16.throwIfFalsy)(h2.getUniformLocation(this._program, "u_resolution")), this._textureLocation = (0, s16.throwIfFalsy)(h2.getUniformLocation(this._program, "u_texture")), this._vertexArrayObject = h2.createVertexArray(), h2.bindVertexArray(this._vertexArrayObject);
          const c2 = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), d2 = h2.createBuffer();
          this.register((0, n.toDisposable)(() => h2.deleteBuffer(d2))), h2.bindBuffer(h2.ARRAY_BUFFER, d2), h2.bufferData(h2.ARRAY_BUFFER, c2, h2.STATIC_DRAW), h2.enableVertexAttribArray(0), h2.vertexAttribPointer(0, 2, this._gl.FLOAT, false, 0, 0);
          const _2 = new Uint8Array([0, 1, 2, 3]), u2 = h2.createBuffer();
          this.register((0, n.toDisposable)(() => h2.deleteBuffer(u2))), h2.bindBuffer(h2.ELEMENT_ARRAY_BUFFER, u2), h2.bufferData(h2.ELEMENT_ARRAY_BUFFER, _2, h2.STATIC_DRAW), this._attributesBuffer = (0, s16.throwIfFalsy)(h2.createBuffer()), this.register((0, n.toDisposable)(() => h2.deleteBuffer(this._attributesBuffer))), h2.bindBuffer(h2.ARRAY_BUFFER, this._attributesBuffer), h2.enableVertexAttribArray(2), h2.vertexAttribPointer(2, 2, h2.FLOAT, false, l, 0), h2.vertexAttribDivisor(2, 1), h2.enableVertexAttribArray(3), h2.vertexAttribPointer(3, 2, h2.FLOAT, false, l, 2 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(3, 1), h2.enableVertexAttribArray(4), h2.vertexAttribPointer(4, 1, h2.FLOAT, false, l, 4 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(4, 1), h2.enableVertexAttribArray(5), h2.vertexAttribPointer(5, 2, h2.FLOAT, false, l, 5 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(5, 1), h2.enableVertexAttribArray(6), h2.vertexAttribPointer(6, 2, h2.FLOAT, false, l, 7 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(6, 1), h2.enableVertexAttribArray(1), h2.vertexAttribPointer(1, 2, h2.FLOAT, false, l, 9 * Float32Array.BYTES_PER_ELEMENT), h2.vertexAttribDivisor(1, 1), h2.useProgram(this._program);
          const g2 = new Int32Array(r.TextureAtlas.maxAtlasPages);
          for (let e4 = 0;e4 < r.TextureAtlas.maxAtlasPages; e4++)
            g2[e4] = e4;
          h2.uniform1iv(this._textureLocation, g2), h2.uniformMatrix4fv(this._projectionLocation, false, a.PROJECTION_MATRIX), this._atlasTextures = [];
          for (let e4 = 0;e4 < r.TextureAtlas.maxAtlasPages; e4++) {
            const t4 = new a.GLTexture((0, s16.throwIfFalsy)(h2.createTexture()));
            this.register((0, n.toDisposable)(() => h2.deleteTexture(t4.texture))), h2.activeTexture(h2.TEXTURE0 + e4), h2.bindTexture(h2.TEXTURE_2D, t4.texture), h2.texParameteri(h2.TEXTURE_2D, h2.TEXTURE_WRAP_S, h2.CLAMP_TO_EDGE), h2.texParameteri(h2.TEXTURE_2D, h2.TEXTURE_WRAP_T, h2.CLAMP_TO_EDGE), h2.texImage2D(h2.TEXTURE_2D, 0, h2.RGBA, 1, 1, 0, h2.RGBA, h2.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255])), this._atlasTextures[e4] = t4;
          }
          h2.enable(h2.BLEND), h2.blendFunc(h2.SRC_ALPHA, h2.ONE_MINUS_SRC_ALPHA), this.handleResize();
        }
        beginFrame() {
          return !this._atlas || this._atlas.beginFrame();
        }
        updateCell(e3, t3, i3, s17, r2, o2, n2, a2, h2) {
          this._updateCell(this._vertices.attributes, e3, t3, i3, s17, r2, o2, n2, a2, h2);
        }
        _updateCell(e3, t3, i3, r2, n2, a2, l2, g2, v2, f) {
          d = (i3 * this._terminal.cols + t3) * h, r2 !== o.NULL_CELL_CODE && r2 !== undefined ? this._atlas && (c = g2 && g2.length > 1 ? this._atlas.getRasterizedGlyphCombinedChar(g2, n2, a2, l2, false) : this._atlas.getRasterizedGlyph(r2, n2, a2, l2, false), _ = Math.floor((this._dimensions.device.cell.width - this._dimensions.device.char.width) / 2), n2 !== f && c.offset.x > _ ? (u = c.offset.x - _, e3[d] = -(c.offset.x - u) + this._dimensions.device.char.left, e3[d + 1] = -c.offset.y + this._dimensions.device.char.top, e3[d + 2] = (c.size.x - u) / this._dimensions.device.canvas.width, e3[d + 3] = c.size.y / this._dimensions.device.canvas.height, e3[d + 4] = c.texturePage, e3[d + 5] = c.texturePositionClipSpace.x + u / this._atlas.pages[c.texturePage].canvas.width, e3[d + 6] = c.texturePositionClipSpace.y, e3[d + 7] = c.sizeClipSpace.x - u / this._atlas.pages[c.texturePage].canvas.width, e3[d + 8] = c.sizeClipSpace.y) : (e3[d] = -c.offset.x + this._dimensions.device.char.left, e3[d + 1] = -c.offset.y + this._dimensions.device.char.top, e3[d + 2] = c.size.x / this._dimensions.device.canvas.width, e3[d + 3] = c.size.y / this._dimensions.device.canvas.height, e3[d + 4] = c.texturePage, e3[d + 5] = c.texturePositionClipSpace.x, e3[d + 6] = c.texturePositionClipSpace.y, e3[d + 7] = c.sizeClipSpace.x, e3[d + 8] = c.sizeClipSpace.y), this._optionsService.rawOptions.rescaleOverlappingGlyphs && (0, s16.allowRescaling)(r2, v2, c.size.x, this._dimensions.device.cell.width) && (e3[d + 2] = (this._dimensions.device.cell.width - 1) / this._dimensions.device.canvas.width)) : e3.fill(0, d, d + h - 1 - 2);
        }
        clear() {
          const e3 = this._terminal, t3 = e3.cols * e3.rows * h;
          this._vertices.count !== t3 ? this._vertices.attributes = new Float32Array(t3) : this._vertices.attributes.fill(0);
          let i3 = 0;
          for (;i3 < this._vertices.attributesBuffers.length; i3++)
            this._vertices.count !== t3 ? this._vertices.attributesBuffers[i3] = new Float32Array(t3) : this._vertices.attributesBuffers[i3].fill(0);
          this._vertices.count = t3, i3 = 0;
          for (let t4 = 0;t4 < e3.rows; t4++)
            for (let s17 = 0;s17 < e3.cols; s17++)
              this._vertices.attributes[i3 + 9] = s17 / e3.cols, this._vertices.attributes[i3 + 10] = t4 / e3.rows, i3 += h;
        }
        handleResize() {
          const e3 = this._gl;
          e3.useProgram(this._program), e3.viewport(0, 0, e3.canvas.width, e3.canvas.height), e3.uniform2f(this._resolutionLocation, e3.canvas.width, e3.canvas.height), this.clear();
        }
        render(e3) {
          if (!this._atlas)
            return;
          const t3 = this._gl;
          t3.useProgram(this._program), t3.bindVertexArray(this._vertexArrayObject), this._activeBuffer = (this._activeBuffer + 1) % 2;
          const i3 = this._vertices.attributesBuffers[this._activeBuffer];
          let s17 = 0;
          for (let t4 = 0;t4 < e3.lineLengths.length; t4++) {
            const r2 = t4 * this._terminal.cols * h, o2 = this._vertices.attributes.subarray(r2, r2 + e3.lineLengths[t4] * h);
            i3.set(o2, s17), s17 += o2.length;
          }
          t3.bindBuffer(t3.ARRAY_BUFFER, this._attributesBuffer), t3.bufferData(t3.ARRAY_BUFFER, i3.subarray(0, s17), t3.STREAM_DRAW);
          for (let e4 = 0;e4 < this._atlas.pages.length; e4++)
            this._atlas.pages[e4].version !== this._atlasTextures[e4].version && this._bindAtlasPageTexture(t3, this._atlas, e4);
          t3.drawElementsInstanced(t3.TRIANGLE_STRIP, 4, t3.UNSIGNED_BYTE, 0, s17 / h);
        }
        setAtlas(e3) {
          this._atlas = e3;
          for (const e4 of this._atlasTextures)
            e4.version = -1;
        }
        _bindAtlasPageTexture(e3, t3, i3) {
          e3.activeTexture(e3.TEXTURE0 + i3), e3.bindTexture(e3.TEXTURE_2D, this._atlasTextures[i3].texture), e3.texParameteri(e3.TEXTURE_2D, e3.TEXTURE_WRAP_S, e3.CLAMP_TO_EDGE), e3.texParameteri(e3.TEXTURE_2D, e3.TEXTURE_WRAP_T, e3.CLAMP_TO_EDGE), e3.texImage2D(e3.TEXTURE_2D, 0, e3.RGBA, e3.RGBA, e3.UNSIGNED_BYTE, t3.pages[i3].canvas), e3.generateMipmap(e3.TEXTURE_2D), this._atlasTextures[i3].version = t3.pages[i3].version;
        }
        setDimensions(e3) {
          this._dimensions = e3;
        }
      }
      t2.GlyphRenderer = g;
    }, 742: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.RectangleRenderer = undefined;
      const s16 = i2(374), r = i2(859), o = i2(310), n = i2(381), a = 8 * Float32Array.BYTES_PER_ELEMENT;

      class h {
        constructor() {
          this.attributes = new Float32Array(160), this.count = 0;
        }
      }
      let l = 0, c = 0, d = 0, _ = 0, u = 0, g = 0, v2 = 0;

      class f extends r.Disposable {
        constructor(e3, t3, i3, o2) {
          super(), this._terminal = e3, this._gl = t3, this._dimensions = i3, this._themeService = o2, this._vertices = new h, this._verticesCursor = new h;
          const l2 = this._gl;
          this._program = (0, s16.throwIfFalsy)((0, n.createProgram)(l2, `#version 300 es
layout (location = 0) in vec2 a_position;
layout (location = 1) in vec2 a_size;
layout (location = 2) in vec4 a_color;
layout (location = 3) in vec2 a_unitquad;

uniform mat4 u_projection;

out vec4 v_color;

void main() {
  vec2 zeroToOne = a_position + (a_unitquad * a_size);
  gl_Position = u_projection * vec4(zeroToOne, 0.0, 1.0);
  v_color = a_color;
}`, `#version 300 es
precision lowp float;

in vec4 v_color;

out vec4 outColor;

void main() {
  outColor = v_color;
}`)), this.register((0, r.toDisposable)(() => l2.deleteProgram(this._program))), this._projectionLocation = (0, s16.throwIfFalsy)(l2.getUniformLocation(this._program, "u_projection")), this._vertexArrayObject = l2.createVertexArray(), l2.bindVertexArray(this._vertexArrayObject);
          const c2 = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), d2 = l2.createBuffer();
          this.register((0, r.toDisposable)(() => l2.deleteBuffer(d2))), l2.bindBuffer(l2.ARRAY_BUFFER, d2), l2.bufferData(l2.ARRAY_BUFFER, c2, l2.STATIC_DRAW), l2.enableVertexAttribArray(3), l2.vertexAttribPointer(3, 2, this._gl.FLOAT, false, 0, 0);
          const _2 = new Uint8Array([0, 1, 2, 3]), u2 = l2.createBuffer();
          this.register((0, r.toDisposable)(() => l2.deleteBuffer(u2))), l2.bindBuffer(l2.ELEMENT_ARRAY_BUFFER, u2), l2.bufferData(l2.ELEMENT_ARRAY_BUFFER, _2, l2.STATIC_DRAW), this._attributesBuffer = (0, s16.throwIfFalsy)(l2.createBuffer()), this.register((0, r.toDisposable)(() => l2.deleteBuffer(this._attributesBuffer))), l2.bindBuffer(l2.ARRAY_BUFFER, this._attributesBuffer), l2.enableVertexAttribArray(0), l2.vertexAttribPointer(0, 2, l2.FLOAT, false, a, 0), l2.vertexAttribDivisor(0, 1), l2.enableVertexAttribArray(1), l2.vertexAttribPointer(1, 2, l2.FLOAT, false, a, 2 * Float32Array.BYTES_PER_ELEMENT), l2.vertexAttribDivisor(1, 1), l2.enableVertexAttribArray(2), l2.vertexAttribPointer(2, 4, l2.FLOAT, false, a, 4 * Float32Array.BYTES_PER_ELEMENT), l2.vertexAttribDivisor(2, 1), this._updateCachedColors(o2.colors), this.register(this._themeService.onChangeColors((e4) => {
            this._updateCachedColors(e4), this._updateViewportRectangle();
          }));
        }
        renderBackgrounds() {
          this._renderVertices(this._vertices);
        }
        renderCursor() {
          this._renderVertices(this._verticesCursor);
        }
        _renderVertices(e3) {
          const t3 = this._gl;
          t3.useProgram(this._program), t3.bindVertexArray(this._vertexArrayObject), t3.uniformMatrix4fv(this._projectionLocation, false, n.PROJECTION_MATRIX), t3.bindBuffer(t3.ARRAY_BUFFER, this._attributesBuffer), t3.bufferData(t3.ARRAY_BUFFER, e3.attributes, t3.DYNAMIC_DRAW), t3.drawElementsInstanced(this._gl.TRIANGLE_STRIP, 4, t3.UNSIGNED_BYTE, 0, e3.count);
        }
        handleResize() {
          this._updateViewportRectangle();
        }
        setDimensions(e3) {
          this._dimensions = e3;
        }
        _updateCachedColors(e3) {
          this._bgFloat = this._colorToFloat32Array(e3.background), this._cursorFloat = this._colorToFloat32Array(e3.cursor);
        }
        _updateViewportRectangle() {
          this._addRectangleFloat(this._vertices.attributes, 0, 0, 0, this._terminal.cols * this._dimensions.device.cell.width, this._terminal.rows * this._dimensions.device.cell.height, this._bgFloat);
        }
        updateBackgrounds(e3) {
          const t3 = this._terminal, i3 = this._vertices;
          let s17, r2, n2, a2, h2, l2, c2, d2, _2, u2, g2, v3 = 1;
          for (s17 = 0;s17 < t3.rows; s17++) {
            for (n2 = -1, a2 = 0, h2 = 0, l2 = false, r2 = 0;r2 < t3.cols; r2++)
              c2 = (s17 * t3.cols + r2) * o.RENDER_MODEL_INDICIES_PER_CELL, d2 = e3.cells[c2 + o.RENDER_MODEL_BG_OFFSET], _2 = e3.cells[c2 + o.RENDER_MODEL_FG_OFFSET], u2 = !!(67108864 & _2), (d2 !== a2 || _2 !== h2 && (l2 || u2)) && ((a2 !== 0 || l2 && h2 !== 0) && (g2 = 8 * v3++, this._updateRectangle(i3, g2, h2, a2, n2, r2, s17)), n2 = r2, a2 = d2, h2 = _2, l2 = u2);
            (a2 !== 0 || l2 && h2 !== 0) && (g2 = 8 * v3++, this._updateRectangle(i3, g2, h2, a2, n2, t3.cols, s17));
          }
          i3.count = v3;
        }
        updateCursor(e3) {
          const t3 = this._verticesCursor, i3 = e3.cursor;
          if (!i3 || i3.style === "block")
            return void (t3.count = 0);
          let s17, r2 = 0;
          i3.style !== "bar" && i3.style !== "outline" || (s17 = 8 * r2++, this._addRectangleFloat(t3.attributes, s17, i3.x * this._dimensions.device.cell.width, i3.y * this._dimensions.device.cell.height, i3.style === "bar" ? i3.dpr * i3.cursorWidth : i3.dpr, this._dimensions.device.cell.height, this._cursorFloat)), i3.style !== "underline" && i3.style !== "outline" || (s17 = 8 * r2++, this._addRectangleFloat(t3.attributes, s17, i3.x * this._dimensions.device.cell.width, (i3.y + 1) * this._dimensions.device.cell.height - i3.dpr, i3.width * this._dimensions.device.cell.width, i3.dpr, this._cursorFloat)), i3.style === "outline" && (s17 = 8 * r2++, this._addRectangleFloat(t3.attributes, s17, i3.x * this._dimensions.device.cell.width, i3.y * this._dimensions.device.cell.height, i3.width * this._dimensions.device.cell.width, i3.dpr, this._cursorFloat), s17 = 8 * r2++, this._addRectangleFloat(t3.attributes, s17, (i3.x + i3.width) * this._dimensions.device.cell.width - i3.dpr, i3.y * this._dimensions.device.cell.height, i3.dpr, this._dimensions.device.cell.height, this._cursorFloat)), t3.count = r2;
        }
        _updateRectangle(e3, t3, i3, s17, r2, o2, a2) {
          if (67108864 & i3)
            switch (50331648 & i3) {
              case 16777216:
              case 33554432:
                l = this._themeService.colors.ansi[255 & i3].rgba;
                break;
              case 50331648:
                l = (16777215 & i3) << 8;
                break;
              default:
                l = this._themeService.colors.foreground.rgba;
            }
          else
            switch (50331648 & s17) {
              case 16777216:
              case 33554432:
                l = this._themeService.colors.ansi[255 & s17].rgba;
                break;
              case 50331648:
                l = (16777215 & s17) << 8;
                break;
              default:
                l = this._themeService.colors.background.rgba;
            }
          e3.attributes.length < t3 + 4 && (e3.attributes = (0, n.expandFloat32Array)(e3.attributes, this._terminal.rows * this._terminal.cols * 8)), c = r2 * this._dimensions.device.cell.width, d = a2 * this._dimensions.device.cell.height, _ = (l >> 24 & 255) / 255, u = (l >> 16 & 255) / 255, g = (l >> 8 & 255) / 255, v2 = 1, this._addRectangle(e3.attributes, t3, c, d, (o2 - r2) * this._dimensions.device.cell.width, this._dimensions.device.cell.height, _, u, g, v2);
        }
        _addRectangle(e3, t3, i3, s17, r2, o2, n2, a2, h2, l2) {
          e3[t3] = i3 / this._dimensions.device.canvas.width, e3[t3 + 1] = s17 / this._dimensions.device.canvas.height, e3[t3 + 2] = r2 / this._dimensions.device.canvas.width, e3[t3 + 3] = o2 / this._dimensions.device.canvas.height, e3[t3 + 4] = n2, e3[t3 + 5] = a2, e3[t3 + 6] = h2, e3[t3 + 7] = l2;
        }
        _addRectangleFloat(e3, t3, i3, s17, r2, o2, n2) {
          e3[t3] = i3 / this._dimensions.device.canvas.width, e3[t3 + 1] = s17 / this._dimensions.device.canvas.height, e3[t3 + 2] = r2 / this._dimensions.device.canvas.width, e3[t3 + 3] = o2 / this._dimensions.device.canvas.height, e3[t3 + 4] = n2[0], e3[t3 + 5] = n2[1], e3[t3 + 6] = n2[2], e3[t3 + 7] = n2[3];
        }
        _colorToFloat32Array(e3) {
          return new Float32Array([(e3.rgba >> 24 & 255) / 255, (e3.rgba >> 16 & 255) / 255, (e3.rgba >> 8 & 255) / 255, (255 & e3.rgba) / 255]);
        }
      }
      t2.RectangleRenderer = f;
    }, 310: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.RenderModel = t2.COMBINED_CHAR_BIT_MASK = t2.RENDER_MODEL_EXT_OFFSET = t2.RENDER_MODEL_FG_OFFSET = t2.RENDER_MODEL_BG_OFFSET = t2.RENDER_MODEL_INDICIES_PER_CELL = undefined;
      const s16 = i2(296);
      t2.RENDER_MODEL_INDICIES_PER_CELL = 4, t2.RENDER_MODEL_BG_OFFSET = 1, t2.RENDER_MODEL_FG_OFFSET = 2, t2.RENDER_MODEL_EXT_OFFSET = 3, t2.COMBINED_CHAR_BIT_MASK = 2147483648, t2.RenderModel = class {
        constructor() {
          this.cells = new Uint32Array(0), this.lineLengths = new Uint32Array(0), this.selection = (0, s16.createSelectionRenderModel)();
        }
        resize(e3, i3) {
          const s17 = e3 * i3 * t2.RENDER_MODEL_INDICIES_PER_CELL;
          s17 !== this.cells.length && (this.cells = new Uint32Array(s17), this.lineLengths = new Uint32Array(i3));
        }
        clear() {
          this.cells.fill(0, 0), this.lineLengths.fill(0, 0);
        }
      };
    }, 666: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.JoinedCellData = t2.WebglRenderer = undefined;
      const s16 = i2(820), r = i2(274), o = i2(627), n = i2(457), a = i2(56), h = i2(374), l = i2(345), c = i2(859), d = i2(147), _ = i2(782), u = i2(855), g = i2(965), v2 = i2(742), f = i2(310), p = i2(733);

      class C2 extends c.Disposable {
        constructor(e3, t3, i3, n2, d2, u2, g2, v3, C3) {
          super(), this._terminal = e3, this._characterJoinerService = t3, this._charSizeService = i3, this._coreBrowserService = n2, this._coreService = d2, this._decorationService = u2, this._optionsService = g2, this._themeService = v3, this._cursorBlinkStateManager = new c.MutableDisposable, this._charAtlasDisposable = this.register(new c.MutableDisposable), this._observerDisposable = this.register(new c.MutableDisposable), this._model = new f.RenderModel, this._workCell = new _.CellData, this._workCell2 = new _.CellData, this._rectangleRenderer = this.register(new c.MutableDisposable), this._glyphRenderer = this.register(new c.MutableDisposable), this._onChangeTextureAtlas = this.register(new l.EventEmitter), this.onChangeTextureAtlas = this._onChangeTextureAtlas.event, this._onAddTextureAtlasCanvas = this.register(new l.EventEmitter), this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event, this._onRemoveTextureAtlasCanvas = this.register(new l.EventEmitter), this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event, this._onRequestRedraw = this.register(new l.EventEmitter), this.onRequestRedraw = this._onRequestRedraw.event, this._onContextLoss = this.register(new l.EventEmitter), this.onContextLoss = this._onContextLoss.event, this.register(this._themeService.onChangeColors(() => this._handleColorChange())), this._cellColorResolver = new r.CellColorResolver(this._terminal, this._optionsService, this._model.selection, this._decorationService, this._coreBrowserService, this._themeService), this._core = this._terminal._core, this._renderLayers = [new p.LinkRenderLayer(this._core.screenElement, 2, this._terminal, this._core.linkifier, this._coreBrowserService, g2, this._themeService)], this.dimensions = (0, h.createRenderDimensions)(), this._devicePixelRatio = this._coreBrowserService.dpr, this._updateDimensions(), this._updateCursorBlink(), this.register(g2.onOptionChange(() => this._handleOptionsChanged())), this._canvas = this._coreBrowserService.mainDocument.createElement("canvas");
          const m2 = { antialias: false, depth: false, preserveDrawingBuffer: C3 };
          if (this._gl = this._canvas.getContext("webgl2", m2), !this._gl)
            throw new Error("WebGL2 not supported " + this._gl);
          this.register((0, s16.addDisposableDomListener)(this._canvas, "webglcontextlost", (e4) => {
            console.log("webglcontextlost event received"), e4.preventDefault(), this._contextRestorationTimeout = setTimeout(() => {
              this._contextRestorationTimeout = undefined, console.warn("webgl context not restored; firing onContextLoss"), this._onContextLoss.fire(e4);
            }, 3000);
          })), this.register((0, s16.addDisposableDomListener)(this._canvas, "webglcontextrestored", (e4) => {
            console.warn("webglcontextrestored event received"), clearTimeout(this._contextRestorationTimeout), this._contextRestorationTimeout = undefined, (0, o.removeTerminalFromCache)(this._terminal), this._initializeWebGLState(), this._requestRedrawViewport();
          })), this._observerDisposable.value = (0, a.observeDevicePixelDimensions)(this._canvas, this._coreBrowserService.window, (e4, t4) => this._setCanvasDevicePixelDimensions(e4, t4)), this.register(this._coreBrowserService.onWindowChange((e4) => {
            this._observerDisposable.value = (0, a.observeDevicePixelDimensions)(this._canvas, e4, (e5, t4) => this._setCanvasDevicePixelDimensions(e5, t4));
          })), this._core.screenElement.appendChild(this._canvas), [this._rectangleRenderer.value, this._glyphRenderer.value] = this._initializeWebGLState(), this._isAttached = this._coreBrowserService.window.document.body.contains(this._core.screenElement), this.register((0, c.toDisposable)(() => {
            for (const e4 of this._renderLayers)
              e4.dispose();
            this._canvas.parentElement?.removeChild(this._canvas), (0, o.removeTerminalFromCache)(this._terminal);
          }));
        }
        get textureAtlas() {
          return this._charAtlas?.pages[0].canvas;
        }
        _handleColorChange() {
          this._refreshCharAtlas(), this._clearModel(true);
        }
        handleDevicePixelRatioChange() {
          this._devicePixelRatio !== this._coreBrowserService.dpr && (this._devicePixelRatio = this._coreBrowserService.dpr, this.handleResize(this._terminal.cols, this._terminal.rows));
        }
        handleResize(e3, t3) {
          this._updateDimensions(), this._model.resize(this._terminal.cols, this._terminal.rows);
          for (const e4 of this._renderLayers)
            e4.resize(this._terminal, this.dimensions);
          this._canvas.width = this.dimensions.device.canvas.width, this._canvas.height = this.dimensions.device.canvas.height, this._canvas.style.width = `${this.dimensions.css.canvas.width}px`, this._canvas.style.height = `${this.dimensions.css.canvas.height}px`, this._core.screenElement.style.width = `${this.dimensions.css.canvas.width}px`, this._core.screenElement.style.height = `${this.dimensions.css.canvas.height}px`, this._rectangleRenderer.value?.setDimensions(this.dimensions), this._rectangleRenderer.value?.handleResize(), this._glyphRenderer.value?.setDimensions(this.dimensions), this._glyphRenderer.value?.handleResize(), this._refreshCharAtlas(), this._clearModel(false);
        }
        handleCharSizeChanged() {
          this.handleResize(this._terminal.cols, this._terminal.rows);
        }
        handleBlur() {
          for (const e3 of this._renderLayers)
            e3.handleBlur(this._terminal);
          this._cursorBlinkStateManager.value?.pause(), this._requestRedrawViewport();
        }
        handleFocus() {
          for (const e3 of this._renderLayers)
            e3.handleFocus(this._terminal);
          this._cursorBlinkStateManager.value?.resume(), this._requestRedrawViewport();
        }
        handleSelectionChanged(e3, t3, i3) {
          for (const s17 of this._renderLayers)
            s17.handleSelectionChanged(this._terminal, e3, t3, i3);
          this._model.selection.update(this._core, e3, t3, i3), this._requestRedrawViewport();
        }
        handleCursorMove() {
          for (const e3 of this._renderLayers)
            e3.handleCursorMove(this._terminal);
          this._cursorBlinkStateManager.value?.restartBlinkAnimation();
        }
        _handleOptionsChanged() {
          this._updateDimensions(), this._refreshCharAtlas(), this._updateCursorBlink();
        }
        _initializeWebGLState() {
          return this._rectangleRenderer.value = new v2.RectangleRenderer(this._terminal, this._gl, this.dimensions, this._themeService), this._glyphRenderer.value = new g.GlyphRenderer(this._terminal, this._gl, this.dimensions, this._optionsService), this.handleCharSizeChanged(), [this._rectangleRenderer.value, this._glyphRenderer.value];
        }
        _refreshCharAtlas() {
          if (this.dimensions.device.char.width <= 0 && this.dimensions.device.char.height <= 0)
            return void (this._isAttached = false);
          const e3 = (0, o.acquireTextureAtlas)(this._terminal, this._optionsService.rawOptions, this._themeService.colors, this.dimensions.device.cell.width, this.dimensions.device.cell.height, this.dimensions.device.char.width, this.dimensions.device.char.height, this._coreBrowserService.dpr);
          this._charAtlas !== e3 && (this._onChangeTextureAtlas.fire(e3.pages[0].canvas), this._charAtlasDisposable.value = (0, c.getDisposeArrayDisposable)([(0, l.forwardEvent)(e3.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas), (0, l.forwardEvent)(e3.onRemoveTextureAtlasCanvas, this._onRemoveTextureAtlasCanvas)])), this._charAtlas = e3, this._charAtlas.warmUp(), this._glyphRenderer.value?.setAtlas(this._charAtlas);
        }
        _clearModel(e3) {
          this._model.clear(), e3 && this._glyphRenderer.value?.clear();
        }
        clearTextureAtlas() {
          this._charAtlas?.clearTexture(), this._clearModel(true), this._requestRedrawViewport();
        }
        clear() {
          this._clearModel(true);
          for (const e3 of this._renderLayers)
            e3.reset(this._terminal);
          this._cursorBlinkStateManager.value?.restartBlinkAnimation(), this._updateCursorBlink();
        }
        registerCharacterJoiner(e3) {
          return -1;
        }
        deregisterCharacterJoiner(e3) {
          return false;
        }
        renderRows(e3, t3) {
          if (!this._isAttached) {
            if (!(this._coreBrowserService.window.document.body.contains(this._core.screenElement) && this._charSizeService.width && this._charSizeService.height))
              return;
            this._updateDimensions(), this._refreshCharAtlas(), this._isAttached = true;
          }
          for (const i3 of this._renderLayers)
            i3.handleGridChanged(this._terminal, e3, t3);
          this._glyphRenderer.value && this._rectangleRenderer.value && (this._glyphRenderer.value.beginFrame() ? (this._clearModel(true), this._updateModel(0, this._terminal.rows - 1)) : this._updateModel(e3, t3), this._rectangleRenderer.value.renderBackgrounds(), this._glyphRenderer.value.render(this._model), this._cursorBlinkStateManager.value && !this._cursorBlinkStateManager.value.isCursorVisible || this._rectangleRenderer.value.renderCursor());
        }
        _updateCursorBlink() {
          this._terminal.options.cursorBlink ? this._cursorBlinkStateManager.value = new n.CursorBlinkStateManager(() => {
            this._requestRedrawCursor();
          }, this._coreBrowserService) : this._cursorBlinkStateManager.clear(), this._requestRedrawCursor();
        }
        _updateModel(e3, t3) {
          const i3 = this._core;
          let s17, r2, o2, n2, a2, h2, l2, c2, d2, _2, g2, v3, p2, C3, x = this._workCell;
          e3 = L2(e3, i3.rows - 1, 0), t3 = L2(t3, i3.rows - 1, 0);
          const w = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY, b2 = w - i3.buffer.ydisp, M2 = Math.min(this._terminal.buffer.active.cursorX, i3.cols - 1);
          let R = -1;
          const y = this._coreService.isCursorInitialized && !this._coreService.isCursorHidden && (!this._cursorBlinkStateManager.value || this._cursorBlinkStateManager.value.isCursorVisible);
          this._model.cursor = undefined;
          let A = false;
          for (r2 = e3;r2 <= t3; r2++)
            for (o2 = r2 + i3.buffer.ydisp, n2 = i3.buffer.lines.get(o2), this._model.lineLengths[r2] = 0, a2 = this._characterJoinerService.getJoinedCharacters(o2), p2 = 0;p2 < i3.cols; p2++)
              if (s17 = this._cellColorResolver.result.bg, n2.loadCell(p2, x), p2 === 0 && (s17 = this._cellColorResolver.result.bg), h2 = false, l2 = p2, a2.length > 0 && p2 === a2[0][0] && (h2 = true, c2 = a2.shift(), x = new m(x, n2.translateToString(true, c2[0], c2[1]), c2[1] - c2[0]), l2 = c2[1] - 1), d2 = x.getChars(), _2 = x.getCode(), v3 = (r2 * i3.cols + p2) * f.RENDER_MODEL_INDICIES_PER_CELL, this._cellColorResolver.resolve(x, p2, o2, this.dimensions.device.cell.width), y && o2 === w && (p2 === M2 && (this._model.cursor = { x: M2, y: b2, width: x.getWidth(), style: this._coreBrowserService.isFocused ? i3.options.cursorStyle || "block" : i3.options.cursorInactiveStyle, cursorWidth: i3.options.cursorWidth, dpr: this._devicePixelRatio }, R = M2 + x.getWidth() - 1), p2 >= M2 && p2 <= R && (this._coreBrowserService.isFocused && (i3.options.cursorStyle || "block") === "block" || this._coreBrowserService.isFocused === false && i3.options.cursorInactiveStyle === "block") && (this._cellColorResolver.result.fg = 50331648 | this._themeService.colors.cursorAccent.rgba >> 8 & 16777215, this._cellColorResolver.result.bg = 50331648 | this._themeService.colors.cursor.rgba >> 8 & 16777215)), _2 !== u.NULL_CELL_CODE && (this._model.lineLengths[r2] = p2 + 1), (this._model.cells[v3] !== _2 || this._model.cells[v3 + f.RENDER_MODEL_BG_OFFSET] !== this._cellColorResolver.result.bg || this._model.cells[v3 + f.RENDER_MODEL_FG_OFFSET] !== this._cellColorResolver.result.fg || this._model.cells[v3 + f.RENDER_MODEL_EXT_OFFSET] !== this._cellColorResolver.result.ext) && (A = true, d2.length > 1 && (_2 |= f.COMBINED_CHAR_BIT_MASK), this._model.cells[v3] = _2, this._model.cells[v3 + f.RENDER_MODEL_BG_OFFSET] = this._cellColorResolver.result.bg, this._model.cells[v3 + f.RENDER_MODEL_FG_OFFSET] = this._cellColorResolver.result.fg, this._model.cells[v3 + f.RENDER_MODEL_EXT_OFFSET] = this._cellColorResolver.result.ext, g2 = x.getWidth(), this._glyphRenderer.value.updateCell(p2, r2, _2, this._cellColorResolver.result.bg, this._cellColorResolver.result.fg, this._cellColorResolver.result.ext, d2, g2, s17), h2))
                for (x = this._workCell, p2++;p2 < l2; p2++)
                  C3 = (r2 * i3.cols + p2) * f.RENDER_MODEL_INDICIES_PER_CELL, this._glyphRenderer.value.updateCell(p2, r2, u.NULL_CELL_CODE, 0, 0, 0, u.NULL_CELL_CHAR, 0, 0), this._model.cells[C3] = u.NULL_CELL_CODE, this._model.cells[C3 + f.RENDER_MODEL_BG_OFFSET] = this._cellColorResolver.result.bg, this._model.cells[C3 + f.RENDER_MODEL_FG_OFFSET] = this._cellColorResolver.result.fg, this._model.cells[C3 + f.RENDER_MODEL_EXT_OFFSET] = this._cellColorResolver.result.ext;
          A && this._rectangleRenderer.value.updateBackgrounds(this._model), this._rectangleRenderer.value.updateCursor(this._model);
        }
        _updateDimensions() {
          this._charSizeService.width && this._charSizeService.height && (this.dimensions.device.char.width = Math.floor(this._charSizeService.width * this._devicePixelRatio), this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * this._devicePixelRatio), this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight), this.dimensions.device.char.top = this._optionsService.rawOptions.lineHeight === 1 ? 0 : Math.round((this.dimensions.device.cell.height - this.dimensions.device.char.height) / 2), this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing), this.dimensions.device.char.left = Math.floor(this._optionsService.rawOptions.letterSpacing / 2), this.dimensions.device.canvas.height = this._terminal.rows * this.dimensions.device.cell.height, this.dimensions.device.canvas.width = this._terminal.cols * this.dimensions.device.cell.width, this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / this._devicePixelRatio), this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / this._devicePixelRatio), this.dimensions.css.cell.height = this.dimensions.device.cell.height / this._devicePixelRatio, this.dimensions.css.cell.width = this.dimensions.device.cell.width / this._devicePixelRatio);
        }
        _setCanvasDevicePixelDimensions(e3, t3) {
          this._canvas.width === e3 && this._canvas.height === t3 || (this._canvas.width = e3, this._canvas.height = t3, this._requestRedrawViewport());
        }
        _requestRedrawViewport() {
          this._onRequestRedraw.fire({ start: 0, end: this._terminal.rows - 1 });
        }
        _requestRedrawCursor() {
          const e3 = this._terminal.buffer.active.cursorY;
          this._onRequestRedraw.fire({ start: e3, end: e3 });
        }
      }
      t2.WebglRenderer = C2;

      class m extends d.AttributeData {
        constructor(e3, t3, i3) {
          super(), this.content = 0, this.combinedData = "", this.fg = e3.fg, this.bg = e3.bg, this.combinedData = t3, this._width = i3;
        }
        isCombined() {
          return 2097152;
        }
        getWidth() {
          return this._width;
        }
        getChars() {
          return this.combinedData;
        }
        getCode() {
          return 2097151;
        }
        setFromCharData(e3) {
          throw new Error("not implemented");
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }
      function L2(e3, t3, i3 = 0) {
        return Math.max(Math.min(e3, t3), i3);
      }
      t2.JoinedCellData = m;
    }, 381: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.GLTexture = t2.expandFloat32Array = t2.createShader = t2.createProgram = t2.PROJECTION_MATRIX = undefined;
      const s16 = i2(374);
      function r(e3, t3, i3) {
        const r2 = (0, s16.throwIfFalsy)(e3.createShader(t3));
        if (e3.shaderSource(r2, i3), e3.compileShader(r2), e3.getShaderParameter(r2, e3.COMPILE_STATUS))
          return r2;
        console.error(e3.getShaderInfoLog(r2)), e3.deleteShader(r2);
      }
      t2.PROJECTION_MATRIX = new Float32Array([2, 0, 0, 0, 0, -2, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1]), t2.createProgram = function(e3, t3, i3) {
        const o = (0, s16.throwIfFalsy)(e3.createProgram());
        if (e3.attachShader(o, (0, s16.throwIfFalsy)(r(e3, e3.VERTEX_SHADER, t3))), e3.attachShader(o, (0, s16.throwIfFalsy)(r(e3, e3.FRAGMENT_SHADER, i3))), e3.linkProgram(o), e3.getProgramParameter(o, e3.LINK_STATUS))
          return o;
        console.error(e3.getProgramInfoLog(o)), e3.deleteProgram(o);
      }, t2.createShader = r, t2.expandFloat32Array = function(e3, t3) {
        const i3 = Math.min(2 * e3.length, t3), s17 = new Float32Array(i3);
        for (let t4 = 0;t4 < e3.length; t4++)
          s17[t4] = e3[t4];
        return s17;
      }, t2.GLTexture = class {
        constructor(e3) {
          this.texture = e3, this.version = -1;
        }
      };
    }, 592: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.BaseRenderLayer = undefined;
      const s16 = i2(627), r = i2(237), o = i2(374), n = i2(859);

      class a extends n.Disposable {
        constructor(e3, t3, i3, s17, r2, o2, a2, h) {
          super(), this._container = t3, this._alpha = r2, this._coreBrowserService = o2, this._optionsService = a2, this._themeService = h, this._deviceCharWidth = 0, this._deviceCharHeight = 0, this._deviceCellWidth = 0, this._deviceCellHeight = 0, this._deviceCharLeft = 0, this._deviceCharTop = 0, this._canvas = this._coreBrowserService.mainDocument.createElement("canvas"), this._canvas.classList.add(`xterm-${i3}-layer`), this._canvas.style.zIndex = s17.toString(), this._initCanvas(), this._container.appendChild(this._canvas), this.register(this._themeService.onChangeColors((t4) => {
            this._refreshCharAtlas(e3, t4), this.reset(e3);
          })), this.register((0, n.toDisposable)(() => {
            this._canvas.remove();
          }));
        }
        _initCanvas() {
          this._ctx = (0, o.throwIfFalsy)(this._canvas.getContext("2d", { alpha: this._alpha })), this._alpha || this._clearAll();
        }
        handleBlur(e3) {}
        handleFocus(e3) {}
        handleCursorMove(e3) {}
        handleGridChanged(e3, t3, i3) {}
        handleSelectionChanged(e3, t3, i3, s17 = false) {}
        _setTransparency(e3, t3) {
          if (t3 === this._alpha)
            return;
          const i3 = this._canvas;
          this._alpha = t3, this._canvas = this._canvas.cloneNode(), this._initCanvas(), this._container.replaceChild(this._canvas, i3), this._refreshCharAtlas(e3, this._themeService.colors), this.handleGridChanged(e3, 0, e3.rows - 1);
        }
        _refreshCharAtlas(e3, t3) {
          this._deviceCharWidth <= 0 && this._deviceCharHeight <= 0 || (this._charAtlas = (0, s16.acquireTextureAtlas)(e3, this._optionsService.rawOptions, t3, this._deviceCellWidth, this._deviceCellHeight, this._deviceCharWidth, this._deviceCharHeight, this._coreBrowserService.dpr), this._charAtlas.warmUp());
        }
        resize(e3, t3) {
          this._deviceCellWidth = t3.device.cell.width, this._deviceCellHeight = t3.device.cell.height, this._deviceCharWidth = t3.device.char.width, this._deviceCharHeight = t3.device.char.height, this._deviceCharLeft = t3.device.char.left, this._deviceCharTop = t3.device.char.top, this._canvas.width = t3.device.canvas.width, this._canvas.height = t3.device.canvas.height, this._canvas.style.width = `${t3.css.canvas.width}px`, this._canvas.style.height = `${t3.css.canvas.height}px`, this._alpha || this._clearAll(), this._refreshCharAtlas(e3, this._themeService.colors);
        }
        _fillBottomLineAtCells(e3, t3, i3 = 1) {
          this._ctx.fillRect(e3 * this._deviceCellWidth, (t3 + 1) * this._deviceCellHeight - this._coreBrowserService.dpr - 1, i3 * this._deviceCellWidth, this._coreBrowserService.dpr);
        }
        _clearAll() {
          this._alpha ? this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height) : (this._ctx.fillStyle = this._themeService.colors.background.css, this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height));
        }
        _clearCells(e3, t3, i3, s17) {
          this._alpha ? this._ctx.clearRect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, i3 * this._deviceCellWidth, s17 * this._deviceCellHeight) : (this._ctx.fillStyle = this._themeService.colors.background.css, this._ctx.fillRect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, i3 * this._deviceCellWidth, s17 * this._deviceCellHeight));
        }
        _fillCharTrueColor(e3, t3, i3, s17) {
          this._ctx.font = this._getFont(e3, false, false), this._ctx.textBaseline = r.TEXT_BASELINE, this._clipCell(i3, s17, t3.getWidth()), this._ctx.fillText(t3.getChars(), i3 * this._deviceCellWidth + this._deviceCharLeft, s17 * this._deviceCellHeight + this._deviceCharTop + this._deviceCharHeight);
        }
        _clipCell(e3, t3, i3) {
          this._ctx.beginPath(), this._ctx.rect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, i3 * this._deviceCellWidth, this._deviceCellHeight), this._ctx.clip();
        }
        _getFont(e3, t3, i3) {
          return `${i3 ? "italic" : ""} ${t3 ? e3.options.fontWeightBold : e3.options.fontWeight} ${e3.options.fontSize * this._coreBrowserService.dpr}px ${e3.options.fontFamily}`;
        }
      }
      t2.BaseRenderLayer = a;
    }, 733: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.LinkRenderLayer = undefined;
      const s16 = i2(197), r = i2(237), o = i2(592);

      class n extends o.BaseRenderLayer {
        constructor(e3, t3, i3, s17, r2, o2, n2) {
          super(i3, e3, "link", t3, true, r2, o2, n2), this.register(s17.onShowLinkUnderline((e4) => this._handleShowLinkUnderline(e4))), this.register(s17.onHideLinkUnderline((e4) => this._handleHideLinkUnderline(e4)));
        }
        resize(e3, t3) {
          super.resize(e3, t3), this._state = undefined;
        }
        reset(e3) {
          this._clearCurrentLink();
        }
        _clearCurrentLink() {
          if (this._state) {
            this._clearCells(this._state.x1, this._state.y1, this._state.cols - this._state.x1, 1);
            const e3 = this._state.y2 - this._state.y1 - 1;
            e3 > 0 && this._clearCells(0, this._state.y1 + 1, this._state.cols, e3), this._clearCells(0, this._state.y2, this._state.x2, 1), this._state = undefined;
          }
        }
        _handleShowLinkUnderline(e3) {
          if (e3.fg === r.INVERTED_DEFAULT_COLOR ? this._ctx.fillStyle = this._themeService.colors.background.css : e3.fg !== undefined && (0, s16.is256Color)(e3.fg) ? this._ctx.fillStyle = this._themeService.colors.ansi[e3.fg].css : this._ctx.fillStyle = this._themeService.colors.foreground.css, e3.y1 === e3.y2)
            this._fillBottomLineAtCells(e3.x1, e3.y1, e3.x2 - e3.x1);
          else {
            this._fillBottomLineAtCells(e3.x1, e3.y1, e3.cols - e3.x1);
            for (let t3 = e3.y1 + 1;t3 < e3.y2; t3++)
              this._fillBottomLineAtCells(0, t3, e3.cols);
            this._fillBottomLineAtCells(0, e3.y2, e3.x2);
          }
          this._state = e3;
        }
        _handleHideLinkUnderline(e3) {
          this._clearCurrentLink();
        }
      }
      t2.LinkRenderLayer = n;
    }, 820: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.addDisposableDomListener = undefined, t2.addDisposableDomListener = function(e3, t3, i2, s16) {
        e3.addEventListener(t3, i2, s16);
        let r = false;
        return { dispose: () => {
          r || (r = true, e3.removeEventListener(t3, i2, s16));
        } };
      };
    }, 274: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.CellColorResolver = undefined;
      const s16 = i2(855), r = i2(160), o = i2(374);
      let n, a = 0, h = 0, l = false, c = false, d = false, _ = 0;
      t2.CellColorResolver = class {
        constructor(e3, t3, i3, s17, r2, o2) {
          this._terminal = e3, this._optionService = t3, this._selectionRenderModel = i3, this._decorationService = s17, this._coreBrowserService = r2, this._themeService = o2, this.result = { fg: 0, bg: 0, ext: 0 };
        }
        resolve(e3, t3, i3, u) {
          if (this.result.bg = e3.bg, this.result.fg = e3.fg, this.result.ext = 268435456 & e3.bg ? e3.extended.ext : 0, h = 0, a = 0, c = false, l = false, d = false, n = this._themeService.colors, _ = 0, e3.getCode() !== s16.NULL_CELL_CODE && e3.extended.underlineStyle === 4) {
            const e4 = Math.max(1, Math.floor(this._optionService.rawOptions.fontSize * this._coreBrowserService.dpr / 15));
            _ = t3 * u % (2 * Math.round(e4));
          }
          if (this._decorationService.forEachDecorationAtCell(t3, i3, "bottom", (e4) => {
            e4.backgroundColorRGB && (h = e4.backgroundColorRGB.rgba >> 8 & 16777215, c = true), e4.foregroundColorRGB && (a = e4.foregroundColorRGB.rgba >> 8 & 16777215, l = true);
          }), d = this._selectionRenderModel.isCellSelected(this._terminal, t3, i3), d) {
            if (67108864 & this.result.fg || (50331648 & this.result.bg) != 0) {
              if (67108864 & this.result.fg)
                switch (50331648 & this.result.fg) {
                  case 16777216:
                  case 33554432:
                    h = this._themeService.colors.ansi[255 & this.result.fg].rgba;
                    break;
                  case 50331648:
                    h = (16777215 & this.result.fg) << 8 | 255;
                    break;
                  default:
                    h = this._themeService.colors.foreground.rgba;
                }
              else
                switch (50331648 & this.result.bg) {
                  case 16777216:
                  case 33554432:
                    h = this._themeService.colors.ansi[255 & this.result.bg].rgba;
                    break;
                  case 50331648:
                    h = (16777215 & this.result.bg) << 8 | 255;
                }
              h = r.rgba.blend(h, 4294967040 & (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba | 128) >> 8 & 16777215;
            } else
              h = (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba >> 8 & 16777215;
            if (c = true, n.selectionForeground && (a = n.selectionForeground.rgba >> 8 & 16777215, l = true), (0, o.treatGlyphAsBackgroundColor)(e3.getCode())) {
              if (67108864 & this.result.fg && (50331648 & this.result.bg) == 0)
                a = (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba >> 8 & 16777215;
              else {
                if (67108864 & this.result.fg)
                  switch (50331648 & this.result.bg) {
                    case 16777216:
                    case 33554432:
                      a = this._themeService.colors.ansi[255 & this.result.bg].rgba;
                      break;
                    case 50331648:
                      a = (16777215 & this.result.bg) << 8 | 255;
                  }
                else
                  switch (50331648 & this.result.fg) {
                    case 16777216:
                    case 33554432:
                      a = this._themeService.colors.ansi[255 & this.result.fg].rgba;
                      break;
                    case 50331648:
                      a = (16777215 & this.result.fg) << 8 | 255;
                      break;
                    default:
                      a = this._themeService.colors.foreground.rgba;
                  }
                a = r.rgba.blend(a, 4294967040 & (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba | 128) >> 8 & 16777215;
              }
              l = true;
            }
          }
          this._decorationService.forEachDecorationAtCell(t3, i3, "top", (e4) => {
            e4.backgroundColorRGB && (h = e4.backgroundColorRGB.rgba >> 8 & 16777215, c = true), e4.foregroundColorRGB && (a = e4.foregroundColorRGB.rgba >> 8 & 16777215, l = true);
          }), c && (h = d ? -16777216 & e3.bg & -134217729 | h | 50331648 : -16777216 & e3.bg | h | 50331648), l && (a = -16777216 & e3.fg & -67108865 | a | 50331648), 67108864 & this.result.fg && (c && !l && (a = (50331648 & this.result.bg) == 0 ? -134217728 & this.result.fg | 16777215 & n.background.rgba >> 8 | 50331648 : -134217728 & this.result.fg | 67108863 & this.result.bg, l = true), !c && l && (h = (50331648 & this.result.fg) == 0 ? -67108864 & this.result.bg | 16777215 & n.foreground.rgba >> 8 | 50331648 : -67108864 & this.result.bg | 67108863 & this.result.fg, c = true)), n = undefined, this.result.bg = c ? h : this.result.bg, this.result.fg = l ? a : this.result.fg, this.result.ext &= 536870911, this.result.ext |= _ << 29 & 3758096384;
        }
      };
    }, 627: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.removeTerminalFromCache = t2.acquireTextureAtlas = undefined;
      const s16 = i2(509), r = i2(197), o = [];
      t2.acquireTextureAtlas = function(e3, t3, i3, n, a, h, l, c) {
        const d = (0, r.generateConfig)(n, a, h, l, t3, i3, c);
        for (let t4 = 0;t4 < o.length; t4++) {
          const i4 = o[t4], s17 = i4.ownedBy.indexOf(e3);
          if (s17 >= 0) {
            if ((0, r.configEquals)(i4.config, d))
              return i4.atlas;
            i4.ownedBy.length === 1 ? (i4.atlas.dispose(), o.splice(t4, 1)) : i4.ownedBy.splice(s17, 1);
            break;
          }
        }
        for (let t4 = 0;t4 < o.length; t4++) {
          const i4 = o[t4];
          if ((0, r.configEquals)(i4.config, d))
            return i4.ownedBy.push(e3), i4.atlas;
        }
        const _ = e3._core, u = { atlas: new s16.TextureAtlas(document, d, _.unicodeService), config: d, ownedBy: [e3] };
        return o.push(u), u.atlas;
      }, t2.removeTerminalFromCache = function(e3) {
        for (let t3 = 0;t3 < o.length; t3++) {
          const i3 = o[t3].ownedBy.indexOf(e3);
          if (i3 !== -1) {
            o[t3].ownedBy.length === 1 ? (o[t3].atlas.dispose(), o.splice(t3, 1)) : o[t3].ownedBy.splice(i3, 1);
            break;
          }
        }
      };
    }, 197: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.is256Color = t2.configEquals = t2.generateConfig = undefined;
      const s16 = i2(160);
      t2.generateConfig = function(e3, t3, i3, r, o, n, a) {
        const h = { foreground: n.foreground, background: n.background, cursor: s16.NULL_COLOR, cursorAccent: s16.NULL_COLOR, selectionForeground: s16.NULL_COLOR, selectionBackgroundTransparent: s16.NULL_COLOR, selectionBackgroundOpaque: s16.NULL_COLOR, selectionInactiveBackgroundTransparent: s16.NULL_COLOR, selectionInactiveBackgroundOpaque: s16.NULL_COLOR, ansi: n.ansi.slice(), contrastCache: n.contrastCache, halfContrastCache: n.halfContrastCache };
        return { customGlyphs: o.customGlyphs, devicePixelRatio: a, letterSpacing: o.letterSpacing, lineHeight: o.lineHeight, deviceCellWidth: e3, deviceCellHeight: t3, deviceCharWidth: i3, deviceCharHeight: r, fontFamily: o.fontFamily, fontSize: o.fontSize, fontWeight: o.fontWeight, fontWeightBold: o.fontWeightBold, allowTransparency: o.allowTransparency, drawBoldTextInBrightColors: o.drawBoldTextInBrightColors, minimumContrastRatio: o.minimumContrastRatio, colors: h };
      }, t2.configEquals = function(e3, t3) {
        for (let i3 = 0;i3 < e3.colors.ansi.length; i3++)
          if (e3.colors.ansi[i3].rgba !== t3.colors.ansi[i3].rgba)
            return false;
        return e3.devicePixelRatio === t3.devicePixelRatio && e3.customGlyphs === t3.customGlyphs && e3.lineHeight === t3.lineHeight && e3.letterSpacing === t3.letterSpacing && e3.fontFamily === t3.fontFamily && e3.fontSize === t3.fontSize && e3.fontWeight === t3.fontWeight && e3.fontWeightBold === t3.fontWeightBold && e3.allowTransparency === t3.allowTransparency && e3.deviceCharWidth === t3.deviceCharWidth && e3.deviceCharHeight === t3.deviceCharHeight && e3.drawBoldTextInBrightColors === t3.drawBoldTextInBrightColors && e3.minimumContrastRatio === t3.minimumContrastRatio && e3.colors.foreground.rgba === t3.colors.foreground.rgba && e3.colors.background.rgba === t3.colors.background.rgba;
      }, t2.is256Color = function(e3) {
        return (50331648 & e3) == 16777216 || (50331648 & e3) == 33554432;
      };
    }, 237: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.TEXT_BASELINE = t2.DIM_OPACITY = t2.INVERTED_DEFAULT_COLOR = undefined;
      const s16 = i2(399);
      t2.INVERTED_DEFAULT_COLOR = 257, t2.DIM_OPACITY = 0.5, t2.TEXT_BASELINE = s16.isFirefox || s16.isLegacyEdge ? "bottom" : "ideographic";
    }, 457: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.CursorBlinkStateManager = undefined;
      t2.CursorBlinkStateManager = class {
        constructor(e3, t3) {
          this._renderCallback = e3, this._coreBrowserService = t3, this.isCursorVisible = true, this._coreBrowserService.isFocused && this._restartInterval();
        }
        get isPaused() {
          return !(this._blinkStartTimeout || this._blinkInterval);
        }
        dispose() {
          this._blinkInterval && (this._coreBrowserService.window.clearInterval(this._blinkInterval), this._blinkInterval = undefined), this._blinkStartTimeout && (this._coreBrowserService.window.clearTimeout(this._blinkStartTimeout), this._blinkStartTimeout = undefined), this._animationFrame && (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), this._animationFrame = undefined);
        }
        restartBlinkAnimation() {
          this.isPaused || (this._animationTimeRestarted = Date.now(), this.isCursorVisible = true, this._animationFrame || (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
            this._renderCallback(), this._animationFrame = undefined;
          })));
        }
        _restartInterval(e3 = 600) {
          this._blinkInterval && (this._coreBrowserService.window.clearInterval(this._blinkInterval), this._blinkInterval = undefined), this._blinkStartTimeout = this._coreBrowserService.window.setTimeout(() => {
            if (this._animationTimeRestarted) {
              const e4 = 600 - (Date.now() - this._animationTimeRestarted);
              if (this._animationTimeRestarted = undefined, e4 > 0)
                return void this._restartInterval(e4);
            }
            this.isCursorVisible = false, this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
              this._renderCallback(), this._animationFrame = undefined;
            }), this._blinkInterval = this._coreBrowserService.window.setInterval(() => {
              if (this._animationTimeRestarted) {
                const e4 = 600 - (Date.now() - this._animationTimeRestarted);
                return this._animationTimeRestarted = undefined, void this._restartInterval(e4);
              }
              this.isCursorVisible = !this.isCursorVisible, this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
                this._renderCallback(), this._animationFrame = undefined;
              });
            }, 600);
          }, e3);
        }
        pause() {
          this.isCursorVisible = true, this._blinkInterval && (this._coreBrowserService.window.clearInterval(this._blinkInterval), this._blinkInterval = undefined), this._blinkStartTimeout && (this._coreBrowserService.window.clearTimeout(this._blinkStartTimeout), this._blinkStartTimeout = undefined), this._animationFrame && (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), this._animationFrame = undefined);
        }
        resume() {
          this.pause(), this._animationTimeRestarted = undefined, this._restartInterval(), this.restartBlinkAnimation();
        }
      };
    }, 860: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.tryDrawCustomChar = t2.powerlineDefinitions = t2.boxDrawingDefinitions = t2.blockElementDefinitions = undefined;
      const s16 = i2(374);
      t2.blockElementDefinitions = { "▀": [{ x: 0, y: 0, w: 8, h: 4 }], "▁": [{ x: 0, y: 7, w: 8, h: 1 }], "▂": [{ x: 0, y: 6, w: 8, h: 2 }], "▃": [{ x: 0, y: 5, w: 8, h: 3 }], "▄": [{ x: 0, y: 4, w: 8, h: 4 }], "▅": [{ x: 0, y: 3, w: 8, h: 5 }], "▆": [{ x: 0, y: 2, w: 8, h: 6 }], "▇": [{ x: 0, y: 1, w: 8, h: 7 }], "█": [{ x: 0, y: 0, w: 8, h: 8 }], "▉": [{ x: 0, y: 0, w: 7, h: 8 }], "▊": [{ x: 0, y: 0, w: 6, h: 8 }], "▋": [{ x: 0, y: 0, w: 5, h: 8 }], "▌": [{ x: 0, y: 0, w: 4, h: 8 }], "▍": [{ x: 0, y: 0, w: 3, h: 8 }], "▎": [{ x: 0, y: 0, w: 2, h: 8 }], "▏": [{ x: 0, y: 0, w: 1, h: 8 }], "▐": [{ x: 4, y: 0, w: 4, h: 8 }], "▔": [{ x: 0, y: 0, w: 8, h: 1 }], "▕": [{ x: 7, y: 0, w: 1, h: 8 }], "▖": [{ x: 0, y: 4, w: 4, h: 4 }], "▗": [{ x: 4, y: 4, w: 4, h: 4 }], "▘": [{ x: 0, y: 0, w: 4, h: 4 }], "▙": [{ x: 0, y: 0, w: 4, h: 8 }, { x: 0, y: 4, w: 8, h: 4 }], "▚": [{ x: 0, y: 0, w: 4, h: 4 }, { x: 4, y: 4, w: 4, h: 4 }], "▛": [{ x: 0, y: 0, w: 4, h: 8 }, { x: 4, y: 0, w: 4, h: 4 }], "▜": [{ x: 0, y: 0, w: 8, h: 4 }, { x: 4, y: 0, w: 4, h: 8 }], "▝": [{ x: 4, y: 0, w: 4, h: 4 }], "▞": [{ x: 4, y: 0, w: 4, h: 4 }, { x: 0, y: 4, w: 4, h: 4 }], "▟": [{ x: 4, y: 0, w: 4, h: 8 }, { x: 0, y: 4, w: 8, h: 4 }], "\uD83E\uDF70": [{ x: 1, y: 0, w: 1, h: 8 }], "\uD83E\uDF71": [{ x: 2, y: 0, w: 1, h: 8 }], "\uD83E\uDF72": [{ x: 3, y: 0, w: 1, h: 8 }], "\uD83E\uDF73": [{ x: 4, y: 0, w: 1, h: 8 }], "\uD83E\uDF74": [{ x: 5, y: 0, w: 1, h: 8 }], "\uD83E\uDF75": [{ x: 6, y: 0, w: 1, h: 8 }], "\uD83E\uDF76": [{ x: 0, y: 1, w: 8, h: 1 }], "\uD83E\uDF77": [{ x: 0, y: 2, w: 8, h: 1 }], "\uD83E\uDF78": [{ x: 0, y: 3, w: 8, h: 1 }], "\uD83E\uDF79": [{ x: 0, y: 4, w: 8, h: 1 }], "\uD83E\uDF7A": [{ x: 0, y: 5, w: 8, h: 1 }], "\uD83E\uDF7B": [{ x: 0, y: 6, w: 8, h: 1 }], "\uD83E\uDF7C": [{ x: 0, y: 0, w: 1, h: 8 }, { x: 0, y: 7, w: 8, h: 1 }], "\uD83E\uDF7D": [{ x: 0, y: 0, w: 1, h: 8 }, { x: 0, y: 0, w: 8, h: 1 }], "\uD83E\uDF7E": [{ x: 7, y: 0, w: 1, h: 8 }, { x: 0, y: 0, w: 8, h: 1 }], "\uD83E\uDF7F": [{ x: 7, y: 0, w: 1, h: 8 }, { x: 0, y: 7, w: 8, h: 1 }], "\uD83E\uDF80": [{ x: 0, y: 0, w: 8, h: 1 }, { x: 0, y: 7, w: 8, h: 1 }], "\uD83E\uDF81": [{ x: 0, y: 0, w: 8, h: 1 }, { x: 0, y: 2, w: 8, h: 1 }, { x: 0, y: 4, w: 8, h: 1 }, { x: 0, y: 7, w: 8, h: 1 }], "\uD83E\uDF82": [{ x: 0, y: 0, w: 8, h: 2 }], "\uD83E\uDF83": [{ x: 0, y: 0, w: 8, h: 3 }], "\uD83E\uDF84": [{ x: 0, y: 0, w: 8, h: 5 }], "\uD83E\uDF85": [{ x: 0, y: 0, w: 8, h: 6 }], "\uD83E\uDF86": [{ x: 0, y: 0, w: 8, h: 7 }], "\uD83E\uDF87": [{ x: 6, y: 0, w: 2, h: 8 }], "\uD83E\uDF88": [{ x: 5, y: 0, w: 3, h: 8 }], "\uD83E\uDF89": [{ x: 3, y: 0, w: 5, h: 8 }], "\uD83E\uDF8A": [{ x: 2, y: 0, w: 6, h: 8 }], "\uD83E\uDF8B": [{ x: 1, y: 0, w: 7, h: 8 }], "\uD83E\uDF95": [{ x: 0, y: 0, w: 2, h: 2 }, { x: 4, y: 0, w: 2, h: 2 }, { x: 2, y: 2, w: 2, h: 2 }, { x: 6, y: 2, w: 2, h: 2 }, { x: 0, y: 4, w: 2, h: 2 }, { x: 4, y: 4, w: 2, h: 2 }, { x: 2, y: 6, w: 2, h: 2 }, { x: 6, y: 6, w: 2, h: 2 }], "\uD83E\uDF96": [{ x: 2, y: 0, w: 2, h: 2 }, { x: 6, y: 0, w: 2, h: 2 }, { x: 0, y: 2, w: 2, h: 2 }, { x: 4, y: 2, w: 2, h: 2 }, { x: 2, y: 4, w: 2, h: 2 }, { x: 6, y: 4, w: 2, h: 2 }, { x: 0, y: 6, w: 2, h: 2 }, { x: 4, y: 6, w: 2, h: 2 }], "\uD83E\uDF97": [{ x: 0, y: 2, w: 8, h: 2 }, { x: 0, y: 6, w: 8, h: 2 }] };
      const r = { "░": [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0]], "▒": [[1, 0], [0, 0], [0, 1], [0, 0]], "▓": [[0, 1], [1, 1], [1, 0], [1, 1]] };
      t2.boxDrawingDefinitions = { "─": { 1: "M0,.5 L1,.5" }, "━": { 3: "M0,.5 L1,.5" }, "│": { 1: "M.5,0 L.5,1" }, "┃": { 3: "M.5,0 L.5,1" }, "┌": { 1: "M0.5,1 L.5,.5 L1,.5" }, "┏": { 3: "M0.5,1 L.5,.5 L1,.5" }, "┐": { 1: "M0,.5 L.5,.5 L.5,1" }, "┓": { 3: "M0,.5 L.5,.5 L.5,1" }, "└": { 1: "M.5,0 L.5,.5 L1,.5" }, "┗": { 3: "M.5,0 L.5,.5 L1,.5" }, "┘": { 1: "M.5,0 L.5,.5 L0,.5" }, "┛": { 3: "M.5,0 L.5,.5 L0,.5" }, "├": { 1: "M.5,0 L.5,1 M.5,.5 L1,.5" }, "┣": { 3: "M.5,0 L.5,1 M.5,.5 L1,.5" }, "┤": { 1: "M.5,0 L.5,1 M.5,.5 L0,.5" }, "┫": { 3: "M.5,0 L.5,1 M.5,.5 L0,.5" }, "┬": { 1: "M0,.5 L1,.5 M.5,.5 L.5,1" }, "┳": { 3: "M0,.5 L1,.5 M.5,.5 L.5,1" }, "┴": { 1: "M0,.5 L1,.5 M.5,.5 L.5,0" }, "┻": { 3: "M0,.5 L1,.5 M.5,.5 L.5,0" }, "┼": { 1: "M0,.5 L1,.5 M.5,0 L.5,1" }, "╋": { 3: "M0,.5 L1,.5 M.5,0 L.5,1" }, "╴": { 1: "M.5,.5 L0,.5" }, "╸": { 3: "M.5,.5 L0,.5" }, "╵": { 1: "M.5,.5 L.5,0" }, "╹": { 3: "M.5,.5 L.5,0" }, "╶": { 1: "M.5,.5 L1,.5" }, "╺": { 3: "M.5,.5 L1,.5" }, "╷": { 1: "M.5,.5 L.5,1" }, "╻": { 3: "M.5,.5 L.5,1" }, "═": { 1: (e3, t3) => `M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3}` }, "║": { 1: (e3, t3) => `M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1` }, "╒": { 1: (e3, t3) => `M.5,1 L.5,${0.5 - t3} L1,${0.5 - t3} M.5,${0.5 + t3} L1,${0.5 + t3}` }, "╓": { 1: (e3, t3) => `M${0.5 - e3},1 L${0.5 - e3},.5 L1,.5 M${0.5 + e3},.5 L${0.5 + e3},1` }, "╔": { 1: (e3, t3) => `M1,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1` }, "╕": { 1: (e3, t3) => `M0,${0.5 - t3} L.5,${0.5 - t3} L.5,1 M0,${0.5 + t3} L.5,${0.5 + t3}` }, "╖": { 1: (e3, t3) => `M${0.5 + e3},1 L${0.5 + e3},.5 L0,.5 M${0.5 - e3},.5 L${0.5 - e3},1` }, "╗": { 1: (e3, t3) => `M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M0,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},1` }, "╘": { 1: (e3, t3) => `M.5,0 L.5,${0.5 + t3} L1,${0.5 + t3} M.5,${0.5 - t3} L1,${0.5 - t3}` }, "╙": { 1: (e3, t3) => `M1,.5 L${0.5 - e3},.5 L${0.5 - e3},0 M${0.5 + e3},.5 L${0.5 + e3},0` }, "╚": { 1: (e3, t3) => `M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0 M1,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},0` }, "╛": { 1: (e3, t3) => `M0,${0.5 + t3} L.5,${0.5 + t3} L.5,0 M0,${0.5 - t3} L.5,${0.5 - t3}` }, "╜": { 1: (e3, t3) => `M0,.5 L${0.5 + e3},.5 L${0.5 + e3},0 M${0.5 - e3},.5 L${0.5 - e3},0` }, "╝": { 1: (e3, t3) => `M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0 M0,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},0` }, "╞": { 1: (e3, t3) => `M.5,0 L.5,1 M.5,${0.5 - t3} L1,${0.5 - t3} M.5,${0.5 + t3} L1,${0.5 + t3}` }, "╟": { 1: (e3, t3) => `M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1 M${0.5 + e3},.5 L1,.5` }, "╠": { 1: (e3, t3) => `M${0.5 - e3},0 L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1 M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0` }, "╡": { 1: (e3, t3) => `M.5,0 L.5,1 M0,${0.5 - t3} L.5,${0.5 - t3} M0,${0.5 + t3} L.5,${0.5 + t3}` }, "╢": { 1: (e3, t3) => `M0,.5 L${0.5 - e3},.5 M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1` }, "╣": { 1: (e3, t3) => `M${0.5 + e3},0 L${0.5 + e3},1 M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0` }, "╤": { 1: (e3, t3) => `M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3} M.5,${0.5 + t3} L.5,1` }, "╥": { 1: (e3, t3) => `M0,.5 L1,.5 M${0.5 - e3},.5 L${0.5 - e3},1 M${0.5 + e3},.5 L${0.5 + e3},1` }, "╦": { 1: (e3, t3) => `M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1` }, "╧": { 1: (e3, t3) => `M.5,0 L.5,${0.5 - t3} M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3}` }, "╨": { 1: (e3, t3) => `M0,.5 L1,.5 M${0.5 - e3},.5 L${0.5 - e3},0 M${0.5 + e3},.5 L${0.5 + e3},0` }, "╩": { 1: (e3, t3) => `M0,${0.5 + t3} L1,${0.5 + t3} M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0 M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0` }, "╪": { 1: (e3, t3) => `M.5,0 L.5,1 M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3}` }, "╫": { 1: (e3, t3) => `M0,.5 L1,.5 M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1` }, "╬": { 1: (e3, t3) => `M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1 M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0 M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0` }, "╱": { 1: "M1,0 L0,1" }, "╲": { 1: "M0,0 L1,1" }, "╳": { 1: "M1,0 L0,1 M0,0 L1,1" }, "╼": { 1: "M.5,.5 L0,.5", 3: "M.5,.5 L1,.5" }, "╽": { 1: "M.5,.5 L.5,0", 3: "M.5,.5 L.5,1" }, "╾": { 1: "M.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "╿": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L.5,0" }, "┍": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L1,.5" }, "┎": { 1: "M.5,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "┑": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L0,.5" }, "┒": { 1: "M.5,.5 L0,.5", 3: "M.5,.5 L.5,1" }, "┕": { 1: "M.5,.5 L.5,0", 3: "M.5,.5 L1,.5" }, "┖": { 1: "M.5,.5 L1,.5", 3: "M.5,.5 L.5,0" }, "┙": { 1: "M.5,.5 L.5,0", 3: "M.5,.5 L0,.5" }, "┚": { 1: "M.5,.5 L0,.5", 3: "M.5,.5 L.5,0" }, "┝": { 1: "M.5,0 L.5,1", 3: "M.5,.5 L1,.5" }, "┞": { 1: "M0.5,1 L.5,.5 L1,.5", 3: "M.5,.5 L.5,0" }, "┟": { 1: "M.5,0 L.5,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "┠": { 1: "M.5,.5 L1,.5", 3: "M.5,0 L.5,1" }, "┡": { 1: "M.5,.5 L.5,1", 3: "M.5,0 L.5,.5 L1,.5" }, "┢": { 1: "M.5,.5 L.5,0", 3: "M0.5,1 L.5,.5 L1,.5" }, "┥": { 1: "M.5,0 L.5,1", 3: "M.5,.5 L0,.5" }, "┦": { 1: "M0,.5 L.5,.5 L.5,1", 3: "M.5,.5 L.5,0" }, "┧": { 1: "M.5,0 L.5,.5 L0,.5", 3: "M.5,.5 L.5,1" }, "┨": { 1: "M.5,.5 L0,.5", 3: "M.5,0 L.5,1" }, "┩": { 1: "M.5,.5 L.5,1", 3: "M.5,0 L.5,.5 L0,.5" }, "┪": { 1: "M.5,.5 L.5,0", 3: "M0,.5 L.5,.5 L.5,1" }, "┭": { 1: "M0.5,1 L.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "┮": { 1: "M0,.5 L.5,.5 L.5,1", 3: "M.5,.5 L1,.5" }, "┯": { 1: "M.5,.5 L.5,1", 3: "M0,.5 L1,.5" }, "┰": { 1: "M0,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "┱": { 1: "M.5,.5 L1,.5", 3: "M0,.5 L.5,.5 L.5,1" }, "┲": { 1: "M.5,.5 L0,.5", 3: "M0.5,1 L.5,.5 L1,.5" }, "┵": { 1: "M.5,0 L.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "┶": { 1: "M.5,0 L.5,.5 L0,.5", 3: "M.5,.5 L1,.5" }, "┷": { 1: "M.5,.5 L.5,0", 3: "M0,.5 L1,.5" }, "┸": { 1: "M0,.5 L1,.5", 3: "M.5,.5 L.5,0" }, "┹": { 1: "M.5,.5 L1,.5", 3: "M.5,0 L.5,.5 L0,.5" }, "┺": { 1: "M.5,.5 L0,.5", 3: "M.5,0 L.5,.5 L1,.5" }, "┽": { 1: "M.5,0 L.5,1 M.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "┾": { 1: "M.5,0 L.5,1 M.5,.5 L0,.5", 3: "M.5,.5 L1,.5" }, "┿": { 1: "M.5,0 L.5,1", 3: "M0,.5 L1,.5" }, "╀": { 1: "M0,.5 L1,.5 M.5,.5 L.5,1", 3: "M.5,.5 L.5,0" }, "╁": { 1: "M.5,.5 L.5,0 M0,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "╂": { 1: "M0,.5 L1,.5", 3: "M.5,0 L.5,1" }, "╃": { 1: "M0.5,1 L.5,.5 L1,.5", 3: "M.5,0 L.5,.5 L0,.5" }, "╄": { 1: "M0,.5 L.5,.5 L.5,1", 3: "M.5,0 L.5,.5 L1,.5" }, "╅": { 1: "M.5,0 L.5,.5 L1,.5", 3: "M0,.5 L.5,.5 L.5,1" }, "╆": { 1: "M.5,0 L.5,.5 L0,.5", 3: "M0.5,1 L.5,.5 L1,.5" }, "╇": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L.5,0 M0,.5 L1,.5" }, "╈": { 1: "M.5,.5 L.5,0", 3: "M0,.5 L1,.5 M.5,.5 L.5,1" }, "╉": { 1: "M.5,.5 L1,.5", 3: "M.5,0 L.5,1 M.5,.5 L0,.5" }, "╊": { 1: "M.5,.5 L0,.5", 3: "M.5,0 L.5,1 M.5,.5 L1,.5" }, "╌": { 1: "M.1,.5 L.4,.5 M.6,.5 L.9,.5" }, "╍": { 3: "M.1,.5 L.4,.5 M.6,.5 L.9,.5" }, "┄": { 1: "M.0667,.5 L.2667,.5 M.4,.5 L.6,.5 M.7333,.5 L.9333,.5" }, "┅": { 3: "M.0667,.5 L.2667,.5 M.4,.5 L.6,.5 M.7333,.5 L.9333,.5" }, "┈": { 1: "M.05,.5 L.2,.5 M.3,.5 L.45,.5 M.55,.5 L.7,.5 M.8,.5 L.95,.5" }, "┉": { 3: "M.05,.5 L.2,.5 M.3,.5 L.45,.5 M.55,.5 L.7,.5 M.8,.5 L.95,.5" }, "╎": { 1: "M.5,.1 L.5,.4 M.5,.6 L.5,.9" }, "╏": { 3: "M.5,.1 L.5,.4 M.5,.6 L.5,.9" }, "┆": { 1: "M.5,.0667 L.5,.2667 M.5,.4 L.5,.6 M.5,.7333 L.5,.9333" }, "┇": { 3: "M.5,.0667 L.5,.2667 M.5,.4 L.5,.6 M.5,.7333 L.5,.9333" }, "┊": { 1: "M.5,.05 L.5,.2 M.5,.3 L.5,.45 L.5,.55 M.5,.7 L.5,.95" }, "┋": { 3: "M.5,.05 L.5,.2 M.5,.3 L.5,.45 L.5,.55 M.5,.7 L.5,.95" }, "╭": { 1: (e3, t3) => `M.5,1 L.5,${0.5 + t3 / 0.15 * 0.5} C.5,${0.5 + t3 / 0.15 * 0.5},.5,.5,1,.5` }, "╮": { 1: (e3, t3) => `M.5,1 L.5,${0.5 + t3 / 0.15 * 0.5} C.5,${0.5 + t3 / 0.15 * 0.5},.5,.5,0,.5` }, "╯": { 1: (e3, t3) => `M.5,0 L.5,${0.5 - t3 / 0.15 * 0.5} C.5,${0.5 - t3 / 0.15 * 0.5},.5,.5,0,.5` }, "╰": { 1: (e3, t3) => `M.5,0 L.5,${0.5 - t3 / 0.15 * 0.5} C.5,${0.5 - t3 / 0.15 * 0.5},.5,.5,1,.5` } }, t2.powerlineDefinitions = { "": { d: "M0,0 L1,.5 L0,1", type: 0, rightPadding: 2 }, "": { d: "M-1,-.5 L1,.5 L-1,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M1,0 L0,.5 L1,1", type: 0, leftPadding: 2 }, "": { d: "M2,-.5 L0,.5 L2,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M0,0 L0,1 C0.552,1,1,0.776,1,.5 C1,0.224,0.552,0,0,0", type: 0, rightPadding: 1 }, "": { d: "M.2,1 C.422,1,.8,.826,.78,.5 C.8,.174,0.422,0,.2,0", type: 1, rightPadding: 1 }, "": { d: "M1,0 L1,1 C0.448,1,0,0.776,0,.5 C0,0.224,0.448,0,1,0", type: 0, leftPadding: 1 }, "": { d: "M.8,1 C0.578,1,0.2,.826,.22,.5 C0.2,0.174,0.578,0,0.8,0", type: 1, leftPadding: 1 }, "": { d: "M-.5,-.5 L1.5,1.5 L-.5,1.5", type: 0 }, "": { d: "M-.5,-.5 L1.5,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M1.5,-.5 L-.5,1.5 L1.5,1.5", type: 0 }, "": { d: "M1.5,-.5 L-.5,1.5 L-.5,-.5", type: 0 }, "": { d: "M1.5,-.5 L-.5,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M-.5,-.5 L1.5,1.5 L1.5,-.5", type: 0 } }, t2.powerlineDefinitions[""] = t2.powerlineDefinitions[""], t2.powerlineDefinitions[""] = t2.powerlineDefinitions[""], t2.tryDrawCustomChar = function(e3, i3, n2, l, c, d, _, u) {
        const g = t2.blockElementDefinitions[i3];
        if (g)
          return function(e4, t3, i4, s17, r2, o2) {
            for (let n3 = 0;n3 < t3.length; n3++) {
              const a2 = t3[n3], h2 = r2 / 8, l2 = o2 / 8;
              e4.fillRect(i4 + a2.x * h2, s17 + a2.y * l2, a2.w * h2, a2.h * l2);
            }
          }(e3, g, n2, l, c, d), true;
        const v2 = r[i3];
        if (v2)
          return function(e4, t3, i4, r2, n3, a2) {
            let h2 = o.get(t3);
            h2 || (h2 = new Map, o.set(t3, h2));
            const l2 = e4.fillStyle;
            if (typeof l2 != "string")
              throw new Error(`Unexpected fillStyle type "${l2}"`);
            let c2 = h2.get(l2);
            if (!c2) {
              const i5 = t3[0].length, r3 = t3.length, o2 = e4.canvas.ownerDocument.createElement("canvas");
              o2.width = i5, o2.height = r3;
              const n4 = (0, s16.throwIfFalsy)(o2.getContext("2d")), a3 = new ImageData(i5, r3);
              let d2, _2, u2, g2;
              if (l2.startsWith("#"))
                d2 = parseInt(l2.slice(1, 3), 16), _2 = parseInt(l2.slice(3, 5), 16), u2 = parseInt(l2.slice(5, 7), 16), g2 = l2.length > 7 && parseInt(l2.slice(7, 9), 16) || 1;
              else {
                if (!l2.startsWith("rgba"))
                  throw new Error(`Unexpected fillStyle color format "${l2}" when drawing pattern glyph`);
                [d2, _2, u2, g2] = l2.substring(5, l2.length - 1).split(",").map((e5) => parseFloat(e5));
              }
              for (let e5 = 0;e5 < r3; e5++)
                for (let s17 = 0;s17 < i5; s17++)
                  a3.data[4 * (e5 * i5 + s17)] = d2, a3.data[4 * (e5 * i5 + s17) + 1] = _2, a3.data[4 * (e5 * i5 + s17) + 2] = u2, a3.data[4 * (e5 * i5 + s17) + 3] = t3[e5][s17] * (255 * g2);
              n4.putImageData(a3, 0, 0), c2 = (0, s16.throwIfFalsy)(e4.createPattern(o2, null)), h2.set(l2, c2);
            }
            e4.fillStyle = c2, e4.fillRect(i4, r2, n3, a2);
          }(e3, v2, n2, l, c, d), true;
        const f = t2.boxDrawingDefinitions[i3];
        if (f)
          return function(e4, t3, i4, s17, r2, o2, n3) {
            e4.strokeStyle = e4.fillStyle;
            for (const [l2, c2] of Object.entries(t3)) {
              let t4;
              e4.beginPath(), e4.lineWidth = n3 * Number.parseInt(l2), t4 = typeof c2 == "function" ? c2(0.15, 0.15 / o2 * r2) : c2;
              for (const l3 of t4.split(" ")) {
                const t5 = l3[0], c3 = a[t5];
                if (!c3) {
                  console.error(`Could not find drawing instructions for "${t5}"`);
                  continue;
                }
                const d2 = l3.substring(1).split(",");
                d2[0] && d2[1] && c3(e4, h(d2, r2, o2, i4, s17, true, n3));
              }
              e4.stroke(), e4.closePath();
            }
          }(e3, f, n2, l, c, d, u), true;
        const p = t2.powerlineDefinitions[i3];
        return !!p && (function(e4, t3, i4, s17, r2, o2, n3, l2) {
          const c2 = new Path2D;
          c2.rect(i4, s17, r2, o2), e4.clip(c2), e4.beginPath();
          const d2 = n3 / 12;
          e4.lineWidth = l2 * d2;
          for (const n4 of t3.d.split(" ")) {
            const c3 = n4[0], _2 = a[c3];
            if (!_2) {
              console.error(`Could not find drawing instructions for "${c3}"`);
              continue;
            }
            const u2 = n4.substring(1).split(",");
            u2[0] && u2[1] && _2(e4, h(u2, r2, o2, i4, s17, false, l2, (t3.leftPadding ?? 0) * (d2 / 2), (t3.rightPadding ?? 0) * (d2 / 2)));
          }
          t3.type === 1 ? (e4.strokeStyle = e4.fillStyle, e4.stroke()) : e4.fill(), e4.closePath();
        }(e3, p, n2, l, c, d, _, u), true);
      };
      const o = new Map;
      function n(e3, t3, i3 = 0) {
        return Math.max(Math.min(e3, t3), i3);
      }
      const a = { C: (e3, t3) => e3.bezierCurveTo(t3[0], t3[1], t3[2], t3[3], t3[4], t3[5]), L: (e3, t3) => e3.lineTo(t3[0], t3[1]), M: (e3, t3) => e3.moveTo(t3[0], t3[1]) };
      function h(e3, t3, i3, s17, r2, o2, a2, h2 = 0, l = 0) {
        const c = e3.map((e4) => parseFloat(e4) || parseInt(e4));
        if (c.length < 2)
          throw new Error("Too few arguments for instruction");
        for (let e4 = 0;e4 < c.length; e4 += 2)
          c[e4] *= t3 - h2 * a2 - l * a2, o2 && c[e4] !== 0 && (c[e4] = n(Math.round(c[e4] + 0.5) - 0.5, t3, 0)), c[e4] += s17 + h2 * a2;
        for (let e4 = 1;e4 < c.length; e4 += 2)
          c[e4] *= i3, o2 && c[e4] !== 0 && (c[e4] = n(Math.round(c[e4] + 0.5) - 0.5, i3, 0)), c[e4] += r2;
        return c;
      }
    }, 56: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.observeDevicePixelDimensions = undefined;
      const s16 = i2(859);
      t2.observeDevicePixelDimensions = function(e3, t3, i3) {
        let r = new t3.ResizeObserver((t4) => {
          const s17 = t4.find((t5) => t5.target === e3);
          if (!s17)
            return;
          if (!("devicePixelContentBoxSize" in s17))
            return r?.disconnect(), void (r = undefined);
          const o = s17.devicePixelContentBoxSize[0].inlineSize, n = s17.devicePixelContentBoxSize[0].blockSize;
          o > 0 && n > 0 && i3(o, n);
        });
        try {
          r.observe(e3, { box: ["device-pixel-content-box"] });
        } catch {
          r.disconnect(), r = undefined;
        }
        return (0, s16.toDisposable)(() => r?.disconnect());
      };
    }, 374: (e2, t2) => {
      function i2(e3) {
        return 57508 <= e3 && e3 <= 57558;
      }
      function s16(e3) {
        return e3 >= 128512 && e3 <= 128591 || e3 >= 127744 && e3 <= 128511 || e3 >= 128640 && e3 <= 128767 || e3 >= 9728 && e3 <= 9983 || e3 >= 9984 && e3 <= 10175 || e3 >= 65024 && e3 <= 65039 || e3 >= 129280 && e3 <= 129535 || e3 >= 127462 && e3 <= 127487;
      }
      Object.defineProperty(t2, "__esModule", { value: true }), t2.computeNextVariantOffset = t2.createRenderDimensions = t2.treatGlyphAsBackgroundColor = t2.allowRescaling = t2.isEmoji = t2.isRestrictedPowerlineGlyph = t2.isPowerlineGlyph = t2.throwIfFalsy = undefined, t2.throwIfFalsy = function(e3) {
        if (!e3)
          throw new Error("value must not be falsy");
        return e3;
      }, t2.isPowerlineGlyph = i2, t2.isRestrictedPowerlineGlyph = function(e3) {
        return 57520 <= e3 && e3 <= 57527;
      }, t2.isEmoji = s16, t2.allowRescaling = function(e3, t3, r, o) {
        return t3 === 1 && r > Math.ceil(1.5 * o) && e3 !== undefined && e3 > 255 && !s16(e3) && !i2(e3) && !function(e4) {
          return 57344 <= e4 && e4 <= 63743;
        }(e3);
      }, t2.treatGlyphAsBackgroundColor = function(e3) {
        return i2(e3) || function(e4) {
          return 9472 <= e4 && e4 <= 9631;
        }(e3);
      }, t2.createRenderDimensions = function() {
        return { css: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 } }, device: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 }, char: { width: 0, height: 0, left: 0, top: 0 } } };
      }, t2.computeNextVariantOffset = function(e3, t3, i3 = 0) {
        return (e3 - (2 * Math.round(t3) - i3)) % (2 * Math.round(t3));
      };
    }, 296: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.createSelectionRenderModel = undefined;

      class i2 {
        constructor() {
          this.clear();
        }
        clear() {
          this.hasSelection = false, this.columnSelectMode = false, this.viewportStartRow = 0, this.viewportEndRow = 0, this.viewportCappedStartRow = 0, this.viewportCappedEndRow = 0, this.startCol = 0, this.endCol = 0, this.selectionStart = undefined, this.selectionEnd = undefined;
        }
        update(e3, t3, i3, s16 = false) {
          if (this.selectionStart = t3, this.selectionEnd = i3, !t3 || !i3 || t3[0] === i3[0] && t3[1] === i3[1])
            return void this.clear();
          const r = e3.buffers.active.ydisp, o = t3[1] - r, n = i3[1] - r, a = Math.max(o, 0), h = Math.min(n, e3.rows - 1);
          a >= e3.rows || h < 0 ? this.clear() : (this.hasSelection = true, this.columnSelectMode = s16, this.viewportStartRow = o, this.viewportEndRow = n, this.viewportCappedStartRow = a, this.viewportCappedEndRow = h, this.startCol = t3[0], this.endCol = i3[0]);
        }
        isCellSelected(e3, t3, i3) {
          return !!this.hasSelection && (i3 -= e3.buffer.active.viewportY, this.columnSelectMode ? this.startCol <= this.endCol ? t3 >= this.startCol && i3 >= this.viewportCappedStartRow && t3 < this.endCol && i3 <= this.viewportCappedEndRow : t3 < this.startCol && i3 >= this.viewportCappedStartRow && t3 >= this.endCol && i3 <= this.viewportCappedEndRow : i3 > this.viewportStartRow && i3 < this.viewportEndRow || this.viewportStartRow === this.viewportEndRow && i3 === this.viewportStartRow && t3 >= this.startCol && t3 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportEndRow && t3 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportStartRow && t3 >= this.startCol);
        }
      }
      t2.createSelectionRenderModel = function() {
        return new i2;
      };
    }, 509: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.TextureAtlas = undefined;
      const s16 = i2(237), r = i2(860), o = i2(374), n = i2(160), a = i2(345), h = i2(485), l = i2(385), c = i2(147), d = i2(855), _ = { texturePage: 0, texturePosition: { x: 0, y: 0 }, texturePositionClipSpace: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, size: { x: 0, y: 0 }, sizeClipSpace: { x: 0, y: 0 } };
      let u;

      class g {
        get pages() {
          return this._pages;
        }
        constructor(e3, t3, i3) {
          this._document = e3, this._config = t3, this._unicodeService = i3, this._didWarmUp = false, this._cacheMap = new h.FourKeyMap, this._cacheMapCombined = new h.FourKeyMap, this._pages = [], this._activePages = [], this._workBoundingBox = { top: 0, left: 0, bottom: 0, right: 0 }, this._workAttributeData = new c.AttributeData, this._textureSize = 512, this._onAddTextureAtlasCanvas = new a.EventEmitter, this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event, this._onRemoveTextureAtlasCanvas = new a.EventEmitter, this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event, this._requestClearModel = false, this._createNewPage(), this._tmpCanvas = p(e3, 4 * this._config.deviceCellWidth + 4, this._config.deviceCellHeight + 4), this._tmpCtx = (0, o.throwIfFalsy)(this._tmpCanvas.getContext("2d", { alpha: this._config.allowTransparency, willReadFrequently: true }));
        }
        dispose() {
          for (const e3 of this.pages)
            e3.canvas.remove();
          this._onAddTextureAtlasCanvas.dispose();
        }
        warmUp() {
          this._didWarmUp || (this._doWarmUp(), this._didWarmUp = true);
        }
        _doWarmUp() {
          const e3 = new l.IdleTaskQueue;
          for (let t3 = 33;t3 < 126; t3++)
            e3.enqueue(() => {
              if (!this._cacheMap.get(t3, d.DEFAULT_COLOR, d.DEFAULT_COLOR, d.DEFAULT_EXT)) {
                const e4 = this._drawToCache(t3, d.DEFAULT_COLOR, d.DEFAULT_COLOR, d.DEFAULT_EXT);
                this._cacheMap.set(t3, d.DEFAULT_COLOR, d.DEFAULT_COLOR, d.DEFAULT_EXT, e4);
              }
            });
        }
        beginFrame() {
          return this._requestClearModel;
        }
        clearTexture() {
          if (this._pages[0].currentRow.x !== 0 || this._pages[0].currentRow.y !== 0) {
            for (const e3 of this._pages)
              e3.clear();
            this._cacheMap.clear(), this._cacheMapCombined.clear(), this._didWarmUp = false;
          }
        }
        _createNewPage() {
          if (g.maxAtlasPages && this._pages.length >= Math.max(4, g.maxAtlasPages)) {
            const e4 = this._pages.filter((e5) => 2 * e5.canvas.width <= (g.maxTextureSize || 4096)).sort((e5, t4) => t4.canvas.width !== e5.canvas.width ? t4.canvas.width - e5.canvas.width : t4.percentageUsed - e5.percentageUsed);
            let t3 = -1, i3 = 0;
            for (let s18 = 0;s18 < e4.length; s18++)
              if (e4[s18].canvas.width !== i3)
                t3 = s18, i3 = e4[s18].canvas.width;
              else if (s18 - t3 == 3)
                break;
            const s17 = e4.slice(t3, t3 + 4), r2 = s17.map((e5) => e5.glyphs[0].texturePage).sort((e5, t4) => e5 > t4 ? 1 : -1), o2 = this.pages.length - s17.length, n2 = this._mergePages(s17, o2);
            n2.version++;
            for (let e5 = r2.length - 1;e5 >= 0; e5--)
              this._deletePage(r2[e5]);
            this.pages.push(n2), this._requestClearModel = true, this._onAddTextureAtlasCanvas.fire(n2.canvas);
          }
          const e3 = new v2(this._document, this._textureSize);
          return this._pages.push(e3), this._activePages.push(e3), this._onAddTextureAtlasCanvas.fire(e3.canvas), e3;
        }
        _mergePages(e3, t3) {
          const i3 = 2 * e3[0].canvas.width, s17 = new v2(this._document, i3, e3);
          for (const [r2, o2] of e3.entries()) {
            const e4 = r2 * o2.canvas.width % i3, n2 = Math.floor(r2 / 2) * o2.canvas.height;
            s17.ctx.drawImage(o2.canvas, e4, n2);
            for (const s18 of o2.glyphs)
              s18.texturePage = t3, s18.sizeClipSpace.x = s18.size.x / i3, s18.sizeClipSpace.y = s18.size.y / i3, s18.texturePosition.x += e4, s18.texturePosition.y += n2, s18.texturePositionClipSpace.x = s18.texturePosition.x / i3, s18.texturePositionClipSpace.y = s18.texturePosition.y / i3;
            this._onRemoveTextureAtlasCanvas.fire(o2.canvas);
            const a2 = this._activePages.indexOf(o2);
            a2 !== -1 && this._activePages.splice(a2, 1);
          }
          return s17;
        }
        _deletePage(e3) {
          this._pages.splice(e3, 1);
          for (let t3 = e3;t3 < this._pages.length; t3++) {
            const e4 = this._pages[t3];
            for (const t4 of e4.glyphs)
              t4.texturePage--;
            e4.version++;
          }
        }
        getRasterizedGlyphCombinedChar(e3, t3, i3, s17, r2) {
          return this._getFromCacheMap(this._cacheMapCombined, e3, t3, i3, s17, r2);
        }
        getRasterizedGlyph(e3, t3, i3, s17, r2) {
          return this._getFromCacheMap(this._cacheMap, e3, t3, i3, s17, r2);
        }
        _getFromCacheMap(e3, t3, i3, s17, r2, o2 = false) {
          return u = e3.get(t3, i3, s17, r2), u || (u = this._drawToCache(t3, i3, s17, r2, o2), e3.set(t3, i3, s17, r2, u)), u;
        }
        _getColorFromAnsiIndex(e3) {
          if (e3 >= this._config.colors.ansi.length)
            throw new Error("No color found for idx " + e3);
          return this._config.colors.ansi[e3];
        }
        _getBackgroundColor(e3, t3, i3, s17) {
          if (this._config.allowTransparency)
            return n.NULL_COLOR;
          let r2;
          switch (e3) {
            case 16777216:
            case 33554432:
              r2 = this._getColorFromAnsiIndex(t3);
              break;
            case 50331648:
              const e4 = c.AttributeData.toColorRGB(t3);
              r2 = n.channels.toColor(e4[0], e4[1], e4[2]);
              break;
            default:
              r2 = i3 ? n.color.opaque(this._config.colors.foreground) : this._config.colors.background;
          }
          return r2;
        }
        _getForegroundColor(e3, t3, i3, r2, o2, a2, h2, l2, d2, _2) {
          const u2 = this._getMinimumContrastColor(e3, t3, i3, r2, o2, a2, h2, d2, l2, _2);
          if (u2)
            return u2;
          let g2;
          switch (o2) {
            case 16777216:
            case 33554432:
              this._config.drawBoldTextInBrightColors && d2 && a2 < 8 && (a2 += 8), g2 = this._getColorFromAnsiIndex(a2);
              break;
            case 50331648:
              const e4 = c.AttributeData.toColorRGB(a2);
              g2 = n.channels.toColor(e4[0], e4[1], e4[2]);
              break;
            default:
              g2 = h2 ? this._config.colors.background : this._config.colors.foreground;
          }
          return this._config.allowTransparency && (g2 = n.color.opaque(g2)), l2 && (g2 = n.color.multiplyOpacity(g2, s16.DIM_OPACITY)), g2;
        }
        _resolveBackgroundRgba(e3, t3, i3) {
          switch (e3) {
            case 16777216:
            case 33554432:
              return this._getColorFromAnsiIndex(t3).rgba;
            case 50331648:
              return t3 << 8;
            default:
              return i3 ? this._config.colors.foreground.rgba : this._config.colors.background.rgba;
          }
        }
        _resolveForegroundRgba(e3, t3, i3, s17) {
          switch (e3) {
            case 16777216:
            case 33554432:
              return this._config.drawBoldTextInBrightColors && s17 && t3 < 8 && (t3 += 8), this._getColorFromAnsiIndex(t3).rgba;
            case 50331648:
              return t3 << 8;
            default:
              return i3 ? this._config.colors.background.rgba : this._config.colors.foreground.rgba;
          }
        }
        _getMinimumContrastColor(e3, t3, i3, s17, r2, o2, a2, h2, l2, c2) {
          if (this._config.minimumContrastRatio === 1 || c2)
            return;
          const d2 = this._getContrastCache(l2), _2 = d2.getColor(e3, s17);
          if (_2 !== undefined)
            return _2 || undefined;
          const u2 = this._resolveBackgroundRgba(t3, i3, a2), g2 = this._resolveForegroundRgba(r2, o2, a2, h2), v3 = n.rgba.ensureContrastRatio(u2, g2, this._config.minimumContrastRatio / (l2 ? 2 : 1));
          if (!v3)
            return void d2.setColor(e3, s17, null);
          const f2 = n.channels.toColor(v3 >> 24 & 255, v3 >> 16 & 255, v3 >> 8 & 255);
          return d2.setColor(e3, s17, f2), f2;
        }
        _getContrastCache(e3) {
          return e3 ? this._config.colors.halfContrastCache : this._config.colors.contrastCache;
        }
        _drawToCache(e3, t3, i3, n2, a2 = false) {
          const h2 = typeof e3 == "number" ? String.fromCharCode(e3) : e3, l2 = Math.min(this._config.deviceCellWidth * Math.max(h2.length, 2) + 4, this._textureSize);
          this._tmpCanvas.width < l2 && (this._tmpCanvas.width = l2);
          const d2 = Math.min(this._config.deviceCellHeight + 8, this._textureSize);
          if (this._tmpCanvas.height < d2 && (this._tmpCanvas.height = d2), this._tmpCtx.save(), this._workAttributeData.fg = i3, this._workAttributeData.bg = t3, this._workAttributeData.extended.ext = n2, this._workAttributeData.isInvisible())
            return _;
          const u2 = !!this._workAttributeData.isBold(), v3 = !!this._workAttributeData.isInverse(), p2 = !!this._workAttributeData.isDim(), C2 = !!this._workAttributeData.isItalic(), m = !!this._workAttributeData.isUnderline(), L2 = !!this._workAttributeData.isStrikethrough(), x = !!this._workAttributeData.isOverline();
          let w = this._workAttributeData.getFgColor(), b2 = this._workAttributeData.getFgColorMode(), M2 = this._workAttributeData.getBgColor(), R = this._workAttributeData.getBgColorMode();
          if (v3) {
            const e4 = w;
            w = M2, M2 = e4;
            const t4 = b2;
            b2 = R, R = t4;
          }
          const y = this._getBackgroundColor(R, M2, v3, p2);
          this._tmpCtx.globalCompositeOperation = "copy", this._tmpCtx.fillStyle = y.css, this._tmpCtx.fillRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height), this._tmpCtx.globalCompositeOperation = "source-over";
          const A = u2 ? this._config.fontWeightBold : this._config.fontWeight, E = C2 ? "italic" : "";
          this._tmpCtx.font = `${E} ${A} ${this._config.fontSize * this._config.devicePixelRatio}px ${this._config.fontFamily}`, this._tmpCtx.textBaseline = s16.TEXT_BASELINE;
          const S2 = h2.length === 1 && (0, o.isPowerlineGlyph)(h2.charCodeAt(0)), T = h2.length === 1 && (0, o.isRestrictedPowerlineGlyph)(h2.charCodeAt(0)), D2 = this._getForegroundColor(t3, R, M2, i3, b2, w, v3, p2, u2, (0, o.treatGlyphAsBackgroundColor)(h2.charCodeAt(0)));
          this._tmpCtx.fillStyle = D2.css;
          const B2 = T ? 0 : 4;
          let F2 = false;
          this._config.customGlyphs !== false && (F2 = (0, r.tryDrawCustomChar)(this._tmpCtx, h2, B2, B2, this._config.deviceCellWidth, this._config.deviceCellHeight, this._config.fontSize, this._config.devicePixelRatio));
          let P, I = !S2;
          if (P = typeof e3 == "number" ? this._unicodeService.wcwidth(e3) : this._unicodeService.getStringCellWidth(e3), m) {
            this._tmpCtx.save();
            const e4 = Math.max(1, Math.floor(this._config.fontSize * this._config.devicePixelRatio / 15)), t4 = e4 % 2 == 1 ? 0.5 : 0;
            if (this._tmpCtx.lineWidth = e4, this._workAttributeData.isUnderlineColorDefault())
              this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle;
            else if (this._workAttributeData.isUnderlineColorRGB())
              I = false, this._tmpCtx.strokeStyle = `rgb(${c.AttributeData.toColorRGB(this._workAttributeData.getUnderlineColor()).join(",")})`;
            else {
              I = false;
              let e5 = this._workAttributeData.getUnderlineColor();
              this._config.drawBoldTextInBrightColors && this._workAttributeData.isBold() && e5 < 8 && (e5 += 8), this._tmpCtx.strokeStyle = this._getColorFromAnsiIndex(e5).css;
            }
            this._tmpCtx.beginPath();
            const i4 = B2, s17 = Math.ceil(B2 + this._config.deviceCharHeight) - t4 - (a2 ? 2 * e4 : 0), r2 = s17 + e4, n3 = s17 + 2 * e4;
            let l3 = this._workAttributeData.getUnderlineVariantOffset();
            for (let a3 = 0;a3 < P; a3++) {
              this._tmpCtx.save();
              const h3 = i4 + a3 * this._config.deviceCellWidth, c2 = i4 + (a3 + 1) * this._config.deviceCellWidth, d3 = h3 + this._config.deviceCellWidth / 2;
              switch (this._workAttributeData.extended.underlineStyle) {
                case 2:
                  this._tmpCtx.moveTo(h3, s17), this._tmpCtx.lineTo(c2, s17), this._tmpCtx.moveTo(h3, n3), this._tmpCtx.lineTo(c2, n3);
                  break;
                case 3:
                  const i5 = e4 <= 1 ? n3 : Math.ceil(B2 + this._config.deviceCharHeight - e4 / 2) - t4, a4 = e4 <= 1 ? s17 : Math.ceil(B2 + this._config.deviceCharHeight + e4 / 2) - t4, _2 = new Path2D;
                  _2.rect(h3, s17, this._config.deviceCellWidth, n3 - s17), this._tmpCtx.clip(_2), this._tmpCtx.moveTo(h3 - this._config.deviceCellWidth / 2, r2), this._tmpCtx.bezierCurveTo(h3 - this._config.deviceCellWidth / 2, a4, h3, a4, h3, r2), this._tmpCtx.bezierCurveTo(h3, i5, d3, i5, d3, r2), this._tmpCtx.bezierCurveTo(d3, a4, c2, a4, c2, r2), this._tmpCtx.bezierCurveTo(c2, i5, c2 + this._config.deviceCellWidth / 2, i5, c2 + this._config.deviceCellWidth / 2, r2);
                  break;
                case 4:
                  const u3 = l3 === 0 ? 0 : l3 >= e4 ? 2 * e4 - l3 : e4 - l3;
                  !(l3 >= e4) == false || u3 === 0 ? (this._tmpCtx.setLineDash([Math.round(e4), Math.round(e4)]), this._tmpCtx.moveTo(h3 + u3, s17), this._tmpCtx.lineTo(c2, s17)) : (this._tmpCtx.setLineDash([Math.round(e4), Math.round(e4)]), this._tmpCtx.moveTo(h3, s17), this._tmpCtx.lineTo(h3 + u3, s17), this._tmpCtx.moveTo(h3 + u3 + e4, s17), this._tmpCtx.lineTo(c2, s17)), l3 = (0, o.computeNextVariantOffset)(c2 - h3, e4, l3);
                  break;
                case 5:
                  const g2 = 0.6, v4 = 0.3, f2 = c2 - h3, p3 = Math.floor(g2 * f2), C3 = Math.floor(v4 * f2), m2 = f2 - p3 - C3;
                  this._tmpCtx.setLineDash([p3, C3, m2]), this._tmpCtx.moveTo(h3, s17), this._tmpCtx.lineTo(c2, s17);
                  break;
                default:
                  this._tmpCtx.moveTo(h3, s17), this._tmpCtx.lineTo(c2, s17);
              }
              this._tmpCtx.stroke(), this._tmpCtx.restore();
            }
            if (this._tmpCtx.restore(), !F2 && this._config.fontSize >= 12 && !this._config.allowTransparency && h2 !== " ") {
              this._tmpCtx.save(), this._tmpCtx.textBaseline = "alphabetic";
              const t5 = this._tmpCtx.measureText(h2);
              if (this._tmpCtx.restore(), "actualBoundingBoxDescent" in t5 && t5.actualBoundingBoxDescent > 0) {
                this._tmpCtx.save();
                const t6 = new Path2D;
                t6.rect(i4, s17 - Math.ceil(e4 / 2), this._config.deviceCellWidth * P, n3 - s17 + Math.ceil(e4 / 2)), this._tmpCtx.clip(t6), this._tmpCtx.lineWidth = 3 * this._config.devicePixelRatio, this._tmpCtx.strokeStyle = y.css, this._tmpCtx.strokeText(h2, B2, B2 + this._config.deviceCharHeight), this._tmpCtx.restore();
              }
            }
          }
          if (x) {
            const e4 = Math.max(1, Math.floor(this._config.fontSize * this._config.devicePixelRatio / 15)), t4 = e4 % 2 == 1 ? 0.5 : 0;
            this._tmpCtx.lineWidth = e4, this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle, this._tmpCtx.beginPath(), this._tmpCtx.moveTo(B2, B2 + t4), this._tmpCtx.lineTo(B2 + this._config.deviceCharWidth * P, B2 + t4), this._tmpCtx.stroke();
          }
          if (F2 || this._tmpCtx.fillText(h2, B2, B2 + this._config.deviceCharHeight), h2 === "_" && !this._config.allowTransparency) {
            let e4 = f(this._tmpCtx.getImageData(B2, B2, this._config.deviceCellWidth, this._config.deviceCellHeight), y, D2, I);
            if (e4)
              for (let t4 = 1;t4 <= 5 && (this._tmpCtx.save(), this._tmpCtx.fillStyle = y.css, this._tmpCtx.fillRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height), this._tmpCtx.restore(), this._tmpCtx.fillText(h2, B2, B2 + this._config.deviceCharHeight - t4), e4 = f(this._tmpCtx.getImageData(B2, B2, this._config.deviceCellWidth, this._config.deviceCellHeight), y, D2, I), e4); t4++)
                ;
          }
          if (L2) {
            const e4 = Math.max(1, Math.floor(this._config.fontSize * this._config.devicePixelRatio / 10)), t4 = this._tmpCtx.lineWidth % 2 == 1 ? 0.5 : 0;
            this._tmpCtx.lineWidth = e4, this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle, this._tmpCtx.beginPath(), this._tmpCtx.moveTo(B2, B2 + Math.floor(this._config.deviceCharHeight / 2) - t4), this._tmpCtx.lineTo(B2 + this._config.deviceCharWidth * P, B2 + Math.floor(this._config.deviceCharHeight / 2) - t4), this._tmpCtx.stroke();
          }
          this._tmpCtx.restore();
          const O = this._tmpCtx.getImageData(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);
          let k;
          if (k = this._config.allowTransparency ? function(e4) {
            for (let t4 = 0;t4 < e4.data.length; t4 += 4)
              if (e4.data[t4 + 3] > 0)
                return false;
            return true;
          }(O) : f(O, y, D2, I), k)
            return _;
          const $2 = this._findGlyphBoundingBox(O, this._workBoundingBox, l2, T, F2, B2);
          let U2, N;
          for (;; ) {
            if (this._activePages.length === 0) {
              const e4 = this._createNewPage();
              U2 = e4, N = e4.currentRow, N.height = $2.size.y;
              break;
            }
            U2 = this._activePages[this._activePages.length - 1], N = U2.currentRow;
            for (const e4 of this._activePages)
              $2.size.y <= e4.currentRow.height && (U2 = e4, N = e4.currentRow);
            for (let e4 = this._activePages.length - 1;e4 >= 0; e4--)
              for (const t4 of this._activePages[e4].fixedRows)
                t4.height <= N.height && $2.size.y <= t4.height && (U2 = this._activePages[e4], N = t4);
            if (N.y + $2.size.y >= U2.canvas.height || N.height > $2.size.y + 2) {
              let e4 = false;
              if (U2.currentRow.y + U2.currentRow.height + $2.size.y >= U2.canvas.height) {
                let t4;
                for (const e5 of this._activePages)
                  if (e5.currentRow.y + e5.currentRow.height + $2.size.y < e5.canvas.height) {
                    t4 = e5;
                    break;
                  }
                if (t4)
                  U2 = t4;
                else if (g.maxAtlasPages && this._pages.length >= g.maxAtlasPages && N.y + $2.size.y <= U2.canvas.height && N.height >= $2.size.y && N.x + $2.size.x <= U2.canvas.width)
                  e4 = true;
                else {
                  const t5 = this._createNewPage();
                  U2 = t5, N = t5.currentRow, N.height = $2.size.y, e4 = true;
                }
              }
              e4 || (U2.currentRow.height > 0 && U2.fixedRows.push(U2.currentRow), N = { x: 0, y: U2.currentRow.y + U2.currentRow.height, height: $2.size.y }, U2.fixedRows.push(N), U2.currentRow = { x: 0, y: N.y + N.height, height: 0 });
            }
            if (N.x + $2.size.x <= U2.canvas.width)
              break;
            N === U2.currentRow ? (N.x = 0, N.y += N.height, N.height = 0) : U2.fixedRows.splice(U2.fixedRows.indexOf(N), 1);
          }
          return $2.texturePage = this._pages.indexOf(U2), $2.texturePosition.x = N.x, $2.texturePosition.y = N.y, $2.texturePositionClipSpace.x = N.x / U2.canvas.width, $2.texturePositionClipSpace.y = N.y / U2.canvas.height, $2.sizeClipSpace.x /= U2.canvas.width, $2.sizeClipSpace.y /= U2.canvas.height, N.height = Math.max(N.height, $2.size.y), N.x += $2.size.x, U2.ctx.putImageData(O, $2.texturePosition.x - this._workBoundingBox.left, $2.texturePosition.y - this._workBoundingBox.top, this._workBoundingBox.left, this._workBoundingBox.top, $2.size.x, $2.size.y), U2.addGlyph($2), U2.version++, $2;
        }
        _findGlyphBoundingBox(e3, t3, i3, s17, r2, o2) {
          t3.top = 0;
          const n2 = s17 ? this._config.deviceCellHeight : this._tmpCanvas.height, a2 = s17 ? this._config.deviceCellWidth : i3;
          let h2 = false;
          for (let i4 = 0;i4 < n2; i4++) {
            for (let s18 = 0;s18 < a2; s18++) {
              const r3 = i4 * this._tmpCanvas.width * 4 + 4 * s18 + 3;
              if (e3.data[r3] !== 0) {
                t3.top = i4, h2 = true;
                break;
              }
            }
            if (h2)
              break;
          }
          t3.left = 0, h2 = false;
          for (let i4 = 0;i4 < o2 + a2; i4++) {
            for (let s18 = 0;s18 < n2; s18++) {
              const r3 = s18 * this._tmpCanvas.width * 4 + 4 * i4 + 3;
              if (e3.data[r3] !== 0) {
                t3.left = i4, h2 = true;
                break;
              }
            }
            if (h2)
              break;
          }
          t3.right = a2, h2 = false;
          for (let i4 = o2 + a2 - 1;i4 >= o2; i4--) {
            for (let s18 = 0;s18 < n2; s18++) {
              const r3 = s18 * this._tmpCanvas.width * 4 + 4 * i4 + 3;
              if (e3.data[r3] !== 0) {
                t3.right = i4, h2 = true;
                break;
              }
            }
            if (h2)
              break;
          }
          t3.bottom = n2, h2 = false;
          for (let i4 = n2 - 1;i4 >= 0; i4--) {
            for (let s18 = 0;s18 < a2; s18++) {
              const r3 = i4 * this._tmpCanvas.width * 4 + 4 * s18 + 3;
              if (e3.data[r3] !== 0) {
                t3.bottom = i4, h2 = true;
                break;
              }
            }
            if (h2)
              break;
          }
          return { texturePage: 0, texturePosition: { x: 0, y: 0 }, texturePositionClipSpace: { x: 0, y: 0 }, size: { x: t3.right - t3.left + 1, y: t3.bottom - t3.top + 1 }, sizeClipSpace: { x: t3.right - t3.left + 1, y: t3.bottom - t3.top + 1 }, offset: { x: -t3.left + o2 + (s17 || r2 ? Math.floor((this._config.deviceCellWidth - this._config.deviceCharWidth) / 2) : 0), y: -t3.top + o2 + (s17 || r2 ? this._config.lineHeight === 1 ? 0 : Math.round((this._config.deviceCellHeight - this._config.deviceCharHeight) / 2) : 0) } };
        }
      }
      t2.TextureAtlas = g;

      class v2 {
        get percentageUsed() {
          return this._usedPixels / (this.canvas.width * this.canvas.height);
        }
        get glyphs() {
          return this._glyphs;
        }
        addGlyph(e3) {
          this._glyphs.push(e3), this._usedPixels += e3.size.x * e3.size.y;
        }
        constructor(e3, t3, i3) {
          if (this._usedPixels = 0, this._glyphs = [], this.version = 0, this.currentRow = { x: 0, y: 0, height: 0 }, this.fixedRows = [], i3)
            for (const e4 of i3)
              this._glyphs.push(...e4.glyphs), this._usedPixels += e4._usedPixels;
          this.canvas = p(e3, t3, t3), this.ctx = (0, o.throwIfFalsy)(this.canvas.getContext("2d", { alpha: true }));
        }
        clear() {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this.currentRow.x = 0, this.currentRow.y = 0, this.currentRow.height = 0, this.fixedRows.length = 0, this.version++;
        }
      }
      function f(e3, t3, i3, s17) {
        const r2 = t3.rgba >>> 24, o2 = t3.rgba >>> 16 & 255, n2 = t3.rgba >>> 8 & 255, a2 = i3.rgba >>> 24, h2 = i3.rgba >>> 16 & 255, l2 = i3.rgba >>> 8 & 255, c2 = Math.floor((Math.abs(r2 - a2) + Math.abs(o2 - h2) + Math.abs(n2 - l2)) / 12);
        let d2 = true;
        for (let t4 = 0;t4 < e3.data.length; t4 += 4)
          e3.data[t4] === r2 && e3.data[t4 + 1] === o2 && e3.data[t4 + 2] === n2 || s17 && Math.abs(e3.data[t4] - r2) + Math.abs(e3.data[t4 + 1] - o2) + Math.abs(e3.data[t4 + 2] - n2) < c2 ? e3.data[t4 + 3] = 0 : d2 = false;
        return d2;
      }
      function p(e3, t3, i3) {
        const s17 = e3.createElement("canvas");
        return s17.width = t3, s17.height = i3, s17;
      }
    }, 160: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.contrastRatio = t2.toPaddedHex = t2.rgba = t2.rgb = t2.css = t2.color = t2.channels = t2.NULL_COLOR = undefined;
      let i2 = 0, s16 = 0, r = 0, o = 0;
      var n, a, h, l, c;
      function d(e3) {
        const t3 = e3.toString(16);
        return t3.length < 2 ? "0" + t3 : t3;
      }
      function _(e3, t3) {
        return e3 < t3 ? (t3 + 0.05) / (e3 + 0.05) : (e3 + 0.05) / (t3 + 0.05);
      }
      t2.NULL_COLOR = { css: "#00000000", rgba: 0 }, function(e3) {
        e3.toCss = function(e4, t3, i3, s17) {
          return s17 !== undefined ? `#${d(e4)}${d(t3)}${d(i3)}${d(s17)}` : `#${d(e4)}${d(t3)}${d(i3)}`;
        }, e3.toRgba = function(e4, t3, i3, s17 = 255) {
          return (e4 << 24 | t3 << 16 | i3 << 8 | s17) >>> 0;
        }, e3.toColor = function(t3, i3, s17, r2) {
          return { css: e3.toCss(t3, i3, s17, r2), rgba: e3.toRgba(t3, i3, s17, r2) };
        };
      }(n || (t2.channels = n = {})), function(e3) {
        function t3(e4, t4) {
          return o = Math.round(255 * t4), [i2, s16, r] = c.toChannels(e4.rgba), { css: n.toCss(i2, s16, r, o), rgba: n.toRgba(i2, s16, r, o) };
        }
        e3.blend = function(e4, t4) {
          if (o = (255 & t4.rgba) / 255, o === 1)
            return { css: t4.css, rgba: t4.rgba };
          const a2 = t4.rgba >> 24 & 255, h2 = t4.rgba >> 16 & 255, l2 = t4.rgba >> 8 & 255, c2 = e4.rgba >> 24 & 255, d2 = e4.rgba >> 16 & 255, _2 = e4.rgba >> 8 & 255;
          return i2 = c2 + Math.round((a2 - c2) * o), s16 = d2 + Math.round((h2 - d2) * o), r = _2 + Math.round((l2 - _2) * o), { css: n.toCss(i2, s16, r), rgba: n.toRgba(i2, s16, r) };
        }, e3.isOpaque = function(e4) {
          return (255 & e4.rgba) == 255;
        }, e3.ensureContrastRatio = function(e4, t4, i3) {
          const s17 = c.ensureContrastRatio(e4.rgba, t4.rgba, i3);
          if (s17)
            return n.toColor(s17 >> 24 & 255, s17 >> 16 & 255, s17 >> 8 & 255);
        }, e3.opaque = function(e4) {
          const t4 = (255 | e4.rgba) >>> 0;
          return [i2, s16, r] = c.toChannels(t4), { css: n.toCss(i2, s16, r), rgba: t4 };
        }, e3.opacity = t3, e3.multiplyOpacity = function(e4, i3) {
          return o = 255 & e4.rgba, t3(e4, o * i3 / 255);
        }, e3.toColorRGB = function(e4) {
          return [e4.rgba >> 24 & 255, e4.rgba >> 16 & 255, e4.rgba >> 8 & 255];
        };
      }(a || (t2.color = a = {})), function(e3) {
        let t3, a2;
        try {
          const e4 = document.createElement("canvas");
          e4.width = 1, e4.height = 1;
          const i3 = e4.getContext("2d", { willReadFrequently: true });
          i3 && (t3 = i3, t3.globalCompositeOperation = "copy", a2 = t3.createLinearGradient(0, 0, 1, 1));
        } catch {}
        e3.toColor = function(e4) {
          if (e4.match(/#[\da-f]{3,8}/i))
            switch (e4.length) {
              case 4:
                return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s16 = parseInt(e4.slice(2, 3).repeat(2), 16), r = parseInt(e4.slice(3, 4).repeat(2), 16), n.toColor(i2, s16, r);
              case 5:
                return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s16 = parseInt(e4.slice(2, 3).repeat(2), 16), r = parseInt(e4.slice(3, 4).repeat(2), 16), o = parseInt(e4.slice(4, 5).repeat(2), 16), n.toColor(i2, s16, r, o);
              case 7:
                return { css: e4, rgba: (parseInt(e4.slice(1), 16) << 8 | 255) >>> 0 };
              case 9:
                return { css: e4, rgba: parseInt(e4.slice(1), 16) >>> 0 };
            }
          const h2 = e4.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);
          if (h2)
            return i2 = parseInt(h2[1]), s16 = parseInt(h2[2]), r = parseInt(h2[3]), o = Math.round(255 * (h2[5] === undefined ? 1 : parseFloat(h2[5]))), n.toColor(i2, s16, r, o);
          if (!t3 || !a2)
            throw new Error("css.toColor: Unsupported css format");
          if (t3.fillStyle = a2, t3.fillStyle = e4, typeof t3.fillStyle != "string")
            throw new Error("css.toColor: Unsupported css format");
          if (t3.fillRect(0, 0, 1, 1), [i2, s16, r, o] = t3.getImageData(0, 0, 1, 1).data, o !== 255)
            throw new Error("css.toColor: Unsupported css format");
          return { rgba: n.toRgba(i2, s16, r, o), css: e4 };
        };
      }(h || (t2.css = h = {})), function(e3) {
        function t3(e4, t4, i3) {
          const s17 = e4 / 255, r2 = t4 / 255, o2 = i3 / 255;
          return 0.2126 * (s17 <= 0.03928 ? s17 / 12.92 : Math.pow((s17 + 0.055) / 1.055, 2.4)) + 0.7152 * (r2 <= 0.03928 ? r2 / 12.92 : Math.pow((r2 + 0.055) / 1.055, 2.4)) + 0.0722 * (o2 <= 0.03928 ? o2 / 12.92 : Math.pow((o2 + 0.055) / 1.055, 2.4));
        }
        e3.relativeLuminance = function(e4) {
          return t3(e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4);
        }, e3.relativeLuminance2 = t3;
      }(l || (t2.rgb = l = {})), function(e3) {
        function t3(e4, t4, i3) {
          const s17 = e4 >> 24 & 255, r2 = e4 >> 16 & 255, o2 = e4 >> 8 & 255;
          let n2 = t4 >> 24 & 255, a3 = t4 >> 16 & 255, h2 = t4 >> 8 & 255, c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s17, r2, o2));
          for (;c2 < i3 && (n2 > 0 || a3 > 0 || h2 > 0); )
            n2 -= Math.max(0, Math.ceil(0.1 * n2)), a3 -= Math.max(0, Math.ceil(0.1 * a3)), h2 -= Math.max(0, Math.ceil(0.1 * h2)), c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s17, r2, o2));
          return (n2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
        }
        function a2(e4, t4, i3) {
          const s17 = e4 >> 24 & 255, r2 = e4 >> 16 & 255, o2 = e4 >> 8 & 255;
          let n2 = t4 >> 24 & 255, a3 = t4 >> 16 & 255, h2 = t4 >> 8 & 255, c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s17, r2, o2));
          for (;c2 < i3 && (n2 < 255 || a3 < 255 || h2 < 255); )
            n2 = Math.min(255, n2 + Math.ceil(0.1 * (255 - n2))), a3 = Math.min(255, a3 + Math.ceil(0.1 * (255 - a3))), h2 = Math.min(255, h2 + Math.ceil(0.1 * (255 - h2))), c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s17, r2, o2));
          return (n2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
        }
        e3.blend = function(e4, t4) {
          if (o = (255 & t4) / 255, o === 1)
            return t4;
          const a3 = t4 >> 24 & 255, h2 = t4 >> 16 & 255, l2 = t4 >> 8 & 255, c2 = e4 >> 24 & 255, d2 = e4 >> 16 & 255, _2 = e4 >> 8 & 255;
          return i2 = c2 + Math.round((a3 - c2) * o), s16 = d2 + Math.round((h2 - d2) * o), r = _2 + Math.round((l2 - _2) * o), n.toRgba(i2, s16, r);
        }, e3.ensureContrastRatio = function(e4, i3, s17) {
          const r2 = l.relativeLuminance(e4 >> 8), o2 = l.relativeLuminance(i3 >> 8);
          if (_(r2, o2) < s17) {
            if (o2 < r2) {
              const o3 = t3(e4, i3, s17), n3 = _(r2, l.relativeLuminance(o3 >> 8));
              if (n3 < s17) {
                const t4 = a2(e4, i3, s17);
                return n3 > _(r2, l.relativeLuminance(t4 >> 8)) ? o3 : t4;
              }
              return o3;
            }
            const n2 = a2(e4, i3, s17), h2 = _(r2, l.relativeLuminance(n2 >> 8));
            if (h2 < s17) {
              const o3 = t3(e4, i3, s17);
              return h2 > _(r2, l.relativeLuminance(o3 >> 8)) ? n2 : o3;
            }
            return n2;
          }
        }, e3.reduceLuminance = t3, e3.increaseLuminance = a2, e3.toChannels = function(e4) {
          return [e4 >> 24 & 255, e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4];
        };
      }(c || (t2.rgba = c = {})), t2.toPaddedHex = d, t2.contrastRatio = _;
    }, 345: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.runAndSubscribe = t2.forwardEvent = t2.EventEmitter = undefined, t2.EventEmitter = class {
        constructor() {
          this._listeners = [], this._disposed = false;
        }
        get event() {
          return this._event || (this._event = (e3) => (this._listeners.push(e3), { dispose: () => {
            if (!this._disposed) {
              for (let t3 = 0;t3 < this._listeners.length; t3++)
                if (this._listeners[t3] === e3)
                  return void this._listeners.splice(t3, 1);
            }
          } })), this._event;
        }
        fire(e3, t3) {
          const i2 = [];
          for (let e4 = 0;e4 < this._listeners.length; e4++)
            i2.push(this._listeners[e4]);
          for (let s16 = 0;s16 < i2.length; s16++)
            i2[s16].call(undefined, e3, t3);
        }
        dispose() {
          this.clearListeners(), this._disposed = true;
        }
        clearListeners() {
          this._listeners && (this._listeners.length = 0);
        }
      }, t2.forwardEvent = function(e3, t3) {
        return e3((e4) => t3.fire(e4));
      }, t2.runAndSubscribe = function(e3, t3) {
        return t3(undefined), e3((e4) => t3(e4));
      };
    }, 859: (e2, t2) => {
      function i2(e3) {
        for (const t3 of e3)
          t3.dispose();
        e3.length = 0;
      }
      Object.defineProperty(t2, "__esModule", { value: true }), t2.getDisposeArrayDisposable = t2.disposeArray = t2.toDisposable = t2.MutableDisposable = t2.Disposable = undefined, t2.Disposable = class {
        constructor() {
          this._disposables = [], this._isDisposed = false;
        }
        dispose() {
          this._isDisposed = true;
          for (const e3 of this._disposables)
            e3.dispose();
          this._disposables.length = 0;
        }
        register(e3) {
          return this._disposables.push(e3), e3;
        }
        unregister(e3) {
          const t3 = this._disposables.indexOf(e3);
          t3 !== -1 && this._disposables.splice(t3, 1);
        }
      }, t2.MutableDisposable = class {
        constructor() {
          this._isDisposed = false;
        }
        get value() {
          return this._isDisposed ? undefined : this._value;
        }
        set value(e3) {
          this._isDisposed || e3 === this._value || (this._value?.dispose(), this._value = e3);
        }
        clear() {
          this.value = undefined;
        }
        dispose() {
          this._isDisposed = true, this._value?.dispose(), this._value = undefined;
        }
      }, t2.toDisposable = function(e3) {
        return { dispose: e3 };
      }, t2.disposeArray = i2, t2.getDisposeArrayDisposable = function(e3) {
        return { dispose: () => i2(e3) };
      };
    }, 485: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.FourKeyMap = t2.TwoKeyMap = undefined;

      class i2 {
        constructor() {
          this._data = {};
        }
        set(e3, t3, i3) {
          this._data[e3] || (this._data[e3] = {}), this._data[e3][t3] = i3;
        }
        get(e3, t3) {
          return this._data[e3] ? this._data[e3][t3] : undefined;
        }
        clear() {
          this._data = {};
        }
      }
      t2.TwoKeyMap = i2, t2.FourKeyMap = class {
        constructor() {
          this._data = new i2;
        }
        set(e3, t3, s16, r, o) {
          this._data.get(e3, t3) || this._data.set(e3, t3, new i2), this._data.get(e3, t3).set(s16, r, o);
        }
        get(e3, t3, i3, s16) {
          return this._data.get(e3, t3)?.get(i3, s16);
        }
        clear() {
          this._data.clear();
        }
      };
    }, 399: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.isChromeOS = t2.isLinux = t2.isWindows = t2.isIphone = t2.isIpad = t2.isMac = t2.getSafariVersion = t2.isSafari = t2.isLegacyEdge = t2.isFirefox = t2.isNode = undefined, t2.isNode = typeof process != "undefined" && "title" in process;
      const i2 = t2.isNode ? "node" : navigator.userAgent, s16 = t2.isNode ? "node" : navigator.platform;
      t2.isFirefox = i2.includes("Firefox"), t2.isLegacyEdge = i2.includes("Edge"), t2.isSafari = /^((?!chrome|android).)*safari/i.test(i2), t2.getSafariVersion = function() {
        if (!t2.isSafari)
          return 0;
        const e3 = i2.match(/Version\/(\d+)/);
        return e3 === null || e3.length < 2 ? 0 : parseInt(e3[1]);
      }, t2.isMac = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(s16), t2.isIpad = s16 === "iPad", t2.isIphone = s16 === "iPhone", t2.isWindows = ["Windows", "Win16", "Win32", "WinCE"].includes(s16), t2.isLinux = s16.indexOf("Linux") >= 0, t2.isChromeOS = /\bCrOS\b/.test(i2);
    }, 385: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.DebouncedIdleTask = t2.IdleTaskQueue = t2.PriorityTaskQueue = undefined;
      const s16 = i2(399);

      class r {
        constructor() {
          this._tasks = [], this._i = 0;
        }
        enqueue(e3) {
          this._tasks.push(e3), this._start();
        }
        flush() {
          for (;this._i < this._tasks.length; )
            this._tasks[this._i]() || this._i++;
          this.clear();
        }
        clear() {
          this._idleCallback && (this._cancelCallback(this._idleCallback), this._idleCallback = undefined), this._i = 0, this._tasks.length = 0;
        }
        _start() {
          this._idleCallback || (this._idleCallback = this._requestCallback(this._process.bind(this)));
        }
        _process(e3) {
          this._idleCallback = undefined;
          let t3 = 0, i3 = 0, s17 = e3.timeRemaining(), r2 = 0;
          for (;this._i < this._tasks.length; ) {
            if (t3 = Date.now(), this._tasks[this._i]() || this._i++, t3 = Math.max(1, Date.now() - t3), i3 = Math.max(t3, i3), r2 = e3.timeRemaining(), 1.5 * i3 > r2)
              return s17 - t3 < -20 && console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(s17 - t3))}ms`), void this._start();
            s17 = r2;
          }
          this.clear();
        }
      }

      class o extends r {
        _requestCallback(e3) {
          return setTimeout(() => e3(this._createDeadline(16)));
        }
        _cancelCallback(e3) {
          clearTimeout(e3);
        }
        _createDeadline(e3) {
          const t3 = Date.now() + e3;
          return { timeRemaining: () => Math.max(0, t3 - Date.now()) };
        }
      }
      t2.PriorityTaskQueue = o, t2.IdleTaskQueue = !s16.isNode && "requestIdleCallback" in window ? class extends r {
        _requestCallback(e3) {
          return requestIdleCallback(e3);
        }
        _cancelCallback(e3) {
          cancelIdleCallback(e3);
        }
      } : o, t2.DebouncedIdleTask = class {
        constructor() {
          this._queue = new t2.IdleTaskQueue;
        }
        set(e3) {
          this._queue.clear(), this._queue.enqueue(e3);
        }
        flush() {
          this._queue.flush();
        }
      };
    }, 147: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.ExtendedAttrs = t2.AttributeData = undefined;

      class i2 {
        constructor() {
          this.fg = 0, this.bg = 0, this.extended = new s16;
        }
        static toColorRGB(e3) {
          return [e3 >>> 16 & 255, e3 >>> 8 & 255, 255 & e3];
        }
        static fromColorRGB(e3) {
          return (255 & e3[0]) << 16 | (255 & e3[1]) << 8 | 255 & e3[2];
        }
        clone() {
          const e3 = new i2;
          return e3.fg = this.fg, e3.bg = this.bg, e3.extended = this.extended.clone(), e3;
        }
        isInverse() {
          return 67108864 & this.fg;
        }
        isBold() {
          return 134217728 & this.fg;
        }
        isUnderline() {
          return this.hasExtendedAttrs() && this.extended.underlineStyle !== 0 ? 1 : 268435456 & this.fg;
        }
        isBlink() {
          return 536870912 & this.fg;
        }
        isInvisible() {
          return 1073741824 & this.fg;
        }
        isItalic() {
          return 67108864 & this.bg;
        }
        isDim() {
          return 134217728 & this.bg;
        }
        isStrikethrough() {
          return 2147483648 & this.fg;
        }
        isProtected() {
          return 536870912 & this.bg;
        }
        isOverline() {
          return 1073741824 & this.bg;
        }
        getFgColorMode() {
          return 50331648 & this.fg;
        }
        getBgColorMode() {
          return 50331648 & this.bg;
        }
        isFgRGB() {
          return (50331648 & this.fg) == 50331648;
        }
        isBgRGB() {
          return (50331648 & this.bg) == 50331648;
        }
        isFgPalette() {
          return (50331648 & this.fg) == 16777216 || (50331648 & this.fg) == 33554432;
        }
        isBgPalette() {
          return (50331648 & this.bg) == 16777216 || (50331648 & this.bg) == 33554432;
        }
        isFgDefault() {
          return (50331648 & this.fg) == 0;
        }
        isBgDefault() {
          return (50331648 & this.bg) == 0;
        }
        isAttributeDefault() {
          return this.fg === 0 && this.bg === 0;
        }
        getFgColor() {
          switch (50331648 & this.fg) {
            case 16777216:
            case 33554432:
              return 255 & this.fg;
            case 50331648:
              return 16777215 & this.fg;
            default:
              return -1;
          }
        }
        getBgColor() {
          switch (50331648 & this.bg) {
            case 16777216:
            case 33554432:
              return 255 & this.bg;
            case 50331648:
              return 16777215 & this.bg;
            default:
              return -1;
          }
        }
        hasExtendedAttrs() {
          return 268435456 & this.bg;
        }
        updateExtended() {
          this.extended.isEmpty() ? this.bg &= -268435457 : this.bg |= 268435456;
        }
        getUnderlineColor() {
          if (268435456 & this.bg && ~this.extended.underlineColor)
            switch (50331648 & this.extended.underlineColor) {
              case 16777216:
              case 33554432:
                return 255 & this.extended.underlineColor;
              case 50331648:
                return 16777215 & this.extended.underlineColor;
              default:
                return this.getFgColor();
            }
          return this.getFgColor();
        }
        getUnderlineColorMode() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 & this.extended.underlineColor : this.getFgColorMode();
        }
        isUnderlineColorRGB() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 50331648 : this.isFgRGB();
        }
        isUnderlineColorPalette() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 16777216 || (50331648 & this.extended.underlineColor) == 33554432 : this.isFgPalette();
        }
        isUnderlineColorDefault() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 0 : this.isFgDefault();
        }
        getUnderlineStyle() {
          return 268435456 & this.fg ? 268435456 & this.bg ? this.extended.underlineStyle : 1 : 0;
        }
        getUnderlineVariantOffset() {
          return this.extended.underlineVariantOffset;
        }
      }
      t2.AttributeData = i2;

      class s16 {
        get ext() {
          return this._urlId ? -469762049 & this._ext | this.underlineStyle << 26 : this._ext;
        }
        set ext(e3) {
          this._ext = e3;
        }
        get underlineStyle() {
          return this._urlId ? 5 : (469762048 & this._ext) >> 26;
        }
        set underlineStyle(e3) {
          this._ext &= -469762049, this._ext |= e3 << 26 & 469762048;
        }
        get underlineColor() {
          return 67108863 & this._ext;
        }
        set underlineColor(e3) {
          this._ext &= -67108864, this._ext |= 67108863 & e3;
        }
        get urlId() {
          return this._urlId;
        }
        set urlId(e3) {
          this._urlId = e3;
        }
        get underlineVariantOffset() {
          const e3 = (3758096384 & this._ext) >> 29;
          return e3 < 0 ? 4294967288 ^ e3 : e3;
        }
        set underlineVariantOffset(e3) {
          this._ext &= 536870911, this._ext |= e3 << 29 & 3758096384;
        }
        constructor(e3 = 0, t3 = 0) {
          this._ext = 0, this._urlId = 0, this._ext = e3, this._urlId = t3;
        }
        clone() {
          return new s16(this._ext, this._urlId);
        }
        isEmpty() {
          return this.underlineStyle === 0 && this._urlId === 0;
        }
      }
      t2.ExtendedAttrs = s16;
    }, 782: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.CellData = undefined;
      const s16 = i2(133), r = i2(855), o = i2(147);

      class n extends o.AttributeData {
        constructor() {
          super(...arguments), this.content = 0, this.fg = 0, this.bg = 0, this.extended = new o.ExtendedAttrs, this.combinedData = "";
        }
        static fromCharData(e3) {
          const t3 = new n;
          return t3.setFromCharData(e3), t3;
        }
        isCombined() {
          return 2097152 & this.content;
        }
        getWidth() {
          return this.content >> 22;
        }
        getChars() {
          return 2097152 & this.content ? this.combinedData : 2097151 & this.content ? (0, s16.stringFromCodePoint)(2097151 & this.content) : "";
        }
        getCode() {
          return this.isCombined() ? this.combinedData.charCodeAt(this.combinedData.length - 1) : 2097151 & this.content;
        }
        setFromCharData(e3) {
          this.fg = e3[r.CHAR_DATA_ATTR_INDEX], this.bg = 0;
          let t3 = false;
          if (e3[r.CHAR_DATA_CHAR_INDEX].length > 2)
            t3 = true;
          else if (e3[r.CHAR_DATA_CHAR_INDEX].length === 2) {
            const i3 = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0);
            if (55296 <= i3 && i3 <= 56319) {
              const s17 = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(1);
              56320 <= s17 && s17 <= 57343 ? this.content = 1024 * (i3 - 55296) + s17 - 56320 + 65536 | e3[r.CHAR_DATA_WIDTH_INDEX] << 22 : t3 = true;
            } else
              t3 = true;
          } else
            this.content = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | e3[r.CHAR_DATA_WIDTH_INDEX] << 22;
          t3 && (this.combinedData = e3[r.CHAR_DATA_CHAR_INDEX], this.content = 2097152 | e3[r.CHAR_DATA_WIDTH_INDEX] << 22);
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }
      t2.CellData = n;
    }, 855: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.WHITESPACE_CELL_CODE = t2.WHITESPACE_CELL_WIDTH = t2.WHITESPACE_CELL_CHAR = t2.NULL_CELL_CODE = t2.NULL_CELL_WIDTH = t2.NULL_CELL_CHAR = t2.CHAR_DATA_CODE_INDEX = t2.CHAR_DATA_WIDTH_INDEX = t2.CHAR_DATA_CHAR_INDEX = t2.CHAR_DATA_ATTR_INDEX = t2.DEFAULT_EXT = t2.DEFAULT_ATTR = t2.DEFAULT_COLOR = undefined, t2.DEFAULT_COLOR = 0, t2.DEFAULT_ATTR = 256 | t2.DEFAULT_COLOR << 9, t2.DEFAULT_EXT = 0, t2.CHAR_DATA_ATTR_INDEX = 0, t2.CHAR_DATA_CHAR_INDEX = 1, t2.CHAR_DATA_WIDTH_INDEX = 2, t2.CHAR_DATA_CODE_INDEX = 3, t2.NULL_CELL_CHAR = "", t2.NULL_CELL_WIDTH = 1, t2.NULL_CELL_CODE = 0, t2.WHITESPACE_CELL_CHAR = " ", t2.WHITESPACE_CELL_WIDTH = 1, t2.WHITESPACE_CELL_CODE = 32;
    }, 133: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.Utf8ToUtf32 = t2.StringToUtf32 = t2.utf32ToString = t2.stringFromCodePoint = undefined, t2.stringFromCodePoint = function(e3) {
        return e3 > 65535 ? (e3 -= 65536, String.fromCharCode(55296 + (e3 >> 10)) + String.fromCharCode(e3 % 1024 + 56320)) : String.fromCharCode(e3);
      }, t2.utf32ToString = function(e3, t3 = 0, i2 = e3.length) {
        let s16 = "";
        for (let r = t3;r < i2; ++r) {
          let t4 = e3[r];
          t4 > 65535 ? (t4 -= 65536, s16 += String.fromCharCode(55296 + (t4 >> 10)) + String.fromCharCode(t4 % 1024 + 56320)) : s16 += String.fromCharCode(t4);
        }
        return s16;
      }, t2.StringToUtf32 = class {
        constructor() {
          this._interim = 0;
        }
        clear() {
          this._interim = 0;
        }
        decode(e3, t3) {
          const i2 = e3.length;
          if (!i2)
            return 0;
          let s16 = 0, r = 0;
          if (this._interim) {
            const i3 = e3.charCodeAt(r++);
            56320 <= i3 && i3 <= 57343 ? t3[s16++] = 1024 * (this._interim - 55296) + i3 - 56320 + 65536 : (t3[s16++] = this._interim, t3[s16++] = i3), this._interim = 0;
          }
          for (let o = r;o < i2; ++o) {
            const r2 = e3.charCodeAt(o);
            if (55296 <= r2 && r2 <= 56319) {
              if (++o >= i2)
                return this._interim = r2, s16;
              const n = e3.charCodeAt(o);
              56320 <= n && n <= 57343 ? t3[s16++] = 1024 * (r2 - 55296) + n - 56320 + 65536 : (t3[s16++] = r2, t3[s16++] = n);
            } else
              r2 !== 65279 && (t3[s16++] = r2);
          }
          return s16;
        }
      }, t2.Utf8ToUtf32 = class {
        constructor() {
          this.interim = new Uint8Array(3);
        }
        clear() {
          this.interim.fill(0);
        }
        decode(e3, t3) {
          const i2 = e3.length;
          if (!i2)
            return 0;
          let s16, r, o, n, a = 0, h = 0, l = 0;
          if (this.interim[0]) {
            let s17 = false, r2 = this.interim[0];
            r2 &= (224 & r2) == 192 ? 31 : (240 & r2) == 224 ? 15 : 7;
            let o2, n2 = 0;
            for (;(o2 = 63 & this.interim[++n2]) && n2 < 4; )
              r2 <<= 6, r2 |= o2;
            const h2 = (224 & this.interim[0]) == 192 ? 2 : (240 & this.interim[0]) == 224 ? 3 : 4, c2 = h2 - n2;
            for (;l < c2; ) {
              if (l >= i2)
                return 0;
              if (o2 = e3[l++], (192 & o2) != 128) {
                l--, s17 = true;
                break;
              }
              this.interim[n2++] = o2, r2 <<= 6, r2 |= 63 & o2;
            }
            s17 || (h2 === 2 ? r2 < 128 ? l-- : t3[a++] = r2 : h2 === 3 ? r2 < 2048 || r2 >= 55296 && r2 <= 57343 || r2 === 65279 || (t3[a++] = r2) : r2 < 65536 || r2 > 1114111 || (t3[a++] = r2)), this.interim.fill(0);
          }
          const c = i2 - 4;
          let d = l;
          for (;d < i2; ) {
            for (;!(!(d < c) || 128 & (s16 = e3[d]) || 128 & (r = e3[d + 1]) || 128 & (o = e3[d + 2]) || 128 & (n = e3[d + 3])); )
              t3[a++] = s16, t3[a++] = r, t3[a++] = o, t3[a++] = n, d += 4;
            if (s16 = e3[d++], s16 < 128)
              t3[a++] = s16;
            else if ((224 & s16) == 192) {
              if (d >= i2)
                return this.interim[0] = s16, a;
              if (r = e3[d++], (192 & r) != 128) {
                d--;
                continue;
              }
              if (h = (31 & s16) << 6 | 63 & r, h < 128) {
                d--;
                continue;
              }
              t3[a++] = h;
            } else if ((240 & s16) == 224) {
              if (d >= i2)
                return this.interim[0] = s16, a;
              if (r = e3[d++], (192 & r) != 128) {
                d--;
                continue;
              }
              if (d >= i2)
                return this.interim[0] = s16, this.interim[1] = r, a;
              if (o = e3[d++], (192 & o) != 128) {
                d--;
                continue;
              }
              if (h = (15 & s16) << 12 | (63 & r) << 6 | 63 & o, h < 2048 || h >= 55296 && h <= 57343 || h === 65279)
                continue;
              t3[a++] = h;
            } else if ((248 & s16) == 240) {
              if (d >= i2)
                return this.interim[0] = s16, a;
              if (r = e3[d++], (192 & r) != 128) {
                d--;
                continue;
              }
              if (d >= i2)
                return this.interim[0] = s16, this.interim[1] = r, a;
              if (o = e3[d++], (192 & o) != 128) {
                d--;
                continue;
              }
              if (d >= i2)
                return this.interim[0] = s16, this.interim[1] = r, this.interim[2] = o, a;
              if (n = e3[d++], (192 & n) != 128) {
                d--;
                continue;
              }
              if (h = (7 & s16) << 18 | (63 & r) << 12 | (63 & o) << 6 | 63 & n, h < 65536 || h > 1114111)
                continue;
              t3[a++] = h;
            }
          }
          return a;
        }
      };
    }, 776: function(e2, t2, i2) {
      var s16 = this && this.__decorate || function(e3, t3, i3, s17) {
        var r2, o2 = arguments.length, n2 = o2 < 3 ? t3 : s17 === null ? s17 = Object.getOwnPropertyDescriptor(t3, i3) : s17;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function")
          n2 = Reflect.decorate(e3, t3, i3, s17);
        else
          for (var a2 = e3.length - 1;a2 >= 0; a2--)
            (r2 = e3[a2]) && (n2 = (o2 < 3 ? r2(n2) : o2 > 3 ? r2(t3, i3, n2) : r2(t3, i3)) || n2);
        return o2 > 3 && n2 && Object.defineProperty(t3, i3, n2), n2;
      }, r = this && this.__param || function(e3, t3) {
        return function(i3, s17) {
          t3(i3, s17, e3);
        };
      };
      Object.defineProperty(t2, "__esModule", { value: true }), t2.traceCall = t2.setTraceLogger = t2.LogService = undefined;
      const o = i2(859), n = i2(97), a = { trace: n.LogLevelEnum.TRACE, debug: n.LogLevelEnum.DEBUG, info: n.LogLevelEnum.INFO, warn: n.LogLevelEnum.WARN, error: n.LogLevelEnum.ERROR, off: n.LogLevelEnum.OFF };
      let h, l = t2.LogService = class extends o.Disposable {
        get logLevel() {
          return this._logLevel;
        }
        constructor(e3) {
          super(), this._optionsService = e3, this._logLevel = n.LogLevelEnum.OFF, this._updateLogLevel(), this.register(this._optionsService.onSpecificOptionChange("logLevel", () => this._updateLogLevel())), h = this;
        }
        _updateLogLevel() {
          this._logLevel = a[this._optionsService.rawOptions.logLevel];
        }
        _evalLazyOptionalParams(e3) {
          for (let t3 = 0;t3 < e3.length; t3++)
            typeof e3[t3] == "function" && (e3[t3] = e3[t3]());
        }
        _log(e3, t3, i3) {
          this._evalLazyOptionalParams(i3), e3.call(console, (this._optionsService.options.logger ? "" : "xterm.js: ") + t3, ...i3);
        }
        trace(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.TRACE && this._log(this._optionsService.options.logger?.trace.bind(this._optionsService.options.logger) ?? console.log, e3, t3);
        }
        debug(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.DEBUG && this._log(this._optionsService.options.logger?.debug.bind(this._optionsService.options.logger) ?? console.log, e3, t3);
        }
        info(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.INFO && this._log(this._optionsService.options.logger?.info.bind(this._optionsService.options.logger) ?? console.info, e3, t3);
        }
        warn(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.WARN && this._log(this._optionsService.options.logger?.warn.bind(this._optionsService.options.logger) ?? console.warn, e3, t3);
        }
        error(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.ERROR && this._log(this._optionsService.options.logger?.error.bind(this._optionsService.options.logger) ?? console.error, e3, t3);
        }
      };
      t2.LogService = l = s16([r(0, n.IOptionsService)], l), t2.setTraceLogger = function(e3) {
        h = e3;
      }, t2.traceCall = function(e3, t3, i3) {
        if (typeof i3.value != "function")
          throw new Error("not supported");
        const s17 = i3.value;
        i3.value = function(...e4) {
          if (h.logLevel !== n.LogLevelEnum.TRACE)
            return s17.apply(this, e4);
          h.trace(`GlyphRenderer#${s17.name}(${e4.map((e5) => JSON.stringify(e5)).join(", ")})`);
          const t4 = s17.apply(this, e4);
          return h.trace(`GlyphRenderer#${s17.name} return`, t4), t4;
        };
      };
    }, 726: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.createDecorator = t2.getServiceDependencies = t2.serviceRegistry = undefined;
      const i2 = "di$target", s16 = "di$dependencies";
      t2.serviceRegistry = new Map, t2.getServiceDependencies = function(e3) {
        return e3[s16] || [];
      }, t2.createDecorator = function(e3) {
        if (t2.serviceRegistry.has(e3))
          return t2.serviceRegistry.get(e3);
        const r = function(e4, t3, o) {
          if (arguments.length !== 3)
            throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
          (function(e5, t4, r2) {
            t4[i2] === t4 ? t4[s16].push({ id: e5, index: r2 }) : (t4[s16] = [{ id: e5, index: r2 }], t4[i2] = t4);
          })(r, e4, o);
        };
        return r.toString = () => e3, t2.serviceRegistry.set(e3, r), r;
      };
    }, 97: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.IDecorationService = t2.IUnicodeService = t2.IOscLinkService = t2.IOptionsService = t2.ILogService = t2.LogLevelEnum = t2.IInstantiationService = t2.ICharsetService = t2.ICoreService = t2.ICoreMouseService = t2.IBufferService = undefined;
      const s16 = i2(726);
      var r;
      t2.IBufferService = (0, s16.createDecorator)("BufferService"), t2.ICoreMouseService = (0, s16.createDecorator)("CoreMouseService"), t2.ICoreService = (0, s16.createDecorator)("CoreService"), t2.ICharsetService = (0, s16.createDecorator)("CharsetService"), t2.IInstantiationService = (0, s16.createDecorator)("InstantiationService"), function(e3) {
        e3[e3.TRACE = 0] = "TRACE", e3[e3.DEBUG = 1] = "DEBUG", e3[e3.INFO = 2] = "INFO", e3[e3.WARN = 3] = "WARN", e3[e3.ERROR = 4] = "ERROR", e3[e3.OFF = 5] = "OFF";
      }(r || (t2.LogLevelEnum = r = {})), t2.ILogService = (0, s16.createDecorator)("LogService"), t2.IOptionsService = (0, s16.createDecorator)("OptionsService"), t2.IOscLinkService = (0, s16.createDecorator)("OscLinkService"), t2.IUnicodeService = (0, s16.createDecorator)("UnicodeService"), t2.IDecorationService = (0, s16.createDecorator)("DecorationService");
    } }, t = {};
    function i(s16) {
      var r = t[s16];
      if (r !== undefined)
        return r.exports;
      var o = t[s16] = { exports: {} };
      return e[s16].call(o.exports, o, o.exports, i), o.exports;
    }
    var s15 = {};
    return (() => {
      var e2 = s15;
      Object.defineProperty(e2, "__esModule", { value: true }), e2.WebglAddon = undefined;
      const t2 = i(345), r = i(859), o = i(399), n = i(666), a = i(776);

      class h extends r.Disposable {
        constructor(e3) {
          if (o.isSafari && (0, o.getSafariVersion)() < 16) {
            const e4 = { antialias: false, depth: false, preserveDrawingBuffer: true };
            if (!document.createElement("canvas").getContext("webgl2", e4))
              throw new Error("Webgl2 is only supported on Safari 16 and above");
          }
          super(), this._preserveDrawingBuffer = e3, this._onChangeTextureAtlas = this.register(new t2.EventEmitter), this.onChangeTextureAtlas = this._onChangeTextureAtlas.event, this._onAddTextureAtlasCanvas = this.register(new t2.EventEmitter), this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event, this._onRemoveTextureAtlasCanvas = this.register(new t2.EventEmitter), this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event, this._onContextLoss = this.register(new t2.EventEmitter), this.onContextLoss = this._onContextLoss.event;
        }
        activate(e3) {
          const i2 = e3._core;
          if (!e3.element)
            return void this.register(i2.onWillOpen(() => this.activate(e3)));
          this._terminal = e3;
          const { coreService: s16, optionsService: o2 } = i2, h2 = i2, l = h2._renderService, c = h2._characterJoinerService, d = h2._charSizeService, _ = h2._coreBrowserService, u = h2._decorationService, g = h2._logService, v2 = h2._themeService;
          (0, a.setTraceLogger)(g), this._renderer = this.register(new n.WebglRenderer(e3, c, d, _, s16, u, o2, v2, this._preserveDrawingBuffer)), this.register((0, t2.forwardEvent)(this._renderer.onContextLoss, this._onContextLoss)), this.register((0, t2.forwardEvent)(this._renderer.onChangeTextureAtlas, this._onChangeTextureAtlas)), this.register((0, t2.forwardEvent)(this._renderer.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas)), this.register((0, t2.forwardEvent)(this._renderer.onRemoveTextureAtlasCanvas, this._onRemoveTextureAtlasCanvas)), l.setRenderer(this._renderer), this.register((0, r.toDisposable)(() => {
            const t3 = this._terminal._core._renderService;
            t3.setRenderer(this._terminal._core._createRenderer()), t3.handleResize(e3.cols, e3.rows);
          }));
        }
        get textureAtlas() {
          return this._renderer?.textureAtlas;
        }
        clearTextureAtlas() {
          this._renderer?.clearTextureAtlas();
        }
      }
      e2.WebglAddon = h;
    })(), s15;
  })());
});

// node_modules/@xterm/addon-canvas/lib/addon-canvas.js
var require_addon_canvas = __commonJS((exports, module) => {
  (function(e, t) {
    typeof exports == "object" && typeof module == "object" ? module.exports = t() : typeof define == "function" && define.amd ? define([], t) : typeof exports == "object" ? exports.CanvasAddon = t() : e.CanvasAddon = t();
  })(self, () => (() => {
    var e = { 903: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.BaseRenderLayer = undefined;
      const s16 = i2(274), r = i2(627), o = i2(237), n = i2(860), a = i2(374), h = i2(296), l = i2(345), c = i2(859), d = i2(399), _ = i2(855);

      class u extends c.Disposable {
        get canvas() {
          return this._canvas;
        }
        get cacheCanvas() {
          return this._charAtlas?.pages[0].canvas;
        }
        constructor(e3, t3, i3, r2, o2, n2, a2, d2, _2, u2) {
          super(), this._terminal = e3, this._container = t3, this._alpha = o2, this._themeService = n2, this._bufferService = a2, this._optionsService = d2, this._decorationService = _2, this._coreBrowserService = u2, this._deviceCharWidth = 0, this._deviceCharHeight = 0, this._deviceCellWidth = 0, this._deviceCellHeight = 0, this._deviceCharLeft = 0, this._deviceCharTop = 0, this._selectionModel = (0, h.createSelectionRenderModel)(), this._bitmapGenerator = [], this._charAtlasDisposable = this.register(new c.MutableDisposable), this._onAddTextureAtlasCanvas = this.register(new l.EventEmitter), this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event, this._cellColorResolver = new s16.CellColorResolver(this._terminal, this._optionsService, this._selectionModel, this._decorationService, this._coreBrowserService, this._themeService), this._canvas = this._coreBrowserService.mainDocument.createElement("canvas"), this._canvas.classList.add(`xterm-${i3}-layer`), this._canvas.style.zIndex = r2.toString(), this._initCanvas(), this._container.appendChild(this._canvas), this._refreshCharAtlas(this._themeService.colors), this.register(this._themeService.onChangeColors((e4) => {
            this._refreshCharAtlas(e4), this.reset(), this.handleSelectionChanged(this._selectionModel.selectionStart, this._selectionModel.selectionEnd, this._selectionModel.columnSelectMode);
          })), this.register((0, c.toDisposable)(() => {
            this._canvas.remove();
          }));
        }
        _initCanvas() {
          this._ctx = (0, a.throwIfFalsy)(this._canvas.getContext("2d", { alpha: this._alpha })), this._alpha || this._clearAll();
        }
        handleBlur() {}
        handleFocus() {}
        handleCursorMove() {}
        handleGridChanged(e3, t3) {}
        handleSelectionChanged(e3, t3, i3 = false) {
          this._selectionModel.update(this._terminal._core, e3, t3, i3);
        }
        _setTransparency(e3) {
          if (e3 === this._alpha)
            return;
          const t3 = this._canvas;
          this._alpha = e3, this._canvas = this._canvas.cloneNode(), this._initCanvas(), this._container.replaceChild(this._canvas, t3), this._refreshCharAtlas(this._themeService.colors), this.handleGridChanged(0, this._bufferService.rows - 1);
        }
        _refreshCharAtlas(e3) {
          if (!(this._deviceCharWidth <= 0 && this._deviceCharHeight <= 0)) {
            this._charAtlas = (0, r.acquireTextureAtlas)(this._terminal, this._optionsService.rawOptions, e3, this._deviceCellWidth, this._deviceCellHeight, this._deviceCharWidth, this._deviceCharHeight, this._coreBrowserService.dpr), this._charAtlasDisposable.value = (0, l.forwardEvent)(this._charAtlas.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas), this._charAtlas.warmUp();
            for (let e4 = 0;e4 < this._charAtlas.pages.length; e4++)
              this._bitmapGenerator[e4] = new g(this._charAtlas.pages[e4].canvas);
          }
        }
        resize(e3) {
          this._deviceCellWidth = e3.device.cell.width, this._deviceCellHeight = e3.device.cell.height, this._deviceCharWidth = e3.device.char.width, this._deviceCharHeight = e3.device.char.height, this._deviceCharLeft = e3.device.char.left, this._deviceCharTop = e3.device.char.top, this._canvas.width = e3.device.canvas.width, this._canvas.height = e3.device.canvas.height, this._canvas.style.width = `${e3.css.canvas.width}px`, this._canvas.style.height = `${e3.css.canvas.height}px`, this._alpha || this._clearAll(), this._refreshCharAtlas(this._themeService.colors);
        }
        clearTextureAtlas() {
          this._charAtlas?.clearTexture();
        }
        _fillCells(e3, t3, i3, s17) {
          this._ctx.fillRect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, i3 * this._deviceCellWidth, s17 * this._deviceCellHeight);
        }
        _fillMiddleLineAtCells(e3, t3, i3 = 1) {
          const s17 = Math.ceil(0.5 * this._deviceCellHeight);
          this._ctx.fillRect(e3 * this._deviceCellWidth, (t3 + 1) * this._deviceCellHeight - s17 - this._coreBrowserService.dpr, i3 * this._deviceCellWidth, this._coreBrowserService.dpr);
        }
        _fillBottomLineAtCells(e3, t3, i3 = 1, s17 = 0) {
          this._ctx.fillRect(e3 * this._deviceCellWidth, (t3 + 1) * this._deviceCellHeight + s17 - this._coreBrowserService.dpr - 1, i3 * this._deviceCellWidth, this._coreBrowserService.dpr);
        }
        _curlyUnderlineAtCell(e3, t3, i3 = 1) {
          this._ctx.save(), this._ctx.beginPath(), this._ctx.strokeStyle = this._ctx.fillStyle;
          const s17 = this._coreBrowserService.dpr;
          this._ctx.lineWidth = s17;
          for (let r2 = 0;r2 < i3; r2++) {
            const i4 = (e3 + r2) * this._deviceCellWidth, o2 = (e3 + r2 + 0.5) * this._deviceCellWidth, n2 = (e3 + r2 + 1) * this._deviceCellWidth, a2 = (t3 + 1) * this._deviceCellHeight - s17 - 1, h2 = a2 - s17, l2 = a2 + s17;
            this._ctx.moveTo(i4, a2), this._ctx.bezierCurveTo(i4, h2, o2, h2, o2, a2), this._ctx.bezierCurveTo(o2, l2, n2, l2, n2, a2);
          }
          this._ctx.stroke(), this._ctx.restore();
        }
        _dottedUnderlineAtCell(e3, t3, i3 = 1) {
          this._ctx.save(), this._ctx.beginPath(), this._ctx.strokeStyle = this._ctx.fillStyle;
          const s17 = this._coreBrowserService.dpr;
          this._ctx.lineWidth = s17, this._ctx.setLineDash([2 * s17, s17]);
          const r2 = e3 * this._deviceCellWidth, o2 = (t3 + 1) * this._deviceCellHeight - s17 - 1;
          this._ctx.moveTo(r2, o2);
          for (let t4 = 0;t4 < i3; t4++) {
            const s18 = (e3 + i3 + t4) * this._deviceCellWidth;
            this._ctx.lineTo(s18, o2);
          }
          this._ctx.stroke(), this._ctx.closePath(), this._ctx.restore();
        }
        _dashedUnderlineAtCell(e3, t3, i3 = 1) {
          this._ctx.save(), this._ctx.beginPath(), this._ctx.strokeStyle = this._ctx.fillStyle;
          const s17 = this._coreBrowserService.dpr;
          this._ctx.lineWidth = s17, this._ctx.setLineDash([4 * s17, 3 * s17]);
          const r2 = e3 * this._deviceCellWidth, o2 = (e3 + i3) * this._deviceCellWidth, n2 = (t3 + 1) * this._deviceCellHeight - s17 - 1;
          this._ctx.moveTo(r2, n2), this._ctx.lineTo(o2, n2), this._ctx.stroke(), this._ctx.closePath(), this._ctx.restore();
        }
        _fillLeftLineAtCell(e3, t3, i3) {
          this._ctx.fillRect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, this._coreBrowserService.dpr * i3, this._deviceCellHeight);
        }
        _strokeRectAtCell(e3, t3, i3, s17) {
          const r2 = this._coreBrowserService.dpr;
          this._ctx.lineWidth = r2, this._ctx.strokeRect(e3 * this._deviceCellWidth + r2 / 2, t3 * this._deviceCellHeight + r2 / 2, i3 * this._deviceCellWidth - r2, s17 * this._deviceCellHeight - r2);
        }
        _clearAll() {
          this._alpha ? this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height) : (this._ctx.fillStyle = this._themeService.colors.background.css, this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height));
        }
        _clearCells(e3, t3, i3, s17) {
          this._alpha ? this._ctx.clearRect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, i3 * this._deviceCellWidth, s17 * this._deviceCellHeight) : (this._ctx.fillStyle = this._themeService.colors.background.css, this._ctx.fillRect(e3 * this._deviceCellWidth, t3 * this._deviceCellHeight, i3 * this._deviceCellWidth, s17 * this._deviceCellHeight));
        }
        _fillCharTrueColor(e3, t3, i3) {
          this._ctx.font = this._getFont(false, false), this._ctx.textBaseline = o.TEXT_BASELINE, this._clipRow(i3);
          let s17 = false;
          this._optionsService.rawOptions.customGlyphs !== false && (s17 = (0, n.tryDrawCustomChar)(this._ctx, e3.getChars(), t3 * this._deviceCellWidth, i3 * this._deviceCellHeight, this._deviceCellWidth, this._deviceCellHeight, this._optionsService.rawOptions.fontSize, this._coreBrowserService.dpr)), s17 || this._ctx.fillText(e3.getChars(), t3 * this._deviceCellWidth + this._deviceCharLeft, i3 * this._deviceCellHeight + this._deviceCharTop + this._deviceCharHeight);
        }
        _drawChars(e3, t3, i3) {
          const s17 = e3.getChars(), r2 = e3.getCode(), o2 = e3.getWidth();
          if (this._cellColorResolver.resolve(e3, t3, this._bufferService.buffer.ydisp + i3, this._deviceCellWidth), !this._charAtlas)
            return;
          let n2;
          if (n2 = s17 && s17.length > 1 ? this._charAtlas.getRasterizedGlyphCombinedChar(s17, this._cellColorResolver.result.bg, this._cellColorResolver.result.fg, this._cellColorResolver.result.ext, true) : this._charAtlas.getRasterizedGlyph(e3.getCode() || _.WHITESPACE_CELL_CODE, this._cellColorResolver.result.bg, this._cellColorResolver.result.fg, this._cellColorResolver.result.ext, true), !n2.size.x || !n2.size.y)
            return;
          this._ctx.save(), this._clipRow(i3), this._bitmapGenerator[n2.texturePage] && this._charAtlas.pages[n2.texturePage].canvas !== this._bitmapGenerator[n2.texturePage].canvas && (this._bitmapGenerator[n2.texturePage]?.bitmap?.close(), delete this._bitmapGenerator[n2.texturePage]), this._charAtlas.pages[n2.texturePage].version !== this._bitmapGenerator[n2.texturePage]?.version && (this._bitmapGenerator[n2.texturePage] || (this._bitmapGenerator[n2.texturePage] = new g(this._charAtlas.pages[n2.texturePage].canvas)), this._bitmapGenerator[n2.texturePage].refresh(), this._bitmapGenerator[n2.texturePage].version = this._charAtlas.pages[n2.texturePage].version);
          let h2 = n2.size.x;
          this._optionsService.rawOptions.rescaleOverlappingGlyphs && (0, a.allowRescaling)(r2, o2, n2.size.x, this._deviceCellWidth) && (h2 = this._deviceCellWidth - 1), this._ctx.drawImage(this._bitmapGenerator[n2.texturePage]?.bitmap || this._charAtlas.pages[n2.texturePage].canvas, n2.texturePosition.x, n2.texturePosition.y, n2.size.x, n2.size.y, t3 * this._deviceCellWidth + this._deviceCharLeft - n2.offset.x, i3 * this._deviceCellHeight + this._deviceCharTop - n2.offset.y, h2, n2.size.y), this._ctx.restore();
        }
        _clipRow(e3) {
          this._ctx.beginPath(), this._ctx.rect(0, e3 * this._deviceCellHeight, this._bufferService.cols * this._deviceCellWidth, this._deviceCellHeight), this._ctx.clip();
        }
        _getFont(e3, t3) {
          return `${t3 ? "italic" : ""} ${e3 ? this._optionsService.rawOptions.fontWeightBold : this._optionsService.rawOptions.fontWeight} ${this._optionsService.rawOptions.fontSize * this._coreBrowserService.dpr}px ${this._optionsService.rawOptions.fontFamily}`;
        }
      }
      t2.BaseRenderLayer = u;

      class g {
        get bitmap() {
          return this._bitmap;
        }
        constructor(e3) {
          this.canvas = e3, this._state = 0, this._commitTimeout = undefined, this._bitmap = undefined, this.version = -1;
        }
        refresh() {
          this._bitmap?.close(), this._bitmap = undefined, d.isSafari || (this._commitTimeout === undefined && (this._commitTimeout = window.setTimeout(() => this._generate(), 100)), this._state === 1 && (this._state = 2));
        }
        _generate() {
          this._state === 0 && (this._bitmap?.close(), this._bitmap = undefined, this._state = 1, window.createImageBitmap(this.canvas).then((e3) => {
            this._state === 2 ? this.refresh() : this._bitmap = e3, this._state = 0;
          }), this._commitTimeout && (this._commitTimeout = undefined));
        }
      }
    }, 949: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.CanvasRenderer = undefined;
      const s16 = i2(627), r = i2(56), o = i2(374), n = i2(345), a = i2(859), h = i2(873), l = i2(43), c = i2(630), d = i2(744);

      class _ extends a.Disposable {
        constructor(e3, t3, i3, _2, u, g, f, v2, C2, p, m) {
          super(), this._terminal = e3, this._screenElement = t3, this._bufferService = _2, this._charSizeService = u, this._optionsService = g, this._coreBrowserService = C2, this._themeService = m, this._observerDisposable = this.register(new a.MutableDisposable), this._onRequestRedraw = this.register(new n.EventEmitter), this.onRequestRedraw = this._onRequestRedraw.event, this._onChangeTextureAtlas = this.register(new n.EventEmitter), this.onChangeTextureAtlas = this._onChangeTextureAtlas.event, this._onAddTextureAtlasCanvas = this.register(new n.EventEmitter), this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event;
          const x = this._optionsService.rawOptions.allowTransparency;
          this._renderLayers = [new d.TextRenderLayer(this._terminal, this._screenElement, 0, x, this._bufferService, this._optionsService, f, p, this._coreBrowserService, m), new c.SelectionRenderLayer(this._terminal, this._screenElement, 1, this._bufferService, this._coreBrowserService, p, this._optionsService, m), new l.LinkRenderLayer(this._terminal, this._screenElement, 2, i3, this._bufferService, this._optionsService, p, this._coreBrowserService, m), new h.CursorRenderLayer(this._terminal, this._screenElement, 3, this._onRequestRedraw, this._bufferService, this._optionsService, v2, this._coreBrowserService, p, m)];
          for (const e4 of this._renderLayers)
            (0, n.forwardEvent)(e4.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas);
          this.dimensions = (0, o.createRenderDimensions)(), this._devicePixelRatio = this._coreBrowserService.dpr, this._updateDimensions(), this._observerDisposable.value = (0, r.observeDevicePixelDimensions)(this._renderLayers[0].canvas, this._coreBrowserService.window, (e4, t4) => this._setCanvasDevicePixelDimensions(e4, t4)), this.register(this._coreBrowserService.onWindowChange((e4) => {
            this._observerDisposable.value = (0, r.observeDevicePixelDimensions)(this._renderLayers[0].canvas, e4, (e5, t4) => this._setCanvasDevicePixelDimensions(e5, t4));
          })), this.register((0, a.toDisposable)(() => {
            for (const e4 of this._renderLayers)
              e4.dispose();
            (0, s16.removeTerminalFromCache)(this._terminal);
          }));
        }
        get textureAtlas() {
          return this._renderLayers[0].cacheCanvas;
        }
        handleDevicePixelRatioChange() {
          this._devicePixelRatio !== this._coreBrowserService.dpr && (this._devicePixelRatio = this._coreBrowserService.dpr, this.handleResize(this._bufferService.cols, this._bufferService.rows));
        }
        handleResize(e3, t3) {
          this._updateDimensions();
          for (const e4 of this._renderLayers)
            e4.resize(this.dimensions);
          this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`, this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`;
        }
        handleCharSizeChanged() {
          this.handleResize(this._bufferService.cols, this._bufferService.rows);
        }
        handleBlur() {
          this._runOperation((e3) => e3.handleBlur());
        }
        handleFocus() {
          this._runOperation((e3) => e3.handleFocus());
        }
        handleSelectionChanged(e3, t3, i3 = false) {
          this._runOperation((s17) => s17.handleSelectionChanged(e3, t3, i3)), this._themeService.colors.selectionForeground && this._onRequestRedraw.fire({ start: 0, end: this._bufferService.rows - 1 });
        }
        handleCursorMove() {
          this._runOperation((e3) => e3.handleCursorMove());
        }
        clear() {
          this._runOperation((e3) => e3.reset());
        }
        _runOperation(e3) {
          for (const t3 of this._renderLayers)
            e3(t3);
        }
        renderRows(e3, t3) {
          for (const i3 of this._renderLayers)
            i3.handleGridChanged(e3, t3);
        }
        clearTextureAtlas() {
          for (const e3 of this._renderLayers)
            e3.clearTextureAtlas();
        }
        _updateDimensions() {
          if (!this._charSizeService.hasValidSize)
            return;
          const e3 = this._coreBrowserService.dpr;
          this.dimensions.device.char.width = Math.floor(this._charSizeService.width * e3), this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * e3), this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight), this.dimensions.device.char.top = this._optionsService.rawOptions.lineHeight === 1 ? 0 : Math.round((this.dimensions.device.cell.height - this.dimensions.device.char.height) / 2), this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing), this.dimensions.device.char.left = Math.floor(this._optionsService.rawOptions.letterSpacing / 2), this.dimensions.device.canvas.height = this._bufferService.rows * this.dimensions.device.cell.height, this.dimensions.device.canvas.width = this._bufferService.cols * this.dimensions.device.cell.width, this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / e3), this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / e3), this.dimensions.css.cell.height = this.dimensions.css.canvas.height / this._bufferService.rows, this.dimensions.css.cell.width = this.dimensions.css.canvas.width / this._bufferService.cols;
        }
        _setCanvasDevicePixelDimensions(e3, t3) {
          this.dimensions.device.canvas.height = t3, this.dimensions.device.canvas.width = e3;
          for (const e4 of this._renderLayers)
            e4.resize(this.dimensions);
          this._requestRedrawViewport();
        }
        _requestRedrawViewport() {
          this._onRequestRedraw.fire({ start: 0, end: this._bufferService.rows - 1 });
        }
      }
      t2.CanvasRenderer = _;
    }, 873: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.CursorRenderLayer = undefined;
      const s16 = i2(457), r = i2(859), o = i2(399), n = i2(782), a = i2(903);

      class h extends a.BaseRenderLayer {
        constructor(e3, t3, i3, s17, o2, a2, h2, l, c, d) {
          super(e3, t3, "cursor", i3, true, d, o2, a2, c, l), this._onRequestRedraw = s17, this._coreService = h2, this._cursorBlinkStateManager = this.register(new r.MutableDisposable), this._cell = new n.CellData, this._state = { x: 0, y: 0, isFocused: false, style: "", width: 0 }, this._cursorRenderers = { bar: this._renderBarCursor.bind(this), block: this._renderBlockCursor.bind(this), underline: this._renderUnderlineCursor.bind(this), outline: this._renderOutlineCursor.bind(this) }, this.register(a2.onOptionChange(() => this._handleOptionsChanged())), this._handleOptionsChanged();
        }
        resize(e3) {
          super.resize(e3), this._state = { x: 0, y: 0, isFocused: false, style: "", width: 0 };
        }
        reset() {
          this._clearCursor(), this._cursorBlinkStateManager.value?.restartBlinkAnimation(), this._handleOptionsChanged();
        }
        handleBlur() {
          this._cursorBlinkStateManager.value?.pause(), this._onRequestRedraw.fire({ start: this._bufferService.buffer.y, end: this._bufferService.buffer.y });
        }
        handleFocus() {
          this._cursorBlinkStateManager.value?.resume(), this._onRequestRedraw.fire({ start: this._bufferService.buffer.y, end: this._bufferService.buffer.y });
        }
        _handleOptionsChanged() {
          this._optionsService.rawOptions.cursorBlink ? this._cursorBlinkStateManager.value || (this._cursorBlinkStateManager.value = new s16.CursorBlinkStateManager(() => this._render(true), this._coreBrowserService)) : this._cursorBlinkStateManager.clear(), this._onRequestRedraw.fire({ start: this._bufferService.buffer.y, end: this._bufferService.buffer.y });
        }
        handleCursorMove() {
          this._cursorBlinkStateManager.value?.restartBlinkAnimation();
        }
        handleGridChanged(e3, t3) {
          !this._cursorBlinkStateManager.value || this._cursorBlinkStateManager.value.isPaused ? this._render(false) : this._cursorBlinkStateManager.value.restartBlinkAnimation();
        }
        _render(e3) {
          if (!this._coreService.isCursorInitialized || this._coreService.isCursorHidden)
            return void this._clearCursor();
          const t3 = this._bufferService.buffer.ybase + this._bufferService.buffer.y, i3 = t3 - this._bufferService.buffer.ydisp;
          if (i3 < 0 || i3 >= this._bufferService.rows)
            return void this._clearCursor();
          const s17 = Math.min(this._bufferService.buffer.x, this._bufferService.cols - 1);
          if (this._bufferService.buffer.lines.get(t3).loadCell(s17, this._cell), this._cell.content !== undefined) {
            if (!this._coreBrowserService.isFocused) {
              this._clearCursor(), this._ctx.save(), this._ctx.fillStyle = this._themeService.colors.cursor.css;
              const e4 = this._optionsService.rawOptions.cursorStyle, t4 = this._optionsService.rawOptions.cursorInactiveStyle;
              return t4 && t4 !== "none" && this._cursorRenderers[t4](s17, i3, this._cell), this._ctx.restore(), this._state.x = s17, this._state.y = i3, this._state.isFocused = false, this._state.style = e4, void (this._state.width = this._cell.getWidth());
            }
            if (!this._cursorBlinkStateManager.value || this._cursorBlinkStateManager.value.isCursorVisible) {
              if (this._state) {
                if (this._state.x === s17 && this._state.y === i3 && this._state.isFocused === this._coreBrowserService.isFocused && this._state.style === this._optionsService.rawOptions.cursorStyle && this._state.width === this._cell.getWidth())
                  return;
                this._clearCursor();
              }
              this._ctx.save(), this._cursorRenderers[this._optionsService.rawOptions.cursorStyle || "block"](s17, i3, this._cell), this._ctx.restore(), this._state.x = s17, this._state.y = i3, this._state.isFocused = false, this._state.style = this._optionsService.rawOptions.cursorStyle, this._state.width = this._cell.getWidth();
            } else
              this._clearCursor();
          }
        }
        _clearCursor() {
          this._state && (o.isFirefox || this._coreBrowserService.dpr < 1 ? this._clearAll() : this._clearCells(this._state.x, this._state.y, this._state.width, 1), this._state = { x: 0, y: 0, isFocused: false, style: "", width: 0 });
        }
        _renderBarCursor(e3, t3, i3) {
          this._ctx.save(), this._ctx.fillStyle = this._themeService.colors.cursor.css, this._fillLeftLineAtCell(e3, t3, this._optionsService.rawOptions.cursorWidth), this._ctx.restore();
        }
        _renderBlockCursor(e3, t3, i3) {
          this._ctx.save(), this._ctx.fillStyle = this._themeService.colors.cursor.css, this._fillCells(e3, t3, i3.getWidth(), 1), this._ctx.fillStyle = this._themeService.colors.cursorAccent.css, this._fillCharTrueColor(i3, e3, t3), this._ctx.restore();
        }
        _renderUnderlineCursor(e3, t3, i3) {
          this._ctx.save(), this._ctx.fillStyle = this._themeService.colors.cursor.css, this._fillBottomLineAtCells(e3, t3), this._ctx.restore();
        }
        _renderOutlineCursor(e3, t3, i3) {
          this._ctx.save(), this._ctx.strokeStyle = this._themeService.colors.cursor.css, this._strokeRectAtCell(e3, t3, i3.getWidth(), 1), this._ctx.restore();
        }
      }
      t2.CursorRenderLayer = h;
    }, 574: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.GridCache = undefined, t2.GridCache = class {
        constructor() {
          this.cache = [];
        }
        resize(e3, t3) {
          for (let i2 = 0;i2 < e3; i2++) {
            this.cache.length <= i2 && this.cache.push([]);
            for (let e4 = this.cache[i2].length;e4 < t3; e4++)
              this.cache[i2].push(undefined);
            this.cache[i2].length = t3;
          }
          this.cache.length = e3;
        }
        clear() {
          for (let e3 = 0;e3 < this.cache.length; e3++)
            for (let t3 = 0;t3 < this.cache[e3].length; t3++)
              this.cache[e3][t3] = undefined;
        }
      };
    }, 43: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.LinkRenderLayer = undefined;
      const s16 = i2(197), r = i2(237), o = i2(903);

      class n extends o.BaseRenderLayer {
        constructor(e3, t3, i3, s17, r2, o2, n2, a, h) {
          super(e3, t3, "link", i3, true, h, r2, o2, n2, a), this.register(s17.onShowLinkUnderline((e4) => this._handleShowLinkUnderline(e4))), this.register(s17.onHideLinkUnderline((e4) => this._handleHideLinkUnderline(e4)));
        }
        resize(e3) {
          super.resize(e3), this._state = undefined;
        }
        reset() {
          this._clearCurrentLink();
        }
        _clearCurrentLink() {
          if (this._state) {
            this._clearCells(this._state.x1, this._state.y1, this._state.cols - this._state.x1, 1);
            const e3 = this._state.y2 - this._state.y1 - 1;
            e3 > 0 && this._clearCells(0, this._state.y1 + 1, this._state.cols, e3), this._clearCells(0, this._state.y2, this._state.x2, 1), this._state = undefined;
          }
        }
        _handleShowLinkUnderline(e3) {
          if (e3.fg === r.INVERTED_DEFAULT_COLOR ? this._ctx.fillStyle = this._themeService.colors.background.css : e3.fg && (0, s16.is256Color)(e3.fg) ? this._ctx.fillStyle = this._themeService.colors.ansi[e3.fg].css : this._ctx.fillStyle = this._themeService.colors.foreground.css, e3.y1 === e3.y2)
            this._fillBottomLineAtCells(e3.x1, e3.y1, e3.x2 - e3.x1);
          else {
            this._fillBottomLineAtCells(e3.x1, e3.y1, e3.cols - e3.x1);
            for (let t3 = e3.y1 + 1;t3 < e3.y2; t3++)
              this._fillBottomLineAtCells(0, t3, e3.cols);
            this._fillBottomLineAtCells(0, e3.y2, e3.x2);
          }
          this._state = e3;
        }
        _handleHideLinkUnderline(e3) {
          this._clearCurrentLink();
        }
      }
      t2.LinkRenderLayer = n;
    }, 630: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.SelectionRenderLayer = undefined;
      const s16 = i2(903);

      class r extends s16.BaseRenderLayer {
        constructor(e3, t3, i3, s17, r2, o, n, a) {
          super(e3, t3, "selection", i3, true, a, s17, n, o, r2), this._clearState();
        }
        _clearState() {
          this._state = { start: undefined, end: undefined, columnSelectMode: undefined, ydisp: undefined };
        }
        resize(e3) {
          super.resize(e3), this._selectionModel.selectionStart && this._selectionModel.selectionEnd && (this._clearState(), this._redrawSelection(this._selectionModel.selectionStart, this._selectionModel.selectionEnd, this._selectionModel.columnSelectMode));
        }
        reset() {
          this._state.start && this._state.end && (this._clearState(), this._clearAll());
        }
        handleBlur() {
          this.reset(), this._redrawSelection(this._selectionModel.selectionStart, this._selectionModel.selectionEnd, this._selectionModel.columnSelectMode);
        }
        handleFocus() {
          this.reset(), this._redrawSelection(this._selectionModel.selectionStart, this._selectionModel.selectionEnd, this._selectionModel.columnSelectMode);
        }
        handleSelectionChanged(e3, t3, i3) {
          super.handleSelectionChanged(e3, t3, i3), this._redrawSelection(e3, t3, i3);
        }
        _redrawSelection(e3, t3, i3) {
          if (!this._didStateChange(e3, t3, i3, this._bufferService.buffer.ydisp))
            return;
          if (this._clearAll(), !e3 || !t3)
            return void this._clearState();
          const s17 = e3[1] - this._bufferService.buffer.ydisp, r2 = t3[1] - this._bufferService.buffer.ydisp, o = Math.max(s17, 0), n = Math.min(r2, this._bufferService.rows - 1);
          if (o >= this._bufferService.rows || n < 0)
            this._state.ydisp = this._bufferService.buffer.ydisp;
          else {
            if (this._ctx.fillStyle = (this._coreBrowserService.isFocused ? this._themeService.colors.selectionBackgroundTransparent : this._themeService.colors.selectionInactiveBackgroundTransparent).css, i3) {
              const i4 = e3[0], s18 = t3[0] - i4, r3 = n - o + 1;
              this._fillCells(i4, o, s18, r3);
            } else {
              const i4 = s17 === o ? e3[0] : 0, a = o === r2 ? t3[0] : this._bufferService.cols;
              this._fillCells(i4, o, a - i4, 1);
              const h = Math.max(n - o - 1, 0);
              if (this._fillCells(0, o + 1, this._bufferService.cols, h), o !== n) {
                const e4 = r2 === n ? t3[0] : this._bufferService.cols;
                this._fillCells(0, n, e4, 1);
              }
            }
            this._state.start = [e3[0], e3[1]], this._state.end = [t3[0], t3[1]], this._state.columnSelectMode = i3, this._state.ydisp = this._bufferService.buffer.ydisp;
          }
        }
        _didStateChange(e3, t3, i3, s17) {
          return !this._areCoordinatesEqual(e3, this._state.start) || !this._areCoordinatesEqual(t3, this._state.end) || i3 !== this._state.columnSelectMode || s17 !== this._state.ydisp;
        }
        _areCoordinatesEqual(e3, t3) {
          return !(!e3 || !t3) && e3[0] === t3[0] && e3[1] === t3[1];
        }
      }
      t2.SelectionRenderLayer = r;
    }, 744: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.TextRenderLayer = undefined;
      const s16 = i2(577), r = i2(147), o = i2(782), n = i2(855), a = i2(903), h = i2(574);

      class l extends a.BaseRenderLayer {
        constructor(e3, t3, i3, s17, r2, n2, a2, l2, c, d) {
          super(e3, t3, "text", i3, s17, d, r2, n2, l2, c), this._characterJoinerService = a2, this._characterWidth = 0, this._characterFont = "", this._characterOverlapCache = {}, this._workCell = new o.CellData, this._state = new h.GridCache, this.register(n2.onSpecificOptionChange("allowTransparency", (e4) => this._setTransparency(e4)));
        }
        resize(e3) {
          super.resize(e3);
          const t3 = this._getFont(false, false);
          this._characterWidth === e3.device.char.width && this._characterFont === t3 || (this._characterWidth = e3.device.char.width, this._characterFont = t3, this._characterOverlapCache = {}), this._state.clear(), this._state.resize(this._bufferService.cols, this._bufferService.rows);
        }
        reset() {
          this._state.clear(), this._clearAll();
        }
        _forEachCell(e3, t3, i3) {
          for (let r2 = e3;r2 <= t3; r2++) {
            const e4 = r2 + this._bufferService.buffer.ydisp, t4 = this._bufferService.buffer.lines.get(e4), o2 = this._characterJoinerService.getJoinedCharacters(e4);
            for (let e5 = 0;e5 < this._bufferService.cols; e5++) {
              t4.loadCell(e5, this._workCell);
              let a2 = this._workCell, h2 = false, l2 = e5;
              if (a2.getWidth() !== 0) {
                if (o2.length > 0 && e5 === o2[0][0]) {
                  h2 = true;
                  const e6 = o2.shift();
                  a2 = new s16.JoinedCellData(this._workCell, t4.translateToString(true, e6[0], e6[1]), e6[1] - e6[0]), l2 = e6[1] - 1;
                }
                !h2 && this._isOverlapping(a2) && l2 < t4.length - 1 && t4.getCodePoint(l2 + 1) === n.NULL_CELL_CODE && (a2.content &= -12582913, a2.content |= 2 << 22), i3(a2, e5, r2), e5 = l2;
              }
            }
          }
        }
        _drawBackground(e3, t3) {
          const i3 = this._ctx, s17 = this._bufferService.cols;
          let o2 = 0, n2 = 0, a2 = null;
          i3.save(), this._forEachCell(e3, t3, (e4, t4, h2) => {
            let l2 = null;
            e4.isInverse() ? l2 = e4.isFgDefault() ? this._themeService.colors.foreground.css : e4.isFgRGB() ? `rgb(${r.AttributeData.toColorRGB(e4.getFgColor()).join(",")})` : this._themeService.colors.ansi[e4.getFgColor()].css : e4.isBgRGB() ? l2 = `rgb(${r.AttributeData.toColorRGB(e4.getBgColor()).join(",")})` : e4.isBgPalette() && (l2 = this._themeService.colors.ansi[e4.getBgColor()].css);
            let c = false;
            this._decorationService.forEachDecorationAtCell(t4, this._bufferService.buffer.ydisp + h2, undefined, (e5) => {
              e5.options.layer !== "top" && c || (e5.backgroundColorRGB && (l2 = e5.backgroundColorRGB.css), c = e5.options.layer === "top");
            }), a2 === null && (o2 = t4, n2 = h2), h2 !== n2 ? (i3.fillStyle = a2 || "", this._fillCells(o2, n2, s17 - o2, 1), o2 = t4, n2 = h2) : a2 !== l2 && (i3.fillStyle = a2 || "", this._fillCells(o2, n2, t4 - o2, 1), o2 = t4, n2 = h2), a2 = l2;
          }), a2 !== null && (i3.fillStyle = a2, this._fillCells(o2, n2, s17 - o2, 1)), i3.restore();
        }
        _drawForeground(e3, t3) {
          this._forEachCell(e3, t3, (e4, t4, i3) => this._drawChars(e4, t4, i3));
        }
        handleGridChanged(e3, t3) {
          this._state.cache.length !== 0 && (this._charAtlas && this._charAtlas.beginFrame(), this._clearCells(0, e3, this._bufferService.cols, t3 - e3 + 1), this._drawBackground(e3, t3), this._drawForeground(e3, t3));
        }
        _isOverlapping(e3) {
          if (e3.getWidth() !== 1)
            return false;
          if (e3.getCode() < 256)
            return false;
          const t3 = e3.getChars();
          if (this._characterOverlapCache.hasOwnProperty(t3))
            return this._characterOverlapCache[t3];
          this._ctx.save(), this._ctx.font = this._characterFont;
          const i3 = Math.floor(this._ctx.measureText(t3).width) > this._characterWidth;
          return this._ctx.restore(), this._characterOverlapCache[t3] = i3, i3;
        }
      }
      t2.TextRenderLayer = l;
    }, 274: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.CellColorResolver = undefined;
      const s16 = i2(855), r = i2(160), o = i2(374);
      let n, a = 0, h = 0, l = false, c = false, d = false, _ = 0;
      t2.CellColorResolver = class {
        constructor(e3, t3, i3, s17, r2, o2) {
          this._terminal = e3, this._optionService = t3, this._selectionRenderModel = i3, this._decorationService = s17, this._coreBrowserService = r2, this._themeService = o2, this.result = { fg: 0, bg: 0, ext: 0 };
        }
        resolve(e3, t3, i3, u) {
          if (this.result.bg = e3.bg, this.result.fg = e3.fg, this.result.ext = 268435456 & e3.bg ? e3.extended.ext : 0, h = 0, a = 0, c = false, l = false, d = false, n = this._themeService.colors, _ = 0, e3.getCode() !== s16.NULL_CELL_CODE && e3.extended.underlineStyle === 4) {
            const e4 = Math.max(1, Math.floor(this._optionService.rawOptions.fontSize * this._coreBrowserService.dpr / 15));
            _ = t3 * u % (2 * Math.round(e4));
          }
          if (this._decorationService.forEachDecorationAtCell(t3, i3, "bottom", (e4) => {
            e4.backgroundColorRGB && (h = e4.backgroundColorRGB.rgba >> 8 & 16777215, c = true), e4.foregroundColorRGB && (a = e4.foregroundColorRGB.rgba >> 8 & 16777215, l = true);
          }), d = this._selectionRenderModel.isCellSelected(this._terminal, t3, i3), d) {
            if (67108864 & this.result.fg || (50331648 & this.result.bg) != 0) {
              if (67108864 & this.result.fg)
                switch (50331648 & this.result.fg) {
                  case 16777216:
                  case 33554432:
                    h = this._themeService.colors.ansi[255 & this.result.fg].rgba;
                    break;
                  case 50331648:
                    h = (16777215 & this.result.fg) << 8 | 255;
                    break;
                  default:
                    h = this._themeService.colors.foreground.rgba;
                }
              else
                switch (50331648 & this.result.bg) {
                  case 16777216:
                  case 33554432:
                    h = this._themeService.colors.ansi[255 & this.result.bg].rgba;
                    break;
                  case 50331648:
                    h = (16777215 & this.result.bg) << 8 | 255;
                }
              h = r.rgba.blend(h, 4294967040 & (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba | 128) >> 8 & 16777215;
            } else
              h = (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba >> 8 & 16777215;
            if (c = true, n.selectionForeground && (a = n.selectionForeground.rgba >> 8 & 16777215, l = true), (0, o.treatGlyphAsBackgroundColor)(e3.getCode())) {
              if (67108864 & this.result.fg && (50331648 & this.result.bg) == 0)
                a = (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba >> 8 & 16777215;
              else {
                if (67108864 & this.result.fg)
                  switch (50331648 & this.result.bg) {
                    case 16777216:
                    case 33554432:
                      a = this._themeService.colors.ansi[255 & this.result.bg].rgba;
                      break;
                    case 50331648:
                      a = (16777215 & this.result.bg) << 8 | 255;
                  }
                else
                  switch (50331648 & this.result.fg) {
                    case 16777216:
                    case 33554432:
                      a = this._themeService.colors.ansi[255 & this.result.fg].rgba;
                      break;
                    case 50331648:
                      a = (16777215 & this.result.fg) << 8 | 255;
                      break;
                    default:
                      a = this._themeService.colors.foreground.rgba;
                  }
                a = r.rgba.blend(a, 4294967040 & (this._coreBrowserService.isFocused ? n.selectionBackgroundOpaque : n.selectionInactiveBackgroundOpaque).rgba | 128) >> 8 & 16777215;
              }
              l = true;
            }
          }
          this._decorationService.forEachDecorationAtCell(t3, i3, "top", (e4) => {
            e4.backgroundColorRGB && (h = e4.backgroundColorRGB.rgba >> 8 & 16777215, c = true), e4.foregroundColorRGB && (a = e4.foregroundColorRGB.rgba >> 8 & 16777215, l = true);
          }), c && (h = d ? -16777216 & e3.bg & -134217729 | h | 50331648 : -16777216 & e3.bg | h | 50331648), l && (a = -16777216 & e3.fg & -67108865 | a | 50331648), 67108864 & this.result.fg && (c && !l && (a = (50331648 & this.result.bg) == 0 ? -134217728 & this.result.fg | 16777215 & n.background.rgba >> 8 | 50331648 : -134217728 & this.result.fg | 67108863 & this.result.bg, l = true), !c && l && (h = (50331648 & this.result.fg) == 0 ? -67108864 & this.result.bg | 16777215 & n.foreground.rgba >> 8 | 50331648 : -67108864 & this.result.bg | 67108863 & this.result.fg, c = true)), n = undefined, this.result.bg = c ? h : this.result.bg, this.result.fg = l ? a : this.result.fg, this.result.ext &= 536870911, this.result.ext |= _ << 29 & 3758096384;
        }
      };
    }, 627: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.removeTerminalFromCache = t2.acquireTextureAtlas = undefined;
      const s16 = i2(509), r = i2(197), o = [];
      t2.acquireTextureAtlas = function(e3, t3, i3, n, a, h, l, c) {
        const d = (0, r.generateConfig)(n, a, h, l, t3, i3, c);
        for (let t4 = 0;t4 < o.length; t4++) {
          const i4 = o[t4], s17 = i4.ownedBy.indexOf(e3);
          if (s17 >= 0) {
            if ((0, r.configEquals)(i4.config, d))
              return i4.atlas;
            i4.ownedBy.length === 1 ? (i4.atlas.dispose(), o.splice(t4, 1)) : i4.ownedBy.splice(s17, 1);
            break;
          }
        }
        for (let t4 = 0;t4 < o.length; t4++) {
          const i4 = o[t4];
          if ((0, r.configEquals)(i4.config, d))
            return i4.ownedBy.push(e3), i4.atlas;
        }
        const _ = e3._core, u = { atlas: new s16.TextureAtlas(document, d, _.unicodeService), config: d, ownedBy: [e3] };
        return o.push(u), u.atlas;
      }, t2.removeTerminalFromCache = function(e3) {
        for (let t3 = 0;t3 < o.length; t3++) {
          const i3 = o[t3].ownedBy.indexOf(e3);
          if (i3 !== -1) {
            o[t3].ownedBy.length === 1 ? (o[t3].atlas.dispose(), o.splice(t3, 1)) : o[t3].ownedBy.splice(i3, 1);
            break;
          }
        }
      };
    }, 197: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.is256Color = t2.configEquals = t2.generateConfig = undefined;
      const s16 = i2(160);
      t2.generateConfig = function(e3, t3, i3, r, o, n, a) {
        const h = { foreground: n.foreground, background: n.background, cursor: s16.NULL_COLOR, cursorAccent: s16.NULL_COLOR, selectionForeground: s16.NULL_COLOR, selectionBackgroundTransparent: s16.NULL_COLOR, selectionBackgroundOpaque: s16.NULL_COLOR, selectionInactiveBackgroundTransparent: s16.NULL_COLOR, selectionInactiveBackgroundOpaque: s16.NULL_COLOR, ansi: n.ansi.slice(), contrastCache: n.contrastCache, halfContrastCache: n.halfContrastCache };
        return { customGlyphs: o.customGlyphs, devicePixelRatio: a, letterSpacing: o.letterSpacing, lineHeight: o.lineHeight, deviceCellWidth: e3, deviceCellHeight: t3, deviceCharWidth: i3, deviceCharHeight: r, fontFamily: o.fontFamily, fontSize: o.fontSize, fontWeight: o.fontWeight, fontWeightBold: o.fontWeightBold, allowTransparency: o.allowTransparency, drawBoldTextInBrightColors: o.drawBoldTextInBrightColors, minimumContrastRatio: o.minimumContrastRatio, colors: h };
      }, t2.configEquals = function(e3, t3) {
        for (let i3 = 0;i3 < e3.colors.ansi.length; i3++)
          if (e3.colors.ansi[i3].rgba !== t3.colors.ansi[i3].rgba)
            return false;
        return e3.devicePixelRatio === t3.devicePixelRatio && e3.customGlyphs === t3.customGlyphs && e3.lineHeight === t3.lineHeight && e3.letterSpacing === t3.letterSpacing && e3.fontFamily === t3.fontFamily && e3.fontSize === t3.fontSize && e3.fontWeight === t3.fontWeight && e3.fontWeightBold === t3.fontWeightBold && e3.allowTransparency === t3.allowTransparency && e3.deviceCharWidth === t3.deviceCharWidth && e3.deviceCharHeight === t3.deviceCharHeight && e3.drawBoldTextInBrightColors === t3.drawBoldTextInBrightColors && e3.minimumContrastRatio === t3.minimumContrastRatio && e3.colors.foreground.rgba === t3.colors.foreground.rgba && e3.colors.background.rgba === t3.colors.background.rgba;
      }, t2.is256Color = function(e3) {
        return (50331648 & e3) == 16777216 || (50331648 & e3) == 33554432;
      };
    }, 237: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.TEXT_BASELINE = t2.DIM_OPACITY = t2.INVERTED_DEFAULT_COLOR = undefined;
      const s16 = i2(399);
      t2.INVERTED_DEFAULT_COLOR = 257, t2.DIM_OPACITY = 0.5, t2.TEXT_BASELINE = s16.isFirefox || s16.isLegacyEdge ? "bottom" : "ideographic";
    }, 457: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.CursorBlinkStateManager = undefined;
      t2.CursorBlinkStateManager = class {
        constructor(e3, t3) {
          this._renderCallback = e3, this._coreBrowserService = t3, this.isCursorVisible = true, this._coreBrowserService.isFocused && this._restartInterval();
        }
        get isPaused() {
          return !(this._blinkStartTimeout || this._blinkInterval);
        }
        dispose() {
          this._blinkInterval && (this._coreBrowserService.window.clearInterval(this._blinkInterval), this._blinkInterval = undefined), this._blinkStartTimeout && (this._coreBrowserService.window.clearTimeout(this._blinkStartTimeout), this._blinkStartTimeout = undefined), this._animationFrame && (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), this._animationFrame = undefined);
        }
        restartBlinkAnimation() {
          this.isPaused || (this._animationTimeRestarted = Date.now(), this.isCursorVisible = true, this._animationFrame || (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
            this._renderCallback(), this._animationFrame = undefined;
          })));
        }
        _restartInterval(e3 = 600) {
          this._blinkInterval && (this._coreBrowserService.window.clearInterval(this._blinkInterval), this._blinkInterval = undefined), this._blinkStartTimeout = this._coreBrowserService.window.setTimeout(() => {
            if (this._animationTimeRestarted) {
              const e4 = 600 - (Date.now() - this._animationTimeRestarted);
              if (this._animationTimeRestarted = undefined, e4 > 0)
                return void this._restartInterval(e4);
            }
            this.isCursorVisible = false, this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
              this._renderCallback(), this._animationFrame = undefined;
            }), this._blinkInterval = this._coreBrowserService.window.setInterval(() => {
              if (this._animationTimeRestarted) {
                const e4 = 600 - (Date.now() - this._animationTimeRestarted);
                return this._animationTimeRestarted = undefined, void this._restartInterval(e4);
              }
              this.isCursorVisible = !this.isCursorVisible, this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
                this._renderCallback(), this._animationFrame = undefined;
              });
            }, 600);
          }, e3);
        }
        pause() {
          this.isCursorVisible = true, this._blinkInterval && (this._coreBrowserService.window.clearInterval(this._blinkInterval), this._blinkInterval = undefined), this._blinkStartTimeout && (this._coreBrowserService.window.clearTimeout(this._blinkStartTimeout), this._blinkStartTimeout = undefined), this._animationFrame && (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), this._animationFrame = undefined);
        }
        resume() {
          this.pause(), this._animationTimeRestarted = undefined, this._restartInterval(), this.restartBlinkAnimation();
        }
      };
    }, 860: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.tryDrawCustomChar = t2.powerlineDefinitions = t2.boxDrawingDefinitions = t2.blockElementDefinitions = undefined;
      const s16 = i2(374);
      t2.blockElementDefinitions = { "▀": [{ x: 0, y: 0, w: 8, h: 4 }], "▁": [{ x: 0, y: 7, w: 8, h: 1 }], "▂": [{ x: 0, y: 6, w: 8, h: 2 }], "▃": [{ x: 0, y: 5, w: 8, h: 3 }], "▄": [{ x: 0, y: 4, w: 8, h: 4 }], "▅": [{ x: 0, y: 3, w: 8, h: 5 }], "▆": [{ x: 0, y: 2, w: 8, h: 6 }], "▇": [{ x: 0, y: 1, w: 8, h: 7 }], "█": [{ x: 0, y: 0, w: 8, h: 8 }], "▉": [{ x: 0, y: 0, w: 7, h: 8 }], "▊": [{ x: 0, y: 0, w: 6, h: 8 }], "▋": [{ x: 0, y: 0, w: 5, h: 8 }], "▌": [{ x: 0, y: 0, w: 4, h: 8 }], "▍": [{ x: 0, y: 0, w: 3, h: 8 }], "▎": [{ x: 0, y: 0, w: 2, h: 8 }], "▏": [{ x: 0, y: 0, w: 1, h: 8 }], "▐": [{ x: 4, y: 0, w: 4, h: 8 }], "▔": [{ x: 0, y: 0, w: 8, h: 1 }], "▕": [{ x: 7, y: 0, w: 1, h: 8 }], "▖": [{ x: 0, y: 4, w: 4, h: 4 }], "▗": [{ x: 4, y: 4, w: 4, h: 4 }], "▘": [{ x: 0, y: 0, w: 4, h: 4 }], "▙": [{ x: 0, y: 0, w: 4, h: 8 }, { x: 0, y: 4, w: 8, h: 4 }], "▚": [{ x: 0, y: 0, w: 4, h: 4 }, { x: 4, y: 4, w: 4, h: 4 }], "▛": [{ x: 0, y: 0, w: 4, h: 8 }, { x: 4, y: 0, w: 4, h: 4 }], "▜": [{ x: 0, y: 0, w: 8, h: 4 }, { x: 4, y: 0, w: 4, h: 8 }], "▝": [{ x: 4, y: 0, w: 4, h: 4 }], "▞": [{ x: 4, y: 0, w: 4, h: 4 }, { x: 0, y: 4, w: 4, h: 4 }], "▟": [{ x: 4, y: 0, w: 4, h: 8 }, { x: 0, y: 4, w: 8, h: 4 }], "\uD83E\uDF70": [{ x: 1, y: 0, w: 1, h: 8 }], "\uD83E\uDF71": [{ x: 2, y: 0, w: 1, h: 8 }], "\uD83E\uDF72": [{ x: 3, y: 0, w: 1, h: 8 }], "\uD83E\uDF73": [{ x: 4, y: 0, w: 1, h: 8 }], "\uD83E\uDF74": [{ x: 5, y: 0, w: 1, h: 8 }], "\uD83E\uDF75": [{ x: 6, y: 0, w: 1, h: 8 }], "\uD83E\uDF76": [{ x: 0, y: 1, w: 8, h: 1 }], "\uD83E\uDF77": [{ x: 0, y: 2, w: 8, h: 1 }], "\uD83E\uDF78": [{ x: 0, y: 3, w: 8, h: 1 }], "\uD83E\uDF79": [{ x: 0, y: 4, w: 8, h: 1 }], "\uD83E\uDF7A": [{ x: 0, y: 5, w: 8, h: 1 }], "\uD83E\uDF7B": [{ x: 0, y: 6, w: 8, h: 1 }], "\uD83E\uDF7C": [{ x: 0, y: 0, w: 1, h: 8 }, { x: 0, y: 7, w: 8, h: 1 }], "\uD83E\uDF7D": [{ x: 0, y: 0, w: 1, h: 8 }, { x: 0, y: 0, w: 8, h: 1 }], "\uD83E\uDF7E": [{ x: 7, y: 0, w: 1, h: 8 }, { x: 0, y: 0, w: 8, h: 1 }], "\uD83E\uDF7F": [{ x: 7, y: 0, w: 1, h: 8 }, { x: 0, y: 7, w: 8, h: 1 }], "\uD83E\uDF80": [{ x: 0, y: 0, w: 8, h: 1 }, { x: 0, y: 7, w: 8, h: 1 }], "\uD83E\uDF81": [{ x: 0, y: 0, w: 8, h: 1 }, { x: 0, y: 2, w: 8, h: 1 }, { x: 0, y: 4, w: 8, h: 1 }, { x: 0, y: 7, w: 8, h: 1 }], "\uD83E\uDF82": [{ x: 0, y: 0, w: 8, h: 2 }], "\uD83E\uDF83": [{ x: 0, y: 0, w: 8, h: 3 }], "\uD83E\uDF84": [{ x: 0, y: 0, w: 8, h: 5 }], "\uD83E\uDF85": [{ x: 0, y: 0, w: 8, h: 6 }], "\uD83E\uDF86": [{ x: 0, y: 0, w: 8, h: 7 }], "\uD83E\uDF87": [{ x: 6, y: 0, w: 2, h: 8 }], "\uD83E\uDF88": [{ x: 5, y: 0, w: 3, h: 8 }], "\uD83E\uDF89": [{ x: 3, y: 0, w: 5, h: 8 }], "\uD83E\uDF8A": [{ x: 2, y: 0, w: 6, h: 8 }], "\uD83E\uDF8B": [{ x: 1, y: 0, w: 7, h: 8 }], "\uD83E\uDF95": [{ x: 0, y: 0, w: 2, h: 2 }, { x: 4, y: 0, w: 2, h: 2 }, { x: 2, y: 2, w: 2, h: 2 }, { x: 6, y: 2, w: 2, h: 2 }, { x: 0, y: 4, w: 2, h: 2 }, { x: 4, y: 4, w: 2, h: 2 }, { x: 2, y: 6, w: 2, h: 2 }, { x: 6, y: 6, w: 2, h: 2 }], "\uD83E\uDF96": [{ x: 2, y: 0, w: 2, h: 2 }, { x: 6, y: 0, w: 2, h: 2 }, { x: 0, y: 2, w: 2, h: 2 }, { x: 4, y: 2, w: 2, h: 2 }, { x: 2, y: 4, w: 2, h: 2 }, { x: 6, y: 4, w: 2, h: 2 }, { x: 0, y: 6, w: 2, h: 2 }, { x: 4, y: 6, w: 2, h: 2 }], "\uD83E\uDF97": [{ x: 0, y: 2, w: 8, h: 2 }, { x: 0, y: 6, w: 8, h: 2 }] };
      const r = { "░": [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0]], "▒": [[1, 0], [0, 0], [0, 1], [0, 0]], "▓": [[0, 1], [1, 1], [1, 0], [1, 1]] };
      t2.boxDrawingDefinitions = { "─": { 1: "M0,.5 L1,.5" }, "━": { 3: "M0,.5 L1,.5" }, "│": { 1: "M.5,0 L.5,1" }, "┃": { 3: "M.5,0 L.5,1" }, "┌": { 1: "M0.5,1 L.5,.5 L1,.5" }, "┏": { 3: "M0.5,1 L.5,.5 L1,.5" }, "┐": { 1: "M0,.5 L.5,.5 L.5,1" }, "┓": { 3: "M0,.5 L.5,.5 L.5,1" }, "└": { 1: "M.5,0 L.5,.5 L1,.5" }, "┗": { 3: "M.5,0 L.5,.5 L1,.5" }, "┘": { 1: "M.5,0 L.5,.5 L0,.5" }, "┛": { 3: "M.5,0 L.5,.5 L0,.5" }, "├": { 1: "M.5,0 L.5,1 M.5,.5 L1,.5" }, "┣": { 3: "M.5,0 L.5,1 M.5,.5 L1,.5" }, "┤": { 1: "M.5,0 L.5,1 M.5,.5 L0,.5" }, "┫": { 3: "M.5,0 L.5,1 M.5,.5 L0,.5" }, "┬": { 1: "M0,.5 L1,.5 M.5,.5 L.5,1" }, "┳": { 3: "M0,.5 L1,.5 M.5,.5 L.5,1" }, "┴": { 1: "M0,.5 L1,.5 M.5,.5 L.5,0" }, "┻": { 3: "M0,.5 L1,.5 M.5,.5 L.5,0" }, "┼": { 1: "M0,.5 L1,.5 M.5,0 L.5,1" }, "╋": { 3: "M0,.5 L1,.5 M.5,0 L.5,1" }, "╴": { 1: "M.5,.5 L0,.5" }, "╸": { 3: "M.5,.5 L0,.5" }, "╵": { 1: "M.5,.5 L.5,0" }, "╹": { 3: "M.5,.5 L.5,0" }, "╶": { 1: "M.5,.5 L1,.5" }, "╺": { 3: "M.5,.5 L1,.5" }, "╷": { 1: "M.5,.5 L.5,1" }, "╻": { 3: "M.5,.5 L.5,1" }, "═": { 1: (e3, t3) => `M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3}` }, "║": { 1: (e3, t3) => `M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1` }, "╒": { 1: (e3, t3) => `M.5,1 L.5,${0.5 - t3} L1,${0.5 - t3} M.5,${0.5 + t3} L1,${0.5 + t3}` }, "╓": { 1: (e3, t3) => `M${0.5 - e3},1 L${0.5 - e3},.5 L1,.5 M${0.5 + e3},.5 L${0.5 + e3},1` }, "╔": { 1: (e3, t3) => `M1,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1` }, "╕": { 1: (e3, t3) => `M0,${0.5 - t3} L.5,${0.5 - t3} L.5,1 M0,${0.5 + t3} L.5,${0.5 + t3}` }, "╖": { 1: (e3, t3) => `M${0.5 + e3},1 L${0.5 + e3},.5 L0,.5 M${0.5 - e3},.5 L${0.5 - e3},1` }, "╗": { 1: (e3, t3) => `M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M0,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},1` }, "╘": { 1: (e3, t3) => `M.5,0 L.5,${0.5 + t3} L1,${0.5 + t3} M.5,${0.5 - t3} L1,${0.5 - t3}` }, "╙": { 1: (e3, t3) => `M1,.5 L${0.5 - e3},.5 L${0.5 - e3},0 M${0.5 + e3},.5 L${0.5 + e3},0` }, "╚": { 1: (e3, t3) => `M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0 M1,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},0` }, "╛": { 1: (e3, t3) => `M0,${0.5 + t3} L.5,${0.5 + t3} L.5,0 M0,${0.5 - t3} L.5,${0.5 - t3}` }, "╜": { 1: (e3, t3) => `M0,.5 L${0.5 + e3},.5 L${0.5 + e3},0 M${0.5 - e3},.5 L${0.5 - e3},0` }, "╝": { 1: (e3, t3) => `M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0 M0,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},0` }, "╞": { 1: (e3, t3) => `M.5,0 L.5,1 M.5,${0.5 - t3} L1,${0.5 - t3} M.5,${0.5 + t3} L1,${0.5 + t3}` }, "╟": { 1: (e3, t3) => `M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1 M${0.5 + e3},.5 L1,.5` }, "╠": { 1: (e3, t3) => `M${0.5 - e3},0 L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1 M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0` }, "╡": { 1: (e3, t3) => `M.5,0 L.5,1 M0,${0.5 - t3} L.5,${0.5 - t3} M0,${0.5 + t3} L.5,${0.5 + t3}` }, "╢": { 1: (e3, t3) => `M0,.5 L${0.5 - e3},.5 M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1` }, "╣": { 1: (e3, t3) => `M${0.5 + e3},0 L${0.5 + e3},1 M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0` }, "╤": { 1: (e3, t3) => `M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3} M.5,${0.5 + t3} L.5,1` }, "╥": { 1: (e3, t3) => `M0,.5 L1,.5 M${0.5 - e3},.5 L${0.5 - e3},1 M${0.5 + e3},.5 L${0.5 + e3},1` }, "╦": { 1: (e3, t3) => `M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1` }, "╧": { 1: (e3, t3) => `M.5,0 L.5,${0.5 - t3} M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3}` }, "╨": { 1: (e3, t3) => `M0,.5 L1,.5 M${0.5 - e3},.5 L${0.5 - e3},0 M${0.5 + e3},.5 L${0.5 + e3},0` }, "╩": { 1: (e3, t3) => `M0,${0.5 + t3} L1,${0.5 + t3} M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0 M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0` }, "╪": { 1: (e3, t3) => `M.5,0 L.5,1 M0,${0.5 - t3} L1,${0.5 - t3} M0,${0.5 + t3} L1,${0.5 + t3}` }, "╫": { 1: (e3, t3) => `M0,.5 L1,.5 M${0.5 - e3},0 L${0.5 - e3},1 M${0.5 + e3},0 L${0.5 + e3},1` }, "╬": { 1: (e3, t3) => `M0,${0.5 + t3} L${0.5 - e3},${0.5 + t3} L${0.5 - e3},1 M1,${0.5 + t3} L${0.5 + e3},${0.5 + t3} L${0.5 + e3},1 M0,${0.5 - t3} L${0.5 - e3},${0.5 - t3} L${0.5 - e3},0 M1,${0.5 - t3} L${0.5 + e3},${0.5 - t3} L${0.5 + e3},0` }, "╱": { 1: "M1,0 L0,1" }, "╲": { 1: "M0,0 L1,1" }, "╳": { 1: "M1,0 L0,1 M0,0 L1,1" }, "╼": { 1: "M.5,.5 L0,.5", 3: "M.5,.5 L1,.5" }, "╽": { 1: "M.5,.5 L.5,0", 3: "M.5,.5 L.5,1" }, "╾": { 1: "M.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "╿": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L.5,0" }, "┍": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L1,.5" }, "┎": { 1: "M.5,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "┑": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L0,.5" }, "┒": { 1: "M.5,.5 L0,.5", 3: "M.5,.5 L.5,1" }, "┕": { 1: "M.5,.5 L.5,0", 3: "M.5,.5 L1,.5" }, "┖": { 1: "M.5,.5 L1,.5", 3: "M.5,.5 L.5,0" }, "┙": { 1: "M.5,.5 L.5,0", 3: "M.5,.5 L0,.5" }, "┚": { 1: "M.5,.5 L0,.5", 3: "M.5,.5 L.5,0" }, "┝": { 1: "M.5,0 L.5,1", 3: "M.5,.5 L1,.5" }, "┞": { 1: "M0.5,1 L.5,.5 L1,.5", 3: "M.5,.5 L.5,0" }, "┟": { 1: "M.5,0 L.5,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "┠": { 1: "M.5,.5 L1,.5", 3: "M.5,0 L.5,1" }, "┡": { 1: "M.5,.5 L.5,1", 3: "M.5,0 L.5,.5 L1,.5" }, "┢": { 1: "M.5,.5 L.5,0", 3: "M0.5,1 L.5,.5 L1,.5" }, "┥": { 1: "M.5,0 L.5,1", 3: "M.5,.5 L0,.5" }, "┦": { 1: "M0,.5 L.5,.5 L.5,1", 3: "M.5,.5 L.5,0" }, "┧": { 1: "M.5,0 L.5,.5 L0,.5", 3: "M.5,.5 L.5,1" }, "┨": { 1: "M.5,.5 L0,.5", 3: "M.5,0 L.5,1" }, "┩": { 1: "M.5,.5 L.5,1", 3: "M.5,0 L.5,.5 L0,.5" }, "┪": { 1: "M.5,.5 L.5,0", 3: "M0,.5 L.5,.5 L.5,1" }, "┭": { 1: "M0.5,1 L.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "┮": { 1: "M0,.5 L.5,.5 L.5,1", 3: "M.5,.5 L1,.5" }, "┯": { 1: "M.5,.5 L.5,1", 3: "M0,.5 L1,.5" }, "┰": { 1: "M0,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "┱": { 1: "M.5,.5 L1,.5", 3: "M0,.5 L.5,.5 L.5,1" }, "┲": { 1: "M.5,.5 L0,.5", 3: "M0.5,1 L.5,.5 L1,.5" }, "┵": { 1: "M.5,0 L.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "┶": { 1: "M.5,0 L.5,.5 L0,.5", 3: "M.5,.5 L1,.5" }, "┷": { 1: "M.5,.5 L.5,0", 3: "M0,.5 L1,.5" }, "┸": { 1: "M0,.5 L1,.5", 3: "M.5,.5 L.5,0" }, "┹": { 1: "M.5,.5 L1,.5", 3: "M.5,0 L.5,.5 L0,.5" }, "┺": { 1: "M.5,.5 L0,.5", 3: "M.5,0 L.5,.5 L1,.5" }, "┽": { 1: "M.5,0 L.5,1 M.5,.5 L1,.5", 3: "M.5,.5 L0,.5" }, "┾": { 1: "M.5,0 L.5,1 M.5,.5 L0,.5", 3: "M.5,.5 L1,.5" }, "┿": { 1: "M.5,0 L.5,1", 3: "M0,.5 L1,.5" }, "╀": { 1: "M0,.5 L1,.5 M.5,.5 L.5,1", 3: "M.5,.5 L.5,0" }, "╁": { 1: "M.5,.5 L.5,0 M0,.5 L1,.5", 3: "M.5,.5 L.5,1" }, "╂": { 1: "M0,.5 L1,.5", 3: "M.5,0 L.5,1" }, "╃": { 1: "M0.5,1 L.5,.5 L1,.5", 3: "M.5,0 L.5,.5 L0,.5" }, "╄": { 1: "M0,.5 L.5,.5 L.5,1", 3: "M.5,0 L.5,.5 L1,.5" }, "╅": { 1: "M.5,0 L.5,.5 L1,.5", 3: "M0,.5 L.5,.5 L.5,1" }, "╆": { 1: "M.5,0 L.5,.5 L0,.5", 3: "M0.5,1 L.5,.5 L1,.5" }, "╇": { 1: "M.5,.5 L.5,1", 3: "M.5,.5 L.5,0 M0,.5 L1,.5" }, "╈": { 1: "M.5,.5 L.5,0", 3: "M0,.5 L1,.5 M.5,.5 L.5,1" }, "╉": { 1: "M.5,.5 L1,.5", 3: "M.5,0 L.5,1 M.5,.5 L0,.5" }, "╊": { 1: "M.5,.5 L0,.5", 3: "M.5,0 L.5,1 M.5,.5 L1,.5" }, "╌": { 1: "M.1,.5 L.4,.5 M.6,.5 L.9,.5" }, "╍": { 3: "M.1,.5 L.4,.5 M.6,.5 L.9,.5" }, "┄": { 1: "M.0667,.5 L.2667,.5 M.4,.5 L.6,.5 M.7333,.5 L.9333,.5" }, "┅": { 3: "M.0667,.5 L.2667,.5 M.4,.5 L.6,.5 M.7333,.5 L.9333,.5" }, "┈": { 1: "M.05,.5 L.2,.5 M.3,.5 L.45,.5 M.55,.5 L.7,.5 M.8,.5 L.95,.5" }, "┉": { 3: "M.05,.5 L.2,.5 M.3,.5 L.45,.5 M.55,.5 L.7,.5 M.8,.5 L.95,.5" }, "╎": { 1: "M.5,.1 L.5,.4 M.5,.6 L.5,.9" }, "╏": { 3: "M.5,.1 L.5,.4 M.5,.6 L.5,.9" }, "┆": { 1: "M.5,.0667 L.5,.2667 M.5,.4 L.5,.6 M.5,.7333 L.5,.9333" }, "┇": { 3: "M.5,.0667 L.5,.2667 M.5,.4 L.5,.6 M.5,.7333 L.5,.9333" }, "┊": { 1: "M.5,.05 L.5,.2 M.5,.3 L.5,.45 L.5,.55 M.5,.7 L.5,.95" }, "┋": { 3: "M.5,.05 L.5,.2 M.5,.3 L.5,.45 L.5,.55 M.5,.7 L.5,.95" }, "╭": { 1: (e3, t3) => `M.5,1 L.5,${0.5 + t3 / 0.15 * 0.5} C.5,${0.5 + t3 / 0.15 * 0.5},.5,.5,1,.5` }, "╮": { 1: (e3, t3) => `M.5,1 L.5,${0.5 + t3 / 0.15 * 0.5} C.5,${0.5 + t3 / 0.15 * 0.5},.5,.5,0,.5` }, "╯": { 1: (e3, t3) => `M.5,0 L.5,${0.5 - t3 / 0.15 * 0.5} C.5,${0.5 - t3 / 0.15 * 0.5},.5,.5,0,.5` }, "╰": { 1: (e3, t3) => `M.5,0 L.5,${0.5 - t3 / 0.15 * 0.5} C.5,${0.5 - t3 / 0.15 * 0.5},.5,.5,1,.5` } }, t2.powerlineDefinitions = { "": { d: "M0,0 L1,.5 L0,1", type: 0, rightPadding: 2 }, "": { d: "M-1,-.5 L1,.5 L-1,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M1,0 L0,.5 L1,1", type: 0, leftPadding: 2 }, "": { d: "M2,-.5 L0,.5 L2,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M0,0 L0,1 C0.552,1,1,0.776,1,.5 C1,0.224,0.552,0,0,0", type: 0, rightPadding: 1 }, "": { d: "M.2,1 C.422,1,.8,.826,.78,.5 C.8,.174,0.422,0,.2,0", type: 1, rightPadding: 1 }, "": { d: "M1,0 L1,1 C0.448,1,0,0.776,0,.5 C0,0.224,0.448,0,1,0", type: 0, leftPadding: 1 }, "": { d: "M.8,1 C0.578,1,0.2,.826,.22,.5 C0.2,0.174,0.578,0,0.8,0", type: 1, leftPadding: 1 }, "": { d: "M-.5,-.5 L1.5,1.5 L-.5,1.5", type: 0 }, "": { d: "M-.5,-.5 L1.5,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M1.5,-.5 L-.5,1.5 L1.5,1.5", type: 0 }, "": { d: "M1.5,-.5 L-.5,1.5 L-.5,-.5", type: 0 }, "": { d: "M1.5,-.5 L-.5,1.5", type: 1, leftPadding: 1, rightPadding: 1 }, "": { d: "M-.5,-.5 L1.5,1.5 L1.5,-.5", type: 0 } }, t2.powerlineDefinitions[""] = t2.powerlineDefinitions[""], t2.powerlineDefinitions[""] = t2.powerlineDefinitions[""], t2.tryDrawCustomChar = function(e3, i3, n2, l, c, d, _, u) {
        const g = t2.blockElementDefinitions[i3];
        if (g)
          return function(e4, t3, i4, s17, r2, o2) {
            for (let n3 = 0;n3 < t3.length; n3++) {
              const a2 = t3[n3], h2 = r2 / 8, l2 = o2 / 8;
              e4.fillRect(i4 + a2.x * h2, s17 + a2.y * l2, a2.w * h2, a2.h * l2);
            }
          }(e3, g, n2, l, c, d), true;
        const f = r[i3];
        if (f)
          return function(e4, t3, i4, r2, n3, a2) {
            let h2 = o.get(t3);
            h2 || (h2 = new Map, o.set(t3, h2));
            const l2 = e4.fillStyle;
            if (typeof l2 != "string")
              throw new Error(`Unexpected fillStyle type "${l2}"`);
            let c2 = h2.get(l2);
            if (!c2) {
              const i5 = t3[0].length, r3 = t3.length, o2 = e4.canvas.ownerDocument.createElement("canvas");
              o2.width = i5, o2.height = r3;
              const n4 = (0, s16.throwIfFalsy)(o2.getContext("2d")), a3 = new ImageData(i5, r3);
              let d2, _2, u2, g2;
              if (l2.startsWith("#"))
                d2 = parseInt(l2.slice(1, 3), 16), _2 = parseInt(l2.slice(3, 5), 16), u2 = parseInt(l2.slice(5, 7), 16), g2 = l2.length > 7 && parseInt(l2.slice(7, 9), 16) || 1;
              else {
                if (!l2.startsWith("rgba"))
                  throw new Error(`Unexpected fillStyle color format "${l2}" when drawing pattern glyph`);
                [d2, _2, u2, g2] = l2.substring(5, l2.length - 1).split(",").map((e5) => parseFloat(e5));
              }
              for (let e5 = 0;e5 < r3; e5++)
                for (let s17 = 0;s17 < i5; s17++)
                  a3.data[4 * (e5 * i5 + s17)] = d2, a3.data[4 * (e5 * i5 + s17) + 1] = _2, a3.data[4 * (e5 * i5 + s17) + 2] = u2, a3.data[4 * (e5 * i5 + s17) + 3] = t3[e5][s17] * (255 * g2);
              n4.putImageData(a3, 0, 0), c2 = (0, s16.throwIfFalsy)(e4.createPattern(o2, null)), h2.set(l2, c2);
            }
            e4.fillStyle = c2, e4.fillRect(i4, r2, n3, a2);
          }(e3, f, n2, l, c, d), true;
        const v2 = t2.boxDrawingDefinitions[i3];
        if (v2)
          return function(e4, t3, i4, s17, r2, o2, n3) {
            e4.strokeStyle = e4.fillStyle;
            for (const [l2, c2] of Object.entries(t3)) {
              let t4;
              e4.beginPath(), e4.lineWidth = n3 * Number.parseInt(l2), t4 = typeof c2 == "function" ? c2(0.15, 0.15 / o2 * r2) : c2;
              for (const l3 of t4.split(" ")) {
                const t5 = l3[0], c3 = a[t5];
                if (!c3) {
                  console.error(`Could not find drawing instructions for "${t5}"`);
                  continue;
                }
                const d2 = l3.substring(1).split(",");
                d2[0] && d2[1] && c3(e4, h(d2, r2, o2, i4, s17, true, n3));
              }
              e4.stroke(), e4.closePath();
            }
          }(e3, v2, n2, l, c, d, u), true;
        const C2 = t2.powerlineDefinitions[i3];
        return !!C2 && (function(e4, t3, i4, s17, r2, o2, n3, l2) {
          const c2 = new Path2D;
          c2.rect(i4, s17, r2, o2), e4.clip(c2), e4.beginPath();
          const d2 = n3 / 12;
          e4.lineWidth = l2 * d2;
          for (const n4 of t3.d.split(" ")) {
            const c3 = n4[0], _2 = a[c3];
            if (!_2) {
              console.error(`Could not find drawing instructions for "${c3}"`);
              continue;
            }
            const u2 = n4.substring(1).split(",");
            u2[0] && u2[1] && _2(e4, h(u2, r2, o2, i4, s17, false, l2, (t3.leftPadding ?? 0) * (d2 / 2), (t3.rightPadding ?? 0) * (d2 / 2)));
          }
          t3.type === 1 ? (e4.strokeStyle = e4.fillStyle, e4.stroke()) : e4.fill(), e4.closePath();
        }(e3, C2, n2, l, c, d, _, u), true);
      };
      const o = new Map;
      function n(e3, t3, i3 = 0) {
        return Math.max(Math.min(e3, t3), i3);
      }
      const a = { C: (e3, t3) => e3.bezierCurveTo(t3[0], t3[1], t3[2], t3[3], t3[4], t3[5]), L: (e3, t3) => e3.lineTo(t3[0], t3[1]), M: (e3, t3) => e3.moveTo(t3[0], t3[1]) };
      function h(e3, t3, i3, s17, r2, o2, a2, h2 = 0, l = 0) {
        const c = e3.map((e4) => parseFloat(e4) || parseInt(e4));
        if (c.length < 2)
          throw new Error("Too few arguments for instruction");
        for (let e4 = 0;e4 < c.length; e4 += 2)
          c[e4] *= t3 - h2 * a2 - l * a2, o2 && c[e4] !== 0 && (c[e4] = n(Math.round(c[e4] + 0.5) - 0.5, t3, 0)), c[e4] += s17 + h2 * a2;
        for (let e4 = 1;e4 < c.length; e4 += 2)
          c[e4] *= i3, o2 && c[e4] !== 0 && (c[e4] = n(Math.round(c[e4] + 0.5) - 0.5, i3, 0)), c[e4] += r2;
        return c;
      }
    }, 56: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.observeDevicePixelDimensions = undefined;
      const s16 = i2(859);
      t2.observeDevicePixelDimensions = function(e3, t3, i3) {
        let r = new t3.ResizeObserver((t4) => {
          const s17 = t4.find((t5) => t5.target === e3);
          if (!s17)
            return;
          if (!("devicePixelContentBoxSize" in s17))
            return r?.disconnect(), void (r = undefined);
          const o = s17.devicePixelContentBoxSize[0].inlineSize, n = s17.devicePixelContentBoxSize[0].blockSize;
          o > 0 && n > 0 && i3(o, n);
        });
        try {
          r.observe(e3, { box: ["device-pixel-content-box"] });
        } catch {
          r.disconnect(), r = undefined;
        }
        return (0, s16.toDisposable)(() => r?.disconnect());
      };
    }, 374: (e2, t2) => {
      function i2(e3) {
        return 57508 <= e3 && e3 <= 57558;
      }
      function s16(e3) {
        return e3 >= 128512 && e3 <= 128591 || e3 >= 127744 && e3 <= 128511 || e3 >= 128640 && e3 <= 128767 || e3 >= 9728 && e3 <= 9983 || e3 >= 9984 && e3 <= 10175 || e3 >= 65024 && e3 <= 65039 || e3 >= 129280 && e3 <= 129535 || e3 >= 127462 && e3 <= 127487;
      }
      Object.defineProperty(t2, "__esModule", { value: true }), t2.computeNextVariantOffset = t2.createRenderDimensions = t2.treatGlyphAsBackgroundColor = t2.allowRescaling = t2.isEmoji = t2.isRestrictedPowerlineGlyph = t2.isPowerlineGlyph = t2.throwIfFalsy = undefined, t2.throwIfFalsy = function(e3) {
        if (!e3)
          throw new Error("value must not be falsy");
        return e3;
      }, t2.isPowerlineGlyph = i2, t2.isRestrictedPowerlineGlyph = function(e3) {
        return 57520 <= e3 && e3 <= 57527;
      }, t2.isEmoji = s16, t2.allowRescaling = function(e3, t3, r, o) {
        return t3 === 1 && r > Math.ceil(1.5 * o) && e3 !== undefined && e3 > 255 && !s16(e3) && !i2(e3) && !function(e4) {
          return 57344 <= e4 && e4 <= 63743;
        }(e3);
      }, t2.treatGlyphAsBackgroundColor = function(e3) {
        return i2(e3) || function(e4) {
          return 9472 <= e4 && e4 <= 9631;
        }(e3);
      }, t2.createRenderDimensions = function() {
        return { css: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 } }, device: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 }, char: { width: 0, height: 0, left: 0, top: 0 } } };
      }, t2.computeNextVariantOffset = function(e3, t3, i3 = 0) {
        return (e3 - (2 * Math.round(t3) - i3)) % (2 * Math.round(t3));
      };
    }, 296: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.createSelectionRenderModel = undefined;

      class i2 {
        constructor() {
          this.clear();
        }
        clear() {
          this.hasSelection = false, this.columnSelectMode = false, this.viewportStartRow = 0, this.viewportEndRow = 0, this.viewportCappedStartRow = 0, this.viewportCappedEndRow = 0, this.startCol = 0, this.endCol = 0, this.selectionStart = undefined, this.selectionEnd = undefined;
        }
        update(e3, t3, i3, s16 = false) {
          if (this.selectionStart = t3, this.selectionEnd = i3, !t3 || !i3 || t3[0] === i3[0] && t3[1] === i3[1])
            return void this.clear();
          const r = e3.buffers.active.ydisp, o = t3[1] - r, n = i3[1] - r, a = Math.max(o, 0), h = Math.min(n, e3.rows - 1);
          a >= e3.rows || h < 0 ? this.clear() : (this.hasSelection = true, this.columnSelectMode = s16, this.viewportStartRow = o, this.viewportEndRow = n, this.viewportCappedStartRow = a, this.viewportCappedEndRow = h, this.startCol = t3[0], this.endCol = i3[0]);
        }
        isCellSelected(e3, t3, i3) {
          return !!this.hasSelection && (i3 -= e3.buffer.active.viewportY, this.columnSelectMode ? this.startCol <= this.endCol ? t3 >= this.startCol && i3 >= this.viewportCappedStartRow && t3 < this.endCol && i3 <= this.viewportCappedEndRow : t3 < this.startCol && i3 >= this.viewportCappedStartRow && t3 >= this.endCol && i3 <= this.viewportCappedEndRow : i3 > this.viewportStartRow && i3 < this.viewportEndRow || this.viewportStartRow === this.viewportEndRow && i3 === this.viewportStartRow && t3 >= this.startCol && t3 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportEndRow && t3 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportStartRow && t3 >= this.startCol);
        }
      }
      t2.createSelectionRenderModel = function() {
        return new i2;
      };
    }, 509: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.TextureAtlas = undefined;
      const s16 = i2(237), r = i2(860), o = i2(374), n = i2(160), a = i2(345), h = i2(485), l = i2(385), c = i2(147), d = i2(855), _ = { texturePage: 0, texturePosition: { x: 0, y: 0 }, texturePositionClipSpace: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, size: { x: 0, y: 0 }, sizeClipSpace: { x: 0, y: 0 } };
      let u;

      class g {
        get pages() {
          return this._pages;
        }
        constructor(e3, t3, i3) {
          this._document = e3, this._config = t3, this._unicodeService = i3, this._didWarmUp = false, this._cacheMap = new h.FourKeyMap, this._cacheMapCombined = new h.FourKeyMap, this._pages = [], this._activePages = [], this._workBoundingBox = { top: 0, left: 0, bottom: 0, right: 0 }, this._workAttributeData = new c.AttributeData, this._textureSize = 512, this._onAddTextureAtlasCanvas = new a.EventEmitter, this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event, this._onRemoveTextureAtlasCanvas = new a.EventEmitter, this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event, this._requestClearModel = false, this._createNewPage(), this._tmpCanvas = C2(e3, 4 * this._config.deviceCellWidth + 4, this._config.deviceCellHeight + 4), this._tmpCtx = (0, o.throwIfFalsy)(this._tmpCanvas.getContext("2d", { alpha: this._config.allowTransparency, willReadFrequently: true }));
        }
        dispose() {
          for (const e3 of this.pages)
            e3.canvas.remove();
          this._onAddTextureAtlasCanvas.dispose();
        }
        warmUp() {
          this._didWarmUp || (this._doWarmUp(), this._didWarmUp = true);
        }
        _doWarmUp() {
          const e3 = new l.IdleTaskQueue;
          for (let t3 = 33;t3 < 126; t3++)
            e3.enqueue(() => {
              if (!this._cacheMap.get(t3, d.DEFAULT_COLOR, d.DEFAULT_COLOR, d.DEFAULT_EXT)) {
                const e4 = this._drawToCache(t3, d.DEFAULT_COLOR, d.DEFAULT_COLOR, d.DEFAULT_EXT);
                this._cacheMap.set(t3, d.DEFAULT_COLOR, d.DEFAULT_COLOR, d.DEFAULT_EXT, e4);
              }
            });
        }
        beginFrame() {
          return this._requestClearModel;
        }
        clearTexture() {
          if (this._pages[0].currentRow.x !== 0 || this._pages[0].currentRow.y !== 0) {
            for (const e3 of this._pages)
              e3.clear();
            this._cacheMap.clear(), this._cacheMapCombined.clear(), this._didWarmUp = false;
          }
        }
        _createNewPage() {
          if (g.maxAtlasPages && this._pages.length >= Math.max(4, g.maxAtlasPages)) {
            const e4 = this._pages.filter((e5) => 2 * e5.canvas.width <= (g.maxTextureSize || 4096)).sort((e5, t4) => t4.canvas.width !== e5.canvas.width ? t4.canvas.width - e5.canvas.width : t4.percentageUsed - e5.percentageUsed);
            let t3 = -1, i3 = 0;
            for (let s18 = 0;s18 < e4.length; s18++)
              if (e4[s18].canvas.width !== i3)
                t3 = s18, i3 = e4[s18].canvas.width;
              else if (s18 - t3 == 3)
                break;
            const s17 = e4.slice(t3, t3 + 4), r2 = s17.map((e5) => e5.glyphs[0].texturePage).sort((e5, t4) => e5 > t4 ? 1 : -1), o2 = this.pages.length - s17.length, n2 = this._mergePages(s17, o2);
            n2.version++;
            for (let e5 = r2.length - 1;e5 >= 0; e5--)
              this._deletePage(r2[e5]);
            this.pages.push(n2), this._requestClearModel = true, this._onAddTextureAtlasCanvas.fire(n2.canvas);
          }
          const e3 = new f(this._document, this._textureSize);
          return this._pages.push(e3), this._activePages.push(e3), this._onAddTextureAtlasCanvas.fire(e3.canvas), e3;
        }
        _mergePages(e3, t3) {
          const i3 = 2 * e3[0].canvas.width, s17 = new f(this._document, i3, e3);
          for (const [r2, o2] of e3.entries()) {
            const e4 = r2 * o2.canvas.width % i3, n2 = Math.floor(r2 / 2) * o2.canvas.height;
            s17.ctx.drawImage(o2.canvas, e4, n2);
            for (const s18 of o2.glyphs)
              s18.texturePage = t3, s18.sizeClipSpace.x = s18.size.x / i3, s18.sizeClipSpace.y = s18.size.y / i3, s18.texturePosition.x += e4, s18.texturePosition.y += n2, s18.texturePositionClipSpace.x = s18.texturePosition.x / i3, s18.texturePositionClipSpace.y = s18.texturePosition.y / i3;
            this._onRemoveTextureAtlasCanvas.fire(o2.canvas);
            const a2 = this._activePages.indexOf(o2);
            a2 !== -1 && this._activePages.splice(a2, 1);
          }
          return s17;
        }
        _deletePage(e3) {
          this._pages.splice(e3, 1);
          for (let t3 = e3;t3 < this._pages.length; t3++) {
            const e4 = this._pages[t3];
            for (const t4 of e4.glyphs)
              t4.texturePage--;
            e4.version++;
          }
        }
        getRasterizedGlyphCombinedChar(e3, t3, i3, s17, r2) {
          return this._getFromCacheMap(this._cacheMapCombined, e3, t3, i3, s17, r2);
        }
        getRasterizedGlyph(e3, t3, i3, s17, r2) {
          return this._getFromCacheMap(this._cacheMap, e3, t3, i3, s17, r2);
        }
        _getFromCacheMap(e3, t3, i3, s17, r2, o2 = false) {
          return u = e3.get(t3, i3, s17, r2), u || (u = this._drawToCache(t3, i3, s17, r2, o2), e3.set(t3, i3, s17, r2, u)), u;
        }
        _getColorFromAnsiIndex(e3) {
          if (e3 >= this._config.colors.ansi.length)
            throw new Error("No color found for idx " + e3);
          return this._config.colors.ansi[e3];
        }
        _getBackgroundColor(e3, t3, i3, s17) {
          if (this._config.allowTransparency)
            return n.NULL_COLOR;
          let r2;
          switch (e3) {
            case 16777216:
            case 33554432:
              r2 = this._getColorFromAnsiIndex(t3);
              break;
            case 50331648:
              const e4 = c.AttributeData.toColorRGB(t3);
              r2 = n.channels.toColor(e4[0], e4[1], e4[2]);
              break;
            default:
              r2 = i3 ? n.color.opaque(this._config.colors.foreground) : this._config.colors.background;
          }
          return r2;
        }
        _getForegroundColor(e3, t3, i3, r2, o2, a2, h2, l2, d2, _2) {
          const u2 = this._getMinimumContrastColor(e3, t3, i3, r2, o2, a2, h2, d2, l2, _2);
          if (u2)
            return u2;
          let g2;
          switch (o2) {
            case 16777216:
            case 33554432:
              this._config.drawBoldTextInBrightColors && d2 && a2 < 8 && (a2 += 8), g2 = this._getColorFromAnsiIndex(a2);
              break;
            case 50331648:
              const e4 = c.AttributeData.toColorRGB(a2);
              g2 = n.channels.toColor(e4[0], e4[1], e4[2]);
              break;
            default:
              g2 = h2 ? this._config.colors.background : this._config.colors.foreground;
          }
          return this._config.allowTransparency && (g2 = n.color.opaque(g2)), l2 && (g2 = n.color.multiplyOpacity(g2, s16.DIM_OPACITY)), g2;
        }
        _resolveBackgroundRgba(e3, t3, i3) {
          switch (e3) {
            case 16777216:
            case 33554432:
              return this._getColorFromAnsiIndex(t3).rgba;
            case 50331648:
              return t3 << 8;
            default:
              return i3 ? this._config.colors.foreground.rgba : this._config.colors.background.rgba;
          }
        }
        _resolveForegroundRgba(e3, t3, i3, s17) {
          switch (e3) {
            case 16777216:
            case 33554432:
              return this._config.drawBoldTextInBrightColors && s17 && t3 < 8 && (t3 += 8), this._getColorFromAnsiIndex(t3).rgba;
            case 50331648:
              return t3 << 8;
            default:
              return i3 ? this._config.colors.background.rgba : this._config.colors.foreground.rgba;
          }
        }
        _getMinimumContrastColor(e3, t3, i3, s17, r2, o2, a2, h2, l2, c2) {
          if (this._config.minimumContrastRatio === 1 || c2)
            return;
          const d2 = this._getContrastCache(l2), _2 = d2.getColor(e3, s17);
          if (_2 !== undefined)
            return _2 || undefined;
          const u2 = this._resolveBackgroundRgba(t3, i3, a2), g2 = this._resolveForegroundRgba(r2, o2, a2, h2), f2 = n.rgba.ensureContrastRatio(u2, g2, this._config.minimumContrastRatio / (l2 ? 2 : 1));
          if (!f2)
            return void d2.setColor(e3, s17, null);
          const v3 = n.channels.toColor(f2 >> 24 & 255, f2 >> 16 & 255, f2 >> 8 & 255);
          return d2.setColor(e3, s17, v3), v3;
        }
        _getContrastCache(e3) {
          return e3 ? this._config.colors.halfContrastCache : this._config.colors.contrastCache;
        }
        _drawToCache(e3, t3, i3, n2, a2 = false) {
          const h2 = typeof e3 == "number" ? String.fromCharCode(e3) : e3, l2 = Math.min(this._config.deviceCellWidth * Math.max(h2.length, 2) + 4, this._textureSize);
          this._tmpCanvas.width < l2 && (this._tmpCanvas.width = l2);
          const d2 = Math.min(this._config.deviceCellHeight + 8, this._textureSize);
          if (this._tmpCanvas.height < d2 && (this._tmpCanvas.height = d2), this._tmpCtx.save(), this._workAttributeData.fg = i3, this._workAttributeData.bg = t3, this._workAttributeData.extended.ext = n2, this._workAttributeData.isInvisible())
            return _;
          const u2 = !!this._workAttributeData.isBold(), f2 = !!this._workAttributeData.isInverse(), C3 = !!this._workAttributeData.isDim(), p = !!this._workAttributeData.isItalic(), m = !!this._workAttributeData.isUnderline(), x = !!this._workAttributeData.isStrikethrough(), w = !!this._workAttributeData.isOverline();
          let L2 = this._workAttributeData.getFgColor(), b2 = this._workAttributeData.getFgColorMode(), M2 = this._workAttributeData.getBgColor(), S2 = this._workAttributeData.getBgColorMode();
          if (f2) {
            const e4 = L2;
            L2 = M2, M2 = e4;
            const t4 = b2;
            b2 = S2, S2 = t4;
          }
          const y = this._getBackgroundColor(S2, M2, f2, C3);
          this._tmpCtx.globalCompositeOperation = "copy", this._tmpCtx.fillStyle = y.css, this._tmpCtx.fillRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height), this._tmpCtx.globalCompositeOperation = "source-over";
          const R = u2 ? this._config.fontWeightBold : this._config.fontWeight, A = p ? "italic" : "";
          this._tmpCtx.font = `${A} ${R} ${this._config.fontSize * this._config.devicePixelRatio}px ${this._config.fontFamily}`, this._tmpCtx.textBaseline = s16.TEXT_BASELINE;
          const D2 = h2.length === 1 && (0, o.isPowerlineGlyph)(h2.charCodeAt(0)), T = h2.length === 1 && (0, o.isRestrictedPowerlineGlyph)(h2.charCodeAt(0)), k = this._getForegroundColor(t3, S2, M2, i3, b2, L2, f2, C3, u2, (0, o.treatGlyphAsBackgroundColor)(h2.charCodeAt(0)));
          this._tmpCtx.fillStyle = k.css;
          const E = T ? 0 : 4;
          let B2 = false;
          this._config.customGlyphs !== false && (B2 = (0, r.tryDrawCustomChar)(this._tmpCtx, h2, E, E, this._config.deviceCellWidth, this._config.deviceCellHeight, this._config.fontSize, this._config.devicePixelRatio));
          let $2, P = !D2;
          if ($2 = typeof e3 == "number" ? this._unicodeService.wcwidth(e3) : this._unicodeService.getStringCellWidth(e3), m) {
            this._tmpCtx.save();
            const e4 = Math.max(1, Math.floor(this._config.fontSize * this._config.devicePixelRatio / 15)), t4 = e4 % 2 == 1 ? 0.5 : 0;
            if (this._tmpCtx.lineWidth = e4, this._workAttributeData.isUnderlineColorDefault())
              this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle;
            else if (this._workAttributeData.isUnderlineColorRGB())
              P = false, this._tmpCtx.strokeStyle = `rgb(${c.AttributeData.toColorRGB(this._workAttributeData.getUnderlineColor()).join(",")})`;
            else {
              P = false;
              let e5 = this._workAttributeData.getUnderlineColor();
              this._config.drawBoldTextInBrightColors && this._workAttributeData.isBold() && e5 < 8 && (e5 += 8), this._tmpCtx.strokeStyle = this._getColorFromAnsiIndex(e5).css;
            }
            this._tmpCtx.beginPath();
            const i4 = E, s17 = Math.ceil(E + this._config.deviceCharHeight) - t4 - (a2 ? 2 * e4 : 0), r2 = s17 + e4, n3 = s17 + 2 * e4;
            let l3 = this._workAttributeData.getUnderlineVariantOffset();
            for (let a3 = 0;a3 < $2; a3++) {
              this._tmpCtx.save();
              const h3 = i4 + a3 * this._config.deviceCellWidth, c2 = i4 + (a3 + 1) * this._config.deviceCellWidth, d3 = h3 + this._config.deviceCellWidth / 2;
              switch (this._workAttributeData.extended.underlineStyle) {
                case 2:
                  this._tmpCtx.moveTo(h3, s17), this._tmpCtx.lineTo(c2, s17), this._tmpCtx.moveTo(h3, n3), this._tmpCtx.lineTo(c2, n3);
                  break;
                case 3:
                  const i5 = e4 <= 1 ? n3 : Math.ceil(E + this._config.deviceCharHeight - e4 / 2) - t4, a4 = e4 <= 1 ? s17 : Math.ceil(E + this._config.deviceCharHeight + e4 / 2) - t4, _2 = new Path2D;
                  _2.rect(h3, s17, this._config.deviceCellWidth, n3 - s17), this._tmpCtx.clip(_2), this._tmpCtx.moveTo(h3 - this._config.deviceCellWidth / 2, r2), this._tmpCtx.bezierCurveTo(h3 - this._config.deviceCellWidth / 2, a4, h3, a4, h3, r2), this._tmpCtx.bezierCurveTo(h3, i5, d3, i5, d3, r2), this._tmpCtx.bezierCurveTo(d3, a4, c2, a4, c2, r2), this._tmpCtx.bezierCurveTo(c2, i5, c2 + this._config.deviceCellWidth / 2, i5, c2 + this._config.deviceCellWidth / 2, r2);
                  break;
                case 4:
                  const u3 = l3 === 0 ? 0 : l3 >= e4 ? 2 * e4 - l3 : e4 - l3;
                  !(l3 >= e4) == false || u3 === 0 ? (this._tmpCtx.setLineDash([Math.round(e4), Math.round(e4)]), this._tmpCtx.moveTo(h3 + u3, s17), this._tmpCtx.lineTo(c2, s17)) : (this._tmpCtx.setLineDash([Math.round(e4), Math.round(e4)]), this._tmpCtx.moveTo(h3, s17), this._tmpCtx.lineTo(h3 + u3, s17), this._tmpCtx.moveTo(h3 + u3 + e4, s17), this._tmpCtx.lineTo(c2, s17)), l3 = (0, o.computeNextVariantOffset)(c2 - h3, e4, l3);
                  break;
                case 5:
                  const g2 = 0.6, f3 = 0.3, v3 = c2 - h3, C4 = Math.floor(g2 * v3), p2 = Math.floor(f3 * v3), m2 = v3 - C4 - p2;
                  this._tmpCtx.setLineDash([C4, p2, m2]), this._tmpCtx.moveTo(h3, s17), this._tmpCtx.lineTo(c2, s17);
                  break;
                default:
                  this._tmpCtx.moveTo(h3, s17), this._tmpCtx.lineTo(c2, s17);
              }
              this._tmpCtx.stroke(), this._tmpCtx.restore();
            }
            if (this._tmpCtx.restore(), !B2 && this._config.fontSize >= 12 && !this._config.allowTransparency && h2 !== " ") {
              this._tmpCtx.save(), this._tmpCtx.textBaseline = "alphabetic";
              const t5 = this._tmpCtx.measureText(h2);
              if (this._tmpCtx.restore(), "actualBoundingBoxDescent" in t5 && t5.actualBoundingBoxDescent > 0) {
                this._tmpCtx.save();
                const t6 = new Path2D;
                t6.rect(i4, s17 - Math.ceil(e4 / 2), this._config.deviceCellWidth * $2, n3 - s17 + Math.ceil(e4 / 2)), this._tmpCtx.clip(t6), this._tmpCtx.lineWidth = 3 * this._config.devicePixelRatio, this._tmpCtx.strokeStyle = y.css, this._tmpCtx.strokeText(h2, E, E + this._config.deviceCharHeight), this._tmpCtx.restore();
              }
            }
          }
          if (w) {
            const e4 = Math.max(1, Math.floor(this._config.fontSize * this._config.devicePixelRatio / 15)), t4 = e4 % 2 == 1 ? 0.5 : 0;
            this._tmpCtx.lineWidth = e4, this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle, this._tmpCtx.beginPath(), this._tmpCtx.moveTo(E, E + t4), this._tmpCtx.lineTo(E + this._config.deviceCharWidth * $2, E + t4), this._tmpCtx.stroke();
          }
          if (B2 || this._tmpCtx.fillText(h2, E, E + this._config.deviceCharHeight), h2 === "_" && !this._config.allowTransparency) {
            let e4 = v2(this._tmpCtx.getImageData(E, E, this._config.deviceCellWidth, this._config.deviceCellHeight), y, k, P);
            if (e4)
              for (let t4 = 1;t4 <= 5 && (this._tmpCtx.save(), this._tmpCtx.fillStyle = y.css, this._tmpCtx.fillRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height), this._tmpCtx.restore(), this._tmpCtx.fillText(h2, E, E + this._config.deviceCharHeight - t4), e4 = v2(this._tmpCtx.getImageData(E, E, this._config.deviceCellWidth, this._config.deviceCellHeight), y, k, P), e4); t4++)
                ;
          }
          if (x) {
            const e4 = Math.max(1, Math.floor(this._config.fontSize * this._config.devicePixelRatio / 10)), t4 = this._tmpCtx.lineWidth % 2 == 1 ? 0.5 : 0;
            this._tmpCtx.lineWidth = e4, this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle, this._tmpCtx.beginPath(), this._tmpCtx.moveTo(E, E + Math.floor(this._config.deviceCharHeight / 2) - t4), this._tmpCtx.lineTo(E + this._config.deviceCharWidth * $2, E + Math.floor(this._config.deviceCharHeight / 2) - t4), this._tmpCtx.stroke();
          }
          this._tmpCtx.restore();
          const O = this._tmpCtx.getImageData(0, 0, this._tmpCanvas.width, this._tmpCanvas.height);
          let I;
          if (I = this._config.allowTransparency ? function(e4) {
            for (let t4 = 0;t4 < e4.data.length; t4 += 4)
              if (e4.data[t4 + 3] > 0)
                return false;
            return true;
          }(O) : v2(O, y, k, P), I)
            return _;
          const F2 = this._findGlyphBoundingBox(O, this._workBoundingBox, l2, T, B2, E);
          let W, H2;
          for (;; ) {
            if (this._activePages.length === 0) {
              const e4 = this._createNewPage();
              W = e4, H2 = e4.currentRow, H2.height = F2.size.y;
              break;
            }
            W = this._activePages[this._activePages.length - 1], H2 = W.currentRow;
            for (const e4 of this._activePages)
              F2.size.y <= e4.currentRow.height && (W = e4, H2 = e4.currentRow);
            for (let e4 = this._activePages.length - 1;e4 >= 0; e4--)
              for (const t4 of this._activePages[e4].fixedRows)
                t4.height <= H2.height && F2.size.y <= t4.height && (W = this._activePages[e4], H2 = t4);
            if (H2.y + F2.size.y >= W.canvas.height || H2.height > F2.size.y + 2) {
              let e4 = false;
              if (W.currentRow.y + W.currentRow.height + F2.size.y >= W.canvas.height) {
                let t4;
                for (const e5 of this._activePages)
                  if (e5.currentRow.y + e5.currentRow.height + F2.size.y < e5.canvas.height) {
                    t4 = e5;
                    break;
                  }
                if (t4)
                  W = t4;
                else if (g.maxAtlasPages && this._pages.length >= g.maxAtlasPages && H2.y + F2.size.y <= W.canvas.height && H2.height >= F2.size.y && H2.x + F2.size.x <= W.canvas.width)
                  e4 = true;
                else {
                  const t5 = this._createNewPage();
                  W = t5, H2 = t5.currentRow, H2.height = F2.size.y, e4 = true;
                }
              }
              e4 || (W.currentRow.height > 0 && W.fixedRows.push(W.currentRow), H2 = { x: 0, y: W.currentRow.y + W.currentRow.height, height: F2.size.y }, W.fixedRows.push(H2), W.currentRow = { x: 0, y: H2.y + H2.height, height: 0 });
            }
            if (H2.x + F2.size.x <= W.canvas.width)
              break;
            H2 === W.currentRow ? (H2.x = 0, H2.y += H2.height, H2.height = 0) : W.fixedRows.splice(W.fixedRows.indexOf(H2), 1);
          }
          return F2.texturePage = this._pages.indexOf(W), F2.texturePosition.x = H2.x, F2.texturePosition.y = H2.y, F2.texturePositionClipSpace.x = H2.x / W.canvas.width, F2.texturePositionClipSpace.y = H2.y / W.canvas.height, F2.sizeClipSpace.x /= W.canvas.width, F2.sizeClipSpace.y /= W.canvas.height, H2.height = Math.max(H2.height, F2.size.y), H2.x += F2.size.x, W.ctx.putImageData(O, F2.texturePosition.x - this._workBoundingBox.left, F2.texturePosition.y - this._workBoundingBox.top, this._workBoundingBox.left, this._workBoundingBox.top, F2.size.x, F2.size.y), W.addGlyph(F2), W.version++, F2;
        }
        _findGlyphBoundingBox(e3, t3, i3, s17, r2, o2) {
          t3.top = 0;
          const n2 = s17 ? this._config.deviceCellHeight : this._tmpCanvas.height, a2 = s17 ? this._config.deviceCellWidth : i3;
          let h2 = false;
          for (let i4 = 0;i4 < n2; i4++) {
            for (let s18 = 0;s18 < a2; s18++) {
              const r3 = i4 * this._tmpCanvas.width * 4 + 4 * s18 + 3;
              if (e3.data[r3] !== 0) {
                t3.top = i4, h2 = true;
                break;
              }
            }
            if (h2)
              break;
          }
          t3.left = 0, h2 = false;
          for (let i4 = 0;i4 < o2 + a2; i4++) {
            for (let s18 = 0;s18 < n2; s18++) {
              const r3 = s18 * this._tmpCanvas.width * 4 + 4 * i4 + 3;
              if (e3.data[r3] !== 0) {
                t3.left = i4, h2 = true;
                break;
              }
            }
            if (h2)
              break;
          }
          t3.right = a2, h2 = false;
          for (let i4 = o2 + a2 - 1;i4 >= o2; i4--) {
            for (let s18 = 0;s18 < n2; s18++) {
              const r3 = s18 * this._tmpCanvas.width * 4 + 4 * i4 + 3;
              if (e3.data[r3] !== 0) {
                t3.right = i4, h2 = true;
                break;
              }
            }
            if (h2)
              break;
          }
          t3.bottom = n2, h2 = false;
          for (let i4 = n2 - 1;i4 >= 0; i4--) {
            for (let s18 = 0;s18 < a2; s18++) {
              const r3 = i4 * this._tmpCanvas.width * 4 + 4 * s18 + 3;
              if (e3.data[r3] !== 0) {
                t3.bottom = i4, h2 = true;
                break;
              }
            }
            if (h2)
              break;
          }
          return { texturePage: 0, texturePosition: { x: 0, y: 0 }, texturePositionClipSpace: { x: 0, y: 0 }, size: { x: t3.right - t3.left + 1, y: t3.bottom - t3.top + 1 }, sizeClipSpace: { x: t3.right - t3.left + 1, y: t3.bottom - t3.top + 1 }, offset: { x: -t3.left + o2 + (s17 || r2 ? Math.floor((this._config.deviceCellWidth - this._config.deviceCharWidth) / 2) : 0), y: -t3.top + o2 + (s17 || r2 ? this._config.lineHeight === 1 ? 0 : Math.round((this._config.deviceCellHeight - this._config.deviceCharHeight) / 2) : 0) } };
        }
      }
      t2.TextureAtlas = g;

      class f {
        get percentageUsed() {
          return this._usedPixels / (this.canvas.width * this.canvas.height);
        }
        get glyphs() {
          return this._glyphs;
        }
        addGlyph(e3) {
          this._glyphs.push(e3), this._usedPixels += e3.size.x * e3.size.y;
        }
        constructor(e3, t3, i3) {
          if (this._usedPixels = 0, this._glyphs = [], this.version = 0, this.currentRow = { x: 0, y: 0, height: 0 }, this.fixedRows = [], i3)
            for (const e4 of i3)
              this._glyphs.push(...e4.glyphs), this._usedPixels += e4._usedPixels;
          this.canvas = C2(e3, t3, t3), this.ctx = (0, o.throwIfFalsy)(this.canvas.getContext("2d", { alpha: true }));
        }
        clear() {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height), this.currentRow.x = 0, this.currentRow.y = 0, this.currentRow.height = 0, this.fixedRows.length = 0, this.version++;
        }
      }
      function v2(e3, t3, i3, s17) {
        const r2 = t3.rgba >>> 24, o2 = t3.rgba >>> 16 & 255, n2 = t3.rgba >>> 8 & 255, a2 = i3.rgba >>> 24, h2 = i3.rgba >>> 16 & 255, l2 = i3.rgba >>> 8 & 255, c2 = Math.floor((Math.abs(r2 - a2) + Math.abs(o2 - h2) + Math.abs(n2 - l2)) / 12);
        let d2 = true;
        for (let t4 = 0;t4 < e3.data.length; t4 += 4)
          e3.data[t4] === r2 && e3.data[t4 + 1] === o2 && e3.data[t4 + 2] === n2 || s17 && Math.abs(e3.data[t4] - r2) + Math.abs(e3.data[t4 + 1] - o2) + Math.abs(e3.data[t4 + 2] - n2) < c2 ? e3.data[t4 + 3] = 0 : d2 = false;
        return d2;
      }
      function C2(e3, t3, i3) {
        const s17 = e3.createElement("canvas");
        return s17.width = t3, s17.height = i3, s17;
      }
    }, 577: function(e2, t2, i2) {
      var s16 = this && this.__decorate || function(e3, t3, i3, s17) {
        var r2, o2 = arguments.length, n2 = o2 < 3 ? t3 : s17 === null ? s17 = Object.getOwnPropertyDescriptor(t3, i3) : s17;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function")
          n2 = Reflect.decorate(e3, t3, i3, s17);
        else
          for (var a2 = e3.length - 1;a2 >= 0; a2--)
            (r2 = e3[a2]) && (n2 = (o2 < 3 ? r2(n2) : o2 > 3 ? r2(t3, i3, n2) : r2(t3, i3)) || n2);
        return o2 > 3 && n2 && Object.defineProperty(t3, i3, n2), n2;
      }, r = this && this.__param || function(e3, t3) {
        return function(i3, s17) {
          t3(i3, s17, e3);
        };
      };
      Object.defineProperty(t2, "__esModule", { value: true }), t2.CharacterJoinerService = t2.JoinedCellData = undefined;
      const o = i2(147), n = i2(855), a = i2(782), h = i2(97);

      class l extends o.AttributeData {
        constructor(e3, t3, i3) {
          super(), this.content = 0, this.combinedData = "", this.fg = e3.fg, this.bg = e3.bg, this.combinedData = t3, this._width = i3;
        }
        isCombined() {
          return 2097152;
        }
        getWidth() {
          return this._width;
        }
        getChars() {
          return this.combinedData;
        }
        getCode() {
          return 2097151;
        }
        setFromCharData(e3) {
          throw new Error("not implemented");
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }
      t2.JoinedCellData = l;
      let c = t2.CharacterJoinerService = class e3 {
        constructor(e4) {
          this._bufferService = e4, this._characterJoiners = [], this._nextCharacterJoinerId = 0, this._workCell = new a.CellData;
        }
        register(e4) {
          const t3 = { id: this._nextCharacterJoinerId++, handler: e4 };
          return this._characterJoiners.push(t3), t3.id;
        }
        deregister(e4) {
          for (let t3 = 0;t3 < this._characterJoiners.length; t3++)
            if (this._characterJoiners[t3].id === e4)
              return this._characterJoiners.splice(t3, 1), true;
          return false;
        }
        getJoinedCharacters(e4) {
          if (this._characterJoiners.length === 0)
            return [];
          const t3 = this._bufferService.buffer.lines.get(e4);
          if (!t3 || t3.length === 0)
            return [];
          const i3 = [], s17 = t3.translateToString(true);
          let r2 = 0, o2 = 0, a2 = 0, h2 = t3.getFg(0), l2 = t3.getBg(0);
          for (let e5 = 0;e5 < t3.getTrimmedLength(); e5++)
            if (t3.loadCell(e5, this._workCell), this._workCell.getWidth() !== 0) {
              if (this._workCell.fg !== h2 || this._workCell.bg !== l2) {
                if (e5 - r2 > 1) {
                  const e6 = this._getJoinedRanges(s17, a2, o2, t3, r2);
                  for (let t4 = 0;t4 < e6.length; t4++)
                    i3.push(e6[t4]);
                }
                r2 = e5, a2 = o2, h2 = this._workCell.fg, l2 = this._workCell.bg;
              }
              o2 += this._workCell.getChars().length || n.WHITESPACE_CELL_CHAR.length;
            }
          if (this._bufferService.cols - r2 > 1) {
            const e5 = this._getJoinedRanges(s17, a2, o2, t3, r2);
            for (let t4 = 0;t4 < e5.length; t4++)
              i3.push(e5[t4]);
          }
          return i3;
        }
        _getJoinedRanges(t3, i3, s17, r2, o2) {
          const n2 = t3.substring(i3, s17);
          let a2 = [];
          try {
            a2 = this._characterJoiners[0].handler(n2);
          } catch (e4) {
            console.error(e4);
          }
          for (let t4 = 1;t4 < this._characterJoiners.length; t4++)
            try {
              const i4 = this._characterJoiners[t4].handler(n2);
              for (let t5 = 0;t5 < i4.length; t5++)
                e3._mergeRanges(a2, i4[t5]);
            } catch (e4) {
              console.error(e4);
            }
          return this._stringRangesToCellRanges(a2, r2, o2), a2;
        }
        _stringRangesToCellRanges(e4, t3, i3) {
          let s17 = 0, r2 = false, o2 = 0, a2 = e4[s17];
          if (a2) {
            for (let h2 = i3;h2 < this._bufferService.cols; h2++) {
              const i4 = t3.getWidth(h2), l2 = t3.getString(h2).length || n.WHITESPACE_CELL_CHAR.length;
              if (i4 !== 0) {
                if (!r2 && a2[0] <= o2 && (a2[0] = h2, r2 = true), a2[1] <= o2) {
                  if (a2[1] = h2, a2 = e4[++s17], !a2)
                    break;
                  a2[0] <= o2 ? (a2[0] = h2, r2 = true) : r2 = false;
                }
                o2 += l2;
              }
            }
            a2 && (a2[1] = this._bufferService.cols);
          }
        }
        static _mergeRanges(e4, t3) {
          let i3 = false;
          for (let s17 = 0;s17 < e4.length; s17++) {
            const r2 = e4[s17];
            if (i3) {
              if (t3[1] <= r2[0])
                return e4[s17 - 1][1] = t3[1], e4;
              if (t3[1] <= r2[1])
                return e4[s17 - 1][1] = Math.max(t3[1], r2[1]), e4.splice(s17, 1), e4;
              e4.splice(s17, 1), s17--;
            } else {
              if (t3[1] <= r2[0])
                return e4.splice(s17, 0, t3), e4;
              if (t3[1] <= r2[1])
                return r2[0] = Math.min(t3[0], r2[0]), e4;
              t3[0] < r2[1] && (r2[0] = Math.min(t3[0], r2[0]), i3 = true);
            }
          }
          return i3 ? e4[e4.length - 1][1] = t3[1] : e4.push(t3), e4;
        }
      };
      t2.CharacterJoinerService = c = s16([r(0, h.IBufferService)], c);
    }, 160: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.contrastRatio = t2.toPaddedHex = t2.rgba = t2.rgb = t2.css = t2.color = t2.channels = t2.NULL_COLOR = undefined;
      let i2 = 0, s16 = 0, r = 0, o = 0;
      var n, a, h, l, c;
      function d(e3) {
        const t3 = e3.toString(16);
        return t3.length < 2 ? "0" + t3 : t3;
      }
      function _(e3, t3) {
        return e3 < t3 ? (t3 + 0.05) / (e3 + 0.05) : (e3 + 0.05) / (t3 + 0.05);
      }
      t2.NULL_COLOR = { css: "#00000000", rgba: 0 }, function(e3) {
        e3.toCss = function(e4, t3, i3, s17) {
          return s17 !== undefined ? `#${d(e4)}${d(t3)}${d(i3)}${d(s17)}` : `#${d(e4)}${d(t3)}${d(i3)}`;
        }, e3.toRgba = function(e4, t3, i3, s17 = 255) {
          return (e4 << 24 | t3 << 16 | i3 << 8 | s17) >>> 0;
        }, e3.toColor = function(t3, i3, s17, r2) {
          return { css: e3.toCss(t3, i3, s17, r2), rgba: e3.toRgba(t3, i3, s17, r2) };
        };
      }(n || (t2.channels = n = {})), function(e3) {
        function t3(e4, t4) {
          return o = Math.round(255 * t4), [i2, s16, r] = c.toChannels(e4.rgba), { css: n.toCss(i2, s16, r, o), rgba: n.toRgba(i2, s16, r, o) };
        }
        e3.blend = function(e4, t4) {
          if (o = (255 & t4.rgba) / 255, o === 1)
            return { css: t4.css, rgba: t4.rgba };
          const a2 = t4.rgba >> 24 & 255, h2 = t4.rgba >> 16 & 255, l2 = t4.rgba >> 8 & 255, c2 = e4.rgba >> 24 & 255, d2 = e4.rgba >> 16 & 255, _2 = e4.rgba >> 8 & 255;
          return i2 = c2 + Math.round((a2 - c2) * o), s16 = d2 + Math.round((h2 - d2) * o), r = _2 + Math.round((l2 - _2) * o), { css: n.toCss(i2, s16, r), rgba: n.toRgba(i2, s16, r) };
        }, e3.isOpaque = function(e4) {
          return (255 & e4.rgba) == 255;
        }, e3.ensureContrastRatio = function(e4, t4, i3) {
          const s17 = c.ensureContrastRatio(e4.rgba, t4.rgba, i3);
          if (s17)
            return n.toColor(s17 >> 24 & 255, s17 >> 16 & 255, s17 >> 8 & 255);
        }, e3.opaque = function(e4) {
          const t4 = (255 | e4.rgba) >>> 0;
          return [i2, s16, r] = c.toChannels(t4), { css: n.toCss(i2, s16, r), rgba: t4 };
        }, e3.opacity = t3, e3.multiplyOpacity = function(e4, i3) {
          return o = 255 & e4.rgba, t3(e4, o * i3 / 255);
        }, e3.toColorRGB = function(e4) {
          return [e4.rgba >> 24 & 255, e4.rgba >> 16 & 255, e4.rgba >> 8 & 255];
        };
      }(a || (t2.color = a = {})), function(e3) {
        let t3, a2;
        try {
          const e4 = document.createElement("canvas");
          e4.width = 1, e4.height = 1;
          const i3 = e4.getContext("2d", { willReadFrequently: true });
          i3 && (t3 = i3, t3.globalCompositeOperation = "copy", a2 = t3.createLinearGradient(0, 0, 1, 1));
        } catch {}
        e3.toColor = function(e4) {
          if (e4.match(/#[\da-f]{3,8}/i))
            switch (e4.length) {
              case 4:
                return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s16 = parseInt(e4.slice(2, 3).repeat(2), 16), r = parseInt(e4.slice(3, 4).repeat(2), 16), n.toColor(i2, s16, r);
              case 5:
                return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s16 = parseInt(e4.slice(2, 3).repeat(2), 16), r = parseInt(e4.slice(3, 4).repeat(2), 16), o = parseInt(e4.slice(4, 5).repeat(2), 16), n.toColor(i2, s16, r, o);
              case 7:
                return { css: e4, rgba: (parseInt(e4.slice(1), 16) << 8 | 255) >>> 0 };
              case 9:
                return { css: e4, rgba: parseInt(e4.slice(1), 16) >>> 0 };
            }
          const h2 = e4.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);
          if (h2)
            return i2 = parseInt(h2[1]), s16 = parseInt(h2[2]), r = parseInt(h2[3]), o = Math.round(255 * (h2[5] === undefined ? 1 : parseFloat(h2[5]))), n.toColor(i2, s16, r, o);
          if (!t3 || !a2)
            throw new Error("css.toColor: Unsupported css format");
          if (t3.fillStyle = a2, t3.fillStyle = e4, typeof t3.fillStyle != "string")
            throw new Error("css.toColor: Unsupported css format");
          if (t3.fillRect(0, 0, 1, 1), [i2, s16, r, o] = t3.getImageData(0, 0, 1, 1).data, o !== 255)
            throw new Error("css.toColor: Unsupported css format");
          return { rgba: n.toRgba(i2, s16, r, o), css: e4 };
        };
      }(h || (t2.css = h = {})), function(e3) {
        function t3(e4, t4, i3) {
          const s17 = e4 / 255, r2 = t4 / 255, o2 = i3 / 255;
          return 0.2126 * (s17 <= 0.03928 ? s17 / 12.92 : Math.pow((s17 + 0.055) / 1.055, 2.4)) + 0.7152 * (r2 <= 0.03928 ? r2 / 12.92 : Math.pow((r2 + 0.055) / 1.055, 2.4)) + 0.0722 * (o2 <= 0.03928 ? o2 / 12.92 : Math.pow((o2 + 0.055) / 1.055, 2.4));
        }
        e3.relativeLuminance = function(e4) {
          return t3(e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4);
        }, e3.relativeLuminance2 = t3;
      }(l || (t2.rgb = l = {})), function(e3) {
        function t3(e4, t4, i3) {
          const s17 = e4 >> 24 & 255, r2 = e4 >> 16 & 255, o2 = e4 >> 8 & 255;
          let n2 = t4 >> 24 & 255, a3 = t4 >> 16 & 255, h2 = t4 >> 8 & 255, c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s17, r2, o2));
          for (;c2 < i3 && (n2 > 0 || a3 > 0 || h2 > 0); )
            n2 -= Math.max(0, Math.ceil(0.1 * n2)), a3 -= Math.max(0, Math.ceil(0.1 * a3)), h2 -= Math.max(0, Math.ceil(0.1 * h2)), c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s17, r2, o2));
          return (n2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
        }
        function a2(e4, t4, i3) {
          const s17 = e4 >> 24 & 255, r2 = e4 >> 16 & 255, o2 = e4 >> 8 & 255;
          let n2 = t4 >> 24 & 255, a3 = t4 >> 16 & 255, h2 = t4 >> 8 & 255, c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s17, r2, o2));
          for (;c2 < i3 && (n2 < 255 || a3 < 255 || h2 < 255); )
            n2 = Math.min(255, n2 + Math.ceil(0.1 * (255 - n2))), a3 = Math.min(255, a3 + Math.ceil(0.1 * (255 - a3))), h2 = Math.min(255, h2 + Math.ceil(0.1 * (255 - h2))), c2 = _(l.relativeLuminance2(n2, a3, h2), l.relativeLuminance2(s17, r2, o2));
          return (n2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
        }
        e3.blend = function(e4, t4) {
          if (o = (255 & t4) / 255, o === 1)
            return t4;
          const a3 = t4 >> 24 & 255, h2 = t4 >> 16 & 255, l2 = t4 >> 8 & 255, c2 = e4 >> 24 & 255, d2 = e4 >> 16 & 255, _2 = e4 >> 8 & 255;
          return i2 = c2 + Math.round((a3 - c2) * o), s16 = d2 + Math.round((h2 - d2) * o), r = _2 + Math.round((l2 - _2) * o), n.toRgba(i2, s16, r);
        }, e3.ensureContrastRatio = function(e4, i3, s17) {
          const r2 = l.relativeLuminance(e4 >> 8), o2 = l.relativeLuminance(i3 >> 8);
          if (_(r2, o2) < s17) {
            if (o2 < r2) {
              const o3 = t3(e4, i3, s17), n3 = _(r2, l.relativeLuminance(o3 >> 8));
              if (n3 < s17) {
                const t4 = a2(e4, i3, s17);
                return n3 > _(r2, l.relativeLuminance(t4 >> 8)) ? o3 : t4;
              }
              return o3;
            }
            const n2 = a2(e4, i3, s17), h2 = _(r2, l.relativeLuminance(n2 >> 8));
            if (h2 < s17) {
              const o3 = t3(e4, i3, s17);
              return h2 > _(r2, l.relativeLuminance(o3 >> 8)) ? n2 : o3;
            }
            return n2;
          }
        }, e3.reduceLuminance = t3, e3.increaseLuminance = a2, e3.toChannels = function(e4) {
          return [e4 >> 24 & 255, e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4];
        };
      }(c || (t2.rgba = c = {})), t2.toPaddedHex = d, t2.contrastRatio = _;
    }, 345: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.runAndSubscribe = t2.forwardEvent = t2.EventEmitter = undefined, t2.EventEmitter = class {
        constructor() {
          this._listeners = [], this._disposed = false;
        }
        get event() {
          return this._event || (this._event = (e3) => (this._listeners.push(e3), { dispose: () => {
            if (!this._disposed) {
              for (let t3 = 0;t3 < this._listeners.length; t3++)
                if (this._listeners[t3] === e3)
                  return void this._listeners.splice(t3, 1);
            }
          } })), this._event;
        }
        fire(e3, t3) {
          const i2 = [];
          for (let e4 = 0;e4 < this._listeners.length; e4++)
            i2.push(this._listeners[e4]);
          for (let s16 = 0;s16 < i2.length; s16++)
            i2[s16].call(undefined, e3, t3);
        }
        dispose() {
          this.clearListeners(), this._disposed = true;
        }
        clearListeners() {
          this._listeners && (this._listeners.length = 0);
        }
      }, t2.forwardEvent = function(e3, t3) {
        return e3((e4) => t3.fire(e4));
      }, t2.runAndSubscribe = function(e3, t3) {
        return t3(undefined), e3((e4) => t3(e4));
      };
    }, 859: (e2, t2) => {
      function i2(e3) {
        for (const t3 of e3)
          t3.dispose();
        e3.length = 0;
      }
      Object.defineProperty(t2, "__esModule", { value: true }), t2.getDisposeArrayDisposable = t2.disposeArray = t2.toDisposable = t2.MutableDisposable = t2.Disposable = undefined, t2.Disposable = class {
        constructor() {
          this._disposables = [], this._isDisposed = false;
        }
        dispose() {
          this._isDisposed = true;
          for (const e3 of this._disposables)
            e3.dispose();
          this._disposables.length = 0;
        }
        register(e3) {
          return this._disposables.push(e3), e3;
        }
        unregister(e3) {
          const t3 = this._disposables.indexOf(e3);
          t3 !== -1 && this._disposables.splice(t3, 1);
        }
      }, t2.MutableDisposable = class {
        constructor() {
          this._isDisposed = false;
        }
        get value() {
          return this._isDisposed ? undefined : this._value;
        }
        set value(e3) {
          this._isDisposed || e3 === this._value || (this._value?.dispose(), this._value = e3);
        }
        clear() {
          this.value = undefined;
        }
        dispose() {
          this._isDisposed = true, this._value?.dispose(), this._value = undefined;
        }
      }, t2.toDisposable = function(e3) {
        return { dispose: e3 };
      }, t2.disposeArray = i2, t2.getDisposeArrayDisposable = function(e3) {
        return { dispose: () => i2(e3) };
      };
    }, 485: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.FourKeyMap = t2.TwoKeyMap = undefined;

      class i2 {
        constructor() {
          this._data = {};
        }
        set(e3, t3, i3) {
          this._data[e3] || (this._data[e3] = {}), this._data[e3][t3] = i3;
        }
        get(e3, t3) {
          return this._data[e3] ? this._data[e3][t3] : undefined;
        }
        clear() {
          this._data = {};
        }
      }
      t2.TwoKeyMap = i2, t2.FourKeyMap = class {
        constructor() {
          this._data = new i2;
        }
        set(e3, t3, s16, r, o) {
          this._data.get(e3, t3) || this._data.set(e3, t3, new i2), this._data.get(e3, t3).set(s16, r, o);
        }
        get(e3, t3, i3, s16) {
          return this._data.get(e3, t3)?.get(i3, s16);
        }
        clear() {
          this._data.clear();
        }
      };
    }, 399: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.isChromeOS = t2.isLinux = t2.isWindows = t2.isIphone = t2.isIpad = t2.isMac = t2.getSafariVersion = t2.isSafari = t2.isLegacyEdge = t2.isFirefox = t2.isNode = undefined, t2.isNode = typeof process != "undefined" && "title" in process;
      const i2 = t2.isNode ? "node" : navigator.userAgent, s16 = t2.isNode ? "node" : navigator.platform;
      t2.isFirefox = i2.includes("Firefox"), t2.isLegacyEdge = i2.includes("Edge"), t2.isSafari = /^((?!chrome|android).)*safari/i.test(i2), t2.getSafariVersion = function() {
        if (!t2.isSafari)
          return 0;
        const e3 = i2.match(/Version\/(\d+)/);
        return e3 === null || e3.length < 2 ? 0 : parseInt(e3[1]);
      }, t2.isMac = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(s16), t2.isIpad = s16 === "iPad", t2.isIphone = s16 === "iPhone", t2.isWindows = ["Windows", "Win16", "Win32", "WinCE"].includes(s16), t2.isLinux = s16.indexOf("Linux") >= 0, t2.isChromeOS = /\bCrOS\b/.test(i2);
    }, 385: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.DebouncedIdleTask = t2.IdleTaskQueue = t2.PriorityTaskQueue = undefined;
      const s16 = i2(399);

      class r {
        constructor() {
          this._tasks = [], this._i = 0;
        }
        enqueue(e3) {
          this._tasks.push(e3), this._start();
        }
        flush() {
          for (;this._i < this._tasks.length; )
            this._tasks[this._i]() || this._i++;
          this.clear();
        }
        clear() {
          this._idleCallback && (this._cancelCallback(this._idleCallback), this._idleCallback = undefined), this._i = 0, this._tasks.length = 0;
        }
        _start() {
          this._idleCallback || (this._idleCallback = this._requestCallback(this._process.bind(this)));
        }
        _process(e3) {
          this._idleCallback = undefined;
          let t3 = 0, i3 = 0, s17 = e3.timeRemaining(), r2 = 0;
          for (;this._i < this._tasks.length; ) {
            if (t3 = Date.now(), this._tasks[this._i]() || this._i++, t3 = Math.max(1, Date.now() - t3), i3 = Math.max(t3, i3), r2 = e3.timeRemaining(), 1.5 * i3 > r2)
              return s17 - t3 < -20 && console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(s17 - t3))}ms`), void this._start();
            s17 = r2;
          }
          this.clear();
        }
      }

      class o extends r {
        _requestCallback(e3) {
          return setTimeout(() => e3(this._createDeadline(16)));
        }
        _cancelCallback(e3) {
          clearTimeout(e3);
        }
        _createDeadline(e3) {
          const t3 = Date.now() + e3;
          return { timeRemaining: () => Math.max(0, t3 - Date.now()) };
        }
      }
      t2.PriorityTaskQueue = o, t2.IdleTaskQueue = !s16.isNode && "requestIdleCallback" in window ? class extends r {
        _requestCallback(e3) {
          return requestIdleCallback(e3);
        }
        _cancelCallback(e3) {
          cancelIdleCallback(e3);
        }
      } : o, t2.DebouncedIdleTask = class {
        constructor() {
          this._queue = new t2.IdleTaskQueue;
        }
        set(e3) {
          this._queue.clear(), this._queue.enqueue(e3);
        }
        flush() {
          this._queue.flush();
        }
      };
    }, 147: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.ExtendedAttrs = t2.AttributeData = undefined;

      class i2 {
        constructor() {
          this.fg = 0, this.bg = 0, this.extended = new s16;
        }
        static toColorRGB(e3) {
          return [e3 >>> 16 & 255, e3 >>> 8 & 255, 255 & e3];
        }
        static fromColorRGB(e3) {
          return (255 & e3[0]) << 16 | (255 & e3[1]) << 8 | 255 & e3[2];
        }
        clone() {
          const e3 = new i2;
          return e3.fg = this.fg, e3.bg = this.bg, e3.extended = this.extended.clone(), e3;
        }
        isInverse() {
          return 67108864 & this.fg;
        }
        isBold() {
          return 134217728 & this.fg;
        }
        isUnderline() {
          return this.hasExtendedAttrs() && this.extended.underlineStyle !== 0 ? 1 : 268435456 & this.fg;
        }
        isBlink() {
          return 536870912 & this.fg;
        }
        isInvisible() {
          return 1073741824 & this.fg;
        }
        isItalic() {
          return 67108864 & this.bg;
        }
        isDim() {
          return 134217728 & this.bg;
        }
        isStrikethrough() {
          return 2147483648 & this.fg;
        }
        isProtected() {
          return 536870912 & this.bg;
        }
        isOverline() {
          return 1073741824 & this.bg;
        }
        getFgColorMode() {
          return 50331648 & this.fg;
        }
        getBgColorMode() {
          return 50331648 & this.bg;
        }
        isFgRGB() {
          return (50331648 & this.fg) == 50331648;
        }
        isBgRGB() {
          return (50331648 & this.bg) == 50331648;
        }
        isFgPalette() {
          return (50331648 & this.fg) == 16777216 || (50331648 & this.fg) == 33554432;
        }
        isBgPalette() {
          return (50331648 & this.bg) == 16777216 || (50331648 & this.bg) == 33554432;
        }
        isFgDefault() {
          return (50331648 & this.fg) == 0;
        }
        isBgDefault() {
          return (50331648 & this.bg) == 0;
        }
        isAttributeDefault() {
          return this.fg === 0 && this.bg === 0;
        }
        getFgColor() {
          switch (50331648 & this.fg) {
            case 16777216:
            case 33554432:
              return 255 & this.fg;
            case 50331648:
              return 16777215 & this.fg;
            default:
              return -1;
          }
        }
        getBgColor() {
          switch (50331648 & this.bg) {
            case 16777216:
            case 33554432:
              return 255 & this.bg;
            case 50331648:
              return 16777215 & this.bg;
            default:
              return -1;
          }
        }
        hasExtendedAttrs() {
          return 268435456 & this.bg;
        }
        updateExtended() {
          this.extended.isEmpty() ? this.bg &= -268435457 : this.bg |= 268435456;
        }
        getUnderlineColor() {
          if (268435456 & this.bg && ~this.extended.underlineColor)
            switch (50331648 & this.extended.underlineColor) {
              case 16777216:
              case 33554432:
                return 255 & this.extended.underlineColor;
              case 50331648:
                return 16777215 & this.extended.underlineColor;
              default:
                return this.getFgColor();
            }
          return this.getFgColor();
        }
        getUnderlineColorMode() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 & this.extended.underlineColor : this.getFgColorMode();
        }
        isUnderlineColorRGB() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 50331648 : this.isFgRGB();
        }
        isUnderlineColorPalette() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 16777216 || (50331648 & this.extended.underlineColor) == 33554432 : this.isFgPalette();
        }
        isUnderlineColorDefault() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? (50331648 & this.extended.underlineColor) == 0 : this.isFgDefault();
        }
        getUnderlineStyle() {
          return 268435456 & this.fg ? 268435456 & this.bg ? this.extended.underlineStyle : 1 : 0;
        }
        getUnderlineVariantOffset() {
          return this.extended.underlineVariantOffset;
        }
      }
      t2.AttributeData = i2;

      class s16 {
        get ext() {
          return this._urlId ? -469762049 & this._ext | this.underlineStyle << 26 : this._ext;
        }
        set ext(e3) {
          this._ext = e3;
        }
        get underlineStyle() {
          return this._urlId ? 5 : (469762048 & this._ext) >> 26;
        }
        set underlineStyle(e3) {
          this._ext &= -469762049, this._ext |= e3 << 26 & 469762048;
        }
        get underlineColor() {
          return 67108863 & this._ext;
        }
        set underlineColor(e3) {
          this._ext &= -67108864, this._ext |= 67108863 & e3;
        }
        get urlId() {
          return this._urlId;
        }
        set urlId(e3) {
          this._urlId = e3;
        }
        get underlineVariantOffset() {
          const e3 = (3758096384 & this._ext) >> 29;
          return e3 < 0 ? 4294967288 ^ e3 : e3;
        }
        set underlineVariantOffset(e3) {
          this._ext &= 536870911, this._ext |= e3 << 29 & 3758096384;
        }
        constructor(e3 = 0, t3 = 0) {
          this._ext = 0, this._urlId = 0, this._ext = e3, this._urlId = t3;
        }
        clone() {
          return new s16(this._ext, this._urlId);
        }
        isEmpty() {
          return this.underlineStyle === 0 && this._urlId === 0;
        }
      }
      t2.ExtendedAttrs = s16;
    }, 782: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.CellData = undefined;
      const s16 = i2(133), r = i2(855), o = i2(147);

      class n extends o.AttributeData {
        constructor() {
          super(...arguments), this.content = 0, this.fg = 0, this.bg = 0, this.extended = new o.ExtendedAttrs, this.combinedData = "";
        }
        static fromCharData(e3) {
          const t3 = new n;
          return t3.setFromCharData(e3), t3;
        }
        isCombined() {
          return 2097152 & this.content;
        }
        getWidth() {
          return this.content >> 22;
        }
        getChars() {
          return 2097152 & this.content ? this.combinedData : 2097151 & this.content ? (0, s16.stringFromCodePoint)(2097151 & this.content) : "";
        }
        getCode() {
          return this.isCombined() ? this.combinedData.charCodeAt(this.combinedData.length - 1) : 2097151 & this.content;
        }
        setFromCharData(e3) {
          this.fg = e3[r.CHAR_DATA_ATTR_INDEX], this.bg = 0;
          let t3 = false;
          if (e3[r.CHAR_DATA_CHAR_INDEX].length > 2)
            t3 = true;
          else if (e3[r.CHAR_DATA_CHAR_INDEX].length === 2) {
            const i3 = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0);
            if (55296 <= i3 && i3 <= 56319) {
              const s17 = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(1);
              56320 <= s17 && s17 <= 57343 ? this.content = 1024 * (i3 - 55296) + s17 - 56320 + 65536 | e3[r.CHAR_DATA_WIDTH_INDEX] << 22 : t3 = true;
            } else
              t3 = true;
          } else
            this.content = e3[r.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | e3[r.CHAR_DATA_WIDTH_INDEX] << 22;
          t3 && (this.combinedData = e3[r.CHAR_DATA_CHAR_INDEX], this.content = 2097152 | e3[r.CHAR_DATA_WIDTH_INDEX] << 22);
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }
      t2.CellData = n;
    }, 855: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.WHITESPACE_CELL_CODE = t2.WHITESPACE_CELL_WIDTH = t2.WHITESPACE_CELL_CHAR = t2.NULL_CELL_CODE = t2.NULL_CELL_WIDTH = t2.NULL_CELL_CHAR = t2.CHAR_DATA_CODE_INDEX = t2.CHAR_DATA_WIDTH_INDEX = t2.CHAR_DATA_CHAR_INDEX = t2.CHAR_DATA_ATTR_INDEX = t2.DEFAULT_EXT = t2.DEFAULT_ATTR = t2.DEFAULT_COLOR = undefined, t2.DEFAULT_COLOR = 0, t2.DEFAULT_ATTR = 256 | t2.DEFAULT_COLOR << 9, t2.DEFAULT_EXT = 0, t2.CHAR_DATA_ATTR_INDEX = 0, t2.CHAR_DATA_CHAR_INDEX = 1, t2.CHAR_DATA_WIDTH_INDEX = 2, t2.CHAR_DATA_CODE_INDEX = 3, t2.NULL_CELL_CHAR = "", t2.NULL_CELL_WIDTH = 1, t2.NULL_CELL_CODE = 0, t2.WHITESPACE_CELL_CHAR = " ", t2.WHITESPACE_CELL_WIDTH = 1, t2.WHITESPACE_CELL_CODE = 32;
    }, 133: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.Utf8ToUtf32 = t2.StringToUtf32 = t2.utf32ToString = t2.stringFromCodePoint = undefined, t2.stringFromCodePoint = function(e3) {
        return e3 > 65535 ? (e3 -= 65536, String.fromCharCode(55296 + (e3 >> 10)) + String.fromCharCode(e3 % 1024 + 56320)) : String.fromCharCode(e3);
      }, t2.utf32ToString = function(e3, t3 = 0, i2 = e3.length) {
        let s16 = "";
        for (let r = t3;r < i2; ++r) {
          let t4 = e3[r];
          t4 > 65535 ? (t4 -= 65536, s16 += String.fromCharCode(55296 + (t4 >> 10)) + String.fromCharCode(t4 % 1024 + 56320)) : s16 += String.fromCharCode(t4);
        }
        return s16;
      }, t2.StringToUtf32 = class {
        constructor() {
          this._interim = 0;
        }
        clear() {
          this._interim = 0;
        }
        decode(e3, t3) {
          const i2 = e3.length;
          if (!i2)
            return 0;
          let s16 = 0, r = 0;
          if (this._interim) {
            const i3 = e3.charCodeAt(r++);
            56320 <= i3 && i3 <= 57343 ? t3[s16++] = 1024 * (this._interim - 55296) + i3 - 56320 + 65536 : (t3[s16++] = this._interim, t3[s16++] = i3), this._interim = 0;
          }
          for (let o = r;o < i2; ++o) {
            const r2 = e3.charCodeAt(o);
            if (55296 <= r2 && r2 <= 56319) {
              if (++o >= i2)
                return this._interim = r2, s16;
              const n = e3.charCodeAt(o);
              56320 <= n && n <= 57343 ? t3[s16++] = 1024 * (r2 - 55296) + n - 56320 + 65536 : (t3[s16++] = r2, t3[s16++] = n);
            } else
              r2 !== 65279 && (t3[s16++] = r2);
          }
          return s16;
        }
      }, t2.Utf8ToUtf32 = class {
        constructor() {
          this.interim = new Uint8Array(3);
        }
        clear() {
          this.interim.fill(0);
        }
        decode(e3, t3) {
          const i2 = e3.length;
          if (!i2)
            return 0;
          let s16, r, o, n, a = 0, h = 0, l = 0;
          if (this.interim[0]) {
            let s17 = false, r2 = this.interim[0];
            r2 &= (224 & r2) == 192 ? 31 : (240 & r2) == 224 ? 15 : 7;
            let o2, n2 = 0;
            for (;(o2 = 63 & this.interim[++n2]) && n2 < 4; )
              r2 <<= 6, r2 |= o2;
            const h2 = (224 & this.interim[0]) == 192 ? 2 : (240 & this.interim[0]) == 224 ? 3 : 4, c2 = h2 - n2;
            for (;l < c2; ) {
              if (l >= i2)
                return 0;
              if (o2 = e3[l++], (192 & o2) != 128) {
                l--, s17 = true;
                break;
              }
              this.interim[n2++] = o2, r2 <<= 6, r2 |= 63 & o2;
            }
            s17 || (h2 === 2 ? r2 < 128 ? l-- : t3[a++] = r2 : h2 === 3 ? r2 < 2048 || r2 >= 55296 && r2 <= 57343 || r2 === 65279 || (t3[a++] = r2) : r2 < 65536 || r2 > 1114111 || (t3[a++] = r2)), this.interim.fill(0);
          }
          const c = i2 - 4;
          let d = l;
          for (;d < i2; ) {
            for (;!(!(d < c) || 128 & (s16 = e3[d]) || 128 & (r = e3[d + 1]) || 128 & (o = e3[d + 2]) || 128 & (n = e3[d + 3])); )
              t3[a++] = s16, t3[a++] = r, t3[a++] = o, t3[a++] = n, d += 4;
            if (s16 = e3[d++], s16 < 128)
              t3[a++] = s16;
            else if ((224 & s16) == 192) {
              if (d >= i2)
                return this.interim[0] = s16, a;
              if (r = e3[d++], (192 & r) != 128) {
                d--;
                continue;
              }
              if (h = (31 & s16) << 6 | 63 & r, h < 128) {
                d--;
                continue;
              }
              t3[a++] = h;
            } else if ((240 & s16) == 224) {
              if (d >= i2)
                return this.interim[0] = s16, a;
              if (r = e3[d++], (192 & r) != 128) {
                d--;
                continue;
              }
              if (d >= i2)
                return this.interim[0] = s16, this.interim[1] = r, a;
              if (o = e3[d++], (192 & o) != 128) {
                d--;
                continue;
              }
              if (h = (15 & s16) << 12 | (63 & r) << 6 | 63 & o, h < 2048 || h >= 55296 && h <= 57343 || h === 65279)
                continue;
              t3[a++] = h;
            } else if ((248 & s16) == 240) {
              if (d >= i2)
                return this.interim[0] = s16, a;
              if (r = e3[d++], (192 & r) != 128) {
                d--;
                continue;
              }
              if (d >= i2)
                return this.interim[0] = s16, this.interim[1] = r, a;
              if (o = e3[d++], (192 & o) != 128) {
                d--;
                continue;
              }
              if (d >= i2)
                return this.interim[0] = s16, this.interim[1] = r, this.interim[2] = o, a;
              if (n = e3[d++], (192 & n) != 128) {
                d--;
                continue;
              }
              if (h = (7 & s16) << 18 | (63 & r) << 12 | (63 & o) << 6 | 63 & n, h < 65536 || h > 1114111)
                continue;
              t3[a++] = h;
            }
          }
          return a;
        }
      };
    }, 776: function(e2, t2, i2) {
      var s16 = this && this.__decorate || function(e3, t3, i3, s17) {
        var r2, o2 = arguments.length, n2 = o2 < 3 ? t3 : s17 === null ? s17 = Object.getOwnPropertyDescriptor(t3, i3) : s17;
        if (typeof Reflect == "object" && typeof Reflect.decorate == "function")
          n2 = Reflect.decorate(e3, t3, i3, s17);
        else
          for (var a2 = e3.length - 1;a2 >= 0; a2--)
            (r2 = e3[a2]) && (n2 = (o2 < 3 ? r2(n2) : o2 > 3 ? r2(t3, i3, n2) : r2(t3, i3)) || n2);
        return o2 > 3 && n2 && Object.defineProperty(t3, i3, n2), n2;
      }, r = this && this.__param || function(e3, t3) {
        return function(i3, s17) {
          t3(i3, s17, e3);
        };
      };
      Object.defineProperty(t2, "__esModule", { value: true }), t2.traceCall = t2.setTraceLogger = t2.LogService = undefined;
      const o = i2(859), n = i2(97), a = { trace: n.LogLevelEnum.TRACE, debug: n.LogLevelEnum.DEBUG, info: n.LogLevelEnum.INFO, warn: n.LogLevelEnum.WARN, error: n.LogLevelEnum.ERROR, off: n.LogLevelEnum.OFF };
      let h, l = t2.LogService = class extends o.Disposable {
        get logLevel() {
          return this._logLevel;
        }
        constructor(e3) {
          super(), this._optionsService = e3, this._logLevel = n.LogLevelEnum.OFF, this._updateLogLevel(), this.register(this._optionsService.onSpecificOptionChange("logLevel", () => this._updateLogLevel())), h = this;
        }
        _updateLogLevel() {
          this._logLevel = a[this._optionsService.rawOptions.logLevel];
        }
        _evalLazyOptionalParams(e3) {
          for (let t3 = 0;t3 < e3.length; t3++)
            typeof e3[t3] == "function" && (e3[t3] = e3[t3]());
        }
        _log(e3, t3, i3) {
          this._evalLazyOptionalParams(i3), e3.call(console, (this._optionsService.options.logger ? "" : "xterm.js: ") + t3, ...i3);
        }
        trace(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.TRACE && this._log(this._optionsService.options.logger?.trace.bind(this._optionsService.options.logger) ?? console.log, e3, t3);
        }
        debug(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.DEBUG && this._log(this._optionsService.options.logger?.debug.bind(this._optionsService.options.logger) ?? console.log, e3, t3);
        }
        info(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.INFO && this._log(this._optionsService.options.logger?.info.bind(this._optionsService.options.logger) ?? console.info, e3, t3);
        }
        warn(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.WARN && this._log(this._optionsService.options.logger?.warn.bind(this._optionsService.options.logger) ?? console.warn, e3, t3);
        }
        error(e3, ...t3) {
          this._logLevel <= n.LogLevelEnum.ERROR && this._log(this._optionsService.options.logger?.error.bind(this._optionsService.options.logger) ?? console.error, e3, t3);
        }
      };
      t2.LogService = l = s16([r(0, n.IOptionsService)], l), t2.setTraceLogger = function(e3) {
        h = e3;
      }, t2.traceCall = function(e3, t3, i3) {
        if (typeof i3.value != "function")
          throw new Error("not supported");
        const s17 = i3.value;
        i3.value = function(...e4) {
          if (h.logLevel !== n.LogLevelEnum.TRACE)
            return s17.apply(this, e4);
          h.trace(`GlyphRenderer#${s17.name}(${e4.map((e5) => JSON.stringify(e5)).join(", ")})`);
          const t4 = s17.apply(this, e4);
          return h.trace(`GlyphRenderer#${s17.name} return`, t4), t4;
        };
      };
    }, 726: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.createDecorator = t2.getServiceDependencies = t2.serviceRegistry = undefined;
      const i2 = "di$target", s16 = "di$dependencies";
      t2.serviceRegistry = new Map, t2.getServiceDependencies = function(e3) {
        return e3[s16] || [];
      }, t2.createDecorator = function(e3) {
        if (t2.serviceRegistry.has(e3))
          return t2.serviceRegistry.get(e3);
        const r = function(e4, t3, o) {
          if (arguments.length !== 3)
            throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
          (function(e5, t4, r2) {
            t4[i2] === t4 ? t4[s16].push({ id: e5, index: r2 }) : (t4[s16] = [{ id: e5, index: r2 }], t4[i2] = t4);
          })(r, e4, o);
        };
        return r.toString = () => e3, t2.serviceRegistry.set(e3, r), r;
      };
    }, 97: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.IDecorationService = t2.IUnicodeService = t2.IOscLinkService = t2.IOptionsService = t2.ILogService = t2.LogLevelEnum = t2.IInstantiationService = t2.ICharsetService = t2.ICoreService = t2.ICoreMouseService = t2.IBufferService = undefined;
      const s16 = i2(726);
      var r;
      t2.IBufferService = (0, s16.createDecorator)("BufferService"), t2.ICoreMouseService = (0, s16.createDecorator)("CoreMouseService"), t2.ICoreService = (0, s16.createDecorator)("CoreService"), t2.ICharsetService = (0, s16.createDecorator)("CharsetService"), t2.IInstantiationService = (0, s16.createDecorator)("InstantiationService"), function(e3) {
        e3[e3.TRACE = 0] = "TRACE", e3[e3.DEBUG = 1] = "DEBUG", e3[e3.INFO = 2] = "INFO", e3[e3.WARN = 3] = "WARN", e3[e3.ERROR = 4] = "ERROR", e3[e3.OFF = 5] = "OFF";
      }(r || (t2.LogLevelEnum = r = {})), t2.ILogService = (0, s16.createDecorator)("LogService"), t2.IOptionsService = (0, s16.createDecorator)("OptionsService"), t2.IOscLinkService = (0, s16.createDecorator)("OscLinkService"), t2.IUnicodeService = (0, s16.createDecorator)("UnicodeService"), t2.IDecorationService = (0, s16.createDecorator)("DecorationService");
    } }, t = {};
    function i(s16) {
      var r = t[s16];
      if (r !== undefined)
        return r.exports;
      var o = t[s16] = { exports: {} };
      return e[s16].call(o.exports, o, o.exports, i), o.exports;
    }
    var s15 = {};
    return (() => {
      var e2 = s15;
      Object.defineProperty(e2, "__esModule", { value: true }), e2.CanvasAddon = undefined;
      const t2 = i(345), r = i(859), o = i(776), n = i(949);

      class a extends r.Disposable {
        constructor() {
          super(...arguments), this._onChangeTextureAtlas = this.register(new t2.EventEmitter), this.onChangeTextureAtlas = this._onChangeTextureAtlas.event, this._onAddTextureAtlasCanvas = this.register(new t2.EventEmitter), this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event;
        }
        get textureAtlas() {
          return this._renderer?.textureAtlas;
        }
        activate(e3) {
          const i2 = e3._core;
          if (!e3.element)
            return void this.register(i2.onWillOpen(() => this.activate(e3)));
          this._terminal = e3;
          const { coreService: s16, optionsService: a2, screenElement: h, linkifier: l } = i2, c = i2, d = c._bufferService, _ = c._renderService, u = c._characterJoinerService, g = c._charSizeService, f = c._coreBrowserService, v2 = c._decorationService, C2 = c._logService, p = c._themeService;
          (0, o.setTraceLogger)(C2), this._renderer = new n.CanvasRenderer(e3, h, l, d, g, a2, u, s16, f, v2, p), this.register((0, t2.forwardEvent)(this._renderer.onChangeTextureAtlas, this._onChangeTextureAtlas)), this.register((0, t2.forwardEvent)(this._renderer.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas)), _.setRenderer(this._renderer), _.handleResize(d.cols, d.rows), this.register((0, r.toDisposable)(() => {
            _.setRenderer(this._terminal._core._createRenderer()), _.handleResize(e3.cols, e3.rows), this._renderer?.dispose(), this._renderer = undefined;
          }));
        }
        clearTextureAtlas() {
          this._renderer?.clearTextureAtlas();
        }
      }
      e2.CanvasAddon = a;
    })(), s15;
  })());
});

// node_modules/@xterm/addon-unicode11/lib/addon-unicode11.js
var require_addon_unicode11 = __commonJS((exports, module) => {
  (function(e, t) {
    typeof exports == "object" && typeof module == "object" ? module.exports = t() : typeof define == "function" && define.amd ? define([], t) : typeof exports == "object" ? exports.Unicode11Addon = t() : e.Unicode11Addon = t();
  })(exports, () => (() => {
    var e = { 433: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.UnicodeV11 = undefined;
      const r2 = i2(938), s15 = [[768, 879], [1155, 1161], [1425, 1469], [1471, 1471], [1473, 1474], [1476, 1477], [1479, 1479], [1536, 1541], [1552, 1562], [1564, 1564], [1611, 1631], [1648, 1648], [1750, 1757], [1759, 1764], [1767, 1768], [1770, 1773], [1807, 1807], [1809, 1809], [1840, 1866], [1958, 1968], [2027, 2035], [2045, 2045], [2070, 2073], [2075, 2083], [2085, 2087], [2089, 2093], [2137, 2139], [2259, 2306], [2362, 2362], [2364, 2364], [2369, 2376], [2381, 2381], [2385, 2391], [2402, 2403], [2433, 2433], [2492, 2492], [2497, 2500], [2509, 2509], [2530, 2531], [2558, 2558], [2561, 2562], [2620, 2620], [2625, 2626], [2631, 2632], [2635, 2637], [2641, 2641], [2672, 2673], [2677, 2677], [2689, 2690], [2748, 2748], [2753, 2757], [2759, 2760], [2765, 2765], [2786, 2787], [2810, 2815], [2817, 2817], [2876, 2876], [2879, 2879], [2881, 2884], [2893, 2893], [2902, 2902], [2914, 2915], [2946, 2946], [3008, 3008], [3021, 3021], [3072, 3072], [3076, 3076], [3134, 3136], [3142, 3144], [3146, 3149], [3157, 3158], [3170, 3171], [3201, 3201], [3260, 3260], [3263, 3263], [3270, 3270], [3276, 3277], [3298, 3299], [3328, 3329], [3387, 3388], [3393, 3396], [3405, 3405], [3426, 3427], [3530, 3530], [3538, 3540], [3542, 3542], [3633, 3633], [3636, 3642], [3655, 3662], [3761, 3761], [3764, 3772], [3784, 3789], [3864, 3865], [3893, 3893], [3895, 3895], [3897, 3897], [3953, 3966], [3968, 3972], [3974, 3975], [3981, 3991], [3993, 4028], [4038, 4038], [4141, 4144], [4146, 4151], [4153, 4154], [4157, 4158], [4184, 4185], [4190, 4192], [4209, 4212], [4226, 4226], [4229, 4230], [4237, 4237], [4253, 4253], [4448, 4607], [4957, 4959], [5906, 5908], [5938, 5940], [5970, 5971], [6002, 6003], [6068, 6069], [6071, 6077], [6086, 6086], [6089, 6099], [6109, 6109], [6155, 6158], [6277, 6278], [6313, 6313], [6432, 6434], [6439, 6440], [6450, 6450], [6457, 6459], [6679, 6680], [6683, 6683], [6742, 6742], [6744, 6750], [6752, 6752], [6754, 6754], [6757, 6764], [6771, 6780], [6783, 6783], [6832, 6846], [6912, 6915], [6964, 6964], [6966, 6970], [6972, 6972], [6978, 6978], [7019, 7027], [7040, 7041], [7074, 7077], [7080, 7081], [7083, 7085], [7142, 7142], [7144, 7145], [7149, 7149], [7151, 7153], [7212, 7219], [7222, 7223], [7376, 7378], [7380, 7392], [7394, 7400], [7405, 7405], [7412, 7412], [7416, 7417], [7616, 7673], [7675, 7679], [8203, 8207], [8234, 8238], [8288, 8292], [8294, 8303], [8400, 8432], [11503, 11505], [11647, 11647], [11744, 11775], [12330, 12333], [12441, 12442], [42607, 42610], [42612, 42621], [42654, 42655], [42736, 42737], [43010, 43010], [43014, 43014], [43019, 43019], [43045, 43046], [43204, 43205], [43232, 43249], [43263, 43263], [43302, 43309], [43335, 43345], [43392, 43394], [43443, 43443], [43446, 43449], [43452, 43453], [43493, 43493], [43561, 43566], [43569, 43570], [43573, 43574], [43587, 43587], [43596, 43596], [43644, 43644], [43696, 43696], [43698, 43700], [43703, 43704], [43710, 43711], [43713, 43713], [43756, 43757], [43766, 43766], [44005, 44005], [44008, 44008], [44013, 44013], [64286, 64286], [65024, 65039], [65056, 65071], [65279, 65279], [65529, 65531]], n = [[66045, 66045], [66272, 66272], [66422, 66426], [68097, 68099], [68101, 68102], [68108, 68111], [68152, 68154], [68159, 68159], [68325, 68326], [68900, 68903], [69446, 69456], [69633, 69633], [69688, 69702], [69759, 69761], [69811, 69814], [69817, 69818], [69821, 69821], [69837, 69837], [69888, 69890], [69927, 69931], [69933, 69940], [70003, 70003], [70016, 70017], [70070, 70078], [70089, 70092], [70191, 70193], [70196, 70196], [70198, 70199], [70206, 70206], [70367, 70367], [70371, 70378], [70400, 70401], [70459, 70460], [70464, 70464], [70502, 70508], [70512, 70516], [70712, 70719], [70722, 70724], [70726, 70726], [70750, 70750], [70835, 70840], [70842, 70842], [70847, 70848], [70850, 70851], [71090, 71093], [71100, 71101], [71103, 71104], [71132, 71133], [71219, 71226], [71229, 71229], [71231, 71232], [71339, 71339], [71341, 71341], [71344, 71349], [71351, 71351], [71453, 71455], [71458, 71461], [71463, 71467], [71727, 71735], [71737, 71738], [72148, 72151], [72154, 72155], [72160, 72160], [72193, 72202], [72243, 72248], [72251, 72254], [72263, 72263], [72273, 72278], [72281, 72283], [72330, 72342], [72344, 72345], [72752, 72758], [72760, 72765], [72767, 72767], [72850, 72871], [72874, 72880], [72882, 72883], [72885, 72886], [73009, 73014], [73018, 73018], [73020, 73021], [73023, 73029], [73031, 73031], [73104, 73105], [73109, 73109], [73111, 73111], [73459, 73460], [78896, 78904], [92912, 92916], [92976, 92982], [94031, 94031], [94095, 94098], [113821, 113822], [113824, 113827], [119143, 119145], [119155, 119170], [119173, 119179], [119210, 119213], [119362, 119364], [121344, 121398], [121403, 121452], [121461, 121461], [121476, 121476], [121499, 121503], [121505, 121519], [122880, 122886], [122888, 122904], [122907, 122913], [122915, 122916], [122918, 122922], [123184, 123190], [123628, 123631], [125136, 125142], [125252, 125258], [917505, 917505], [917536, 917631], [917760, 917999]], o = [[4352, 4447], [8986, 8987], [9001, 9002], [9193, 9196], [9200, 9200], [9203, 9203], [9725, 9726], [9748, 9749], [9800, 9811], [9855, 9855], [9875, 9875], [9889, 9889], [9898, 9899], [9917, 9918], [9924, 9925], [9934, 9934], [9940, 9940], [9962, 9962], [9970, 9971], [9973, 9973], [9978, 9978], [9981, 9981], [9989, 9989], [9994, 9995], [10024, 10024], [10060, 10060], [10062, 10062], [10067, 10069], [10071, 10071], [10133, 10135], [10160, 10160], [10175, 10175], [11035, 11036], [11088, 11088], [11093, 11093], [11904, 11929], [11931, 12019], [12032, 12245], [12272, 12283], [12288, 12329], [12334, 12350], [12353, 12438], [12443, 12543], [12549, 12591], [12593, 12686], [12688, 12730], [12736, 12771], [12784, 12830], [12832, 12871], [12880, 19903], [19968, 42124], [42128, 42182], [43360, 43388], [44032, 55203], [63744, 64255], [65040, 65049], [65072, 65106], [65108, 65126], [65128, 65131], [65281, 65376], [65504, 65510]], c = [[94176, 94179], [94208, 100343], [100352, 101106], [110592, 110878], [110928, 110930], [110948, 110951], [110960, 111355], [126980, 126980], [127183, 127183], [127374, 127374], [127377, 127386], [127488, 127490], [127504, 127547], [127552, 127560], [127568, 127569], [127584, 127589], [127744, 127776], [127789, 127797], [127799, 127868], [127870, 127891], [127904, 127946], [127951, 127955], [127968, 127984], [127988, 127988], [127992, 128062], [128064, 128064], [128066, 128252], [128255, 128317], [128331, 128334], [128336, 128359], [128378, 128378], [128405, 128406], [128420, 128420], [128507, 128591], [128640, 128709], [128716, 128716], [128720, 128722], [128725, 128725], [128747, 128748], [128756, 128762], [128992, 129003], [129293, 129393], [129395, 129398], [129402, 129442], [129445, 129450], [129454, 129482], [129485, 129535], [129648, 129651], [129656, 129658], [129664, 129666], [129680, 129685], [131072, 196605], [196608, 262141]];
      let l;
      function d(e3, t3) {
        let i3, r3 = 0, s16 = t3.length - 1;
        if (e3 < t3[0][0] || e3 > t3[s16][1])
          return false;
        for (;s16 >= r3; )
          if (i3 = r3 + s16 >> 1, e3 > t3[i3][1])
            r3 = i3 + 1;
          else {
            if (!(e3 < t3[i3][0]))
              return true;
            s16 = i3 - 1;
          }
        return false;
      }
      t2.UnicodeV11 = class {
        constructor() {
          if (this.version = "11", !l) {
            l = new Uint8Array(65536), l.fill(1), l[0] = 0, l.fill(0, 1, 32), l.fill(0, 127, 160);
            for (let e3 = 0;e3 < s15.length; ++e3)
              l.fill(0, s15[e3][0], s15[e3][1] + 1);
            for (let e3 = 0;e3 < o.length; ++e3)
              l.fill(2, o[e3][0], o[e3][1] + 1);
          }
        }
        wcwidth(e3) {
          return e3 < 32 ? 0 : e3 < 127 ? 1 : e3 < 65536 ? l[e3] : d(e3, n) ? 0 : d(e3, c) ? 2 : 1;
        }
        charProperties(e3, t3) {
          let i3 = this.wcwidth(e3), s16 = i3 === 0 && t3 !== 0;
          if (s16) {
            const e4 = r2.UnicodeService.extractWidth(t3);
            e4 === 0 ? s16 = false : e4 > i3 && (i3 = e4);
          }
          return r2.UnicodeService.createPropertyValue(0, i3, s16);
        }
      };
    }, 345: (e2, t2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.runAndSubscribe = t2.forwardEvent = t2.EventEmitter = undefined, t2.EventEmitter = class {
        constructor() {
          this._listeners = [], this._disposed = false;
        }
        get event() {
          return this._event || (this._event = (e3) => (this._listeners.push(e3), { dispose: () => {
            if (!this._disposed) {
              for (let t3 = 0;t3 < this._listeners.length; t3++)
                if (this._listeners[t3] === e3)
                  return void this._listeners.splice(t3, 1);
            }
          } })), this._event;
        }
        fire(e3, t3) {
          const i2 = [];
          for (let e4 = 0;e4 < this._listeners.length; e4++)
            i2.push(this._listeners[e4]);
          for (let r2 = 0;r2 < i2.length; r2++)
            i2[r2].call(undefined, e3, t3);
        }
        dispose() {
          this.clearListeners(), this._disposed = true;
        }
        clearListeners() {
          this._listeners && (this._listeners.length = 0);
        }
      }, t2.forwardEvent = function(e3, t3) {
        return e3((e4) => t3.fire(e4));
      }, t2.runAndSubscribe = function(e3, t3) {
        return t3(undefined), e3((e4) => t3(e4));
      };
    }, 490: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.UnicodeV6 = undefined;
      const r2 = i2(938), s15 = [[768, 879], [1155, 1158], [1160, 1161], [1425, 1469], [1471, 1471], [1473, 1474], [1476, 1477], [1479, 1479], [1536, 1539], [1552, 1557], [1611, 1630], [1648, 1648], [1750, 1764], [1767, 1768], [1770, 1773], [1807, 1807], [1809, 1809], [1840, 1866], [1958, 1968], [2027, 2035], [2305, 2306], [2364, 2364], [2369, 2376], [2381, 2381], [2385, 2388], [2402, 2403], [2433, 2433], [2492, 2492], [2497, 2500], [2509, 2509], [2530, 2531], [2561, 2562], [2620, 2620], [2625, 2626], [2631, 2632], [2635, 2637], [2672, 2673], [2689, 2690], [2748, 2748], [2753, 2757], [2759, 2760], [2765, 2765], [2786, 2787], [2817, 2817], [2876, 2876], [2879, 2879], [2881, 2883], [2893, 2893], [2902, 2902], [2946, 2946], [3008, 3008], [3021, 3021], [3134, 3136], [3142, 3144], [3146, 3149], [3157, 3158], [3260, 3260], [3263, 3263], [3270, 3270], [3276, 3277], [3298, 3299], [3393, 3395], [3405, 3405], [3530, 3530], [3538, 3540], [3542, 3542], [3633, 3633], [3636, 3642], [3655, 3662], [3761, 3761], [3764, 3769], [3771, 3772], [3784, 3789], [3864, 3865], [3893, 3893], [3895, 3895], [3897, 3897], [3953, 3966], [3968, 3972], [3974, 3975], [3984, 3991], [3993, 4028], [4038, 4038], [4141, 4144], [4146, 4146], [4150, 4151], [4153, 4153], [4184, 4185], [4448, 4607], [4959, 4959], [5906, 5908], [5938, 5940], [5970, 5971], [6002, 6003], [6068, 6069], [6071, 6077], [6086, 6086], [6089, 6099], [6109, 6109], [6155, 6157], [6313, 6313], [6432, 6434], [6439, 6440], [6450, 6450], [6457, 6459], [6679, 6680], [6912, 6915], [6964, 6964], [6966, 6970], [6972, 6972], [6978, 6978], [7019, 7027], [7616, 7626], [7678, 7679], [8203, 8207], [8234, 8238], [8288, 8291], [8298, 8303], [8400, 8431], [12330, 12335], [12441, 12442], [43014, 43014], [43019, 43019], [43045, 43046], [64286, 64286], [65024, 65039], [65056, 65059], [65279, 65279], [65529, 65531]], n = [[68097, 68099], [68101, 68102], [68108, 68111], [68152, 68154], [68159, 68159], [119143, 119145], [119155, 119170], [119173, 119179], [119210, 119213], [119362, 119364], [917505, 917505], [917536, 917631], [917760, 917999]];
      let o;
      t2.UnicodeV6 = class {
        constructor() {
          if (this.version = "6", !o) {
            o = new Uint8Array(65536), o.fill(1), o[0] = 0, o.fill(0, 1, 32), o.fill(0, 127, 160), o.fill(2, 4352, 4448), o[9001] = 2, o[9002] = 2, o.fill(2, 11904, 42192), o[12351] = 1, o.fill(2, 44032, 55204), o.fill(2, 63744, 64256), o.fill(2, 65040, 65050), o.fill(2, 65072, 65136), o.fill(2, 65280, 65377), o.fill(2, 65504, 65511);
            for (let e3 = 0;e3 < s15.length; ++e3)
              o.fill(0, s15[e3][0], s15[e3][1] + 1);
          }
        }
        wcwidth(e3) {
          return e3 < 32 ? 0 : e3 < 127 ? 1 : e3 < 65536 ? o[e3] : function(e4, t3) {
            let i3, r3 = 0, s16 = t3.length - 1;
            if (e4 < t3[0][0] || e4 > t3[s16][1])
              return false;
            for (;s16 >= r3; )
              if (i3 = r3 + s16 >> 1, e4 > t3[i3][1])
                r3 = i3 + 1;
              else {
                if (!(e4 < t3[i3][0]))
                  return true;
                s16 = i3 - 1;
              }
            return false;
          }(e3, n) ? 0 : e3 >= 131072 && e3 <= 196605 || e3 >= 196608 && e3 <= 262141 ? 2 : 1;
        }
        charProperties(e3, t3) {
          let i3 = this.wcwidth(e3), s16 = i3 === 0 && t3 !== 0;
          if (s16) {
            const e4 = r2.UnicodeService.extractWidth(t3);
            e4 === 0 ? s16 = false : e4 > i3 && (i3 = e4);
          }
          return r2.UnicodeService.createPropertyValue(0, i3, s16);
        }
      };
    }, 938: (e2, t2, i2) => {
      Object.defineProperty(t2, "__esModule", { value: true }), t2.UnicodeService = undefined;
      const r2 = i2(345), s15 = i2(490);

      class n {
        static extractShouldJoin(e3) {
          return (1 & e3) != 0;
        }
        static extractWidth(e3) {
          return e3 >> 1 & 3;
        }
        static extractCharKind(e3) {
          return e3 >> 3;
        }
        static createPropertyValue(e3, t3, i3 = false) {
          return (16777215 & e3) << 3 | (3 & t3) << 1 | (i3 ? 1 : 0);
        }
        constructor() {
          this._providers = Object.create(null), this._active = "", this._onChange = new r2.EventEmitter, this.onChange = this._onChange.event;
          const e3 = new s15.UnicodeV6;
          this.register(e3), this._active = e3.version, this._activeProvider = e3;
        }
        dispose() {
          this._onChange.dispose();
        }
        get versions() {
          return Object.keys(this._providers);
        }
        get activeVersion() {
          return this._active;
        }
        set activeVersion(e3) {
          if (!this._providers[e3])
            throw new Error(`unknown Unicode version "${e3}"`);
          this._active = e3, this._activeProvider = this._providers[e3], this._onChange.fire(e3);
        }
        register(e3) {
          this._providers[e3.version] = e3;
        }
        wcwidth(e3) {
          return this._activeProvider.wcwidth(e3);
        }
        getStringCellWidth(e3) {
          let t3 = 0, i3 = 0;
          const r3 = e3.length;
          for (let s16 = 0;s16 < r3; ++s16) {
            let o = e3.charCodeAt(s16);
            if (55296 <= o && o <= 56319) {
              if (++s16 >= r3)
                return t3 + this.wcwidth(o);
              const i4 = e3.charCodeAt(s16);
              56320 <= i4 && i4 <= 57343 ? o = 1024 * (o - 55296) + i4 - 56320 + 65536 : t3 += this.wcwidth(i4);
            }
            const c = this.charProperties(o, i3);
            let l = n.extractWidth(c);
            n.extractShouldJoin(c) && (l -= n.extractWidth(i3)), t3 += l, i3 = c;
          }
          return t3;
        }
        charProperties(e3, t3) {
          return this._activeProvider.charProperties(e3, t3);
        }
      }
      t2.UnicodeService = n;
    } }, t = {};
    function i(r2) {
      var s15 = t[r2];
      if (s15 !== undefined)
        return s15.exports;
      var n = t[r2] = { exports: {} };
      return e[r2](n, n.exports, i), n.exports;
    }
    var r = {};
    return (() => {
      var e2 = r;
      Object.defineProperty(e2, "__esModule", { value: true }), e2.Unicode11Addon = undefined;
      const t2 = i(433);
      e2.Unicode11Addon = class {
        activate(e3) {
          e3.unicode.register(new t2.UnicodeV11);
        }
        dispose() {}
      };
    })(), r;
  })());
});

// node_modules/@xterm/addon-web-links/lib/addon-web-links.js
var require_addon_web_links = __commonJS((exports, module) => {
  (function(e, t) {
    typeof exports == "object" && typeof module == "object" ? module.exports = t() : typeof define == "function" && define.amd ? define([], t) : typeof exports == "object" ? exports.WebLinksAddon = t() : e.WebLinksAddon = t();
  })(self, () => (() => {
    var e = { 6: (e2, t2) => {
      function n2(e3) {
        try {
          const t3 = new URL(e3), n3 = t3.password && t3.username ? `${t3.protocol}//${t3.username}:${t3.password}@${t3.host}` : t3.username ? `${t3.protocol}//${t3.username}@${t3.host}` : `${t3.protocol}//${t3.host}`;
          return e3.toLocaleLowerCase().startsWith(n3.toLocaleLowerCase());
        } catch (e4) {
          return false;
        }
      }
      Object.defineProperty(t2, "__esModule", { value: true }), t2.LinkComputer = t2.WebLinkProvider = undefined, t2.WebLinkProvider = class {
        constructor(e3, t3, n3, o3 = {}) {
          this._terminal = e3, this._regex = t3, this._handler = n3, this._options = o3;
        }
        provideLinks(e3, t3) {
          const n3 = o2.computeLink(e3, this._regex, this._terminal, this._handler);
          t3(this._addCallbacks(n3));
        }
        _addCallbacks(e3) {
          return e3.map((e4) => (e4.leave = this._options.leave, e4.hover = (t3, n3) => {
            if (this._options.hover) {
              const { range: o3 } = e4;
              this._options.hover(t3, n3, o3);
            }
          }, e4));
        }
      };

      class o2 {
        static computeLink(e3, t3, r, i) {
          const s15 = new RegExp(t3.source, (t3.flags || "") + "g"), [a, c] = o2._getWindowedLineStrings(e3 - 1, r), l = a.join("");
          let d;
          const p = [];
          for (;d = s15.exec(l); ) {
            const e4 = d[0];
            if (!n2(e4))
              continue;
            const [t4, s16] = o2._mapStrIdx(r, c, 0, d.index), [a2, l2] = o2._mapStrIdx(r, t4, s16, e4.length);
            if (t4 === -1 || s16 === -1 || a2 === -1 || l2 === -1)
              continue;
            const h = { start: { x: s16 + 1, y: t4 + 1 }, end: { x: l2, y: a2 + 1 } };
            p.push({ range: h, text: e4, activate: i });
          }
          return p;
        }
        static _getWindowedLineStrings(e3, t3) {
          let n3, o3 = e3, r = e3, i = 0, s15 = "";
          const a = [];
          if (n3 = t3.buffer.active.getLine(e3)) {
            const e4 = n3.translateToString(true);
            if (n3.isWrapped && e4[0] !== " ") {
              for (i = 0;(n3 = t3.buffer.active.getLine(--o3)) && i < 2048 && (s15 = n3.translateToString(true), i += s15.length, a.push(s15), n3.isWrapped && s15.indexOf(" ") === -1); )
                ;
              a.reverse();
            }
            for (a.push(e4), i = 0;(n3 = t3.buffer.active.getLine(++r)) && n3.isWrapped && i < 2048 && (s15 = n3.translateToString(true), i += s15.length, a.push(s15), s15.indexOf(" ") === -1); )
              ;
          }
          return [a, o3];
        }
        static _mapStrIdx(e3, t3, n3, o3) {
          const r = e3.buffer.active, i = r.getNullCell();
          let s15 = n3;
          for (;o3; ) {
            const e4 = r.getLine(t3);
            if (!e4)
              return [-1, -1];
            for (let n4 = s15;n4 < e4.length; ++n4) {
              e4.getCell(n4, i);
              const s16 = i.getChars();
              if (i.getWidth() && (o3 -= s16.length || 1, n4 === e4.length - 1 && s16 === "")) {
                const e5 = r.getLine(t3 + 1);
                e5 && e5.isWrapped && (e5.getCell(0, i), i.getWidth() === 2 && (o3 += 1));
              }
              if (o3 < 0)
                return [t3, n4];
            }
            t3++, s15 = 0;
          }
          return [t3, s15];
        }
      }
      t2.LinkComputer = o2;
    } }, t = {};
    function n(o2) {
      var r = t[o2];
      if (r !== undefined)
        return r.exports;
      var i = t[o2] = { exports: {} };
      return e[o2](i, i.exports, n), i.exports;
    }
    var o = {};
    return (() => {
      var e2 = o;
      Object.defineProperty(e2, "__esModule", { value: true }), e2.WebLinksAddon = undefined;
      const t2 = n(6), r = /(https?|HTTPS?):[/]{2}[^\s"'!*(){}|\\\^<>`]*[^\s"':,.!?{}|\\\^~\[\]`()<>]/;
      function i(e3, t3) {
        const n2 = window.open();
        if (n2) {
          try {
            n2.opener = null;
          } catch {}
          n2.location.href = t3;
        } else
          console.warn("Opening link blocked as opener could not be cleared");
      }
      e2.WebLinksAddon = class {
        constructor(e3 = i, t3 = {}) {
          this._handler = e3, this._options = t3;
        }
        activate(e3) {
          this._terminal = e3;
          const n2 = this._options, o2 = n2.urlRegex || r;
          this._linkProvider = this._terminal.registerLinkProvider(new t2.WebLinkProvider(this._terminal, o2, this._handler, n2));
        }
        dispose() {
          this._linkProvider?.dispose();
        }
      };
    })(), o;
  })());
});

// node_modules/@xterm/xterm/lib/xterm.mjs
var zs = Object.defineProperty;
var Rl = Object.getOwnPropertyDescriptor;
var Ll = (s, t) => {
  for (var e in t)
    zs(s, e, { get: t[e], enumerable: true });
};
var M = (s, t, e, i) => {
  for (var r = i > 1 ? undefined : i ? Rl(t, e) : t, n = s.length - 1, o;n >= 0; n--)
    (o = s[n]) && (r = (i ? o(t, e, r) : o(r)) || r);
  return i && r && zs(t, e, r), r;
};
var S = (s, t) => (e, i) => t(e, i, s);
var Gs = "Terminal input";
var mi = { get: () => Gs, set: (s) => Gs = s };
var $s = "Too much output to announce, navigate to rows manually to read";
var _i = { get: () => $s, set: (s) => $s = s };
function Al(s) {
  return s.replace(/\r?\n/g, "\r");
}
function kl(s, t) {
  return t ? "\x1B[200~" + s + "\x1B[201~" : s;
}
function Vs(s, t) {
  s.clipboardData && s.clipboardData.setData("text/plain", t.selectionText), s.preventDefault();
}
function qs(s, t, e, i) {
  if (s.stopPropagation(), s.clipboardData) {
    let r = s.clipboardData.getData("text/plain");
    Cn(r, t, e, i);
  }
}
function Cn(s, t, e, i) {
  s = Al(s), s = kl(s, e.decPrivateModes.bracketedPasteMode && i.rawOptions.ignoreBracketedPasteMode !== true), e.triggerDataEvent(s, true), t.value = "";
}
function Mn(s, t, e) {
  let i = e.getBoundingClientRect(), r = s.clientX - i.left - 10, n = s.clientY - i.top - 10;
  t.style.width = "20px", t.style.height = "20px", t.style.left = `${r}px`, t.style.top = `${n}px`, t.style.zIndex = "1000", t.focus();
}
function Pn(s, t, e, i, r) {
  Mn(s, t, e), r && i.rightClickSelect(s), t.value = i.selectionText, t.select();
}
function Ce(s) {
  return s > 65535 ? (s -= 65536, String.fromCharCode((s >> 10) + 55296) + String.fromCharCode(s % 1024 + 56320)) : String.fromCharCode(s);
}
function It(s, t = 0, e = s.length) {
  let i = "";
  for (let r = t;r < e; ++r) {
    let n = s[r];
    n > 65535 ? (n -= 65536, i += String.fromCharCode((n >> 10) + 55296) + String.fromCharCode(n % 1024 + 56320)) : i += String.fromCharCode(n);
  }
  return i;
}
var er = class {
  constructor() {
    this._interim = 0;
  }
  clear() {
    this._interim = 0;
  }
  decode(t, e) {
    let i = t.length;
    if (!i)
      return 0;
    let r = 0, n = 0;
    if (this._interim) {
      let o = t.charCodeAt(n++);
      56320 <= o && o <= 57343 ? e[r++] = (this._interim - 55296) * 1024 + o - 56320 + 65536 : (e[r++] = this._interim, e[r++] = o), this._interim = 0;
    }
    for (let o = n;o < i; ++o) {
      let l = t.charCodeAt(o);
      if (55296 <= l && l <= 56319) {
        if (++o >= i)
          return this._interim = l, r;
        let a = t.charCodeAt(o);
        56320 <= a && a <= 57343 ? e[r++] = (l - 55296) * 1024 + a - 56320 + 65536 : (e[r++] = l, e[r++] = a);
        continue;
      }
      l !== 65279 && (e[r++] = l);
    }
    return r;
  }
};
var tr = class {
  constructor() {
    this.interim = new Uint8Array(3);
  }
  clear() {
    this.interim.fill(0);
  }
  decode(t, e) {
    let i = t.length;
    if (!i)
      return 0;
    let r = 0, n, o, l, a, u = 0, h = 0;
    if (this.interim[0]) {
      let _ = false, p = this.interim[0];
      p &= (p & 224) === 192 ? 31 : (p & 240) === 224 ? 15 : 7;
      let m = 0, f;
      for (;(f = this.interim[++m] & 63) && m < 4; )
        p <<= 6, p |= f;
      let A = (this.interim[0] & 224) === 192 ? 2 : (this.interim[0] & 240) === 224 ? 3 : 4, R = A - m;
      for (;h < R; ) {
        if (h >= i)
          return 0;
        if (f = t[h++], (f & 192) !== 128) {
          h--, _ = true;
          break;
        } else
          this.interim[m++] = f, p <<= 6, p |= f & 63;
      }
      _ || (A === 2 ? p < 128 ? h-- : e[r++] = p : A === 3 ? p < 2048 || p >= 55296 && p <= 57343 || p === 65279 || (e[r++] = p) : p < 65536 || p > 1114111 || (e[r++] = p)), this.interim.fill(0);
    }
    let c = i - 4, d = h;
    for (;d < i; ) {
      for (;d < c && !((n = t[d]) & 128) && !((o = t[d + 1]) & 128) && !((l = t[d + 2]) & 128) && !((a = t[d + 3]) & 128); )
        e[r++] = n, e[r++] = o, e[r++] = l, e[r++] = a, d += 4;
      if (n = t[d++], n < 128)
        e[r++] = n;
      else if ((n & 224) === 192) {
        if (d >= i)
          return this.interim[0] = n, r;
        if (o = t[d++], (o & 192) !== 128) {
          d--;
          continue;
        }
        if (u = (n & 31) << 6 | o & 63, u < 128) {
          d--;
          continue;
        }
        e[r++] = u;
      } else if ((n & 240) === 224) {
        if (d >= i)
          return this.interim[0] = n, r;
        if (o = t[d++], (o & 192) !== 128) {
          d--;
          continue;
        }
        if (d >= i)
          return this.interim[0] = n, this.interim[1] = o, r;
        if (l = t[d++], (l & 192) !== 128) {
          d--;
          continue;
        }
        if (u = (n & 15) << 12 | (o & 63) << 6 | l & 63, u < 2048 || u >= 55296 && u <= 57343 || u === 65279)
          continue;
        e[r++] = u;
      } else if ((n & 248) === 240) {
        if (d >= i)
          return this.interim[0] = n, r;
        if (o = t[d++], (o & 192) !== 128) {
          d--;
          continue;
        }
        if (d >= i)
          return this.interim[0] = n, this.interim[1] = o, r;
        if (l = t[d++], (l & 192) !== 128) {
          d--;
          continue;
        }
        if (d >= i)
          return this.interim[0] = n, this.interim[1] = o, this.interim[2] = l, r;
        if (a = t[d++], (a & 192) !== 128) {
          d--;
          continue;
        }
        if (u = (n & 7) << 18 | (o & 63) << 12 | (l & 63) << 6 | a & 63, u < 65536 || u > 1114111)
          continue;
        e[r++] = u;
      }
    }
    return r;
  }
};
var ir = "";
var we = " ";
var De = class s {
  constructor() {
    this.fg = 0;
    this.bg = 0;
    this.extended = new rt;
  }
  static toColorRGB(t) {
    return [t >>> 16 & 255, t >>> 8 & 255, t & 255];
  }
  static fromColorRGB(t) {
    return (t[0] & 255) << 16 | (t[1] & 255) << 8 | t[2] & 255;
  }
  clone() {
    let t = new s;
    return t.fg = this.fg, t.bg = this.bg, t.extended = this.extended.clone(), t;
  }
  isInverse() {
    return this.fg & 67108864;
  }
  isBold() {
    return this.fg & 134217728;
  }
  isUnderline() {
    return this.hasExtendedAttrs() && this.extended.underlineStyle !== 0 ? 1 : this.fg & 268435456;
  }
  isBlink() {
    return this.fg & 536870912;
  }
  isInvisible() {
    return this.fg & 1073741824;
  }
  isItalic() {
    return this.bg & 67108864;
  }
  isDim() {
    return this.bg & 134217728;
  }
  isStrikethrough() {
    return this.fg & 2147483648;
  }
  isProtected() {
    return this.bg & 536870912;
  }
  isOverline() {
    return this.bg & 1073741824;
  }
  getFgColorMode() {
    return this.fg & 50331648;
  }
  getBgColorMode() {
    return this.bg & 50331648;
  }
  isFgRGB() {
    return (this.fg & 50331648) === 50331648;
  }
  isBgRGB() {
    return (this.bg & 50331648) === 50331648;
  }
  isFgPalette() {
    return (this.fg & 50331648) === 16777216 || (this.fg & 50331648) === 33554432;
  }
  isBgPalette() {
    return (this.bg & 50331648) === 16777216 || (this.bg & 50331648) === 33554432;
  }
  isFgDefault() {
    return (this.fg & 50331648) === 0;
  }
  isBgDefault() {
    return (this.bg & 50331648) === 0;
  }
  isAttributeDefault() {
    return this.fg === 0 && this.bg === 0;
  }
  getFgColor() {
    switch (this.fg & 50331648) {
      case 16777216:
      case 33554432:
        return this.fg & 255;
      case 50331648:
        return this.fg & 16777215;
      default:
        return -1;
    }
  }
  getBgColor() {
    switch (this.bg & 50331648) {
      case 16777216:
      case 33554432:
        return this.bg & 255;
      case 50331648:
        return this.bg & 16777215;
      default:
        return -1;
    }
  }
  hasExtendedAttrs() {
    return this.bg & 268435456;
  }
  updateExtended() {
    this.extended.isEmpty() ? this.bg &= -268435457 : this.bg |= 268435456;
  }
  getUnderlineColor() {
    if (this.bg & 268435456 && ~this.extended.underlineColor)
      switch (this.extended.underlineColor & 50331648) {
        case 16777216:
        case 33554432:
          return this.extended.underlineColor & 255;
        case 50331648:
          return this.extended.underlineColor & 16777215;
        default:
          return this.getFgColor();
      }
    return this.getFgColor();
  }
  getUnderlineColorMode() {
    return this.bg & 268435456 && ~this.extended.underlineColor ? this.extended.underlineColor & 50331648 : this.getFgColorMode();
  }
  isUnderlineColorRGB() {
    return this.bg & 268435456 && ~this.extended.underlineColor ? (this.extended.underlineColor & 50331648) === 50331648 : this.isFgRGB();
  }
  isUnderlineColorPalette() {
    return this.bg & 268435456 && ~this.extended.underlineColor ? (this.extended.underlineColor & 50331648) === 16777216 || (this.extended.underlineColor & 50331648) === 33554432 : this.isFgPalette();
  }
  isUnderlineColorDefault() {
    return this.bg & 268435456 && ~this.extended.underlineColor ? (this.extended.underlineColor & 50331648) === 0 : this.isFgDefault();
  }
  getUnderlineStyle() {
    return this.fg & 268435456 ? this.bg & 268435456 ? this.extended.underlineStyle : 1 : 0;
  }
  getUnderlineVariantOffset() {
    return this.extended.underlineVariantOffset;
  }
};
var rt = class s2 {
  constructor(t = 0, e = 0) {
    this._ext = 0;
    this._urlId = 0;
    this._ext = t, this._urlId = e;
  }
  get ext() {
    return this._urlId ? this._ext & -469762049 | this.underlineStyle << 26 : this._ext;
  }
  set ext(t) {
    this._ext = t;
  }
  get underlineStyle() {
    return this._urlId ? 5 : (this._ext & 469762048) >> 26;
  }
  set underlineStyle(t) {
    this._ext &= -469762049, this._ext |= t << 26 & 469762048;
  }
  get underlineColor() {
    return this._ext & 67108863;
  }
  set underlineColor(t) {
    this._ext &= -67108864, this._ext |= t & 67108863;
  }
  get urlId() {
    return this._urlId;
  }
  set urlId(t) {
    this._urlId = t;
  }
  get underlineVariantOffset() {
    let t = (this._ext & 3758096384) >> 29;
    return t < 0 ? t ^ 4294967288 : t;
  }
  set underlineVariantOffset(t) {
    this._ext &= 536870911, this._ext |= t << 29 & 3758096384;
  }
  clone() {
    return new s2(this._ext, this._urlId);
  }
  isEmpty() {
    return this.underlineStyle === 0 && this._urlId === 0;
  }
};
var q = class s3 extends De {
  constructor() {
    super(...arguments);
    this.content = 0;
    this.fg = 0;
    this.bg = 0;
    this.extended = new rt;
    this.combinedData = "";
  }
  static fromCharData(e) {
    let i = new s3;
    return i.setFromCharData(e), i;
  }
  isCombined() {
    return this.content & 2097152;
  }
  getWidth() {
    return this.content >> 22;
  }
  getChars() {
    return this.content & 2097152 ? this.combinedData : this.content & 2097151 ? Ce(this.content & 2097151) : "";
  }
  getCode() {
    return this.isCombined() ? this.combinedData.charCodeAt(this.combinedData.length - 1) : this.content & 2097151;
  }
  setFromCharData(e) {
    this.fg = e[0], this.bg = 0;
    let i = false;
    if (e[1].length > 2)
      i = true;
    else if (e[1].length === 2) {
      let r = e[1].charCodeAt(0);
      if (55296 <= r && r <= 56319) {
        let n = e[1].charCodeAt(1);
        56320 <= n && n <= 57343 ? this.content = (r - 55296) * 1024 + n - 56320 + 65536 | e[2] << 22 : i = true;
      } else
        i = true;
    } else
      this.content = e[1].charCodeAt(0) | e[2] << 22;
    i && (this.combinedData = e[1], this.content = 2097152 | e[2] << 22);
  }
  getAsCharData() {
    return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
  }
};
var js = "di$target";
var Hn = "di$dependencies";
var Fn = new Map;
function Xs(s4) {
  return s4[Hn] || [];
}
function ie(s4) {
  if (Fn.has(s4))
    return Fn.get(s4);
  let t = function(e, i, r) {
    if (arguments.length !== 3)
      throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
    Pl(t, e, r);
  };
  return t._id = s4, Fn.set(s4, t), t;
}
function Pl(s4, t, e) {
  t[js] === t ? t[Hn].push({ id: s4, index: e }) : (t[Hn] = [{ id: s4, index: e }], t[js] = t);
}
var F = ie("BufferService");
var rr = ie("CoreMouseService");
var ge = ie("CoreService");
var Zs = ie("CharsetService");
var xt = ie("InstantiationService");
var nr = ie("LogService");
var H = ie("OptionsService");
var sr = ie("OscLinkService");
var Js = ie("UnicodeService");
var Be = ie("DecorationService");
var wt = class {
  constructor(t, e, i) {
    this._bufferService = t;
    this._optionsService = e;
    this._oscLinkService = i;
  }
  provideLinks(t, e) {
    let i = this._bufferService.buffer.lines.get(t - 1);
    if (!i) {
      e(undefined);
      return;
    }
    let r = [], n = this._optionsService.rawOptions.linkHandler, o = new q, l = i.getTrimmedLength(), a = -1, u = -1, h = false;
    for (let c = 0;c < l; c++)
      if (!(u === -1 && !i.hasContent(c))) {
        if (i.loadCell(c, o), o.hasExtendedAttrs() && o.extended.urlId)
          if (u === -1) {
            u = c, a = o.extended.urlId;
            continue;
          } else
            h = o.extended.urlId !== a;
        else
          u !== -1 && (h = true);
        if (h || u !== -1 && c === l - 1) {
          let d = this._oscLinkService.getLinkData(a)?.uri;
          if (d) {
            let _ = { start: { x: u + 1, y: t }, end: { x: c + (!h && c === l - 1 ? 1 : 0), y: t } }, p = false;
            if (!n?.allowNonHttpProtocols)
              try {
                let m = new URL(d);
                ["http:", "https:"].includes(m.protocol) || (p = true);
              } catch {
                p = true;
              }
            p || r.push({ text: d, range: _, activate: (m, f) => n ? n.activate(m, f, _) : Ol(m, f), hover: (m, f) => n?.hover?.(m, f, _), leave: (m, f) => n?.leave?.(m, f, _) });
          }
          h = false, o.hasExtendedAttrs() && o.extended.urlId ? (u = c, a = o.extended.urlId) : (u = -1, a = -1);
        }
      }
    e(r);
  }
};
wt = M([S(0, F), S(1, H), S(2, sr)], wt);
function Ol(s4, t) {
  if (confirm(`Do you want to navigate to ${t}?

WARNING: This link could potentially be dangerous`)) {
    let i = window.open();
    if (i) {
      try {
        i.opener = null;
      } catch {}
      i.location.href = t;
    } else
      console.warn("Opening link blocked as opener could not be cleared");
  }
}
var nt = ie("CharSizeService");
var ae = ie("CoreBrowserService");
var Dt = ie("MouseService");
var ce = ie("RenderService");
var Qs = ie("SelectionService");
var or = ie("CharacterJoinerService");
var Re = ie("ThemeService");
var lr = ie("LinkProviderService");
var Wn = class {
  constructor() {
    this.listeners = [], this.unexpectedErrorHandler = function(t) {
      setTimeout(() => {
        throw t.stack ? ar.isErrorNoTelemetry(t) ? new ar(t.message + `

` + t.stack) : new Error(t.message + `

` + t.stack) : t;
      }, 0);
    };
  }
  addListener(t) {
    return this.listeners.push(t), () => {
      this._removeListener(t);
    };
  }
  emit(t) {
    this.listeners.forEach((e) => {
      e(t);
    });
  }
  _removeListener(t) {
    this.listeners.splice(this.listeners.indexOf(t), 1);
  }
  setUnexpectedErrorHandler(t) {
    this.unexpectedErrorHandler = t;
  }
  getUnexpectedErrorHandler() {
    return this.unexpectedErrorHandler;
  }
  onUnexpectedError(t) {
    this.unexpectedErrorHandler(t), this.emit(t);
  }
  onUnexpectedExternalError(t) {
    this.unexpectedErrorHandler(t);
  }
};
var Bl = new Wn;
function Lt(s4) {
  Nl(s4) || Bl.onUnexpectedError(s4);
}
var Un = "Canceled";
function Nl(s4) {
  return s4 instanceof bi ? true : s4 instanceof Error && s4.name === Un && s4.message === Un;
}
var bi = class extends Error {
  constructor() {
    super(Un), this.name = this.message;
  }
};
function eo(s4) {
  return s4 ? new Error(`Illegal argument: ${s4}`) : new Error("Illegal argument");
}
var ar = class s4 extends Error {
  constructor(t) {
    super(t), this.name = "CodeExpectedError";
  }
  static fromError(t) {
    if (t instanceof s4)
      return t;
    let e = new s4;
    return e.message = t.message, e.stack = t.stack, e;
  }
  static isErrorNoTelemetry(t) {
    return t.name === "CodeExpectedError";
  }
};
var Rt = class s5 extends Error {
  constructor(t) {
    super(t || "An unexpected bug occurred."), Object.setPrototypeOf(this, s5.prototype);
  }
};
function Fl(s6, t, e = 0, i = s6.length) {
  let r = e, n = i;
  for (;r < n; ) {
    let o = Math.floor((r + n) / 2);
    t(s6[o]) ? r = o + 1 : n = o;
  }
  return r - 1;
}
var cr = class cr2 {
  constructor(t) {
    this._array = t;
    this._findLastMonotonousLastIdx = 0;
  }
  findLastMonotonous(t) {
    if (cr2.assertInvariants) {
      if (this._prevFindLastPredicate) {
        for (let i of this._array)
          if (this._prevFindLastPredicate(i) && !t(i))
            throw new Error("MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.");
      }
      this._prevFindLastPredicate = t;
    }
    let e = Fl(this._array, t, this._findLastMonotonousLastIdx);
    return this._findLastMonotonousLastIdx = e + 1, e === -1 ? undefined : this._array[e];
  }
};
cr.assertInvariants = false;
function Se(s6, t = 0) {
  return s6[s6.length - (1 + t)];
}
var ro;
((l) => {
  function s6(a) {
    return a < 0;
  }
  l.isLessThan = s6;
  function t(a) {
    return a <= 0;
  }
  l.isLessThanOrEqual = t;
  function e(a) {
    return a > 0;
  }
  l.isGreaterThan = e;
  function i(a) {
    return a === 0;
  }
  l.isNeitherLessOrGreaterThan = i, l.greaterThan = 1, l.lessThan = -1, l.neitherLessOrGreaterThan = 0;
})(ro ||= {});
function no(s6, t) {
  return (e, i) => t(s6(e), s6(i));
}
var so = (s6, t) => s6 - t;
var At = class At2 {
  constructor(t) {
    this.iterate = t;
  }
  forEach(t) {
    this.iterate((e) => (t(e), true));
  }
  toArray() {
    let t = [];
    return this.iterate((e) => (t.push(e), true)), t;
  }
  filter(t) {
    return new At2((e) => this.iterate((i) => t(i) ? e(i) : true));
  }
  map(t) {
    return new At2((e) => this.iterate((i) => e(t(i))));
  }
  some(t) {
    let e = false;
    return this.iterate((i) => (e = t(i), !e)), e;
  }
  findFirst(t) {
    let e;
    return this.iterate((i) => t(i) ? (e = i, false) : true), e;
  }
  findLast(t) {
    let e;
    return this.iterate((i) => (t(i) && (e = i), true)), e;
  }
  findLastMaxBy(t) {
    let e, i = true;
    return this.iterate((r) => ((i || ro.isGreaterThan(t(r, e))) && (i = false, e = r), true)), e;
  }
};
At.empty = new At((t) => {});
function co(s6, t) {
  let e = Object.create(null);
  for (let i of s6) {
    let r = t(i), n = e[r];
    n || (n = e[r] = []), n.push(i);
  }
  return e;
}
var lo;
var ao;
var oo = class {
  constructor(t, e) {
    this.toKey = e;
    this._map = new Map;
    this[lo] = "SetWithKey";
    for (let i of t)
      this.add(i);
  }
  get size() {
    return this._map.size;
  }
  add(t) {
    let e = this.toKey(t);
    return this._map.set(e, t), this;
  }
  delete(t) {
    return this._map.delete(this.toKey(t));
  }
  has(t) {
    return this._map.has(this.toKey(t));
  }
  *entries() {
    for (let t of this._map.values())
      yield [t, t];
  }
  keys() {
    return this.values();
  }
  *values() {
    for (let t of this._map.values())
      yield t;
  }
  clear() {
    this._map.clear();
  }
  forEach(t, e) {
    this._map.forEach((i) => t.call(e, i, i, this));
  }
  [(ao = Symbol.iterator, lo = Symbol.toStringTag, ao)]() {
    return this.values();
  }
};
var ur = class {
  constructor() {
    this.map = new Map;
  }
  add(t, e) {
    let i = this.map.get(t);
    i || (i = new Set, this.map.set(t, i)), i.add(e);
  }
  delete(t, e) {
    let i = this.map.get(t);
    i && (i.delete(e), i.size === 0 && this.map.delete(t));
  }
  forEach(t, e) {
    let i = this.map.get(t);
    i && i.forEach(e);
  }
  get(t) {
    let e = this.map.get(t);
    return e || new Set;
  }
};
function Kn(s6, t) {
  let e = this, i = false, r;
  return function() {
    if (i)
      return r;
    if (i = true, t)
      try {
        r = s6.apply(e, arguments);
      } finally {
        t();
      }
    else
      r = s6.apply(e, arguments);
    return r;
  };
}
var zn;
((O) => {
  function s6(I) {
    return I && typeof I == "object" && typeof I[Symbol.iterator] == "function";
  }
  O.is = s6;
  let t = Object.freeze([]);
  function e() {
    return t;
  }
  O.empty = e;
  function* i(I) {
    yield I;
  }
  O.single = i;
  function r(I) {
    return s6(I) ? I : i(I);
  }
  O.wrap = r;
  function n(I) {
    return I || t;
  }
  O.from = n;
  function* o(I) {
    for (let k = I.length - 1;k >= 0; k--)
      yield I[k];
  }
  O.reverse = o;
  function l(I) {
    return !I || I[Symbol.iterator]().next().done === true;
  }
  O.isEmpty = l;
  function a(I) {
    return I[Symbol.iterator]().next().value;
  }
  O.first = a;
  function u(I, k) {
    let P = 0;
    for (let oe of I)
      if (k(oe, P++))
        return true;
    return false;
  }
  O.some = u;
  function h(I, k) {
    for (let P of I)
      if (k(P))
        return P;
  }
  O.find = h;
  function* c(I, k) {
    for (let P of I)
      k(P) && (yield P);
  }
  O.filter = c;
  function* d(I, k) {
    let P = 0;
    for (let oe of I)
      yield k(oe, P++);
  }
  O.map = d;
  function* _(I, k) {
    let P = 0;
    for (let oe of I)
      yield* k(oe, P++);
  }
  O.flatMap = _;
  function* p(...I) {
    for (let k of I)
      yield* k;
  }
  O.concat = p;
  function m(I, k, P) {
    let oe = P;
    for (let Me of I)
      oe = k(oe, Me);
    return oe;
  }
  O.reduce = m;
  function* f(I, k, P = I.length) {
    for (k < 0 && (k += I.length), P < 0 ? P += I.length : P > I.length && (P = I.length);k < P; k++)
      yield I[k];
  }
  O.slice = f;
  function A(I, k = Number.POSITIVE_INFINITY) {
    let P = [];
    if (k === 0)
      return [P, I];
    let oe = I[Symbol.iterator]();
    for (let Me = 0;Me < k; Me++) {
      let Pe = oe.next();
      if (Pe.done)
        return [P, O.empty()];
      P.push(Pe.value);
    }
    return [P, { [Symbol.iterator]() {
      return oe;
    } }];
  }
  O.consume = A;
  async function R(I) {
    let k = [];
    for await (let P of I)
      k.push(P);
    return Promise.resolve(k);
  }
  O.asyncToArray = R;
})(zn ||= {});
var Wl = false;
var dt = null;
var hr = class hr2 {
  constructor() {
    this.livingDisposables = new Map;
  }
  getDisposableData(t) {
    let e = this.livingDisposables.get(t);
    return e || (e = { parent: null, source: null, isSingleton: false, value: t, idx: hr2.idx++ }, this.livingDisposables.set(t, e)), e;
  }
  trackDisposable(t) {
    let e = this.getDisposableData(t);
    e.source || (e.source = new Error().stack);
  }
  setParent(t, e) {
    let i = this.getDisposableData(t);
    i.parent = e;
  }
  markAsDisposed(t) {
    this.livingDisposables.delete(t);
  }
  markAsSingleton(t) {
    this.getDisposableData(t).isSingleton = true;
  }
  getRootParent(t, e) {
    let i = e.get(t);
    if (i)
      return i;
    let r = t.parent ? this.getRootParent(this.getDisposableData(t.parent), e) : t;
    return e.set(t, r), r;
  }
  getTrackedDisposables() {
    let t = new Map;
    return [...this.livingDisposables.entries()].filter(([, i]) => i.source !== null && !this.getRootParent(i, t).isSingleton).flatMap(([i]) => i);
  }
  computeLeakingDisposables(t = 10, e) {
    let i;
    if (e)
      i = e;
    else {
      let a = new Map, u = [...this.livingDisposables.values()].filter((c) => c.source !== null && !this.getRootParent(c, a).isSingleton);
      if (u.length === 0)
        return;
      let h = new Set(u.map((c) => c.value));
      if (i = u.filter((c) => !(c.parent && h.has(c.parent))), i.length === 0)
        throw new Error("There are cyclic diposable chains!");
    }
    if (!i)
      return;
    function r(a) {
      function u(c, d) {
        for (;c.length > 0 && d.some((_) => typeof _ == "string" ? _ === c[0] : c[0].match(_)); )
          c.shift();
      }
      let h = a.source.split(`
`).map((c) => c.trim().replace("at ", "")).filter((c) => c !== "");
      return u(h, ["Error", /^trackDisposable \(.*\)$/, /^DisposableTracker.trackDisposable \(.*\)$/]), h.reverse();
    }
    let n = new ur;
    for (let a of i) {
      let u = r(a);
      for (let h = 0;h <= u.length; h++)
        n.add(u.slice(0, h).join(`
`), a);
    }
    i.sort(no((a) => a.idx, so));
    let o = "", l = 0;
    for (let a of i.slice(0, t)) {
      l++;
      let u = r(a), h = [];
      for (let c = 0;c < u.length; c++) {
        let d = u[c];
        d = `(shared with ${n.get(u.slice(0, c + 1).join(`
`)).size}/${i.length} leaks) at ${d}`;
        let p = n.get(u.slice(0, c).join(`
`)), m = co([...p].map((f) => r(f)[c]), (f) => f);
        delete m[u[c]];
        for (let [f, A] of Object.entries(m))
          h.unshift(`    - stacktraces of ${A.length} other leaks continue with ${f}`);
        h.unshift(d);
      }
      o += `


==================== Leaking disposable ${l}/${i.length}: ${a.value.constructor.name} ====================
${h.join(`
`)}
============================================================

`;
    }
    return i.length > t && (o += `


... and ${i.length - t} more leaking disposables

`), { leaks: i, details: o };
  }
};
hr.idx = 0;
function Ul(s6) {
  dt = s6;
}
if (Wl) {
  let s6 = "__is_disposable_tracked__";
  Ul(new class {
    trackDisposable(t) {
      let e = new Error("Potentially leaked disposable").stack;
      setTimeout(() => {
        t[s6] || console.log(e);
      }, 3000);
    }
    setParent(t, e) {
      if (t && t !== D.None)
        try {
          t[s6] = true;
        } catch {}
    }
    markAsDisposed(t) {
      if (t && t !== D.None)
        try {
          t[s6] = true;
        } catch {}
    }
    markAsSingleton(t) {}
  });
}
function fr(s6) {
  return dt?.trackDisposable(s6), s6;
}
function pr(s6) {
  dt?.markAsDisposed(s6);
}
function vi(s6, t) {
  dt?.setParent(s6, t);
}
function Kl(s6, t) {
  if (dt)
    for (let e of s6)
      dt.setParent(e, t);
}
function Gn(s6) {
  return dt?.markAsSingleton(s6), s6;
}
function Ne(s6) {
  if (zn.is(s6)) {
    let t = [];
    for (let e of s6)
      if (e)
        try {
          e.dispose();
        } catch (i) {
          t.push(i);
        }
    if (t.length === 1)
      throw t[0];
    if (t.length > 1)
      throw new AggregateError(t, "Encountered errors while disposing of store");
    return Array.isArray(s6) ? [] : s6;
  } else if (s6)
    return s6.dispose(), s6;
}
function ho(...s6) {
  let t = C(() => Ne(s6));
  return Kl(s6, t), t;
}
function C(s6) {
  let t = fr({ dispose: Kn(() => {
    pr(t), s6();
  }) });
  return t;
}
var dr = class dr2 {
  constructor() {
    this._toDispose = new Set;
    this._isDisposed = false;
    fr(this);
  }
  dispose() {
    this._isDisposed || (pr(this), this._isDisposed = true, this.clear());
  }
  get isDisposed() {
    return this._isDisposed;
  }
  clear() {
    if (this._toDispose.size !== 0)
      try {
        Ne(this._toDispose);
      } finally {
        this._toDispose.clear();
      }
  }
  add(t) {
    if (!t)
      return t;
    if (t === this)
      throw new Error("Cannot register a disposable on itself!");
    return vi(t, this), this._isDisposed ? dr2.DISABLE_DISPOSED_WARNING || console.warn(new Error("Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!").stack) : this._toDispose.add(t), t;
  }
  delete(t) {
    if (t) {
      if (t === this)
        throw new Error("Cannot dispose a disposable on itself!");
      this._toDispose.delete(t), t.dispose();
    }
  }
  deleteAndLeak(t) {
    t && this._toDispose.has(t) && (this._toDispose.delete(t), vi(t, null));
  }
};
dr.DISABLE_DISPOSED_WARNING = false;
var Ee = dr;
var D = class {
  constructor() {
    this._store = new Ee;
    fr(this), vi(this._store, this);
  }
  dispose() {
    pr(this), this._store.dispose();
  }
  _register(t) {
    if (t === this)
      throw new Error("Cannot register a disposable on itself!");
    return this._store.add(t);
  }
};
D.None = Object.freeze({ dispose() {} });
var ye = class {
  constructor() {
    this._isDisposed = false;
    fr(this);
  }
  get value() {
    return this._isDisposed ? undefined : this._value;
  }
  set value(t) {
    this._isDisposed || t === this._value || (this._value?.dispose(), t && vi(t, this), this._value = t);
  }
  clear() {
    this.value = undefined;
  }
  dispose() {
    this._isDisposed = true, pr(this), this._value?.dispose(), this._value = undefined;
  }
  clearAndLeak() {
    let t = this._value;
    return this._value = undefined, t && vi(t, null), t;
  }
};
var fe = typeof window == "object" ? window : globalThis;
var kt = class kt2 {
  constructor(t) {
    this.element = t, this.next = kt2.Undefined, this.prev = kt2.Undefined;
  }
};
kt.Undefined = new kt(undefined);
var G = kt;
var Ct = class {
  constructor() {
    this._first = G.Undefined;
    this._last = G.Undefined;
    this._size = 0;
  }
  get size() {
    return this._size;
  }
  isEmpty() {
    return this._first === G.Undefined;
  }
  clear() {
    let t = this._first;
    for (;t !== G.Undefined; ) {
      let e = t.next;
      t.prev = G.Undefined, t.next = G.Undefined, t = e;
    }
    this._first = G.Undefined, this._last = G.Undefined, this._size = 0;
  }
  unshift(t) {
    return this._insert(t, false);
  }
  push(t) {
    return this._insert(t, true);
  }
  _insert(t, e) {
    let i = new G(t);
    if (this._first === G.Undefined)
      this._first = i, this._last = i;
    else if (e) {
      let n = this._last;
      this._last = i, i.prev = n, n.next = i;
    } else {
      let n = this._first;
      this._first = i, i.next = n, n.prev = i;
    }
    this._size += 1;
    let r = false;
    return () => {
      r || (r = true, this._remove(i));
    };
  }
  shift() {
    if (this._first !== G.Undefined) {
      let t = this._first.element;
      return this._remove(this._first), t;
    }
  }
  pop() {
    if (this._last !== G.Undefined) {
      let t = this._last.element;
      return this._remove(this._last), t;
    }
  }
  _remove(t) {
    if (t.prev !== G.Undefined && t.next !== G.Undefined) {
      let e = t.prev;
      e.next = t.next, t.next.prev = e;
    } else
      t.prev === G.Undefined && t.next === G.Undefined ? (this._first = G.Undefined, this._last = G.Undefined) : t.next === G.Undefined ? (this._last = this._last.prev, this._last.next = G.Undefined) : t.prev === G.Undefined && (this._first = this._first.next, this._first.prev = G.Undefined);
    this._size -= 1;
  }
  *[Symbol.iterator]() {
    let t = this._first;
    for (;t !== G.Undefined; )
      yield t.element, t = t.next;
  }
};
var zl = globalThis.performance && typeof globalThis.performance.now == "function";
var mr = class s6 {
  static create(t) {
    return new s6(t);
  }
  constructor(t) {
    this._now = zl && t === false ? Date.now : globalThis.performance.now.bind(globalThis.performance), this._startTime = this._now(), this._stopTime = -1;
  }
  stop() {
    this._stopTime = this._now();
  }
  reset() {
    this._startTime = this._now(), this._stopTime = -1;
  }
  elapsed() {
    return this._stopTime !== -1 ? this._stopTime - this._startTime : this._now() - this._startTime;
  }
};
var Gl = false;
var fo = false;
var $l = false;
var $;
((Qe) => {
  Qe.None = () => D.None;
  function t(y) {
    if ($l) {
      let { onDidAddListener: T } = y, g = gi.create(), w = 0;
      y.onDidAddListener = () => {
        ++w === 2 && (console.warn("snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here"), g.print()), T?.();
      };
    }
  }
  function e(y, T) {
    return d(y, () => {}, 0, undefined, true, undefined, T);
  }
  Qe.defer = e;
  function i(y) {
    return (T, g = null, w) => {
      let E = false, x;
      return x = y((N) => {
        if (!E)
          return x ? x.dispose() : E = true, T.call(g, N);
      }, null, w), E && x.dispose(), x;
    };
  }
  Qe.once = i;
  function r(y, T, g) {
    return h((w, E = null, x) => y((N) => w.call(E, T(N)), null, x), g);
  }
  Qe.map = r;
  function n(y, T, g) {
    return h((w, E = null, x) => y((N) => {
      T(N), w.call(E, N);
    }, null, x), g);
  }
  Qe.forEach = n;
  function o(y, T, g) {
    return h((w, E = null, x) => y((N) => T(N) && w.call(E, N), null, x), g);
  }
  Qe.filter = o;
  function l(y) {
    return y;
  }
  Qe.signal = l;
  function a(...y) {
    return (T, g = null, w) => {
      let E = ho(...y.map((x) => x((N) => T.call(g, N))));
      return c(E, w);
    };
  }
  Qe.any = a;
  function u(y, T, g, w) {
    let E = g;
    return r(y, (x) => (E = T(E, x), E), w);
  }
  Qe.reduce = u;
  function h(y, T) {
    let g, w = { onWillAddFirstListener() {
      g = y(E.fire, E);
    }, onDidRemoveLastListener() {
      g?.dispose();
    } };
    T || t(w);
    let E = new v(w);
    return T?.add(E), E.event;
  }
  function c(y, T) {
    return T instanceof Array ? T.push(y) : T && T.add(y), y;
  }
  function d(y, T, g = 100, w = false, E = false, x, N) {
    let Z, te, Oe, ze = 0, le, et = { leakWarningThreshold: x, onWillAddFirstListener() {
      Z = y((ht) => {
        ze++, te = T(te, ht), w && !Oe && (me.fire(te), te = undefined), le = () => {
          let fi = te;
          te = undefined, Oe = undefined, (!w || ze > 1) && me.fire(fi), ze = 0;
        }, typeof g == "number" ? (clearTimeout(Oe), Oe = setTimeout(le, g)) : Oe === undefined && (Oe = 0, queueMicrotask(le));
      });
    }, onWillRemoveListener() {
      E && ze > 0 && le?.();
    }, onDidRemoveLastListener() {
      le = undefined, Z.dispose();
    } };
    N || t(et);
    let me = new v(et);
    return N?.add(me), me.event;
  }
  Qe.debounce = d;
  function _(y, T = 0, g) {
    return Qe.debounce(y, (w, E) => w ? (w.push(E), w) : [E], T, undefined, true, undefined, g);
  }
  Qe.accumulate = _;
  function p(y, T = (w, E) => w === E, g) {
    let w = true, E;
    return o(y, (x) => {
      let N = w || !T(x, E);
      return w = false, E = x, N;
    }, g);
  }
  Qe.latch = p;
  function m(y, T, g) {
    return [Qe.filter(y, T, g), Qe.filter(y, (w) => !T(w), g)];
  }
  Qe.split = m;
  function f(y, T = false, g = [], w) {
    let E = g.slice(), x = y((te) => {
      E ? E.push(te) : Z.fire(te);
    });
    w && w.add(x);
    let N = () => {
      E?.forEach((te) => Z.fire(te)), E = null;
    }, Z = new v({ onWillAddFirstListener() {
      x || (x = y((te) => Z.fire(te)), w && w.add(x));
    }, onDidAddFirstListener() {
      E && (T ? setTimeout(N) : N());
    }, onDidRemoveLastListener() {
      x && x.dispose(), x = null;
    } });
    return w && w.add(Z), Z.event;
  }
  Qe.buffer = f;
  function A(y, T) {
    return (w, E, x) => {
      let N = T(new O);
      return y(function(Z) {
        let te = N.evaluate(Z);
        te !== R && w.call(E, te);
      }, undefined, x);
    };
  }
  Qe.chain = A;
  let R = Symbol("HaltChainable");

  class O {
    constructor() {
      this.steps = [];
    }
    map(T) {
      return this.steps.push(T), this;
    }
    forEach(T) {
      return this.steps.push((g) => (T(g), g)), this;
    }
    filter(T) {
      return this.steps.push((g) => T(g) ? g : R), this;
    }
    reduce(T, g) {
      let w = g;
      return this.steps.push((E) => (w = T(w, E), w)), this;
    }
    latch(T = (g, w) => g === w) {
      let g = true, w;
      return this.steps.push((E) => {
        let x = g || !T(E, w);
        return g = false, w = E, x ? E : R;
      }), this;
    }
    evaluate(T) {
      for (let g of this.steps)
        if (T = g(T), T === R)
          break;
      return T;
    }
  }
  function I(y, T, g = (w) => w) {
    let w = (...Z) => N.fire(g(...Z)), E = () => y.on(T, w), x = () => y.removeListener(T, w), N = new v({ onWillAddFirstListener: E, onDidRemoveLastListener: x });
    return N.event;
  }
  Qe.fromNodeEventEmitter = I;
  function k(y, T, g = (w) => w) {
    let w = (...Z) => N.fire(g(...Z)), E = () => y.addEventListener(T, w), x = () => y.removeEventListener(T, w), N = new v({ onWillAddFirstListener: E, onDidRemoveLastListener: x });
    return N.event;
  }
  Qe.fromDOMEventEmitter = k;
  function P(y) {
    return new Promise((T) => i(y)(T));
  }
  Qe.toPromise = P;
  function oe(y) {
    let T = new v;
    return y.then((g) => {
      T.fire(g);
    }, () => {
      T.fire(undefined);
    }).finally(() => {
      T.dispose();
    }), T.event;
  }
  Qe.fromPromise = oe;
  function Me(y, T) {
    return y((g) => T.fire(g));
  }
  Qe.forward = Me;
  function Pe(y, T, g) {
    return T(g), y((w) => T(w));
  }
  Qe.runAndSubscribe = Pe;

  class Ke {
    constructor(T, g) {
      this._observable = T;
      this._counter = 0;
      this._hasChanged = false;
      let w = { onWillAddFirstListener: () => {
        T.addObserver(this);
      }, onDidRemoveLastListener: () => {
        T.removeObserver(this);
      } };
      g || t(w), this.emitter = new v(w), g && g.add(this.emitter);
    }
    beginUpdate(T) {
      this._counter++;
    }
    handlePossibleChange(T) {}
    handleChange(T, g) {
      this._hasChanged = true;
    }
    endUpdate(T) {
      this._counter--, this._counter === 0 && (this._observable.reportChanges(), this._hasChanged && (this._hasChanged = false, this.emitter.fire(this._observable.get())));
    }
  }
  function di(y, T) {
    return new Ke(y, T).emitter.event;
  }
  Qe.fromObservable = di;
  function V(y) {
    return (T, g, w) => {
      let E = 0, x = false, N = { beginUpdate() {
        E++;
      }, endUpdate() {
        E--, E === 0 && (y.reportChanges(), x && (x = false, T.call(g)));
      }, handlePossibleChange() {}, handleChange() {
        x = true;
      } };
      y.addObserver(N), y.reportChanges();
      let Z = { dispose() {
        y.removeObserver(N);
      } };
      return w instanceof Ee ? w.add(Z) : Array.isArray(w) && w.push(Z), Z;
    };
  }
  Qe.fromObservableLight = V;
})($ ||= {});
var Mt = class Mt2 {
  constructor(t) {
    this.listenerCount = 0;
    this.invocationCount = 0;
    this.elapsedOverall = 0;
    this.durations = [];
    this.name = `${t}_${Mt2._idPool++}`, Mt2.all.add(this);
  }
  start(t) {
    this._stopWatch = new mr, this.listenerCount = t;
  }
  stop() {
    if (this._stopWatch) {
      let t = this._stopWatch.elapsed();
      this.durations.push(t), this.elapsedOverall += t, this.invocationCount += 1, this._stopWatch = undefined;
    }
  }
};
Mt.all = new Set, Mt._idPool = 0;
var $n = Mt;
var po = -1;
var br = class br2 {
  constructor(t, e, i = (br2._idPool++).toString(16).padStart(3, "0")) {
    this._errorHandler = t;
    this.threshold = e;
    this.name = i;
    this._warnCountdown = 0;
  }
  dispose() {
    this._stacks?.clear();
  }
  check(t, e) {
    let i = this.threshold;
    if (i <= 0 || e < i)
      return;
    this._stacks || (this._stacks = new Map);
    let r = this._stacks.get(t.value) || 0;
    if (this._stacks.set(t.value, r + 1), this._warnCountdown -= 1, this._warnCountdown <= 0) {
      this._warnCountdown = i * 0.5;
      let [n, o] = this.getMostFrequentStack(), l = `[${this.name}] potential listener LEAK detected, having ${e} listeners already. MOST frequent listener (${o}):`;
      console.warn(l), console.warn(n);
      let a = new qn(l, n);
      this._errorHandler(a);
    }
    return () => {
      let n = this._stacks.get(t.value) || 0;
      this._stacks.set(t.value, n - 1);
    };
  }
  getMostFrequentStack() {
    if (!this._stacks)
      return;
    let t, e = 0;
    for (let [i, r] of this._stacks)
      (!t || e < r) && (t = [i, r], e = r);
    return t;
  }
};
br._idPool = 1;
var Vn = br;
var gi = class s7 {
  constructor(t) {
    this.value = t;
  }
  static create() {
    let t = new Error;
    return new s7(t.stack ?? "");
  }
  print() {
    console.warn(this.value.split(`
`).slice(2).join(`
`));
  }
};
var qn = class extends Error {
  constructor(t, e) {
    super(t), this.name = "ListenerLeakError", this.stack = e;
  }
};
var Yn = class extends Error {
  constructor(t, e) {
    super(t), this.name = "ListenerRefusalError", this.stack = e;
  }
};
var Vl = 0;
var Pt = class {
  constructor(t) {
    this.value = t;
    this.id = Vl++;
  }
};
var ql = 2;
var Yl = (s8, t) => {
  if (s8 instanceof Pt)
    t(s8);
  else
    for (let e = 0;e < s8.length; e++) {
      let i = s8[e];
      i && t(i);
    }
};
var _r;
if (Gl) {
  let s8 = [];
  setInterval(() => {
    s8.length !== 0 && (console.warn("[LEAKING LISTENERS] GC'ed these listeners that were NOT yet disposed:"), console.warn(s8.join(`
`)), s8.length = 0);
  }, 3000), _r = new FinalizationRegistry((t) => {
    typeof t == "string" && s8.push(t);
  });
}
var v = class {
  constructor(t) {
    this._size = 0;
    this._options = t, this._leakageMon = po > 0 || this._options?.leakWarningThreshold ? new Vn(t?.onListenerError ?? Lt, this._options?.leakWarningThreshold ?? po) : undefined, this._perfMon = this._options?._profName ? new $n(this._options._profName) : undefined, this._deliveryQueue = this._options?.deliveryQueue;
  }
  dispose() {
    if (!this._disposed) {
      if (this._disposed = true, this._deliveryQueue?.current === this && this._deliveryQueue.reset(), this._listeners) {
        if (fo) {
          let t = this._listeners;
          queueMicrotask(() => {
            Yl(t, (e) => e.stack?.print());
          });
        }
        this._listeners = undefined, this._size = 0;
      }
      this._options?.onDidRemoveLastListener?.(), this._leakageMon?.dispose();
    }
  }
  get event() {
    return this._event ??= (t, e, i) => {
      if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
        let a = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
        console.warn(a);
        let u = this._leakageMon.getMostFrequentStack() ?? ["UNKNOWN stack", -1], h = new Yn(`${a}. HINT: Stack shows most frequent listener (${u[1]}-times)`, u[0]);
        return (this._options?.onListenerError || Lt)(h), D.None;
      }
      if (this._disposed)
        return D.None;
      e && (t = t.bind(e));
      let r = new Pt(t), n, o;
      this._leakageMon && this._size >= Math.ceil(this._leakageMon.threshold * 0.2) && (r.stack = gi.create(), n = this._leakageMon.check(r.stack, this._size + 1)), fo && (r.stack = o ?? gi.create()), this._listeners ? this._listeners instanceof Pt ? (this._deliveryQueue ??= new jn, this._listeners = [this._listeners, r]) : this._listeners.push(r) : (this._options?.onWillAddFirstListener?.(this), this._listeners = r, this._options?.onDidAddFirstListener?.(this)), this._size++;
      let l = C(() => {
        _r?.unregister(l), n?.(), this._removeListener(r);
      });
      if (i instanceof Ee ? i.add(l) : Array.isArray(i) && i.push(l), _r) {
        let a = new Error().stack.split(`
`).slice(2, 3).join(`
`).trim(), u = /(file:|vscode-file:\/\/vscode-app)?(\/[^:]*:\d+:\d+)/.exec(a);
        _r.register(l, u?.[2] ?? a, l);
      }
      return l;
    }, this._event;
  }
  _removeListener(t) {
    if (this._options?.onWillRemoveListener?.(this), !this._listeners)
      return;
    if (this._size === 1) {
      this._listeners = undefined, this._options?.onDidRemoveLastListener?.(this), this._size = 0;
      return;
    }
    let e = this._listeners, i = e.indexOf(t);
    if (i === -1)
      throw console.log("disposed?", this._disposed), console.log("size?", this._size), console.log("arr?", JSON.stringify(this._listeners)), new Error("Attempted to dispose unknown listener");
    this._size--, e[i] = undefined;
    let r = this._deliveryQueue.current === this;
    if (this._size * ql <= e.length) {
      let n = 0;
      for (let o = 0;o < e.length; o++)
        e[o] ? e[n++] = e[o] : r && (this._deliveryQueue.end--, n < this._deliveryQueue.i && this._deliveryQueue.i--);
      e.length = n;
    }
  }
  _deliver(t, e) {
    if (!t)
      return;
    let i = this._options?.onListenerError || Lt;
    if (!i) {
      t.value(e);
      return;
    }
    try {
      t.value(e);
    } catch (r) {
      i(r);
    }
  }
  _deliverQueue(t) {
    let e = t.current._listeners;
    for (;t.i < t.end; )
      this._deliver(e[t.i++], t.value);
    t.reset();
  }
  fire(t) {
    if (this._deliveryQueue?.current && (this._deliverQueue(this._deliveryQueue), this._perfMon?.stop()), this._perfMon?.start(this._size), this._listeners)
      if (this._listeners instanceof Pt)
        this._deliver(this._listeners, t);
      else {
        let e = this._deliveryQueue;
        e.enqueue(this, t, this._listeners.length), this._deliverQueue(e);
      }
    this._perfMon?.stop();
  }
  hasListeners() {
    return this._size > 0;
  }
};
var jn = class {
  constructor() {
    this.i = -1;
    this.end = 0;
  }
  enqueue(t, e, i) {
    this.i = 0, this.end = i, this.current = t, this.value = e;
  }
  reset() {
    this.i = this.end, this.current = undefined, this.value = undefined;
  }
};
var gr = class gr2 {
  constructor() {
    this.mapWindowIdToZoomLevel = new Map;
    this._onDidChangeZoomLevel = new v;
    this.onDidChangeZoomLevel = this._onDidChangeZoomLevel.event;
    this.mapWindowIdToZoomFactor = new Map;
    this._onDidChangeFullscreen = new v;
    this.onDidChangeFullscreen = this._onDidChangeFullscreen.event;
    this.mapWindowIdToFullScreen = new Map;
  }
  getZoomLevel(t) {
    return this.mapWindowIdToZoomLevel.get(this.getWindowId(t)) ?? 0;
  }
  setZoomLevel(t, e) {
    if (this.getZoomLevel(e) === t)
      return;
    let i = this.getWindowId(e);
    this.mapWindowIdToZoomLevel.set(i, t), this._onDidChangeZoomLevel.fire(i);
  }
  getZoomFactor(t) {
    return this.mapWindowIdToZoomFactor.get(this.getWindowId(t)) ?? 1;
  }
  setZoomFactor(t, e) {
    this.mapWindowIdToZoomFactor.set(this.getWindowId(e), t);
  }
  setFullscreen(t, e) {
    if (this.isFullscreen(e) === t)
      return;
    let i = this.getWindowId(e);
    this.mapWindowIdToFullScreen.set(i, t), this._onDidChangeFullscreen.fire(i);
  }
  isFullscreen(t) {
    return !!this.mapWindowIdToFullScreen.get(this.getWindowId(t));
  }
  getWindowId(t) {
    return t.vscodeWindowId;
  }
};
gr.INSTANCE = new gr;
var Si = gr;
function Xl(s8, t, e) {
  typeof t == "string" && (t = s8.matchMedia(t)), t.addEventListener("change", e);
}
var Eu = Si.INSTANCE.onDidChangeZoomLevel;
function mo(s8) {
  return Si.INSTANCE.getZoomFactor(s8);
}
var Tu = Si.INSTANCE.onDidChangeFullscreen;
var Ot = typeof navigator == "object" ? navigator.userAgent : "";
var Ei = Ot.indexOf("Firefox") >= 0;
var Bt = Ot.indexOf("AppleWebKit") >= 0;
var Ti = Ot.indexOf("Chrome") >= 0;
var Sr = !Ti && Ot.indexOf("Safari") >= 0;
var Iu = Ot.indexOf("Electron/") >= 0;
var yu = Ot.indexOf("Android") >= 0;
var vr = false;
if (typeof fe.matchMedia == "function") {
  let s8 = fe.matchMedia("(display-mode: standalone) or (display-mode: window-controls-overlay)"), t = fe.matchMedia("(display-mode: fullscreen)");
  vr = s8.matches, Xl(fe, s8, ({ matches: e }) => {
    vr && t.matches || (vr = e);
  });
}
function _o() {
  return vr;
}
var Nt = "en";
var yr = false;
var xr = false;
var Ii = false;
var Zl = false;
var vo = false;
var go = false;
var Jl = false;
var Ql = false;
var ea = false;
var ta = false;
var Tr;
var Ir = Nt;
var bo = Nt;
var ia;
var $e;
var Ve = globalThis;
var xe;
typeof Ve.vscode < "u" && typeof Ve.vscode.process < "u" ? xe = Ve.vscode.process : typeof process < "u" && typeof process?.versions?.node == "string" && (xe = process);
var So = typeof xe?.versions?.electron == "string";
var ra = So && xe?.type === "renderer";
if (typeof xe == "object") {
  yr = xe.platform === "win32", xr = xe.platform === "darwin", Ii = xe.platform === "linux", Zl = Ii && !!xe.env.SNAP && !!xe.env.SNAP_REVISION, Jl = So, ea = !!xe.env.CI || !!xe.env.BUILD_ARTIFACTSTAGINGDIRECTORY, Tr = Nt, Ir = Nt;
  let s8 = xe.env.VSCODE_NLS_CONFIG;
  if (s8)
    try {
      let t = JSON.parse(s8);
      Tr = t.userLocale, bo = t.osLocale, Ir = t.resolvedLanguage || Nt, ia = t.languagePack?.translationsConfigFile;
    } catch {}
  vo = true;
} else
  typeof navigator == "object" && !ra ? ($e = navigator.userAgent, yr = $e.indexOf("Windows") >= 0, xr = $e.indexOf("Macintosh") >= 0, Ql = ($e.indexOf("Macintosh") >= 0 || $e.indexOf("iPad") >= 0 || $e.indexOf("iPhone") >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0, Ii = $e.indexOf("Linux") >= 0, ta = $e?.indexOf("Mobi") >= 0, go = true, Ir = globalThis._VSCODE_NLS_LANGUAGE || Nt, Tr = navigator.language.toLowerCase(), bo = Tr) : console.error("Unable to resolve platform.");
var Xn = 0;
xr ? Xn = 1 : yr ? Xn = 3 : Ii && (Xn = 2);
var wr = yr;
var Te = xr;
var Zn = Ii;
var Dr = vo;
var na = go && typeof Ve.importScripts == "function";
var xu = na ? Ve.origin : undefined;
var Fe = $e;
var st = Ir;
var sa;
((i) => {
  function s8() {
    return st;
  }
  i.value = s8;
  function t() {
    return st.length === 2 ? st === "en" : st.length >= 3 ? st[0] === "e" && st[1] === "n" && st[2] === "-" : false;
  }
  i.isDefaultVariant = t;
  function e() {
    return st === "en";
  }
  i.isDefault = e;
})(sa ||= {});
var oa = typeof Ve.postMessage == "function" && !Ve.importScripts;
var Eo = (() => {
  if (oa) {
    let s8 = [];
    Ve.addEventListener("message", (e) => {
      if (e.data && e.data.vscodeScheduleAsyncWork)
        for (let i = 0, r = s8.length;i < r; i++) {
          let n = s8[i];
          if (n.id === e.data.vscodeScheduleAsyncWork) {
            s8.splice(i, 1), n.callback();
            return;
          }
        }
    });
    let t = 0;
    return (e) => {
      let i = ++t;
      s8.push({ id: i, callback: e }), Ve.postMessage({ vscodeScheduleAsyncWork: i }, "*");
    };
  }
  return (s8) => setTimeout(s8);
})();
var la = !!(Fe && Fe.indexOf("Chrome") >= 0);
var wu = !!(Fe && Fe.indexOf("Firefox") >= 0);
var Du = !!(!la && Fe && Fe.indexOf("Safari") >= 0);
var Ru = !!(Fe && Fe.indexOf("Edg/") >= 0);
var Lu = !!(Fe && Fe.indexOf("Android") >= 0);
var ot = typeof navigator == "object" ? navigator : {};
var aa = { clipboard: { writeText: Dr || document.queryCommandSupported && document.queryCommandSupported("copy") || !!(ot && ot.clipboard && ot.clipboard.writeText), readText: Dr || !!(ot && ot.clipboard && ot.clipboard.readText) }, keyboard: Dr || _o() ? 0 : ot.keyboard || Sr ? 1 : 2, touch: "ontouchstart" in fe || ot.maxTouchPoints > 0, pointerEvents: fe.PointerEvent && (("ontouchstart" in fe) || navigator.maxTouchPoints > 0) };
var yi = class {
  constructor() {
    this._keyCodeToStr = [], this._strToKeyCode = Object.create(null);
  }
  define(t, e) {
    this._keyCodeToStr[t] = e, this._strToKeyCode[e.toLowerCase()] = t;
  }
  keyCodeToStr(t) {
    return this._keyCodeToStr[t];
  }
  strToKeyCode(t) {
    return this._strToKeyCode[t.toLowerCase()] || 0;
  }
};
var Jn = new yi;
var To = new yi;
var Io = new yi;
var yo = new Array(230);
var Qn;
((o) => {
  function s8(l) {
    return Jn.keyCodeToStr(l);
  }
  o.toString = s8;
  function t(l) {
    return Jn.strToKeyCode(l);
  }
  o.fromString = t;
  function e(l) {
    return To.keyCodeToStr(l);
  }
  o.toUserSettingsUS = e;
  function i(l) {
    return Io.keyCodeToStr(l);
  }
  o.toUserSettingsGeneral = i;
  function r(l) {
    return To.strToKeyCode(l) || Io.strToKeyCode(l);
  }
  o.fromUserSettings = r;
  function n(l) {
    if (l >= 98 && l <= 113)
      return null;
    switch (l) {
      case 16:
        return "Up";
      case 18:
        return "Down";
      case 15:
        return "Left";
      case 17:
        return "Right";
    }
    return Jn.keyCodeToStr(l);
  }
  o.toElectronAccelerator = n;
})(Qn ||= {});
var Rr = class s8 {
  constructor(t, e, i, r, n) {
    this.ctrlKey = t;
    this.shiftKey = e;
    this.altKey = i;
    this.metaKey = r;
    this.keyCode = n;
  }
  equals(t) {
    return t instanceof s8 && this.ctrlKey === t.ctrlKey && this.shiftKey === t.shiftKey && this.altKey === t.altKey && this.metaKey === t.metaKey && this.keyCode === t.keyCode;
  }
  getHashCode() {
    let t = this.ctrlKey ? "1" : "0", e = this.shiftKey ? "1" : "0", i = this.altKey ? "1" : "0", r = this.metaKey ? "1" : "0";
    return `K${t}${e}${i}${r}${this.keyCode}`;
  }
  isModifierKey() {
    return this.keyCode === 0 || this.keyCode === 5 || this.keyCode === 57 || this.keyCode === 6 || this.keyCode === 4;
  }
  toKeybinding() {
    return new es([this]);
  }
  isDuplicateModifierCase() {
    return this.ctrlKey && this.keyCode === 5 || this.shiftKey && this.keyCode === 4 || this.altKey && this.keyCode === 6 || this.metaKey && this.keyCode === 57;
  }
};
var es = class {
  constructor(t) {
    if (t.length === 0)
      throw eo("chords");
    this.chords = t;
  }
  getHashCode() {
    let t = "";
    for (let e = 0, i = this.chords.length;e < i; e++)
      e !== 0 && (t += ";"), t += this.chords[e].getHashCode();
    return t;
  }
  equals(t) {
    if (t === null || this.chords.length !== t.chords.length)
      return false;
    for (let e = 0;e < this.chords.length; e++)
      if (!this.chords[e].equals(t.chords[e]))
        return false;
    return true;
  }
};
function ca(s9) {
  if (s9.charCode) {
    let e = String.fromCharCode(s9.charCode).toUpperCase();
    return Qn.fromString(e);
  }
  let t = s9.keyCode;
  if (t === 3)
    return 7;
  if (Ei)
    switch (t) {
      case 59:
        return 85;
      case 60:
        if (Zn)
          return 97;
        break;
      case 61:
        return 86;
      case 107:
        return 109;
      case 109:
        return 111;
      case 173:
        return 88;
      case 224:
        if (Te)
          return 57;
        break;
    }
  else if (Bt) {
    if (Te && t === 93)
      return 57;
    if (!Te && t === 92)
      return 57;
  }
  return yo[t] || 0;
}
var ua = Te ? 256 : 2048;
var ha = 512;
var da = 1024;
var fa = Te ? 2048 : 256;
var ft = class {
  constructor(t) {
    this._standardKeyboardEventBrand = true;
    let e = t;
    this.browserEvent = e, this.target = e.target, this.ctrlKey = e.ctrlKey, this.shiftKey = e.shiftKey, this.altKey = e.altKey, this.metaKey = e.metaKey, this.altGraphKey = e.getModifierState?.("AltGraph"), this.keyCode = ca(e), this.code = e.code, this.ctrlKey = this.ctrlKey || this.keyCode === 5, this.altKey = this.altKey || this.keyCode === 6, this.shiftKey = this.shiftKey || this.keyCode === 4, this.metaKey = this.metaKey || this.keyCode === 57, this._asKeybinding = this._computeKeybinding(), this._asKeyCodeChord = this._computeKeyCodeChord();
  }
  preventDefault() {
    this.browserEvent && this.browserEvent.preventDefault && this.browserEvent.preventDefault();
  }
  stopPropagation() {
    this.browserEvent && this.browserEvent.stopPropagation && this.browserEvent.stopPropagation();
  }
  toKeyCodeChord() {
    return this._asKeyCodeChord;
  }
  equals(t) {
    return this._asKeybinding === t;
  }
  _computeKeybinding() {
    let t = 0;
    this.keyCode !== 5 && this.keyCode !== 4 && this.keyCode !== 6 && this.keyCode !== 57 && (t = this.keyCode);
    let e = 0;
    return this.ctrlKey && (e |= ua), this.altKey && (e |= ha), this.shiftKey && (e |= da), this.metaKey && (e |= fa), e |= t, e;
  }
  _computeKeyCodeChord() {
    let t = 0;
    return this.keyCode !== 5 && this.keyCode !== 4 && this.keyCode !== 6 && this.keyCode !== 57 && (t = this.keyCode), new Rr(this.ctrlKey, this.shiftKey, this.altKey, this.metaKey, t);
  }
};
var wo = new WeakMap;
function pa(s9) {
  if (!s9.parent || s9.parent === s9)
    return null;
  try {
    let t = s9.location, e = s9.parent.location;
    if (t.origin !== "null" && e.origin !== "null" && t.origin !== e.origin)
      return null;
  } catch {
    return null;
  }
  return s9.parent;
}
var Lr = class {
  static getSameOriginWindowChain(t) {
    let e = wo.get(t);
    if (!e) {
      e = [], wo.set(t, e);
      let i = t, r;
      do
        r = pa(i), r ? e.push({ window: new WeakRef(i), iframeElement: i.frameElement || null }) : e.push({ window: new WeakRef(i), iframeElement: null }), i = r;
      while (i);
    }
    return e.slice(0);
  }
  static getPositionOfChildWindowRelativeToAncestorWindow(t, e) {
    if (!e || t === e)
      return { top: 0, left: 0 };
    let i = 0, r = 0, n = this.getSameOriginWindowChain(t);
    for (let o of n) {
      let l = o.window.deref();
      if (i += l?.scrollY ?? 0, r += l?.scrollX ?? 0, l === e || !o.iframeElement)
        break;
      let a = o.iframeElement.getBoundingClientRect();
      i += a.top, r += a.left;
    }
    return { top: i, left: r };
  }
};
var qe = class {
  constructor(t, e) {
    this.timestamp = Date.now(), this.browserEvent = e, this.leftButton = e.button === 0, this.middleButton = e.button === 1, this.rightButton = e.button === 2, this.buttons = e.buttons, this.target = e.target, this.detail = e.detail || 1, e.type === "dblclick" && (this.detail = 2), this.ctrlKey = e.ctrlKey, this.shiftKey = e.shiftKey, this.altKey = e.altKey, this.metaKey = e.metaKey, typeof e.pageX == "number" ? (this.posx = e.pageX, this.posy = e.pageY) : (this.posx = e.clientX + this.target.ownerDocument.body.scrollLeft + this.target.ownerDocument.documentElement.scrollLeft, this.posy = e.clientY + this.target.ownerDocument.body.scrollTop + this.target.ownerDocument.documentElement.scrollTop);
    let i = Lr.getPositionOfChildWindowRelativeToAncestorWindow(t, e.view);
    this.posx -= i.left, this.posy -= i.top;
  }
  preventDefault() {
    this.browserEvent.preventDefault();
  }
  stopPropagation() {
    this.browserEvent.stopPropagation();
  }
};
var xi = class {
  constructor(t, e = 0, i = 0) {
    this.browserEvent = t || null, this.target = t ? t.target || t.targetNode || t.srcElement : null, this.deltaY = i, this.deltaX = e;
    let r = false;
    if (Ti) {
      let n = navigator.userAgent.match(/Chrome\/(\d+)/);
      r = (n ? parseInt(n[1]) : 123) <= 122;
    }
    if (t) {
      let n = t, o = t, l = t.view?.devicePixelRatio || 1;
      if (typeof n.wheelDeltaY < "u")
        r ? this.deltaY = n.wheelDeltaY / (120 * l) : this.deltaY = n.wheelDeltaY / 120;
      else if (typeof o.VERTICAL_AXIS < "u" && o.axis === o.VERTICAL_AXIS)
        this.deltaY = -o.detail / 3;
      else if (t.type === "wheel") {
        let a = t;
        a.deltaMode === a.DOM_DELTA_LINE ? Ei && !Te ? this.deltaY = -t.deltaY / 3 : this.deltaY = -t.deltaY : this.deltaY = -t.deltaY / 40;
      }
      if (typeof n.wheelDeltaX < "u")
        Sr && wr ? this.deltaX = -(n.wheelDeltaX / 120) : r ? this.deltaX = n.wheelDeltaX / (120 * l) : this.deltaX = n.wheelDeltaX / 120;
      else if (typeof o.HORIZONTAL_AXIS < "u" && o.axis === o.HORIZONTAL_AXIS)
        this.deltaX = -t.detail / 3;
      else if (t.type === "wheel") {
        let a = t;
        a.deltaMode === a.DOM_DELTA_LINE ? Ei && !Te ? this.deltaX = -t.deltaX / 3 : this.deltaX = -t.deltaX : this.deltaX = -t.deltaX / 40;
      }
      this.deltaY === 0 && this.deltaX === 0 && t.wheelDelta && (r ? this.deltaY = t.wheelDelta / (120 * l) : this.deltaY = t.wheelDelta / 120);
    }
  }
  preventDefault() {
    this.browserEvent?.preventDefault();
  }
  stopPropagation() {
    this.browserEvent?.stopPropagation();
  }
};
var Do = Object.freeze(function(s9, t) {
  let e = setTimeout(s9.bind(t), 0);
  return { dispose() {
    clearTimeout(e);
  } };
});
var ma;
((i) => {
  function s9(r) {
    return r === i.None || r === i.Cancelled || r instanceof ts ? true : !r || typeof r != "object" ? false : typeof r.isCancellationRequested == "boolean" && typeof r.onCancellationRequested == "function";
  }
  i.isCancellationToken = s9, i.None = Object.freeze({ isCancellationRequested: false, onCancellationRequested: $.None }), i.Cancelled = Object.freeze({ isCancellationRequested: true, onCancellationRequested: Do });
})(ma ||= {});
var ts = class {
  constructor() {
    this._isCancelled = false;
    this._emitter = null;
  }
  cancel() {
    this._isCancelled || (this._isCancelled = true, this._emitter && (this._emitter.fire(undefined), this.dispose()));
  }
  get isCancellationRequested() {
    return this._isCancelled;
  }
  get onCancellationRequested() {
    return this._isCancelled ? Do : (this._emitter || (this._emitter = new v), this._emitter.event);
  }
  dispose() {
    this._emitter && (this._emitter.dispose(), this._emitter = null);
  }
};
var _a = Symbol("MicrotaskDelay");
var Ye = class {
  constructor(t, e) {
    this._isDisposed = false;
    this._token = -1, typeof t == "function" && typeof e == "number" && this.setIfNotSet(t, e);
  }
  dispose() {
    this.cancel(), this._isDisposed = true;
  }
  cancel() {
    this._token !== -1 && (clearTimeout(this._token), this._token = -1);
  }
  cancelAndSet(t, e) {
    if (this._isDisposed)
      throw new Rt("Calling 'cancelAndSet' on a disposed TimeoutTimer");
    this.cancel(), this._token = setTimeout(() => {
      this._token = -1, t();
    }, e);
  }
  setIfNotSet(t, e) {
    if (this._isDisposed)
      throw new Rt("Calling 'setIfNotSet' on a disposed TimeoutTimer");
    this._token === -1 && (this._token = setTimeout(() => {
      this._token = -1, t();
    }, e));
  }
};
var kr = class {
  constructor() {
    this.disposable = undefined;
    this.isDisposed = false;
  }
  cancel() {
    this.disposable?.dispose(), this.disposable = undefined;
  }
  cancelAndSet(t, e, i = globalThis) {
    if (this.isDisposed)
      throw new Rt("Calling 'cancelAndSet' on a disposed IntervalTimer");
    this.cancel();
    let r = i.setInterval(() => {
      t();
    }, e);
    this.disposable = C(() => {
      i.clearInterval(r), this.disposable = undefined;
    });
  }
  dispose() {
    this.cancel(), this.isDisposed = true;
  }
};
var ba;
var Ar;
(function() {
  typeof globalThis.requestIdleCallback != "function" || typeof globalThis.cancelIdleCallback != "function" ? Ar = (s9, t) => {
    Eo(() => {
      if (e)
        return;
      let i = Date.now() + 15;
      t(Object.freeze({ didTimeout: true, timeRemaining() {
        return Math.max(0, i - Date.now());
      } }));
    });
    let e = false;
    return { dispose() {
      e || (e = true);
    } };
  } : Ar = (s9, t, e) => {
    let i = s9.requestIdleCallback(t, typeof e == "number" ? { timeout: e } : undefined), r = false;
    return { dispose() {
      r || (r = true, s9.cancelIdleCallback(i));
    } };
  }, ba = (s9) => Ar(globalThis, s9);
})();
var va;
((e) => {
  async function s9(i) {
    let r, n = await Promise.all(i.map((o) => o.then((l) => l, (l) => {
      r || (r = l);
    })));
    if (typeof r < "u")
      throw r;
    return n;
  }
  e.settled = s9;
  function t(i) {
    return new Promise(async (r, n) => {
      try {
        await i(r, n);
      } catch (o) {
        n(o);
      }
    });
  }
  e.withAsyncBody = t;
})(va ||= {});
var _e = class _e2 {
  static fromArray(t) {
    return new _e2((e) => {
      e.emitMany(t);
    });
  }
  static fromPromise(t) {
    return new _e2(async (e) => {
      e.emitMany(await t);
    });
  }
  static fromPromises(t) {
    return new _e2(async (e) => {
      await Promise.all(t.map(async (i) => e.emitOne(await i)));
    });
  }
  static merge(t) {
    return new _e2(async (e) => {
      await Promise.all(t.map(async (i) => {
        for await (let r of i)
          e.emitOne(r);
      }));
    });
  }
  constructor(t, e) {
    this._state = 0, this._results = [], this._error = null, this._onReturn = e, this._onStateChanged = new v, queueMicrotask(async () => {
      let i = { emitOne: (r) => this.emitOne(r), emitMany: (r) => this.emitMany(r), reject: (r) => this.reject(r) };
      try {
        await Promise.resolve(t(i)), this.resolve();
      } catch (r) {
        this.reject(r);
      } finally {
        i.emitOne = undefined, i.emitMany = undefined, i.reject = undefined;
      }
    });
  }
  [Symbol.asyncIterator]() {
    let t = 0;
    return { next: async () => {
      do {
        if (this._state === 2)
          throw this._error;
        if (t < this._results.length)
          return { done: false, value: this._results[t++] };
        if (this._state === 1)
          return { done: true, value: undefined };
        await $.toPromise(this._onStateChanged.event);
      } while (true);
    }, return: async () => (this._onReturn?.(), { done: true, value: undefined }) };
  }
  static map(t, e) {
    return new _e2(async (i) => {
      for await (let r of t)
        i.emitOne(e(r));
    });
  }
  map(t) {
    return _e2.map(this, t);
  }
  static filter(t, e) {
    return new _e2(async (i) => {
      for await (let r of t)
        e(r) && i.emitOne(r);
    });
  }
  filter(t) {
    return _e2.filter(this, t);
  }
  static coalesce(t) {
    return _e2.filter(t, (e) => !!e);
  }
  coalesce() {
    return _e2.coalesce(this);
  }
  static async toPromise(t) {
    let e = [];
    for await (let i of t)
      e.push(i);
    return e;
  }
  toPromise() {
    return _e2.toPromise(this);
  }
  emitOne(t) {
    this._state === 0 && (this._results.push(t), this._onStateChanged.fire());
  }
  emitMany(t) {
    this._state === 0 && (this._results = this._results.concat(t), this._onStateChanged.fire());
  }
  resolve() {
    this._state === 0 && (this._state = 1, this._onStateChanged.fire());
  }
  reject(t) {
    this._state === 0 && (this._state = 2, this._error = t, this._onStateChanged.fire());
  }
};
_e.EMPTY = _e.fromArray([]);
function Lo(s9) {
  return 55296 <= s9 && s9 <= 56319;
}
function is(s9) {
  return 56320 <= s9 && s9 <= 57343;
}
function Ao(s9, t) {
  return (s9 - 55296 << 10) + (t - 56320) + 65536;
}
function Mo(s9) {
  return ns(s9, 0);
}
function ns(s9, t) {
  switch (typeof s9) {
    case "object":
      return s9 === null ? je(349, t) : Array.isArray(s9) ? Ea(s9, t) : Ta(s9, t);
    case "string":
      return Po(s9, t);
    case "boolean":
      return Sa(s9, t);
    case "number":
      return je(s9, t);
    case "undefined":
      return je(937, t);
    default:
      return je(617, t);
  }
}
function je(s9, t) {
  return (t << 5) - t + s9 | 0;
}
function Sa(s9, t) {
  return je(s9 ? 433 : 863, t);
}
function Po(s9, t) {
  t = je(149417, t);
  for (let e = 0, i = s9.length;e < i; e++)
    t = je(s9.charCodeAt(e), t);
  return t;
}
function Ea(s9, t) {
  return t = je(104579, t), s9.reduce((e, i) => ns(i, e), t);
}
function Ta(s9, t) {
  return t = je(181387, t), Object.keys(s9).sort().reduce((e, i) => (e = Po(i, e), ns(s9[i], e)), t);
}
function rs(s9, t, e = 32) {
  let i = e - t, r = ~((1 << i) - 1);
  return (s9 << t | (r & s9) >>> i) >>> 0;
}
function ko(s9, t = 0, e = s9.byteLength, i = 0) {
  for (let r = 0;r < e; r++)
    s9[t + r] = i;
}
function Ia(s9, t, e = "0") {
  for (;s9.length < t; )
    s9 = e + s9;
  return s9;
}
function wi(s9, t = 32) {
  return s9 instanceof ArrayBuffer ? Array.from(new Uint8Array(s9)).map((e) => e.toString(16).padStart(2, "0")).join("") : Ia((s9 >>> 0).toString(16), t / 4);
}
var Cr = class Cr2 {
  constructor() {
    this._h0 = 1732584193;
    this._h1 = 4023233417;
    this._h2 = 2562383102;
    this._h3 = 271733878;
    this._h4 = 3285377520;
    this._buff = new Uint8Array(67), this._buffDV = new DataView(this._buff.buffer), this._buffLen = 0, this._totalLen = 0, this._leftoverHighSurrogate = 0, this._finished = false;
  }
  update(t) {
    let e = t.length;
    if (e === 0)
      return;
    let i = this._buff, r = this._buffLen, n = this._leftoverHighSurrogate, o, l;
    for (n !== 0 ? (o = n, l = -1, n = 0) : (o = t.charCodeAt(0), l = 0);; ) {
      let a = o;
      if (Lo(o))
        if (l + 1 < e) {
          let u = t.charCodeAt(l + 1);
          is(u) ? (l++, a = Ao(o, u)) : a = 65533;
        } else {
          n = o;
          break;
        }
      else
        is(o) && (a = 65533);
      if (r = this._push(i, r, a), l++, l < e)
        o = t.charCodeAt(l);
      else
        break;
    }
    this._buffLen = r, this._leftoverHighSurrogate = n;
  }
  _push(t, e, i) {
    return i < 128 ? t[e++] = i : i < 2048 ? (t[e++] = 192 | (i & 1984) >>> 6, t[e++] = 128 | (i & 63) >>> 0) : i < 65536 ? (t[e++] = 224 | (i & 61440) >>> 12, t[e++] = 128 | (i & 4032) >>> 6, t[e++] = 128 | (i & 63) >>> 0) : (t[e++] = 240 | (i & 1835008) >>> 18, t[e++] = 128 | (i & 258048) >>> 12, t[e++] = 128 | (i & 4032) >>> 6, t[e++] = 128 | (i & 63) >>> 0), e >= 64 && (this._step(), e -= 64, this._totalLen += 64, t[0] = t[64], t[1] = t[65], t[2] = t[66]), e;
  }
  digest() {
    return this._finished || (this._finished = true, this._leftoverHighSurrogate && (this._leftoverHighSurrogate = 0, this._buffLen = this._push(this._buff, this._buffLen, 65533)), this._totalLen += this._buffLen, this._wrapUp()), wi(this._h0) + wi(this._h1) + wi(this._h2) + wi(this._h3) + wi(this._h4);
  }
  _wrapUp() {
    this._buff[this._buffLen++] = 128, ko(this._buff, this._buffLen), this._buffLen > 56 && (this._step(), ko(this._buff));
    let t = 8 * this._totalLen;
    this._buffDV.setUint32(56, Math.floor(t / 4294967296), false), this._buffDV.setUint32(60, t % 4294967296, false), this._step();
  }
  _step() {
    let t = Cr2._bigBlock32, e = this._buffDV;
    for (let c = 0;c < 64; c += 4)
      t.setUint32(c, e.getUint32(c, false), false);
    for (let c = 64;c < 320; c += 4)
      t.setUint32(c, rs(t.getUint32(c - 12, false) ^ t.getUint32(c - 32, false) ^ t.getUint32(c - 56, false) ^ t.getUint32(c - 64, false), 1), false);
    let i = this._h0, r = this._h1, n = this._h2, o = this._h3, l = this._h4, a, u, h;
    for (let c = 0;c < 80; c++)
      c < 20 ? (a = r & n | ~r & o, u = 1518500249) : c < 40 ? (a = r ^ n ^ o, u = 1859775393) : c < 60 ? (a = r & n | r & o | n & o, u = 2400959708) : (a = r ^ n ^ o, u = 3395469782), h = rs(i, 5) + a + l + u + t.getUint32(c * 4, false) & 4294967295, l = o, o = n, n = rs(r, 30), r = i, i = h;
    this._h0 = this._h0 + i & 4294967295, this._h1 = this._h1 + r & 4294967295, this._h2 = this._h2 + n & 4294967295, this._h3 = this._h3 + o & 4294967295, this._h4 = this._h4 + l & 4294967295;
  }
};
Cr._bigBlock32 = new DataView(new ArrayBuffer(320));
var { registerWindow: Bh, getWindow: be, getDocument: Nh, getWindows: Fh, getWindowsCount: Hh, getWindowId: Oo, getWindowById: Wh, hasWindow: Uh, onDidRegisterWindow: No, onWillUnregisterWindow: Kh, onDidUnregisterWindow: zh } = function() {
  let s9 = new Map;
  let t = { window: fe, disposables: new Ee };
  s9.set(fe.vscodeWindowId, t);
  let e = new v, i = new v, r = new v;
  function n(o, l) {
    return (typeof o == "number" ? s9.get(o) : undefined) ?? (l ? t : undefined);
  }
  return { onDidRegisterWindow: e.event, onWillUnregisterWindow: r.event, onDidUnregisterWindow: i.event, registerWindow(o) {
    if (s9.has(o.vscodeWindowId))
      return D.None;
    let l = new Ee, a = { window: o, disposables: l.add(new Ee) };
    return s9.set(o.vscodeWindowId, a), l.add(C(() => {
      s9.delete(o.vscodeWindowId), i.fire(o);
    })), l.add(L(o, Y.BEFORE_UNLOAD, () => {
      r.fire(o);
    })), e.fire(a), l;
  }, getWindows() {
    return s9.values();
  }, getWindowsCount() {
    return s9.size;
  }, getWindowId(o) {
    return o.vscodeWindowId;
  }, hasWindow(o) {
    return s9.has(o);
  }, getWindowById: n, getWindow(o) {
    let l = o;
    if (l?.ownerDocument?.defaultView)
      return l.ownerDocument.defaultView.window;
    let a = o;
    return a?.view ? a.view.window : fe;
  }, getDocument(o) {
    return be(o).document;
  } };
}();
var ss = class {
  constructor(t, e, i, r) {
    this._node = t, this._type = e, this._handler = i, this._options = r || false, this._node.addEventListener(this._type, this._handler, this._options);
  }
  dispose() {
    this._handler && (this._node.removeEventListener(this._type, this._handler, this._options), this._node = null, this._handler = null);
  }
};
function L(s9, t, e, i) {
  return new ss(s9, t, e, i);
}
function ya(s9, t) {
  return function(e) {
    return t(new qe(s9, e));
  };
}
function xa(s9) {
  return function(t) {
    return s9(new ft(t));
  };
}
var os = function(t, e, i, r) {
  let n = i;
  return e === "click" || e === "mousedown" || e === "contextmenu" ? n = ya(be(t), i) : (e === "keydown" || e === "keypress" || e === "keyup") && (n = xa(i)), L(t, e, n, r);
};
var wa;
var mt;
var Mr = class extends kr {
  constructor(t) {
    super(), this.defaultTarget = t && be(t);
  }
  cancelAndSet(t, e, i) {
    return super.cancelAndSet(t, e, i ?? this.defaultTarget);
  }
};
var Di = class {
  constructor(t, e = 0) {
    this._runner = t, this.priority = e, this._canceled = false;
  }
  dispose() {
    this._canceled = true;
  }
  execute() {
    if (!this._canceled)
      try {
        this._runner();
      } catch (t) {
        Lt(t);
      }
  }
  static sort(t, e) {
    return e.priority - t.priority;
  }
};
(function() {
  let s9 = new Map, t = new Map, e = new Map, i = new Map, r = (n) => {
    e.set(n, false);
    let o = s9.get(n) ?? [];
    for (t.set(n, o), s9.set(n, []), i.set(n, true);o.length > 0; )
      o.sort(Di.sort), o.shift().execute();
    i.set(n, false);
  };
  mt = (n, o, l = 0) => {
    let a = Oo(n), u = new Di(o, l), h = s9.get(a);
    return h || (h = [], s9.set(a, h)), h.push(u), e.get(a) || (e.set(a, true), n.requestAnimationFrame(() => r(a))), u;
  }, wa = (n, o, l) => {
    let a = Oo(n);
    if (i.get(a)) {
      let u = new Di(o, l), h = t.get(a);
      return h || (h = [], t.set(a, h)), h.push(u), u;
    } else
      return mt(n, o, l);
  };
})();
var pt = class pt2 {
  constructor(t, e) {
    this.width = t;
    this.height = e;
  }
  with(t = this.width, e = this.height) {
    return t !== this.width || e !== this.height ? new pt2(t, e) : this;
  }
  static is(t) {
    return typeof t == "object" && typeof t.height == "number" && typeof t.width == "number";
  }
  static lift(t) {
    return t instanceof pt2 ? t : new pt2(t.width, t.height);
  }
  static equals(t, e) {
    return t === e ? true : !t || !e ? false : t.width === e.width && t.height === e.height;
  }
};
pt.None = new pt(0, 0);
function Fo(s9) {
  let t = s9.getBoundingClientRect(), e = be(s9);
  return { left: t.left + e.scrollX, top: t.top + e.scrollY, width: t.width, height: t.height };
}
var Gh = new class {
  constructor() {
    this.mutationObservers = new Map;
  }
  observe(s9, t, e) {
    let i = this.mutationObservers.get(s9);
    i || (i = new Map, this.mutationObservers.set(s9, i));
    let r = Mo(e), n = i.get(r);
    if (n)
      n.users += 1;
    else {
      let o = new v, l = new MutationObserver((u) => o.fire(u));
      l.observe(s9, e);
      let a = n = { users: 1, observer: l, onDidMutate: o.event };
      t.add(C(() => {
        a.users -= 1, a.users === 0 && (o.dispose(), l.disconnect(), i?.delete(r), i?.size === 0 && this.mutationObservers.delete(s9));
      })), i.set(r, n);
    }
    return n.onDidMutate;
  }
};
var Y = { CLICK: "click", AUXCLICK: "auxclick", DBLCLICK: "dblclick", MOUSE_UP: "mouseup", MOUSE_DOWN: "mousedown", MOUSE_OVER: "mouseover", MOUSE_MOVE: "mousemove", MOUSE_OUT: "mouseout", MOUSE_ENTER: "mouseenter", MOUSE_LEAVE: "mouseleave", MOUSE_WHEEL: "wheel", POINTER_UP: "pointerup", POINTER_DOWN: "pointerdown", POINTER_MOVE: "pointermove", POINTER_LEAVE: "pointerleave", CONTEXT_MENU: "contextmenu", WHEEL: "wheel", KEY_DOWN: "keydown", KEY_PRESS: "keypress", KEY_UP: "keyup", LOAD: "load", BEFORE_UNLOAD: "beforeunload", UNLOAD: "unload", PAGE_SHOW: "pageshow", PAGE_HIDE: "pagehide", PASTE: "paste", ABORT: "abort", ERROR: "error", RESIZE: "resize", SCROLL: "scroll", FULLSCREEN_CHANGE: "fullscreenchange", WK_FULLSCREEN_CHANGE: "webkitfullscreenchange", SELECT: "select", CHANGE: "change", SUBMIT: "submit", RESET: "reset", FOCUS: "focus", FOCUS_IN: "focusin", FOCUS_OUT: "focusout", BLUR: "blur", INPUT: "input", STORAGE: "storage", DRAG_START: "dragstart", DRAG: "drag", DRAG_ENTER: "dragenter", DRAG_LEAVE: "dragleave", DRAG_OVER: "dragover", DROP: "drop", DRAG_END: "dragend", ANIMATION_START: Bt ? "webkitAnimationStart" : "animationstart", ANIMATION_END: Bt ? "webkitAnimationEnd" : "animationend", ANIMATION_ITERATION: Bt ? "webkitAnimationIteration" : "animationiteration" };
var Da = /([\w\-]+)?(#([\w\-]+))?((\.([\w\-]+))*)/;
function Ho(s9, t, e, ...i) {
  let r = Da.exec(t);
  if (!r)
    throw new Error("Bad use of emmet");
  let n = r[1] || "div", o;
  return s9 !== "http://www.w3.org/1999/xhtml" ? o = document.createElementNS(s9, n) : o = document.createElement(n), r[3] && (o.id = r[3]), r[4] && (o.className = r[4].replace(/\./g, " ").trim()), e && Object.entries(e).forEach(([l, a]) => {
    typeof a > "u" || (/^on\w+$/.test(l) ? o[l] = a : l === "selected" ? a && o.setAttribute(l, "true") : o.setAttribute(l, a));
  }), o.append(...i), o;
}
function Ra(s9, t, ...e) {
  return Ho("http://www.w3.org/1999/xhtml", s9, t, ...e);
}
Ra.SVG = function(s9, t, ...e) {
  return Ho("http://www.w3.org/2000/svg", s9, t, ...e);
};
var ls = class {
  constructor(t) {
    this.domNode = t;
    this._maxWidth = "";
    this._width = "";
    this._height = "";
    this._top = "";
    this._left = "";
    this._bottom = "";
    this._right = "";
    this._paddingTop = "";
    this._paddingLeft = "";
    this._paddingBottom = "";
    this._paddingRight = "";
    this._fontFamily = "";
    this._fontWeight = "";
    this._fontSize = "";
    this._fontStyle = "";
    this._fontFeatureSettings = "";
    this._fontVariationSettings = "";
    this._textDecoration = "";
    this._lineHeight = "";
    this._letterSpacing = "";
    this._className = "";
    this._display = "";
    this._position = "";
    this._visibility = "";
    this._color = "";
    this._backgroundColor = "";
    this._layerHint = false;
    this._contain = "none";
    this._boxShadow = "";
  }
  setMaxWidth(t) {
    let e = Ie(t);
    this._maxWidth !== e && (this._maxWidth = e, this.domNode.style.maxWidth = this._maxWidth);
  }
  setWidth(t) {
    let e = Ie(t);
    this._width !== e && (this._width = e, this.domNode.style.width = this._width);
  }
  setHeight(t) {
    let e = Ie(t);
    this._height !== e && (this._height = e, this.domNode.style.height = this._height);
  }
  setTop(t) {
    let e = Ie(t);
    this._top !== e && (this._top = e, this.domNode.style.top = this._top);
  }
  setLeft(t) {
    let e = Ie(t);
    this._left !== e && (this._left = e, this.domNode.style.left = this._left);
  }
  setBottom(t) {
    let e = Ie(t);
    this._bottom !== e && (this._bottom = e, this.domNode.style.bottom = this._bottom);
  }
  setRight(t) {
    let e = Ie(t);
    this._right !== e && (this._right = e, this.domNode.style.right = this._right);
  }
  setPaddingTop(t) {
    let e = Ie(t);
    this._paddingTop !== e && (this._paddingTop = e, this.domNode.style.paddingTop = this._paddingTop);
  }
  setPaddingLeft(t) {
    let e = Ie(t);
    this._paddingLeft !== e && (this._paddingLeft = e, this.domNode.style.paddingLeft = this._paddingLeft);
  }
  setPaddingBottom(t) {
    let e = Ie(t);
    this._paddingBottom !== e && (this._paddingBottom = e, this.domNode.style.paddingBottom = this._paddingBottom);
  }
  setPaddingRight(t) {
    let e = Ie(t);
    this._paddingRight !== e && (this._paddingRight = e, this.domNode.style.paddingRight = this._paddingRight);
  }
  setFontFamily(t) {
    this._fontFamily !== t && (this._fontFamily = t, this.domNode.style.fontFamily = this._fontFamily);
  }
  setFontWeight(t) {
    this._fontWeight !== t && (this._fontWeight = t, this.domNode.style.fontWeight = this._fontWeight);
  }
  setFontSize(t) {
    let e = Ie(t);
    this._fontSize !== e && (this._fontSize = e, this.domNode.style.fontSize = this._fontSize);
  }
  setFontStyle(t) {
    this._fontStyle !== t && (this._fontStyle = t, this.domNode.style.fontStyle = this._fontStyle);
  }
  setFontFeatureSettings(t) {
    this._fontFeatureSettings !== t && (this._fontFeatureSettings = t, this.domNode.style.fontFeatureSettings = this._fontFeatureSettings);
  }
  setFontVariationSettings(t) {
    this._fontVariationSettings !== t && (this._fontVariationSettings = t, this.domNode.style.fontVariationSettings = this._fontVariationSettings);
  }
  setTextDecoration(t) {
    this._textDecoration !== t && (this._textDecoration = t, this.domNode.style.textDecoration = this._textDecoration);
  }
  setLineHeight(t) {
    let e = Ie(t);
    this._lineHeight !== e && (this._lineHeight = e, this.domNode.style.lineHeight = this._lineHeight);
  }
  setLetterSpacing(t) {
    let e = Ie(t);
    this._letterSpacing !== e && (this._letterSpacing = e, this.domNode.style.letterSpacing = this._letterSpacing);
  }
  setClassName(t) {
    this._className !== t && (this._className = t, this.domNode.className = this._className);
  }
  toggleClassName(t, e) {
    this.domNode.classList.toggle(t, e), this._className = this.domNode.className;
  }
  setDisplay(t) {
    this._display !== t && (this._display = t, this.domNode.style.display = this._display);
  }
  setPosition(t) {
    this._position !== t && (this._position = t, this.domNode.style.position = this._position);
  }
  setVisibility(t) {
    this._visibility !== t && (this._visibility = t, this.domNode.style.visibility = this._visibility);
  }
  setColor(t) {
    this._color !== t && (this._color = t, this.domNode.style.color = this._color);
  }
  setBackgroundColor(t) {
    this._backgroundColor !== t && (this._backgroundColor = t, this.domNode.style.backgroundColor = this._backgroundColor);
  }
  setLayerHinting(t) {
    this._layerHint !== t && (this._layerHint = t, this.domNode.style.transform = this._layerHint ? "translate3d(0px, 0px, 0px)" : "");
  }
  setBoxShadow(t) {
    this._boxShadow !== t && (this._boxShadow = t, this.domNode.style.boxShadow = t);
  }
  setContain(t) {
    this._contain !== t && (this._contain = t, this.domNode.style.contain = this._contain);
  }
  setAttribute(t, e) {
    this.domNode.setAttribute(t, e);
  }
  removeAttribute(t) {
    this.domNode.removeAttribute(t);
  }
  appendChild(t) {
    this.domNode.appendChild(t.domNode);
  }
  removeChild(t) {
    this.domNode.removeChild(t.domNode);
  }
};
function Ie(s9) {
  return typeof s9 == "number" ? `${s9}px` : s9;
}
function _t(s9) {
  return new ls(s9);
}
var Wt = class {
  constructor() {
    this._hooks = new Ee;
    this._pointerMoveCallback = null;
    this._onStopCallback = null;
  }
  dispose() {
    this.stopMonitoring(false), this._hooks.dispose();
  }
  stopMonitoring(t, e) {
    if (!this.isMonitoring())
      return;
    this._hooks.clear(), this._pointerMoveCallback = null;
    let i = this._onStopCallback;
    this._onStopCallback = null, t && i && i(e);
  }
  isMonitoring() {
    return !!this._pointerMoveCallback;
  }
  startMonitoring(t, e, i, r, n) {
    this.isMonitoring() && this.stopMonitoring(false), this._pointerMoveCallback = r, this._onStopCallback = n;
    let o = t;
    try {
      t.setPointerCapture(e), this._hooks.add(C(() => {
        try {
          t.releasePointerCapture(e);
        } catch {}
      }));
    } catch {
      o = be(t);
    }
    this._hooks.add(L(o, Y.POINTER_MOVE, (l) => {
      if (l.buttons !== i) {
        this.stopMonitoring(true);
        return;
      }
      l.preventDefault(), this._pointerMoveCallback(l);
    })), this._hooks.add(L(o, Y.POINTER_UP, (l) => this.stopMonitoring(true)));
  }
};
function Wo(s9, t, e) {
  let i = null, r = null;
  if (typeof e.value == "function" ? (i = "value", r = e.value, r.length !== 0 && console.warn("Memoize should only be used in functions with zero parameters")) : typeof e.get == "function" && (i = "get", r = e.get), !r)
    throw new Error("not supported");
  let n = `$memoize$${t}`;
  e[i] = function(...o) {
    return this.hasOwnProperty(n) || Object.defineProperty(this, n, { configurable: false, enumerable: false, writable: false, value: r.apply(this, o) }), this[n];
  };
}
var He;
((n) => (n.Tap = "-xterm-gesturetap", n.Change = "-xterm-gesturechange", n.Start = "-xterm-gesturestart", n.End = "-xterm-gesturesend", n.Contextmenu = "-xterm-gesturecontextmenu"))(He ||= {});
var Q = class Q2 extends D {
  constructor() {
    super();
    this.dispatched = false;
    this.targets = new Ct;
    this.ignoreTargets = new Ct;
    this.activeTouches = {}, this.handle = null, this._lastSetTapCountTime = 0, this._register($.runAndSubscribe(No, ({ window: e, disposables: i }) => {
      i.add(L(e.document, "touchstart", (r) => this.onTouchStart(r), { passive: false })), i.add(L(e.document, "touchend", (r) => this.onTouchEnd(e, r))), i.add(L(e.document, "touchmove", (r) => this.onTouchMove(r), { passive: false }));
    }, { window: fe, disposables: this._store }));
  }
  static addTarget(e) {
    if (!Q2.isTouchDevice())
      return D.None;
    Q2.INSTANCE || (Q2.INSTANCE = Gn(new Q2));
    let i = Q2.INSTANCE.targets.push(e);
    return C(i);
  }
  static ignoreTarget(e) {
    if (!Q2.isTouchDevice())
      return D.None;
    Q2.INSTANCE || (Q2.INSTANCE = Gn(new Q2));
    let i = Q2.INSTANCE.ignoreTargets.push(e);
    return C(i);
  }
  static isTouchDevice() {
    return "ontouchstart" in fe || navigator.maxTouchPoints > 0;
  }
  dispose() {
    this.handle && (this.handle.dispose(), this.handle = null), super.dispose();
  }
  onTouchStart(e) {
    let i = Date.now();
    this.handle && (this.handle.dispose(), this.handle = null);
    for (let r = 0, n = e.targetTouches.length;r < n; r++) {
      let o = e.targetTouches.item(r);
      this.activeTouches[o.identifier] = { id: o.identifier, initialTarget: o.target, initialTimeStamp: i, initialPageX: o.pageX, initialPageY: o.pageY, rollingTimestamps: [i], rollingPageX: [o.pageX], rollingPageY: [o.pageY] };
      let l = this.newGestureEvent(He.Start, o.target);
      l.pageX = o.pageX, l.pageY = o.pageY, this.dispatchEvent(l);
    }
    this.dispatched && (e.preventDefault(), e.stopPropagation(), this.dispatched = false);
  }
  onTouchEnd(e, i) {
    let r = Date.now(), n = Object.keys(this.activeTouches).length;
    for (let o = 0, l = i.changedTouches.length;o < l; o++) {
      let a = i.changedTouches.item(o);
      if (!this.activeTouches.hasOwnProperty(String(a.identifier))) {
        console.warn("move of an UNKNOWN touch", a);
        continue;
      }
      let u = this.activeTouches[a.identifier], h = Date.now() - u.initialTimeStamp;
      if (h < Q2.HOLD_DELAY && Math.abs(u.initialPageX - Se(u.rollingPageX)) < 30 && Math.abs(u.initialPageY - Se(u.rollingPageY)) < 30) {
        let c = this.newGestureEvent(He.Tap, u.initialTarget);
        c.pageX = Se(u.rollingPageX), c.pageY = Se(u.rollingPageY), this.dispatchEvent(c);
      } else if (h >= Q2.HOLD_DELAY && Math.abs(u.initialPageX - Se(u.rollingPageX)) < 30 && Math.abs(u.initialPageY - Se(u.rollingPageY)) < 30) {
        let c = this.newGestureEvent(He.Contextmenu, u.initialTarget);
        c.pageX = Se(u.rollingPageX), c.pageY = Se(u.rollingPageY), this.dispatchEvent(c);
      } else if (n === 1) {
        let c = Se(u.rollingPageX), d = Se(u.rollingPageY), _ = Se(u.rollingTimestamps) - u.rollingTimestamps[0], p = c - u.rollingPageX[0], m = d - u.rollingPageY[0], f = [...this.targets].filter((A) => u.initialTarget instanceof Node && A.contains(u.initialTarget));
        this.inertia(e, f, r, Math.abs(p) / _, p > 0 ? 1 : -1, c, Math.abs(m) / _, m > 0 ? 1 : -1, d);
      }
      this.dispatchEvent(this.newGestureEvent(He.End, u.initialTarget)), delete this.activeTouches[a.identifier];
    }
    this.dispatched && (i.preventDefault(), i.stopPropagation(), this.dispatched = false);
  }
  newGestureEvent(e, i) {
    let r = document.createEvent("CustomEvent");
    return r.initEvent(e, false, true), r.initialTarget = i, r.tapCount = 0, r;
  }
  dispatchEvent(e) {
    if (e.type === He.Tap) {
      let i = new Date().getTime(), r = 0;
      i - this._lastSetTapCountTime > Q2.CLEAR_TAP_COUNT_TIME ? r = 1 : r = 2, this._lastSetTapCountTime = i, e.tapCount = r;
    } else
      (e.type === He.Change || e.type === He.Contextmenu) && (this._lastSetTapCountTime = 0);
    if (e.initialTarget instanceof Node) {
      for (let r of this.ignoreTargets)
        if (r.contains(e.initialTarget))
          return;
      let i = [];
      for (let r of this.targets)
        if (r.contains(e.initialTarget)) {
          let n = 0, o = e.initialTarget;
          for (;o && o !== r; )
            n++, o = o.parentElement;
          i.push([n, r]);
        }
      i.sort((r, n) => r[0] - n[0]);
      for (let [r, n] of i)
        n.dispatchEvent(e), this.dispatched = true;
    }
  }
  inertia(e, i, r, n, o, l, a, u, h) {
    this.handle = mt(e, () => {
      let c = Date.now(), d = c - r, _ = 0, p = 0, m = true;
      n += Q2.SCROLL_FRICTION * d, a += Q2.SCROLL_FRICTION * d, n > 0 && (m = false, _ = o * n * d), a > 0 && (m = false, p = u * a * d);
      let f = this.newGestureEvent(He.Change);
      f.translationX = _, f.translationY = p, i.forEach((A) => A.dispatchEvent(f)), m || this.inertia(e, i, c, n, o, l + _, a, u, h + p);
    });
  }
  onTouchMove(e) {
    let i = Date.now();
    for (let r = 0, n = e.changedTouches.length;r < n; r++) {
      let o = e.changedTouches.item(r);
      if (!this.activeTouches.hasOwnProperty(String(o.identifier))) {
        console.warn("end of an UNKNOWN touch", o);
        continue;
      }
      let l = this.activeTouches[o.identifier], a = this.newGestureEvent(He.Change, l.initialTarget);
      a.translationX = o.pageX - Se(l.rollingPageX), a.translationY = o.pageY - Se(l.rollingPageY), a.pageX = o.pageX, a.pageY = o.pageY, this.dispatchEvent(a), l.rollingPageX.length > 3 && (l.rollingPageX.shift(), l.rollingPageY.shift(), l.rollingTimestamps.shift()), l.rollingPageX.push(o.pageX), l.rollingPageY.push(o.pageY), l.rollingTimestamps.push(i);
    }
    this.dispatched && (e.preventDefault(), e.stopPropagation(), this.dispatched = false);
  }
};
Q.SCROLL_FRICTION = -0.005, Q.HOLD_DELAY = 700, Q.CLEAR_TAP_COUNT_TIME = 400, M([Wo], Q, "isTouchDevice", 1);
var Pr = Q;
var lt = class extends D {
  onclick(t, e) {
    this._register(L(t, Y.CLICK, (i) => e(new qe(be(t), i))));
  }
  onmousedown(t, e) {
    this._register(L(t, Y.MOUSE_DOWN, (i) => e(new qe(be(t), i))));
  }
  onmouseover(t, e) {
    this._register(L(t, Y.MOUSE_OVER, (i) => e(new qe(be(t), i))));
  }
  onmouseleave(t, e) {
    this._register(L(t, Y.MOUSE_LEAVE, (i) => e(new qe(be(t), i))));
  }
  onkeydown(t, e) {
    this._register(L(t, Y.KEY_DOWN, (i) => e(new ft(i))));
  }
  onkeyup(t, e) {
    this._register(L(t, Y.KEY_UP, (i) => e(new ft(i))));
  }
  oninput(t, e) {
    this._register(L(t, Y.INPUT, e));
  }
  onblur(t, e) {
    this._register(L(t, Y.BLUR, e));
  }
  onfocus(t, e) {
    this._register(L(t, Y.FOCUS, e));
  }
  onchange(t, e) {
    this._register(L(t, Y.CHANGE, e));
  }
  ignoreGesture(t) {
    return Pr.ignoreTarget(t);
  }
};
var Uo = 11;
var Or = class extends lt {
  constructor(t) {
    super(), this._onActivate = t.onActivate, this.bgDomNode = document.createElement("div"), this.bgDomNode.className = "arrow-background", this.bgDomNode.style.position = "absolute", this.bgDomNode.style.width = t.bgWidth + "px", this.bgDomNode.style.height = t.bgHeight + "px", typeof t.top < "u" && (this.bgDomNode.style.top = "0px"), typeof t.left < "u" && (this.bgDomNode.style.left = "0px"), typeof t.bottom < "u" && (this.bgDomNode.style.bottom = "0px"), typeof t.right < "u" && (this.bgDomNode.style.right = "0px"), this.domNode = document.createElement("div"), this.domNode.className = t.className, this.domNode.style.position = "absolute", this.domNode.style.width = Uo + "px", this.domNode.style.height = Uo + "px", typeof t.top < "u" && (this.domNode.style.top = t.top + "px"), typeof t.left < "u" && (this.domNode.style.left = t.left + "px"), typeof t.bottom < "u" && (this.domNode.style.bottom = t.bottom + "px"), typeof t.right < "u" && (this.domNode.style.right = t.right + "px"), this._pointerMoveMonitor = this._register(new Wt), this._register(os(this.bgDomNode, Y.POINTER_DOWN, (e) => this._arrowPointerDown(e))), this._register(os(this.domNode, Y.POINTER_DOWN, (e) => this._arrowPointerDown(e))), this._pointerdownRepeatTimer = this._register(new Mr), this._pointerdownScheduleRepeatTimer = this._register(new Ye);
  }
  _arrowPointerDown(t) {
    if (!t.target || !(t.target instanceof Element))
      return;
    let e = () => {
      this._pointerdownRepeatTimer.cancelAndSet(() => this._onActivate(), 1000 / 24, be(t));
    };
    this._onActivate(), this._pointerdownRepeatTimer.cancel(), this._pointerdownScheduleRepeatTimer.cancelAndSet(e, 200), this._pointerMoveMonitor.startMonitoring(t.target, t.pointerId, t.buttons, (i) => {}, () => {
      this._pointerdownRepeatTimer.cancel(), this._pointerdownScheduleRepeatTimer.cancel();
    }), t.preventDefault();
  }
};
var cs = class s9 {
  constructor(t, e, i, r, n, o, l) {
    this._forceIntegerValues = t;
    this._scrollStateBrand = undefined;
    this._forceIntegerValues && (e = e | 0, i = i | 0, r = r | 0, n = n | 0, o = o | 0, l = l | 0), this.rawScrollLeft = r, this.rawScrollTop = l, e < 0 && (e = 0), r + e > i && (r = i - e), r < 0 && (r = 0), n < 0 && (n = 0), l + n > o && (l = o - n), l < 0 && (l = 0), this.width = e, this.scrollWidth = i, this.scrollLeft = r, this.height = n, this.scrollHeight = o, this.scrollTop = l;
  }
  equals(t) {
    return this.rawScrollLeft === t.rawScrollLeft && this.rawScrollTop === t.rawScrollTop && this.width === t.width && this.scrollWidth === t.scrollWidth && this.scrollLeft === t.scrollLeft && this.height === t.height && this.scrollHeight === t.scrollHeight && this.scrollTop === t.scrollTop;
  }
  withScrollDimensions(t, e) {
    return new s9(this._forceIntegerValues, typeof t.width < "u" ? t.width : this.width, typeof t.scrollWidth < "u" ? t.scrollWidth : this.scrollWidth, e ? this.rawScrollLeft : this.scrollLeft, typeof t.height < "u" ? t.height : this.height, typeof t.scrollHeight < "u" ? t.scrollHeight : this.scrollHeight, e ? this.rawScrollTop : this.scrollTop);
  }
  withScrollPosition(t) {
    return new s9(this._forceIntegerValues, this.width, this.scrollWidth, typeof t.scrollLeft < "u" ? t.scrollLeft : this.rawScrollLeft, this.height, this.scrollHeight, typeof t.scrollTop < "u" ? t.scrollTop : this.rawScrollTop);
  }
  createScrollEvent(t, e) {
    let i = this.width !== t.width, r = this.scrollWidth !== t.scrollWidth, n = this.scrollLeft !== t.scrollLeft, o = this.height !== t.height, l = this.scrollHeight !== t.scrollHeight, a = this.scrollTop !== t.scrollTop;
    return { inSmoothScrolling: e, oldWidth: t.width, oldScrollWidth: t.scrollWidth, oldScrollLeft: t.scrollLeft, width: this.width, scrollWidth: this.scrollWidth, scrollLeft: this.scrollLeft, oldHeight: t.height, oldScrollHeight: t.scrollHeight, oldScrollTop: t.scrollTop, height: this.height, scrollHeight: this.scrollHeight, scrollTop: this.scrollTop, widthChanged: i, scrollWidthChanged: r, scrollLeftChanged: n, heightChanged: o, scrollHeightChanged: l, scrollTopChanged: a };
  }
};
var Ri = class extends D {
  constructor(e) {
    super();
    this._scrollableBrand = undefined;
    this._onScroll = this._register(new v);
    this.onScroll = this._onScroll.event;
    this._smoothScrollDuration = e.smoothScrollDuration, this._scheduleAtNextAnimationFrame = e.scheduleAtNextAnimationFrame, this._state = new cs(e.forceIntegerValues, 0, 0, 0, 0, 0, 0), this._smoothScrolling = null;
  }
  dispose() {
    this._smoothScrolling && (this._smoothScrolling.dispose(), this._smoothScrolling = null), super.dispose();
  }
  setSmoothScrollDuration(e) {
    this._smoothScrollDuration = e;
  }
  validateScrollPosition(e) {
    return this._state.withScrollPosition(e);
  }
  getScrollDimensions() {
    return this._state;
  }
  setScrollDimensions(e, i) {
    let r = this._state.withScrollDimensions(e, i);
    this._setState(r, !!this._smoothScrolling), this._smoothScrolling?.acceptScrollDimensions(this._state);
  }
  getFutureScrollPosition() {
    return this._smoothScrolling ? this._smoothScrolling.to : this._state;
  }
  getCurrentScrollPosition() {
    return this._state;
  }
  setScrollPositionNow(e) {
    let i = this._state.withScrollPosition(e);
    this._smoothScrolling && (this._smoothScrolling.dispose(), this._smoothScrolling = null), this._setState(i, false);
  }
  setScrollPositionSmooth(e, i) {
    if (this._smoothScrollDuration === 0)
      return this.setScrollPositionNow(e);
    if (this._smoothScrolling) {
      e = { scrollLeft: typeof e.scrollLeft > "u" ? this._smoothScrolling.to.scrollLeft : e.scrollLeft, scrollTop: typeof e.scrollTop > "u" ? this._smoothScrolling.to.scrollTop : e.scrollTop };
      let r = this._state.withScrollPosition(e);
      if (this._smoothScrolling.to.scrollLeft === r.scrollLeft && this._smoothScrolling.to.scrollTop === r.scrollTop)
        return;
      let n;
      i ? n = new Nr(this._smoothScrolling.from, r, this._smoothScrolling.startTime, this._smoothScrolling.duration) : n = this._smoothScrolling.combine(this._state, r, this._smoothScrollDuration), this._smoothScrolling.dispose(), this._smoothScrolling = n;
    } else {
      let r = this._state.withScrollPosition(e);
      this._smoothScrolling = Nr.start(this._state, r, this._smoothScrollDuration);
    }
    this._smoothScrolling.animationFrameDisposable = this._scheduleAtNextAnimationFrame(() => {
      this._smoothScrolling && (this._smoothScrolling.animationFrameDisposable = null, this._performSmoothScrolling());
    });
  }
  hasPendingScrollAnimation() {
    return !!this._smoothScrolling;
  }
  _performSmoothScrolling() {
    if (!this._smoothScrolling)
      return;
    let e = this._smoothScrolling.tick(), i = this._state.withScrollPosition(e);
    if (this._setState(i, true), !!this._smoothScrolling) {
      if (e.isDone) {
        this._smoothScrolling.dispose(), this._smoothScrolling = null;
        return;
      }
      this._smoothScrolling.animationFrameDisposable = this._scheduleAtNextAnimationFrame(() => {
        this._smoothScrolling && (this._smoothScrolling.animationFrameDisposable = null, this._performSmoothScrolling());
      });
    }
  }
  _setState(e, i) {
    let r = this._state;
    r.equals(e) || (this._state = e, this._onScroll.fire(this._state.createScrollEvent(r, i)));
  }
};
var Br = class {
  constructor(t, e, i) {
    this.scrollLeft = t, this.scrollTop = e, this.isDone = i;
  }
};
function as(s10, t) {
  let e = t - s10;
  return function(i) {
    return s10 + e * ka(i);
  };
}
function La(s10, t, e) {
  return function(i) {
    return i < e ? s10(i / e) : t((i - e) / (1 - e));
  };
}
var Nr = class s10 {
  constructor(t, e, i, r) {
    this.from = t, this.to = e, this.duration = r, this.startTime = i, this.animationFrameDisposable = null, this._initAnimations();
  }
  _initAnimations() {
    this.scrollLeft = this._initAnimation(this.from.scrollLeft, this.to.scrollLeft, this.to.width), this.scrollTop = this._initAnimation(this.from.scrollTop, this.to.scrollTop, this.to.height);
  }
  _initAnimation(t, e, i) {
    if (Math.abs(t - e) > 2.5 * i) {
      let n, o;
      return t < e ? (n = t + 0.75 * i, o = e - 0.75 * i) : (n = t - 0.75 * i, o = e + 0.75 * i), La(as(t, n), as(o, e), 0.33);
    }
    return as(t, e);
  }
  dispose() {
    this.animationFrameDisposable !== null && (this.animationFrameDisposable.dispose(), this.animationFrameDisposable = null);
  }
  acceptScrollDimensions(t) {
    this.to = t.withScrollPosition(this.to), this._initAnimations();
  }
  tick() {
    return this._tick(Date.now());
  }
  _tick(t) {
    let e = (t - this.startTime) / this.duration;
    if (e < 1) {
      let i = this.scrollLeft(e), r = this.scrollTop(e);
      return new Br(i, r, false);
    }
    return new Br(this.to.scrollLeft, this.to.scrollTop, true);
  }
  combine(t, e, i) {
    return s10.start(t, e, i);
  }
  static start(t, e, i) {
    i = i + 10;
    let r = Date.now() - 10;
    return new s10(t, e, r, i);
  }
};
function Aa(s11) {
  return Math.pow(s11, 3);
}
function ka(s11) {
  return 1 - Aa(1 - s11);
}
var Fr = class extends D {
  constructor(t, e, i) {
    super(), this._visibility = t, this._visibleClassName = e, this._invisibleClassName = i, this._domNode = null, this._isVisible = false, this._isNeeded = false, this._rawShouldBeVisible = false, this._shouldBeVisible = false, this._revealTimer = this._register(new Ye);
  }
  setVisibility(t) {
    this._visibility !== t && (this._visibility = t, this._updateShouldBeVisible());
  }
  setShouldBeVisible(t) {
    this._rawShouldBeVisible = t, this._updateShouldBeVisible();
  }
  _applyVisibilitySetting() {
    return this._visibility === 2 ? false : this._visibility === 3 ? true : this._rawShouldBeVisible;
  }
  _updateShouldBeVisible() {
    let t = this._applyVisibilitySetting();
    this._shouldBeVisible !== t && (this._shouldBeVisible = t, this.ensureVisibility());
  }
  setIsNeeded(t) {
    this._isNeeded !== t && (this._isNeeded = t, this.ensureVisibility());
  }
  setDomNode(t) {
    this._domNode = t, this._domNode.setClassName(this._invisibleClassName), this.setShouldBeVisible(false);
  }
  ensureVisibility() {
    if (!this._isNeeded) {
      this._hide(false);
      return;
    }
    this._shouldBeVisible ? this._reveal() : this._hide(true);
  }
  _reveal() {
    this._isVisible || (this._isVisible = true, this._revealTimer.setIfNotSet(() => {
      this._domNode?.setClassName(this._visibleClassName);
    }, 0));
  }
  _hide(t) {
    this._revealTimer.cancel(), this._isVisible && (this._isVisible = false, this._domNode?.setClassName(this._invisibleClassName + (t ? " fade" : "")));
  }
};
var Ca = 140;
var Ut = class extends lt {
  constructor(t) {
    super(), this._lazyRender = t.lazyRender, this._host = t.host, this._scrollable = t.scrollable, this._scrollByPage = t.scrollByPage, this._scrollbarState = t.scrollbarState, this._visibilityController = this._register(new Fr(t.visibility, "visible scrollbar " + t.extraScrollbarClassName, "invisible scrollbar " + t.extraScrollbarClassName)), this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded()), this._pointerMoveMonitor = this._register(new Wt), this._shouldRender = true, this.domNode = _t(document.createElement("div")), this.domNode.setAttribute("role", "presentation"), this.domNode.setAttribute("aria-hidden", "true"), this._visibilityController.setDomNode(this.domNode), this.domNode.setPosition("absolute"), this._register(L(this.domNode.domNode, Y.POINTER_DOWN, (e) => this._domNodePointerDown(e)));
  }
  _createArrow(t) {
    let e = this._register(new Or(t));
    this.domNode.domNode.appendChild(e.bgDomNode), this.domNode.domNode.appendChild(e.domNode);
  }
  _createSlider(t, e, i, r) {
    this.slider = _t(document.createElement("div")), this.slider.setClassName("slider"), this.slider.setPosition("absolute"), this.slider.setTop(t), this.slider.setLeft(e), typeof i == "number" && this.slider.setWidth(i), typeof r == "number" && this.slider.setHeight(r), this.slider.setLayerHinting(true), this.slider.setContain("strict"), this.domNode.domNode.appendChild(this.slider.domNode), this._register(L(this.slider.domNode, Y.POINTER_DOWN, (n) => {
      n.button === 0 && (n.preventDefault(), this._sliderPointerDown(n));
    })), this.onclick(this.slider.domNode, (n) => {
      n.leftButton && n.stopPropagation();
    });
  }
  _onElementSize(t) {
    return this._scrollbarState.setVisibleSize(t) && (this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded()), this._shouldRender = true, this._lazyRender || this.render()), this._shouldRender;
  }
  _onElementScrollSize(t) {
    return this._scrollbarState.setScrollSize(t) && (this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded()), this._shouldRender = true, this._lazyRender || this.render()), this._shouldRender;
  }
  _onElementScrollPosition(t) {
    return this._scrollbarState.setScrollPosition(t) && (this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded()), this._shouldRender = true, this._lazyRender || this.render()), this._shouldRender;
  }
  beginReveal() {
    this._visibilityController.setShouldBeVisible(true);
  }
  beginHide() {
    this._visibilityController.setShouldBeVisible(false);
  }
  render() {
    this._shouldRender && (this._shouldRender = false, this._renderDomNode(this._scrollbarState.getRectangleLargeSize(), this._scrollbarState.getRectangleSmallSize()), this._updateSlider(this._scrollbarState.getSliderSize(), this._scrollbarState.getArrowSize() + this._scrollbarState.getSliderPosition()));
  }
  _domNodePointerDown(t) {
    t.target === this.domNode.domNode && this._onPointerDown(t);
  }
  delegatePointerDown(t) {
    let e = this.domNode.domNode.getClientRects()[0].top, i = e + this._scrollbarState.getSliderPosition(), r = e + this._scrollbarState.getSliderPosition() + this._scrollbarState.getSliderSize(), n = this._sliderPointerPosition(t);
    i <= n && n <= r ? t.button === 0 && (t.preventDefault(), this._sliderPointerDown(t)) : this._onPointerDown(t);
  }
  _onPointerDown(t) {
    let e, i;
    if (t.target === this.domNode.domNode && typeof t.offsetX == "number" && typeof t.offsetY == "number")
      e = t.offsetX, i = t.offsetY;
    else {
      let n = Fo(this.domNode.domNode);
      e = t.pageX - n.left, i = t.pageY - n.top;
    }
    let r = this._pointerDownRelativePosition(e, i);
    this._setDesiredScrollPositionNow(this._scrollByPage ? this._scrollbarState.getDesiredScrollPositionFromOffsetPaged(r) : this._scrollbarState.getDesiredScrollPositionFromOffset(r)), t.button === 0 && (t.preventDefault(), this._sliderPointerDown(t));
  }
  _sliderPointerDown(t) {
    if (!t.target || !(t.target instanceof Element))
      return;
    let e = this._sliderPointerPosition(t), i = this._sliderOrthogonalPointerPosition(t), r = this._scrollbarState.clone();
    this.slider.toggleClassName("active", true), this._pointerMoveMonitor.startMonitoring(t.target, t.pointerId, t.buttons, (n) => {
      let o = this._sliderOrthogonalPointerPosition(n), l = Math.abs(o - i);
      if (wr && l > Ca) {
        this._setDesiredScrollPositionNow(r.getScrollPosition());
        return;
      }
      let u = this._sliderPointerPosition(n) - e;
      this._setDesiredScrollPositionNow(r.getDesiredScrollPositionFromDelta(u));
    }, () => {
      this.slider.toggleClassName("active", false), this._host.onDragEnd();
    }), this._host.onDragStart();
  }
  _setDesiredScrollPositionNow(t) {
    let e = {};
    this.writeScrollPosition(e, t), this._scrollable.setScrollPositionNow(e);
  }
  updateScrollbarSize(t) {
    this._updateScrollbarSize(t), this._scrollbarState.setScrollbarSize(t), this._shouldRender = true, this._lazyRender || this.render();
  }
  isNeeded() {
    return this._scrollbarState.isNeeded();
  }
};
var Kt = class s11 {
  constructor(t, e, i, r, n, o) {
    this._scrollbarSize = Math.round(e), this._oppositeScrollbarSize = Math.round(i), this._arrowSize = Math.round(t), this._visibleSize = r, this._scrollSize = n, this._scrollPosition = o, this._computedAvailableSize = 0, this._computedIsNeeded = false, this._computedSliderSize = 0, this._computedSliderRatio = 0, this._computedSliderPosition = 0, this._refreshComputedValues();
  }
  clone() {
    return new s11(this._arrowSize, this._scrollbarSize, this._oppositeScrollbarSize, this._visibleSize, this._scrollSize, this._scrollPosition);
  }
  setVisibleSize(t) {
    let e = Math.round(t);
    return this._visibleSize !== e ? (this._visibleSize = e, this._refreshComputedValues(), true) : false;
  }
  setScrollSize(t) {
    let e = Math.round(t);
    return this._scrollSize !== e ? (this._scrollSize = e, this._refreshComputedValues(), true) : false;
  }
  setScrollPosition(t) {
    let e = Math.round(t);
    return this._scrollPosition !== e ? (this._scrollPosition = e, this._refreshComputedValues(), true) : false;
  }
  setScrollbarSize(t) {
    this._scrollbarSize = Math.round(t);
  }
  setOppositeScrollbarSize(t) {
    this._oppositeScrollbarSize = Math.round(t);
  }
  static _computeValues(t, e, i, r, n) {
    let o = Math.max(0, i - t), l = Math.max(0, o - 2 * e), a = r > 0 && r > i;
    if (!a)
      return { computedAvailableSize: Math.round(o), computedIsNeeded: a, computedSliderSize: Math.round(l), computedSliderRatio: 0, computedSliderPosition: 0 };
    let u = Math.round(Math.max(20, Math.floor(i * l / r))), h = (l - u) / (r - i), c = n * h;
    return { computedAvailableSize: Math.round(o), computedIsNeeded: a, computedSliderSize: Math.round(u), computedSliderRatio: h, computedSliderPosition: Math.round(c) };
  }
  _refreshComputedValues() {
    let t = s11._computeValues(this._oppositeScrollbarSize, this._arrowSize, this._visibleSize, this._scrollSize, this._scrollPosition);
    this._computedAvailableSize = t.computedAvailableSize, this._computedIsNeeded = t.computedIsNeeded, this._computedSliderSize = t.computedSliderSize, this._computedSliderRatio = t.computedSliderRatio, this._computedSliderPosition = t.computedSliderPosition;
  }
  getArrowSize() {
    return this._arrowSize;
  }
  getScrollPosition() {
    return this._scrollPosition;
  }
  getRectangleLargeSize() {
    return this._computedAvailableSize;
  }
  getRectangleSmallSize() {
    return this._scrollbarSize;
  }
  isNeeded() {
    return this._computedIsNeeded;
  }
  getSliderSize() {
    return this._computedSliderSize;
  }
  getSliderPosition() {
    return this._computedSliderPosition;
  }
  getDesiredScrollPositionFromOffset(t) {
    if (!this._computedIsNeeded)
      return 0;
    let e = t - this._arrowSize - this._computedSliderSize / 2;
    return Math.round(e / this._computedSliderRatio);
  }
  getDesiredScrollPositionFromOffsetPaged(t) {
    if (!this._computedIsNeeded)
      return 0;
    let e = t - this._arrowSize, i = this._scrollPosition;
    return e < this._computedSliderPosition ? i -= this._visibleSize : i += this._visibleSize, i;
  }
  getDesiredScrollPositionFromDelta(t) {
    if (!this._computedIsNeeded)
      return 0;
    let e = this._computedSliderPosition + t;
    return Math.round(e / this._computedSliderRatio);
  }
};
var Wr = class extends Ut {
  constructor(t, e, i) {
    let r = t.getScrollDimensions(), n = t.getCurrentScrollPosition();
    if (super({ lazyRender: e.lazyRender, host: i, scrollbarState: new Kt(e.horizontalHasArrows ? e.arrowSize : 0, e.horizontal === 2 ? 0 : e.horizontalScrollbarSize, e.vertical === 2 ? 0 : e.verticalScrollbarSize, r.width, r.scrollWidth, n.scrollLeft), visibility: e.horizontal, extraScrollbarClassName: "horizontal", scrollable: t, scrollByPage: e.scrollByPage }), e.horizontalHasArrows)
      throw new Error("horizontalHasArrows is not supported in xterm.js");
    this._createSlider(Math.floor((e.horizontalScrollbarSize - e.horizontalSliderSize) / 2), 0, undefined, e.horizontalSliderSize);
  }
  _updateSlider(t, e) {
    this.slider.setWidth(t), this.slider.setLeft(e);
  }
  _renderDomNode(t, e) {
    this.domNode.setWidth(t), this.domNode.setHeight(e), this.domNode.setLeft(0), this.domNode.setBottom(0);
  }
  onDidScroll(t) {
    return this._shouldRender = this._onElementScrollSize(t.scrollWidth) || this._shouldRender, this._shouldRender = this._onElementScrollPosition(t.scrollLeft) || this._shouldRender, this._shouldRender = this._onElementSize(t.width) || this._shouldRender, this._shouldRender;
  }
  _pointerDownRelativePosition(t, e) {
    return t;
  }
  _sliderPointerPosition(t) {
    return t.pageX;
  }
  _sliderOrthogonalPointerPosition(t) {
    return t.pageY;
  }
  _updateScrollbarSize(t) {
    this.slider.setHeight(t);
  }
  writeScrollPosition(t, e) {
    t.scrollLeft = e;
  }
  updateOptions(t) {
    this.updateScrollbarSize(t.horizontal === 2 ? 0 : t.horizontalScrollbarSize), this._scrollbarState.setOppositeScrollbarSize(t.vertical === 2 ? 0 : t.verticalScrollbarSize), this._visibilityController.setVisibility(t.horizontal), this._scrollByPage = t.scrollByPage;
  }
};
var Ur = class extends Ut {
  constructor(t, e, i) {
    let r = t.getScrollDimensions(), n = t.getCurrentScrollPosition();
    if (super({ lazyRender: e.lazyRender, host: i, scrollbarState: new Kt(e.verticalHasArrows ? e.arrowSize : 0, e.vertical === 2 ? 0 : e.verticalScrollbarSize, 0, r.height, r.scrollHeight, n.scrollTop), visibility: e.vertical, extraScrollbarClassName: "vertical", scrollable: t, scrollByPage: e.scrollByPage }), e.verticalHasArrows)
      throw new Error("horizontalHasArrows is not supported in xterm.js");
    this._createSlider(0, Math.floor((e.verticalScrollbarSize - e.verticalSliderSize) / 2), e.verticalSliderSize, undefined);
  }
  _updateSlider(t, e) {
    this.slider.setHeight(t), this.slider.setTop(e);
  }
  _renderDomNode(t, e) {
    this.domNode.setWidth(e), this.domNode.setHeight(t), this.domNode.setRight(0), this.domNode.setTop(0);
  }
  onDidScroll(t) {
    return this._shouldRender = this._onElementScrollSize(t.scrollHeight) || this._shouldRender, this._shouldRender = this._onElementScrollPosition(t.scrollTop) || this._shouldRender, this._shouldRender = this._onElementSize(t.height) || this._shouldRender, this._shouldRender;
  }
  _pointerDownRelativePosition(t, e) {
    return e;
  }
  _sliderPointerPosition(t) {
    return t.pageY;
  }
  _sliderOrthogonalPointerPosition(t) {
    return t.pageX;
  }
  _updateScrollbarSize(t) {
    this.slider.setWidth(t);
  }
  writeScrollPosition(t, e) {
    t.scrollTop = e;
  }
  updateOptions(t) {
    this.updateScrollbarSize(t.vertical === 2 ? 0 : t.verticalScrollbarSize), this._scrollbarState.setOppositeScrollbarSize(0), this._visibilityController.setVisibility(t.vertical), this._scrollByPage = t.scrollByPage;
  }
};
var Ma = 500;
var Ko = 50;
var zo = true;
var us = class {
  constructor(t, e, i) {
    this.timestamp = t, this.deltaX = e, this.deltaY = i, this.score = 0;
  }
};
var zr = class zr2 {
  constructor() {
    this._capacity = 5, this._memory = [], this._front = -1, this._rear = -1;
  }
  isPhysicalMouseWheel() {
    if (this._front === -1 && this._rear === -1)
      return false;
    let t = 1, e = 0, i = 1, r = this._rear;
    do {
      let n = r === this._front ? t : Math.pow(2, -i);
      if (t -= n, e += this._memory[r].score * n, r === this._front)
        break;
      r = (this._capacity + r - 1) % this._capacity, i++;
    } while (true);
    return e <= 0.5;
  }
  acceptStandardWheelEvent(t) {
    if (Ti) {
      let e = be(t.browserEvent), i = mo(e);
      this.accept(Date.now(), t.deltaX * i, t.deltaY * i);
    } else
      this.accept(Date.now(), t.deltaX, t.deltaY);
  }
  accept(t, e, i) {
    let r = null, n = new us(t, e, i);
    this._front === -1 && this._rear === -1 ? (this._memory[0] = n, this._front = 0, this._rear = 0) : (r = this._memory[this._rear], this._rear = (this._rear + 1) % this._capacity, this._rear === this._front && (this._front = (this._front + 1) % this._capacity), this._memory[this._rear] = n), n.score = this._computeScore(n, r);
  }
  _computeScore(t, e) {
    if (Math.abs(t.deltaX) > 0 && Math.abs(t.deltaY) > 0)
      return 1;
    let i = 0.5;
    if ((!this._isAlmostInt(t.deltaX) || !this._isAlmostInt(t.deltaY)) && (i += 0.25), e) {
      let r = Math.abs(t.deltaX), n = Math.abs(t.deltaY), o = Math.abs(e.deltaX), l = Math.abs(e.deltaY), a = Math.max(Math.min(r, o), 1), u = Math.max(Math.min(n, l), 1), h = Math.max(r, o), c = Math.max(n, l);
      h % a === 0 && c % u === 0 && (i -= 0.5);
    }
    return Math.min(Math.max(i, 0), 1);
  }
  _isAlmostInt(t) {
    return Math.abs(Math.round(t) - t) < 0.01;
  }
};
zr.INSTANCE = new zr;
var hs = zr;
var ds = class extends lt {
  constructor(e, i, r) {
    super();
    this._onScroll = this._register(new v);
    this.onScroll = this._onScroll.event;
    this._onWillScroll = this._register(new v);
    this.onWillScroll = this._onWillScroll.event;
    this._options = Pa(i), this._scrollable = r, this._register(this._scrollable.onScroll((o) => {
      this._onWillScroll.fire(o), this._onDidScroll(o), this._onScroll.fire(o);
    }));
    let n = { onMouseWheel: (o) => this._onMouseWheel(o), onDragStart: () => this._onDragStart(), onDragEnd: () => this._onDragEnd() };
    this._verticalScrollbar = this._register(new Ur(this._scrollable, this._options, n)), this._horizontalScrollbar = this._register(new Wr(this._scrollable, this._options, n)), this._domNode = document.createElement("div"), this._domNode.className = "xterm-scrollable-element " + this._options.className, this._domNode.setAttribute("role", "presentation"), this._domNode.style.position = "relative", this._domNode.appendChild(e), this._domNode.appendChild(this._horizontalScrollbar.domNode.domNode), this._domNode.appendChild(this._verticalScrollbar.domNode.domNode), this._options.useShadows ? (this._leftShadowDomNode = _t(document.createElement("div")), this._leftShadowDomNode.setClassName("shadow"), this._domNode.appendChild(this._leftShadowDomNode.domNode), this._topShadowDomNode = _t(document.createElement("div")), this._topShadowDomNode.setClassName("shadow"), this._domNode.appendChild(this._topShadowDomNode.domNode), this._topLeftShadowDomNode = _t(document.createElement("div")), this._topLeftShadowDomNode.setClassName("shadow"), this._domNode.appendChild(this._topLeftShadowDomNode.domNode)) : (this._leftShadowDomNode = null, this._topShadowDomNode = null, this._topLeftShadowDomNode = null), this._listenOnDomNode = this._options.listenOnDomNode || this._domNode, this._mouseWheelToDispose = [], this._setListeningToMouseWheel(this._options.handleMouseWheel), this.onmouseover(this._listenOnDomNode, (o) => this._onMouseOver(o)), this.onmouseleave(this._listenOnDomNode, (o) => this._onMouseLeave(o)), this._hideTimeout = this._register(new Ye), this._isDragging = false, this._mouseIsOver = false, this._shouldRender = true, this._revealOnScroll = true;
  }
  get options() {
    return this._options;
  }
  dispose() {
    this._mouseWheelToDispose = Ne(this._mouseWheelToDispose), super.dispose();
  }
  getDomNode() {
    return this._domNode;
  }
  getOverviewRulerLayoutInfo() {
    return { parent: this._domNode, insertBefore: this._verticalScrollbar.domNode.domNode };
  }
  delegateVerticalScrollbarPointerDown(e) {
    this._verticalScrollbar.delegatePointerDown(e);
  }
  getScrollDimensions() {
    return this._scrollable.getScrollDimensions();
  }
  setScrollDimensions(e) {
    this._scrollable.setScrollDimensions(e, false);
  }
  updateClassName(e) {
    this._options.className = e, Te && (this._options.className += " mac"), this._domNode.className = "xterm-scrollable-element " + this._options.className;
  }
  updateOptions(e) {
    typeof e.handleMouseWheel < "u" && (this._options.handleMouseWheel = e.handleMouseWheel, this._setListeningToMouseWheel(this._options.handleMouseWheel)), typeof e.mouseWheelScrollSensitivity < "u" && (this._options.mouseWheelScrollSensitivity = e.mouseWheelScrollSensitivity), typeof e.fastScrollSensitivity < "u" && (this._options.fastScrollSensitivity = e.fastScrollSensitivity), typeof e.scrollPredominantAxis < "u" && (this._options.scrollPredominantAxis = e.scrollPredominantAxis), typeof e.horizontal < "u" && (this._options.horizontal = e.horizontal), typeof e.vertical < "u" && (this._options.vertical = e.vertical), typeof e.horizontalScrollbarSize < "u" && (this._options.horizontalScrollbarSize = e.horizontalScrollbarSize), typeof e.verticalScrollbarSize < "u" && (this._options.verticalScrollbarSize = e.verticalScrollbarSize), typeof e.scrollByPage < "u" && (this._options.scrollByPage = e.scrollByPage), this._horizontalScrollbar.updateOptions(this._options), this._verticalScrollbar.updateOptions(this._options), this._options.lazyRender || this._render();
  }
  setRevealOnScroll(e) {
    this._revealOnScroll = e;
  }
  delegateScrollFromMouseWheelEvent(e) {
    this._onMouseWheel(new xi(e));
  }
  _setListeningToMouseWheel(e) {
    if (this._mouseWheelToDispose.length > 0 !== e && (this._mouseWheelToDispose = Ne(this._mouseWheelToDispose), e)) {
      let r = (n) => {
        this._onMouseWheel(new xi(n));
      };
      this._mouseWheelToDispose.push(L(this._listenOnDomNode, Y.MOUSE_WHEEL, r, { passive: false }));
    }
  }
  _onMouseWheel(e) {
    if (e.browserEvent?.defaultPrevented)
      return;
    let i = hs.INSTANCE;
    zo && i.acceptStandardWheelEvent(e);
    let r = false;
    if (e.deltaY || e.deltaX) {
      let o = e.deltaY * this._options.mouseWheelScrollSensitivity, l = e.deltaX * this._options.mouseWheelScrollSensitivity;
      this._options.scrollPredominantAxis && (this._options.scrollYToX && l + o === 0 ? l = o = 0 : Math.abs(o) >= Math.abs(l) ? l = 0 : o = 0), this._options.flipAxes && ([o, l] = [l, o]);
      let a = !Te && e.browserEvent && e.browserEvent.shiftKey;
      (this._options.scrollYToX || a) && !l && (l = o, o = 0), e.browserEvent && e.browserEvent.altKey && (l = l * this._options.fastScrollSensitivity, o = o * this._options.fastScrollSensitivity);
      let u = this._scrollable.getFutureScrollPosition(), h = {};
      if (o) {
        let c = Ko * o, d = u.scrollTop - (c < 0 ? Math.floor(c) : Math.ceil(c));
        this._verticalScrollbar.writeScrollPosition(h, d);
      }
      if (l) {
        let c = Ko * l, d = u.scrollLeft - (c < 0 ? Math.floor(c) : Math.ceil(c));
        this._horizontalScrollbar.writeScrollPosition(h, d);
      }
      h = this._scrollable.validateScrollPosition(h), (u.scrollLeft !== h.scrollLeft || u.scrollTop !== h.scrollTop) && (zo && this._options.mouseWheelSmoothScroll && i.isPhysicalMouseWheel() ? this._scrollable.setScrollPositionSmooth(h) : this._scrollable.setScrollPositionNow(h), r = true);
    }
    let n = r;
    !n && this._options.alwaysConsumeMouseWheel && (n = true), !n && this._options.consumeMouseWheelIfScrollbarIsNeeded && (this._verticalScrollbar.isNeeded() || this._horizontalScrollbar.isNeeded()) && (n = true), n && (e.preventDefault(), e.stopPropagation());
  }
  _onDidScroll(e) {
    this._shouldRender = this._horizontalScrollbar.onDidScroll(e) || this._shouldRender, this._shouldRender = this._verticalScrollbar.onDidScroll(e) || this._shouldRender, this._options.useShadows && (this._shouldRender = true), this._revealOnScroll && this._reveal(), this._options.lazyRender || this._render();
  }
  renderNow() {
    if (!this._options.lazyRender)
      throw new Error("Please use `lazyRender` together with `renderNow`!");
    this._render();
  }
  _render() {
    if (this._shouldRender && (this._shouldRender = false, this._horizontalScrollbar.render(), this._verticalScrollbar.render(), this._options.useShadows)) {
      let e = this._scrollable.getCurrentScrollPosition(), i = e.scrollTop > 0, r = e.scrollLeft > 0, n = r ? " left" : "", o = i ? " top" : "", l = r || i ? " top-left-corner" : "";
      this._leftShadowDomNode.setClassName(`shadow${n}`), this._topShadowDomNode.setClassName(`shadow${o}`), this._topLeftShadowDomNode.setClassName(`shadow${l}${o}${n}`);
    }
  }
  _onDragStart() {
    this._isDragging = true, this._reveal();
  }
  _onDragEnd() {
    this._isDragging = false, this._hide();
  }
  _onMouseLeave(e) {
    this._mouseIsOver = false, this._hide();
  }
  _onMouseOver(e) {
    this._mouseIsOver = true, this._reveal();
  }
  _reveal() {
    this._verticalScrollbar.beginReveal(), this._horizontalScrollbar.beginReveal(), this._scheduleHide();
  }
  _hide() {
    !this._mouseIsOver && !this._isDragging && (this._verticalScrollbar.beginHide(), this._horizontalScrollbar.beginHide());
  }
  _scheduleHide() {
    !this._mouseIsOver && !this._isDragging && this._hideTimeout.cancelAndSet(() => this._hide(), Ma);
  }
};
var Kr = class extends ds {
  constructor(t, e, i) {
    super(t, e, i);
  }
  setScrollPosition(t) {
    t.reuseAnimation ? this._scrollable.setScrollPositionSmooth(t, t.reuseAnimation) : this._scrollable.setScrollPositionNow(t);
  }
  getScrollPosition() {
    return this._scrollable.getCurrentScrollPosition();
  }
};
function Pa(s12) {
  let t = { lazyRender: typeof s12.lazyRender < "u" ? s12.lazyRender : false, className: typeof s12.className < "u" ? s12.className : "", useShadows: typeof s12.useShadows < "u" ? s12.useShadows : true, handleMouseWheel: typeof s12.handleMouseWheel < "u" ? s12.handleMouseWheel : true, flipAxes: typeof s12.flipAxes < "u" ? s12.flipAxes : false, consumeMouseWheelIfScrollbarIsNeeded: typeof s12.consumeMouseWheelIfScrollbarIsNeeded < "u" ? s12.consumeMouseWheelIfScrollbarIsNeeded : false, alwaysConsumeMouseWheel: typeof s12.alwaysConsumeMouseWheel < "u" ? s12.alwaysConsumeMouseWheel : false, scrollYToX: typeof s12.scrollYToX < "u" ? s12.scrollYToX : false, mouseWheelScrollSensitivity: typeof s12.mouseWheelScrollSensitivity < "u" ? s12.mouseWheelScrollSensitivity : 1, fastScrollSensitivity: typeof s12.fastScrollSensitivity < "u" ? s12.fastScrollSensitivity : 5, scrollPredominantAxis: typeof s12.scrollPredominantAxis < "u" ? s12.scrollPredominantAxis : true, mouseWheelSmoothScroll: typeof s12.mouseWheelSmoothScroll < "u" ? s12.mouseWheelSmoothScroll : true, arrowSize: typeof s12.arrowSize < "u" ? s12.arrowSize : 11, listenOnDomNode: typeof s12.listenOnDomNode < "u" ? s12.listenOnDomNode : null, horizontal: typeof s12.horizontal < "u" ? s12.horizontal : 1, horizontalScrollbarSize: typeof s12.horizontalScrollbarSize < "u" ? s12.horizontalScrollbarSize : 10, horizontalSliderSize: typeof s12.horizontalSliderSize < "u" ? s12.horizontalSliderSize : 0, horizontalHasArrows: typeof s12.horizontalHasArrows < "u" ? s12.horizontalHasArrows : false, vertical: typeof s12.vertical < "u" ? s12.vertical : 1, verticalScrollbarSize: typeof s12.verticalScrollbarSize < "u" ? s12.verticalScrollbarSize : 10, verticalHasArrows: typeof s12.verticalHasArrows < "u" ? s12.verticalHasArrows : false, verticalSliderSize: typeof s12.verticalSliderSize < "u" ? s12.verticalSliderSize : 0, scrollByPage: typeof s12.scrollByPage < "u" ? s12.scrollByPage : false };
  return t.horizontalSliderSize = typeof s12.horizontalSliderSize < "u" ? s12.horizontalSliderSize : t.horizontalScrollbarSize, t.verticalSliderSize = typeof s12.verticalSliderSize < "u" ? s12.verticalSliderSize : t.verticalScrollbarSize, Te && (t.className += " mac"), t;
}
var zt = class extends D {
  constructor(e, i, r, n, o, l, a, u) {
    super();
    this._bufferService = r;
    this._optionsService = a;
    this._renderService = u;
    this._onRequestScrollLines = this._register(new v);
    this.onRequestScrollLines = this._onRequestScrollLines.event;
    this._isSyncing = false;
    this._isHandlingScroll = false;
    this._suppressOnScrollHandler = false;
    let h = this._register(new Ri({ forceIntegerValues: false, smoothScrollDuration: this._optionsService.rawOptions.smoothScrollDuration, scheduleAtNextAnimationFrame: (c) => mt(n.window, c) }));
    this._register(this._optionsService.onSpecificOptionChange("smoothScrollDuration", () => {
      h.setSmoothScrollDuration(this._optionsService.rawOptions.smoothScrollDuration);
    })), this._scrollableElement = this._register(new Kr(i, { vertical: 1, horizontal: 2, useShadows: false, mouseWheelSmoothScroll: true, ...this._getChangeOptions() }, h)), this._register(this._optionsService.onMultipleOptionChange(["scrollSensitivity", "fastScrollSensitivity", "overviewRuler"], () => this._scrollableElement.updateOptions(this._getChangeOptions()))), this._register(o.onProtocolChange((c) => {
      this._scrollableElement.updateOptions({ handleMouseWheel: !(c & 16) });
    })), this._scrollableElement.setScrollDimensions({ height: 0, scrollHeight: 0 }), this._register($.runAndSubscribe(l.onChangeColors, () => {
      this._scrollableElement.getDomNode().style.backgroundColor = l.colors.background.css;
    })), e.appendChild(this._scrollableElement.getDomNode()), this._register(C(() => this._scrollableElement.getDomNode().remove())), this._styleElement = n.mainDocument.createElement("style"), i.appendChild(this._styleElement), this._register(C(() => this._styleElement.remove())), this._register($.runAndSubscribe(l.onChangeColors, () => {
      this._styleElement.textContent = [".xterm .xterm-scrollable-element > .scrollbar > .slider {", `  background: ${l.colors.scrollbarSliderBackground.css};`, "}", ".xterm .xterm-scrollable-element > .scrollbar > .slider:hover {", `  background: ${l.colors.scrollbarSliderHoverBackground.css};`, "}", ".xterm .xterm-scrollable-element > .scrollbar > .slider.active {", `  background: ${l.colors.scrollbarSliderActiveBackground.css};`, "}"].join(`
`);
    })), this._register(this._bufferService.onResize(() => this.queueSync())), this._register(this._bufferService.buffers.onBufferActivate(() => {
      this._latestYDisp = undefined, this.queueSync();
    })), this._register(this._bufferService.onScroll(() => this._sync())), this._register(this._scrollableElement.onScroll((c) => this._handleScroll(c)));
  }
  scrollLines(e) {
    let i = this._scrollableElement.getScrollPosition();
    this._scrollableElement.setScrollPosition({ reuseAnimation: true, scrollTop: i.scrollTop + e * this._renderService.dimensions.css.cell.height });
  }
  scrollToLine(e, i) {
    i && (this._latestYDisp = e), this._scrollableElement.setScrollPosition({ reuseAnimation: !i, scrollTop: e * this._renderService.dimensions.css.cell.height });
  }
  _getChangeOptions() {
    return { mouseWheelScrollSensitivity: this._optionsService.rawOptions.scrollSensitivity, fastScrollSensitivity: this._optionsService.rawOptions.fastScrollSensitivity, verticalScrollbarSize: this._optionsService.rawOptions.overviewRuler?.width || 14 };
  }
  queueSync(e) {
    e !== undefined && (this._latestYDisp = e), this._queuedAnimationFrame === undefined && (this._queuedAnimationFrame = this._renderService.addRefreshCallback(() => {
      this._queuedAnimationFrame = undefined, this._sync(this._latestYDisp);
    }));
  }
  _sync(e = this._bufferService.buffer.ydisp) {
    !this._renderService || this._isSyncing || (this._isSyncing = true, this._suppressOnScrollHandler = true, this._scrollableElement.setScrollDimensions({ height: this._renderService.dimensions.css.canvas.height, scrollHeight: this._renderService.dimensions.css.cell.height * this._bufferService.buffer.lines.length }), this._suppressOnScrollHandler = false, e !== this._latestYDisp && this._scrollableElement.setScrollPosition({ scrollTop: e * this._renderService.dimensions.css.cell.height }), this._isSyncing = false);
  }
  _handleScroll(e) {
    if (!this._renderService || this._isHandlingScroll || this._suppressOnScrollHandler)
      return;
    this._isHandlingScroll = true;
    let i = Math.round(e.scrollTop / this._renderService.dimensions.css.cell.height), r = i - this._bufferService.buffer.ydisp;
    r !== 0 && (this._latestYDisp = i, this._onRequestScrollLines.fire(r)), this._isHandlingScroll = false;
  }
};
zt = M([S(2, F), S(3, ae), S(4, rr), S(5, Re), S(6, H), S(7, ce)], zt);
var Gt = class extends D {
  constructor(e, i, r, n, o) {
    super();
    this._screenElement = e;
    this._bufferService = i;
    this._coreBrowserService = r;
    this._decorationService = n;
    this._renderService = o;
    this._decorationElements = new Map;
    this._altBufferIsActive = false;
    this._dimensionsChanged = false;
    this._container = document.createElement("div"), this._container.classList.add("xterm-decoration-container"), this._screenElement.appendChild(this._container), this._register(this._renderService.onRenderedViewportChange(() => this._doRefreshDecorations())), this._register(this._renderService.onDimensionsChange(() => {
      this._dimensionsChanged = true, this._queueRefresh();
    })), this._register(this._coreBrowserService.onDprChange(() => this._queueRefresh())), this._register(this._bufferService.buffers.onBufferActivate(() => {
      this._altBufferIsActive = this._bufferService.buffer === this._bufferService.buffers.alt;
    })), this._register(this._decorationService.onDecorationRegistered(() => this._queueRefresh())), this._register(this._decorationService.onDecorationRemoved((l) => this._removeDecoration(l))), this._register(C(() => {
      this._container.remove(), this._decorationElements.clear();
    }));
  }
  _queueRefresh() {
    this._animationFrame === undefined && (this._animationFrame = this._renderService.addRefreshCallback(() => {
      this._doRefreshDecorations(), this._animationFrame = undefined;
    }));
  }
  _doRefreshDecorations() {
    for (let e of this._decorationService.decorations)
      this._renderDecoration(e);
    this._dimensionsChanged = false;
  }
  _renderDecoration(e) {
    this._refreshStyle(e), this._dimensionsChanged && this._refreshXPosition(e);
  }
  _createElement(e) {
    let i = this._coreBrowserService.mainDocument.createElement("div");
    i.classList.add("xterm-decoration"), i.classList.toggle("xterm-decoration-top-layer", e?.options?.layer === "top"), i.style.width = `${Math.round((e.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`, i.style.height = `${(e.options.height || 1) * this._renderService.dimensions.css.cell.height}px`, i.style.top = `${(e.marker.line - this._bufferService.buffers.active.ydisp) * this._renderService.dimensions.css.cell.height}px`, i.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`;
    let r = e.options.x ?? 0;
    return r && r > this._bufferService.cols && (i.style.display = "none"), this._refreshXPosition(e, i), i;
  }
  _refreshStyle(e) {
    let i = e.marker.line - this._bufferService.buffers.active.ydisp;
    if (i < 0 || i >= this._bufferService.rows)
      e.element && (e.element.style.display = "none", e.onRenderEmitter.fire(e.element));
    else {
      let r = this._decorationElements.get(e);
      r || (r = this._createElement(e), e.element = r, this._decorationElements.set(e, r), this._container.appendChild(r), e.onDispose(() => {
        this._decorationElements.delete(e), r.remove();
      })), r.style.display = this._altBufferIsActive ? "none" : "block", this._altBufferIsActive || (r.style.width = `${Math.round((e.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`, r.style.height = `${(e.options.height || 1) * this._renderService.dimensions.css.cell.height}px`, r.style.top = `${i * this._renderService.dimensions.css.cell.height}px`, r.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`), e.onRenderEmitter.fire(r);
    }
  }
  _refreshXPosition(e, i = e.element) {
    if (!i)
      return;
    let r = e.options.x ?? 0;
    (e.options.anchor || "left") === "right" ? i.style.right = r ? `${r * this._renderService.dimensions.css.cell.width}px` : "" : i.style.left = r ? `${r * this._renderService.dimensions.css.cell.width}px` : "";
  }
  _removeDecoration(e) {
    this._decorationElements.get(e)?.remove(), this._decorationElements.delete(e), e.dispose();
  }
};
Gt = M([S(1, F), S(2, ae), S(3, Be), S(4, ce)], Gt);
var Gr = class {
  constructor() {
    this._zones = [];
    this._zonePool = [];
    this._zonePoolIndex = 0;
    this._linePadding = { full: 0, left: 0, center: 0, right: 0 };
  }
  get zones() {
    return this._zonePool.length = Math.min(this._zonePool.length, this._zones.length), this._zones;
  }
  clear() {
    this._zones.length = 0, this._zonePoolIndex = 0;
  }
  addDecoration(t) {
    if (t.options.overviewRulerOptions) {
      for (let e of this._zones)
        if (e.color === t.options.overviewRulerOptions.color && e.position === t.options.overviewRulerOptions.position) {
          if (this._lineIntersectsZone(e, t.marker.line))
            return;
          if (this._lineAdjacentToZone(e, t.marker.line, t.options.overviewRulerOptions.position)) {
            this._addLineToZone(e, t.marker.line);
            return;
          }
        }
      if (this._zonePoolIndex < this._zonePool.length) {
        this._zonePool[this._zonePoolIndex].color = t.options.overviewRulerOptions.color, this._zonePool[this._zonePoolIndex].position = t.options.overviewRulerOptions.position, this._zonePool[this._zonePoolIndex].startBufferLine = t.marker.line, this._zonePool[this._zonePoolIndex].endBufferLine = t.marker.line, this._zones.push(this._zonePool[this._zonePoolIndex++]);
        return;
      }
      this._zones.push({ color: t.options.overviewRulerOptions.color, position: t.options.overviewRulerOptions.position, startBufferLine: t.marker.line, endBufferLine: t.marker.line }), this._zonePool.push(this._zones[this._zones.length - 1]), this._zonePoolIndex++;
    }
  }
  setPadding(t) {
    this._linePadding = t;
  }
  _lineIntersectsZone(t, e) {
    return e >= t.startBufferLine && e <= t.endBufferLine;
  }
  _lineAdjacentToZone(t, e, i) {
    return e >= t.startBufferLine - this._linePadding[i || "full"] && e <= t.endBufferLine + this._linePadding[i || "full"];
  }
  _addLineToZone(t, e) {
    t.startBufferLine = Math.min(t.startBufferLine, e), t.endBufferLine = Math.max(t.endBufferLine, e);
  }
};
var We = { full: 0, left: 0, center: 0, right: 0 };
var at = { full: 0, left: 0, center: 0, right: 0 };
var Li = { full: 0, left: 0, center: 0, right: 0 };
var bt = class extends D {
  constructor(e, i, r, n, o, l, a, u) {
    super();
    this._viewportElement = e;
    this._screenElement = i;
    this._bufferService = r;
    this._decorationService = n;
    this._renderService = o;
    this._optionsService = l;
    this._themeService = a;
    this._coreBrowserService = u;
    this._colorZoneStore = new Gr;
    this._shouldUpdateDimensions = true;
    this._shouldUpdateAnchor = true;
    this._lastKnownBufferLength = 0;
    this._canvas = this._coreBrowserService.mainDocument.createElement("canvas"), this._canvas.classList.add("xterm-decoration-overview-ruler"), this._refreshCanvasDimensions(), this._viewportElement.parentElement?.insertBefore(this._canvas, this._viewportElement), this._register(C(() => this._canvas?.remove()));
    let h = this._canvas.getContext("2d");
    if (h)
      this._ctx = h;
    else
      throw new Error("Ctx cannot be null");
    this._register(this._decorationService.onDecorationRegistered(() => this._queueRefresh(undefined, true))), this._register(this._decorationService.onDecorationRemoved(() => this._queueRefresh(undefined, true))), this._register(this._renderService.onRenderedViewportChange(() => this._queueRefresh())), this._register(this._bufferService.buffers.onBufferActivate(() => {
      this._canvas.style.display = this._bufferService.buffer === this._bufferService.buffers.alt ? "none" : "block";
    })), this._register(this._bufferService.onScroll(() => {
      this._lastKnownBufferLength !== this._bufferService.buffers.normal.lines.length && (this._refreshDrawHeightConstants(), this._refreshColorZonePadding());
    })), this._register(this._renderService.onRender(() => {
      (!this._containerHeight || this._containerHeight !== this._screenElement.clientHeight) && (this._queueRefresh(true), this._containerHeight = this._screenElement.clientHeight);
    })), this._register(this._coreBrowserService.onDprChange(() => this._queueRefresh(true))), this._register(this._optionsService.onSpecificOptionChange("overviewRuler", () => this._queueRefresh(true))), this._register(this._themeService.onChangeColors(() => this._queueRefresh())), this._queueRefresh(true);
  }
  get _width() {
    return this._optionsService.options.overviewRuler?.width || 0;
  }
  _refreshDrawConstants() {
    let e = Math.floor((this._canvas.width - 1) / 3), i = Math.ceil((this._canvas.width - 1) / 3);
    at.full = this._canvas.width, at.left = e, at.center = i, at.right = e, this._refreshDrawHeightConstants(), Li.full = 1, Li.left = 1, Li.center = 1 + at.left, Li.right = 1 + at.left + at.center;
  }
  _refreshDrawHeightConstants() {
    We.full = Math.round(2 * this._coreBrowserService.dpr);
    let e = this._canvas.height / this._bufferService.buffer.lines.length, i = Math.round(Math.max(Math.min(e, 12), 6) * this._coreBrowserService.dpr);
    We.left = i, We.center = i, We.right = i;
  }
  _refreshColorZonePadding() {
    this._colorZoneStore.setPadding({ full: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * We.full), left: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * We.left), center: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * We.center), right: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * We.right) }), this._lastKnownBufferLength = this._bufferService.buffers.normal.lines.length;
  }
  _refreshCanvasDimensions() {
    this._canvas.style.width = `${this._width}px`, this._canvas.width = Math.round(this._width * this._coreBrowserService.dpr), this._canvas.style.height = `${this._screenElement.clientHeight}px`, this._canvas.height = Math.round(this._screenElement.clientHeight * this._coreBrowserService.dpr), this._refreshDrawConstants(), this._refreshColorZonePadding();
  }
  _refreshDecorations() {
    this._shouldUpdateDimensions && this._refreshCanvasDimensions(), this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height), this._colorZoneStore.clear();
    for (let i of this._decorationService.decorations)
      this._colorZoneStore.addDecoration(i);
    this._ctx.lineWidth = 1, this._renderRulerOutline();
    let e = this._colorZoneStore.zones;
    for (let i of e)
      i.position !== "full" && this._renderColorZone(i);
    for (let i of e)
      i.position === "full" && this._renderColorZone(i);
    this._shouldUpdateDimensions = false, this._shouldUpdateAnchor = false;
  }
  _renderRulerOutline() {
    this._ctx.fillStyle = this._themeService.colors.overviewRulerBorder.css, this._ctx.fillRect(0, 0, 1, this._canvas.height), this._optionsService.rawOptions.overviewRuler.showTopBorder && this._ctx.fillRect(1, 0, this._canvas.width - 1, 1), this._optionsService.rawOptions.overviewRuler.showBottomBorder && this._ctx.fillRect(1, this._canvas.height - 1, this._canvas.width - 1, this._canvas.height);
  }
  _renderColorZone(e) {
    this._ctx.fillStyle = e.color, this._ctx.fillRect(Li[e.position || "full"], Math.round((this._canvas.height - 1) * (e.startBufferLine / this._bufferService.buffers.active.lines.length) - We[e.position || "full"] / 2), at[e.position || "full"], Math.round((this._canvas.height - 1) * ((e.endBufferLine - e.startBufferLine) / this._bufferService.buffers.active.lines.length) + We[e.position || "full"]));
  }
  _queueRefresh(e, i) {
    this._shouldUpdateDimensions = e || this._shouldUpdateDimensions, this._shouldUpdateAnchor = i || this._shouldUpdateAnchor, this._animationFrame === undefined && (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
      this._refreshDecorations(), this._animationFrame = undefined;
    }));
  }
};
bt = M([S(2, F), S(3, Be), S(4, ce), S(5, H), S(6, Re), S(7, ae)], bt);
var b;
((E) => (E.NUL = "\x00", E.SOH = "\x01", E.STX = "\x02", E.ETX = "\x03", E.EOT = "\x04", E.ENQ = "\x05", E.ACK = "\x06", E.BEL = "\x07", E.BS = "\b", E.HT = "\t", E.LF = `
`, E.VT = "\v", E.FF = "\f", E.CR = "\r", E.SO = "\x0E", E.SI = "\x0F", E.DLE = "\x10", E.DC1 = "\x11", E.DC2 = "\x12", E.DC3 = "\x13", E.DC4 = "\x14", E.NAK = "\x15", E.SYN = "\x16", E.ETB = "\x17", E.CAN = "\x18", E.EM = "\x19", E.SUB = "\x1A", E.ESC = "\x1B", E.FS = "\x1C", E.GS = "\x1D", E.RS = "\x1E", E.US = "\x1F", E.SP = " ", E.DEL = ""))(b ||= {});
var Ai;
((g) => (g.PAD = "", g.HOP = "", g.BPH = "", g.NBH = "", g.IND = "", g.NEL = "", g.SSA = "", g.ESA = "", g.HTS = "", g.HTJ = "", g.VTS = "", g.PLD = "", g.PLU = "", g.RI = "", g.SS2 = "", g.SS3 = "", g.DCS = "", g.PU1 = "", g.PU2 = "", g.STS = "", g.CCH = "", g.MW = "", g.SPA = "", g.EPA = "", g.SOS = "", g.SGCI = "", g.SCI = "", g.CSI = "", g.ST = "", g.OSC = "", g.PM = "", g.APC = ""))(Ai ||= {});
var fs;
((t) => t.ST = `${b.ESC}\\`)(fs ||= {});
var $t = class {
  constructor(t, e, i, r, n, o) {
    this._textarea = t;
    this._compositionView = e;
    this._bufferService = i;
    this._optionsService = r;
    this._coreService = n;
    this._renderService = o;
    this._isComposing = false, this._isSendingComposition = false, this._compositionPosition = { start: 0, end: 0 }, this._dataAlreadySent = "";
  }
  get isComposing() {
    return this._isComposing;
  }
  compositionstart() {
    this._isComposing = true, this._compositionPosition.start = this._textarea.value.length, this._compositionView.textContent = "", this._dataAlreadySent = "", this._compositionView.classList.add("active");
  }
  compositionupdate(t) {
    this._compositionView.textContent = t.data, this.updateCompositionElements(), setTimeout(() => {
      this._compositionPosition.end = this._textarea.value.length;
    }, 0);
  }
  compositionend() {
    this._finalizeComposition(true);
  }
  keydown(t) {
    if (this._isComposing || this._isSendingComposition) {
      if (t.keyCode === 20 || t.keyCode === 229 || t.keyCode === 16 || t.keyCode === 17 || t.keyCode === 18)
        return false;
      this._finalizeComposition(false);
    }
    return t.keyCode === 229 ? (this._handleAnyTextareaChanges(), false) : true;
  }
  _finalizeComposition(t) {
    if (this._compositionView.classList.remove("active"), this._isComposing = false, t) {
      let e = { start: this._compositionPosition.start, end: this._compositionPosition.end };
      this._isSendingComposition = true, setTimeout(() => {
        if (this._isSendingComposition) {
          this._isSendingComposition = false;
          let i;
          e.start += this._dataAlreadySent.length, this._isComposing ? i = this._textarea.value.substring(e.start, this._compositionPosition.start) : i = this._textarea.value.substring(e.start), i.length > 0 && this._coreService.triggerDataEvent(i, true);
        }
      }, 0);
    } else {
      this._isSendingComposition = false;
      let e = this._textarea.value.substring(this._compositionPosition.start, this._compositionPosition.end);
      this._coreService.triggerDataEvent(e, true);
    }
  }
  _handleAnyTextareaChanges() {
    let t = this._textarea.value;
    setTimeout(() => {
      if (!this._isComposing) {
        let e = this._textarea.value, i = e.replace(t, "");
        this._dataAlreadySent = i, e.length > t.length ? this._coreService.triggerDataEvent(i, true) : e.length < t.length ? this._coreService.triggerDataEvent(`${b.DEL}`, true) : e.length === t.length && e !== t && this._coreService.triggerDataEvent(e, true);
      }
    }, 0);
  }
  updateCompositionElements(t) {
    if (this._isComposing) {
      if (this._bufferService.buffer.isCursorInViewport) {
        let e = Math.min(this._bufferService.buffer.x, this._bufferService.cols - 1), i = this._renderService.dimensions.css.cell.height, r = this._bufferService.buffer.y * this._renderService.dimensions.css.cell.height, n = e * this._renderService.dimensions.css.cell.width;
        this._compositionView.style.left = n + "px", this._compositionView.style.top = r + "px", this._compositionView.style.height = i + "px", this._compositionView.style.lineHeight = i + "px", this._compositionView.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._compositionView.style.fontSize = this._optionsService.rawOptions.fontSize + "px";
        let o = this._compositionView.getBoundingClientRect();
        this._textarea.style.left = n + "px", this._textarea.style.top = r + "px", this._textarea.style.width = Math.max(o.width, 1) + "px", this._textarea.style.height = Math.max(o.height, 1) + "px", this._textarea.style.lineHeight = o.height + "px";
      }
      t || setTimeout(() => this.updateCompositionElements(true), 0);
    }
  }
};
$t = M([S(2, F), S(3, H), S(4, ge), S(5, ce)], $t);
var ue = 0;
var he = 0;
var de = 0;
var J = 0;
var ps = { css: "#00000000", rgba: 0 };
var j;
((i) => {
  function s12(r, n, o, l) {
    return l !== undefined ? `#${vt(r)}${vt(n)}${vt(o)}${vt(l)}` : `#${vt(r)}${vt(n)}${vt(o)}`;
  }
  i.toCss = s12;
  function t(r, n, o, l = 255) {
    return (r << 24 | n << 16 | o << 8 | l) >>> 0;
  }
  i.toRgba = t;
  function e(r, n, o, l) {
    return { css: i.toCss(r, n, o, l), rgba: i.toRgba(r, n, o, l) };
  }
  i.toColor = e;
})(j ||= {});
var U;
((l) => {
  function s12(a, u) {
    if (J = (u.rgba & 255) / 255, J === 1)
      return { css: u.css, rgba: u.rgba };
    let h = u.rgba >> 24 & 255, c = u.rgba >> 16 & 255, d = u.rgba >> 8 & 255, _ = a.rgba >> 24 & 255, p = a.rgba >> 16 & 255, m = a.rgba >> 8 & 255;
    ue = _ + Math.round((h - _) * J), he = p + Math.round((c - p) * J), de = m + Math.round((d - m) * J);
    let f = j.toCss(ue, he, de), A = j.toRgba(ue, he, de);
    return { css: f, rgba: A };
  }
  l.blend = s12;
  function t(a) {
    return (a.rgba & 255) === 255;
  }
  l.isOpaque = t;
  function e(a, u, h) {
    let c = $r.ensureContrastRatio(a.rgba, u.rgba, h);
    if (c)
      return j.toColor(c >> 24 & 255, c >> 16 & 255, c >> 8 & 255);
  }
  l.ensureContrastRatio = e;
  function i(a) {
    let u = (a.rgba | 255) >>> 0;
    return [ue, he, de] = $r.toChannels(u), { css: j.toCss(ue, he, de), rgba: u };
  }
  l.opaque = i;
  function r(a, u) {
    return J = Math.round(u * 255), [ue, he, de] = $r.toChannels(a.rgba), { css: j.toCss(ue, he, de, J), rgba: j.toRgba(ue, he, de, J) };
  }
  l.opacity = r;
  function n(a, u) {
    return J = a.rgba & 255, r(a, J * u / 255);
  }
  l.multiplyOpacity = n;
  function o(a) {
    return [a.rgba >> 24 & 255, a.rgba >> 16 & 255, a.rgba >> 8 & 255];
  }
  l.toColorRGB = o;
})(U ||= {});
var z;
((i) => {
  let s12, t;
  try {
    let r = document.createElement("canvas");
    r.width = 1, r.height = 1;
    let n = r.getContext("2d", { willReadFrequently: true });
    n && (s12 = n, s12.globalCompositeOperation = "copy", t = s12.createLinearGradient(0, 0, 1, 1));
  } catch {}
  function e(r) {
    if (r.match(/#[\da-f]{3,8}/i))
      switch (r.length) {
        case 4:
          return ue = parseInt(r.slice(1, 2).repeat(2), 16), he = parseInt(r.slice(2, 3).repeat(2), 16), de = parseInt(r.slice(3, 4).repeat(2), 16), j.toColor(ue, he, de);
        case 5:
          return ue = parseInt(r.slice(1, 2).repeat(2), 16), he = parseInt(r.slice(2, 3).repeat(2), 16), de = parseInt(r.slice(3, 4).repeat(2), 16), J = parseInt(r.slice(4, 5).repeat(2), 16), j.toColor(ue, he, de, J);
        case 7:
          return { css: r, rgba: (parseInt(r.slice(1), 16) << 8 | 255) >>> 0 };
        case 9:
          return { css: r, rgba: parseInt(r.slice(1), 16) >>> 0 };
      }
    let n = r.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);
    if (n)
      return ue = parseInt(n[1]), he = parseInt(n[2]), de = parseInt(n[3]), J = Math.round((n[5] === undefined ? 1 : parseFloat(n[5])) * 255), j.toColor(ue, he, de, J);
    if (!s12 || !t)
      throw new Error("css.toColor: Unsupported css format");
    if (s12.fillStyle = t, s12.fillStyle = r, typeof s12.fillStyle != "string")
      throw new Error("css.toColor: Unsupported css format");
    if (s12.fillRect(0, 0, 1, 1), [ue, he, de, J] = s12.getImageData(0, 0, 1, 1).data, J !== 255)
      throw new Error("css.toColor: Unsupported css format");
    return { rgba: j.toRgba(ue, he, de, J), css: r };
  }
  i.toColor = e;
})(z ||= {});
var ve;
((e) => {
  function s12(i) {
    return t(i >> 16 & 255, i >> 8 & 255, i & 255);
  }
  e.relativeLuminance = s12;
  function t(i, r, n) {
    let o = i / 255, l = r / 255, a = n / 255, u = o <= 0.03928 ? o / 12.92 : Math.pow((o + 0.055) / 1.055, 2.4), h = l <= 0.03928 ? l / 12.92 : Math.pow((l + 0.055) / 1.055, 2.4), c = a <= 0.03928 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4);
    return u * 0.2126 + h * 0.7152 + c * 0.0722;
  }
  e.relativeLuminance2 = t;
})(ve ||= {});
var $r;
((n) => {
  function s12(o, l) {
    if (J = (l & 255) / 255, J === 1)
      return l;
    let a = l >> 24 & 255, u = l >> 16 & 255, h = l >> 8 & 255, c = o >> 24 & 255, d = o >> 16 & 255, _ = o >> 8 & 255;
    return ue = c + Math.round((a - c) * J), he = d + Math.round((u - d) * J), de = _ + Math.round((h - _) * J), j.toRgba(ue, he, de);
  }
  n.blend = s12;
  function t(o, l, a) {
    let u = ve.relativeLuminance(o >> 8), h = ve.relativeLuminance(l >> 8);
    if (Xe(u, h) < a) {
      if (h < u) {
        let p = e(o, l, a), m = Xe(u, ve.relativeLuminance(p >> 8));
        if (m < a) {
          let f = i(o, l, a), A = Xe(u, ve.relativeLuminance(f >> 8));
          return m > A ? p : f;
        }
        return p;
      }
      let d = i(o, l, a), _ = Xe(u, ve.relativeLuminance(d >> 8));
      if (_ < a) {
        let p = e(o, l, a), m = Xe(u, ve.relativeLuminance(p >> 8));
        return _ > m ? d : p;
      }
      return d;
    }
  }
  n.ensureContrastRatio = t;
  function e(o, l, a) {
    let u = o >> 24 & 255, h = o >> 16 & 255, c = o >> 8 & 255, d = l >> 24 & 255, _ = l >> 16 & 255, p = l >> 8 & 255, m = Xe(ve.relativeLuminance2(d, _, p), ve.relativeLuminance2(u, h, c));
    for (;m < a && (d > 0 || _ > 0 || p > 0); )
      d -= Math.max(0, Math.ceil(d * 0.1)), _ -= Math.max(0, Math.ceil(_ * 0.1)), p -= Math.max(0, Math.ceil(p * 0.1)), m = Xe(ve.relativeLuminance2(d, _, p), ve.relativeLuminance2(u, h, c));
    return (d << 24 | _ << 16 | p << 8 | 255) >>> 0;
  }
  n.reduceLuminance = e;
  function i(o, l, a) {
    let u = o >> 24 & 255, h = o >> 16 & 255, c = o >> 8 & 255, d = l >> 24 & 255, _ = l >> 16 & 255, p = l >> 8 & 255, m = Xe(ve.relativeLuminance2(d, _, p), ve.relativeLuminance2(u, h, c));
    for (;m < a && (d < 255 || _ < 255 || p < 255); )
      d = Math.min(255, d + Math.ceil((255 - d) * 0.1)), _ = Math.min(255, _ + Math.ceil((255 - _) * 0.1)), p = Math.min(255, p + Math.ceil((255 - p) * 0.1)), m = Xe(ve.relativeLuminance2(d, _, p), ve.relativeLuminance2(u, h, c));
    return (d << 24 | _ << 16 | p << 8 | 255) >>> 0;
  }
  n.increaseLuminance = i;
  function r(o) {
    return [o >> 24 & 255, o >> 16 & 255, o >> 8 & 255, o & 255];
  }
  n.toChannels = r;
})($r ||= {});
function vt(s12) {
  let t = s12.toString(16);
  return t.length < 2 ? "0" + t : t;
}
function Xe(s12, t) {
  return s12 < t ? (t + 0.05) / (s12 + 0.05) : (s12 + 0.05) / (t + 0.05);
}
var Vr = class extends De {
  constructor(e, i, r) {
    super();
    this.content = 0;
    this.combinedData = "";
    this.fg = e.fg, this.bg = e.bg, this.combinedData = i, this._width = r;
  }
  isCombined() {
    return 2097152;
  }
  getWidth() {
    return this._width;
  }
  getChars() {
    return this.combinedData;
  }
  getCode() {
    return 2097151;
  }
  setFromCharData(e) {
    throw new Error("not implemented");
  }
  getAsCharData() {
    return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
  }
};
var ct = class {
  constructor(t) {
    this._bufferService = t;
    this._characterJoiners = [];
    this._nextCharacterJoinerId = 0;
    this._workCell = new q;
  }
  register(t) {
    let e = { id: this._nextCharacterJoinerId++, handler: t };
    return this._characterJoiners.push(e), e.id;
  }
  deregister(t) {
    for (let e = 0;e < this._characterJoiners.length; e++)
      if (this._characterJoiners[e].id === t)
        return this._characterJoiners.splice(e, 1), true;
    return false;
  }
  getJoinedCharacters(t) {
    if (this._characterJoiners.length === 0)
      return [];
    let e = this._bufferService.buffer.lines.get(t);
    if (!e || e.length === 0)
      return [];
    let i = [], r = e.translateToString(true), n = 0, o = 0, l = 0, a = e.getFg(0), u = e.getBg(0);
    for (let h = 0;h < e.getTrimmedLength(); h++)
      if (e.loadCell(h, this._workCell), this._workCell.getWidth() !== 0) {
        if (this._workCell.fg !== a || this._workCell.bg !== u) {
          if (h - n > 1) {
            let c = this._getJoinedRanges(r, l, o, e, n);
            for (let d = 0;d < c.length; d++)
              i.push(c[d]);
          }
          n = h, l = o, a = this._workCell.fg, u = this._workCell.bg;
        }
        o += this._workCell.getChars().length || we.length;
      }
    if (this._bufferService.cols - n > 1) {
      let h = this._getJoinedRanges(r, l, o, e, n);
      for (let c = 0;c < h.length; c++)
        i.push(h[c]);
    }
    return i;
  }
  _getJoinedRanges(t, e, i, r, n) {
    let o = t.substring(e, i), l = [];
    try {
      l = this._characterJoiners[0].handler(o);
    } catch (a) {
      console.error(a);
    }
    for (let a = 1;a < this._characterJoiners.length; a++)
      try {
        let u = this._characterJoiners[a].handler(o);
        for (let h = 0;h < u.length; h++)
          ct._mergeRanges(l, u[h]);
      } catch (u) {
        console.error(u);
      }
    return this._stringRangesToCellRanges(l, r, n), l;
  }
  _stringRangesToCellRanges(t, e, i) {
    let r = 0, n = false, o = 0, l = t[r];
    if (l) {
      for (let a = i;a < this._bufferService.cols; a++) {
        let u = e.getWidth(a), h = e.getString(a).length || we.length;
        if (u !== 0) {
          if (!n && l[0] <= o && (l[0] = a, n = true), l[1] <= o) {
            if (l[1] = a, l = t[++r], !l)
              break;
            l[0] <= o ? (l[0] = a, n = true) : n = false;
          }
          o += h;
        }
      }
      l && (l[1] = this._bufferService.cols);
    }
  }
  static _mergeRanges(t, e) {
    let i = false;
    for (let r = 0;r < t.length; r++) {
      let n = t[r];
      if (i) {
        if (e[1] <= n[0])
          return t[r - 1][1] = e[1], t;
        if (e[1] <= n[1])
          return t[r - 1][1] = Math.max(e[1], n[1]), t.splice(r, 1), t;
        t.splice(r, 1), r--;
      } else {
        if (e[1] <= n[0])
          return t.splice(r, 0, e), t;
        if (e[1] <= n[1])
          return n[0] = Math.min(e[0], n[0]), t;
        e[0] < n[1] && (n[0] = Math.min(e[0], n[0]), i = true);
        continue;
      }
    }
    return i ? t[t.length - 1][1] = e[1] : t.push(e), t;
  }
};
ct = M([S(0, F)], ct);
function Oa(s12) {
  return 57508 <= s12 && s12 <= 57558;
}
function Ba(s12) {
  return 9472 <= s12 && s12 <= 9631;
}
function $o(s12) {
  return Oa(s12) || Ba(s12);
}
function Vo() {
  return { css: { canvas: qr(), cell: qr() }, device: { canvas: qr(), cell: qr(), char: { width: 0, height: 0, left: 0, top: 0 } } };
}
function qr() {
  return { width: 0, height: 0 };
}
var Vt = class {
  constructor(t, e, i, r, n, o, l) {
    this._document = t;
    this._characterJoinerService = e;
    this._optionsService = i;
    this._coreBrowserService = r;
    this._coreService = n;
    this._decorationService = o;
    this._themeService = l;
    this._workCell = new q;
    this._columnSelectMode = false;
    this.defaultSpacing = 0;
  }
  handleSelectionChanged(t, e, i) {
    this._selectionStart = t, this._selectionEnd = e, this._columnSelectMode = i;
  }
  createRow(t, e, i, r, n, o, l, a, u, h, c) {
    let d = [], _ = this._characterJoinerService.getJoinedCharacters(e), p = this._themeService.colors, m = t.getNoBgTrimmedLength();
    i && m < o + 1 && (m = o + 1);
    let f, A = 0, R = "", O = 0, I = 0, k = 0, P = 0, oe = false, Me = 0, Pe = false, Ke = 0, di = 0, V = [], Qe = h !== -1 && c !== -1;
    for (let y = 0;y < m; y++) {
      t.loadCell(y, this._workCell);
      let T = this._workCell.getWidth();
      if (T === 0)
        continue;
      let g = false, w = y >= di, E = y, x = this._workCell;
      if (_.length > 0 && y === _[0][0] && w) {
        let W = _.shift(), An = this._isCellInSelection(W[0], e);
        for (O = W[0] + 1;O < W[1]; O++)
          w &&= An === this._isCellInSelection(O, e);
        w &&= !i || o < W[0] || o >= W[1], w ? (g = true, x = new Vr(this._workCell, t.translateToString(true, W[0], W[1]), W[1] - W[0]), E = W[1] - 1, T = x.getWidth()) : di = W[1];
      }
      let N = this._isCellInSelection(y, e), Z = i && y === o, te = Qe && y >= h && y <= c, Oe = false;
      this._decorationService.forEachDecorationAtCell(y, e, undefined, (W) => {
        Oe = true;
      });
      let ze = x.getChars() || we;
      if (ze === " " && (x.isUnderline() || x.isOverline()) && (ze = " "), Ke = T * a - u.get(ze, x.isBold(), x.isItalic()), !f)
        f = this._document.createElement("span");
      else if (A && (N && Pe || !N && !Pe && x.bg === I) && (N && Pe && p.selectionForeground || x.fg === k) && x.extended.ext === P && te === oe && Ke === Me && !Z && !g && !Oe && w) {
        x.isInvisible() ? R += we : R += ze, A++;
        continue;
      } else
        A && (f.textContent = R), f = this._document.createElement("span"), A = 0, R = "";
      if (I = x.bg, k = x.fg, P = x.extended.ext, oe = te, Me = Ke, Pe = N, g && o >= y && o <= E && (o = y), !this._coreService.isCursorHidden && Z && this._coreService.isCursorInitialized) {
        if (V.push("xterm-cursor"), this._coreBrowserService.isFocused)
          l && V.push("xterm-cursor-blink"), V.push(r === "bar" ? "xterm-cursor-bar" : r === "underline" ? "xterm-cursor-underline" : "xterm-cursor-block");
        else if (n)
          switch (n) {
            case "outline":
              V.push("xterm-cursor-outline");
              break;
            case "block":
              V.push("xterm-cursor-block");
              break;
            case "bar":
              V.push("xterm-cursor-bar");
              break;
            case "underline":
              V.push("xterm-cursor-underline");
              break;
            default:
              break;
          }
      }
      if (x.isBold() && V.push("xterm-bold"), x.isItalic() && V.push("xterm-italic"), x.isDim() && V.push("xterm-dim"), x.isInvisible() ? R = we : R = x.getChars() || we, x.isUnderline() && (V.push(`xterm-underline-${x.extended.underlineStyle}`), R === " " && (R = " "), !x.isUnderlineColorDefault()))
        if (x.isUnderlineColorRGB())
          f.style.textDecorationColor = `rgb(${De.toColorRGB(x.getUnderlineColor()).join(",")})`;
        else {
          let W = x.getUnderlineColor();
          this._optionsService.rawOptions.drawBoldTextInBrightColors && x.isBold() && W < 8 && (W += 8), f.style.textDecorationColor = p.ansi[W].css;
        }
      x.isOverline() && (V.push("xterm-overline"), R === " " && (R = " ")), x.isStrikethrough() && V.push("xterm-strikethrough"), te && (f.style.textDecoration = "underline");
      let le = x.getFgColor(), et = x.getFgColorMode(), me = x.getBgColor(), ht = x.getBgColorMode(), fi = !!x.isInverse();
      if (fi) {
        let W = le;
        le = me, me = W;
        let An = et;
        et = ht, ht = An;
      }
      let tt, Qi, pi = false;
      this._decorationService.forEachDecorationAtCell(y, e, undefined, (W) => {
        W.options.layer !== "top" && pi || (W.backgroundColorRGB && (ht = 50331648, me = W.backgroundColorRGB.rgba >> 8 & 16777215, tt = W.backgroundColorRGB), W.foregroundColorRGB && (et = 50331648, le = W.foregroundColorRGB.rgba >> 8 & 16777215, Qi = W.foregroundColorRGB), pi = W.options.layer === "top");
      }), !pi && N && (tt = this._coreBrowserService.isFocused ? p.selectionBackgroundOpaque : p.selectionInactiveBackgroundOpaque, me = tt.rgba >> 8 & 16777215, ht = 50331648, pi = true, p.selectionForeground && (et = 50331648, le = p.selectionForeground.rgba >> 8 & 16777215, Qi = p.selectionForeground)), pi && V.push("xterm-decoration-top");
      let it;
      switch (ht) {
        case 16777216:
        case 33554432:
          it = p.ansi[me], V.push(`xterm-bg-${me}`);
          break;
        case 50331648:
          it = j.toColor(me >> 16, me >> 8 & 255, me & 255), this._addStyle(f, `background-color:#${qo((me >>> 0).toString(16), "0", 6)}`);
          break;
        case 0:
        default:
          fi ? (it = p.foreground, V.push(`xterm-bg-${257}`)) : it = p.background;
      }
      switch (tt || x.isDim() && (tt = U.multiplyOpacity(it, 0.5)), et) {
        case 16777216:
        case 33554432:
          x.isBold() && le < 8 && this._optionsService.rawOptions.drawBoldTextInBrightColors && (le += 8), this._applyMinimumContrast(f, it, p.ansi[le], x, tt, undefined) || V.push(`xterm-fg-${le}`);
          break;
        case 50331648:
          let W = j.toColor(le >> 16 & 255, le >> 8 & 255, le & 255);
          this._applyMinimumContrast(f, it, W, x, tt, Qi) || this._addStyle(f, `color:#${qo(le.toString(16), "0", 6)}`);
          break;
        case 0:
        default:
          this._applyMinimumContrast(f, it, p.foreground, x, tt, Qi) || fi && V.push(`xterm-fg-${257}`);
      }
      V.length && (f.className = V.join(" "), V.length = 0), !Z && !g && !Oe && w ? A++ : f.textContent = R, Ke !== this.defaultSpacing && (f.style.letterSpacing = `${Ke}px`), d.push(f), y = E;
    }
    return f && A && (f.textContent = R), d;
  }
  _applyMinimumContrast(t, e, i, r, n, o) {
    if (this._optionsService.rawOptions.minimumContrastRatio === 1 || $o(r.getCode()))
      return false;
    let l = this._getContrastCache(r), a;
    if (!n && !o && (a = l.getColor(e.rgba, i.rgba)), a === undefined) {
      let u = this._optionsService.rawOptions.minimumContrastRatio / (r.isDim() ? 2 : 1);
      a = U.ensureContrastRatio(n || e, o || i, u), l.setColor((n || e).rgba, (o || i).rgba, a ?? null);
    }
    return a ? (this._addStyle(t, `color:${a.css}`), true) : false;
  }
  _getContrastCache(t) {
    return t.isDim() ? this._themeService.colors.halfContrastCache : this._themeService.colors.contrastCache;
  }
  _addStyle(t, e) {
    t.setAttribute("style", `${t.getAttribute("style") || ""}${e};`);
  }
  _isCellInSelection(t, e) {
    let i = this._selectionStart, r = this._selectionEnd;
    return !i || !r ? false : this._columnSelectMode ? i[0] <= r[0] ? t >= i[0] && e >= i[1] && t < r[0] && e <= r[1] : t < i[0] && e >= i[1] && t >= r[0] && e <= r[1] : e > i[1] && e < r[1] || i[1] === r[1] && e === i[1] && t >= i[0] && t < r[0] || i[1] < r[1] && e === r[1] && t < r[0] || i[1] < r[1] && e === i[1] && t >= i[0];
  }
};
Vt = M([S(1, or), S(2, H), S(3, ae), S(4, ge), S(5, Be), S(6, Re)], Vt);
function qo(s12, t, e) {
  for (;s12.length < e; )
    s12 = t + s12;
  return s12;
}
var Yr = class {
  constructor(t, e) {
    this._flat = new Float32Array(256);
    this._font = "";
    this._fontSize = 0;
    this._weight = "normal";
    this._weightBold = "bold";
    this._measureElements = [];
    this._container = t.createElement("div"), this._container.classList.add("xterm-width-cache-measure-container"), this._container.setAttribute("aria-hidden", "true"), this._container.style.whiteSpace = "pre", this._container.style.fontKerning = "none";
    let i = t.createElement("span");
    i.classList.add("xterm-char-measure-element");
    let r = t.createElement("span");
    r.classList.add("xterm-char-measure-element"), r.style.fontWeight = "bold";
    let n = t.createElement("span");
    n.classList.add("xterm-char-measure-element"), n.style.fontStyle = "italic";
    let o = t.createElement("span");
    o.classList.add("xterm-char-measure-element"), o.style.fontWeight = "bold", o.style.fontStyle = "italic", this._measureElements = [i, r, n, o], this._container.appendChild(i), this._container.appendChild(r), this._container.appendChild(n), this._container.appendChild(o), e.appendChild(this._container), this.clear();
  }
  dispose() {
    this._container.remove(), this._measureElements.length = 0, this._holey = undefined;
  }
  clear() {
    this._flat.fill(-9999), this._holey = new Map;
  }
  setFont(t, e, i, r) {
    t === this._font && e === this._fontSize && i === this._weight && r === this._weightBold || (this._font = t, this._fontSize = e, this._weight = i, this._weightBold = r, this._container.style.fontFamily = this._font, this._container.style.fontSize = `${this._fontSize}px`, this._measureElements[0].style.fontWeight = `${i}`, this._measureElements[1].style.fontWeight = `${r}`, this._measureElements[2].style.fontWeight = `${i}`, this._measureElements[3].style.fontWeight = `${r}`, this.clear());
  }
  get(t, e, i) {
    let r = 0;
    if (!e && !i && t.length === 1 && (r = t.charCodeAt(0)) < 256) {
      if (this._flat[r] !== -9999)
        return this._flat[r];
      let l = this._measure(t, 0);
      return l > 0 && (this._flat[r] = l), l;
    }
    let n = t;
    e && (n += "B"), i && (n += "I");
    let o = this._holey.get(n);
    if (o === undefined) {
      let l = 0;
      e && (l |= 1), i && (l |= 2), o = this._measure(t, l), o > 0 && this._holey.set(n, o);
    }
    return o;
  }
  _measure(t, e) {
    let i = this._measureElements[e];
    return i.textContent = t.repeat(32), i.offsetWidth / 32;
  }
};
var ms = class {
  constructor() {
    this.clear();
  }
  clear() {
    this.hasSelection = false, this.columnSelectMode = false, this.viewportStartRow = 0, this.viewportEndRow = 0, this.viewportCappedStartRow = 0, this.viewportCappedEndRow = 0, this.startCol = 0, this.endCol = 0, this.selectionStart = undefined, this.selectionEnd = undefined;
  }
  update(t, e, i, r = false) {
    if (this.selectionStart = e, this.selectionEnd = i, !e || !i || e[0] === i[0] && e[1] === i[1]) {
      this.clear();
      return;
    }
    let n = t.buffers.active.ydisp, o = e[1] - n, l = i[1] - n, a = Math.max(o, 0), u = Math.min(l, t.rows - 1);
    if (a >= t.rows || u < 0) {
      this.clear();
      return;
    }
    this.hasSelection = true, this.columnSelectMode = r, this.viewportStartRow = o, this.viewportEndRow = l, this.viewportCappedStartRow = a, this.viewportCappedEndRow = u, this.startCol = e[0], this.endCol = i[0];
  }
  isCellSelected(t, e, i) {
    return this.hasSelection ? (i -= t.buffer.active.viewportY, this.columnSelectMode ? this.startCol <= this.endCol ? e >= this.startCol && i >= this.viewportCappedStartRow && e < this.endCol && i <= this.viewportCappedEndRow : e < this.startCol && i >= this.viewportCappedStartRow && e >= this.endCol && i <= this.viewportCappedEndRow : i > this.viewportStartRow && i < this.viewportEndRow || this.viewportStartRow === this.viewportEndRow && i === this.viewportStartRow && e >= this.startCol && e < this.endCol || this.viewportStartRow < this.viewportEndRow && i === this.viewportEndRow && e < this.endCol || this.viewportStartRow < this.viewportEndRow && i === this.viewportStartRow && e >= this.startCol) : false;
  }
};
function Yo() {
  return new ms;
}
var _s = "xterm-dom-renderer-owner-";
var Le = "xterm-rows";
var jr = "xterm-fg-";
var jo = "xterm-bg-";
var ki = "xterm-focus";
var Xr = "xterm-selection";
var Na = 1;
var Yt = class extends D {
  constructor(e, i, r, n, o, l, a, u, h, c, d, _, p, m) {
    super();
    this._terminal = e;
    this._document = i;
    this._element = r;
    this._screenElement = n;
    this._viewportElement = o;
    this._helperContainer = l;
    this._linkifier2 = a;
    this._charSizeService = h;
    this._optionsService = c;
    this._bufferService = d;
    this._coreService = _;
    this._coreBrowserService = p;
    this._themeService = m;
    this._terminalClass = Na++;
    this._rowElements = [];
    this._selectionRenderModel = Yo();
    this.onRequestRedraw = this._register(new v).event;
    this._rowContainer = this._document.createElement("div"), this._rowContainer.classList.add(Le), this._rowContainer.style.lineHeight = "normal", this._rowContainer.setAttribute("aria-hidden", "true"), this._refreshRowElements(this._bufferService.cols, this._bufferService.rows), this._selectionContainer = this._document.createElement("div"), this._selectionContainer.classList.add(Xr), this._selectionContainer.setAttribute("aria-hidden", "true"), this.dimensions = Vo(), this._updateDimensions(), this._register(this._optionsService.onOptionChange(() => this._handleOptionsChanged())), this._register(this._themeService.onChangeColors((f) => this._injectCss(f))), this._injectCss(this._themeService.colors), this._rowFactory = u.createInstance(Vt, document), this._element.classList.add(_s + this._terminalClass), this._screenElement.appendChild(this._rowContainer), this._screenElement.appendChild(this._selectionContainer), this._register(this._linkifier2.onShowLinkUnderline((f) => this._handleLinkHover(f))), this._register(this._linkifier2.onHideLinkUnderline((f) => this._handleLinkLeave(f))), this._register(C(() => {
      this._element.classList.remove(_s + this._terminalClass), this._rowContainer.remove(), this._selectionContainer.remove(), this._widthCache.dispose(), this._themeStyleElement.remove(), this._dimensionsStyleElement.remove();
    })), this._widthCache = new Yr(this._document, this._helperContainer), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
  }
  _updateDimensions() {
    let e = this._coreBrowserService.dpr;
    this.dimensions.device.char.width = this._charSizeService.width * e, this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * e), this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing), this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight), this.dimensions.device.char.left = 0, this.dimensions.device.char.top = 0, this.dimensions.device.canvas.width = this.dimensions.device.cell.width * this._bufferService.cols, this.dimensions.device.canvas.height = this.dimensions.device.cell.height * this._bufferService.rows, this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / e), this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / e), this.dimensions.css.cell.width = this.dimensions.css.canvas.width / this._bufferService.cols, this.dimensions.css.cell.height = this.dimensions.css.canvas.height / this._bufferService.rows;
    for (let r of this._rowElements)
      r.style.width = `${this.dimensions.css.canvas.width}px`, r.style.height = `${this.dimensions.css.cell.height}px`, r.style.lineHeight = `${this.dimensions.css.cell.height}px`, r.style.overflow = "hidden";
    this._dimensionsStyleElement || (this._dimensionsStyleElement = this._document.createElement("style"), this._screenElement.appendChild(this._dimensionsStyleElement));
    let i = `${this._terminalSelector} .${Le} span { display: inline-block; height: 100%; vertical-align: top;}`;
    this._dimensionsStyleElement.textContent = i, this._selectionContainer.style.height = this._viewportElement.style.height, this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`, this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`;
  }
  _injectCss(e) {
    this._themeStyleElement || (this._themeStyleElement = this._document.createElement("style"), this._screenElement.appendChild(this._themeStyleElement));
    let i = `${this._terminalSelector} .${Le} { pointer-events: none; color: ${e.foreground.css}; font-family: ${this._optionsService.rawOptions.fontFamily}; font-size: ${this._optionsService.rawOptions.fontSize}px; font-kerning: none; white-space: pre}`;
    i += `${this._terminalSelector} .${Le} .xterm-dim { color: ${U.multiplyOpacity(e.foreground, 0.5).css};}`, i += `${this._terminalSelector} span:not(.xterm-bold) { font-weight: ${this._optionsService.rawOptions.fontWeight};}${this._terminalSelector} span.xterm-bold { font-weight: ${this._optionsService.rawOptions.fontWeightBold};}${this._terminalSelector} span.xterm-italic { font-style: italic;}`;
    let r = `blink_underline_${this._terminalClass}`, n = `blink_bar_${this._terminalClass}`, o = `blink_block_${this._terminalClass}`;
    i += `@keyframes ${r} { 50% {  border-bottom-style: hidden; }}`, i += `@keyframes ${n} { 50% {  box-shadow: none; }}`, i += `@keyframes ${o} { 0% {  background-color: ${e.cursor.css};  color: ${e.cursorAccent.css}; } 50% {  background-color: inherit;  color: ${e.cursor.css}; }}`, i += `${this._terminalSelector} .${Le}.${ki} .xterm-cursor.xterm-cursor-blink.xterm-cursor-underline { animation: ${r} 1s step-end infinite;}${this._terminalSelector} .${Le}.${ki} .xterm-cursor.xterm-cursor-blink.xterm-cursor-bar { animation: ${n} 1s step-end infinite;}${this._terminalSelector} .${Le}.${ki} .xterm-cursor.xterm-cursor-blink.xterm-cursor-block { animation: ${o} 1s step-end infinite;}${this._terminalSelector} .${Le} .xterm-cursor.xterm-cursor-block { background-color: ${e.cursor.css}; color: ${e.cursorAccent.css};}${this._terminalSelector} .${Le} .xterm-cursor.xterm-cursor-block:not(.xterm-cursor-blink) { background-color: ${e.cursor.css} !important; color: ${e.cursorAccent.css} !important;}${this._terminalSelector} .${Le} .xterm-cursor.xterm-cursor-outline { outline: 1px solid ${e.cursor.css}; outline-offset: -1px;}${this._terminalSelector} .${Le} .xterm-cursor.xterm-cursor-bar { box-shadow: ${this._optionsService.rawOptions.cursorWidth}px 0 0 ${e.cursor.css} inset;}${this._terminalSelector} .${Le} .xterm-cursor.xterm-cursor-underline { border-bottom: 1px ${e.cursor.css}; border-bottom-style: solid; height: calc(100% - 1px);}`, i += `${this._terminalSelector} .${Xr} { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;}${this._terminalSelector}.focus .${Xr} div { position: absolute; background-color: ${e.selectionBackgroundOpaque.css};}${this._terminalSelector} .${Xr} div { position: absolute; background-color: ${e.selectionInactiveBackgroundOpaque.css};}`;
    for (let [l, a] of e.ansi.entries())
      i += `${this._terminalSelector} .${jr}${l} { color: ${a.css}; }${this._terminalSelector} .${jr}${l}.xterm-dim { color: ${U.multiplyOpacity(a, 0.5).css}; }${this._terminalSelector} .${jo}${l} { background-color: ${a.css}; }`;
    i += `${this._terminalSelector} .${jr}${257} { color: ${U.opaque(e.background).css}; }${this._terminalSelector} .${jr}${257}.xterm-dim { color: ${U.multiplyOpacity(U.opaque(e.background), 0.5).css}; }${this._terminalSelector} .${jo}${257} { background-color: ${e.foreground.css}; }`, this._themeStyleElement.textContent = i;
  }
  _setDefaultSpacing() {
    let e = this.dimensions.css.cell.width - this._widthCache.get("W", false, false);
    this._rowContainer.style.letterSpacing = `${e}px`, this._rowFactory.defaultSpacing = e;
  }
  handleDevicePixelRatioChange() {
    this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
  }
  _refreshRowElements(e, i) {
    for (let r = this._rowElements.length;r <= i; r++) {
      let n = this._document.createElement("div");
      this._rowContainer.appendChild(n), this._rowElements.push(n);
    }
    for (;this._rowElements.length > i; )
      this._rowContainer.removeChild(this._rowElements.pop());
  }
  handleResize(e, i) {
    this._refreshRowElements(e, i), this._updateDimensions(), this.handleSelectionChanged(this._selectionRenderModel.selectionStart, this._selectionRenderModel.selectionEnd, this._selectionRenderModel.columnSelectMode);
  }
  handleCharSizeChanged() {
    this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
  }
  handleBlur() {
    this._rowContainer.classList.remove(ki), this.renderRows(0, this._bufferService.rows - 1);
  }
  handleFocus() {
    this._rowContainer.classList.add(ki), this.renderRows(this._bufferService.buffer.y, this._bufferService.buffer.y);
  }
  handleSelectionChanged(e, i, r) {
    if (this._selectionContainer.replaceChildren(), this._rowFactory.handleSelectionChanged(e, i, r), this.renderRows(0, this._bufferService.rows - 1), !e || !i || (this._selectionRenderModel.update(this._terminal, e, i, r), !this._selectionRenderModel.hasSelection))
      return;
    let n = this._selectionRenderModel.viewportStartRow, o = this._selectionRenderModel.viewportEndRow, l = this._selectionRenderModel.viewportCappedStartRow, a = this._selectionRenderModel.viewportCappedEndRow, u = this._document.createDocumentFragment();
    if (r) {
      let h = e[0] > i[0];
      u.appendChild(this._createSelectionElement(l, h ? i[0] : e[0], h ? e[0] : i[0], a - l + 1));
    } else {
      let h = n === l ? e[0] : 0, c = l === o ? i[0] : this._bufferService.cols;
      u.appendChild(this._createSelectionElement(l, h, c));
      let d = a - l - 1;
      if (u.appendChild(this._createSelectionElement(l + 1, 0, this._bufferService.cols, d)), l !== a) {
        let _ = o === a ? i[0] : this._bufferService.cols;
        u.appendChild(this._createSelectionElement(a, 0, _));
      }
    }
    this._selectionContainer.appendChild(u);
  }
  _createSelectionElement(e, i, r, n = 1) {
    let o = this._document.createElement("div"), l = i * this.dimensions.css.cell.width, a = this.dimensions.css.cell.width * (r - i);
    return l + a > this.dimensions.css.canvas.width && (a = this.dimensions.css.canvas.width - l), o.style.height = `${n * this.dimensions.css.cell.height}px`, o.style.top = `${e * this.dimensions.css.cell.height}px`, o.style.left = `${l}px`, o.style.width = `${a}px`, o;
  }
  handleCursorMove() {}
  _handleOptionsChanged() {
    this._updateDimensions(), this._injectCss(this._themeService.colors), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
  }
  clear() {
    for (let e of this._rowElements)
      e.replaceChildren();
  }
  renderRows(e, i) {
    let r = this._bufferService.buffer, n = r.ybase + r.y, o = Math.min(r.x, this._bufferService.cols - 1), l = this._coreService.decPrivateModes.cursorBlink ?? this._optionsService.rawOptions.cursorBlink, a = this._coreService.decPrivateModes.cursorStyle ?? this._optionsService.rawOptions.cursorStyle, u = this._optionsService.rawOptions.cursorInactiveStyle;
    for (let h = e;h <= i; h++) {
      let c = h + r.ydisp, d = this._rowElements[h], _ = r.lines.get(c);
      if (!d || !_)
        break;
      d.replaceChildren(...this._rowFactory.createRow(_, c, c === n, a, u, o, l, this.dimensions.css.cell.width, this._widthCache, -1, -1));
    }
  }
  get _terminalSelector() {
    return `.${_s}${this._terminalClass}`;
  }
  _handleLinkHover(e) {
    this._setCellUnderline(e.x1, e.x2, e.y1, e.y2, e.cols, true);
  }
  _handleLinkLeave(e) {
    this._setCellUnderline(e.x1, e.x2, e.y1, e.y2, e.cols, false);
  }
  _setCellUnderline(e, i, r, n, o, l) {
    r < 0 && (e = 0), n < 0 && (i = 0);
    let a = this._bufferService.rows - 1;
    r = Math.max(Math.min(r, a), 0), n = Math.max(Math.min(n, a), 0), o = Math.min(o, this._bufferService.cols);
    let u = this._bufferService.buffer, h = u.ybase + u.y, c = Math.min(u.x, o - 1), d = this._optionsService.rawOptions.cursorBlink, _ = this._optionsService.rawOptions.cursorStyle, p = this._optionsService.rawOptions.cursorInactiveStyle;
    for (let m = r;m <= n; ++m) {
      let f = m + u.ydisp, A = this._rowElements[m], R = u.lines.get(f);
      if (!A || !R)
        break;
      A.replaceChildren(...this._rowFactory.createRow(R, f, f === h, _, p, c, d, this.dimensions.css.cell.width, this._widthCache, l ? m === r ? e : 0 : -1, l ? (m === n ? i : o) - 1 : -1));
    }
  }
};
Yt = M([S(7, xt), S(8, nt), S(9, H), S(10, F), S(11, ge), S(12, ae), S(13, Re)], Yt);
var jt = class extends D {
  constructor(e, i, r) {
    super();
    this._optionsService = r;
    this.width = 0;
    this.height = 0;
    this._onCharSizeChange = this._register(new v);
    this.onCharSizeChange = this._onCharSizeChange.event;
    try {
      this._measureStrategy = this._register(new vs(this._optionsService));
    } catch {
      this._measureStrategy = this._register(new bs(e, i, this._optionsService));
    }
    this._register(this._optionsService.onMultipleOptionChange(["fontFamily", "fontSize"], () => this.measure()));
  }
  get hasValidSize() {
    return this.width > 0 && this.height > 0;
  }
  measure() {
    let e = this._measureStrategy.measure();
    (e.width !== this.width || e.height !== this.height) && (this.width = e.width, this.height = e.height, this._onCharSizeChange.fire());
  }
};
jt = M([S(2, H)], jt);
var Zr = class extends D {
  constructor() {
    super(...arguments);
    this._result = { width: 0, height: 0 };
  }
  _validateAndSet(e, i) {
    e !== undefined && e > 0 && i !== undefined && i > 0 && (this._result.width = e, this._result.height = i);
  }
};
var bs = class extends Zr {
  constructor(e, i, r) {
    super();
    this._document = e;
    this._parentElement = i;
    this._optionsService = r;
    this._measureElement = this._document.createElement("span"), this._measureElement.classList.add("xterm-char-measure-element"), this._measureElement.textContent = "W".repeat(32), this._measureElement.setAttribute("aria-hidden", "true"), this._measureElement.style.whiteSpace = "pre", this._measureElement.style.fontKerning = "none", this._parentElement.appendChild(this._measureElement);
  }
  measure() {
    return this._measureElement.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._measureElement.style.fontSize = `${this._optionsService.rawOptions.fontSize}px`, this._validateAndSet(Number(this._measureElement.offsetWidth) / 32, Number(this._measureElement.offsetHeight)), this._result;
  }
};
var vs = class extends Zr {
  constructor(e) {
    super();
    this._optionsService = e;
    this._canvas = new OffscreenCanvas(100, 100), this._ctx = this._canvas.getContext("2d");
    let i = this._ctx.measureText("W");
    if (!(("width" in i) && ("fontBoundingBoxAscent" in i) && ("fontBoundingBoxDescent" in i)))
      throw new Error("Required font metrics not supported");
  }
  measure() {
    this._ctx.font = `${this._optionsService.rawOptions.fontSize}px ${this._optionsService.rawOptions.fontFamily}`;
    let e = this._ctx.measureText("W");
    return this._validateAndSet(e.width, e.fontBoundingBoxAscent + e.fontBoundingBoxDescent), this._result;
  }
};
var Jr = class extends D {
  constructor(e, i, r) {
    super();
    this._textarea = e;
    this._window = i;
    this.mainDocument = r;
    this._isFocused = false;
    this._cachedIsFocused = undefined;
    this._screenDprMonitor = this._register(new gs(this._window));
    this._onDprChange = this._register(new v);
    this.onDprChange = this._onDprChange.event;
    this._onWindowChange = this._register(new v);
    this.onWindowChange = this._onWindowChange.event;
    this._register(this.onWindowChange((n) => this._screenDprMonitor.setWindow(n))), this._register($.forward(this._screenDprMonitor.onDprChange, this._onDprChange)), this._register(L(this._textarea, "focus", () => this._isFocused = true)), this._register(L(this._textarea, "blur", () => this._isFocused = false));
  }
  get window() {
    return this._window;
  }
  set window(e) {
    this._window !== e && (this._window = e, this._onWindowChange.fire(this._window));
  }
  get dpr() {
    return this.window.devicePixelRatio;
  }
  get isFocused() {
    return this._cachedIsFocused === undefined && (this._cachedIsFocused = this._isFocused && this._textarea.ownerDocument.hasFocus(), queueMicrotask(() => this._cachedIsFocused = undefined)), this._cachedIsFocused;
  }
};
var gs = class extends D {
  constructor(e) {
    super();
    this._parentWindow = e;
    this._windowResizeListener = this._register(new ye);
    this._onDprChange = this._register(new v);
    this.onDprChange = this._onDprChange.event;
    this._outerListener = () => this._setDprAndFireIfDiffers(), this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this._updateDpr(), this._setWindowResizeListener(), this._register(C(() => this.clearListener()));
  }
  setWindow(e) {
    this._parentWindow = e, this._setWindowResizeListener(), this._setDprAndFireIfDiffers();
  }
  _setWindowResizeListener() {
    this._windowResizeListener.value = L(this._parentWindow, "resize", () => this._setDprAndFireIfDiffers());
  }
  _setDprAndFireIfDiffers() {
    this._parentWindow.devicePixelRatio !== this._currentDevicePixelRatio && this._onDprChange.fire(this._parentWindow.devicePixelRatio), this._updateDpr();
  }
  _updateDpr() {
    this._outerListener && (this._resolutionMediaMatchList?.removeListener(this._outerListener), this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this._resolutionMediaMatchList = this._parentWindow.matchMedia(`screen and (resolution: ${this._parentWindow.devicePixelRatio}dppx)`), this._resolutionMediaMatchList.addListener(this._outerListener));
  }
  clearListener() {
    !this._resolutionMediaMatchList || !this._outerListener || (this._resolutionMediaMatchList.removeListener(this._outerListener), this._resolutionMediaMatchList = undefined, this._outerListener = undefined);
  }
};
var Qr = class extends D {
  constructor() {
    super();
    this.linkProviders = [];
    this._register(C(() => this.linkProviders.length = 0));
  }
  registerLinkProvider(e) {
    return this.linkProviders.push(e), { dispose: () => {
      let i = this.linkProviders.indexOf(e);
      i !== -1 && this.linkProviders.splice(i, 1);
    } };
  }
};
function Ci(s12, t, e) {
  let i = e.getBoundingClientRect(), r = s12.getComputedStyle(e), n = parseInt(r.getPropertyValue("padding-left")), o = parseInt(r.getPropertyValue("padding-top"));
  return [t.clientX - i.left - n, t.clientY - i.top - o];
}
function Xo(s12, t, e, i, r, n, o, l, a) {
  if (!n)
    return;
  let u = Ci(s12, t, e);
  if (u)
    return u[0] = Math.ceil((u[0] + (a ? o / 2 : 0)) / o), u[1] = Math.ceil(u[1] / l), u[0] = Math.min(Math.max(u[0], 1), i + (a ? 1 : 0)), u[1] = Math.min(Math.max(u[1], 1), r), u;
}
var Xt = class {
  constructor(t, e) {
    this._renderService = t;
    this._charSizeService = e;
  }
  getCoords(t, e, i, r, n) {
    return Xo(window, t, e, i, r, this._charSizeService.hasValidSize, this._renderService.dimensions.css.cell.width, this._renderService.dimensions.css.cell.height, n);
  }
  getMouseReportCoords(t, e) {
    let i = Ci(window, t, e);
    if (this._charSizeService.hasValidSize)
      return i[0] = Math.min(Math.max(i[0], 0), this._renderService.dimensions.css.canvas.width - 1), i[1] = Math.min(Math.max(i[1], 0), this._renderService.dimensions.css.canvas.height - 1), { col: Math.floor(i[0] / this._renderService.dimensions.css.cell.width), row: Math.floor(i[1] / this._renderService.dimensions.css.cell.height), x: Math.floor(i[0]), y: Math.floor(i[1]) };
  }
};
Xt = M([S(0, ce), S(1, nt)], Xt);
var en = class {
  constructor(t, e) {
    this._renderCallback = t;
    this._coreBrowserService = e;
    this._refreshCallbacks = [];
  }
  dispose() {
    this._animationFrame && (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), this._animationFrame = undefined);
  }
  addRefreshCallback(t) {
    return this._refreshCallbacks.push(t), this._animationFrame || (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh())), this._animationFrame;
  }
  refresh(t, e, i) {
    this._rowCount = i, t = t !== undefined ? t : 0, e = e !== undefined ? e : this._rowCount - 1, this._rowStart = this._rowStart !== undefined ? Math.min(this._rowStart, t) : t, this._rowEnd = this._rowEnd !== undefined ? Math.max(this._rowEnd, e) : e, !this._animationFrame && (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh()));
  }
  _innerRefresh() {
    if (this._animationFrame = undefined, this._rowStart === undefined || this._rowEnd === undefined || this._rowCount === undefined) {
      this._runRefreshCallbacks();
      return;
    }
    let t = Math.max(this._rowStart, 0), e = Math.min(this._rowEnd, this._rowCount - 1);
    this._rowStart = undefined, this._rowEnd = undefined, this._renderCallback(t, e), this._runRefreshCallbacks();
  }
  _runRefreshCallbacks() {
    for (let t of this._refreshCallbacks)
      t(0);
    this._refreshCallbacks = [];
  }
};
var tn = {};
Ll(tn, { getSafariVersion: () => Ha, isChromeOS: () => Ts, isFirefox: () => Ss, isIpad: () => Wa, isIphone: () => Ua, isLegacyEdge: () => Fa, isLinux: () => Bi, isMac: () => Zt, isNode: () => Mi, isSafari: () => Zo, isWindows: () => Es });
var Mi = typeof process < "u" && "title" in process;
var Pi = Mi ? "node" : navigator.userAgent;
var Oi = Mi ? "node" : navigator.platform;
var Ss = Pi.includes("Firefox");
var Fa = Pi.includes("Edge");
var Zo = /^((?!chrome|android).)*safari/i.test(Pi);
function Ha() {
  if (!Zo)
    return 0;
  let s12 = Pi.match(/Version\/(\d+)/);
  return s12 === null || s12.length < 2 ? 0 : parseInt(s12[1]);
}
var Zt = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(Oi);
var Wa = Oi === "iPad";
var Ua = Oi === "iPhone";
var Es = ["Windows", "Win16", "Win32", "WinCE"].includes(Oi);
var Bi = Oi.indexOf("Linux") >= 0;
var Ts = /\bCrOS\b/.test(Pi);
var rn = class {
  constructor() {
    this._tasks = [];
    this._i = 0;
  }
  enqueue(t) {
    this._tasks.push(t), this._start();
  }
  flush() {
    for (;this._i < this._tasks.length; )
      this._tasks[this._i]() || this._i++;
    this.clear();
  }
  clear() {
    this._idleCallback && (this._cancelCallback(this._idleCallback), this._idleCallback = undefined), this._i = 0, this._tasks.length = 0;
  }
  _start() {
    this._idleCallback || (this._idleCallback = this._requestCallback(this._process.bind(this)));
  }
  _process(t) {
    this._idleCallback = undefined;
    let e = 0, i = 0, r = t.timeRemaining(), n = 0;
    for (;this._i < this._tasks.length; ) {
      if (e = performance.now(), this._tasks[this._i]() || this._i++, e = Math.max(1, performance.now() - e), i = Math.max(e, i), n = t.timeRemaining(), i * 1.5 > n) {
        r - e < -20 && console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(r - e))}ms`), this._start();
        return;
      }
      r = n;
    }
    this.clear();
  }
};
var Is = class extends rn {
  _requestCallback(t) {
    return setTimeout(() => t(this._createDeadline(16)));
  }
  _cancelCallback(t) {
    clearTimeout(t);
  }
  _createDeadline(t) {
    let e = performance.now() + t;
    return { timeRemaining: () => Math.max(0, e - performance.now()) };
  }
};
var ys = class extends rn {
  _requestCallback(t) {
    return requestIdleCallback(t);
  }
  _cancelCallback(t) {
    cancelIdleCallback(t);
  }
};
var Jt = !Mi && "requestIdleCallback" in window ? ys : Is;
var nn = class {
  constructor() {
    this._queue = new Jt;
  }
  set(t) {
    this._queue.clear(), this._queue.enqueue(t);
  }
  flush() {
    this._queue.flush();
  }
};
var Qt = class extends D {
  constructor(e, i, r, n, o, l, a, u, h) {
    super();
    this._rowCount = e;
    this._optionsService = r;
    this._charSizeService = n;
    this._coreService = o;
    this._coreBrowserService = u;
    this._renderer = this._register(new ye);
    this._pausedResizeTask = new nn;
    this._observerDisposable = this._register(new ye);
    this._isPaused = false;
    this._needsFullRefresh = false;
    this._isNextRenderRedrawOnly = true;
    this._needsSelectionRefresh = false;
    this._canvasWidth = 0;
    this._canvasHeight = 0;
    this._selectionState = { start: undefined, end: undefined, columnSelectMode: false };
    this._onDimensionsChange = this._register(new v);
    this.onDimensionsChange = this._onDimensionsChange.event;
    this._onRenderedViewportChange = this._register(new v);
    this.onRenderedViewportChange = this._onRenderedViewportChange.event;
    this._onRender = this._register(new v);
    this.onRender = this._onRender.event;
    this._onRefreshRequest = this._register(new v);
    this.onRefreshRequest = this._onRefreshRequest.event;
    this._renderDebouncer = new en((c, d) => this._renderRows(c, d), this._coreBrowserService), this._register(this._renderDebouncer), this._syncOutputHandler = new xs(this._coreBrowserService, this._coreService, () => this._fullRefresh()), this._register(C(() => this._syncOutputHandler.dispose())), this._register(this._coreBrowserService.onDprChange(() => this.handleDevicePixelRatioChange())), this._register(a.onResize(() => this._fullRefresh())), this._register(a.buffers.onBufferActivate(() => this._renderer.value?.clear())), this._register(this._optionsService.onOptionChange(() => this._handleOptionsChanged())), this._register(this._charSizeService.onCharSizeChange(() => this.handleCharSizeChanged())), this._register(l.onDecorationRegistered(() => this._fullRefresh())), this._register(l.onDecorationRemoved(() => this._fullRefresh())), this._register(this._optionsService.onMultipleOptionChange(["customGlyphs", "drawBoldTextInBrightColors", "letterSpacing", "lineHeight", "fontFamily", "fontSize", "fontWeight", "fontWeightBold", "minimumContrastRatio", "rescaleOverlappingGlyphs"], () => {
      this.clear(), this.handleResize(a.cols, a.rows), this._fullRefresh();
    })), this._register(this._optionsService.onMultipleOptionChange(["cursorBlink", "cursorStyle"], () => this.refreshRows(a.buffer.y, a.buffer.y, true))), this._register(h.onChangeColors(() => this._fullRefresh())), this._registerIntersectionObserver(this._coreBrowserService.window, i), this._register(this._coreBrowserService.onWindowChange((c) => this._registerIntersectionObserver(c, i)));
  }
  get dimensions() {
    return this._renderer.value.dimensions;
  }
  _registerIntersectionObserver(e, i) {
    if ("IntersectionObserver" in e) {
      let r = new e.IntersectionObserver((n) => this._handleIntersectionChange(n[n.length - 1]), { threshold: 0 });
      r.observe(i), this._observerDisposable.value = C(() => r.disconnect());
    }
  }
  _handleIntersectionChange(e) {
    this._isPaused = e.isIntersecting === undefined ? e.intersectionRatio === 0 : !e.isIntersecting, !this._isPaused && !this._charSizeService.hasValidSize && this._charSizeService.measure(), !this._isPaused && this._needsFullRefresh && (this._pausedResizeTask.flush(), this.refreshRows(0, this._rowCount - 1), this._needsFullRefresh = false);
  }
  refreshRows(e, i, r = false) {
    if (this._isPaused) {
      this._needsFullRefresh = true;
      return;
    }
    if (this._coreService.decPrivateModes.synchronizedOutput) {
      this._syncOutputHandler.bufferRows(e, i);
      return;
    }
    let n = this._syncOutputHandler.flush();
    n && (e = Math.min(e, n.start), i = Math.max(i, n.end)), r || (this._isNextRenderRedrawOnly = false), this._renderDebouncer.refresh(e, i, this._rowCount);
  }
  _renderRows(e, i) {
    if (this._renderer.value) {
      if (this._coreService.decPrivateModes.synchronizedOutput) {
        this._syncOutputHandler.bufferRows(e, i);
        return;
      }
      e = Math.min(e, this._rowCount - 1), i = Math.min(i, this._rowCount - 1), this._renderer.value.renderRows(e, i), this._needsSelectionRefresh && (this._renderer.value.handleSelectionChanged(this._selectionState.start, this._selectionState.end, this._selectionState.columnSelectMode), this._needsSelectionRefresh = false), this._isNextRenderRedrawOnly || this._onRenderedViewportChange.fire({ start: e, end: i }), this._onRender.fire({ start: e, end: i }), this._isNextRenderRedrawOnly = true;
    }
  }
  resize(e, i) {
    this._rowCount = i, this._fireOnCanvasResize();
  }
  _handleOptionsChanged() {
    this._renderer.value && (this.refreshRows(0, this._rowCount - 1), this._fireOnCanvasResize());
  }
  _fireOnCanvasResize() {
    this._renderer.value && (this._renderer.value.dimensions.css.canvas.width === this._canvasWidth && this._renderer.value.dimensions.css.canvas.height === this._canvasHeight || this._onDimensionsChange.fire(this._renderer.value.dimensions));
  }
  hasRenderer() {
    return !!this._renderer.value;
  }
  setRenderer(e) {
    this._renderer.value = e, this._renderer.value && (this._renderer.value.onRequestRedraw((i) => this.refreshRows(i.start, i.end, true)), this._needsSelectionRefresh = true, this._fullRefresh());
  }
  addRefreshCallback(e) {
    return this._renderDebouncer.addRefreshCallback(e);
  }
  _fullRefresh() {
    this._isPaused ? this._needsFullRefresh = true : this.refreshRows(0, this._rowCount - 1);
  }
  clearTextureAtlas() {
    this._renderer.value && (this._renderer.value.clearTextureAtlas?.(), this._fullRefresh());
  }
  handleDevicePixelRatioChange() {
    this._charSizeService.measure(), this._renderer.value && (this._renderer.value.handleDevicePixelRatioChange(), this.refreshRows(0, this._rowCount - 1));
  }
  handleResize(e, i) {
    this._renderer.value && (this._isPaused ? this._pausedResizeTask.set(() => this._renderer.value?.handleResize(e, i)) : this._renderer.value.handleResize(e, i), this._fullRefresh());
  }
  handleCharSizeChanged() {
    this._renderer.value?.handleCharSizeChanged();
  }
  handleBlur() {
    this._renderer.value?.handleBlur();
  }
  handleFocus() {
    this._renderer.value?.handleFocus();
  }
  handleSelectionChanged(e, i, r) {
    this._selectionState.start = e, this._selectionState.end = i, this._selectionState.columnSelectMode = r, this._renderer.value?.handleSelectionChanged(e, i, r);
  }
  handleCursorMove() {
    this._renderer.value?.handleCursorMove();
  }
  clear() {
    this._renderer.value?.clear();
  }
};
Qt = M([S(2, H), S(3, nt), S(4, ge), S(5, Be), S(6, F), S(7, ae), S(8, Re)], Qt);
var xs = class {
  constructor(t, e, i) {
    this._coreBrowserService = t;
    this._coreService = e;
    this._onTimeout = i;
    this._start = 0;
    this._end = 0;
    this._isBuffering = false;
  }
  bufferRows(t, e) {
    this._isBuffering ? (this._start = Math.min(this._start, t), this._end = Math.max(this._end, e)) : (this._start = t, this._end = e, this._isBuffering = true), this._timeout === undefined && (this._timeout = this._coreBrowserService.window.setTimeout(() => {
      this._timeout = undefined, this._coreService.decPrivateModes.synchronizedOutput = false, this._onTimeout();
    }, 1000));
  }
  flush() {
    if (this._timeout !== undefined && (this._coreBrowserService.window.clearTimeout(this._timeout), this._timeout = undefined), !this._isBuffering)
      return;
    let t = { start: this._start, end: this._end };
    return this._isBuffering = false, t;
  }
  dispose() {
    this._timeout !== undefined && (this._coreBrowserService.window.clearTimeout(this._timeout), this._timeout = undefined);
  }
};
function Jo(s12, t, e, i) {
  let r = e.buffer.x, n = e.buffer.y;
  if (!e.buffer.hasScrollback)
    return Ga(r, n, s12, t, e, i) + sn(n, t, e, i) + $a(r, n, s12, t, e, i);
  let o;
  if (n === t)
    return o = r > s12 ? "D" : "C", Fi(Math.abs(r - s12), Ni(o, i));
  o = n > t ? "D" : "C";
  let l = Math.abs(n - t), a = za(n > t ? s12 : r, e) + (l - 1) * e.cols + 1 + Ka(n > t ? r : s12, e);
  return Fi(a, Ni(o, i));
}
function Ka(s12, t) {
  return s12 - 1;
}
function za(s12, t) {
  return t.cols - s12;
}
function Ga(s12, t, e, i, r, n) {
  return sn(t, i, r, n).length === 0 ? "" : Fi(el(s12, t, s12, t - gt(t, r), false, r).length, Ni("D", n));
}
function sn(s12, t, e, i) {
  let r = s12 - gt(s12, e), n = t - gt(t, e), o = Math.abs(r - n) - Va(s12, t, e);
  return Fi(o, Ni(Qo(s12, t), i));
}
function $a(s12, t, e, i, r, n) {
  let o;
  sn(t, i, r, n).length > 0 ? o = i - gt(i, r) : o = t;
  let l = i, a = qa(s12, t, e, i, r, n);
  return Fi(el(s12, o, e, l, a === "C", r).length, Ni(a, n));
}
function Va(s12, t, e) {
  let i = 0, r = s12 - gt(s12, e), n = t - gt(t, e);
  for (let o = 0;o < Math.abs(r - n); o++) {
    let l = Qo(s12, t) === "A" ? -1 : 1;
    e.buffer.lines.get(r + l * o)?.isWrapped && i++;
  }
  return i;
}
function gt(s12, t) {
  let e = 0, i = t.buffer.lines.get(s12), r = i?.isWrapped;
  for (;r && s12 >= 0 && s12 < t.rows; )
    e++, i = t.buffer.lines.get(--s12), r = i?.isWrapped;
  return e;
}
function qa(s12, t, e, i, r, n) {
  let o;
  return sn(e, i, r, n).length > 0 ? o = i - gt(i, r) : o = t, s12 < e && o <= i || s12 >= e && o < i ? "C" : "D";
}
function Qo(s12, t) {
  return s12 > t ? "A" : "B";
}
function el(s12, t, e, i, r, n) {
  let o = s12, l = t, a = "";
  for (;(o !== e || l !== i) && l >= 0 && l < n.buffer.lines.length; )
    o += r ? 1 : -1, r && o > n.cols - 1 ? (a += n.buffer.translateBufferLineToString(l, false, s12, o), o = 0, s12 = 0, l++) : !r && o < 0 && (a += n.buffer.translateBufferLineToString(l, false, 0, s12 + 1), o = n.cols - 1, s12 = o, l--);
  return a + n.buffer.translateBufferLineToString(l, false, s12, o);
}
function Ni(s12, t) {
  let e = t ? "O" : "[";
  return b.ESC + e + s12;
}
function Fi(s12, t) {
  s12 = Math.floor(s12);
  let e = "";
  for (let i = 0;i < s12; i++)
    e += t;
  return e;
}
var on = class {
  constructor(t) {
    this._bufferService = t;
    this.isSelectAllActive = false;
    this.selectionStartLength = 0;
  }
  clearSelection() {
    this.selectionStart = undefined, this.selectionEnd = undefined, this.isSelectAllActive = false, this.selectionStartLength = 0;
  }
  get finalSelectionStart() {
    return this.isSelectAllActive ? [0, 0] : !this.selectionEnd || !this.selectionStart ? this.selectionStart : this.areSelectionValuesReversed() ? this.selectionEnd : this.selectionStart;
  }
  get finalSelectionEnd() {
    if (this.isSelectAllActive)
      return [this._bufferService.cols, this._bufferService.buffer.ybase + this._bufferService.rows - 1];
    if (this.selectionStart) {
      if (!this.selectionEnd || this.areSelectionValuesReversed()) {
        let t = this.selectionStart[0] + this.selectionStartLength;
        return t > this._bufferService.cols ? t % this._bufferService.cols === 0 ? [this._bufferService.cols, this.selectionStart[1] + Math.floor(t / this._bufferService.cols) - 1] : [t % this._bufferService.cols, this.selectionStart[1] + Math.floor(t / this._bufferService.cols)] : [t, this.selectionStart[1]];
      }
      if (this.selectionStartLength && this.selectionEnd[1] === this.selectionStart[1]) {
        let t = this.selectionStart[0] + this.selectionStartLength;
        return t > this._bufferService.cols ? [t % this._bufferService.cols, this.selectionStart[1] + Math.floor(t / this._bufferService.cols)] : [Math.max(t, this.selectionEnd[0]), this.selectionEnd[1]];
      }
      return this.selectionEnd;
    }
  }
  areSelectionValuesReversed() {
    let t = this.selectionStart, e = this.selectionEnd;
    return !t || !e ? false : t[1] > e[1] || t[1] === e[1] && t[0] > e[0];
  }
  handleTrim(t) {
    return this.selectionStart && (this.selectionStart[1] -= t), this.selectionEnd && (this.selectionEnd[1] -= t), this.selectionEnd && this.selectionEnd[1] < 0 ? (this.clearSelection(), true) : (this.selectionStart && this.selectionStart[1] < 0 && (this.selectionStart[1] = 0), false);
  }
};
function ws(s12, t) {
  if (s12.start.y > s12.end.y)
    throw new Error(`Buffer range end (${s12.end.x}, ${s12.end.y}) cannot be before start (${s12.start.x}, ${s12.start.y})`);
  return t * (s12.end.y - s12.start.y) + (s12.end.x - s12.start.x + 1);
}
var Ds = 50;
var Ya = 15;
var ja = 50;
var Xa = 500;
var Za = " ";
var Ja = new RegExp(Za, "g");
var ei = class extends D {
  constructor(e, i, r, n, o, l, a, u, h) {
    super();
    this._element = e;
    this._screenElement = i;
    this._linkifier = r;
    this._bufferService = n;
    this._coreService = o;
    this._mouseService = l;
    this._optionsService = a;
    this._renderService = u;
    this._coreBrowserService = h;
    this._dragScrollAmount = 0;
    this._enabled = true;
    this._workCell = new q;
    this._mouseDownTimeStamp = 0;
    this._oldHasSelection = false;
    this._oldSelectionStart = undefined;
    this._oldSelectionEnd = undefined;
    this._onLinuxMouseSelection = this._register(new v);
    this.onLinuxMouseSelection = this._onLinuxMouseSelection.event;
    this._onRedrawRequest = this._register(new v);
    this.onRequestRedraw = this._onRedrawRequest.event;
    this._onSelectionChange = this._register(new v);
    this.onSelectionChange = this._onSelectionChange.event;
    this._onRequestScrollLines = this._register(new v);
    this.onRequestScrollLines = this._onRequestScrollLines.event;
    this._mouseMoveListener = (c) => this._handleMouseMove(c), this._mouseUpListener = (c) => this._handleMouseUp(c), this._coreService.onUserInput(() => {
      this.hasSelection && this.clearSelection();
    }), this._trimListener = this._bufferService.buffer.lines.onTrim((c) => this._handleTrim(c)), this._register(this._bufferService.buffers.onBufferActivate((c) => this._handleBufferActivate(c))), this.enable(), this._model = new on(this._bufferService), this._activeSelectionMode = 0, this._register(C(() => {
      this._removeMouseDownListeners();
    })), this._register(this._bufferService.onResize((c) => {
      c.rowsChanged && this.clearSelection();
    }));
  }
  reset() {
    this.clearSelection();
  }
  disable() {
    this.clearSelection(), this._enabled = false;
  }
  enable() {
    this._enabled = true;
  }
  get selectionStart() {
    return this._model.finalSelectionStart;
  }
  get selectionEnd() {
    return this._model.finalSelectionEnd;
  }
  get hasSelection() {
    let e = this._model.finalSelectionStart, i = this._model.finalSelectionEnd;
    return !e || !i ? false : e[0] !== i[0] || e[1] !== i[1];
  }
  get selectionText() {
    let e = this._model.finalSelectionStart, i = this._model.finalSelectionEnd;
    if (!e || !i)
      return "";
    let r = this._bufferService.buffer, n = [];
    if (this._activeSelectionMode === 3) {
      if (e[0] === i[0])
        return "";
      let l = e[0] < i[0] ? e[0] : i[0], a = e[0] < i[0] ? i[0] : e[0];
      for (let u = e[1];u <= i[1]; u++) {
        let h = r.translateBufferLineToString(u, true, l, a);
        n.push(h);
      }
    } else {
      let l = e[1] === i[1] ? i[0] : undefined;
      n.push(r.translateBufferLineToString(e[1], true, e[0], l));
      for (let a = e[1] + 1;a <= i[1] - 1; a++) {
        let u = r.lines.get(a), h = r.translateBufferLineToString(a, true);
        u?.isWrapped ? n[n.length - 1] += h : n.push(h);
      }
      if (e[1] !== i[1]) {
        let a = r.lines.get(i[1]), u = r.translateBufferLineToString(i[1], true, 0, i[0]);
        a && a.isWrapped ? n[n.length - 1] += u : n.push(u);
      }
    }
    return n.map((l) => l.replace(Ja, " ")).join(Es ? `\r
` : `
`);
  }
  clearSelection() {
    this._model.clearSelection(), this._removeMouseDownListeners(), this.refresh(), this._onSelectionChange.fire();
  }
  refresh(e) {
    this._refreshAnimationFrame || (this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._refresh())), Bi && e && this.selectionText.length && this._onLinuxMouseSelection.fire(this.selectionText);
  }
  _refresh() {
    this._refreshAnimationFrame = undefined, this._onRedrawRequest.fire({ start: this._model.finalSelectionStart, end: this._model.finalSelectionEnd, columnSelectMode: this._activeSelectionMode === 3 });
  }
  _isClickInSelection(e) {
    let i = this._getMouseBufferCoords(e), r = this._model.finalSelectionStart, n = this._model.finalSelectionEnd;
    return !r || !n || !i ? false : this._areCoordsInSelection(i, r, n);
  }
  isCellInSelection(e, i) {
    let r = this._model.finalSelectionStart, n = this._model.finalSelectionEnd;
    return !r || !n ? false : this._areCoordsInSelection([e, i], r, n);
  }
  _areCoordsInSelection(e, i, r) {
    return e[1] > i[1] && e[1] < r[1] || i[1] === r[1] && e[1] === i[1] && e[0] >= i[0] && e[0] < r[0] || i[1] < r[1] && e[1] === r[1] && e[0] < r[0] || i[1] < r[1] && e[1] === i[1] && e[0] >= i[0];
  }
  _selectWordAtCursor(e, i) {
    let r = this._linkifier.currentLink?.link?.range;
    if (r)
      return this._model.selectionStart = [r.start.x - 1, r.start.y - 1], this._model.selectionStartLength = ws(r, this._bufferService.cols), this._model.selectionEnd = undefined, true;
    let n = this._getMouseBufferCoords(e);
    return n ? (this._selectWordAt(n, i), this._model.selectionEnd = undefined, true) : false;
  }
  selectAll() {
    this._model.isSelectAllActive = true, this.refresh(), this._onSelectionChange.fire();
  }
  selectLines(e, i) {
    this._model.clearSelection(), e = Math.max(e, 0), i = Math.min(i, this._bufferService.buffer.lines.length - 1), this._model.selectionStart = [0, e], this._model.selectionEnd = [this._bufferService.cols, i], this.refresh(), this._onSelectionChange.fire();
  }
  _handleTrim(e) {
    this._model.handleTrim(e) && this.refresh();
  }
  _getMouseBufferCoords(e) {
    let i = this._mouseService.getCoords(e, this._screenElement, this._bufferService.cols, this._bufferService.rows, true);
    if (i)
      return i[0]--, i[1]--, i[1] += this._bufferService.buffer.ydisp, i;
  }
  _getMouseEventScrollAmount(e) {
    let i = Ci(this._coreBrowserService.window, e, this._screenElement)[1], r = this._renderService.dimensions.css.canvas.height;
    return i >= 0 && i <= r ? 0 : (i > r && (i -= r), i = Math.min(Math.max(i, -Ds), Ds), i /= Ds, i / Math.abs(i) + Math.round(i * (Ya - 1)));
  }
  shouldForceSelection(e) {
    return Zt ? e.altKey && this._optionsService.rawOptions.macOptionClickForcesSelection : e.shiftKey;
  }
  handleMouseDown(e) {
    if (this._mouseDownTimeStamp = e.timeStamp, !(e.button === 2 && this.hasSelection) && e.button === 0) {
      if (!this._enabled) {
        if (!this.shouldForceSelection(e))
          return;
        e.stopPropagation();
      }
      e.preventDefault(), this._dragScrollAmount = 0, this._enabled && e.shiftKey ? this._handleIncrementalClick(e) : e.detail === 1 ? this._handleSingleClick(e) : e.detail === 2 ? this._handleDoubleClick(e) : e.detail === 3 && this._handleTripleClick(e), this._addMouseDownListeners(), this.refresh(true);
    }
  }
  _addMouseDownListeners() {
    this._screenElement.ownerDocument && (this._screenElement.ownerDocument.addEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.addEventListener("mouseup", this._mouseUpListener)), this._dragScrollIntervalTimer = this._coreBrowserService.window.setInterval(() => this._dragScroll(), ja);
  }
  _removeMouseDownListeners() {
    this._screenElement.ownerDocument && (this._screenElement.ownerDocument.removeEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.removeEventListener("mouseup", this._mouseUpListener)), this._coreBrowserService.window.clearInterval(this._dragScrollIntervalTimer), this._dragScrollIntervalTimer = undefined;
  }
  _handleIncrementalClick(e) {
    this._model.selectionStart && (this._model.selectionEnd = this._getMouseBufferCoords(e));
  }
  _handleSingleClick(e) {
    if (this._model.selectionStartLength = 0, this._model.isSelectAllActive = false, this._activeSelectionMode = this.shouldColumnSelect(e) ? 3 : 0, this._model.selectionStart = this._getMouseBufferCoords(e), !this._model.selectionStart)
      return;
    this._model.selectionEnd = undefined;
    let i = this._bufferService.buffer.lines.get(this._model.selectionStart[1]);
    i && i.length !== this._model.selectionStart[0] && i.hasWidth(this._model.selectionStart[0]) === 0 && this._model.selectionStart[0]++;
  }
  _handleDoubleClick(e) {
    this._selectWordAtCursor(e, true) && (this._activeSelectionMode = 1);
  }
  _handleTripleClick(e) {
    let i = this._getMouseBufferCoords(e);
    i && (this._activeSelectionMode = 2, this._selectLineAt(i[1]));
  }
  shouldColumnSelect(e) {
    return e.altKey && !(Zt && this._optionsService.rawOptions.macOptionClickForcesSelection);
  }
  _handleMouseMove(e) {
    if (e.stopImmediatePropagation(), !this._model.selectionStart)
      return;
    let i = this._model.selectionEnd ? [this._model.selectionEnd[0], this._model.selectionEnd[1]] : null;
    if (this._model.selectionEnd = this._getMouseBufferCoords(e), !this._model.selectionEnd) {
      this.refresh(true);
      return;
    }
    this._activeSelectionMode === 2 ? this._model.selectionEnd[1] < this._model.selectionStart[1] ? this._model.selectionEnd[0] = 0 : this._model.selectionEnd[0] = this._bufferService.cols : this._activeSelectionMode === 1 && this._selectToWordAt(this._model.selectionEnd), this._dragScrollAmount = this._getMouseEventScrollAmount(e), this._activeSelectionMode !== 3 && (this._dragScrollAmount > 0 ? this._model.selectionEnd[0] = this._bufferService.cols : this._dragScrollAmount < 0 && (this._model.selectionEnd[0] = 0));
    let r = this._bufferService.buffer;
    if (this._model.selectionEnd[1] < r.lines.length) {
      let n = r.lines.get(this._model.selectionEnd[1]);
      n && n.hasWidth(this._model.selectionEnd[0]) === 0 && this._model.selectionEnd[0] < this._bufferService.cols && this._model.selectionEnd[0]++;
    }
    (!i || i[0] !== this._model.selectionEnd[0] || i[1] !== this._model.selectionEnd[1]) && this.refresh(true);
  }
  _dragScroll() {
    if (!(!this._model.selectionEnd || !this._model.selectionStart) && this._dragScrollAmount) {
      this._onRequestScrollLines.fire({ amount: this._dragScrollAmount, suppressScrollEvent: false });
      let e = this._bufferService.buffer;
      this._dragScrollAmount > 0 ? (this._activeSelectionMode !== 3 && (this._model.selectionEnd[0] = this._bufferService.cols), this._model.selectionEnd[1] = Math.min(e.ydisp + this._bufferService.rows, e.lines.length - 1)) : (this._activeSelectionMode !== 3 && (this._model.selectionEnd[0] = 0), this._model.selectionEnd[1] = e.ydisp), this.refresh();
    }
  }
  _handleMouseUp(e) {
    let i = e.timeStamp - this._mouseDownTimeStamp;
    if (this._removeMouseDownListeners(), this.selectionText.length <= 1 && i < Xa && e.altKey && this._optionsService.rawOptions.altClickMovesCursor) {
      if (this._bufferService.buffer.ybase === this._bufferService.buffer.ydisp) {
        let r = this._mouseService.getCoords(e, this._element, this._bufferService.cols, this._bufferService.rows, false);
        if (r && r[0] !== undefined && r[1] !== undefined) {
          let n = Jo(r[0] - 1, r[1] - 1, this._bufferService, this._coreService.decPrivateModes.applicationCursorKeys);
          this._coreService.triggerDataEvent(n, true);
        }
      }
    } else
      this._fireEventIfSelectionChanged();
  }
  _fireEventIfSelectionChanged() {
    let e = this._model.finalSelectionStart, i = this._model.finalSelectionEnd, r = !!e && !!i && (e[0] !== i[0] || e[1] !== i[1]);
    if (!r) {
      this._oldHasSelection && this._fireOnSelectionChange(e, i, r);
      return;
    }
    !e || !i || (!this._oldSelectionStart || !this._oldSelectionEnd || e[0] !== this._oldSelectionStart[0] || e[1] !== this._oldSelectionStart[1] || i[0] !== this._oldSelectionEnd[0] || i[1] !== this._oldSelectionEnd[1]) && this._fireOnSelectionChange(e, i, r);
  }
  _fireOnSelectionChange(e, i, r) {
    this._oldSelectionStart = e, this._oldSelectionEnd = i, this._oldHasSelection = r, this._onSelectionChange.fire();
  }
  _handleBufferActivate(e) {
    this.clearSelection(), this._trimListener.dispose(), this._trimListener = e.activeBuffer.lines.onTrim((i) => this._handleTrim(i));
  }
  _convertViewportColToCharacterIndex(e, i) {
    let r = i;
    for (let n = 0;i >= n; n++) {
      let o = e.loadCell(n, this._workCell).getChars().length;
      this._workCell.getWidth() === 0 ? r-- : o > 1 && i !== n && (r += o - 1);
    }
    return r;
  }
  setSelection(e, i, r) {
    this._model.clearSelection(), this._removeMouseDownListeners(), this._model.selectionStart = [e, i], this._model.selectionStartLength = r, this.refresh(), this._fireEventIfSelectionChanged();
  }
  rightClickSelect(e) {
    this._isClickInSelection(e) || (this._selectWordAtCursor(e, false) && this.refresh(true), this._fireEventIfSelectionChanged());
  }
  _getWordAt(e, i, r = true, n = true) {
    if (e[0] >= this._bufferService.cols)
      return;
    let o = this._bufferService.buffer, l = o.lines.get(e[1]);
    if (!l)
      return;
    let a = o.translateBufferLineToString(e[1], false), u = this._convertViewportColToCharacterIndex(l, e[0]), h = u, c = e[0] - u, d = 0, _ = 0, p = 0, m = 0;
    if (a.charAt(u) === " ") {
      for (;u > 0 && a.charAt(u - 1) === " "; )
        u--;
      for (;h < a.length && a.charAt(h + 1) === " "; )
        h++;
    } else {
      let R = e[0], O = e[0];
      l.getWidth(R) === 0 && (d++, R--), l.getWidth(O) === 2 && (_++, O++);
      let I = l.getString(O).length;
      for (I > 1 && (m += I - 1, h += I - 1);R > 0 && u > 0 && !this._isCharWordSeparator(l.loadCell(R - 1, this._workCell)); ) {
        l.loadCell(R - 1, this._workCell);
        let k = this._workCell.getChars().length;
        this._workCell.getWidth() === 0 ? (d++, R--) : k > 1 && (p += k - 1, u -= k - 1), u--, R--;
      }
      for (;O < l.length && h + 1 < a.length && !this._isCharWordSeparator(l.loadCell(O + 1, this._workCell)); ) {
        l.loadCell(O + 1, this._workCell);
        let k = this._workCell.getChars().length;
        this._workCell.getWidth() === 2 ? (_++, O++) : k > 1 && (m += k - 1, h += k - 1), h++, O++;
      }
    }
    h++;
    let f = u + c - d + p, A = Math.min(this._bufferService.cols, h - u + d + _ - p - m);
    if (!(!i && a.slice(u, h).trim() === "")) {
      if (r && f === 0 && l.getCodePoint(0) !== 32) {
        let R = o.lines.get(e[1] - 1);
        if (R && l.isWrapped && R.getCodePoint(this._bufferService.cols - 1) !== 32) {
          let O = this._getWordAt([this._bufferService.cols - 1, e[1] - 1], false, true, false);
          if (O) {
            let I = this._bufferService.cols - O.start;
            f -= I, A += I;
          }
        }
      }
      if (n && f + A === this._bufferService.cols && l.getCodePoint(this._bufferService.cols - 1) !== 32) {
        let R = o.lines.get(e[1] + 1);
        if (R?.isWrapped && R.getCodePoint(0) !== 32) {
          let O = this._getWordAt([0, e[1] + 1], false, false, true);
          O && (A += O.length);
        }
      }
      return { start: f, length: A };
    }
  }
  _selectWordAt(e, i) {
    let r = this._getWordAt(e, i);
    if (r) {
      for (;r.start < 0; )
        r.start += this._bufferService.cols, e[1]--;
      this._model.selectionStart = [r.start, e[1]], this._model.selectionStartLength = r.length;
    }
  }
  _selectToWordAt(e) {
    let i = this._getWordAt(e, true);
    if (i) {
      let r = e[1];
      for (;i.start < 0; )
        i.start += this._bufferService.cols, r--;
      if (!this._model.areSelectionValuesReversed())
        for (;i.start + i.length > this._bufferService.cols; )
          i.length -= this._bufferService.cols, r++;
      this._model.selectionEnd = [this._model.areSelectionValuesReversed() ? i.start : i.start + i.length, r];
    }
  }
  _isCharWordSeparator(e) {
    return e.getWidth() === 0 ? false : this._optionsService.rawOptions.wordSeparator.indexOf(e.getChars()) >= 0;
  }
  _selectLineAt(e) {
    let i = this._bufferService.buffer.getWrappedRangeForLine(e), r = { start: { x: 0, y: i.first }, end: { x: this._bufferService.cols - 1, y: i.last } };
    this._model.selectionStart = [0, i.first], this._model.selectionEnd = undefined, this._model.selectionStartLength = ws(r, this._bufferService.cols);
  }
};
ei = M([S(3, F), S(4, ge), S(5, Dt), S(6, H), S(7, ce), S(8, ae)], ei);
var Hi = class {
  constructor() {
    this._data = {};
  }
  set(t, e, i) {
    this._data[t] || (this._data[t] = {}), this._data[t][e] = i;
  }
  get(t, e) {
    return this._data[t] ? this._data[t][e] : undefined;
  }
  clear() {
    this._data = {};
  }
};
var Wi = class {
  constructor() {
    this._color = new Hi;
    this._css = new Hi;
  }
  setCss(t, e, i) {
    this._css.set(t, e, i);
  }
  getCss(t, e) {
    return this._css.get(t, e);
  }
  setColor(t, e, i) {
    this._color.set(t, e, i);
  }
  getColor(t, e) {
    return this._color.get(t, e);
  }
  clear() {
    this._color.clear(), this._css.clear();
  }
};
var re = Object.freeze((() => {
  let s12 = [z.toColor("#2e3436"), z.toColor("#cc0000"), z.toColor("#4e9a06"), z.toColor("#c4a000"), z.toColor("#3465a4"), z.toColor("#75507b"), z.toColor("#06989a"), z.toColor("#d3d7cf"), z.toColor("#555753"), z.toColor("#ef2929"), z.toColor("#8ae234"), z.toColor("#fce94f"), z.toColor("#729fcf"), z.toColor("#ad7fa8"), z.toColor("#34e2e2"), z.toColor("#eeeeec")], t = [0, 95, 135, 175, 215, 255];
  for (let e = 0;e < 216; e++) {
    let i = t[e / 36 % 6 | 0], r = t[e / 6 % 6 | 0], n = t[e % 6];
    s12.push({ css: j.toCss(i, r, n), rgba: j.toRgba(i, r, n) });
  }
  for (let e = 0;e < 24; e++) {
    let i = 8 + e * 10;
    s12.push({ css: j.toCss(i, i, i), rgba: j.toRgba(i, i, i) });
  }
  return s12;
})());
var St = z.toColor("#ffffff");
var Ki = z.toColor("#000000");
var tl = z.toColor("#ffffff");
var il = Ki;
var Ui = { css: "rgba(255, 255, 255, 0.3)", rgba: 4294967117 };
var Qa = St;
var ti = class extends D {
  constructor(e) {
    super();
    this._optionsService = e;
    this._contrastCache = new Wi;
    this._halfContrastCache = new Wi;
    this._onChangeColors = this._register(new v);
    this.onChangeColors = this._onChangeColors.event;
    this._colors = { foreground: St, background: Ki, cursor: tl, cursorAccent: il, selectionForeground: undefined, selectionBackgroundTransparent: Ui, selectionBackgroundOpaque: U.blend(Ki, Ui), selectionInactiveBackgroundTransparent: Ui, selectionInactiveBackgroundOpaque: U.blend(Ki, Ui), scrollbarSliderBackground: U.opacity(St, 0.2), scrollbarSliderHoverBackground: U.opacity(St, 0.4), scrollbarSliderActiveBackground: U.opacity(St, 0.5), overviewRulerBorder: St, ansi: re.slice(), contrastCache: this._contrastCache, halfContrastCache: this._halfContrastCache }, this._updateRestoreColors(), this._setTheme(this._optionsService.rawOptions.theme), this._register(this._optionsService.onSpecificOptionChange("minimumContrastRatio", () => this._contrastCache.clear())), this._register(this._optionsService.onSpecificOptionChange("theme", () => this._setTheme(this._optionsService.rawOptions.theme)));
  }
  get colors() {
    return this._colors;
  }
  _setTheme(e = {}) {
    let i = this._colors;
    if (i.foreground = K(e.foreground, St), i.background = K(e.background, Ki), i.cursor = U.blend(i.background, K(e.cursor, tl)), i.cursorAccent = U.blend(i.background, K(e.cursorAccent, il)), i.selectionBackgroundTransparent = K(e.selectionBackground, Ui), i.selectionBackgroundOpaque = U.blend(i.background, i.selectionBackgroundTransparent), i.selectionInactiveBackgroundTransparent = K(e.selectionInactiveBackground, i.selectionBackgroundTransparent), i.selectionInactiveBackgroundOpaque = U.blend(i.background, i.selectionInactiveBackgroundTransparent), i.selectionForeground = e.selectionForeground ? K(e.selectionForeground, ps) : undefined, i.selectionForeground === ps && (i.selectionForeground = undefined), U.isOpaque(i.selectionBackgroundTransparent) && (i.selectionBackgroundTransparent = U.opacity(i.selectionBackgroundTransparent, 0.3)), U.isOpaque(i.selectionInactiveBackgroundTransparent) && (i.selectionInactiveBackgroundTransparent = U.opacity(i.selectionInactiveBackgroundTransparent, 0.3)), i.scrollbarSliderBackground = K(e.scrollbarSliderBackground, U.opacity(i.foreground, 0.2)), i.scrollbarSliderHoverBackground = K(e.scrollbarSliderHoverBackground, U.opacity(i.foreground, 0.4)), i.scrollbarSliderActiveBackground = K(e.scrollbarSliderActiveBackground, U.opacity(i.foreground, 0.5)), i.overviewRulerBorder = K(e.overviewRulerBorder, Qa), i.ansi = re.slice(), i.ansi[0] = K(e.black, re[0]), i.ansi[1] = K(e.red, re[1]), i.ansi[2] = K(e.green, re[2]), i.ansi[3] = K(e.yellow, re[3]), i.ansi[4] = K(e.blue, re[4]), i.ansi[5] = K(e.magenta, re[5]), i.ansi[6] = K(e.cyan, re[6]), i.ansi[7] = K(e.white, re[7]), i.ansi[8] = K(e.brightBlack, re[8]), i.ansi[9] = K(e.brightRed, re[9]), i.ansi[10] = K(e.brightGreen, re[10]), i.ansi[11] = K(e.brightYellow, re[11]), i.ansi[12] = K(e.brightBlue, re[12]), i.ansi[13] = K(e.brightMagenta, re[13]), i.ansi[14] = K(e.brightCyan, re[14]), i.ansi[15] = K(e.brightWhite, re[15]), e.extendedAnsi) {
      let r = Math.min(i.ansi.length - 16, e.extendedAnsi.length);
      for (let n = 0;n < r; n++)
        i.ansi[n + 16] = K(e.extendedAnsi[n], re[n + 16]);
    }
    this._contrastCache.clear(), this._halfContrastCache.clear(), this._updateRestoreColors(), this._onChangeColors.fire(this.colors);
  }
  restoreColor(e) {
    this._restoreColor(e), this._onChangeColors.fire(this.colors);
  }
  _restoreColor(e) {
    if (e === undefined) {
      for (let i = 0;i < this._restoreColors.ansi.length; ++i)
        this._colors.ansi[i] = this._restoreColors.ansi[i];
      return;
    }
    switch (e) {
      case 256:
        this._colors.foreground = this._restoreColors.foreground;
        break;
      case 257:
        this._colors.background = this._restoreColors.background;
        break;
      case 258:
        this._colors.cursor = this._restoreColors.cursor;
        break;
      default:
        this._colors.ansi[e] = this._restoreColors.ansi[e];
    }
  }
  modifyColors(e) {
    e(this._colors), this._onChangeColors.fire(this.colors);
  }
  _updateRestoreColors() {
    this._restoreColors = { foreground: this._colors.foreground, background: this._colors.background, cursor: this._colors.cursor, ansi: this._colors.ansi.slice() };
  }
};
ti = M([S(0, H)], ti);
function K(s12, t) {
  if (s12 !== undefined)
    try {
      return z.toColor(s12);
    } catch {}
  return t;
}
var Rs = class {
  constructor(...t) {
    this._entries = new Map;
    for (let [e, i] of t)
      this.set(e, i);
  }
  set(t, e) {
    let i = this._entries.get(t);
    return this._entries.set(t, e), i;
  }
  forEach(t) {
    for (let [e, i] of this._entries.entries())
      t(e, i);
  }
  has(t) {
    return this._entries.has(t);
  }
  get(t) {
    return this._entries.get(t);
  }
};
var ln = class {
  constructor() {
    this._services = new Rs;
    this._services.set(xt, this);
  }
  setService(t, e) {
    this._services.set(t, e);
  }
  getService(t) {
    return this._services.get(t);
  }
  createInstance(t, ...e) {
    let i = Xs(t).sort((o, l) => o.index - l.index), r = [];
    for (let o of i) {
      let l = this._services.get(o.id);
      if (!l)
        throw new Error(`[createInstance] ${t.name} depends on UNKNOWN service ${o.id._id}.`);
      r.push(l);
    }
    let n = i.length > 0 ? i[0].index : e.length;
    if (e.length !== n)
      throw new Error(`[createInstance] First service dependency of ${t.name} at position ${n + 1} conflicts with ${e.length} static arguments`);
    return new t(...e, ...r);
  }
};
var ec = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, off: 5 };
var tc = "xterm.js: ";
var ii = class extends D {
  constructor(e) {
    super();
    this._optionsService = e;
    this._logLevel = 5;
    this._updateLogLevel(), this._register(this._optionsService.onSpecificOptionChange("logLevel", () => this._updateLogLevel())), ic = this;
  }
  get logLevel() {
    return this._logLevel;
  }
  _updateLogLevel() {
    this._logLevel = ec[this._optionsService.rawOptions.logLevel];
  }
  _evalLazyOptionalParams(e) {
    for (let i = 0;i < e.length; i++)
      typeof e[i] == "function" && (e[i] = e[i]());
  }
  _log(e, i, r) {
    this._evalLazyOptionalParams(r), e.call(console, (this._optionsService.options.logger ? "" : tc) + i, ...r);
  }
  trace(e, ...i) {
    this._logLevel <= 0 && this._log(this._optionsService.options.logger?.trace.bind(this._optionsService.options.logger) ?? console.log, e, i);
  }
  debug(e, ...i) {
    this._logLevel <= 1 && this._log(this._optionsService.options.logger?.debug.bind(this._optionsService.options.logger) ?? console.log, e, i);
  }
  info(e, ...i) {
    this._logLevel <= 2 && this._log(this._optionsService.options.logger?.info.bind(this._optionsService.options.logger) ?? console.info, e, i);
  }
  warn(e, ...i) {
    this._logLevel <= 3 && this._log(this._optionsService.options.logger?.warn.bind(this._optionsService.options.logger) ?? console.warn, e, i);
  }
  error(e, ...i) {
    this._logLevel <= 4 && this._log(this._optionsService.options.logger?.error.bind(this._optionsService.options.logger) ?? console.error, e, i);
  }
};
ii = M([S(0, H)], ii);
var ic;
var zi = class extends D {
  constructor(e) {
    super();
    this._maxLength = e;
    this.onDeleteEmitter = this._register(new v);
    this.onDelete = this.onDeleteEmitter.event;
    this.onInsertEmitter = this._register(new v);
    this.onInsert = this.onInsertEmitter.event;
    this.onTrimEmitter = this._register(new v);
    this.onTrim = this.onTrimEmitter.event;
    this._array = new Array(this._maxLength), this._startIndex = 0, this._length = 0;
  }
  get maxLength() {
    return this._maxLength;
  }
  set maxLength(e) {
    if (this._maxLength === e)
      return;
    let i = new Array(e);
    for (let r = 0;r < Math.min(e, this.length); r++)
      i[r] = this._array[this._getCyclicIndex(r)];
    this._array = i, this._maxLength = e, this._startIndex = 0;
  }
  get length() {
    return this._length;
  }
  set length(e) {
    if (e > this._length)
      for (let i = this._length;i < e; i++)
        this._array[i] = undefined;
    this._length = e;
  }
  get(e) {
    return this._array[this._getCyclicIndex(e)];
  }
  set(e, i) {
    this._array[this._getCyclicIndex(e)] = i;
  }
  push(e) {
    this._array[this._getCyclicIndex(this._length)] = e, this._length === this._maxLength ? (this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1)) : this._length++;
  }
  recycle() {
    if (this._length !== this._maxLength)
      throw new Error("Can only recycle when the buffer is full");
    return this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1), this._array[this._getCyclicIndex(this._length - 1)];
  }
  get isFull() {
    return this._length === this._maxLength;
  }
  pop() {
    return this._array[this._getCyclicIndex(this._length-- - 1)];
  }
  splice(e, i, ...r) {
    if (i) {
      for (let n = e;n < this._length - i; n++)
        this._array[this._getCyclicIndex(n)] = this._array[this._getCyclicIndex(n + i)];
      this._length -= i, this.onDeleteEmitter.fire({ index: e, amount: i });
    }
    for (let n = this._length - 1;n >= e; n--)
      this._array[this._getCyclicIndex(n + r.length)] = this._array[this._getCyclicIndex(n)];
    for (let n = 0;n < r.length; n++)
      this._array[this._getCyclicIndex(e + n)] = r[n];
    if (r.length && this.onInsertEmitter.fire({ index: e, amount: r.length }), this._length + r.length > this._maxLength) {
      let n = this._length + r.length - this._maxLength;
      this._startIndex += n, this._length = this._maxLength, this.onTrimEmitter.fire(n);
    } else
      this._length += r.length;
  }
  trimStart(e) {
    e > this._length && (e = this._length), this._startIndex += e, this._length -= e, this.onTrimEmitter.fire(e);
  }
  shiftElements(e, i, r) {
    if (!(i <= 0)) {
      if (e < 0 || e >= this._length)
        throw new Error("start argument out of range");
      if (e + r < 0)
        throw new Error("Cannot shift elements in list beyond index 0");
      if (r > 0) {
        for (let o = i - 1;o >= 0; o--)
          this.set(e + o + r, this.get(e + o));
        let n = e + i + r - this._length;
        if (n > 0)
          for (this._length += n;this._length > this._maxLength; )
            this._length--, this._startIndex++, this.onTrimEmitter.fire(1);
      } else
        for (let n = 0;n < i; n++)
          this.set(e + n + r, this.get(e + n));
    }
  }
  _getCyclicIndex(e) {
    return (this._startIndex + e) % this._maxLength;
  }
};
var B = 3;
var X = Object.freeze(new De);
var an = 0;
var Ls = 2;
var Ze = class s12 {
  constructor(t, e, i = false) {
    this.isWrapped = i;
    this._combined = {};
    this._extendedAttrs = {};
    this._data = new Uint32Array(t * B);
    let r = e || q.fromCharData([0, ir, 1, 0]);
    for (let n = 0;n < t; ++n)
      this.setCell(n, r);
    this.length = t;
  }
  get(t) {
    let e = this._data[t * B + 0], i = e & 2097151;
    return [this._data[t * B + 1], e & 2097152 ? this._combined[t] : i ? Ce(i) : "", e >> 22, e & 2097152 ? this._combined[t].charCodeAt(this._combined[t].length - 1) : i];
  }
  set(t, e) {
    this._data[t * B + 1] = e[0], e[1].length > 1 ? (this._combined[t] = e[1], this._data[t * B + 0] = t | 2097152 | e[2] << 22) : this._data[t * B + 0] = e[1].charCodeAt(0) | e[2] << 22;
  }
  getWidth(t) {
    return this._data[t * B + 0] >> 22;
  }
  hasWidth(t) {
    return this._data[t * B + 0] & 12582912;
  }
  getFg(t) {
    return this._data[t * B + 1];
  }
  getBg(t) {
    return this._data[t * B + 2];
  }
  hasContent(t) {
    return this._data[t * B + 0] & 4194303;
  }
  getCodePoint(t) {
    let e = this._data[t * B + 0];
    return e & 2097152 ? this._combined[t].charCodeAt(this._combined[t].length - 1) : e & 2097151;
  }
  isCombined(t) {
    return this._data[t * B + 0] & 2097152;
  }
  getString(t) {
    let e = this._data[t * B + 0];
    return e & 2097152 ? this._combined[t] : e & 2097151 ? Ce(e & 2097151) : "";
  }
  isProtected(t) {
    return this._data[t * B + 2] & 536870912;
  }
  loadCell(t, e) {
    return an = t * B, e.content = this._data[an + 0], e.fg = this._data[an + 1], e.bg = this._data[an + 2], e.content & 2097152 && (e.combinedData = this._combined[t]), e.bg & 268435456 && (e.extended = this._extendedAttrs[t]), e;
  }
  setCell(t, e) {
    e.content & 2097152 && (this._combined[t] = e.combinedData), e.bg & 268435456 && (this._extendedAttrs[t] = e.extended), this._data[t * B + 0] = e.content, this._data[t * B + 1] = e.fg, this._data[t * B + 2] = e.bg;
  }
  setCellFromCodepoint(t, e, i, r) {
    r.bg & 268435456 && (this._extendedAttrs[t] = r.extended), this._data[t * B + 0] = e | i << 22, this._data[t * B + 1] = r.fg, this._data[t * B + 2] = r.bg;
  }
  addCodepointToCell(t, e, i) {
    let r = this._data[t * B + 0];
    r & 2097152 ? this._combined[t] += Ce(e) : r & 2097151 ? (this._combined[t] = Ce(r & 2097151) + Ce(e), r &= -2097152, r |= 2097152) : r = e | 1 << 22, i && (r &= -12582913, r |= i << 22), this._data[t * B + 0] = r;
  }
  insertCells(t, e, i) {
    if (t %= this.length, t && this.getWidth(t - 1) === 2 && this.setCellFromCodepoint(t - 1, 0, 1, i), e < this.length - t) {
      let r = new q;
      for (let n = this.length - t - e - 1;n >= 0; --n)
        this.setCell(t + e + n, this.loadCell(t + n, r));
      for (let n = 0;n < e; ++n)
        this.setCell(t + n, i);
    } else
      for (let r = t;r < this.length; ++r)
        this.setCell(r, i);
    this.getWidth(this.length - 1) === 2 && this.setCellFromCodepoint(this.length - 1, 0, 1, i);
  }
  deleteCells(t, e, i) {
    if (t %= this.length, e < this.length - t) {
      let r = new q;
      for (let n = 0;n < this.length - t - e; ++n)
        this.setCell(t + n, this.loadCell(t + e + n, r));
      for (let n = this.length - e;n < this.length; ++n)
        this.setCell(n, i);
    } else
      for (let r = t;r < this.length; ++r)
        this.setCell(r, i);
    t && this.getWidth(t - 1) === 2 && this.setCellFromCodepoint(t - 1, 0, 1, i), this.getWidth(t) === 0 && !this.hasContent(t) && this.setCellFromCodepoint(t, 0, 1, i);
  }
  replaceCells(t, e, i, r = false) {
    if (r) {
      for (t && this.getWidth(t - 1) === 2 && !this.isProtected(t - 1) && this.setCellFromCodepoint(t - 1, 0, 1, i), e < this.length && this.getWidth(e - 1) === 2 && !this.isProtected(e) && this.setCellFromCodepoint(e, 0, 1, i);t < e && t < this.length; )
        this.isProtected(t) || this.setCell(t, i), t++;
      return;
    }
    for (t && this.getWidth(t - 1) === 2 && this.setCellFromCodepoint(t - 1, 0, 1, i), e < this.length && this.getWidth(e - 1) === 2 && this.setCellFromCodepoint(e, 0, 1, i);t < e && t < this.length; )
      this.setCell(t++, i);
  }
  resize(t, e) {
    if (t === this.length)
      return this._data.length * 4 * Ls < this._data.buffer.byteLength;
    let i = t * B;
    if (t > this.length) {
      if (this._data.buffer.byteLength >= i * 4)
        this._data = new Uint32Array(this._data.buffer, 0, i);
      else {
        let r = new Uint32Array(i);
        r.set(this._data), this._data = r;
      }
      for (let r = this.length;r < t; ++r)
        this.setCell(r, e);
    } else {
      this._data = this._data.subarray(0, i);
      let r = Object.keys(this._combined);
      for (let o = 0;o < r.length; o++) {
        let l = parseInt(r[o], 10);
        l >= t && delete this._combined[l];
      }
      let n = Object.keys(this._extendedAttrs);
      for (let o = 0;o < n.length; o++) {
        let l = parseInt(n[o], 10);
        l >= t && delete this._extendedAttrs[l];
      }
    }
    return this.length = t, i * 4 * Ls < this._data.buffer.byteLength;
  }
  cleanupMemory() {
    if (this._data.length * 4 * Ls < this._data.buffer.byteLength) {
      let t = new Uint32Array(this._data.length);
      return t.set(this._data), this._data = t, 1;
    }
    return 0;
  }
  fill(t, e = false) {
    if (e) {
      for (let i = 0;i < this.length; ++i)
        this.isProtected(i) || this.setCell(i, t);
      return;
    }
    this._combined = {}, this._extendedAttrs = {};
    for (let i = 0;i < this.length; ++i)
      this.setCell(i, t);
  }
  copyFrom(t) {
    this.length !== t.length ? this._data = new Uint32Array(t._data) : this._data.set(t._data), this.length = t.length, this._combined = {};
    for (let e in t._combined)
      this._combined[e] = t._combined[e];
    this._extendedAttrs = {};
    for (let e in t._extendedAttrs)
      this._extendedAttrs[e] = t._extendedAttrs[e];
    this.isWrapped = t.isWrapped;
  }
  clone() {
    let t = new s12(0);
    t._data = new Uint32Array(this._data), t.length = this.length;
    for (let e in this._combined)
      t._combined[e] = this._combined[e];
    for (let e in this._extendedAttrs)
      t._extendedAttrs[e] = this._extendedAttrs[e];
    return t.isWrapped = this.isWrapped, t;
  }
  getTrimmedLength() {
    for (let t = this.length - 1;t >= 0; --t)
      if (this._data[t * B + 0] & 4194303)
        return t + (this._data[t * B + 0] >> 22);
    return 0;
  }
  getNoBgTrimmedLength() {
    for (let t = this.length - 1;t >= 0; --t)
      if (this._data[t * B + 0] & 4194303 || this._data[t * B + 2] & 50331648)
        return t + (this._data[t * B + 0] >> 22);
    return 0;
  }
  copyCellsFrom(t, e, i, r, n) {
    let o = t._data;
    if (n)
      for (let a = r - 1;a >= 0; a--) {
        for (let u = 0;u < B; u++)
          this._data[(i + a) * B + u] = o[(e + a) * B + u];
        o[(e + a) * B + 2] & 268435456 && (this._extendedAttrs[i + a] = t._extendedAttrs[e + a]);
      }
    else
      for (let a = 0;a < r; a++) {
        for (let u = 0;u < B; u++)
          this._data[(i + a) * B + u] = o[(e + a) * B + u];
        o[(e + a) * B + 2] & 268435456 && (this._extendedAttrs[i + a] = t._extendedAttrs[e + a]);
      }
    let l = Object.keys(t._combined);
    for (let a = 0;a < l.length; a++) {
      let u = parseInt(l[a], 10);
      u >= e && (this._combined[u - e + i] = t._combined[u]);
    }
  }
  translateToString(t, e, i, r) {
    e = e ?? 0, i = i ?? this.length, t && (i = Math.min(i, this.getTrimmedLength())), r && (r.length = 0);
    let n = "";
    for (;e < i; ) {
      let o = this._data[e * B + 0], l = o & 2097151, a = o & 2097152 ? this._combined[e] : l ? Ce(l) : we;
      if (n += a, r)
        for (let u = 0;u < a.length; ++u)
          r.push(e);
      e += o >> 22 || 1;
    }
    return r && r.push(e), n;
  }
};
function sl(s13, t, e, i, r, n) {
  let o = [];
  for (let l = 0;l < s13.length - 1; l++) {
    let a = l, u = s13.get(++a);
    if (!u.isWrapped)
      continue;
    let h = [s13.get(l)];
    for (;a < s13.length && u.isWrapped; )
      h.push(u), u = s13.get(++a);
    if (!n && i >= l && i < a) {
      l += h.length - 1;
      continue;
    }
    let c = 0, d = ri(h, c, t), _ = 1, p = 0;
    for (;_ < h.length; ) {
      let f = ri(h, _, t), A = f - p, R = e - d, O = Math.min(A, R);
      h[c].copyCellsFrom(h[_], p, d, O, false), d += O, d === e && (c++, d = 0), p += O, p === f && (_++, p = 0), d === 0 && c !== 0 && h[c - 1].getWidth(e - 1) === 2 && (h[c].copyCellsFrom(h[c - 1], e - 1, d++, 1, false), h[c - 1].setCell(e - 1, r));
    }
    h[c].replaceCells(d, e, r);
    let m = 0;
    for (let f = h.length - 1;f > 0 && (f > c || h[f].getTrimmedLength() === 0); f--)
      m++;
    m > 0 && (o.push(l + h.length - m), o.push(m)), l += h.length - 1;
  }
  return o;
}
function ol(s13, t) {
  let e = [], i = 0, r = t[i], n = 0;
  for (let o = 0;o < s13.length; o++)
    if (r === o) {
      let l = t[++i];
      s13.onDeleteEmitter.fire({ index: o - n, amount: l }), o += l - 1, n += l, r = t[++i];
    } else
      e.push(o);
  return { layout: e, countRemoved: n };
}
function ll(s13, t) {
  let e = [];
  for (let i = 0;i < t.length; i++)
    e.push(s13.get(t[i]));
  for (let i = 0;i < e.length; i++)
    s13.set(i, e[i]);
  s13.length = t.length;
}
function al(s13, t, e) {
  let i = [], r = s13.map((a, u) => ri(s13, u, t)).reduce((a, u) => a + u), n = 0, o = 0, l = 0;
  for (;l < r; ) {
    if (r - l < e) {
      i.push(r - l);
      break;
    }
    n += e;
    let a = ri(s13, o, t);
    n > a && (n -= a, o++);
    let u = s13[o].getWidth(n - 1) === 2;
    u && n--;
    let h = u ? e - 1 : e;
    i.push(h), l += h;
  }
  return i;
}
function ri(s13, t, e) {
  if (t === s13.length - 1)
    return s13[t].getTrimmedLength();
  let i = !s13[t].hasContent(e - 1) && s13[t].getWidth(e - 1) === 1, r = s13[t + 1].getWidth(0) === 2;
  return i && r ? e - 1 : e;
}
var un = class un2 {
  constructor(t) {
    this.line = t;
    this.isDisposed = false;
    this._disposables = [];
    this._id = un2._nextId++;
    this._onDispose = this.register(new v);
    this.onDispose = this._onDispose.event;
  }
  get id() {
    return this._id;
  }
  dispose() {
    this.isDisposed || (this.isDisposed = true, this.line = -1, this._onDispose.fire(), Ne(this._disposables), this._disposables.length = 0);
  }
  register(t) {
    return this._disposables.push(t), t;
  }
};
un._nextId = 1;
var cn = un;
var ne = {};
var Je = ne.B;
ne[0] = { "`": "◆", a: "▒", b: "␉", c: "␌", d: "␍", e: "␊", f: "°", g: "±", h: "␤", i: "␋", j: "┘", k: "┐", l: "┌", m: "└", n: "┼", o: "⎺", p: "⎻", q: "─", r: "⎼", s: "⎽", t: "├", u: "┤", v: "┴", w: "┬", x: "│", y: "≤", z: "≥", "{": "π", "|": "≠", "}": "£", "~": "·" };
ne.A = { "#": "£" };
ne.B = undefined;
ne[4] = { "#": "£", "@": "¾", "[": "ij", "\\": "½", "]": "|", "{": "¨", "|": "f", "}": "¼", "~": "´" };
ne.C = ne[5] = { "[": "Ä", "\\": "Ö", "]": "Å", "^": "Ü", "`": "é", "{": "ä", "|": "ö", "}": "å", "~": "ü" };
ne.R = { "#": "£", "@": "à", "[": "°", "\\": "ç", "]": "§", "{": "é", "|": "ù", "}": "è", "~": "¨" };
ne.Q = { "@": "à", "[": "â", "\\": "ç", "]": "ê", "^": "î", "`": "ô", "{": "é", "|": "ù", "}": "è", "~": "û" };
ne.K = { "@": "§", "[": "Ä", "\\": "Ö", "]": "Ü", "{": "ä", "|": "ö", "}": "ü", "~": "ß" };
ne.Y = { "#": "£", "@": "§", "[": "°", "\\": "ç", "]": "é", "`": "ù", "{": "à", "|": "ò", "}": "è", "~": "ì" };
ne.E = ne[6] = { "@": "Ä", "[": "Æ", "\\": "Ø", "]": "Å", "^": "Ü", "`": "ä", "{": "æ", "|": "ø", "}": "å", "~": "ü" };
ne.Z = { "#": "£", "@": "§", "[": "¡", "\\": "Ñ", "]": "¿", "{": "°", "|": "ñ", "}": "ç" };
ne.H = ne[7] = { "@": "É", "[": "Ä", "\\": "Ö", "]": "Å", "^": "Ü", "`": "é", "{": "ä", "|": "ö", "}": "å", "~": "ü" };
ne["="] = { "#": "ù", "@": "à", "[": "é", "\\": "ç", "]": "ê", "^": "î", _: "è", "`": "ô", "{": "ä", "|": "ö", "}": "ü", "~": "û" };
var cl = 4294967295;
var $i = class {
  constructor(t, e, i) {
    this._hasScrollback = t;
    this._optionsService = e;
    this._bufferService = i;
    this.ydisp = 0;
    this.ybase = 0;
    this.y = 0;
    this.x = 0;
    this.tabs = {};
    this.savedY = 0;
    this.savedX = 0;
    this.savedCurAttrData = X.clone();
    this.savedCharset = Je;
    this.markers = [];
    this._nullCell = q.fromCharData([0, ir, 1, 0]);
    this._whitespaceCell = q.fromCharData([0, we, 1, 32]);
    this._isClearing = false;
    this._memoryCleanupQueue = new Jt;
    this._memoryCleanupPosition = 0;
    this._cols = this._bufferService.cols, this._rows = this._bufferService.rows, this.lines = new zi(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
  }
  getNullCell(t) {
    return t ? (this._nullCell.fg = t.fg, this._nullCell.bg = t.bg, this._nullCell.extended = t.extended) : (this._nullCell.fg = 0, this._nullCell.bg = 0, this._nullCell.extended = new rt), this._nullCell;
  }
  getWhitespaceCell(t) {
    return t ? (this._whitespaceCell.fg = t.fg, this._whitespaceCell.bg = t.bg, this._whitespaceCell.extended = t.extended) : (this._whitespaceCell.fg = 0, this._whitespaceCell.bg = 0, this._whitespaceCell.extended = new rt), this._whitespaceCell;
  }
  getBlankLine(t, e) {
    return new Ze(this._bufferService.cols, this.getNullCell(t), e);
  }
  get hasScrollback() {
    return this._hasScrollback && this.lines.maxLength > this._rows;
  }
  get isCursorInViewport() {
    let e = this.ybase + this.y - this.ydisp;
    return e >= 0 && e < this._rows;
  }
  _getCorrectBufferLength(t) {
    if (!this._hasScrollback)
      return t;
    let e = t + this._optionsService.rawOptions.scrollback;
    return e > cl ? cl : e;
  }
  fillViewportRows(t) {
    if (this.lines.length === 0) {
      t === undefined && (t = X);
      let e = this._rows;
      for (;e--; )
        this.lines.push(this.getBlankLine(t));
    }
  }
  clear() {
    this.ydisp = 0, this.ybase = 0, this.y = 0, this.x = 0, this.lines = new zi(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
  }
  resize(t, e) {
    let i = this.getNullCell(X), r = 0, n = this._getCorrectBufferLength(e);
    if (n > this.lines.maxLength && (this.lines.maxLength = n), this.lines.length > 0) {
      if (this._cols < t)
        for (let l = 0;l < this.lines.length; l++)
          r += +this.lines.get(l).resize(t, i);
      let o = 0;
      if (this._rows < e)
        for (let l = this._rows;l < e; l++)
          this.lines.length < e + this.ybase && (this._optionsService.rawOptions.windowsMode || this._optionsService.rawOptions.windowsPty.backend !== undefined || this._optionsService.rawOptions.windowsPty.buildNumber !== undefined ? this.lines.push(new Ze(t, i)) : this.ybase > 0 && this.lines.length <= this.ybase + this.y + o + 1 ? (this.ybase--, o++, this.ydisp > 0 && this.ydisp--) : this.lines.push(new Ze(t, i)));
      else
        for (let l = this._rows;l > e; l--)
          this.lines.length > e + this.ybase && (this.lines.length > this.ybase + this.y + 1 ? this.lines.pop() : (this.ybase++, this.ydisp++));
      if (n < this.lines.maxLength) {
        let l = this.lines.length - n;
        l > 0 && (this.lines.trimStart(l), this.ybase = Math.max(this.ybase - l, 0), this.ydisp = Math.max(this.ydisp - l, 0), this.savedY = Math.max(this.savedY - l, 0)), this.lines.maxLength = n;
      }
      this.x = Math.min(this.x, t - 1), this.y = Math.min(this.y, e - 1), o && (this.y += o), this.savedX = Math.min(this.savedX, t - 1), this.scrollTop = 0;
    }
    if (this.scrollBottom = e - 1, this._isReflowEnabled && (this._reflow(t, e), this._cols > t))
      for (let o = 0;o < this.lines.length; o++)
        r += +this.lines.get(o).resize(t, i);
    this._cols = t, this._rows = e, this._memoryCleanupQueue.clear(), r > 0.1 * this.lines.length && (this._memoryCleanupPosition = 0, this._memoryCleanupQueue.enqueue(() => this._batchedMemoryCleanup()));
  }
  _batchedMemoryCleanup() {
    let t = true;
    this._memoryCleanupPosition >= this.lines.length && (this._memoryCleanupPosition = 0, t = false);
    let e = 0;
    for (;this._memoryCleanupPosition < this.lines.length; )
      if (e += this.lines.get(this._memoryCleanupPosition++).cleanupMemory(), e > 100)
        return true;
    return t;
  }
  get _isReflowEnabled() {
    let t = this._optionsService.rawOptions.windowsPty;
    return t && t.buildNumber ? this._hasScrollback && t.backend === "conpty" && t.buildNumber >= 21376 : this._hasScrollback && !this._optionsService.rawOptions.windowsMode;
  }
  _reflow(t, e) {
    this._cols !== t && (t > this._cols ? this._reflowLarger(t, e) : this._reflowSmaller(t, e));
  }
  _reflowLarger(t, e) {
    let i = this._optionsService.rawOptions.reflowCursorLine, r = sl(this.lines, this._cols, t, this.ybase + this.y, this.getNullCell(X), i);
    if (r.length > 0) {
      let n = ol(this.lines, r);
      ll(this.lines, n.layout), this._reflowLargerAdjustViewport(t, e, n.countRemoved);
    }
  }
  _reflowLargerAdjustViewport(t, e, i) {
    let r = this.getNullCell(X), n = i;
    for (;n-- > 0; )
      this.ybase === 0 ? (this.y > 0 && this.y--, this.lines.length < e && this.lines.push(new Ze(t, r))) : (this.ydisp === this.ybase && this.ydisp--, this.ybase--);
    this.savedY = Math.max(this.savedY - i, 0);
  }
  _reflowSmaller(t, e) {
    let i = this._optionsService.rawOptions.reflowCursorLine, r = this.getNullCell(X), n = [], o = 0;
    for (let l = this.lines.length - 1;l >= 0; l--) {
      let a = this.lines.get(l);
      if (!a || !a.isWrapped && a.getTrimmedLength() <= t)
        continue;
      let u = [a];
      for (;a.isWrapped && l > 0; )
        a = this.lines.get(--l), u.unshift(a);
      if (!i) {
        let I = this.ybase + this.y;
        if (I >= l && I < l + u.length)
          continue;
      }
      let h = u[u.length - 1].getTrimmedLength(), c = al(u, this._cols, t), d = c.length - u.length, _;
      this.ybase === 0 && this.y !== this.lines.length - 1 ? _ = Math.max(0, this.y - this.lines.maxLength + d) : _ = Math.max(0, this.lines.length - this.lines.maxLength + d);
      let p = [];
      for (let I = 0;I < d; I++) {
        let k = this.getBlankLine(X, true);
        p.push(k);
      }
      p.length > 0 && (n.push({ start: l + u.length + o, newLines: p }), o += p.length), u.push(...p);
      let m = c.length - 1, f = c[m];
      f === 0 && (m--, f = c[m]);
      let A = u.length - d - 1, R = h;
      for (;A >= 0; ) {
        let I = Math.min(R, f);
        if (u[m] === undefined)
          break;
        if (u[m].copyCellsFrom(u[A], R - I, f - I, I, true), f -= I, f === 0 && (m--, f = c[m]), R -= I, R === 0) {
          A--;
          let k = Math.max(A, 0);
          R = ri(u, k, this._cols);
        }
      }
      for (let I = 0;I < u.length; I++)
        c[I] < t && u[I].setCell(c[I], r);
      let O = d - _;
      for (;O-- > 0; )
        this.ybase === 0 ? this.y < e - 1 ? (this.y++, this.lines.pop()) : (this.ybase++, this.ydisp++) : this.ybase < Math.min(this.lines.maxLength, this.lines.length + o) - e && (this.ybase === this.ydisp && this.ydisp++, this.ybase++);
      this.savedY = Math.min(this.savedY + d, this.ybase + e - 1);
    }
    if (n.length > 0) {
      let l = [], a = [];
      for (let f = 0;f < this.lines.length; f++)
        a.push(this.lines.get(f));
      let u = this.lines.length, h = u - 1, c = 0, d = n[c];
      this.lines.length = Math.min(this.lines.maxLength, this.lines.length + o);
      let _ = 0;
      for (let f = Math.min(this.lines.maxLength - 1, u + o - 1);f >= 0; f--)
        if (d && d.start > h + _) {
          for (let A = d.newLines.length - 1;A >= 0; A--)
            this.lines.set(f--, d.newLines[A]);
          f++, l.push({ index: h + 1, amount: d.newLines.length }), _ += d.newLines.length, d = n[++c];
        } else
          this.lines.set(f, a[h--]);
      let p = 0;
      for (let f = l.length - 1;f >= 0; f--)
        l[f].index += p, this.lines.onInsertEmitter.fire(l[f]), p += l[f].amount;
      let m = Math.max(0, u + o - this.lines.maxLength);
      m > 0 && this.lines.onTrimEmitter.fire(m);
    }
  }
  translateBufferLineToString(t, e, i = 0, r) {
    let n = this.lines.get(t);
    return n ? n.translateToString(e, i, r) : "";
  }
  getWrappedRangeForLine(t) {
    let e = t, i = t;
    for (;e > 0 && this.lines.get(e).isWrapped; )
      e--;
    for (;i + 1 < this.lines.length && this.lines.get(i + 1).isWrapped; )
      i++;
    return { first: e, last: i };
  }
  setupTabStops(t) {
    for (t != null ? this.tabs[t] || (t = this.prevStop(t)) : (this.tabs = {}, t = 0);t < this._cols; t += this._optionsService.rawOptions.tabStopWidth)
      this.tabs[t] = true;
  }
  prevStop(t) {
    for (t == null && (t = this.x);!this.tabs[--t] && t > 0; )
      ;
    return t >= this._cols ? this._cols - 1 : t < 0 ? 0 : t;
  }
  nextStop(t) {
    for (t == null && (t = this.x);!this.tabs[++t] && t < this._cols; )
      ;
    return t >= this._cols ? this._cols - 1 : t < 0 ? 0 : t;
  }
  clearMarkers(t) {
    this._isClearing = true;
    for (let e = 0;e < this.markers.length; e++)
      this.markers[e].line === t && (this.markers[e].dispose(), this.markers.splice(e--, 1));
    this._isClearing = false;
  }
  clearAllMarkers() {
    this._isClearing = true;
    for (let t = 0;t < this.markers.length; t++)
      this.markers[t].dispose();
    this.markers.length = 0, this._isClearing = false;
  }
  addMarker(t) {
    let e = new cn(t);
    return this.markers.push(e), e.register(this.lines.onTrim((i) => {
      e.line -= i, e.line < 0 && e.dispose();
    })), e.register(this.lines.onInsert((i) => {
      e.line >= i.index && (e.line += i.amount);
    })), e.register(this.lines.onDelete((i) => {
      e.line >= i.index && e.line < i.index + i.amount && e.dispose(), e.line > i.index && (e.line -= i.amount);
    })), e.register(e.onDispose(() => this._removeMarker(e))), e;
  }
  _removeMarker(t) {
    this._isClearing || this.markers.splice(this.markers.indexOf(t), 1);
  }
};
var hn = class extends D {
  constructor(e, i) {
    super();
    this._optionsService = e;
    this._bufferService = i;
    this._onBufferActivate = this._register(new v);
    this.onBufferActivate = this._onBufferActivate.event;
    this.reset(), this._register(this._optionsService.onSpecificOptionChange("scrollback", () => this.resize(this._bufferService.cols, this._bufferService.rows))), this._register(this._optionsService.onSpecificOptionChange("tabStopWidth", () => this.setupTabStops()));
  }
  reset() {
    this._normal = new $i(true, this._optionsService, this._bufferService), this._normal.fillViewportRows(), this._alt = new $i(false, this._optionsService, this._bufferService), this._activeBuffer = this._normal, this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }), this.setupTabStops();
  }
  get alt() {
    return this._alt;
  }
  get active() {
    return this._activeBuffer;
  }
  get normal() {
    return this._normal;
  }
  activateNormalBuffer() {
    this._activeBuffer !== this._normal && (this._normal.x = this._alt.x, this._normal.y = this._alt.y, this._alt.clearAllMarkers(), this._alt.clear(), this._activeBuffer = this._normal, this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }));
  }
  activateAltBuffer(e) {
    this._activeBuffer !== this._alt && (this._alt.fillViewportRows(e), this._alt.x = this._normal.x, this._alt.y = this._normal.y, this._activeBuffer = this._alt, this._onBufferActivate.fire({ activeBuffer: this._alt, inactiveBuffer: this._normal }));
  }
  resize(e, i) {
    this._normal.resize(e, i), this._alt.resize(e, i), this.setupTabStops(e);
  }
  setupTabStops(e) {
    this._normal.setupTabStops(e), this._alt.setupTabStops(e);
  }
};
var ks = 2;
var Cs = 1;
var ni = class extends D {
  constructor(e) {
    super();
    this.isUserScrolling = false;
    this._onResize = this._register(new v);
    this.onResize = this._onResize.event;
    this._onScroll = this._register(new v);
    this.onScroll = this._onScroll.event;
    this.cols = Math.max(e.rawOptions.cols || 0, ks), this.rows = Math.max(e.rawOptions.rows || 0, Cs), this.buffers = this._register(new hn(e, this)), this._register(this.buffers.onBufferActivate((i) => {
      this._onScroll.fire(i.activeBuffer.ydisp);
    }));
  }
  get buffer() {
    return this.buffers.active;
  }
  resize(e, i) {
    let r = this.cols !== e, n = this.rows !== i;
    this.cols = e, this.rows = i, this.buffers.resize(e, i), this._onResize.fire({ cols: e, rows: i, colsChanged: r, rowsChanged: n });
  }
  reset() {
    this.buffers.reset(), this.isUserScrolling = false;
  }
  scroll(e, i = false) {
    let r = this.buffer, n;
    n = this._cachedBlankLine, (!n || n.length !== this.cols || n.getFg(0) !== e.fg || n.getBg(0) !== e.bg) && (n = r.getBlankLine(e, i), this._cachedBlankLine = n), n.isWrapped = i;
    let o = r.ybase + r.scrollTop, l = r.ybase + r.scrollBottom;
    if (r.scrollTop === 0) {
      let a = r.lines.isFull;
      l === r.lines.length - 1 ? a ? r.lines.recycle().copyFrom(n) : r.lines.push(n.clone()) : r.lines.splice(l + 1, 0, n.clone()), a ? this.isUserScrolling && (r.ydisp = Math.max(r.ydisp - 1, 0)) : (r.ybase++, this.isUserScrolling || r.ydisp++);
    } else {
      let a = l - o + 1;
      r.lines.shiftElements(o + 1, a - 1, -1), r.lines.set(l, n.clone());
    }
    this.isUserScrolling || (r.ydisp = r.ybase), this._onScroll.fire(r.ydisp);
  }
  scrollLines(e, i) {
    let r = this.buffer;
    if (e < 0) {
      if (r.ydisp === 0)
        return;
      this.isUserScrolling = true;
    } else
      e + r.ydisp >= r.ybase && (this.isUserScrolling = false);
    let n = r.ydisp;
    r.ydisp = Math.max(Math.min(r.ydisp + e, r.ybase), 0), n !== r.ydisp && (i || this._onScroll.fire(r.ydisp));
  }
};
ni = M([S(0, H)], ni);
var si = { cols: 80, rows: 24, cursorBlink: false, cursorStyle: "block", cursorWidth: 1, cursorInactiveStyle: "outline", customGlyphs: true, drawBoldTextInBrightColors: true, documentOverride: null, fastScrollModifier: "alt", fastScrollSensitivity: 5, fontFamily: "monospace", fontSize: 15, fontWeight: "normal", fontWeightBold: "bold", ignoreBracketedPasteMode: false, lineHeight: 1, letterSpacing: 0, linkHandler: null, logLevel: "info", logger: null, scrollback: 1000, scrollOnEraseInDisplay: false, scrollOnUserInput: true, scrollSensitivity: 1, screenReaderMode: false, smoothScrollDuration: 0, macOptionIsMeta: false, macOptionClickForcesSelection: false, minimumContrastRatio: 1, disableStdin: false, allowProposedApi: false, allowTransparency: false, tabStopWidth: 8, theme: {}, reflowCursorLine: false, rescaleOverlappingGlyphs: false, rightClickSelectsWord: Zt, windowOptions: {}, windowsMode: false, windowsPty: {}, wordSeparator: " ()[]{}',\"`", altClickMovesCursor: true, convertEol: false, termName: "xterm", cancelEvents: false, overviewRuler: {} };
var nc = ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
var dn = class extends D {
  constructor(e) {
    super();
    this._onOptionChange = this._register(new v);
    this.onOptionChange = this._onOptionChange.event;
    let i = { ...si };
    for (let r in e)
      if (r in i)
        try {
          let n = e[r];
          i[r] = this._sanitizeAndValidateOption(r, n);
        } catch (n) {
          console.error(n);
        }
    this.rawOptions = i, this.options = { ...i }, this._setupOptions(), this._register(C(() => {
      this.rawOptions.linkHandler = null, this.rawOptions.documentOverride = null;
    }));
  }
  onSpecificOptionChange(e, i) {
    return this.onOptionChange((r) => {
      r === e && i(this.rawOptions[e]);
    });
  }
  onMultipleOptionChange(e, i) {
    return this.onOptionChange((r) => {
      e.indexOf(r) !== -1 && i();
    });
  }
  _setupOptions() {
    let e = (r) => {
      if (!(r in si))
        throw new Error(`No option with key "${r}"`);
      return this.rawOptions[r];
    }, i = (r, n) => {
      if (!(r in si))
        throw new Error(`No option with key "${r}"`);
      n = this._sanitizeAndValidateOption(r, n), this.rawOptions[r] !== n && (this.rawOptions[r] = n, this._onOptionChange.fire(r));
    };
    for (let r in this.rawOptions) {
      let n = { get: e.bind(this, r), set: i.bind(this, r) };
      Object.defineProperty(this.options, r, n);
    }
  }
  _sanitizeAndValidateOption(e, i) {
    switch (e) {
      case "cursorStyle":
        if (i || (i = si[e]), !sc(i))
          throw new Error(`"${i}" is not a valid value for ${e}`);
        break;
      case "wordSeparator":
        i || (i = si[e]);
        break;
      case "fontWeight":
      case "fontWeightBold":
        if (typeof i == "number" && 1 <= i && i <= 1000)
          break;
        i = nc.includes(i) ? i : si[e];
        break;
      case "cursorWidth":
        i = Math.floor(i);
      case "lineHeight":
      case "tabStopWidth":
        if (i < 1)
          throw new Error(`${e} cannot be less than 1, value: ${i}`);
        break;
      case "minimumContrastRatio":
        i = Math.max(1, Math.min(21, Math.round(i * 10) / 10));
        break;
      case "scrollback":
        if (i = Math.min(i, 4294967295), i < 0)
          throw new Error(`${e} cannot be less than 0, value: ${i}`);
        break;
      case "fastScrollSensitivity":
      case "scrollSensitivity":
        if (i <= 0)
          throw new Error(`${e} cannot be less than or equal to 0, value: ${i}`);
        break;
      case "rows":
      case "cols":
        if (!i && i !== 0)
          throw new Error(`${e} must be numeric, value: ${i}`);
        break;
      case "windowsPty":
        i = i ?? {};
        break;
    }
    return i;
  }
};
function sc(s13) {
  return s13 === "block" || s13 === "underline" || s13 === "bar";
}
function oi(s13, t = 5) {
  if (typeof s13 != "object")
    return s13;
  let e = Array.isArray(s13) ? [] : {};
  for (let i in s13)
    e[i] = t <= 1 ? s13[i] : s13[i] && oi(s13[i], t - 1);
  return e;
}
var ul = Object.freeze({ insertMode: false });
var hl = Object.freeze({ applicationCursorKeys: false, applicationKeypad: false, bracketedPasteMode: false, cursorBlink: undefined, cursorStyle: undefined, origin: false, reverseWraparound: false, sendFocus: false, synchronizedOutput: false, wraparound: true });
var li = class extends D {
  constructor(e, i, r) {
    super();
    this._bufferService = e;
    this._logService = i;
    this._optionsService = r;
    this.isCursorInitialized = false;
    this.isCursorHidden = false;
    this._onData = this._register(new v);
    this.onData = this._onData.event;
    this._onUserInput = this._register(new v);
    this.onUserInput = this._onUserInput.event;
    this._onBinary = this._register(new v);
    this.onBinary = this._onBinary.event;
    this._onRequestScrollToBottom = this._register(new v);
    this.onRequestScrollToBottom = this._onRequestScrollToBottom.event;
    this.modes = oi(ul), this.decPrivateModes = oi(hl);
  }
  reset() {
    this.modes = oi(ul), this.decPrivateModes = oi(hl);
  }
  triggerDataEvent(e, i = false) {
    if (this._optionsService.rawOptions.disableStdin)
      return;
    let r = this._bufferService.buffer;
    i && this._optionsService.rawOptions.scrollOnUserInput && r.ybase !== r.ydisp && this._onRequestScrollToBottom.fire(), i && this._onUserInput.fire(), this._logService.debug(`sending data "${e}"`), this._logService.trace("sending data (codes)", () => e.split("").map((n) => n.charCodeAt(0))), this._onData.fire(e);
  }
  triggerBinaryEvent(e) {
    this._optionsService.rawOptions.disableStdin || (this._logService.debug(`sending binary "${e}"`), this._logService.trace("sending binary (codes)", () => e.split("").map((i) => i.charCodeAt(0))), this._onBinary.fire(e));
  }
};
li = M([S(0, F), S(1, nr), S(2, H)], li);
var dl = { NONE: { events: 0, restrict: () => false }, X10: { events: 1, restrict: (s13) => s13.button === 4 || s13.action !== 1 ? false : (s13.ctrl = false, s13.alt = false, s13.shift = false, true) }, VT200: { events: 19, restrict: (s13) => s13.action !== 32 }, DRAG: { events: 23, restrict: (s13) => !(s13.action === 32 && s13.button === 3) }, ANY: { events: 31, restrict: (s13) => true } };
function Ms(s13, t) {
  let e = (s13.ctrl ? 16 : 0) | (s13.shift ? 4 : 0) | (s13.alt ? 8 : 0);
  return s13.button === 4 ? (e |= 64, e |= s13.action) : (e |= s13.button & 3, s13.button & 4 && (e |= 64), s13.button & 8 && (e |= 128), s13.action === 32 ? e |= 32 : s13.action === 0 && !t && (e |= 3)), e;
}
var Ps = String.fromCharCode;
var fl = { DEFAULT: (s13) => {
  let t = [Ms(s13, false) + 32, s13.col + 32, s13.row + 32];
  return t[0] > 255 || t[1] > 255 || t[2] > 255 ? "" : `\x1B[M${Ps(t[0])}${Ps(t[1])}${Ps(t[2])}`;
}, SGR: (s13) => {
  let t = s13.action === 0 && s13.button !== 4 ? "m" : "M";
  return `\x1B[<${Ms(s13, true)};${s13.col};${s13.row}${t}`;
}, SGR_PIXELS: (s13) => {
  let t = s13.action === 0 && s13.button !== 4 ? "m" : "M";
  return `\x1B[<${Ms(s13, true)};${s13.x};${s13.y}${t}`;
} };
var ai = class extends D {
  constructor(e, i, r) {
    super();
    this._bufferService = e;
    this._coreService = i;
    this._optionsService = r;
    this._protocols = {};
    this._encodings = {};
    this._activeProtocol = "";
    this._activeEncoding = "";
    this._lastEvent = null;
    this._wheelPartialScroll = 0;
    this._onProtocolChange = this._register(new v);
    this.onProtocolChange = this._onProtocolChange.event;
    for (let n of Object.keys(dl))
      this.addProtocol(n, dl[n]);
    for (let n of Object.keys(fl))
      this.addEncoding(n, fl[n]);
    this.reset();
  }
  addProtocol(e, i) {
    this._protocols[e] = i;
  }
  addEncoding(e, i) {
    this._encodings[e] = i;
  }
  get activeProtocol() {
    return this._activeProtocol;
  }
  get areMouseEventsActive() {
    return this._protocols[this._activeProtocol].events !== 0;
  }
  set activeProtocol(e) {
    if (!this._protocols[e])
      throw new Error(`unknown protocol "${e}"`);
    this._activeProtocol = e, this._onProtocolChange.fire(this._protocols[e].events);
  }
  get activeEncoding() {
    return this._activeEncoding;
  }
  set activeEncoding(e) {
    if (!this._encodings[e])
      throw new Error(`unknown encoding "${e}"`);
    this._activeEncoding = e;
  }
  reset() {
    this.activeProtocol = "NONE", this.activeEncoding = "DEFAULT", this._lastEvent = null, this._wheelPartialScroll = 0;
  }
  consumeWheelEvent(e, i, r) {
    if (e.deltaY === 0 || e.shiftKey || i === undefined || r === undefined)
      return 0;
    let n = i / r, o = this._applyScrollModifier(e.deltaY, e);
    return e.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? (o /= n + 0, Math.abs(e.deltaY) < 50 && (o *= 0.3), this._wheelPartialScroll += o, o = Math.floor(Math.abs(this._wheelPartialScroll)) * (this._wheelPartialScroll > 0 ? 1 : -1), this._wheelPartialScroll %= 1) : e.deltaMode === WheelEvent.DOM_DELTA_PAGE && (o *= this._bufferService.rows), o;
  }
  _applyScrollModifier(e, i) {
    return i.altKey || i.ctrlKey || i.shiftKey ? e * this._optionsService.rawOptions.fastScrollSensitivity * this._optionsService.rawOptions.scrollSensitivity : e * this._optionsService.rawOptions.scrollSensitivity;
  }
  triggerMouseEvent(e) {
    if (e.col < 0 || e.col >= this._bufferService.cols || e.row < 0 || e.row >= this._bufferService.rows || e.button === 4 && e.action === 32 || e.button === 3 && e.action !== 32 || e.button !== 4 && (e.action === 2 || e.action === 3) || (e.col++, e.row++, e.action === 32 && this._lastEvent && this._equalEvents(this._lastEvent, e, this._activeEncoding === "SGR_PIXELS")) || !this._protocols[this._activeProtocol].restrict(e))
      return false;
    let i = this._encodings[this._activeEncoding](e);
    return i && (this._activeEncoding === "DEFAULT" ? this._coreService.triggerBinaryEvent(i) : this._coreService.triggerDataEvent(i, true)), this._lastEvent = e, true;
  }
  explainEvents(e) {
    return { down: !!(e & 1), up: !!(e & 2), drag: !!(e & 4), move: !!(e & 8), wheel: !!(e & 16) };
  }
  _equalEvents(e, i, r) {
    if (r) {
      if (e.x !== i.x || e.y !== i.y)
        return false;
    } else if (e.col !== i.col || e.row !== i.row)
      return false;
    return !(e.button !== i.button || e.action !== i.action || e.ctrl !== i.ctrl || e.alt !== i.alt || e.shift !== i.shift);
  }
};
ai = M([S(0, F), S(1, ge), S(2, H)], ai);
var Os = [[768, 879], [1155, 1158], [1160, 1161], [1425, 1469], [1471, 1471], [1473, 1474], [1476, 1477], [1479, 1479], [1536, 1539], [1552, 1557], [1611, 1630], [1648, 1648], [1750, 1764], [1767, 1768], [1770, 1773], [1807, 1807], [1809, 1809], [1840, 1866], [1958, 1968], [2027, 2035], [2305, 2306], [2364, 2364], [2369, 2376], [2381, 2381], [2385, 2388], [2402, 2403], [2433, 2433], [2492, 2492], [2497, 2500], [2509, 2509], [2530, 2531], [2561, 2562], [2620, 2620], [2625, 2626], [2631, 2632], [2635, 2637], [2672, 2673], [2689, 2690], [2748, 2748], [2753, 2757], [2759, 2760], [2765, 2765], [2786, 2787], [2817, 2817], [2876, 2876], [2879, 2879], [2881, 2883], [2893, 2893], [2902, 2902], [2946, 2946], [3008, 3008], [3021, 3021], [3134, 3136], [3142, 3144], [3146, 3149], [3157, 3158], [3260, 3260], [3263, 3263], [3270, 3270], [3276, 3277], [3298, 3299], [3393, 3395], [3405, 3405], [3530, 3530], [3538, 3540], [3542, 3542], [3633, 3633], [3636, 3642], [3655, 3662], [3761, 3761], [3764, 3769], [3771, 3772], [3784, 3789], [3864, 3865], [3893, 3893], [3895, 3895], [3897, 3897], [3953, 3966], [3968, 3972], [3974, 3975], [3984, 3991], [3993, 4028], [4038, 4038], [4141, 4144], [4146, 4146], [4150, 4151], [4153, 4153], [4184, 4185], [4448, 4607], [4959, 4959], [5906, 5908], [5938, 5940], [5970, 5971], [6002, 6003], [6068, 6069], [6071, 6077], [6086, 6086], [6089, 6099], [6109, 6109], [6155, 6157], [6313, 6313], [6432, 6434], [6439, 6440], [6450, 6450], [6457, 6459], [6679, 6680], [6912, 6915], [6964, 6964], [6966, 6970], [6972, 6972], [6978, 6978], [7019, 7027], [7616, 7626], [7678, 7679], [8203, 8207], [8234, 8238], [8288, 8291], [8298, 8303], [8400, 8431], [12330, 12335], [12441, 12442], [43014, 43014], [43019, 43019], [43045, 43046], [64286, 64286], [65024, 65039], [65056, 65059], [65279, 65279], [65529, 65531]];
var ac = [[68097, 68099], [68101, 68102], [68108, 68111], [68152, 68154], [68159, 68159], [119143, 119145], [119155, 119170], [119173, 119179], [119210, 119213], [119362, 119364], [917505, 917505], [917536, 917631], [917760, 917999]];
var se;
function cc(s13, t) {
  let e = 0, i = t.length - 1, r;
  if (s13 < t[0][0] || s13 > t[i][1])
    return false;
  for (;i >= e; )
    if (r = e + i >> 1, s13 > t[r][1])
      e = r + 1;
    else if (s13 < t[r][0])
      i = r - 1;
    else
      return true;
  return false;
}
var fn = class {
  constructor() {
    this.version = "6";
    if (!se) {
      se = new Uint8Array(65536), se.fill(1), se[0] = 0, se.fill(0, 1, 32), se.fill(0, 127, 160), se.fill(2, 4352, 4448), se[9001] = 2, se[9002] = 2, se.fill(2, 11904, 42192), se[12351] = 1, se.fill(2, 44032, 55204), se.fill(2, 63744, 64256), se.fill(2, 65040, 65050), se.fill(2, 65072, 65136), se.fill(2, 65280, 65377), se.fill(2, 65504, 65511);
      for (let t = 0;t < Os.length; ++t)
        se.fill(0, Os[t][0], Os[t][1] + 1);
    }
  }
  wcwidth(t) {
    return t < 32 ? 0 : t < 127 ? 1 : t < 65536 ? se[t] : cc(t, ac) ? 0 : t >= 131072 && t <= 196605 || t >= 196608 && t <= 262141 ? 2 : 1;
  }
  charProperties(t, e) {
    let i = this.wcwidth(t), r = i === 0 && e !== 0;
    if (r) {
      let n = Ae.extractWidth(e);
      n === 0 ? r = false : n > i && (i = n);
    }
    return Ae.createPropertyValue(0, i, r);
  }
};
var Ae = class s13 {
  constructor() {
    this._providers = Object.create(null);
    this._active = "";
    this._onChange = new v;
    this.onChange = this._onChange.event;
    let t = new fn;
    this.register(t), this._active = t.version, this._activeProvider = t;
  }
  static extractShouldJoin(t) {
    return (t & 1) !== 0;
  }
  static extractWidth(t) {
    return t >> 1 & 3;
  }
  static extractCharKind(t) {
    return t >> 3;
  }
  static createPropertyValue(t, e, i = false) {
    return (t & 16777215) << 3 | (e & 3) << 1 | (i ? 1 : 0);
  }
  dispose() {
    this._onChange.dispose();
  }
  get versions() {
    return Object.keys(this._providers);
  }
  get activeVersion() {
    return this._active;
  }
  set activeVersion(t) {
    if (!this._providers[t])
      throw new Error(`unknown Unicode version "${t}"`);
    this._active = t, this._activeProvider = this._providers[t], this._onChange.fire(t);
  }
  register(t) {
    this._providers[t.version] = t;
  }
  wcwidth(t) {
    return this._activeProvider.wcwidth(t);
  }
  getStringCellWidth(t) {
    let e = 0, i = 0, r = t.length;
    for (let n = 0;n < r; ++n) {
      let o = t.charCodeAt(n);
      if (55296 <= o && o <= 56319) {
        if (++n >= r)
          return e + this.wcwidth(o);
        let u = t.charCodeAt(n);
        56320 <= u && u <= 57343 ? o = (o - 55296) * 1024 + u - 56320 + 65536 : e += this.wcwidth(u);
      }
      let l = this.charProperties(o, i), a = s13.extractWidth(l);
      s13.extractShouldJoin(l) && (a -= s13.extractWidth(i)), e += a, i = l;
    }
    return e;
  }
  charProperties(t, e) {
    return this._activeProvider.charProperties(t, e);
  }
};
var pn = class {
  constructor() {
    this.glevel = 0;
    this._charsets = [];
  }
  reset() {
    this.charset = undefined, this._charsets = [], this.glevel = 0;
  }
  setgLevel(t) {
    this.glevel = t, this.charset = this._charsets[t];
  }
  setgCharset(t, e) {
    this._charsets[t] = e, this.glevel === t && (this.charset = e);
  }
};
function Bs(s14) {
  let e = s14.buffer.lines.get(s14.buffer.ybase + s14.buffer.y - 1)?.get(s14.cols - 1), i = s14.buffer.lines.get(s14.buffer.ybase + s14.buffer.y);
  i && e && (i.isWrapped = e[3] !== 0 && e[3] !== 32);
}
var Vi = 2147483647;
var uc = 256;
var ci = class s14 {
  constructor(t = 32, e = 32) {
    this.maxLength = t;
    this.maxSubParamsLength = e;
    if (e > uc)
      throw new Error("maxSubParamsLength must not be greater than 256");
    this.params = new Int32Array(t), this.length = 0, this._subParams = new Int32Array(e), this._subParamsLength = 0, this._subParamsIdx = new Uint16Array(t), this._rejectDigits = false, this._rejectSubDigits = false, this._digitIsSub = false;
  }
  static fromArray(t) {
    let e = new s14;
    if (!t.length)
      return e;
    for (let i = Array.isArray(t[0]) ? 1 : 0;i < t.length; ++i) {
      let r = t[i];
      if (Array.isArray(r))
        for (let n = 0;n < r.length; ++n)
          e.addSubParam(r[n]);
      else
        e.addParam(r);
    }
    return e;
  }
  clone() {
    let t = new s14(this.maxLength, this.maxSubParamsLength);
    return t.params.set(this.params), t.length = this.length, t._subParams.set(this._subParams), t._subParamsLength = this._subParamsLength, t._subParamsIdx.set(this._subParamsIdx), t._rejectDigits = this._rejectDigits, t._rejectSubDigits = this._rejectSubDigits, t._digitIsSub = this._digitIsSub, t;
  }
  toArray() {
    let t = [];
    for (let e = 0;e < this.length; ++e) {
      t.push(this.params[e]);
      let i = this._subParamsIdx[e] >> 8, r = this._subParamsIdx[e] & 255;
      r - i > 0 && t.push(Array.prototype.slice.call(this._subParams, i, r));
    }
    return t;
  }
  reset() {
    this.length = 0, this._subParamsLength = 0, this._rejectDigits = false, this._rejectSubDigits = false, this._digitIsSub = false;
  }
  addParam(t) {
    if (this._digitIsSub = false, this.length >= this.maxLength) {
      this._rejectDigits = true;
      return;
    }
    if (t < -1)
      throw new Error("values lesser than -1 are not allowed");
    this._subParamsIdx[this.length] = this._subParamsLength << 8 | this._subParamsLength, this.params[this.length++] = t > Vi ? Vi : t;
  }
  addSubParam(t) {
    if (this._digitIsSub = true, !!this.length) {
      if (this._rejectDigits || this._subParamsLength >= this.maxSubParamsLength) {
        this._rejectSubDigits = true;
        return;
      }
      if (t < -1)
        throw new Error("values lesser than -1 are not allowed");
      this._subParams[this._subParamsLength++] = t > Vi ? Vi : t, this._subParamsIdx[this.length - 1]++;
    }
  }
  hasSubParams(t) {
    return (this._subParamsIdx[t] & 255) - (this._subParamsIdx[t] >> 8) > 0;
  }
  getSubParams(t) {
    let e = this._subParamsIdx[t] >> 8, i = this._subParamsIdx[t] & 255;
    return i - e > 0 ? this._subParams.subarray(e, i) : null;
  }
  getSubParamsAll() {
    let t = {};
    for (let e = 0;e < this.length; ++e) {
      let i = this._subParamsIdx[e] >> 8, r = this._subParamsIdx[e] & 255;
      r - i > 0 && (t[e] = this._subParams.slice(i, r));
    }
    return t;
  }
  addDigit(t) {
    let e;
    if (this._rejectDigits || !(e = this._digitIsSub ? this._subParamsLength : this.length) || this._digitIsSub && this._rejectSubDigits)
      return;
    let i = this._digitIsSub ? this._subParams : this.params, r = i[e - 1];
    i[e - 1] = ~r ? Math.min(r * 10 + t, Vi) : t;
  }
};
var qi = [];
var mn = class {
  constructor() {
    this._state = 0;
    this._active = qi;
    this._id = -1;
    this._handlers = Object.create(null);
    this._handlerFb = () => {};
    this._stack = { paused: false, loopPosition: 0, fallThrough: false };
  }
  registerHandler(t, e) {
    this._handlers[t] === undefined && (this._handlers[t] = []);
    let i = this._handlers[t];
    return i.push(e), { dispose: () => {
      let r = i.indexOf(e);
      r !== -1 && i.splice(r, 1);
    } };
  }
  clearHandler(t) {
    this._handlers[t] && delete this._handlers[t];
  }
  setHandlerFallback(t) {
    this._handlerFb = t;
  }
  dispose() {
    this._handlers = Object.create(null), this._handlerFb = () => {}, this._active = qi;
  }
  reset() {
    if (this._state === 2)
      for (let t = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1;t >= 0; --t)
        this._active[t].end(false);
    this._stack.paused = false, this._active = qi, this._id = -1, this._state = 0;
  }
  _start() {
    if (this._active = this._handlers[this._id] || qi, !this._active.length)
      this._handlerFb(this._id, "START");
    else
      for (let t = this._active.length - 1;t >= 0; t--)
        this._active[t].start();
  }
  _put(t, e, i) {
    if (!this._active.length)
      this._handlerFb(this._id, "PUT", It(t, e, i));
    else
      for (let r = this._active.length - 1;r >= 0; r--)
        this._active[r].put(t, e, i);
  }
  start() {
    this.reset(), this._state = 1;
  }
  put(t, e, i) {
    if (this._state !== 3) {
      if (this._state === 1)
        for (;e < i; ) {
          let r = t[e++];
          if (r === 59) {
            this._state = 2, this._start();
            break;
          }
          if (r < 48 || 57 < r) {
            this._state = 3;
            return;
          }
          this._id === -1 && (this._id = 0), this._id = this._id * 10 + r - 48;
        }
      this._state === 2 && i - e > 0 && this._put(t, e, i);
    }
  }
  end(t, e = true) {
    if (this._state !== 0) {
      if (this._state !== 3)
        if (this._state === 1 && this._start(), !this._active.length)
          this._handlerFb(this._id, "END", t);
        else {
          let i = false, r = this._active.length - 1, n = false;
          if (this._stack.paused && (r = this._stack.loopPosition - 1, i = e, n = this._stack.fallThrough, this._stack.paused = false), !n && i === false) {
            for (;r >= 0 && (i = this._active[r].end(t), i !== true); r--)
              if (i instanceof Promise)
                return this._stack.paused = true, this._stack.loopPosition = r, this._stack.fallThrough = false, i;
            r--;
          }
          for (;r >= 0; r--)
            if (i = this._active[r].end(false), i instanceof Promise)
              return this._stack.paused = true, this._stack.loopPosition = r, this._stack.fallThrough = true, i;
        }
      this._active = qi, this._id = -1, this._state = 0;
    }
  }
};
var pe = class {
  constructor(t) {
    this._handler = t;
    this._data = "";
    this._hitLimit = false;
  }
  start() {
    this._data = "", this._hitLimit = false;
  }
  put(t, e, i) {
    this._hitLimit || (this._data += It(t, e, i), this._data.length > 1e7 && (this._data = "", this._hitLimit = true));
  }
  end(t) {
    let e = false;
    if (this._hitLimit)
      e = false;
    else if (t && (e = this._handler(this._data), e instanceof Promise))
      return e.then((i) => (this._data = "", this._hitLimit = false, i));
    return this._data = "", this._hitLimit = false, e;
  }
};
var Yi = [];
var _n = class {
  constructor() {
    this._handlers = Object.create(null);
    this._active = Yi;
    this._ident = 0;
    this._handlerFb = () => {};
    this._stack = { paused: false, loopPosition: 0, fallThrough: false };
  }
  dispose() {
    this._handlers = Object.create(null), this._handlerFb = () => {}, this._active = Yi;
  }
  registerHandler(t, e) {
    this._handlers[t] === undefined && (this._handlers[t] = []);
    let i = this._handlers[t];
    return i.push(e), { dispose: () => {
      let r = i.indexOf(e);
      r !== -1 && i.splice(r, 1);
    } };
  }
  clearHandler(t) {
    this._handlers[t] && delete this._handlers[t];
  }
  setHandlerFallback(t) {
    this._handlerFb = t;
  }
  reset() {
    if (this._active.length)
      for (let t = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1;t >= 0; --t)
        this._active[t].unhook(false);
    this._stack.paused = false, this._active = Yi, this._ident = 0;
  }
  hook(t, e) {
    if (this.reset(), this._ident = t, this._active = this._handlers[t] || Yi, !this._active.length)
      this._handlerFb(this._ident, "HOOK", e);
    else
      for (let i = this._active.length - 1;i >= 0; i--)
        this._active[i].hook(e);
  }
  put(t, e, i) {
    if (!this._active.length)
      this._handlerFb(this._ident, "PUT", It(t, e, i));
    else
      for (let r = this._active.length - 1;r >= 0; r--)
        this._active[r].put(t, e, i);
  }
  unhook(t, e = true) {
    if (!this._active.length)
      this._handlerFb(this._ident, "UNHOOK", t);
    else {
      let i = false, r = this._active.length - 1, n = false;
      if (this._stack.paused && (r = this._stack.loopPosition - 1, i = e, n = this._stack.fallThrough, this._stack.paused = false), !n && i === false) {
        for (;r >= 0 && (i = this._active[r].unhook(t), i !== true); r--)
          if (i instanceof Promise)
            return this._stack.paused = true, this._stack.loopPosition = r, this._stack.fallThrough = false, i;
        r--;
      }
      for (;r >= 0; r--)
        if (i = this._active[r].unhook(false), i instanceof Promise)
          return this._stack.paused = true, this._stack.loopPosition = r, this._stack.fallThrough = true, i;
    }
    this._active = Yi, this._ident = 0;
  }
};
var ji = new ci;
ji.addParam(0);
var Xi = class {
  constructor(t) {
    this._handler = t;
    this._data = "";
    this._params = ji;
    this._hitLimit = false;
  }
  hook(t) {
    this._params = t.length > 1 || t.params[0] ? t.clone() : ji, this._data = "", this._hitLimit = false;
  }
  put(t, e, i) {
    this._hitLimit || (this._data += It(t, e, i), this._data.length > 1e7 && (this._data = "", this._hitLimit = true));
  }
  unhook(t) {
    let e = false;
    if (this._hitLimit)
      e = false;
    else if (t && (e = this._handler(this._data, this._params), e instanceof Promise))
      return e.then((i) => (this._params = ji, this._data = "", this._hitLimit = false, i));
    return this._params = ji, this._data = "", this._hitLimit = false, e;
  }
};
var Fs = class {
  constructor(t) {
    this.table = new Uint8Array(t);
  }
  setDefault(t, e) {
    this.table.fill(t << 4 | e);
  }
  add(t, e, i, r) {
    this.table[e << 8 | t] = i << 4 | r;
  }
  addMany(t, e, i, r) {
    for (let n = 0;n < t.length; n++)
      this.table[e << 8 | t[n]] = i << 4 | r;
  }
};
var ke = 160;
var hc = function() {
  let s15 = new Fs(4095), e = Array.apply(null, Array(256)).map((a, u) => u), i = (a, u) => e.slice(a, u), r = i(32, 127), n = i(0, 24);
  n.push(25), n.push.apply(n, i(28, 32));
  let o = i(0, 14), l;
  s15.setDefault(1, 0), s15.addMany(r, 0, 2, 0);
  for (l in o)
    s15.addMany([24, 26, 153, 154], l, 3, 0), s15.addMany(i(128, 144), l, 3, 0), s15.addMany(i(144, 152), l, 3, 0), s15.add(156, l, 0, 0), s15.add(27, l, 11, 1), s15.add(157, l, 4, 8), s15.addMany([152, 158, 159], l, 0, 7), s15.add(155, l, 11, 3), s15.add(144, l, 11, 9);
  return s15.addMany(n, 0, 3, 0), s15.addMany(n, 1, 3, 1), s15.add(127, 1, 0, 1), s15.addMany(n, 8, 0, 8), s15.addMany(n, 3, 3, 3), s15.add(127, 3, 0, 3), s15.addMany(n, 4, 3, 4), s15.add(127, 4, 0, 4), s15.addMany(n, 6, 3, 6), s15.addMany(n, 5, 3, 5), s15.add(127, 5, 0, 5), s15.addMany(n, 2, 3, 2), s15.add(127, 2, 0, 2), s15.add(93, 1, 4, 8), s15.addMany(r, 8, 5, 8), s15.add(127, 8, 5, 8), s15.addMany([156, 27, 24, 26, 7], 8, 6, 0), s15.addMany(i(28, 32), 8, 0, 8), s15.addMany([88, 94, 95], 1, 0, 7), s15.addMany(r, 7, 0, 7), s15.addMany(n, 7, 0, 7), s15.add(156, 7, 0, 0), s15.add(127, 7, 0, 7), s15.add(91, 1, 11, 3), s15.addMany(i(64, 127), 3, 7, 0), s15.addMany(i(48, 60), 3, 8, 4), s15.addMany([60, 61, 62, 63], 3, 9, 4), s15.addMany(i(48, 60), 4, 8, 4), s15.addMany(i(64, 127), 4, 7, 0), s15.addMany([60, 61, 62, 63], 4, 0, 6), s15.addMany(i(32, 64), 6, 0, 6), s15.add(127, 6, 0, 6), s15.addMany(i(64, 127), 6, 0, 0), s15.addMany(i(32, 48), 3, 9, 5), s15.addMany(i(32, 48), 5, 9, 5), s15.addMany(i(48, 64), 5, 0, 6), s15.addMany(i(64, 127), 5, 7, 0), s15.addMany(i(32, 48), 4, 9, 5), s15.addMany(i(32, 48), 1, 9, 2), s15.addMany(i(32, 48), 2, 9, 2), s15.addMany(i(48, 127), 2, 10, 0), s15.addMany(i(48, 80), 1, 10, 0), s15.addMany(i(81, 88), 1, 10, 0), s15.addMany([89, 90, 92], 1, 10, 0), s15.addMany(i(96, 127), 1, 10, 0), s15.add(80, 1, 11, 9), s15.addMany(n, 9, 0, 9), s15.add(127, 9, 0, 9), s15.addMany(i(28, 32), 9, 0, 9), s15.addMany(i(32, 48), 9, 9, 12), s15.addMany(i(48, 60), 9, 8, 10), s15.addMany([60, 61, 62, 63], 9, 9, 10), s15.addMany(n, 11, 0, 11), s15.addMany(i(32, 128), 11, 0, 11), s15.addMany(i(28, 32), 11, 0, 11), s15.addMany(n, 10, 0, 10), s15.add(127, 10, 0, 10), s15.addMany(i(28, 32), 10, 0, 10), s15.addMany(i(48, 60), 10, 8, 10), s15.addMany([60, 61, 62, 63], 10, 0, 11), s15.addMany(i(32, 48), 10, 9, 12), s15.addMany(n, 12, 0, 12), s15.add(127, 12, 0, 12), s15.addMany(i(28, 32), 12, 0, 12), s15.addMany(i(32, 48), 12, 9, 12), s15.addMany(i(48, 64), 12, 0, 11), s15.addMany(i(64, 127), 12, 12, 13), s15.addMany(i(64, 127), 10, 12, 13), s15.addMany(i(64, 127), 9, 12, 13), s15.addMany(n, 13, 13, 13), s15.addMany(r, 13, 13, 13), s15.add(127, 13, 0, 13), s15.addMany([27, 156, 24, 26], 13, 14, 0), s15.add(ke, 0, 2, 0), s15.add(ke, 8, 5, 8), s15.add(ke, 6, 0, 6), s15.add(ke, 11, 0, 11), s15.add(ke, 13, 13, 13), s15;
}();
var bn = class extends D {
  constructor(e = hc) {
    super();
    this._transitions = e;
    this._parseStack = { state: 0, handlers: [], handlerPos: 0, transition: 0, chunkPos: 0 };
    this.initialState = 0, this.currentState = this.initialState, this._params = new ci, this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0, this._printHandlerFb = (i, r, n) => {}, this._executeHandlerFb = (i) => {}, this._csiHandlerFb = (i, r) => {}, this._escHandlerFb = (i) => {}, this._errorHandlerFb = (i) => i, this._printHandler = this._printHandlerFb, this._executeHandlers = Object.create(null), this._csiHandlers = Object.create(null), this._escHandlers = Object.create(null), this._register(C(() => {
      this._csiHandlers = Object.create(null), this._executeHandlers = Object.create(null), this._escHandlers = Object.create(null);
    })), this._oscParser = this._register(new mn), this._dcsParser = this._register(new _n), this._errorHandler = this._errorHandlerFb, this.registerEscHandler({ final: "\\" }, () => true);
  }
  _identifier(e, i = [64, 126]) {
    let r = 0;
    if (e.prefix) {
      if (e.prefix.length > 1)
        throw new Error("only one byte as prefix supported");
      if (r = e.prefix.charCodeAt(0), r && 60 > r || r > 63)
        throw new Error("prefix must be in range 0x3c .. 0x3f");
    }
    if (e.intermediates) {
      if (e.intermediates.length > 2)
        throw new Error("only two bytes as intermediates are supported");
      for (let o = 0;o < e.intermediates.length; ++o) {
        let l = e.intermediates.charCodeAt(o);
        if (32 > l || l > 47)
          throw new Error("intermediate must be in range 0x20 .. 0x2f");
        r <<= 8, r |= l;
      }
    }
    if (e.final.length !== 1)
      throw new Error("final must be a single byte");
    let n = e.final.charCodeAt(0);
    if (i[0] > n || n > i[1])
      throw new Error(`final must be in range ${i[0]} .. ${i[1]}`);
    return r <<= 8, r |= n, r;
  }
  identToString(e) {
    let i = [];
    for (;e; )
      i.push(String.fromCharCode(e & 255)), e >>= 8;
    return i.reverse().join("");
  }
  setPrintHandler(e) {
    this._printHandler = e;
  }
  clearPrintHandler() {
    this._printHandler = this._printHandlerFb;
  }
  registerEscHandler(e, i) {
    let r = this._identifier(e, [48, 126]);
    this._escHandlers[r] === undefined && (this._escHandlers[r] = []);
    let n = this._escHandlers[r];
    return n.push(i), { dispose: () => {
      let o = n.indexOf(i);
      o !== -1 && n.splice(o, 1);
    } };
  }
  clearEscHandler(e) {
    this._escHandlers[this._identifier(e, [48, 126])] && delete this._escHandlers[this._identifier(e, [48, 126])];
  }
  setEscHandlerFallback(e) {
    this._escHandlerFb = e;
  }
  setExecuteHandler(e, i) {
    this._executeHandlers[e.charCodeAt(0)] = i;
  }
  clearExecuteHandler(e) {
    this._executeHandlers[e.charCodeAt(0)] && delete this._executeHandlers[e.charCodeAt(0)];
  }
  setExecuteHandlerFallback(e) {
    this._executeHandlerFb = e;
  }
  registerCsiHandler(e, i) {
    let r = this._identifier(e);
    this._csiHandlers[r] === undefined && (this._csiHandlers[r] = []);
    let n = this._csiHandlers[r];
    return n.push(i), { dispose: () => {
      let o = n.indexOf(i);
      o !== -1 && n.splice(o, 1);
    } };
  }
  clearCsiHandler(e) {
    this._csiHandlers[this._identifier(e)] && delete this._csiHandlers[this._identifier(e)];
  }
  setCsiHandlerFallback(e) {
    this._csiHandlerFb = e;
  }
  registerDcsHandler(e, i) {
    return this._dcsParser.registerHandler(this._identifier(e), i);
  }
  clearDcsHandler(e) {
    this._dcsParser.clearHandler(this._identifier(e));
  }
  setDcsHandlerFallback(e) {
    this._dcsParser.setHandlerFallback(e);
  }
  registerOscHandler(e, i) {
    return this._oscParser.registerHandler(e, i);
  }
  clearOscHandler(e) {
    this._oscParser.clearHandler(e);
  }
  setOscHandlerFallback(e) {
    this._oscParser.setHandlerFallback(e);
  }
  setErrorHandler(e) {
    this._errorHandler = e;
  }
  clearErrorHandler() {
    this._errorHandler = this._errorHandlerFb;
  }
  reset() {
    this.currentState = this.initialState, this._oscParser.reset(), this._dcsParser.reset(), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0, this._parseStack.state !== 0 && (this._parseStack.state = 2, this._parseStack.handlers = []);
  }
  _preserveStack(e, i, r, n, o) {
    this._parseStack.state = e, this._parseStack.handlers = i, this._parseStack.handlerPos = r, this._parseStack.transition = n, this._parseStack.chunkPos = o;
  }
  parse(e, i, r) {
    let n = 0, o = 0, l = 0, a;
    if (this._parseStack.state)
      if (this._parseStack.state === 2)
        this._parseStack.state = 0, l = this._parseStack.chunkPos + 1;
      else {
        if (r === undefined || this._parseStack.state === 1)
          throw this._parseStack.state = 1, new Error("improper continuation due to previous async handler, giving up parsing");
        let u = this._parseStack.handlers, h = this._parseStack.handlerPos - 1;
        switch (this._parseStack.state) {
          case 3:
            if (r === false && h > -1) {
              for (;h >= 0 && (a = u[h](this._params), a !== true); h--)
                if (a instanceof Promise)
                  return this._parseStack.handlerPos = h, a;
            }
            this._parseStack.handlers = [];
            break;
          case 4:
            if (r === false && h > -1) {
              for (;h >= 0 && (a = u[h](), a !== true); h--)
                if (a instanceof Promise)
                  return this._parseStack.handlerPos = h, a;
            }
            this._parseStack.handlers = [];
            break;
          case 6:
            if (n = e[this._parseStack.chunkPos], a = this._dcsParser.unhook(n !== 24 && n !== 26, r), a)
              return a;
            n === 27 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
            break;
          case 5:
            if (n = e[this._parseStack.chunkPos], a = this._oscParser.end(n !== 24 && n !== 26, r), a)
              return a;
            n === 27 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
            break;
        }
        this._parseStack.state = 0, l = this._parseStack.chunkPos + 1, this.precedingJoinState = 0, this.currentState = this._parseStack.transition & 15;
      }
    for (let u = l;u < i; ++u) {
      switch (n = e[u], o = this._transitions.table[this.currentState << 8 | (n < 160 ? n : ke)], o >> 4) {
        case 2:
          for (let m = u + 1;; ++m) {
            if (m >= i || (n = e[m]) < 32 || n > 126 && n < ke) {
              this._printHandler(e, u, m), u = m - 1;
              break;
            }
            if (++m >= i || (n = e[m]) < 32 || n > 126 && n < ke) {
              this._printHandler(e, u, m), u = m - 1;
              break;
            }
            if (++m >= i || (n = e[m]) < 32 || n > 126 && n < ke) {
              this._printHandler(e, u, m), u = m - 1;
              break;
            }
            if (++m >= i || (n = e[m]) < 32 || n > 126 && n < ke) {
              this._printHandler(e, u, m), u = m - 1;
              break;
            }
          }
          break;
        case 3:
          this._executeHandlers[n] ? this._executeHandlers[n]() : this._executeHandlerFb(n), this.precedingJoinState = 0;
          break;
        case 0:
          break;
        case 1:
          if (this._errorHandler({ position: u, code: n, currentState: this.currentState, collect: this._collect, params: this._params, abort: false }).abort)
            return;
          break;
        case 7:
          let c = this._csiHandlers[this._collect << 8 | n], d = c ? c.length - 1 : -1;
          for (;d >= 0 && (a = c[d](this._params), a !== true); d--)
            if (a instanceof Promise)
              return this._preserveStack(3, c, d, o, u), a;
          d < 0 && this._csiHandlerFb(this._collect << 8 | n, this._params), this.precedingJoinState = 0;
          break;
        case 8:
          do
            switch (n) {
              case 59:
                this._params.addParam(0);
                break;
              case 58:
                this._params.addSubParam(-1);
                break;
              default:
                this._params.addDigit(n - 48);
            }
          while (++u < i && (n = e[u]) > 47 && n < 60);
          u--;
          break;
        case 9:
          this._collect <<= 8, this._collect |= n;
          break;
        case 10:
          let _ = this._escHandlers[this._collect << 8 | n], p = _ ? _.length - 1 : -1;
          for (;p >= 0 && (a = _[p](), a !== true); p--)
            if (a instanceof Promise)
              return this._preserveStack(4, _, p, o, u), a;
          p < 0 && this._escHandlerFb(this._collect << 8 | n), this.precedingJoinState = 0;
          break;
        case 11:
          this._params.reset(), this._params.addParam(0), this._collect = 0;
          break;
        case 12:
          this._dcsParser.hook(this._collect << 8 | n, this._params);
          break;
        case 13:
          for (let m = u + 1;; ++m)
            if (m >= i || (n = e[m]) === 24 || n === 26 || n === 27 || n > 127 && n < ke) {
              this._dcsParser.put(e, u, m), u = m - 1;
              break;
            }
          break;
        case 14:
          if (a = this._dcsParser.unhook(n !== 24 && n !== 26), a)
            return this._preserveStack(6, [], 0, o, u), a;
          n === 27 && (o |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0;
          break;
        case 4:
          this._oscParser.start();
          break;
        case 5:
          for (let m = u + 1;; m++)
            if (m >= i || (n = e[m]) < 32 || n > 127 && n < ke) {
              this._oscParser.put(e, u, m), u = m - 1;
              break;
            }
          break;
        case 6:
          if (a = this._oscParser.end(n !== 24 && n !== 26), a)
            return this._preserveStack(5, [], 0, o, u), a;
          n === 27 && (o |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0;
          break;
      }
      this.currentState = o & 15;
    }
  }
};
var dc = /^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/;
var fc = /^[\da-f]+$/;
function Ws(s15) {
  if (!s15)
    return;
  let t = s15.toLowerCase();
  if (t.indexOf("rgb:") === 0) {
    t = t.slice(4);
    let e = dc.exec(t);
    if (e) {
      let i = e[1] ? 15 : e[4] ? 255 : e[7] ? 4095 : 65535;
      return [Math.round(parseInt(e[1] || e[4] || e[7] || e[10], 16) / i * 255), Math.round(parseInt(e[2] || e[5] || e[8] || e[11], 16) / i * 255), Math.round(parseInt(e[3] || e[6] || e[9] || e[12], 16) / i * 255)];
    }
  } else if (t.indexOf("#") === 0 && (t = t.slice(1), fc.exec(t) && [3, 6, 9, 12].includes(t.length))) {
    let e = t.length / 3, i = [0, 0, 0];
    for (let r = 0;r < 3; ++r) {
      let n = parseInt(t.slice(e * r, e * r + e), 16);
      i[r] = e === 1 ? n << 4 : e === 2 ? n : e === 3 ? n >> 4 : n >> 8;
    }
    return i;
  }
}
function Hs(s15, t) {
  let e = s15.toString(16), i = e.length < 2 ? "0" + e : e;
  switch (t) {
    case 4:
      return e[0];
    case 8:
      return i;
    case 12:
      return (i + i).slice(0, 3);
    default:
      return i + i;
  }
}
function ml(s15, t = 16) {
  let [e, i, r] = s15;
  return `rgb:${Hs(e, t)}/${Hs(i, t)}/${Hs(r, t)}`;
}
var mc = { "(": 0, ")": 1, "*": 2, "+": 3, "-": 1, ".": 2 };
var ut = 131072;
var _l = 10;
function bl(s15, t) {
  if (s15 > 24)
    return t.setWinLines || false;
  switch (s15) {
    case 1:
      return !!t.restoreWin;
    case 2:
      return !!t.minimizeWin;
    case 3:
      return !!t.setWinPosition;
    case 4:
      return !!t.setWinSizePixels;
    case 5:
      return !!t.raiseWin;
    case 6:
      return !!t.lowerWin;
    case 7:
      return !!t.refreshWin;
    case 8:
      return !!t.setWinSizeChars;
    case 9:
      return !!t.maximizeWin;
    case 10:
      return !!t.fullscreenWin;
    case 11:
      return !!t.getWinState;
    case 13:
      return !!t.getWinPosition;
    case 14:
      return !!t.getWinSizePixels;
    case 15:
      return !!t.getScreenSizePixels;
    case 16:
      return !!t.getCellSizePixels;
    case 18:
      return !!t.getWinSizeChars;
    case 19:
      return !!t.getScreenSizeChars;
    case 20:
      return !!t.getIconTitle;
    case 21:
      return !!t.getWinTitle;
    case 22:
      return !!t.pushTitle;
    case 23:
      return !!t.popTitle;
    case 24:
      return !!t.setWinLines;
  }
  return false;
}
var vl = 5000;
var gl = 0;
var vn = class extends D {
  constructor(e, i, r, n, o, l, a, u, h = new bn) {
    super();
    this._bufferService = e;
    this._charsetService = i;
    this._coreService = r;
    this._logService = n;
    this._optionsService = o;
    this._oscLinkService = l;
    this._coreMouseService = a;
    this._unicodeService = u;
    this._parser = h;
    this._parseBuffer = new Uint32Array(4096);
    this._stringDecoder = new er;
    this._utf8Decoder = new tr;
    this._windowTitle = "";
    this._iconName = "";
    this._windowTitleStack = [];
    this._iconNameStack = [];
    this._curAttrData = X.clone();
    this._eraseAttrDataInternal = X.clone();
    this._onRequestBell = this._register(new v);
    this.onRequestBell = this._onRequestBell.event;
    this._onRequestRefreshRows = this._register(new v);
    this.onRequestRefreshRows = this._onRequestRefreshRows.event;
    this._onRequestReset = this._register(new v);
    this.onRequestReset = this._onRequestReset.event;
    this._onRequestSendFocus = this._register(new v);
    this.onRequestSendFocus = this._onRequestSendFocus.event;
    this._onRequestSyncScrollBar = this._register(new v);
    this.onRequestSyncScrollBar = this._onRequestSyncScrollBar.event;
    this._onRequestWindowsOptionsReport = this._register(new v);
    this.onRequestWindowsOptionsReport = this._onRequestWindowsOptionsReport.event;
    this._onA11yChar = this._register(new v);
    this.onA11yChar = this._onA11yChar.event;
    this._onA11yTab = this._register(new v);
    this.onA11yTab = this._onA11yTab.event;
    this._onCursorMove = this._register(new v);
    this.onCursorMove = this._onCursorMove.event;
    this._onLineFeed = this._register(new v);
    this.onLineFeed = this._onLineFeed.event;
    this._onScroll = this._register(new v);
    this.onScroll = this._onScroll.event;
    this._onTitleChange = this._register(new v);
    this.onTitleChange = this._onTitleChange.event;
    this._onColor = this._register(new v);
    this.onColor = this._onColor.event;
    this._parseStack = { paused: false, cursorStartX: 0, cursorStartY: 0, decodedLength: 0, position: 0 };
    this._specialColors = [256, 257, 258];
    this._register(this._parser), this._dirtyRowTracker = new Zi(this._bufferService), this._activeBuffer = this._bufferService.buffer, this._register(this._bufferService.buffers.onBufferActivate((c) => this._activeBuffer = c.activeBuffer)), this._parser.setCsiHandlerFallback((c, d) => {
      this._logService.debug("Unknown CSI code: ", { identifier: this._parser.identToString(c), params: d.toArray() });
    }), this._parser.setEscHandlerFallback((c) => {
      this._logService.debug("Unknown ESC code: ", { identifier: this._parser.identToString(c) });
    }), this._parser.setExecuteHandlerFallback((c) => {
      this._logService.debug("Unknown EXECUTE code: ", { code: c });
    }), this._parser.setOscHandlerFallback((c, d, _) => {
      this._logService.debug("Unknown OSC code: ", { identifier: c, action: d, data: _ });
    }), this._parser.setDcsHandlerFallback((c, d, _) => {
      d === "HOOK" && (_ = _.toArray()), this._logService.debug("Unknown DCS code: ", { identifier: this._parser.identToString(c), action: d, payload: _ });
    }), this._parser.setPrintHandler((c, d, _) => this.print(c, d, _)), this._parser.registerCsiHandler({ final: "@" }, (c) => this.insertChars(c)), this._parser.registerCsiHandler({ intermediates: " ", final: "@" }, (c) => this.scrollLeft(c)), this._parser.registerCsiHandler({ final: "A" }, (c) => this.cursorUp(c)), this._parser.registerCsiHandler({ intermediates: " ", final: "A" }, (c) => this.scrollRight(c)), this._parser.registerCsiHandler({ final: "B" }, (c) => this.cursorDown(c)), this._parser.registerCsiHandler({ final: "C" }, (c) => this.cursorForward(c)), this._parser.registerCsiHandler({ final: "D" }, (c) => this.cursorBackward(c)), this._parser.registerCsiHandler({ final: "E" }, (c) => this.cursorNextLine(c)), this._parser.registerCsiHandler({ final: "F" }, (c) => this.cursorPrecedingLine(c)), this._parser.registerCsiHandler({ final: "G" }, (c) => this.cursorCharAbsolute(c)), this._parser.registerCsiHandler({ final: "H" }, (c) => this.cursorPosition(c)), this._parser.registerCsiHandler({ final: "I" }, (c) => this.cursorForwardTab(c)), this._parser.registerCsiHandler({ final: "J" }, (c) => this.eraseInDisplay(c, false)), this._parser.registerCsiHandler({ prefix: "?", final: "J" }, (c) => this.eraseInDisplay(c, true)), this._parser.registerCsiHandler({ final: "K" }, (c) => this.eraseInLine(c, false)), this._parser.registerCsiHandler({ prefix: "?", final: "K" }, (c) => this.eraseInLine(c, true)), this._parser.registerCsiHandler({ final: "L" }, (c) => this.insertLines(c)), this._parser.registerCsiHandler({ final: "M" }, (c) => this.deleteLines(c)), this._parser.registerCsiHandler({ final: "P" }, (c) => this.deleteChars(c)), this._parser.registerCsiHandler({ final: "S" }, (c) => this.scrollUp(c)), this._parser.registerCsiHandler({ final: "T" }, (c) => this.scrollDown(c)), this._parser.registerCsiHandler({ final: "X" }, (c) => this.eraseChars(c)), this._parser.registerCsiHandler({ final: "Z" }, (c) => this.cursorBackwardTab(c)), this._parser.registerCsiHandler({ final: "`" }, (c) => this.charPosAbsolute(c)), this._parser.registerCsiHandler({ final: "a" }, (c) => this.hPositionRelative(c)), this._parser.registerCsiHandler({ final: "b" }, (c) => this.repeatPrecedingCharacter(c)), this._parser.registerCsiHandler({ final: "c" }, (c) => this.sendDeviceAttributesPrimary(c)), this._parser.registerCsiHandler({ prefix: ">", final: "c" }, (c) => this.sendDeviceAttributesSecondary(c)), this._parser.registerCsiHandler({ final: "d" }, (c) => this.linePosAbsolute(c)), this._parser.registerCsiHandler({ final: "e" }, (c) => this.vPositionRelative(c)), this._parser.registerCsiHandler({ final: "f" }, (c) => this.hVPosition(c)), this._parser.registerCsiHandler({ final: "g" }, (c) => this.tabClear(c)), this._parser.registerCsiHandler({ final: "h" }, (c) => this.setMode(c)), this._parser.registerCsiHandler({ prefix: "?", final: "h" }, (c) => this.setModePrivate(c)), this._parser.registerCsiHandler({ final: "l" }, (c) => this.resetMode(c)), this._parser.registerCsiHandler({ prefix: "?", final: "l" }, (c) => this.resetModePrivate(c)), this._parser.registerCsiHandler({ final: "m" }, (c) => this.charAttributes(c)), this._parser.registerCsiHandler({ final: "n" }, (c) => this.deviceStatus(c)), this._parser.registerCsiHandler({ prefix: "?", final: "n" }, (c) => this.deviceStatusPrivate(c)), this._parser.registerCsiHandler({ intermediates: "!", final: "p" }, (c) => this.softReset(c)), this._parser.registerCsiHandler({ intermediates: " ", final: "q" }, (c) => this.setCursorStyle(c)), this._parser.registerCsiHandler({ final: "r" }, (c) => this.setScrollRegion(c)), this._parser.registerCsiHandler({ final: "s" }, (c) => this.saveCursor(c)), this._parser.registerCsiHandler({ final: "t" }, (c) => this.windowOptions(c)), this._parser.registerCsiHandler({ final: "u" }, (c) => this.restoreCursor(c)), this._parser.registerCsiHandler({ intermediates: "'", final: "}" }, (c) => this.insertColumns(c)), this._parser.registerCsiHandler({ intermediates: "'", final: "~" }, (c) => this.deleteColumns(c)), this._parser.registerCsiHandler({ intermediates: '"', final: "q" }, (c) => this.selectProtected(c)), this._parser.registerCsiHandler({ intermediates: "$", final: "p" }, (c) => this.requestMode(c, true)), this._parser.registerCsiHandler({ prefix: "?", intermediates: "$", final: "p" }, (c) => this.requestMode(c, false)), this._parser.setExecuteHandler(b.BEL, () => this.bell()), this._parser.setExecuteHandler(b.LF, () => this.lineFeed()), this._parser.setExecuteHandler(b.VT, () => this.lineFeed()), this._parser.setExecuteHandler(b.FF, () => this.lineFeed()), this._parser.setExecuteHandler(b.CR, () => this.carriageReturn()), this._parser.setExecuteHandler(b.BS, () => this.backspace()), this._parser.setExecuteHandler(b.HT, () => this.tab()), this._parser.setExecuteHandler(b.SO, () => this.shiftOut()), this._parser.setExecuteHandler(b.SI, () => this.shiftIn()), this._parser.setExecuteHandler(Ai.IND, () => this.index()), this._parser.setExecuteHandler(Ai.NEL, () => this.nextLine()), this._parser.setExecuteHandler(Ai.HTS, () => this.tabSet()), this._parser.registerOscHandler(0, new pe((c) => (this.setTitle(c), this.setIconName(c), true))), this._parser.registerOscHandler(1, new pe((c) => this.setIconName(c))), this._parser.registerOscHandler(2, new pe((c) => this.setTitle(c))), this._parser.registerOscHandler(4, new pe((c) => this.setOrReportIndexedColor(c))), this._parser.registerOscHandler(8, new pe((c) => this.setHyperlink(c))), this._parser.registerOscHandler(10, new pe((c) => this.setOrReportFgColor(c))), this._parser.registerOscHandler(11, new pe((c) => this.setOrReportBgColor(c))), this._parser.registerOscHandler(12, new pe((c) => this.setOrReportCursorColor(c))), this._parser.registerOscHandler(104, new pe((c) => this.restoreIndexedColor(c))), this._parser.registerOscHandler(110, new pe((c) => this.restoreFgColor(c))), this._parser.registerOscHandler(111, new pe((c) => this.restoreBgColor(c))), this._parser.registerOscHandler(112, new pe((c) => this.restoreCursorColor(c))), this._parser.registerEscHandler({ final: "7" }, () => this.saveCursor()), this._parser.registerEscHandler({ final: "8" }, () => this.restoreCursor()), this._parser.registerEscHandler({ final: "D" }, () => this.index()), this._parser.registerEscHandler({ final: "E" }, () => this.nextLine()), this._parser.registerEscHandler({ final: "H" }, () => this.tabSet()), this._parser.registerEscHandler({ final: "M" }, () => this.reverseIndex()), this._parser.registerEscHandler({ final: "=" }, () => this.keypadApplicationMode()), this._parser.registerEscHandler({ final: ">" }, () => this.keypadNumericMode()), this._parser.registerEscHandler({ final: "c" }, () => this.fullReset()), this._parser.registerEscHandler({ final: "n" }, () => this.setgLevel(2)), this._parser.registerEscHandler({ final: "o" }, () => this.setgLevel(3)), this._parser.registerEscHandler({ final: "|" }, () => this.setgLevel(3)), this._parser.registerEscHandler({ final: "}" }, () => this.setgLevel(2)), this._parser.registerEscHandler({ final: "~" }, () => this.setgLevel(1)), this._parser.registerEscHandler({ intermediates: "%", final: "@" }, () => this.selectDefaultCharset()), this._parser.registerEscHandler({ intermediates: "%", final: "G" }, () => this.selectDefaultCharset());
    for (let c in ne)
      this._parser.registerEscHandler({ intermediates: "(", final: c }, () => this.selectCharset("(" + c)), this._parser.registerEscHandler({ intermediates: ")", final: c }, () => this.selectCharset(")" + c)), this._parser.registerEscHandler({ intermediates: "*", final: c }, () => this.selectCharset("*" + c)), this._parser.registerEscHandler({ intermediates: "+", final: c }, () => this.selectCharset("+" + c)), this._parser.registerEscHandler({ intermediates: "-", final: c }, () => this.selectCharset("-" + c)), this._parser.registerEscHandler({ intermediates: ".", final: c }, () => this.selectCharset("." + c)), this._parser.registerEscHandler({ intermediates: "/", final: c }, () => this.selectCharset("/" + c));
    this._parser.registerEscHandler({ intermediates: "#", final: "8" }, () => this.screenAlignmentPattern()), this._parser.setErrorHandler((c) => (this._logService.error("Parsing error: ", c), c)), this._parser.registerDcsHandler({ intermediates: "$", final: "q" }, new Xi((c, d) => this.requestStatusString(c, d)));
  }
  getAttrData() {
    return this._curAttrData;
  }
  _preserveStack(e, i, r, n) {
    this._parseStack.paused = true, this._parseStack.cursorStartX = e, this._parseStack.cursorStartY = i, this._parseStack.decodedLength = r, this._parseStack.position = n;
  }
  _logSlowResolvingAsync(e) {
    this._logService.logLevel <= 3 && Promise.race([e, new Promise((i, r) => setTimeout(() => r("#SLOW_TIMEOUT"), vl))]).catch((i) => {
      if (i !== "#SLOW_TIMEOUT")
        throw i;
      console.warn(`async parser handler taking longer than ${vl} ms`);
    });
  }
  _getCurrentLinkId() {
    return this._curAttrData.extended.urlId;
  }
  parse(e, i) {
    let r, n = this._activeBuffer.x, o = this._activeBuffer.y, l = 0, a = this._parseStack.paused;
    if (a) {
      if (r = this._parser.parse(this._parseBuffer, this._parseStack.decodedLength, i))
        return this._logSlowResolvingAsync(r), r;
      n = this._parseStack.cursorStartX, o = this._parseStack.cursorStartY, this._parseStack.paused = false, e.length > ut && (l = this._parseStack.position + ut);
    }
    if (this._logService.logLevel <= 1 && this._logService.debug(`parsing data ${typeof e == "string" ? ` "${e}"` : ` "${Array.prototype.map.call(e, (c) => String.fromCharCode(c)).join("")}"`}`), this._logService.logLevel === 0 && this._logService.trace("parsing data (codes)", typeof e == "string" ? e.split("").map((c) => c.charCodeAt(0)) : e), this._parseBuffer.length < e.length && this._parseBuffer.length < ut && (this._parseBuffer = new Uint32Array(Math.min(e.length, ut))), a || this._dirtyRowTracker.clearRange(), e.length > ut)
      for (let c = l;c < e.length; c += ut) {
        let d = c + ut < e.length ? c + ut : e.length, _ = typeof e == "string" ? this._stringDecoder.decode(e.substring(c, d), this._parseBuffer) : this._utf8Decoder.decode(e.subarray(c, d), this._parseBuffer);
        if (r = this._parser.parse(this._parseBuffer, _))
          return this._preserveStack(n, o, _, c), this._logSlowResolvingAsync(r), r;
      }
    else if (!a) {
      let c = typeof e == "string" ? this._stringDecoder.decode(e, this._parseBuffer) : this._utf8Decoder.decode(e, this._parseBuffer);
      if (r = this._parser.parse(this._parseBuffer, c))
        return this._preserveStack(n, o, c, 0), this._logSlowResolvingAsync(r), r;
    }
    (this._activeBuffer.x !== n || this._activeBuffer.y !== o) && this._onCursorMove.fire();
    let u = this._dirtyRowTracker.end + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp), h = this._dirtyRowTracker.start + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
    h < this._bufferService.rows && this._onRequestRefreshRows.fire({ start: Math.min(h, this._bufferService.rows - 1), end: Math.min(u, this._bufferService.rows - 1) });
  }
  print(e, i, r) {
    let n, o, l = this._charsetService.charset, a = this._optionsService.rawOptions.screenReaderMode, u = this._bufferService.cols, h = this._coreService.decPrivateModes.wraparound, c = this._coreService.modes.insertMode, d = this._curAttrData, _ = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
    this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._activeBuffer.x && r - i > 0 && _.getWidth(this._activeBuffer.x - 1) === 2 && _.setCellFromCodepoint(this._activeBuffer.x - 1, 0, 1, d);
    let p = this._parser.precedingJoinState;
    for (let m = i;m < r; ++m) {
      if (n = e[m], n < 127 && l) {
        let O = l[String.fromCharCode(n)];
        O && (n = O.charCodeAt(0));
      }
      let f = this._unicodeService.charProperties(n, p);
      o = Ae.extractWidth(f);
      let A = Ae.extractShouldJoin(f), R = A ? Ae.extractWidth(p) : 0;
      if (p = f, a && this._onA11yChar.fire(Ce(n)), this._getCurrentLinkId() && this._oscLinkService.addLineToLink(this._getCurrentLinkId(), this._activeBuffer.ybase + this._activeBuffer.y), this._activeBuffer.x + o - R > u) {
        if (h) {
          let O = _, I = this._activeBuffer.x - R;
          for (this._activeBuffer.x = R, this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData(), true)) : (this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = true), _ = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y), R > 0 && _ instanceof Ze && _.copyCellsFrom(O, I, 0, R, false);I < u; )
            O.setCellFromCodepoint(I++, 0, 1, d);
        } else if (this._activeBuffer.x = u - 1, o === 2)
          continue;
      }
      if (A && this._activeBuffer.x) {
        let O = _.getWidth(this._activeBuffer.x - 1) ? 1 : 2;
        _.addCodepointToCell(this._activeBuffer.x - O, n, o);
        for (let I = o - R;--I >= 0; )
          _.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, d);
        continue;
      }
      if (c && (_.insertCells(this._activeBuffer.x, o - R, this._activeBuffer.getNullCell(d)), _.getWidth(u - 1) === 2 && _.setCellFromCodepoint(u - 1, 0, 1, d)), _.setCellFromCodepoint(this._activeBuffer.x++, n, o, d), o > 0)
        for (;--o; )
          _.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, d);
    }
    this._parser.precedingJoinState = p, this._activeBuffer.x < u && r - i > 0 && _.getWidth(this._activeBuffer.x) === 0 && !_.hasContent(this._activeBuffer.x) && _.setCellFromCodepoint(this._activeBuffer.x, 0, 1, d), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
  }
  registerCsiHandler(e, i) {
    return e.final === "t" && !e.prefix && !e.intermediates ? this._parser.registerCsiHandler(e, (r) => bl(r.params[0], this._optionsService.rawOptions.windowOptions) ? i(r) : true) : this._parser.registerCsiHandler(e, i);
  }
  registerDcsHandler(e, i) {
    return this._parser.registerDcsHandler(e, new Xi(i));
  }
  registerEscHandler(e, i) {
    return this._parser.registerEscHandler(e, i);
  }
  registerOscHandler(e, i) {
    return this._parser.registerOscHandler(e, new pe(i));
  }
  bell() {
    return this._onRequestBell.fire(), true;
  }
  lineFeed() {
    return this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._optionsService.rawOptions.convertEol && (this._activeBuffer.x = 0), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows ? this._activeBuffer.y = this._bufferService.rows - 1 : this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false, this._activeBuffer.x >= this._bufferService.cols && this._activeBuffer.x--, this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._onLineFeed.fire(), true;
  }
  carriageReturn() {
    return this._activeBuffer.x = 0, true;
  }
  backspace() {
    if (!this._coreService.decPrivateModes.reverseWraparound)
      return this._restrictCursor(), this._activeBuffer.x > 0 && this._activeBuffer.x--, true;
    if (this._restrictCursor(this._bufferService.cols), this._activeBuffer.x > 0)
      this._activeBuffer.x--;
    else if (this._activeBuffer.x === 0 && this._activeBuffer.y > this._activeBuffer.scrollTop && this._activeBuffer.y <= this._activeBuffer.scrollBottom && this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y)?.isWrapped) {
      this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false, this._activeBuffer.y--, this._activeBuffer.x = this._bufferService.cols - 1;
      let e = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
      e.hasWidth(this._activeBuffer.x) && !e.hasContent(this._activeBuffer.x) && this._activeBuffer.x--;
    }
    return this._restrictCursor(), true;
  }
  tab() {
    if (this._activeBuffer.x >= this._bufferService.cols)
      return true;
    let e = this._activeBuffer.x;
    return this._activeBuffer.x = this._activeBuffer.nextStop(), this._optionsService.rawOptions.screenReaderMode && this._onA11yTab.fire(this._activeBuffer.x - e), true;
  }
  shiftOut() {
    return this._charsetService.setgLevel(1), true;
  }
  shiftIn() {
    return this._charsetService.setgLevel(0), true;
  }
  _restrictCursor(e = this._bufferService.cols - 1) {
    this._activeBuffer.x = Math.min(e, Math.max(0, this._activeBuffer.x)), this._activeBuffer.y = this._coreService.decPrivateModes.origin ? Math.min(this._activeBuffer.scrollBottom, Math.max(this._activeBuffer.scrollTop, this._activeBuffer.y)) : Math.min(this._bufferService.rows - 1, Math.max(0, this._activeBuffer.y)), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
  }
  _setCursor(e, i) {
    this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._coreService.decPrivateModes.origin ? (this._activeBuffer.x = e, this._activeBuffer.y = this._activeBuffer.scrollTop + i) : (this._activeBuffer.x = e, this._activeBuffer.y = i), this._restrictCursor(), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
  }
  _moveCursor(e, i) {
    this._restrictCursor(), this._setCursor(this._activeBuffer.x + e, this._activeBuffer.y + i);
  }
  cursorUp(e) {
    let i = this._activeBuffer.y - this._activeBuffer.scrollTop;
    return i >= 0 ? this._moveCursor(0, -Math.min(i, e.params[0] || 1)) : this._moveCursor(0, -(e.params[0] || 1)), true;
  }
  cursorDown(e) {
    let i = this._activeBuffer.scrollBottom - this._activeBuffer.y;
    return i >= 0 ? this._moveCursor(0, Math.min(i, e.params[0] || 1)) : this._moveCursor(0, e.params[0] || 1), true;
  }
  cursorForward(e) {
    return this._moveCursor(e.params[0] || 1, 0), true;
  }
  cursorBackward(e) {
    return this._moveCursor(-(e.params[0] || 1), 0), true;
  }
  cursorNextLine(e) {
    return this.cursorDown(e), this._activeBuffer.x = 0, true;
  }
  cursorPrecedingLine(e) {
    return this.cursorUp(e), this._activeBuffer.x = 0, true;
  }
  cursorCharAbsolute(e) {
    return this._setCursor((e.params[0] || 1) - 1, this._activeBuffer.y), true;
  }
  cursorPosition(e) {
    return this._setCursor(e.length >= 2 ? (e.params[1] || 1) - 1 : 0, (e.params[0] || 1) - 1), true;
  }
  charPosAbsolute(e) {
    return this._setCursor((e.params[0] || 1) - 1, this._activeBuffer.y), true;
  }
  hPositionRelative(e) {
    return this._moveCursor(e.params[0] || 1, 0), true;
  }
  linePosAbsolute(e) {
    return this._setCursor(this._activeBuffer.x, (e.params[0] || 1) - 1), true;
  }
  vPositionRelative(e) {
    return this._moveCursor(0, e.params[0] || 1), true;
  }
  hVPosition(e) {
    return this.cursorPosition(e), true;
  }
  tabClear(e) {
    let i = e.params[0];
    return i === 0 ? delete this._activeBuffer.tabs[this._activeBuffer.x] : i === 3 && (this._activeBuffer.tabs = {}), true;
  }
  cursorForwardTab(e) {
    if (this._activeBuffer.x >= this._bufferService.cols)
      return true;
    let i = e.params[0] || 1;
    for (;i--; )
      this._activeBuffer.x = this._activeBuffer.nextStop();
    return true;
  }
  cursorBackwardTab(e) {
    if (this._activeBuffer.x >= this._bufferService.cols)
      return true;
    let i = e.params[0] || 1;
    for (;i--; )
      this._activeBuffer.x = this._activeBuffer.prevStop();
    return true;
  }
  selectProtected(e) {
    let i = e.params[0];
    return i === 1 && (this._curAttrData.bg |= 536870912), (i === 2 || i === 0) && (this._curAttrData.bg &= -536870913), true;
  }
  _eraseInBufferLine(e, i, r, n = false, o = false) {
    let l = this._activeBuffer.lines.get(this._activeBuffer.ybase + e);
    l.replaceCells(i, r, this._activeBuffer.getNullCell(this._eraseAttrData()), o), n && (l.isWrapped = false);
  }
  _resetBufferLine(e, i = false) {
    let r = this._activeBuffer.lines.get(this._activeBuffer.ybase + e);
    r && (r.fill(this._activeBuffer.getNullCell(this._eraseAttrData()), i), this._bufferService.buffer.clearMarkers(this._activeBuffer.ybase + e), r.isWrapped = false);
  }
  eraseInDisplay(e, i = false) {
    this._restrictCursor(this._bufferService.cols);
    let r;
    switch (e.params[0]) {
      case 0:
        for (r = this._activeBuffer.y, this._dirtyRowTracker.markDirty(r), this._eraseInBufferLine(r++, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, i);r < this._bufferService.rows; r++)
          this._resetBufferLine(r, i);
        this._dirtyRowTracker.markDirty(r);
        break;
      case 1:
        for (r = this._activeBuffer.y, this._dirtyRowTracker.markDirty(r), this._eraseInBufferLine(r, 0, this._activeBuffer.x + 1, true, i), this._activeBuffer.x + 1 >= this._bufferService.cols && (this._activeBuffer.lines.get(r + 1).isWrapped = false);r--; )
          this._resetBufferLine(r, i);
        this._dirtyRowTracker.markDirty(0);
        break;
      case 2:
        if (this._optionsService.rawOptions.scrollOnEraseInDisplay) {
          for (r = this._bufferService.rows, this._dirtyRowTracker.markRangeDirty(0, r - 1);r-- && !this._activeBuffer.lines.get(this._activeBuffer.ybase + r)?.getTrimmedLength(); )
            ;
          for (;r >= 0; r--)
            this._bufferService.scroll(this._eraseAttrData());
        } else {
          for (r = this._bufferService.rows, this._dirtyRowTracker.markDirty(r - 1);r--; )
            this._resetBufferLine(r, i);
          this._dirtyRowTracker.markDirty(0);
        }
        break;
      case 3:
        let n = this._activeBuffer.lines.length - this._bufferService.rows;
        n > 0 && (this._activeBuffer.lines.trimStart(n), this._activeBuffer.ybase = Math.max(this._activeBuffer.ybase - n, 0), this._activeBuffer.ydisp = Math.max(this._activeBuffer.ydisp - n, 0), this._onScroll.fire(0));
        break;
    }
    return true;
  }
  eraseInLine(e, i = false) {
    switch (this._restrictCursor(this._bufferService.cols), e.params[0]) {
      case 0:
        this._eraseInBufferLine(this._activeBuffer.y, this._activeBuffer.x, this._bufferService.cols, this._activeBuffer.x === 0, i);
        break;
      case 1:
        this._eraseInBufferLine(this._activeBuffer.y, 0, this._activeBuffer.x + 1, false, i);
        break;
      case 2:
        this._eraseInBufferLine(this._activeBuffer.y, 0, this._bufferService.cols, true, i);
        break;
    }
    return this._dirtyRowTracker.markDirty(this._activeBuffer.y), true;
  }
  insertLines(e) {
    this._restrictCursor();
    let i = e.params[0] || 1;
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop)
      return true;
    let r = this._activeBuffer.ybase + this._activeBuffer.y, n = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, o = this._bufferService.rows - 1 + this._activeBuffer.ybase - n + 1;
    for (;i--; )
      this._activeBuffer.lines.splice(o - 1, 1), this._activeBuffer.lines.splice(r, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
    return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, true;
  }
  deleteLines(e) {
    this._restrictCursor();
    let i = e.params[0] || 1;
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop)
      return true;
    let r = this._activeBuffer.ybase + this._activeBuffer.y, n;
    for (n = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, n = this._bufferService.rows - 1 + this._activeBuffer.ybase - n;i--; )
      this._activeBuffer.lines.splice(r, 1), this._activeBuffer.lines.splice(n, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
    return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, true;
  }
  insertChars(e) {
    this._restrictCursor();
    let i = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
    return i && (i.insertCells(this._activeBuffer.x, e.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData())), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), true;
  }
  deleteChars(e) {
    this._restrictCursor();
    let i = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
    return i && (i.deleteCells(this._activeBuffer.x, e.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData())), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), true;
  }
  scrollUp(e) {
    let i = e.params[0] || 1;
    for (;i--; )
      this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
    return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
  }
  scrollDown(e) {
    let i = e.params[0] || 1;
    for (;i--; )
      this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 0, this._activeBuffer.getBlankLine(X));
    return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
  }
  scrollLeft(e) {
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop)
      return true;
    let i = e.params[0] || 1;
    for (let r = this._activeBuffer.scrollTop;r <= this._activeBuffer.scrollBottom; ++r) {
      let n = this._activeBuffer.lines.get(this._activeBuffer.ybase + r);
      n.deleteCells(0, i, this._activeBuffer.getNullCell(this._eraseAttrData())), n.isWrapped = false;
    }
    return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
  }
  scrollRight(e) {
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop)
      return true;
    let i = e.params[0] || 1;
    for (let r = this._activeBuffer.scrollTop;r <= this._activeBuffer.scrollBottom; ++r) {
      let n = this._activeBuffer.lines.get(this._activeBuffer.ybase + r);
      n.insertCells(0, i, this._activeBuffer.getNullCell(this._eraseAttrData())), n.isWrapped = false;
    }
    return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
  }
  insertColumns(e) {
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop)
      return true;
    let i = e.params[0] || 1;
    for (let r = this._activeBuffer.scrollTop;r <= this._activeBuffer.scrollBottom; ++r) {
      let n = this._activeBuffer.lines.get(this._activeBuffer.ybase + r);
      n.insertCells(this._activeBuffer.x, i, this._activeBuffer.getNullCell(this._eraseAttrData())), n.isWrapped = false;
    }
    return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
  }
  deleteColumns(e) {
    if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop)
      return true;
    let i = e.params[0] || 1;
    for (let r = this._activeBuffer.scrollTop;r <= this._activeBuffer.scrollBottom; ++r) {
      let n = this._activeBuffer.lines.get(this._activeBuffer.ybase + r);
      n.deleteCells(this._activeBuffer.x, i, this._activeBuffer.getNullCell(this._eraseAttrData())), n.isWrapped = false;
    }
    return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
  }
  eraseChars(e) {
    this._restrictCursor();
    let i = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
    return i && (i.replaceCells(this._activeBuffer.x, this._activeBuffer.x + (e.params[0] || 1), this._activeBuffer.getNullCell(this._eraseAttrData())), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), true;
  }
  repeatPrecedingCharacter(e) {
    let i = this._parser.precedingJoinState;
    if (!i)
      return true;
    let r = e.params[0] || 1, n = Ae.extractWidth(i), o = this._activeBuffer.x - n, a = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).getString(o), u = new Uint32Array(a.length * r), h = 0;
    for (let d = 0;d < a.length; ) {
      let _ = a.codePointAt(d) || 0;
      u[h++] = _, d += _ > 65535 ? 2 : 1;
    }
    let c = h;
    for (let d = 1;d < r; ++d)
      u.copyWithin(c, 0, h), c += h;
    return this.print(u, 0, c), true;
  }
  sendDeviceAttributesPrimary(e) {
    return e.params[0] > 0 || (this._is("xterm") || this._is("rxvt-unicode") || this._is("screen") ? this._coreService.triggerDataEvent(b.ESC + "[?1;2c") : this._is("linux") && this._coreService.triggerDataEvent(b.ESC + "[?6c")), true;
  }
  sendDeviceAttributesSecondary(e) {
    return e.params[0] > 0 || (this._is("xterm") ? this._coreService.triggerDataEvent(b.ESC + "[>0;276;0c") : this._is("rxvt-unicode") ? this._coreService.triggerDataEvent(b.ESC + "[>85;95;0c") : this._is("linux") ? this._coreService.triggerDataEvent(e.params[0] + "c") : this._is("screen") && this._coreService.triggerDataEvent(b.ESC + "[>83;40003;0c")), true;
  }
  _is(e) {
    return (this._optionsService.rawOptions.termName + "").indexOf(e) === 0;
  }
  setMode(e) {
    for (let i = 0;i < e.length; i++)
      switch (e.params[i]) {
        case 4:
          this._coreService.modes.insertMode = true;
          break;
        case 20:
          this._optionsService.options.convertEol = true;
          break;
      }
    return true;
  }
  setModePrivate(e) {
    for (let i = 0;i < e.length; i++)
      switch (e.params[i]) {
        case 1:
          this._coreService.decPrivateModes.applicationCursorKeys = true;
          break;
        case 2:
          this._charsetService.setgCharset(0, Je), this._charsetService.setgCharset(1, Je), this._charsetService.setgCharset(2, Je), this._charsetService.setgCharset(3, Je);
          break;
        case 3:
          this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(132, this._bufferService.rows), this._onRequestReset.fire());
          break;
        case 6:
          this._coreService.decPrivateModes.origin = true, this._setCursor(0, 0);
          break;
        case 7:
          this._coreService.decPrivateModes.wraparound = true;
          break;
        case 12:
          this._optionsService.options.cursorBlink = true;
          break;
        case 45:
          this._coreService.decPrivateModes.reverseWraparound = true;
          break;
        case 66:
          this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = true, this._onRequestSyncScrollBar.fire();
          break;
        case 9:
          this._coreMouseService.activeProtocol = "X10";
          break;
        case 1000:
          this._coreMouseService.activeProtocol = "VT200";
          break;
        case 1002:
          this._coreMouseService.activeProtocol = "DRAG";
          break;
        case 1003:
          this._coreMouseService.activeProtocol = "ANY";
          break;
        case 1004:
          this._coreService.decPrivateModes.sendFocus = true, this._onRequestSendFocus.fire();
          break;
        case 1005:
          this._logService.debug("DECSET 1005 not supported (see #2507)");
          break;
        case 1006:
          this._coreMouseService.activeEncoding = "SGR";
          break;
        case 1015:
          this._logService.debug("DECSET 1015 not supported (see #2507)");
          break;
        case 1016:
          this._coreMouseService.activeEncoding = "SGR_PIXELS";
          break;
        case 25:
          this._coreService.isCursorHidden = false;
          break;
        case 1048:
          this.saveCursor();
          break;
        case 1049:
          this.saveCursor();
        case 47:
        case 1047:
          this._bufferService.buffers.activateAltBuffer(this._eraseAttrData()), this._coreService.isCursorInitialized = true, this._onRequestRefreshRows.fire(undefined), this._onRequestSyncScrollBar.fire();
          break;
        case 2004:
          this._coreService.decPrivateModes.bracketedPasteMode = true;
          break;
        case 2026:
          this._coreService.decPrivateModes.synchronizedOutput = true;
          break;
      }
    return true;
  }
  resetMode(e) {
    for (let i = 0;i < e.length; i++)
      switch (e.params[i]) {
        case 4:
          this._coreService.modes.insertMode = false;
          break;
        case 20:
          this._optionsService.options.convertEol = false;
          break;
      }
    return true;
  }
  resetModePrivate(e) {
    for (let i = 0;i < e.length; i++)
      switch (e.params[i]) {
        case 1:
          this._coreService.decPrivateModes.applicationCursorKeys = false;
          break;
        case 3:
          this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(80, this._bufferService.rows), this._onRequestReset.fire());
          break;
        case 6:
          this._coreService.decPrivateModes.origin = false, this._setCursor(0, 0);
          break;
        case 7:
          this._coreService.decPrivateModes.wraparound = false;
          break;
        case 12:
          this._optionsService.options.cursorBlink = false;
          break;
        case 45:
          this._coreService.decPrivateModes.reverseWraparound = false;
          break;
        case 66:
          this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = false, this._onRequestSyncScrollBar.fire();
          break;
        case 9:
        case 1000:
        case 1002:
        case 1003:
          this._coreMouseService.activeProtocol = "NONE";
          break;
        case 1004:
          this._coreService.decPrivateModes.sendFocus = false;
          break;
        case 1005:
          this._logService.debug("DECRST 1005 not supported (see #2507)");
          break;
        case 1006:
          this._coreMouseService.activeEncoding = "DEFAULT";
          break;
        case 1015:
          this._logService.debug("DECRST 1015 not supported (see #2507)");
          break;
        case 1016:
          this._coreMouseService.activeEncoding = "DEFAULT";
          break;
        case 25:
          this._coreService.isCursorHidden = true;
          break;
        case 1048:
          this.restoreCursor();
          break;
        case 1049:
        case 47:
        case 1047:
          this._bufferService.buffers.activateNormalBuffer(), e.params[i] === 1049 && this.restoreCursor(), this._coreService.isCursorInitialized = true, this._onRequestRefreshRows.fire(undefined), this._onRequestSyncScrollBar.fire();
          break;
        case 2004:
          this._coreService.decPrivateModes.bracketedPasteMode = false;
          break;
        case 2026:
          this._coreService.decPrivateModes.synchronizedOutput = false, this._onRequestRefreshRows.fire(undefined);
          break;
      }
    return true;
  }
  requestMode(e, i) {
    let r;
    ((P) => (P[P.NOT_RECOGNIZED = 0] = "NOT_RECOGNIZED", P[P.SET = 1] = "SET", P[P.RESET = 2] = "RESET", P[P.PERMANENTLY_SET = 3] = "PERMANENTLY_SET", P[P.PERMANENTLY_RESET = 4] = "PERMANENTLY_RESET"))(r ||= {});
    let n = this._coreService.decPrivateModes, { activeProtocol: o, activeEncoding: l } = this._coreMouseService, a = this._coreService, { buffers: u, cols: h } = this._bufferService, { active: c, alt: d } = u, _ = this._optionsService.rawOptions, p = (A, R) => (a.triggerDataEvent(`${b.ESC}[${i ? "" : "?"}${A};${R}$y`), true), m = (A) => A ? 1 : 2, f = e.params[0];
    return i ? f === 2 ? p(f, 4) : f === 4 ? p(f, m(a.modes.insertMode)) : f === 12 ? p(f, 3) : f === 20 ? p(f, m(_.convertEol)) : p(f, 0) : f === 1 ? p(f, m(n.applicationCursorKeys)) : f === 3 ? p(f, _.windowOptions.setWinLines ? h === 80 ? 2 : h === 132 ? 1 : 0 : 0) : f === 6 ? p(f, m(n.origin)) : f === 7 ? p(f, m(n.wraparound)) : f === 8 ? p(f, 3) : f === 9 ? p(f, m(o === "X10")) : f === 12 ? p(f, m(_.cursorBlink)) : f === 25 ? p(f, m(!a.isCursorHidden)) : f === 45 ? p(f, m(n.reverseWraparound)) : f === 66 ? p(f, m(n.applicationKeypad)) : f === 67 ? p(f, 4) : f === 1000 ? p(f, m(o === "VT200")) : f === 1002 ? p(f, m(o === "DRAG")) : f === 1003 ? p(f, m(o === "ANY")) : f === 1004 ? p(f, m(n.sendFocus)) : f === 1005 ? p(f, 4) : f === 1006 ? p(f, m(l === "SGR")) : f === 1015 ? p(f, 4) : f === 1016 ? p(f, m(l === "SGR_PIXELS")) : f === 1048 ? p(f, 1) : f === 47 || f === 1047 || f === 1049 ? p(f, m(c === d)) : f === 2004 ? p(f, m(n.bracketedPasteMode)) : f === 2026 ? p(f, m(n.synchronizedOutput)) : p(f, 0);
  }
  _updateAttrColor(e, i, r, n, o) {
    return i === 2 ? (e |= 50331648, e &= -16777216, e |= De.fromColorRGB([r, n, o])) : i === 5 && (e &= -50331904, e |= 33554432 | r & 255), e;
  }
  _extractColor(e, i, r) {
    let n = [0, 0, -1, 0, 0, 0], o = 0, l = 0;
    do {
      if (n[l + o] = e.params[i + l], e.hasSubParams(i + l)) {
        let a = e.getSubParams(i + l), u = 0;
        do
          n[1] === 5 && (o = 1), n[l + u + 1 + o] = a[u];
        while (++u < a.length && u + l + 1 + o < n.length);
        break;
      }
      if (n[1] === 5 && l + o >= 2 || n[1] === 2 && l + o >= 5)
        break;
      n[1] && (o = 1);
    } while (++l + i < e.length && l + o < n.length);
    for (let a = 2;a < n.length; ++a)
      n[a] === -1 && (n[a] = 0);
    switch (n[0]) {
      case 38:
        r.fg = this._updateAttrColor(r.fg, n[1], n[3], n[4], n[5]);
        break;
      case 48:
        r.bg = this._updateAttrColor(r.bg, n[1], n[3], n[4], n[5]);
        break;
      case 58:
        r.extended = r.extended.clone(), r.extended.underlineColor = this._updateAttrColor(r.extended.underlineColor, n[1], n[3], n[4], n[5]);
    }
    return l;
  }
  _processUnderline(e, i) {
    i.extended = i.extended.clone(), (!~e || e > 5) && (e = 1), i.extended.underlineStyle = e, i.fg |= 268435456, e === 0 && (i.fg &= -268435457), i.updateExtended();
  }
  _processSGR0(e) {
    e.fg = X.fg, e.bg = X.bg, e.extended = e.extended.clone(), e.extended.underlineStyle = 0, e.extended.underlineColor &= -67108864, e.updateExtended();
  }
  charAttributes(e) {
    if (e.length === 1 && e.params[0] === 0)
      return this._processSGR0(this._curAttrData), true;
    let i = e.length, r, n = this._curAttrData;
    for (let o = 0;o < i; o++)
      r = e.params[o], r >= 30 && r <= 37 ? (n.fg &= -50331904, n.fg |= 16777216 | r - 30) : r >= 40 && r <= 47 ? (n.bg &= -50331904, n.bg |= 16777216 | r - 40) : r >= 90 && r <= 97 ? (n.fg &= -50331904, n.fg |= 16777216 | r - 90 | 8) : r >= 100 && r <= 107 ? (n.bg &= -50331904, n.bg |= 16777216 | r - 100 | 8) : r === 0 ? this._processSGR0(n) : r === 1 ? n.fg |= 134217728 : r === 3 ? n.bg |= 67108864 : r === 4 ? (n.fg |= 268435456, this._processUnderline(e.hasSubParams(o) ? e.getSubParams(o)[0] : 1, n)) : r === 5 ? n.fg |= 536870912 : r === 7 ? n.fg |= 67108864 : r === 8 ? n.fg |= 1073741824 : r === 9 ? n.fg |= 2147483648 : r === 2 ? n.bg |= 134217728 : r === 21 ? this._processUnderline(2, n) : r === 22 ? (n.fg &= -134217729, n.bg &= -134217729) : r === 23 ? n.bg &= -67108865 : r === 24 ? (n.fg &= -268435457, this._processUnderline(0, n)) : r === 25 ? n.fg &= -536870913 : r === 27 ? n.fg &= -67108865 : r === 28 ? n.fg &= -1073741825 : r === 29 ? n.fg &= 2147483647 : r === 39 ? (n.fg &= -67108864, n.fg |= X.fg & 16777215) : r === 49 ? (n.bg &= -67108864, n.bg |= X.bg & 16777215) : r === 38 || r === 48 || r === 58 ? o += this._extractColor(e, o, n) : r === 53 ? n.bg |= 1073741824 : r === 55 ? n.bg &= -1073741825 : r === 59 ? (n.extended = n.extended.clone(), n.extended.underlineColor = -1, n.updateExtended()) : r === 100 ? (n.fg &= -67108864, n.fg |= X.fg & 16777215, n.bg &= -67108864, n.bg |= X.bg & 16777215) : this._logService.debug("Unknown SGR attribute: %d.", r);
    return true;
  }
  deviceStatus(e) {
    switch (e.params[0]) {
      case 5:
        this._coreService.triggerDataEvent(`${b.ESC}[0n`);
        break;
      case 6:
        let i = this._activeBuffer.y + 1, r = this._activeBuffer.x + 1;
        this._coreService.triggerDataEvent(`${b.ESC}[${i};${r}R`);
        break;
    }
    return true;
  }
  deviceStatusPrivate(e) {
    switch (e.params[0]) {
      case 6:
        let i = this._activeBuffer.y + 1, r = this._activeBuffer.x + 1;
        this._coreService.triggerDataEvent(`${b.ESC}[?${i};${r}R`);
        break;
      case 15:
        break;
      case 25:
        break;
      case 26:
        break;
      case 53:
        break;
    }
    return true;
  }
  softReset(e) {
    return this._coreService.isCursorHidden = false, this._onRequestSyncScrollBar.fire(), this._activeBuffer.scrollTop = 0, this._activeBuffer.scrollBottom = this._bufferService.rows - 1, this._curAttrData = X.clone(), this._coreService.reset(), this._charsetService.reset(), this._activeBuffer.savedX = 0, this._activeBuffer.savedY = this._activeBuffer.ybase, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, this._coreService.decPrivateModes.origin = false, true;
  }
  setCursorStyle(e) {
    let i = e.length === 0 ? 1 : e.params[0];
    if (i === 0)
      this._coreService.decPrivateModes.cursorStyle = undefined, this._coreService.decPrivateModes.cursorBlink = undefined;
    else {
      switch (i) {
        case 1:
        case 2:
          this._coreService.decPrivateModes.cursorStyle = "block";
          break;
        case 3:
        case 4:
          this._coreService.decPrivateModes.cursorStyle = "underline";
          break;
        case 5:
        case 6:
          this._coreService.decPrivateModes.cursorStyle = "bar";
          break;
      }
      let r = i % 2 === 1;
      this._coreService.decPrivateModes.cursorBlink = r;
    }
    return true;
  }
  setScrollRegion(e) {
    let i = e.params[0] || 1, r;
    return (e.length < 2 || (r = e.params[1]) > this._bufferService.rows || r === 0) && (r = this._bufferService.rows), r > i && (this._activeBuffer.scrollTop = i - 1, this._activeBuffer.scrollBottom = r - 1, this._setCursor(0, 0)), true;
  }
  windowOptions(e) {
    if (!bl(e.params[0], this._optionsService.rawOptions.windowOptions))
      return true;
    let i = e.length > 1 ? e.params[1] : 0;
    switch (e.params[0]) {
      case 14:
        i !== 2 && this._onRequestWindowsOptionsReport.fire(0);
        break;
      case 16:
        this._onRequestWindowsOptionsReport.fire(1);
        break;
      case 18:
        this._bufferService && this._coreService.triggerDataEvent(`${b.ESC}[8;${this._bufferService.rows};${this._bufferService.cols}t`);
        break;
      case 22:
        (i === 0 || i === 2) && (this._windowTitleStack.push(this._windowTitle), this._windowTitleStack.length > _l && this._windowTitleStack.shift()), (i === 0 || i === 1) && (this._iconNameStack.push(this._iconName), this._iconNameStack.length > _l && this._iconNameStack.shift());
        break;
      case 23:
        (i === 0 || i === 2) && this._windowTitleStack.length && this.setTitle(this._windowTitleStack.pop()), (i === 0 || i === 1) && this._iconNameStack.length && this.setIconName(this._iconNameStack.pop());
        break;
    }
    return true;
  }
  saveCursor(e) {
    return this._activeBuffer.savedX = this._activeBuffer.x, this._activeBuffer.savedY = this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, true;
  }
  restoreCursor(e) {
    return this._activeBuffer.x = this._activeBuffer.savedX || 0, this._activeBuffer.y = Math.max(this._activeBuffer.savedY - this._activeBuffer.ybase, 0), this._curAttrData.fg = this._activeBuffer.savedCurAttrData.fg, this._curAttrData.bg = this._activeBuffer.savedCurAttrData.bg, this._charsetService.charset = this._savedCharset, this._activeBuffer.savedCharset && (this._charsetService.charset = this._activeBuffer.savedCharset), this._restrictCursor(), true;
  }
  setTitle(e) {
    return this._windowTitle = e, this._onTitleChange.fire(e), true;
  }
  setIconName(e) {
    return this._iconName = e, true;
  }
  setOrReportIndexedColor(e) {
    let i = [], r = e.split(";");
    for (;r.length > 1; ) {
      let n = r.shift(), o = r.shift();
      if (/^\d+$/.exec(n)) {
        let l = parseInt(n);
        if (Sl(l))
          if (o === "?")
            i.push({ type: 0, index: l });
          else {
            let a = Ws(o);
            a && i.push({ type: 1, index: l, color: a });
          }
      }
    }
    return i.length && this._onColor.fire(i), true;
  }
  setHyperlink(e) {
    let i = e.indexOf(";");
    if (i === -1)
      return true;
    let r = e.slice(0, i).trim(), n = e.slice(i + 1);
    return n ? this._createHyperlink(r, n) : r.trim() ? false : this._finishHyperlink();
  }
  _createHyperlink(e, i) {
    this._getCurrentLinkId() && this._finishHyperlink();
    let r = e.split(":"), n, o = r.findIndex((l) => l.startsWith("id="));
    return o !== -1 && (n = r[o].slice(3) || undefined), this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = this._oscLinkService.registerLink({ id: n, uri: i }), this._curAttrData.updateExtended(), true;
  }
  _finishHyperlink() {
    return this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = 0, this._curAttrData.updateExtended(), true;
  }
  _setOrReportSpecialColor(e, i) {
    let r = e.split(";");
    for (let n = 0;n < r.length && !(i >= this._specialColors.length); ++n, ++i)
      if (r[n] === "?")
        this._onColor.fire([{ type: 0, index: this._specialColors[i] }]);
      else {
        let o = Ws(r[n]);
        o && this._onColor.fire([{ type: 1, index: this._specialColors[i], color: o }]);
      }
    return true;
  }
  setOrReportFgColor(e) {
    return this._setOrReportSpecialColor(e, 0);
  }
  setOrReportBgColor(e) {
    return this._setOrReportSpecialColor(e, 1);
  }
  setOrReportCursorColor(e) {
    return this._setOrReportSpecialColor(e, 2);
  }
  restoreIndexedColor(e) {
    if (!e)
      return this._onColor.fire([{ type: 2 }]), true;
    let i = [], r = e.split(";");
    for (let n = 0;n < r.length; ++n)
      if (/^\d+$/.exec(r[n])) {
        let o = parseInt(r[n]);
        Sl(o) && i.push({ type: 2, index: o });
      }
    return i.length && this._onColor.fire(i), true;
  }
  restoreFgColor(e) {
    return this._onColor.fire([{ type: 2, index: 256 }]), true;
  }
  restoreBgColor(e) {
    return this._onColor.fire([{ type: 2, index: 257 }]), true;
  }
  restoreCursorColor(e) {
    return this._onColor.fire([{ type: 2, index: 258 }]), true;
  }
  nextLine() {
    return this._activeBuffer.x = 0, this.index(), true;
  }
  keypadApplicationMode() {
    return this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = true, this._onRequestSyncScrollBar.fire(), true;
  }
  keypadNumericMode() {
    return this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = false, this._onRequestSyncScrollBar.fire(), true;
  }
  selectDefaultCharset() {
    return this._charsetService.setgLevel(0), this._charsetService.setgCharset(0, Je), true;
  }
  selectCharset(e) {
    return e.length !== 2 ? (this.selectDefaultCharset(), true) : (e[0] === "/" || this._charsetService.setgCharset(mc[e[0]], ne[e[1]] || Je), true);
  }
  index() {
    return this._restrictCursor(), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._restrictCursor(), true;
  }
  tabSet() {
    return this._activeBuffer.tabs[this._activeBuffer.x] = true, true;
  }
  reverseIndex() {
    if (this._restrictCursor(), this._activeBuffer.y === this._activeBuffer.scrollTop) {
      let e = this._activeBuffer.scrollBottom - this._activeBuffer.scrollTop;
      this._activeBuffer.lines.shiftElements(this._activeBuffer.ybase + this._activeBuffer.y, e, 1), this._activeBuffer.lines.set(this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.getBlankLine(this._eraseAttrData())), this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
    } else
      this._activeBuffer.y--, this._restrictCursor();
    return true;
  }
  fullReset() {
    return this._parser.reset(), this._onRequestReset.fire(), true;
  }
  reset() {
    this._curAttrData = X.clone(), this._eraseAttrDataInternal = X.clone();
  }
  _eraseAttrData() {
    return this._eraseAttrDataInternal.bg &= -67108864, this._eraseAttrDataInternal.bg |= this._curAttrData.bg & 67108863, this._eraseAttrDataInternal;
  }
  setgLevel(e) {
    return this._charsetService.setgLevel(e), true;
  }
  screenAlignmentPattern() {
    let e = new q;
    e.content = 1 << 22 | 69, e.fg = this._curAttrData.fg, e.bg = this._curAttrData.bg, this._setCursor(0, 0);
    for (let i = 0;i < this._bufferService.rows; ++i) {
      let r = this._activeBuffer.ybase + this._activeBuffer.y + i, n = this._activeBuffer.lines.get(r);
      n && (n.fill(e), n.isWrapped = false);
    }
    return this._dirtyRowTracker.markAllDirty(), this._setCursor(0, 0), true;
  }
  requestStatusString(e, i) {
    let r = (a) => (this._coreService.triggerDataEvent(`${b.ESC}${a}${b.ESC}\\`), true), n = this._bufferService.buffer, o = this._optionsService.rawOptions, l = { block: 2, underline: 4, bar: 6 };
    return r(e === '"q' ? `P1$r${this._curAttrData.isProtected() ? 1 : 0}"q` : e === '"p' ? 'P1$r61;1"p' : e === "r" ? `P1$r${n.scrollTop + 1};${n.scrollBottom + 1}r` : e === "m" ? "P1$r0m" : e === " q" ? `P1$r${l[o.cursorStyle] - (o.cursorBlink ? 1 : 0)} q` : "P0$r");
  }
  markRangeDirty(e, i) {
    this._dirtyRowTracker.markRangeDirty(e, i);
  }
};
var Zi = class {
  constructor(t) {
    this._bufferService = t;
    this.clearRange();
  }
  clearRange() {
    this.start = this._bufferService.buffer.y, this.end = this._bufferService.buffer.y;
  }
  markDirty(t) {
    t < this.start ? this.start = t : t > this.end && (this.end = t);
  }
  markRangeDirty(t, e) {
    t > e && (gl = t, t = e, e = gl), t < this.start && (this.start = t), e > this.end && (this.end = e);
  }
  markAllDirty() {
    this.markRangeDirty(0, this._bufferService.rows - 1);
  }
};
Zi = M([S(0, F)], Zi);
function Sl(s15) {
  return 0 <= s15 && s15 < 256;
}
var _c = 50000000;
var El = 12;
var bc = 50;
var gn = class extends D {
  constructor(e) {
    super();
    this._action = e;
    this._writeBuffer = [];
    this._callbacks = [];
    this._pendingData = 0;
    this._bufferOffset = 0;
    this._isSyncWriting = false;
    this._syncCalls = 0;
    this._didUserInput = false;
    this._onWriteParsed = this._register(new v);
    this.onWriteParsed = this._onWriteParsed.event;
  }
  handleUserInput() {
    this._didUserInput = true;
  }
  writeSync(e, i) {
    if (i !== undefined && this._syncCalls > i) {
      this._syncCalls = 0;
      return;
    }
    if (this._pendingData += e.length, this._writeBuffer.push(e), this._callbacks.push(undefined), this._syncCalls++, this._isSyncWriting)
      return;
    this._isSyncWriting = true;
    let r;
    for (;r = this._writeBuffer.shift(); ) {
      this._action(r);
      let n = this._callbacks.shift();
      n && n();
    }
    this._pendingData = 0, this._bufferOffset = 2147483647, this._isSyncWriting = false, this._syncCalls = 0;
  }
  write(e, i) {
    if (this._pendingData > _c)
      throw new Error("write data discarded, use flow control to avoid losing data");
    if (!this._writeBuffer.length) {
      if (this._bufferOffset = 0, this._didUserInput) {
        this._didUserInput = false, this._pendingData += e.length, this._writeBuffer.push(e), this._callbacks.push(i), this._innerWrite();
        return;
      }
      setTimeout(() => this._innerWrite());
    }
    this._pendingData += e.length, this._writeBuffer.push(e), this._callbacks.push(i);
  }
  _innerWrite(e = 0, i = true) {
    let r = e || performance.now();
    for (;this._writeBuffer.length > this._bufferOffset; ) {
      let n = this._writeBuffer[this._bufferOffset], o = this._action(n, i);
      if (o) {
        let a = (u) => performance.now() - r >= El ? setTimeout(() => this._innerWrite(0, u)) : this._innerWrite(r, u);
        o.catch((u) => (queueMicrotask(() => {
          throw u;
        }), Promise.resolve(false))).then(a);
        return;
      }
      let l = this._callbacks[this._bufferOffset];
      if (l && l(), this._bufferOffset++, this._pendingData -= n.length, performance.now() - r >= El)
        break;
    }
    this._writeBuffer.length > this._bufferOffset ? (this._bufferOffset > bc && (this._writeBuffer = this._writeBuffer.slice(this._bufferOffset), this._callbacks = this._callbacks.slice(this._bufferOffset), this._bufferOffset = 0), setTimeout(() => this._innerWrite())) : (this._writeBuffer.length = 0, this._callbacks.length = 0, this._pendingData = 0, this._bufferOffset = 0), this._onWriteParsed.fire();
  }
};
var ui = class {
  constructor(t) {
    this._bufferService = t;
    this._nextId = 1;
    this._entriesWithId = new Map;
    this._dataByLinkId = new Map;
  }
  registerLink(t) {
    let e = this._bufferService.buffer;
    if (t.id === undefined) {
      let a = e.addMarker(e.ybase + e.y), u = { data: t, id: this._nextId++, lines: [a] };
      return a.onDispose(() => this._removeMarkerFromLink(u, a)), this._dataByLinkId.set(u.id, u), u.id;
    }
    let i = t, r = this._getEntryIdKey(i), n = this._entriesWithId.get(r);
    if (n)
      return this.addLineToLink(n.id, e.ybase + e.y), n.id;
    let o = e.addMarker(e.ybase + e.y), l = { id: this._nextId++, key: this._getEntryIdKey(i), data: i, lines: [o] };
    return o.onDispose(() => this._removeMarkerFromLink(l, o)), this._entriesWithId.set(l.key, l), this._dataByLinkId.set(l.id, l), l.id;
  }
  addLineToLink(t, e) {
    let i = this._dataByLinkId.get(t);
    if (i && i.lines.every((r) => r.line !== e)) {
      let r = this._bufferService.buffer.addMarker(e);
      i.lines.push(r), r.onDispose(() => this._removeMarkerFromLink(i, r));
    }
  }
  getLinkData(t) {
    return this._dataByLinkId.get(t)?.data;
  }
  _getEntryIdKey(t) {
    return `${t.id};;${t.uri}`;
  }
  _removeMarkerFromLink(t, e) {
    let i = t.lines.indexOf(e);
    i !== -1 && (t.lines.splice(i, 1), t.lines.length === 0 && (t.data.id !== undefined && this._entriesWithId.delete(t.key), this._dataByLinkId.delete(t.id)));
  }
};
ui = M([S(0, F)], ui);
var Tl = false;
var Sn = class extends D {
  constructor(e) {
    super();
    this._windowsWrappingHeuristics = this._register(new ye);
    this._onBinary = this._register(new v);
    this.onBinary = this._onBinary.event;
    this._onData = this._register(new v);
    this.onData = this._onData.event;
    this._onLineFeed = this._register(new v);
    this.onLineFeed = this._onLineFeed.event;
    this._onResize = this._register(new v);
    this.onResize = this._onResize.event;
    this._onWriteParsed = this._register(new v);
    this.onWriteParsed = this._onWriteParsed.event;
    this._onScroll = this._register(new v);
    this._instantiationService = new ln, this.optionsService = this._register(new dn(e)), this._instantiationService.setService(H, this.optionsService), this._bufferService = this._register(this._instantiationService.createInstance(ni)), this._instantiationService.setService(F, this._bufferService), this._logService = this._register(this._instantiationService.createInstance(ii)), this._instantiationService.setService(nr, this._logService), this.coreService = this._register(this._instantiationService.createInstance(li)), this._instantiationService.setService(ge, this.coreService), this.coreMouseService = this._register(this._instantiationService.createInstance(ai)), this._instantiationService.setService(rr, this.coreMouseService), this.unicodeService = this._register(this._instantiationService.createInstance(Ae)), this._instantiationService.setService(Js, this.unicodeService), this._charsetService = this._instantiationService.createInstance(pn), this._instantiationService.setService(Zs, this._charsetService), this._oscLinkService = this._instantiationService.createInstance(ui), this._instantiationService.setService(sr, this._oscLinkService), this._inputHandler = this._register(new vn(this._bufferService, this._charsetService, this.coreService, this._logService, this.optionsService, this._oscLinkService, this.coreMouseService, this.unicodeService)), this._register($.forward(this._inputHandler.onLineFeed, this._onLineFeed)), this._register(this._inputHandler), this._register($.forward(this._bufferService.onResize, this._onResize)), this._register($.forward(this.coreService.onData, this._onData)), this._register($.forward(this.coreService.onBinary, this._onBinary)), this._register(this.coreService.onRequestScrollToBottom(() => this.scrollToBottom(true))), this._register(this.coreService.onUserInput(() => this._writeBuffer.handleUserInput())), this._register(this.optionsService.onMultipleOptionChange(["windowsMode", "windowsPty"], () => this._handleWindowsPtyOptionChange())), this._register(this._bufferService.onScroll(() => {
      this._onScroll.fire({ position: this._bufferService.buffer.ydisp }), this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
    })), this._writeBuffer = this._register(new gn((i, r) => this._inputHandler.parse(i, r))), this._register($.forward(this._writeBuffer.onWriteParsed, this._onWriteParsed));
  }
  get onScroll() {
    return this._onScrollApi || (this._onScrollApi = this._register(new v), this._onScroll.event((e) => {
      this._onScrollApi?.fire(e.position);
    })), this._onScrollApi.event;
  }
  get cols() {
    return this._bufferService.cols;
  }
  get rows() {
    return this._bufferService.rows;
  }
  get buffers() {
    return this._bufferService.buffers;
  }
  get options() {
    return this.optionsService.options;
  }
  set options(e) {
    for (let i in e)
      this.optionsService.options[i] = e[i];
  }
  write(e, i) {
    this._writeBuffer.write(e, i);
  }
  writeSync(e, i) {
    this._logService.logLevel <= 3 && !Tl && (this._logService.warn("writeSync is unreliable and will be removed soon."), Tl = true), this._writeBuffer.writeSync(e, i);
  }
  input(e, i = true) {
    this.coreService.triggerDataEvent(e, i);
  }
  resize(e, i) {
    isNaN(e) || isNaN(i) || (e = Math.max(e, ks), i = Math.max(i, Cs), this._bufferService.resize(e, i));
  }
  scroll(e, i = false) {
    this._bufferService.scroll(e, i);
  }
  scrollLines(e, i) {
    this._bufferService.scrollLines(e, i);
  }
  scrollPages(e) {
    this.scrollLines(e * (this.rows - 1));
  }
  scrollToTop() {
    this.scrollLines(-this._bufferService.buffer.ydisp);
  }
  scrollToBottom(e) {
    this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
  }
  scrollToLine(e) {
    let i = e - this._bufferService.buffer.ydisp;
    i !== 0 && this.scrollLines(i);
  }
  registerEscHandler(e, i) {
    return this._inputHandler.registerEscHandler(e, i);
  }
  registerDcsHandler(e, i) {
    return this._inputHandler.registerDcsHandler(e, i);
  }
  registerCsiHandler(e, i) {
    return this._inputHandler.registerCsiHandler(e, i);
  }
  registerOscHandler(e, i) {
    return this._inputHandler.registerOscHandler(e, i);
  }
  _setup() {
    this._handleWindowsPtyOptionChange();
  }
  reset() {
    this._inputHandler.reset(), this._bufferService.reset(), this._charsetService.reset(), this.coreService.reset(), this.coreMouseService.reset();
  }
  _handleWindowsPtyOptionChange() {
    let e = false, i = this.optionsService.rawOptions.windowsPty;
    i && i.buildNumber !== undefined && i.buildNumber !== undefined ? e = i.backend === "conpty" && i.buildNumber < 21376 : this.optionsService.rawOptions.windowsMode && (e = true), e ? this._enableWindowsWrappingHeuristics() : this._windowsWrappingHeuristics.clear();
  }
  _enableWindowsWrappingHeuristics() {
    if (!this._windowsWrappingHeuristics.value) {
      let e = [];
      e.push(this.onLineFeed(Bs.bind(null, this._bufferService))), e.push(this.registerCsiHandler({ final: "H" }, () => (Bs(this._bufferService), false))), this._windowsWrappingHeuristics.value = C(() => {
        for (let i of e)
          i.dispose();
      });
    }
  }
};
var gc = { 48: ["0", ")"], 49: ["1", "!"], 50: ["2", "@"], 51: ["3", "#"], 52: ["4", "$"], 53: ["5", "%"], 54: ["6", "^"], 55: ["7", "&"], 56: ["8", "*"], 57: ["9", "("], 186: [";", ":"], 187: ["=", "+"], 188: [",", "<"], 189: ["-", "_"], 190: [".", ">"], 191: ["/", "?"], 192: ["`", "~"], 219: ["[", "{"], 220: ["\\", "|"], 221: ["]", "}"], 222: ["'", '"'] };
function Il(s15, t, e, i) {
  let r = { type: 0, cancel: false, key: undefined }, n = (s15.shiftKey ? 1 : 0) | (s15.altKey ? 2 : 0) | (s15.ctrlKey ? 4 : 0) | (s15.metaKey ? 8 : 0);
  switch (s15.keyCode) {
    case 0:
      s15.key === "UIKeyInputUpArrow" ? t ? r.key = b.ESC + "OA" : r.key = b.ESC + "[A" : s15.key === "UIKeyInputLeftArrow" ? t ? r.key = b.ESC + "OD" : r.key = b.ESC + "[D" : s15.key === "UIKeyInputRightArrow" ? t ? r.key = b.ESC + "OC" : r.key = b.ESC + "[C" : s15.key === "UIKeyInputDownArrow" && (t ? r.key = b.ESC + "OB" : r.key = b.ESC + "[B");
      break;
    case 8:
      r.key = s15.ctrlKey ? "\b" : b.DEL, s15.altKey && (r.key = b.ESC + r.key);
      break;
    case 9:
      if (s15.shiftKey) {
        r.key = b.ESC + "[Z";
        break;
      }
      r.key = b.HT, r.cancel = true;
      break;
    case 13:
      r.key = s15.altKey ? b.ESC + b.CR : b.CR, r.cancel = true;
      break;
    case 27:
      r.key = b.ESC, s15.altKey && (r.key = b.ESC + b.ESC), r.cancel = true;
      break;
    case 37:
      if (s15.metaKey)
        break;
      n ? r.key = b.ESC + "[1;" + (n + 1) + "D" : t ? r.key = b.ESC + "OD" : r.key = b.ESC + "[D";
      break;
    case 39:
      if (s15.metaKey)
        break;
      n ? r.key = b.ESC + "[1;" + (n + 1) + "C" : t ? r.key = b.ESC + "OC" : r.key = b.ESC + "[C";
      break;
    case 38:
      if (s15.metaKey)
        break;
      n ? r.key = b.ESC + "[1;" + (n + 1) + "A" : t ? r.key = b.ESC + "OA" : r.key = b.ESC + "[A";
      break;
    case 40:
      if (s15.metaKey)
        break;
      n ? r.key = b.ESC + "[1;" + (n + 1) + "B" : t ? r.key = b.ESC + "OB" : r.key = b.ESC + "[B";
      break;
    case 45:
      !s15.shiftKey && !s15.ctrlKey && (r.key = b.ESC + "[2~");
      break;
    case 46:
      n ? r.key = b.ESC + "[3;" + (n + 1) + "~" : r.key = b.ESC + "[3~";
      break;
    case 36:
      n ? r.key = b.ESC + "[1;" + (n + 1) + "H" : t ? r.key = b.ESC + "OH" : r.key = b.ESC + "[H";
      break;
    case 35:
      n ? r.key = b.ESC + "[1;" + (n + 1) + "F" : t ? r.key = b.ESC + "OF" : r.key = b.ESC + "[F";
      break;
    case 33:
      s15.shiftKey ? r.type = 2 : s15.ctrlKey ? r.key = b.ESC + "[5;" + (n + 1) + "~" : r.key = b.ESC + "[5~";
      break;
    case 34:
      s15.shiftKey ? r.type = 3 : s15.ctrlKey ? r.key = b.ESC + "[6;" + (n + 1) + "~" : r.key = b.ESC + "[6~";
      break;
    case 112:
      n ? r.key = b.ESC + "[1;" + (n + 1) + "P" : r.key = b.ESC + "OP";
      break;
    case 113:
      n ? r.key = b.ESC + "[1;" + (n + 1) + "Q" : r.key = b.ESC + "OQ";
      break;
    case 114:
      n ? r.key = b.ESC + "[1;" + (n + 1) + "R" : r.key = b.ESC + "OR";
      break;
    case 115:
      n ? r.key = b.ESC + "[1;" + (n + 1) + "S" : r.key = b.ESC + "OS";
      break;
    case 116:
      n ? r.key = b.ESC + "[15;" + (n + 1) + "~" : r.key = b.ESC + "[15~";
      break;
    case 117:
      n ? r.key = b.ESC + "[17;" + (n + 1) + "~" : r.key = b.ESC + "[17~";
      break;
    case 118:
      n ? r.key = b.ESC + "[18;" + (n + 1) + "~" : r.key = b.ESC + "[18~";
      break;
    case 119:
      n ? r.key = b.ESC + "[19;" + (n + 1) + "~" : r.key = b.ESC + "[19~";
      break;
    case 120:
      n ? r.key = b.ESC + "[20;" + (n + 1) + "~" : r.key = b.ESC + "[20~";
      break;
    case 121:
      n ? r.key = b.ESC + "[21;" + (n + 1) + "~" : r.key = b.ESC + "[21~";
      break;
    case 122:
      n ? r.key = b.ESC + "[23;" + (n + 1) + "~" : r.key = b.ESC + "[23~";
      break;
    case 123:
      n ? r.key = b.ESC + "[24;" + (n + 1) + "~" : r.key = b.ESC + "[24~";
      break;
    default:
      if (s15.ctrlKey && !s15.shiftKey && !s15.altKey && !s15.metaKey)
        s15.keyCode >= 65 && s15.keyCode <= 90 ? r.key = String.fromCharCode(s15.keyCode - 64) : s15.keyCode === 32 ? r.key = b.NUL : s15.keyCode >= 51 && s15.keyCode <= 55 ? r.key = String.fromCharCode(s15.keyCode - 51 + 27) : s15.keyCode === 56 ? r.key = b.DEL : s15.keyCode === 219 ? r.key = b.ESC : s15.keyCode === 220 ? r.key = b.FS : s15.keyCode === 221 && (r.key = b.GS);
      else if ((!e || i) && s15.altKey && !s15.metaKey) {
        let l = gc[s15.keyCode]?.[s15.shiftKey ? 1 : 0];
        if (l)
          r.key = b.ESC + l;
        else if (s15.keyCode >= 65 && s15.keyCode <= 90) {
          let a = s15.ctrlKey ? s15.keyCode - 64 : s15.keyCode + 32, u = String.fromCharCode(a);
          s15.shiftKey && (u = u.toUpperCase()), r.key = b.ESC + u;
        } else if (s15.keyCode === 32)
          r.key = b.ESC + (s15.ctrlKey ? b.NUL : " ");
        else if (s15.key === "Dead" && s15.code.startsWith("Key")) {
          let a = s15.code.slice(3, 4);
          s15.shiftKey || (a = a.toLowerCase()), r.key = b.ESC + a, r.cancel = true;
        }
      } else
        e && !s15.altKey && !s15.ctrlKey && !s15.shiftKey && s15.metaKey ? s15.keyCode === 65 && (r.type = 1) : s15.key && !s15.ctrlKey && !s15.altKey && !s15.metaKey && s15.keyCode >= 48 && s15.key.length === 1 ? r.key = s15.key : s15.key && s15.ctrlKey && (s15.key === "_" && (r.key = b.US), s15.key === "@" && (r.key = b.NUL));
      break;
  }
  return r;
}
var ee = 0;
var En = class {
  constructor(t) {
    this._getKey = t;
    this._array = [];
    this._insertedValues = [];
    this._flushInsertedTask = new Jt;
    this._isFlushingInserted = false;
    this._deletedIndices = [];
    this._flushDeletedTask = new Jt;
    this._isFlushingDeleted = false;
  }
  clear() {
    this._array.length = 0, this._insertedValues.length = 0, this._flushInsertedTask.clear(), this._isFlushingInserted = false, this._deletedIndices.length = 0, this._flushDeletedTask.clear(), this._isFlushingDeleted = false;
  }
  insert(t) {
    this._flushCleanupDeleted(), this._insertedValues.length === 0 && this._flushInsertedTask.enqueue(() => this._flushInserted()), this._insertedValues.push(t);
  }
  _flushInserted() {
    let t = this._insertedValues.sort((n, o) => this._getKey(n) - this._getKey(o)), e = 0, i = 0, r = new Array(this._array.length + this._insertedValues.length);
    for (let n = 0;n < r.length; n++)
      i >= this._array.length || this._getKey(t[e]) <= this._getKey(this._array[i]) ? (r[n] = t[e], e++) : r[n] = this._array[i++];
    this._array = r, this._insertedValues.length = 0;
  }
  _flushCleanupInserted() {
    !this._isFlushingInserted && this._insertedValues.length > 0 && this._flushInsertedTask.flush();
  }
  delete(t) {
    if (this._flushCleanupInserted(), this._array.length === 0)
      return false;
    let e = this._getKey(t);
    if (e === undefined || (ee = this._search(e), ee === -1) || this._getKey(this._array[ee]) !== e)
      return false;
    do
      if (this._array[ee] === t)
        return this._deletedIndices.length === 0 && this._flushDeletedTask.enqueue(() => this._flushDeleted()), this._deletedIndices.push(ee), true;
    while (++ee < this._array.length && this._getKey(this._array[ee]) === e);
    return false;
  }
  _flushDeleted() {
    this._isFlushingDeleted = true;
    let t = this._deletedIndices.sort((n, o) => n - o), e = 0, i = new Array(this._array.length - t.length), r = 0;
    for (let n = 0;n < this._array.length; n++)
      t[e] === n ? e++ : i[r++] = this._array[n];
    this._array = i, this._deletedIndices.length = 0, this._isFlushingDeleted = false;
  }
  _flushCleanupDeleted() {
    !this._isFlushingDeleted && this._deletedIndices.length > 0 && this._flushDeletedTask.flush();
  }
  *getKeyIterator(t) {
    if (this._flushCleanupInserted(), this._flushCleanupDeleted(), this._array.length !== 0 && (ee = this._search(t), !(ee < 0 || ee >= this._array.length) && this._getKey(this._array[ee]) === t))
      do
        yield this._array[ee];
      while (++ee < this._array.length && this._getKey(this._array[ee]) === t);
  }
  forEachByKey(t, e) {
    if (this._flushCleanupInserted(), this._flushCleanupDeleted(), this._array.length !== 0 && (ee = this._search(t), !(ee < 0 || ee >= this._array.length) && this._getKey(this._array[ee]) === t))
      do
        e(this._array[ee]);
      while (++ee < this._array.length && this._getKey(this._array[ee]) === t);
  }
  values() {
    return this._flushCleanupInserted(), this._flushCleanupDeleted(), [...this._array].values();
  }
  _search(t) {
    let e = 0, i = this._array.length - 1;
    for (;i >= e; ) {
      let r = e + i >> 1, n = this._getKey(this._array[r]);
      if (n > t)
        i = r - 1;
      else if (n < t)
        e = r + 1;
      else {
        for (;r > 0 && this._getKey(this._array[r - 1]) === t; )
          r--;
        return r;
      }
    }
    return e;
  }
};
var Us = 0;
var yl = 0;
var Tn = class extends D {
  constructor() {
    super();
    this._decorations = new En((e) => e?.marker.line);
    this._onDecorationRegistered = this._register(new v);
    this.onDecorationRegistered = this._onDecorationRegistered.event;
    this._onDecorationRemoved = this._register(new v);
    this.onDecorationRemoved = this._onDecorationRemoved.event;
    this._register(C(() => this.reset()));
  }
  get decorations() {
    return this._decorations.values();
  }
  registerDecoration(e) {
    if (e.marker.isDisposed)
      return;
    let i = new Ks(e);
    if (i) {
      let r = i.marker.onDispose(() => i.dispose()), n = i.onDispose(() => {
        n.dispose(), i && (this._decorations.delete(i) && this._onDecorationRemoved.fire(i), r.dispose());
      });
      this._decorations.insert(i), this._onDecorationRegistered.fire(i);
    }
    return i;
  }
  reset() {
    for (let e of this._decorations.values())
      e.dispose();
    this._decorations.clear();
  }
  *getDecorationsAtCell(e, i, r) {
    let n = 0, o = 0;
    for (let l of this._decorations.getKeyIterator(i))
      n = l.options.x ?? 0, o = n + (l.options.width ?? 1), e >= n && e < o && (!r || (l.options.layer ?? "bottom") === r) && (yield l);
  }
  forEachDecorationAtCell(e, i, r, n) {
    this._decorations.forEachByKey(i, (o) => {
      Us = o.options.x ?? 0, yl = Us + (o.options.width ?? 1), e >= Us && e < yl && (!r || (o.options.layer ?? "bottom") === r) && n(o);
    });
  }
};
var Ks = class extends Ee {
  constructor(e) {
    super();
    this.options = e;
    this.onRenderEmitter = this.add(new v);
    this.onRender = this.onRenderEmitter.event;
    this._onDispose = this.add(new v);
    this.onDispose = this._onDispose.event;
    this._cachedBg = null;
    this._cachedFg = null;
    this.marker = e.marker, this.options.overviewRulerOptions && !this.options.overviewRulerOptions.position && (this.options.overviewRulerOptions.position = "full");
  }
  get backgroundColorRGB() {
    return this._cachedBg === null && (this.options.backgroundColor ? this._cachedBg = z.toColor(this.options.backgroundColor) : this._cachedBg = undefined), this._cachedBg;
  }
  get foregroundColorRGB() {
    return this._cachedFg === null && (this.options.foregroundColor ? this._cachedFg = z.toColor(this.options.foregroundColor) : this._cachedFg = undefined), this._cachedFg;
  }
  dispose() {
    this._onDispose.fire(), super.dispose();
  }
};
var Sc = 1000;
var In = class {
  constructor(t, e = Sc) {
    this._renderCallback = t;
    this._debounceThresholdMS = e;
    this._lastRefreshMs = 0;
    this._additionalRefreshRequested = false;
  }
  dispose() {
    this._refreshTimeoutID && clearTimeout(this._refreshTimeoutID);
  }
  refresh(t, e, i) {
    this._rowCount = i, t = t !== undefined ? t : 0, e = e !== undefined ? e : this._rowCount - 1, this._rowStart = this._rowStart !== undefined ? Math.min(this._rowStart, t) : t, this._rowEnd = this._rowEnd !== undefined ? Math.max(this._rowEnd, e) : e;
    let r = performance.now();
    if (r - this._lastRefreshMs >= this._debounceThresholdMS)
      this._lastRefreshMs = r, this._innerRefresh();
    else if (!this._additionalRefreshRequested) {
      let n = r - this._lastRefreshMs, o = this._debounceThresholdMS - n;
      this._additionalRefreshRequested = true, this._refreshTimeoutID = window.setTimeout(() => {
        this._lastRefreshMs = performance.now(), this._innerRefresh(), this._additionalRefreshRequested = false, this._refreshTimeoutID = undefined;
      }, o);
    }
  }
  _innerRefresh() {
    if (this._rowStart === undefined || this._rowEnd === undefined || this._rowCount === undefined)
      return;
    let t = Math.max(this._rowStart, 0), e = Math.min(this._rowEnd, this._rowCount - 1);
    this._rowStart = undefined, this._rowEnd = undefined, this._renderCallback(t, e);
  }
};
var xl = 20;
var wl = false;
var Tt = class extends D {
  constructor(e, i, r, n) {
    super();
    this._terminal = e;
    this._coreBrowserService = r;
    this._renderService = n;
    this._rowColumns = new WeakMap;
    this._liveRegionLineCount = 0;
    this._charsToConsume = [];
    this._charsToAnnounce = "";
    let o = this._coreBrowserService.mainDocument;
    this._accessibilityContainer = o.createElement("div"), this._accessibilityContainer.classList.add("xterm-accessibility"), this._rowContainer = o.createElement("div"), this._rowContainer.setAttribute("role", "list"), this._rowContainer.classList.add("xterm-accessibility-tree"), this._rowElements = [];
    for (let l = 0;l < this._terminal.rows; l++)
      this._rowElements[l] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[l]);
    if (this._topBoundaryFocusListener = (l) => this._handleBoundaryFocus(l, 0), this._bottomBoundaryFocusListener = (l) => this._handleBoundaryFocus(l, 1), this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._accessibilityContainer.appendChild(this._rowContainer), this._liveRegion = o.createElement("div"), this._liveRegion.classList.add("live-region"), this._liveRegion.setAttribute("aria-live", "assertive"), this._accessibilityContainer.appendChild(this._liveRegion), this._liveRegionDebouncer = this._register(new In(this._renderRows.bind(this))), !this._terminal.element)
      throw new Error("Cannot enable accessibility before Terminal.open");
    wl ? (this._accessibilityContainer.classList.add("debug"), this._rowContainer.classList.add("debug"), this._debugRootContainer = o.createElement("div"), this._debugRootContainer.classList.add("xterm"), this._debugRootContainer.appendChild(o.createTextNode("------start a11y------")), this._debugRootContainer.appendChild(this._accessibilityContainer), this._debugRootContainer.appendChild(o.createTextNode("------end a11y------")), this._terminal.element.insertAdjacentElement("afterend", this._debugRootContainer)) : this._terminal.element.insertAdjacentElement("afterbegin", this._accessibilityContainer), this._register(this._terminal.onResize((l) => this._handleResize(l.rows))), this._register(this._terminal.onRender((l) => this._refreshRows(l.start, l.end))), this._register(this._terminal.onScroll(() => this._refreshRows())), this._register(this._terminal.onA11yChar((l) => this._handleChar(l))), this._register(this._terminal.onLineFeed(() => this._handleChar(`
`))), this._register(this._terminal.onA11yTab((l) => this._handleTab(l))), this._register(this._terminal.onKey((l) => this._handleKey(l.key))), this._register(this._terminal.onBlur(() => this._clearLiveRegion())), this._register(this._renderService.onDimensionsChange(() => this._refreshRowsDimensions())), this._register(L(o, "selectionchange", () => this._handleSelectionChange())), this._register(this._coreBrowserService.onDprChange(() => this._refreshRowsDimensions())), this._refreshRowsDimensions(), this._refreshRows(), this._register(C(() => {
      wl ? this._debugRootContainer.remove() : this._accessibilityContainer.remove(), this._rowElements.length = 0;
    }));
  }
  _handleTab(e) {
    for (let i = 0;i < e; i++)
      this._handleChar(" ");
  }
  _handleChar(e) {
    this._liveRegionLineCount < xl + 1 && (this._charsToConsume.length > 0 ? this._charsToConsume.shift() !== e && (this._charsToAnnounce += e) : this._charsToAnnounce += e, e === `
` && (this._liveRegionLineCount++, this._liveRegionLineCount === xl + 1 && (this._liveRegion.textContent += _i.get())));
  }
  _clearLiveRegion() {
    this._liveRegion.textContent = "", this._liveRegionLineCount = 0;
  }
  _handleKey(e) {
    this._clearLiveRegion(), /\p{Control}/u.test(e) || this._charsToConsume.push(e);
  }
  _refreshRows(e, i) {
    this._liveRegionDebouncer.refresh(e, i, this._terminal.rows);
  }
  _renderRows(e, i) {
    let r = this._terminal.buffer, n = r.lines.length.toString();
    for (let o = e;o <= i; o++) {
      let l = r.lines.get(r.ydisp + o), a = [], u = l?.translateToString(true, undefined, undefined, a) || "", h = (r.ydisp + o + 1).toString(), c = this._rowElements[o];
      c && (u.length === 0 ? (c.textContent = " ", this._rowColumns.set(c, [0, 1])) : (c.textContent = u, this._rowColumns.set(c, a)), c.setAttribute("aria-posinset", h), c.setAttribute("aria-setsize", n), this._alignRowWidth(c));
    }
    this._announceCharacters();
  }
  _announceCharacters() {
    this._charsToAnnounce.length !== 0 && (this._liveRegion.textContent += this._charsToAnnounce, this._charsToAnnounce = "");
  }
  _handleBoundaryFocus(e, i) {
    let r = e.target, n = this._rowElements[i === 0 ? 1 : this._rowElements.length - 2], o = r.getAttribute("aria-posinset"), l = i === 0 ? "1" : `${this._terminal.buffer.lines.length}`;
    if (o === l || e.relatedTarget !== n)
      return;
    let a, u;
    if (i === 0 ? (a = r, u = this._rowElements.pop(), this._rowContainer.removeChild(u)) : (a = this._rowElements.shift(), u = r, this._rowContainer.removeChild(a)), a.removeEventListener("focus", this._topBoundaryFocusListener), u.removeEventListener("focus", this._bottomBoundaryFocusListener), i === 0) {
      let h = this._createAccessibilityTreeNode();
      this._rowElements.unshift(h), this._rowContainer.insertAdjacentElement("afterbegin", h);
    } else {
      let h = this._createAccessibilityTreeNode();
      this._rowElements.push(h), this._rowContainer.appendChild(h);
    }
    this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._terminal.scrollLines(i === 0 ? -1 : 1), this._rowElements[i === 0 ? 1 : this._rowElements.length - 2].focus(), e.preventDefault(), e.stopImmediatePropagation();
  }
  _handleSelectionChange() {
    if (this._rowElements.length === 0)
      return;
    let e = this._coreBrowserService.mainDocument.getSelection();
    if (!e)
      return;
    if (e.isCollapsed) {
      this._rowContainer.contains(e.anchorNode) && this._terminal.clearSelection();
      return;
    }
    if (!e.anchorNode || !e.focusNode) {
      console.error("anchorNode and/or focusNode are null");
      return;
    }
    let i = { node: e.anchorNode, offset: e.anchorOffset }, r = { node: e.focusNode, offset: e.focusOffset };
    if ((i.node.compareDocumentPosition(r.node) & Node.DOCUMENT_POSITION_PRECEDING || i.node === r.node && i.offset > r.offset) && ([i, r] = [r, i]), i.node.compareDocumentPosition(this._rowElements[0]) & (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING) && (i = { node: this._rowElements[0].childNodes[0], offset: 0 }), !this._rowContainer.contains(i.node))
      return;
    let n = this._rowElements.slice(-1)[0];
    if (r.node.compareDocumentPosition(n) & (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_PRECEDING) && (r = { node: n, offset: n.textContent?.length ?? 0 }), !this._rowContainer.contains(r.node))
      return;
    let o = ({ node: u, offset: h }) => {
      let c = u instanceof Text ? u.parentNode : u, d = parseInt(c?.getAttribute("aria-posinset"), 10) - 1;
      if (isNaN(d))
        return console.warn("row is invalid. Race condition?"), null;
      let _ = this._rowColumns.get(c);
      if (!_)
        return console.warn("columns is null. Race condition?"), null;
      let p = h < _.length ? _[h] : _.slice(-1)[0] + 1;
      return p >= this._terminal.cols && (++d, p = 0), { row: d, column: p };
    }, l = o(i), a = o(r);
    if (!(!l || !a)) {
      if (l.row > a.row || l.row === a.row && l.column >= a.column)
        throw new Error("invalid range");
      this._terminal.select(l.column, l.row, (a.row - l.row) * this._terminal.cols - l.column + a.column);
    }
  }
  _handleResize(e) {
    this._rowElements[this._rowElements.length - 1].removeEventListener("focus", this._bottomBoundaryFocusListener);
    for (let i = this._rowContainer.children.length;i < this._terminal.rows; i++)
      this._rowElements[i] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[i]);
    for (;this._rowElements.length > e; )
      this._rowContainer.removeChild(this._rowElements.pop());
    this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._refreshRowsDimensions();
  }
  _createAccessibilityTreeNode() {
    let e = this._coreBrowserService.mainDocument.createElement("div");
    return e.setAttribute("role", "listitem"), e.tabIndex = -1, this._refreshRowDimensions(e), e;
  }
  _refreshRowsDimensions() {
    if (this._renderService.dimensions.css.cell.height) {
      Object.assign(this._accessibilityContainer.style, { width: `${this._renderService.dimensions.css.canvas.width}px`, fontSize: `${this._terminal.options.fontSize}px` }), this._rowElements.length !== this._terminal.rows && this._handleResize(this._terminal.rows);
      for (let e = 0;e < this._terminal.rows; e++)
        this._refreshRowDimensions(this._rowElements[e]), this._alignRowWidth(this._rowElements[e]);
    }
  }
  _refreshRowDimensions(e) {
    e.style.height = `${this._renderService.dimensions.css.cell.height}px`;
  }
  _alignRowWidth(e) {
    e.style.transform = "";
    let i = e.getBoundingClientRect().width, r = this._rowColumns.get(e)?.slice(-1)?.[0];
    if (!r)
      return;
    let n = r * this._renderService.dimensions.css.cell.width;
    e.style.transform = `scaleX(${n / i})`;
  }
};
Tt = M([S(1, xt), S(2, ae), S(3, ce)], Tt);
var hi = class extends D {
  constructor(e, i, r, n, o) {
    super();
    this._element = e;
    this._mouseService = i;
    this._renderService = r;
    this._bufferService = n;
    this._linkProviderService = o;
    this._linkCacheDisposables = [];
    this._isMouseOut = true;
    this._wasResized = false;
    this._activeLine = -1;
    this._onShowLinkUnderline = this._register(new v);
    this.onShowLinkUnderline = this._onShowLinkUnderline.event;
    this._onHideLinkUnderline = this._register(new v);
    this.onHideLinkUnderline = this._onHideLinkUnderline.event;
    this._register(C(() => {
      Ne(this._linkCacheDisposables), this._linkCacheDisposables.length = 0, this._lastMouseEvent = undefined, this._activeProviderReplies?.clear();
    })), this._register(this._bufferService.onResize(() => {
      this._clearCurrentLink(), this._wasResized = true;
    })), this._register(L(this._element, "mouseleave", () => {
      this._isMouseOut = true, this._clearCurrentLink();
    })), this._register(L(this._element, "mousemove", this._handleMouseMove.bind(this))), this._register(L(this._element, "mousedown", this._handleMouseDown.bind(this))), this._register(L(this._element, "mouseup", this._handleMouseUp.bind(this)));
  }
  get currentLink() {
    return this._currentLink;
  }
  _handleMouseMove(e) {
    this._lastMouseEvent = e;
    let i = this._positionFromMouseEvent(e, this._element, this._mouseService);
    if (!i)
      return;
    this._isMouseOut = false;
    let r = e.composedPath();
    for (let n = 0;n < r.length; n++) {
      let o = r[n];
      if (o.classList.contains("xterm"))
        break;
      if (o.classList.contains("xterm-hover"))
        return;
    }
    (!this._lastBufferCell || i.x !== this._lastBufferCell.x || i.y !== this._lastBufferCell.y) && (this._handleHover(i), this._lastBufferCell = i);
  }
  _handleHover(e) {
    if (this._activeLine !== e.y || this._wasResized) {
      this._clearCurrentLink(), this._askForLink(e, false), this._wasResized = false;
      return;
    }
    this._currentLink && this._linkAtPosition(this._currentLink.link, e) || (this._clearCurrentLink(), this._askForLink(e, true));
  }
  _askForLink(e, i) {
    (!this._activeProviderReplies || !i) && (this._activeProviderReplies?.forEach((n) => {
      n?.forEach((o) => {
        o.link.dispose && o.link.dispose();
      });
    }), this._activeProviderReplies = new Map, this._activeLine = e.y);
    let r = false;
    for (let [n, o] of this._linkProviderService.linkProviders.entries())
      i ? this._activeProviderReplies?.get(n) && (r = this._checkLinkProviderResult(n, e, r)) : o.provideLinks(e.y, (l) => {
        if (this._isMouseOut)
          return;
        let a = l?.map((u) => ({ link: u }));
        this._activeProviderReplies?.set(n, a), r = this._checkLinkProviderResult(n, e, r), this._activeProviderReplies?.size === this._linkProviderService.linkProviders.length && this._removeIntersectingLinks(e.y, this._activeProviderReplies);
      });
  }
  _removeIntersectingLinks(e, i) {
    let r = new Set;
    for (let n = 0;n < i.size; n++) {
      let o = i.get(n);
      if (o)
        for (let l = 0;l < o.length; l++) {
          let a = o[l], u = a.link.range.start.y < e ? 0 : a.link.range.start.x, h = a.link.range.end.y > e ? this._bufferService.cols : a.link.range.end.x;
          for (let c = u;c <= h; c++) {
            if (r.has(c)) {
              o.splice(l--, 1);
              break;
            }
            r.add(c);
          }
        }
    }
  }
  _checkLinkProviderResult(e, i, r) {
    if (!this._activeProviderReplies)
      return r;
    let n = this._activeProviderReplies.get(e), o = false;
    for (let l = 0;l < e; l++)
      (!this._activeProviderReplies.has(l) || this._activeProviderReplies.get(l)) && (o = true);
    if (!o && n) {
      let l = n.find((a) => this._linkAtPosition(a.link, i));
      l && (r = true, this._handleNewLink(l));
    }
    if (this._activeProviderReplies.size === this._linkProviderService.linkProviders.length && !r)
      for (let l = 0;l < this._activeProviderReplies.size; l++) {
        let a = this._activeProviderReplies.get(l)?.find((u) => this._linkAtPosition(u.link, i));
        if (a) {
          r = true, this._handleNewLink(a);
          break;
        }
      }
    return r;
  }
  _handleMouseDown() {
    this._mouseDownLink = this._currentLink;
  }
  _handleMouseUp(e) {
    if (!this._currentLink)
      return;
    let i = this._positionFromMouseEvent(e, this._element, this._mouseService);
    i && this._mouseDownLink && Ec(this._mouseDownLink.link, this._currentLink.link) && this._linkAtPosition(this._currentLink.link, i) && this._currentLink.link.activate(e, this._currentLink.link.text);
  }
  _clearCurrentLink(e, i) {
    !this._currentLink || !this._lastMouseEvent || (!e || !i || this._currentLink.link.range.start.y >= e && this._currentLink.link.range.end.y <= i) && (this._linkLeave(this._element, this._currentLink.link, this._lastMouseEvent), this._currentLink = undefined, Ne(this._linkCacheDisposables), this._linkCacheDisposables.length = 0);
  }
  _handleNewLink(e) {
    if (!this._lastMouseEvent)
      return;
    let i = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
    i && this._linkAtPosition(e.link, i) && (this._currentLink = e, this._currentLink.state = { decorations: { underline: e.link.decorations === undefined ? true : e.link.decorations.underline, pointerCursor: e.link.decorations === undefined ? true : e.link.decorations.pointerCursor }, isHovered: true }, this._linkHover(this._element, e.link, this._lastMouseEvent), e.link.decorations = {}, Object.defineProperties(e.link.decorations, { pointerCursor: { get: () => this._currentLink?.state?.decorations.pointerCursor, set: (r) => {
      this._currentLink?.state && this._currentLink.state.decorations.pointerCursor !== r && (this._currentLink.state.decorations.pointerCursor = r, this._currentLink.state.isHovered && this._element.classList.toggle("xterm-cursor-pointer", r));
    } }, underline: { get: () => this._currentLink?.state?.decorations.underline, set: (r) => {
      this._currentLink?.state && this._currentLink?.state?.decorations.underline !== r && (this._currentLink.state.decorations.underline = r, this._currentLink.state.isHovered && this._fireUnderlineEvent(e.link, r));
    } } }), this._linkCacheDisposables.push(this._renderService.onRenderedViewportChange((r) => {
      if (!this._currentLink)
        return;
      let n = r.start === 0 ? 0 : r.start + 1 + this._bufferService.buffer.ydisp, o = this._bufferService.buffer.ydisp + 1 + r.end;
      if (this._currentLink.link.range.start.y >= n && this._currentLink.link.range.end.y <= o && (this._clearCurrentLink(n, o), this._lastMouseEvent)) {
        let l = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
        l && this._askForLink(l, false);
      }
    })));
  }
  _linkHover(e, i, r) {
    this._currentLink?.state && (this._currentLink.state.isHovered = true, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(i, true), this._currentLink.state.decorations.pointerCursor && e.classList.add("xterm-cursor-pointer")), i.hover && i.hover(r, i.text);
  }
  _fireUnderlineEvent(e, i) {
    let r = e.range, n = this._bufferService.buffer.ydisp, o = this._createLinkUnderlineEvent(r.start.x - 1, r.start.y - n - 1, r.end.x, r.end.y - n - 1, undefined);
    (i ? this._onShowLinkUnderline : this._onHideLinkUnderline).fire(o);
  }
  _linkLeave(e, i, r) {
    this._currentLink?.state && (this._currentLink.state.isHovered = false, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(i, false), this._currentLink.state.decorations.pointerCursor && e.classList.remove("xterm-cursor-pointer")), i.leave && i.leave(r, i.text);
  }
  _linkAtPosition(e, i) {
    let r = e.range.start.y * this._bufferService.cols + e.range.start.x, n = e.range.end.y * this._bufferService.cols + e.range.end.x, o = i.y * this._bufferService.cols + i.x;
    return r <= o && o <= n;
  }
  _positionFromMouseEvent(e, i, r) {
    let n = r.getCoords(e, i, this._bufferService.cols, this._bufferService.rows);
    if (n)
      return { x: n[0], y: n[1] + this._bufferService.buffer.ydisp };
  }
  _createLinkUnderlineEvent(e, i, r, n, o) {
    return { x1: e, y1: i, x2: r, y2: n, cols: this._bufferService.cols, fg: o };
  }
};
hi = M([S(1, Dt), S(2, ce), S(3, F), S(4, lr)], hi);
function Ec(s15, t) {
  return s15.text === t.text && s15.range.start.x === t.range.start.x && s15.range.start.y === t.range.start.y && s15.range.end.x === t.range.end.x && s15.range.end.y === t.range.end.y;
}
var yn = class extends Sn {
  constructor(e = {}) {
    super(e);
    this._linkifier = this._register(new ye);
    this.browser = tn;
    this._keyDownHandled = false;
    this._keyDownSeen = false;
    this._keyPressHandled = false;
    this._unprocessedDeadKey = false;
    this._accessibilityManager = this._register(new ye);
    this._onCursorMove = this._register(new v);
    this.onCursorMove = this._onCursorMove.event;
    this._onKey = this._register(new v);
    this.onKey = this._onKey.event;
    this._onRender = this._register(new v);
    this.onRender = this._onRender.event;
    this._onSelectionChange = this._register(new v);
    this.onSelectionChange = this._onSelectionChange.event;
    this._onTitleChange = this._register(new v);
    this.onTitleChange = this._onTitleChange.event;
    this._onBell = this._register(new v);
    this.onBell = this._onBell.event;
    this._onFocus = this._register(new v);
    this._onBlur = this._register(new v);
    this._onA11yCharEmitter = this._register(new v);
    this._onA11yTabEmitter = this._register(new v);
    this._onWillOpen = this._register(new v);
    this._setup(), this._decorationService = this._instantiationService.createInstance(Tn), this._instantiationService.setService(Be, this._decorationService), this._linkProviderService = this._instantiationService.createInstance(Qr), this._instantiationService.setService(lr, this._linkProviderService), this._linkProviderService.registerLinkProvider(this._instantiationService.createInstance(wt)), this._register(this._inputHandler.onRequestBell(() => this._onBell.fire())), this._register(this._inputHandler.onRequestRefreshRows((i) => this.refresh(i?.start ?? 0, i?.end ?? this.rows - 1))), this._register(this._inputHandler.onRequestSendFocus(() => this._reportFocus())), this._register(this._inputHandler.onRequestReset(() => this.reset())), this._register(this._inputHandler.onRequestWindowsOptionsReport((i) => this._reportWindowsOptions(i))), this._register(this._inputHandler.onColor((i) => this._handleColorEvent(i))), this._register($.forward(this._inputHandler.onCursorMove, this._onCursorMove)), this._register($.forward(this._inputHandler.onTitleChange, this._onTitleChange)), this._register($.forward(this._inputHandler.onA11yChar, this._onA11yCharEmitter)), this._register($.forward(this._inputHandler.onA11yTab, this._onA11yTabEmitter)), this._register(this._bufferService.onResize((i) => this._afterResize(i.cols, i.rows))), this._register(C(() => {
      this._customKeyEventHandler = undefined, this.element?.parentNode?.removeChild(this.element);
    }));
  }
  get linkifier() {
    return this._linkifier.value;
  }
  get onFocus() {
    return this._onFocus.event;
  }
  get onBlur() {
    return this._onBlur.event;
  }
  get onA11yChar() {
    return this._onA11yCharEmitter.event;
  }
  get onA11yTab() {
    return this._onA11yTabEmitter.event;
  }
  get onWillOpen() {
    return this._onWillOpen.event;
  }
  _handleColorEvent(e) {
    if (this._themeService)
      for (let i of e) {
        let r, n = "";
        switch (i.index) {
          case 256:
            r = "foreground", n = "10";
            break;
          case 257:
            r = "background", n = "11";
            break;
          case 258:
            r = "cursor", n = "12";
            break;
          default:
            r = "ansi", n = "4;" + i.index;
        }
        switch (i.type) {
          case 0:
            let o = U.toColorRGB(r === "ansi" ? this._themeService.colors.ansi[i.index] : this._themeService.colors[r]);
            this.coreService.triggerDataEvent(`${b.ESC}]${n};${ml(o)}${fs.ST}`);
            break;
          case 1:
            if (r === "ansi")
              this._themeService.modifyColors((l) => l.ansi[i.index] = j.toColor(...i.color));
            else {
              let l = r;
              this._themeService.modifyColors((a) => a[l] = j.toColor(...i.color));
            }
            break;
          case 2:
            this._themeService.restoreColor(i.index);
            break;
        }
      }
  }
  _setup() {
    super._setup(), this._customKeyEventHandler = undefined;
  }
  get buffer() {
    return this.buffers.active;
  }
  focus() {
    this.textarea && this.textarea.focus({ preventScroll: true });
  }
  _handleScreenReaderModeOptionChange(e) {
    e ? !this._accessibilityManager.value && this._renderService && (this._accessibilityManager.value = this._instantiationService.createInstance(Tt, this)) : this._accessibilityManager.clear();
  }
  _handleTextAreaFocus(e) {
    this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(b.ESC + "[I"), this.element.classList.add("focus"), this._showCursor(), this._onFocus.fire();
  }
  blur() {
    return this.textarea?.blur();
  }
  _handleTextAreaBlur() {
    this.textarea.value = "", this.refresh(this.buffer.y, this.buffer.y), this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(b.ESC + "[O"), this.element.classList.remove("focus"), this._onBlur.fire();
  }
  _syncTextArea() {
    if (!this.textarea || !this.buffer.isCursorInViewport || this._compositionHelper.isComposing || !this._renderService)
      return;
    let e = this.buffer.ybase + this.buffer.y, i = this.buffer.lines.get(e);
    if (!i)
      return;
    let r = Math.min(this.buffer.x, this.cols - 1), n = this._renderService.dimensions.css.cell.height, o = i.getWidth(r), l = this._renderService.dimensions.css.cell.width * o, a = this.buffer.y * this._renderService.dimensions.css.cell.height, u = r * this._renderService.dimensions.css.cell.width;
    this.textarea.style.left = u + "px", this.textarea.style.top = a + "px", this.textarea.style.width = l + "px", this.textarea.style.height = n + "px", this.textarea.style.lineHeight = n + "px", this.textarea.style.zIndex = "-5";
  }
  _initGlobal() {
    this._bindKeys(), this._register(L(this.element, "copy", (i) => {
      this.hasSelection() && Vs(i, this._selectionService);
    }));
    let e = (i) => qs(i, this.textarea, this.coreService, this.optionsService);
    this._register(L(this.textarea, "paste", e)), this._register(L(this.element, "paste", e)), Ss ? this._register(L(this.element, "mousedown", (i) => {
      i.button === 2 && Pn(i, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
    })) : this._register(L(this.element, "contextmenu", (i) => {
      Pn(i, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
    })), Bi && this._register(L(this.element, "auxclick", (i) => {
      i.button === 1 && Mn(i, this.textarea, this.screenElement);
    }));
  }
  _bindKeys() {
    this._register(L(this.textarea, "keyup", (e) => this._keyUp(e), true)), this._register(L(this.textarea, "keydown", (e) => this._keyDown(e), true)), this._register(L(this.textarea, "keypress", (e) => this._keyPress(e), true)), this._register(L(this.textarea, "compositionstart", () => this._compositionHelper.compositionstart())), this._register(L(this.textarea, "compositionupdate", (e) => this._compositionHelper.compositionupdate(e))), this._register(L(this.textarea, "compositionend", () => this._compositionHelper.compositionend())), this._register(L(this.textarea, "input", (e) => this._inputEvent(e), true)), this._register(this.onRender(() => this._compositionHelper.updateCompositionElements()));
  }
  open(e) {
    if (!e)
      throw new Error("Terminal requires a parent element.");
    if (e.isConnected || this._logService.debug("Terminal.open was called on an element that was not attached to the DOM"), this.element?.ownerDocument.defaultView && this._coreBrowserService) {
      this.element.ownerDocument.defaultView !== this._coreBrowserService.window && (this._coreBrowserService.window = this.element.ownerDocument.defaultView);
      return;
    }
    this._document = e.ownerDocument, this.options.documentOverride && this.options.documentOverride instanceof Document && (this._document = this.optionsService.rawOptions.documentOverride), this.element = this._document.createElement("div"), this.element.dir = "ltr", this.element.classList.add("terminal"), this.element.classList.add("xterm"), e.appendChild(this.element);
    let i = this._document.createDocumentFragment();
    this._viewportElement = this._document.createElement("div"), this._viewportElement.classList.add("xterm-viewport"), i.appendChild(this._viewportElement), this.screenElement = this._document.createElement("div"), this.screenElement.classList.add("xterm-screen"), this._register(L(this.screenElement, "mousemove", (o) => this.updateCursorStyle(o))), this._helperContainer = this._document.createElement("div"), this._helperContainer.classList.add("xterm-helpers"), this.screenElement.appendChild(this._helperContainer), i.appendChild(this.screenElement);
    let r = this.textarea = this._document.createElement("textarea");
    this.textarea.classList.add("xterm-helper-textarea"), this.textarea.setAttribute("aria-label", mi.get()), Ts || this.textarea.setAttribute("aria-multiline", "false"), this.textarea.setAttribute("autocorrect", "off"), this.textarea.setAttribute("autocapitalize", "off"), this.textarea.setAttribute("spellcheck", "false"), this.textarea.tabIndex = 0, this._register(this.optionsService.onSpecificOptionChange("disableStdin", () => r.readOnly = this.optionsService.rawOptions.disableStdin)), this.textarea.readOnly = this.optionsService.rawOptions.disableStdin, this._coreBrowserService = this._register(this._instantiationService.createInstance(Jr, this.textarea, e.ownerDocument.defaultView ?? window, this._document ?? typeof window < "u" ? window.document : null)), this._instantiationService.setService(ae, this._coreBrowserService), this._register(L(this.textarea, "focus", (o) => this._handleTextAreaFocus(o))), this._register(L(this.textarea, "blur", () => this._handleTextAreaBlur())), this._helperContainer.appendChild(this.textarea), this._charSizeService = this._instantiationService.createInstance(jt, this._document, this._helperContainer), this._instantiationService.setService(nt, this._charSizeService), this._themeService = this._instantiationService.createInstance(ti), this._instantiationService.setService(Re, this._themeService), this._characterJoinerService = this._instantiationService.createInstance(ct), this._instantiationService.setService(or, this._characterJoinerService), this._renderService = this._register(this._instantiationService.createInstance(Qt, this.rows, this.screenElement)), this._instantiationService.setService(ce, this._renderService), this._register(this._renderService.onRenderedViewportChange((o) => this._onRender.fire(o))), this.onResize((o) => this._renderService.resize(o.cols, o.rows)), this._compositionView = this._document.createElement("div"), this._compositionView.classList.add("composition-view"), this._compositionHelper = this._instantiationService.createInstance($t, this.textarea, this._compositionView), this._helperContainer.appendChild(this._compositionView), this._mouseService = this._instantiationService.createInstance(Xt), this._instantiationService.setService(Dt, this._mouseService);
    let n = this._linkifier.value = this._register(this._instantiationService.createInstance(hi, this.screenElement));
    this.element.appendChild(i);
    try {
      this._onWillOpen.fire(this.element);
    } catch {}
    this._renderService.hasRenderer() || this._renderService.setRenderer(this._createRenderer()), this._register(this.onCursorMove(() => {
      this._renderService.handleCursorMove(), this._syncTextArea();
    })), this._register(this.onResize(() => this._renderService.handleResize(this.cols, this.rows))), this._register(this.onBlur(() => this._renderService.handleBlur())), this._register(this.onFocus(() => this._renderService.handleFocus())), this._viewport = this._register(this._instantiationService.createInstance(zt, this.element, this.screenElement)), this._register(this._viewport.onRequestScrollLines((o) => {
      super.scrollLines(o, false), this.refresh(0, this.rows - 1);
    })), this._selectionService = this._register(this._instantiationService.createInstance(ei, this.element, this.screenElement, n)), this._instantiationService.setService(Qs, this._selectionService), this._register(this._selectionService.onRequestScrollLines((o) => this.scrollLines(o.amount, o.suppressScrollEvent))), this._register(this._selectionService.onSelectionChange(() => this._onSelectionChange.fire())), this._register(this._selectionService.onRequestRedraw((o) => this._renderService.handleSelectionChanged(o.start, o.end, o.columnSelectMode))), this._register(this._selectionService.onLinuxMouseSelection((o) => {
      this.textarea.value = o, this.textarea.focus(), this.textarea.select();
    })), this._register($.any(this._onScroll.event, this._inputHandler.onScroll)(() => {
      this._selectionService.refresh(), this._viewport?.queueSync();
    })), this._register(this._instantiationService.createInstance(Gt, this.screenElement)), this._register(L(this.element, "mousedown", (o) => this._selectionService.handleMouseDown(o))), this.coreMouseService.areMouseEventsActive ? (this._selectionService.disable(), this.element.classList.add("enable-mouse-events")) : this._selectionService.enable(), this.options.screenReaderMode && (this._accessibilityManager.value = this._instantiationService.createInstance(Tt, this)), this._register(this.optionsService.onSpecificOptionChange("screenReaderMode", (o) => this._handleScreenReaderModeOptionChange(o))), this.options.overviewRuler.width && (this._overviewRulerRenderer = this._register(this._instantiationService.createInstance(bt, this._viewportElement, this.screenElement))), this.optionsService.onSpecificOptionChange("overviewRuler", (o) => {
      !this._overviewRulerRenderer && o && this._viewportElement && this.screenElement && (this._overviewRulerRenderer = this._register(this._instantiationService.createInstance(bt, this._viewportElement, this.screenElement)));
    }), this._charSizeService.measure(), this.refresh(0, this.rows - 1), this._initGlobal(), this.bindMouse();
  }
  _createRenderer() {
    return this._instantiationService.createInstance(Yt, this, this._document, this.element, this.screenElement, this._viewportElement, this._helperContainer, this.linkifier);
  }
  bindMouse() {
    let e = this, i = this.element;
    function r(l) {
      let a = e._mouseService.getMouseReportCoords(l, e.screenElement);
      if (!a)
        return false;
      let u, h;
      switch (l.overrideType || l.type) {
        case "mousemove":
          h = 32, l.buttons === undefined ? (u = 3, l.button !== undefined && (u = l.button < 3 ? l.button : 3)) : u = l.buttons & 1 ? 0 : l.buttons & 4 ? 1 : l.buttons & 2 ? 2 : 3;
          break;
        case "mouseup":
          h = 0, u = l.button < 3 ? l.button : 3;
          break;
        case "mousedown":
          h = 1, u = l.button < 3 ? l.button : 3;
          break;
        case "wheel":
          if (e._customWheelEventHandler && e._customWheelEventHandler(l) === false)
            return false;
          let c = l.deltaY;
          if (c === 0 || e.coreMouseService.consumeWheelEvent(l, e._renderService?.dimensions?.device?.cell?.height, e._coreBrowserService?.dpr) === 0)
            return false;
          h = c < 0 ? 0 : 1, u = 4;
          break;
        default:
          return false;
      }
      return h === undefined || u === undefined || u > 4 ? false : e.coreMouseService.triggerMouseEvent({ col: a.col, row: a.row, x: a.x, y: a.y, button: u, action: h, ctrl: l.ctrlKey, alt: l.altKey, shift: l.shiftKey });
    }
    let n = { mouseup: null, wheel: null, mousedrag: null, mousemove: null }, o = { mouseup: (l) => (r(l), l.buttons || (this._document.removeEventListener("mouseup", n.mouseup), n.mousedrag && this._document.removeEventListener("mousemove", n.mousedrag)), this.cancel(l)), wheel: (l) => (r(l), this.cancel(l, true)), mousedrag: (l) => {
      l.buttons && r(l);
    }, mousemove: (l) => {
      l.buttons || r(l);
    } };
    this._register(this.coreMouseService.onProtocolChange((l) => {
      l ? (this.optionsService.rawOptions.logLevel === "debug" && this._logService.debug("Binding to mouse events:", this.coreMouseService.explainEvents(l)), this.element.classList.add("enable-mouse-events"), this._selectionService.disable()) : (this._logService.debug("Unbinding from mouse events."), this.element.classList.remove("enable-mouse-events"), this._selectionService.enable()), l & 8 ? n.mousemove || (i.addEventListener("mousemove", o.mousemove), n.mousemove = o.mousemove) : (i.removeEventListener("mousemove", n.mousemove), n.mousemove = null), l & 16 ? n.wheel || (i.addEventListener("wheel", o.wheel, { passive: false }), n.wheel = o.wheel) : (i.removeEventListener("wheel", n.wheel), n.wheel = null), l & 2 ? n.mouseup || (n.mouseup = o.mouseup) : (this._document.removeEventListener("mouseup", n.mouseup), n.mouseup = null), l & 4 ? n.mousedrag || (n.mousedrag = o.mousedrag) : (this._document.removeEventListener("mousemove", n.mousedrag), n.mousedrag = null);
    })), this.coreMouseService.activeProtocol = this.coreMouseService.activeProtocol, this._register(L(i, "mousedown", (l) => {
      if (l.preventDefault(), this.focus(), !(!this.coreMouseService.areMouseEventsActive || this._selectionService.shouldForceSelection(l)))
        return r(l), n.mouseup && this._document.addEventListener("mouseup", n.mouseup), n.mousedrag && this._document.addEventListener("mousemove", n.mousedrag), this.cancel(l);
    })), this._register(L(i, "wheel", (l) => {
      if (!n.wheel) {
        if (this._customWheelEventHandler && this._customWheelEventHandler(l) === false)
          return false;
        if (!this.buffer.hasScrollback) {
          if (l.deltaY === 0)
            return false;
          if (e.coreMouseService.consumeWheelEvent(l, e._renderService?.dimensions?.device?.cell?.height, e._coreBrowserService?.dpr) === 0)
            return this.cancel(l, true);
          let h = b.ESC + (this.coreService.decPrivateModes.applicationCursorKeys ? "O" : "[") + (l.deltaY < 0 ? "A" : "B");
          return this.coreService.triggerDataEvent(h, true), this.cancel(l, true);
        }
      }
    }, { passive: false }));
  }
  refresh(e, i) {
    this._renderService?.refreshRows(e, i);
  }
  updateCursorStyle(e) {
    this._selectionService?.shouldColumnSelect(e) ? this.element.classList.add("column-select") : this.element.classList.remove("column-select");
  }
  _showCursor() {
    this.coreService.isCursorInitialized || (this.coreService.isCursorInitialized = true, this.refresh(this.buffer.y, this.buffer.y));
  }
  scrollLines(e, i) {
    this._viewport ? this._viewport.scrollLines(e) : super.scrollLines(e, i), this.refresh(0, this.rows - 1);
  }
  scrollPages(e) {
    this.scrollLines(e * (this.rows - 1));
  }
  scrollToTop() {
    this.scrollLines(-this._bufferService.buffer.ydisp);
  }
  scrollToBottom(e) {
    e && this._viewport ? this._viewport.scrollToLine(this.buffer.ybase, true) : this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
  }
  scrollToLine(e) {
    let i = e - this._bufferService.buffer.ydisp;
    i !== 0 && this.scrollLines(i);
  }
  paste(e) {
    Cn(e, this.textarea, this.coreService, this.optionsService);
  }
  attachCustomKeyEventHandler(e) {
    this._customKeyEventHandler = e;
  }
  attachCustomWheelEventHandler(e) {
    this._customWheelEventHandler = e;
  }
  registerLinkProvider(e) {
    return this._linkProviderService.registerLinkProvider(e);
  }
  registerCharacterJoiner(e) {
    if (!this._characterJoinerService)
      throw new Error("Terminal must be opened first");
    let i = this._characterJoinerService.register(e);
    return this.refresh(0, this.rows - 1), i;
  }
  deregisterCharacterJoiner(e) {
    if (!this._characterJoinerService)
      throw new Error("Terminal must be opened first");
    this._characterJoinerService.deregister(e) && this.refresh(0, this.rows - 1);
  }
  get markers() {
    return this.buffer.markers;
  }
  registerMarker(e) {
    return this.buffer.addMarker(this.buffer.ybase + this.buffer.y + e);
  }
  registerDecoration(e) {
    return this._decorationService.registerDecoration(e);
  }
  hasSelection() {
    return this._selectionService ? this._selectionService.hasSelection : false;
  }
  select(e, i, r) {
    this._selectionService.setSelection(e, i, r);
  }
  getSelection() {
    return this._selectionService ? this._selectionService.selectionText : "";
  }
  getSelectionPosition() {
    if (!(!this._selectionService || !this._selectionService.hasSelection))
      return { start: { x: this._selectionService.selectionStart[0], y: this._selectionService.selectionStart[1] }, end: { x: this._selectionService.selectionEnd[0], y: this._selectionService.selectionEnd[1] } };
  }
  clearSelection() {
    this._selectionService?.clearSelection();
  }
  selectAll() {
    this._selectionService?.selectAll();
  }
  selectLines(e, i) {
    this._selectionService?.selectLines(e, i);
  }
  _keyDown(e) {
    if (this._keyDownHandled = false, this._keyDownSeen = true, this._customKeyEventHandler && this._customKeyEventHandler(e) === false)
      return false;
    let i = this.browser.isMac && this.options.macOptionIsMeta && e.altKey;
    if (!i && !this._compositionHelper.keydown(e))
      return this.options.scrollOnUserInput && this.buffer.ybase !== this.buffer.ydisp && this.scrollToBottom(true), false;
    !i && (e.key === "Dead" || e.key === "AltGraph") && (this._unprocessedDeadKey = true);
    let r = Il(e, this.coreService.decPrivateModes.applicationCursorKeys, this.browser.isMac, this.options.macOptionIsMeta);
    if (this.updateCursorStyle(e), r.type === 3 || r.type === 2) {
      let n = this.rows - 1;
      return this.scrollLines(r.type === 2 ? -n : n), this.cancel(e, true);
    }
    if (r.type === 1 && this.selectAll(), this._isThirdLevelShift(this.browser, e) || (r.cancel && this.cancel(e, true), !r.key) || e.key && !e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1 && e.key.charCodeAt(0) >= 65 && e.key.charCodeAt(0) <= 90)
      return true;
    if (this._unprocessedDeadKey)
      return this._unprocessedDeadKey = false, true;
    if ((r.key === b.ETX || r.key === b.CR) && (this.textarea.value = ""), this._onKey.fire({ key: r.key, domEvent: e }), this._showCursor(), this.coreService.triggerDataEvent(r.key, true), !this.optionsService.rawOptions.screenReaderMode || e.altKey || e.ctrlKey)
      return this.cancel(e, true);
    this._keyDownHandled = true;
  }
  _isThirdLevelShift(e, i) {
    let r = e.isMac && !this.options.macOptionIsMeta && i.altKey && !i.ctrlKey && !i.metaKey || e.isWindows && i.altKey && i.ctrlKey && !i.metaKey || e.isWindows && i.getModifierState("AltGraph");
    return i.type === "keypress" ? r : r && (!i.keyCode || i.keyCode > 47);
  }
  _keyUp(e) {
    this._keyDownSeen = false, !(this._customKeyEventHandler && this._customKeyEventHandler(e) === false) && (Tc(e) || this.focus(), this.updateCursorStyle(e), this._keyPressHandled = false);
  }
  _keyPress(e) {
    let i;
    if (this._keyPressHandled = false, this._keyDownHandled || this._customKeyEventHandler && this._customKeyEventHandler(e) === false)
      return false;
    if (this.cancel(e), e.charCode)
      i = e.charCode;
    else if (e.which === null || e.which === undefined)
      i = e.keyCode;
    else if (e.which !== 0 && e.charCode !== 0)
      i = e.which;
    else
      return false;
    return !i || (e.altKey || e.ctrlKey || e.metaKey) && !this._isThirdLevelShift(this.browser, e) ? false : (i = String.fromCharCode(i), this._onKey.fire({ key: i, domEvent: e }), this._showCursor(), this.coreService.triggerDataEvent(i, true), this._keyPressHandled = true, this._unprocessedDeadKey = false, true);
  }
  _inputEvent(e) {
    if (e.data && e.inputType === "insertText" && (!e.composed || !this._keyDownSeen) && !this.optionsService.rawOptions.screenReaderMode) {
      if (this._keyPressHandled)
        return false;
      this._unprocessedDeadKey = false;
      let i = e.data;
      return this.coreService.triggerDataEvent(i, true), this.cancel(e), true;
    }
    return false;
  }
  resize(e, i) {
    if (e === this.cols && i === this.rows) {
      this._charSizeService && !this._charSizeService.hasValidSize && this._charSizeService.measure();
      return;
    }
    super.resize(e, i);
  }
  _afterResize(e, i) {
    this._charSizeService?.measure();
  }
  clear() {
    if (!(this.buffer.ybase === 0 && this.buffer.y === 0)) {
      this.buffer.clearAllMarkers(), this.buffer.lines.set(0, this.buffer.lines.get(this.buffer.ybase + this.buffer.y)), this.buffer.lines.length = 1, this.buffer.ydisp = 0, this.buffer.ybase = 0, this.buffer.y = 0;
      for (let e = 1;e < this.rows; e++)
        this.buffer.lines.push(this.buffer.getBlankLine(X));
      this._onScroll.fire({ position: this.buffer.ydisp }), this.refresh(0, this.rows - 1);
    }
  }
  reset() {
    this.options.rows = this.rows, this.options.cols = this.cols;
    let e = this._customKeyEventHandler;
    this._setup(), super.reset(), this._selectionService?.reset(), this._decorationService.reset(), this._customKeyEventHandler = e, this.refresh(0, this.rows - 1);
  }
  clearTextureAtlas() {
    this._renderService?.clearTextureAtlas();
  }
  _reportFocus() {
    this.element?.classList.contains("focus") ? this.coreService.triggerDataEvent(b.ESC + "[I") : this.coreService.triggerDataEvent(b.ESC + "[O");
  }
  _reportWindowsOptions(e) {
    if (this._renderService)
      switch (e) {
        case 0:
          let i = this._renderService.dimensions.css.canvas.width.toFixed(0), r = this._renderService.dimensions.css.canvas.height.toFixed(0);
          this.coreService.triggerDataEvent(`${b.ESC}[4;${r};${i}t`);
          break;
        case 1:
          let n = this._renderService.dimensions.css.cell.width.toFixed(0), o = this._renderService.dimensions.css.cell.height.toFixed(0);
          this.coreService.triggerDataEvent(`${b.ESC}[6;${o};${n}t`);
          break;
      }
  }
  cancel(e, i) {
    if (!(!this.options.cancelEvents && !i))
      return e.preventDefault(), e.stopPropagation(), false;
  }
};
function Tc(s15) {
  return s15.keyCode === 16 || s15.keyCode === 17 || s15.keyCode === 18;
}
var xn = class {
  constructor() {
    this._addons = [];
  }
  dispose() {
    for (let t = this._addons.length - 1;t >= 0; t--)
      this._addons[t].instance.dispose();
  }
  loadAddon(t, e) {
    let i = { instance: e, dispose: e.dispose, isDisposed: false };
    this._addons.push(i), e.dispose = () => this._wrappedAddonDispose(i), e.activate(t);
  }
  _wrappedAddonDispose(t) {
    if (t.isDisposed)
      return;
    let e = -1;
    for (let i = 0;i < this._addons.length; i++)
      if (this._addons[i] === t) {
        e = i;
        break;
      }
    if (e === -1)
      throw new Error("Could not dispose an addon that has not been loaded");
    t.isDisposed = true, t.dispose.apply(t.instance), this._addons.splice(e, 1);
  }
};
var wn = class {
  constructor(t) {
    this._line = t;
  }
  get isWrapped() {
    return this._line.isWrapped;
  }
  get length() {
    return this._line.length;
  }
  getCell(t, e) {
    if (!(t < 0 || t >= this._line.length))
      return e ? (this._line.loadCell(t, e), e) : this._line.loadCell(t, new q);
  }
  translateToString(t, e, i) {
    return this._line.translateToString(t, e, i);
  }
};
var Ji = class {
  constructor(t, e) {
    this._buffer = t;
    this.type = e;
  }
  init(t) {
    return this._buffer = t, this;
  }
  get cursorY() {
    return this._buffer.y;
  }
  get cursorX() {
    return this._buffer.x;
  }
  get viewportY() {
    return this._buffer.ydisp;
  }
  get baseY() {
    return this._buffer.ybase;
  }
  get length() {
    return this._buffer.lines.length;
  }
  getLine(t) {
    let e = this._buffer.lines.get(t);
    if (e)
      return new wn(e);
  }
  getNullCell() {
    return new q;
  }
};
var Dn = class extends D {
  constructor(e) {
    super();
    this._core = e;
    this._onBufferChange = this._register(new v);
    this.onBufferChange = this._onBufferChange.event;
    this._normal = new Ji(this._core.buffers.normal, "normal"), this._alternate = new Ji(this._core.buffers.alt, "alternate"), this._core.buffers.onBufferActivate(() => this._onBufferChange.fire(this.active));
  }
  get active() {
    if (this._core.buffers.active === this._core.buffers.normal)
      return this.normal;
    if (this._core.buffers.active === this._core.buffers.alt)
      return this.alternate;
    throw new Error("Active buffer is neither normal nor alternate");
  }
  get normal() {
    return this._normal.init(this._core.buffers.normal);
  }
  get alternate() {
    return this._alternate.init(this._core.buffers.alt);
  }
};
var Rn = class {
  constructor(t) {
    this._core = t;
  }
  registerCsiHandler(t, e) {
    return this._core.registerCsiHandler(t, (i) => e(i.toArray()));
  }
  addCsiHandler(t, e) {
    return this.registerCsiHandler(t, e);
  }
  registerDcsHandler(t, e) {
    return this._core.registerDcsHandler(t, (i, r) => e(i, r.toArray()));
  }
  addDcsHandler(t, e) {
    return this.registerDcsHandler(t, e);
  }
  registerEscHandler(t, e) {
    return this._core.registerEscHandler(t, e);
  }
  addEscHandler(t, e) {
    return this.registerEscHandler(t, e);
  }
  registerOscHandler(t, e) {
    return this._core.registerOscHandler(t, e);
  }
  addOscHandler(t, e) {
    return this.registerOscHandler(t, e);
  }
};
var Ln = class {
  constructor(t) {
    this._core = t;
  }
  register(t) {
    this._core.unicodeService.register(t);
  }
  get versions() {
    return this._core.unicodeService.versions;
  }
  get activeVersion() {
    return this._core.unicodeService.activeVersion;
  }
  set activeVersion(t) {
    this._core.unicodeService.activeVersion = t;
  }
};
var Ic = ["cols", "rows"];
var Ue = 0;
var Dl = class extends D {
  constructor(t) {
    super(), this._core = this._register(new yn(t)), this._addonManager = this._register(new xn), this._publicOptions = { ...this._core.options };
    let e = (r) => this._core.options[r], i = (r, n) => {
      this._checkReadonlyOptions(r), this._core.options[r] = n;
    };
    for (let r in this._core.options) {
      let n = { get: e.bind(this, r), set: i.bind(this, r) };
      Object.defineProperty(this._publicOptions, r, n);
    }
  }
  _checkReadonlyOptions(t) {
    if (Ic.includes(t))
      throw new Error(`Option "${t}" can only be set in the constructor`);
  }
  _checkProposedApi() {
    if (!this._core.optionsService.rawOptions.allowProposedApi)
      throw new Error("You must set the allowProposedApi option to true to use proposed API");
  }
  get onBell() {
    return this._core.onBell;
  }
  get onBinary() {
    return this._core.onBinary;
  }
  get onCursorMove() {
    return this._core.onCursorMove;
  }
  get onData() {
    return this._core.onData;
  }
  get onKey() {
    return this._core.onKey;
  }
  get onLineFeed() {
    return this._core.onLineFeed;
  }
  get onRender() {
    return this._core.onRender;
  }
  get onResize() {
    return this._core.onResize;
  }
  get onScroll() {
    return this._core.onScroll;
  }
  get onSelectionChange() {
    return this._core.onSelectionChange;
  }
  get onTitleChange() {
    return this._core.onTitleChange;
  }
  get onWriteParsed() {
    return this._core.onWriteParsed;
  }
  get element() {
    return this._core.element;
  }
  get parser() {
    return this._parser || (this._parser = new Rn(this._core)), this._parser;
  }
  get unicode() {
    return this._checkProposedApi(), new Ln(this._core);
  }
  get textarea() {
    return this._core.textarea;
  }
  get rows() {
    return this._core.rows;
  }
  get cols() {
    return this._core.cols;
  }
  get buffer() {
    return this._buffer || (this._buffer = this._register(new Dn(this._core))), this._buffer;
  }
  get markers() {
    return this._checkProposedApi(), this._core.markers;
  }
  get modes() {
    let t = this._core.coreService.decPrivateModes, e = "none";
    switch (this._core.coreMouseService.activeProtocol) {
      case "X10":
        e = "x10";
        break;
      case "VT200":
        e = "vt200";
        break;
      case "DRAG":
        e = "drag";
        break;
      case "ANY":
        e = "any";
        break;
    }
    return { applicationCursorKeysMode: t.applicationCursorKeys, applicationKeypadMode: t.applicationKeypad, bracketedPasteMode: t.bracketedPasteMode, insertMode: this._core.coreService.modes.insertMode, mouseTrackingMode: e, originMode: t.origin, reverseWraparoundMode: t.reverseWraparound, sendFocusMode: t.sendFocus, synchronizedOutputMode: t.synchronizedOutput, wraparoundMode: t.wraparound };
  }
  get options() {
    return this._publicOptions;
  }
  set options(t) {
    for (let e in t)
      this._publicOptions[e] = t[e];
  }
  blur() {
    this._core.blur();
  }
  focus() {
    this._core.focus();
  }
  input(t, e = true) {
    this._core.input(t, e);
  }
  resize(t, e) {
    this._verifyIntegers(t, e), this._core.resize(t, e);
  }
  open(t) {
    this._core.open(t);
  }
  attachCustomKeyEventHandler(t) {
    this._core.attachCustomKeyEventHandler(t);
  }
  attachCustomWheelEventHandler(t) {
    this._core.attachCustomWheelEventHandler(t);
  }
  registerLinkProvider(t) {
    return this._core.registerLinkProvider(t);
  }
  registerCharacterJoiner(t) {
    return this._checkProposedApi(), this._core.registerCharacterJoiner(t);
  }
  deregisterCharacterJoiner(t) {
    this._checkProposedApi(), this._core.deregisterCharacterJoiner(t);
  }
  registerMarker(t = 0) {
    return this._verifyIntegers(t), this._core.registerMarker(t);
  }
  registerDecoration(t) {
    return this._checkProposedApi(), this._verifyPositiveIntegers(t.x ?? 0, t.width ?? 0, t.height ?? 0), this._core.registerDecoration(t);
  }
  hasSelection() {
    return this._core.hasSelection();
  }
  select(t, e, i) {
    this._verifyIntegers(t, e, i), this._core.select(t, e, i);
  }
  getSelection() {
    return this._core.getSelection();
  }
  getSelectionPosition() {
    return this._core.getSelectionPosition();
  }
  clearSelection() {
    this._core.clearSelection();
  }
  selectAll() {
    this._core.selectAll();
  }
  selectLines(t, e) {
    this._verifyIntegers(t, e), this._core.selectLines(t, e);
  }
  dispose() {
    super.dispose();
  }
  scrollLines(t) {
    this._verifyIntegers(t), this._core.scrollLines(t);
  }
  scrollPages(t) {
    this._verifyIntegers(t), this._core.scrollPages(t);
  }
  scrollToTop() {
    this._core.scrollToTop();
  }
  scrollToBottom() {
    this._core.scrollToBottom();
  }
  scrollToLine(t) {
    this._verifyIntegers(t), this._core.scrollToLine(t);
  }
  clear() {
    this._core.clear();
  }
  write(t, e) {
    this._core.write(t, e);
  }
  writeln(t, e) {
    this._core.write(t), this._core.write(`\r
`, e);
  }
  paste(t) {
    this._core.paste(t);
  }
  refresh(t, e) {
    this._verifyIntegers(t, e), this._core.refresh(t, e);
  }
  reset() {
    this._core.reset();
  }
  clearTextureAtlas() {
    this._core.clearTextureAtlas();
  }
  loadAddon(t) {
    this._addonManager.loadAddon(this, t);
  }
  static get strings() {
    return { get promptLabel() {
      return mi.get();
    }, set promptLabel(t) {
      mi.set(t);
    }, get tooMuchOutput() {
      return _i.get();
    }, set tooMuchOutput(t) {
      _i.set(t);
    } };
  }
  _verifyIntegers(...t) {
    for (Ue of t)
      if (Ue === 1 / 0 || isNaN(Ue) || Ue % 1 !== 0)
        throw new Error("This API only accepts integers");
  }
  _verifyPositiveIntegers(...t) {
    for (Ue of t)
      if (Ue && (Ue === 1 / 0 || isNaN(Ue) || Ue % 1 !== 0 || Ue < 0))
        throw new Error("This API only accepts positive integers");
  }
};

// src/textual_webterm/static/js/terminal.ts
var import_addon_fit = __toESM(require_addon_fit(), 1);
var import_addon_webgl = __toESM(require_addon_webgl(), 1);
var import_addon_canvas = __toESM(require_addon_canvas(), 1);
var import_addon_unicode11 = __toESM(require_addon_unicode11(), 1);
var import_addon_web_links = __toESM(require_addon_web_links(), 1);

// node_modules/@xterm/addon-clipboard/lib/addon-clipboard.mjs
var U2 = "3.7.8";
var $2 = U2;
var f = typeof Buffer == "function";
var _ = typeof TextDecoder == "function" ? new TextDecoder : undefined;
var C2 = typeof TextEncoder == "function" ? new TextEncoder : undefined;
var N = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var c = Array.prototype.slice.call(N);
var d = ((e) => {
  let t = {};
  return e.forEach((r, o) => t[r] = o), t;
})(c);
var k = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
var n = String.fromCharCode.bind(String);
var B2 = typeof Uint8Array.from == "function" ? Uint8Array.from.bind(Uint8Array) : (e) => new Uint8Array(Array.prototype.slice.call(e, 0));
var S2 = (e) => e.replace(/=/g, "").replace(/[+\/]/g, (t) => t == "+" ? "-" : "_");
var I = (e) => e.replace(/[^A-Za-z0-9\+\/]/g, "");
var F2 = (e) => {
  let t, r, o, i, s15 = "", l = e.length % 3;
  for (let a = 0;a < e.length; ) {
    if ((r = e.charCodeAt(a++)) > 255 || (o = e.charCodeAt(a++)) > 255 || (i = e.charCodeAt(a++)) > 255)
      throw new TypeError("invalid character found");
    t = r << 16 | o << 8 | i, s15 += c[t >> 18 & 63] + c[t >> 12 & 63] + c[t >> 6 & 63] + c[t & 63];
  }
  return l ? s15.slice(0, l - 3) + "===".substring(l) : s15;
};
var m = typeof btoa == "function" ? (e) => btoa(e) : f ? (e) => Buffer.from(e, "binary").toString("base64") : F2;
var b2 = f ? (e) => Buffer.from(e).toString("base64") : (e) => {
  let r = [];
  for (let o = 0, i = e.length;o < i; o += 4096)
    r.push(n.apply(null, e.subarray(o, o + 4096)));
  return m(r.join(""));
};
var x = (e, t = false) => t ? S2(b2(e)) : b2(e);
var H2 = (e) => {
  if (e.length < 2) {
    var t = e.charCodeAt(0);
    return t < 128 ? e : t < 2048 ? n(192 | t >>> 6) + n(128 | t & 63) : n(224 | t >>> 12 & 15) + n(128 | t >>> 6 & 63) + n(128 | t & 63);
  } else {
    var t = 65536 + (e.charCodeAt(0) - 55296) * 1024 + (e.charCodeAt(1) - 56320);
    return n(240 | t >>> 18 & 7) + n(128 | t >>> 12 & 63) + n(128 | t >>> 6 & 63) + n(128 | t & 63);
  }
};
var J2 = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
var P = (e) => e.replace(J2, H2);
var T = f ? (e) => Buffer.from(e, "utf8").toString("base64") : C2 ? (e) => b2(C2.encode(e)) : (e) => m(P(e));
var p = (e, t = false) => t ? S2(T(e)) : T(e);
var v2 = (e) => p(e, true);
var q2 = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
var G2 = (e) => {
  switch (e.length) {
    case 4:
      var t = (7 & e.charCodeAt(0)) << 18 | (63 & e.charCodeAt(1)) << 12 | (63 & e.charCodeAt(2)) << 6 | 63 & e.charCodeAt(3), r = t - 65536;
      return n((r >>> 10) + 55296) + n((r & 1023) + 56320);
    case 3:
      return n((15 & e.charCodeAt(0)) << 12 | (63 & e.charCodeAt(1)) << 6 | 63 & e.charCodeAt(2));
    default:
      return n((31 & e.charCodeAt(0)) << 6 | 63 & e.charCodeAt(1));
  }
};
var D2 = (e) => e.replace(q2, G2);
var w = (e) => {
  if (e = e.replace(/\s+/g, ""), !k.test(e))
    throw new TypeError("malformed base64.");
  e += "==".slice(2 - (e.length & 3));
  let t, r, o, i = [];
  for (let s15 = 0;s15 < e.length; )
    t = d[e.charAt(s15++)] << 18 | d[e.charAt(s15++)] << 12 | (r = d[e.charAt(s15++)]) << 6 | (o = d[e.charAt(s15++)]), r === 64 ? i.push(n(t >> 16 & 255)) : o === 64 ? i.push(n(t >> 16 & 255, t >> 8 & 255)) : i.push(n(t >> 16 & 255, t >> 8 & 255, t & 255));
  return i.join("");
};
var y = typeof atob == "function" ? (e) => atob(I(e)) : f ? (e) => Buffer.from(e, "base64").toString("binary") : w;
var R = f ? (e) => B2(Buffer.from(e, "base64")) : (e) => B2(y(e).split("").map((t) => t.charCodeAt(0)));
var E = (e) => R(O(e));
var K2 = f ? (e) => Buffer.from(e, "base64").toString("utf8") : _ ? (e) => _.decode(R(e)) : (e) => D2(y(e));
var O = (e) => I(e.replace(/[-_]/g, (t) => t == "-" ? "+" : "/"));
var h = (e) => K2(O(e));
var M2 = (e) => {
  if (typeof e != "string")
    return false;
  let t = e.replace(/\s+/g, "").replace(/={0,2}$/, "");
  return !/[^\s0-9a-zA-Z\+/]/.test(t) || !/[^\s0-9a-zA-Z\-_]/.test(t);
};
var z2 = (e) => ({ value: e, enumerable: false, writable: true, configurable: true });
var Z = function() {
  let e = (t, r) => Object.defineProperty(String.prototype, t, z2(r));
  e("fromBase64", function() {
    return h(this);
  }), e("toBase64", function(t) {
    return p(this, t);
  }), e("toBase64URI", function() {
    return p(this, true);
  }), e("toBase64URL", function() {
    return p(this, true);
  }), e("toUint8Array", function() {
    return E(this);
  });
};
var V = function() {
  let e = (t, r) => Object.defineProperty(Uint8Array.prototype, t, z2(r));
  e("toBase64", function(t) {
    return x(this, t);
  }), e("toBase64URI", function() {
    return x(this, true);
  }), e("toBase64URL", function() {
    return x(this, true);
  });
};
var Q3 = () => {
  Z(), V();
};
var u = { version: U2, VERSION: $2, atob: y, atobPolyfill: w, btoa: m, btoaPolyfill: F2, fromBase64: h, toBase64: p, encode: p, encodeURI: v2, encodeURL: v2, utob: P, btou: D2, decode: h, isValid: M2, fromUint8Array: x, toUint8Array: E, extendString: Z, extendUint8Array: V, extendBuiltins: Q3 };
var j2 = class {
  constructor(t = new A, r = new g) {
    this._base64 = t;
    this._provider = r;
  }
  activate(t) {
    this._terminal = t, this._disposable = t.parser.registerOscHandler(52, (r) => this._setOrReportClipboard(r));
  }
  dispose() {
    return this._disposable?.dispose();
  }
  _readText(t, r) {
    let o = this._base64.encodeText(r);
    this._terminal?.input(`\x1B]52;${t};${o}\x07`, false);
  }
  _setOrReportClipboard(t) {
    let r = t.split(";");
    if (r.length < 2)
      return true;
    let o = r[0], i = r[1];
    if (i === "?") {
      let a = this._provider.readText(o);
      return a instanceof Promise ? a.then((L2) => (this._readText(o, L2), true)) : (this._readText(o, a), true);
    }
    let s15 = "";
    try {
      s15 = this._base64.decodeText(i);
    } catch {}
    let l = this._provider.writeText(o, s15);
    return l instanceof Promise ? l.then(() => true) : true;
  }
};
var g = class {
  async readText(t) {
    return t !== "c" ? Promise.resolve("") : navigator.clipboard.readText();
  }
  async writeText(t, r) {
    return t !== "c" ? Promise.resolve() : navigator.clipboard.writeText(r);
  }
};
var A = class {
  encodeText(t) {
    return u.encode(t);
  }
  decodeText(t) {
    let r = u.decode(t);
    return !u.isValid(t) || u.encode(r) !== t ? "" : r;
  }
};

// src/textual_webterm/static/js/terminal.ts
var DEFAULT_FONT_FAMILY = 'ui-monospace, "SFMono-Regular", "FiraCode Nerd Font", "FiraMono Nerd Font", ' + '"Fira Code", "Roboto Mono", Menlo, Monaco, Consolas, "Liberation Mono", ' + '"DejaVu Sans Mono", "Courier New", monospace';
function parseConfig(element) {
  const config = {};
  if (element.dataset.fontFamily) {
    config.fontFamily = element.dataset.fontFamily;
  }
  if (element.dataset.fontSize) {
    config.fontSize = parseInt(element.dataset.fontSize, 10);
  }
  if (element.dataset.scrollback) {
    config.scrollback = parseInt(element.dataset.scrollback, 10);
  }
  return config;
}

class WebTerminal {
  terminal;
  socket = null;
  fitAddon;
  element;
  wsUrl;
  resizeObserver = null;
  resizeRaf = 0;
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  reconnectDelay = 1000;
  resizeState = {
    isResizing: false,
    lastValidSize: null,
    pendingResize: null,
    resizeAttempts: 0
  };
  messageQueue = null;
  minResizeInterval = 50;
  lastResizeTime = 0;
  constructor(container, wsUrl, config = {}) {
    this.element = container;
    this.wsUrl = wsUrl;
    const options = {
      allowProposedApi: true,
      fontFamily: config.fontFamily ?? DEFAULT_FONT_FAMILY,
      fontSize: config.fontSize ?? 16,
      scrollback: config.scrollback ?? 1000,
      cursorBlink: true,
      cursorStyle: "block",
      theme: config.theme
    };
    this.terminal = new Dl(options);
    this.fitAddon = new import_addon_fit.FitAddon;
    this.terminal.loadAddon(this.fitAddon);
    try {
      const webglAddon = new import_addon_webgl.WebglAddon;
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
        this.terminal.loadAddon(new import_addon_canvas.CanvasAddon);
      });
      this.terminal.loadAddon(webglAddon);
    } catch {
      this.terminal.loadAddon(new import_addon_canvas.CanvasAddon);
    }
    const unicode11 = new import_addon_unicode11.Unicode11Addon;
    this.terminal.loadAddon(unicode11);
    this.terminal.unicode.activeVersion = "11";
    this.terminal.loadAddon(new import_addon_web_links.WebLinksAddon);
    this.terminal.loadAddon(new j2);
    this.terminal.open(container);
    this.terminal.onData((data) => {
      this.send(["stdin", data]);
    });
    this.terminal.onResize(({ cols, rows }) => {
      if (this.isValidSize(cols, rows)) {
        this.resizeState.lastValidSize = { cols, rows };
        this.send(["resize", { width: cols, height: rows }]);
      } else {
        console.warn(`Invalid resize dimensions: ${cols}x${rows}`);
        if (this.resizeState.lastValidSize) {
          this.terminal.resize(this.resizeState.lastValidSize.cols, this.resizeState.lastValidSize.rows);
        }
      }
    });
    this.ensureInitialFit();
    this.scheduleFit();
    const throttledWindowResize = this.createThrottledHandler(() => this.scheduleFit(), 100);
    window.addEventListener("resize", throttledWindowResize);
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.scheduleFit();
      });
      this.resizeObserver.observe(container);
      let parent = container.parentElement;
      while (parent && parent !== document.body && parent !== document.documentElement) {
        this.resizeObserver.observe(parent);
        parent = parent.parentElement;
      }
    }
    this.connect();
  }
  ensureInitialFit() {
    if (!("fonts" in document)) {
      return;
    }
    document.fonts.ready.then(() => this.scheduleFit()).catch(() => {});
  }
  fit() {
    const now = Date.now();
    if (now - this.lastResizeTime < this.minResizeInterval) {
      return;
    }
    if (this.resizeState.isResizing) {
      return;
    }
    if (!this.isTerminalReady()) {
      console.debug("Terminal not ready for fit operation, skipping");
      return;
    }
    try {
      this.resizeState.isResizing = true;
      this.resizeState.resizeAttempts++;
      this.lastResizeTime = now;
      if (this.fitAddon && typeof this.fitAddon.fit === "function") {
        this.fitAddon.fit();
        this.resizeState.resizeAttempts = 0;
      } else {
        throw new Error("FitAddon not properly initialized");
      }
    } catch (e) {
      console.warn("Fit failed:", e);
      this.handleResizeFailure();
    } finally {
      this.resizeState.isResizing = false;
    }
  }
  handleResizeFailure() {
    if (this.resizeState.resizeAttempts > 3) {
      if (this.resizeState.lastValidSize) {
        console.warn("Restoring last valid terminal size:", this.resizeState.lastValidSize);
        this.terminal.resize(this.resizeState.lastValidSize.cols, this.resizeState.lastValidSize.rows);
      } else {
        const fallback = { cols: 80, rows: 24 };
        console.warn("Using fallback terminal dimensions:", fallback);
        this.terminal.resize(fallback.cols, fallback.rows);
        this.resizeState.lastValidSize = fallback;
      }
      this.resizeState.resizeAttempts = 0;
    }
  }
  isTerminalReady() {
    try {
      if (!this.terminal) {
        return false;
      }
      if (!this.terminal._core) {
        return false;
      }
      const core = this.terminal._core;
      if (!core.viewport) {
        return false;
      }
      if (core.viewport.scrollBarWidth === undefined) {
        return false;
      }
      if (!core._renderService) {
        return false;
      }
      const renderService = core._renderService;
      if (!renderService.dimensions) {
        return false;
      }
      const dims = renderService.dimensions;
      if (dims.css.cell.width === 0 || dims.css.cell.height === 0) {
        return false;
      }
      if (this.fitAddon) {
        try {
          const fitTerminal = this.fitAddon._terminal;
          if (!fitTerminal || fitTerminal !== this.terminal) {
            return false;
          }
        } catch (e) {
          return false;
        }
      }
      return true;
    } catch (e) {
      console.warn("Terminal readiness check failed:", e);
      return false;
    }
  }
  isValidSize(cols, rows) {
    return cols >= 10 && cols <= 500 && rows >= 5 && rows <= 200;
  }
  scheduleFit() {
    if (this.resizeRaf) {
      window.cancelAnimationFrame(this.resizeRaf);
    }
    this.resizeRaf = window.requestAnimationFrame(() => {
      this.resizeRaf = 0;
      this.fit();
    });
  }
  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }
    this.socket = new WebSocket(this.wsUrl);
    this.socket.binaryType = "arraybuffer";
    this.socket.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.element.classList.add("-connected");
      this.element.classList.remove("-disconnected");
      this.processMessageQueue();
      const init = () => {
        const fallback = { cols: 132, rows: 45 };
        const maxAttempts = 120;
        const attemptFitAndResize = (attempt) => {
          const dims = (() => {
            try {
              return this.fitAddon.proposeDimensions();
            } catch (e) {
              console.warn("proposeDimensions failed:", e);
              return;
            }
          })();
          if (!dims) {
            if (attempt < maxAttempts) {
              window.requestAnimationFrame(() => attemptFitAndResize(attempt + 1));
              return;
            }
            this.terminal.resize(fallback.cols, fallback.rows);
            this.resizeState.lastValidSize = fallback;
            this.send(["resize", { width: fallback.cols, height: fallback.rows }]);
            return;
          }
          if (dims && this.isValidSize(dims.cols, dims.rows) && this.isTerminalReady()) {
            this.terminal.resize(dims.cols, dims.rows);
            this.resizeState.lastValidSize = dims;
            this.send(["resize", { width: dims.cols, height: dims.rows }]);
          } else {
            const reason = !dims ? "proposeDimensions failed" : !this.isValidSize(dims.cols, dims.rows) ? `invalid dimensions: ${dims.cols}x${dims.rows}` : "terminal not ready";
            console.warn(`Initial fit ${reason}, using fallback`);
            this.terminal.resize(fallback.cols, fallback.rows);
            this.resizeState.lastValidSize = fallback;
            this.send(["resize", { width: fallback.cols, height: fallback.rows }]);
          }
        };
        window.requestAnimationFrame(() => attemptFitAndResize(0));
      };
      if ("fonts" in document) {
        document.fonts.ready.then(init).catch(init);
      } else {
        init();
      }
      this.terminal.focus();
    });
    this.socket.addEventListener("close", () => {
      this.element.classList.remove("-connected");
      this.element.classList.add("-disconnected");
      this.scheduleReconnect();
    });
    this.socket.addEventListener("error", () => {});
    this.socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });
  }
  handleMessage(data) {
    if (data instanceof ArrayBuffer) {
      const text = new TextDecoder().decode(data);
      this.terminal.write(text);
      return;
    }
    try {
      const envelope = JSON.parse(data);
      const [type, payload] = envelope;
      switch (type) {
        case "stdout":
          this.terminal.write(payload);
          break;
        case "pong":
          break;
        default:
          console.debug("Unknown message type:", type);
      }
    } catch {
      this.terminal.write(data);
    }
  }
  send(message) {
    if (!this.messageQueue) {
      this.messageQueue = [];
    }
    this.messageQueue.push(message);
    this.processMessageQueue();
  }
  processMessageQueue() {
    if (this.socket?.readyState !== WebSocket.OPEN || !this.messageQueue) {
      return;
    }
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        if (message) {
          this.socket.send(JSON.stringify(message));
          if (message[0] === "resize") {
            this.resizeState.pendingResize = null;
          }
        }
      } catch (e) {
        console.error("Failed to send message:", e, message);
        if (message) {
          this.messageQueue.unshift(message);
        }
        break;
      }
    }
  }
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    setTimeout(() => {
      console.log(`Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }
  createThrottledHandler(func, wait) {
    let lastCall = 0;
    let timeoutId = null;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= wait) {
        lastCall = now;
        func.apply(this, args);
      } else if (!timeoutId) {
        timeoutId = window.setTimeout(() => {
          timeoutId = null;
          lastCall = Date.now();
          func.apply(this, args);
        }, wait);
      }
    }.bind(this);
  }
  dispose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.resizeRaf) {
      window.cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = 0;
    }
    this.socket?.close();
    this.terminal.dispose();
  }
}
var instances = new Map;
function initTerminals() {
  document.querySelectorAll(".textual-terminal").forEach((el2) => {
    const wsUrl = el2.dataset.sessionWebsocketUrl;
    if (!wsUrl) {
      console.error("Missing data-session-websocket-url on terminal container");
      return;
    }
    const config = parseConfig(el2);
    const terminal = new WebTerminal(el2, wsUrl, config);
    instances.set(el2, terminal);
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTerminals);
} else {
  initTerminals();
}
export {
  instances,
  initTerminals,
  WebTerminal
};
