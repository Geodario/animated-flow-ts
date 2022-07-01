import Extent from "esri/geometry/Extent";
import Point from "esri/geometry/Point";
import FeatureLayer from "esri/layers/FeatureLayer";
import { mat4 } from "gl-matrix";
import { VisualizationStyle } from "../../core/rendering";
import { Pixels, Resources, VisualizationRenderParams } from "../../core/types";

export class GlobalResources implements Resources {
  program: WebGLProgram | null = null;
  uniforms: HashMap<WebGLUniformLocation> = {};
  private _img: HTMLImageElement | null = null;
  texture: WebGLTexture | null = null;

  constructor(img: HTMLImageElement) {
    this._img = img;
  }

  attach(gl: WebGLRenderingContext): void {
    // Compile the shaders.
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(
      vertexShader,
      `
      attribute vec2 a_Position;
      attribute vec2 a_Offset;
      uniform mat4 u_ScreenFromLocal;
      uniform mat4 u_ClipFromScreen;
      uniform float u_Time;
      uniform float u_Frequency;
      uniform float u_MinSize;
      uniform float u_MaxSize;
      varying vec2 v_Texcoord;
      void main(void) {
        vec2 pos = a_Position;
        vec4 anchor = u_ScreenFromLocal * vec4(pos, 0.0, 1.0);
        float size = mix(u_MinSize, u_MaxSize, 0.5 + 0.5 * sin(2.0 * 3.1415 * u_Frequency * u_Time));
        vec4 screen = anchor + vec4(a_Offset * size, 0.0, 0.0);
        vec4 clip = u_ClipFromScreen * screen;
        gl_Position = clip;
        v_Texcoord = a_Offset + 0.5;
      }`
    );
    gl.compileShader(vertexShader);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(
      fragmentShader,
      `
      precision mediump float;
      varying vec2 v_Texcoord;
      uniform sampler2D u_Texture;
      void main(void) {
        gl_FragColor = texture2D(u_Texture, v_Texcoord);
      }`
    );
    gl.compileShader(fragmentShader);

    // Link the program.
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, 0, "a_Position");
    gl.bindAttribLocation(program, 1, "a_Offset");
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    this.uniforms["u_ScreenFromLocal"] = gl.getUniformLocation(program, "u_ScreenFromLocal")!;
    this.uniforms["u_ClipFromScreen"] = gl.getUniformLocation(program, "u_ClipFromScreen")!;
    this.uniforms["u_Time"] = gl.getUniformLocation(program, "u_Time")!;
    this.uniforms["u_Frequency"] = gl.getUniformLocation(program, "u_Frequency")!;
    this.uniforms["u_MinSize"] = gl.getUniformLocation(program, "u_MinSize")!;
    this.uniforms["u_MaxSize"] = gl.getUniformLocation(program, "u_MaxSize")!;
    this.program = program;

    // Create the texture.
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._img!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.texture = texture;
    this._img = null;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteProgram(this.program);
  }
}

export class LocalResources implements Resources {
  vertexData: Float32Array | null;
  indexData: Uint32Array | null;
  indexCount = 0;
  vertexBuffer: WebGLBuffer | null = null;
  indexBuffer: WebGLBuffer | null = null;
  u_ScreenFromLocal = mat4.create();
  u_ClipFromScreen = mat4.create();

  constructor(vertexData: Float32Array, indexData: Uint32Array) {
    this.vertexData = vertexData;
    this.indexData = indexData;
    this.indexCount = indexData.length;
  }

  attach(gl: WebGLRenderingContext): void {
    // Upload the markers mesh data to the GPU.
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;

    // Make sure that the CPU data is garbage collected.
    this.vertexData = null;
    this.indexData = null;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
  }
}

export class ShimmerVisualizationStyle extends VisualizationStyle<GlobalResources, LocalResources> {
  private _featureLayer: FeatureLayer;

  constructor(url: string) {
    super();

    this._featureLayer = new FeatureLayer({ url });
  }

  override loadGlobalResources(): Promise<GlobalResources> {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAALpJREFUOE9jZKAQMKLorzrznyjz2kzg+hAGEKsZZgPUEFQD2kwQDoiZieqYJekIftUZBgZcBvz//5+BkZGRgQFkgKA4RNP7lwwMS9IZ4HL4DIBbg8UAuBxOAx6dhaiB2czDD+F/+YhwCYglZ4zDC8gGwDTDrAUZAvIKUQYQikucLkCOBXyGEIoFfHrBMUQ7A0BWt5mA4xsbgNsOUQdOhNjzAq6wADkdSTOmASARQnkCKSNhN4BQFKLJAwCNbWERHeySMQAAAABJRU5ErkJggg==";
      img.addEventListener("load", () => {
        resolve(new GlobalResources(img));
      });
    });
  }

  override async loadLocalResources(
    extent: Extent,
    size: [Pixels, Pixels],
    _pixelRatio: number,
    signal: AbortSignal
  ): Promise<LocalResources> {
    await this._featureLayer.load(signal);

    const query = this._featureLayer.createQuery();
    query.geometry = extent;
    const featureSet = await this._featureLayer.queryFeatures(query, { signal });
    const vertexData: number[] = [];
    const indexData: number[] = [];
    let count = 0;

    for (const feature of featureSet.features) {
      const point = feature.geometry as Point;
      const x = (size[0] * (point.x - extent.xmin)) / (extent.xmax - extent.xmin);
      const y = size[1] * (1 - (point.y - extent.ymin) / (extent.ymax - extent.ymin));
      vertexData.push(
        x,
        y,
        -0.5,
        -0.5,
        x,
        y,
        0.5,
        -0.5,
        x,
        y,
        -0.5,
        0.5,
        x,
        y,
        0.5,
        0.5,
      );
      indexData.push(count * 4 + 0, count * 4 + 1, count * 4 + 2, count * 4 + 1, count * 4 + 3, count * 4 + 2);
      count++;
    }

    return new LocalResources(new Float32Array(vertexData), new Uint32Array(indexData));
  }

  override renderVisualization(
    gl: WebGLRenderingContext,
    renderParams: VisualizationRenderParams,
    globalResources: GlobalResources,
    localResources: LocalResources
  ): void {
    // Compute the `u_ScreenFromLocal` matrix. This matrix converts from local
    // pixel-like coordinates to actual screen positions. It scales, rotates and
    // translates by the amounts dictated by the render parameters.
    mat4.identity(localResources.u_ScreenFromLocal);
    mat4.translate(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [
      renderParams.translation[0],
      renderParams.translation[1],
      0
    ]);
    mat4.rotateZ(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, renderParams.rotation);
    mat4.scale(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [
      renderParams.scale,
      renderParams.scale,
      1
    ]);

    // Compute the `u_ClipFromScreen` matrix. This matrix converts from screen
    // coordinates in pixels to clip coordinates in the range [-1, +1].
    mat4.identity(localResources.u_ClipFromScreen);
    mat4.translate(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [-1, 1, 0]);
    mat4.scale(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [
      2 / renderParams.size[0],
      -2 / renderParams.size[1],
      1
    ]);

    // Bind the shader program and updates the uniforms.
    gl.useProgram(globalResources.program);
    gl.uniformMatrix4fv(globalResources.uniforms["u_ScreenFromLocal"]!, false, localResources.u_ScreenFromLocal);
    gl.uniformMatrix4fv(globalResources.uniforms["u_ClipFromScreen"]!, false, localResources.u_ClipFromScreen);
    gl.uniform1f(globalResources.uniforms["u_Time"]!, performance.now() / 1000);
    gl.uniform1f(globalResources.uniforms["u_Frequency"]!, 3);
    gl.uniform1f(globalResources.uniforms["u_MinSize"]!, 30 * renderParams.pixelRatio);
    gl.uniform1f(globalResources.uniforms["u_MaxSize"]!, 40 * renderParams.pixelRatio);

    // Enable additive blending.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Bind the markers mesh.
    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, localResources.indexBuffer);

    // Bind the texture.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, globalResources.texture);
    gl.uniform1i(globalResources.uniforms["u_Texture"]!, 0);

    // Draw the markers.
    gl.drawElements(gl.TRIANGLES, localResources.indexCount, gl.UNSIGNED_INT, 0);
  }
}
