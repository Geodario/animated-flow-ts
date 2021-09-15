/*
  Copyright 2021 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/**
 * @module animated-flow-ts/flow/shared
 *
 * This module contains particle simulation and mesh generation code
 * that can be used both on the worker and the main process.
 */

import { createRand, rest } from "../core/util";
import { FlowSettings } from "./settings";
import { Field, StreamLinesMesh, StreamLineVertex, FlowData, Cells, CellsPerSecond, PixelsPerCell } from "./types";

export class Shared {
  constructor(private settings: FlowSettings) {
  }

  /**
   * Smooths a discretized UV velocity field  with a Gaussain kernel.
   * 
   * @param data The data to smooth as a 2-channel, interleaved, row-major table.
   * @param columns The number of columns.
   * @param rows The number of rows.
   * @param sigma The standard deviation of the smoothing kernel.
   * @returns A smoothed table.
   */
  smooth(data: Float32Array, columns: Cells, rows: Cells): Float32Array {
    const sigma = this.settings.smoothing;
    const horizontal = new Float32Array(data.length);

    const halfRadius = Math.round(3 * sigma);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        let totalWeight = 0;
        let s0 = 0;
        let s1 = 0;

        for (let d = -halfRadius; d <= halfRadius; d++) {
          if (x + d < 0 || x + d >= columns) {
            continue;
          }

          const weight = Math.exp((-d * d) / (sigma * sigma));

          totalWeight += weight;
          s0 += weight * data[2 * (y * columns + (x + d)) + 0]!;
          s1 += weight * data[2 * (y * columns + (x + d)) + 1]!;
        }

        horizontal[2 * (y * columns + x) + 0] = totalWeight < this.settings.minWeightThreshold ? 0 : s0 / totalWeight;
        horizontal[2 * (y * columns + x) + 1] = totalWeight < this.settings.minWeightThreshold ? 0 : s1 / totalWeight;
      }
    }

    const final = new Float32Array(data.length);

    for (let x = 0; x < columns; x++) {
      for (let y = 0; y < rows; y++) {
        let totalWeight = 0;
        let s0 = 0;
        let s1 = 0;

        for (let d = -halfRadius; d <= halfRadius; d++) {
          if (y + d < 0 || y + d >= rows) {
            continue;
          }

          const weight = Math.exp((-d * d) / (sigma * sigma));

          totalWeight += weight;
          s0 += weight * horizontal[2 * ((y + d) * columns + x) + 0]!;
          s1 += weight * horizontal[2 * ((y + d) * columns + x) + 1]!;
        }

        final[2 * (y * columns + x) + 0] = totalWeight < this.settings.minWeightThreshold ? 0 : s0 / totalWeight;
        final[2 * (y * columns + x) + 1] = totalWeight < this.settings.minWeightThreshold ? 0 : s1 / totalWeight;
      }
    }

    return final;
  }

  /**
   * Wrap a tabulated velocity field into a function.
   * 
   * This function simply returns the value of the correct cell,
   * but a better approach would be to use bilinear interpolation. 
   *
   * @param flowData The input velocity field data.
   * @returns A function that maps (x, y) to the correct cell.
   */
  createFlowFieldFromData(flowData: FlowData): Field {
    const data = this.smooth(flowData.data, flowData.columns, flowData.rows);

    const field = (x: Cells, y: Cells): [CellsPerSecond, CellsPerSecond] => {
      const X: Cells = Math.round(x);
      let Y: Cells = Math.round(y);

      if (X < 0 || X >= flowData.columns) {
        return [0, 0];
      }

      if (Y < 0 || Y >= flowData.rows) {
        return [0, 0];
      }

      return [data[2 * (Y * flowData.columns + X) + 0]!, data[2 * (Y * flowData.columns + X) + 1]!];
    };

    return field;
  }

  /**
   * Simulates a particle through a velocity field.
   * 
   * @param f The velocity field as a function.
   * @param x0 The starting x coordinate of the particle.
   * @param y0  The starting y coordinate of the particle.
   * @param cellSize The size of a cell in pixels.
   * @returns An array of timestamped vertices.
   */
  trace(f: Field, x0: Cells, y0: Cells, cellSize: PixelsPerCell, lineId: number, collisionField: Int32Array, columns: number, rows: number): StreamLineVertex[] {
    const lineVertices: StreamLineVertex[] = [];

    let x = x0;
    let y = y0;
    let t = 0;
    let opacity = 1;

    if (this.settings.mergeLines) {
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix < 0 || ix > columns - 1 || iy < 0 || iy > rows - 1) {
        opacity = 0;
      } else {
        const c = collisionField[iy * columns + ix];
        if (c !== -1 && c !== lineId) {
          opacity = 0;
        } else {
          collisionField[iy * columns + ix] = lineId;
        }
      }
    }

    lineVertices.push({
      position: [x * cellSize, y * cellSize],
      time: t,
      opacity
    });

    for (let i = 0; i < this.settings.verticesPerLine; i++) {
      let [vx, vy] = f(x, y);
      vx *= this.settings.speedScale;
      vy *= this.settings.speedScale;
      const v = Math.sqrt(vx * vx + vy * vy);
      const dx = vx / v;
      const dy = vy / v;
      x += dx * this.settings.segmentLength;
      y += dy * this.settings.segmentLength;
      const dt = this.settings.segmentLength / v;
      t += dt;

      if (this.settings.mergeLines) {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix < 0 || ix > columns - 1 || iy < 0 || iy > rows - 1) {
          opacity = 0;
        } else {
          const c = collisionField[iy * columns + ix];
          if (c !== -1 && c !== lineId) {
            opacity = 0;
          } else {
            collisionField[iy * columns + ix] = lineId;
          }
        }
      }

      lineVertices.push({
        position: [x * cellSize, y * cellSize],
        time: t,
        opacity
      });
    }

    return lineVertices;
  }

  /**
   * Creates the stream lines for a velocity field.
   *
   * @param f The velocity field.
   * @param columns The number of columns in the field.
   * @param rows The number of rows in the field.
   * @param cellSize The size of a cell in pixels.
   * @returns An array of lines with timestamped vertices.
   */
  getStreamLines(f: Field, columns: Cells, rows: Cells, cellSize: PixelsPerCell): StreamLineVertex[][] {
    const lines: StreamLineVertex[][] = [];
    
    const rand = createRand();

    const collisionField = new Int32Array(columns * rows);
    for (let i = 0; i < collisionField.length; i++) {
      collisionField[i] = -1;
    }

    for (let i = 0; i < this.settings.linesPerVisualization; i++) {
      const line = this.trace(f, Math.round(rand() * columns), Math.round(rand() * rows), cellSize, i, collisionField, columns, rows);
      lines.push(line);
    }

    return lines;
  }

  /**
   * Create a triangle mesh that encodes the streamlines for a given velocity field.
   * 
   * @param flowData The velocity field.
   * @param signal The abort signal.
   * @returns A promise to a triangle mesh.
   */
  async createStreamLinesMesh(
    flowData: FlowData,
    signal: AbortSignal
  ): Promise<StreamLinesMesh> {
    let vertexCount = 0;
    const vertexData: number[] = [];
    const indexData: number[] = [];

    // It would make sense to also make `createFlowFieldFromData()` and
    // `getStreamLines()` abortable and pass the signal down to them.
    const f = this.createFlowFieldFromData(flowData);
    const streamLines = this.getStreamLines(f, flowData.columns, flowData.rows, flowData.cellSize);
    const rand = createRand();

    let restTime = performance.now();

    for (const line of streamLines) {
      const currentTime = performance.now();

      if (currentTime - restTime > this.settings.flowProcessingQuanta) {
        restTime = currentTime;
        await rest(signal);
      }

      const random = rand();
      const lastVertex = line[line.length - 1]!;
      const totalTime = lastVertex.time;

      for (let i = 1; i < line.length; i++) {
        let {
          position: [x0, y0],
          time: t0,
          opacity: opacity0
        } = line[i - 1]!;
        let {
          position: [x1, y1],
          time: t1,
          opacity: opacity1
        } = line[i]!;

        const l = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
        const ex = -(y1 - y0) / l;
        const ey = (x1 - x0) / l;

        vertexData.push(
          x0,
          y0,
          ex,
          ey,
          -1,
          t0,
          totalTime,
          opacity0,
          random,
          x0,
          y0,
          -ex,
          -ey,
          +1,
          t0,
          totalTime,
          opacity0,
          random,
          x1,
          y1,
          ex,
          ey,
          -1,
          t1,
          totalTime,
          opacity1,
          random,
          x1,
          y1,
          -ex,
          -ey,
          +1,
          t1,
          totalTime,
          opacity1,
          random
        );

        indexData.push(
          vertexCount + 0,
          vertexCount + 1,
          vertexCount + 2,
          vertexCount + 1,
          vertexCount + 3,
          vertexCount + 2
        );

        vertexCount += 4;
      }
    }

    return {
      vertexData: new Float32Array(vertexData),
      indexData: new Uint32Array(indexData)
    };
  }
}
