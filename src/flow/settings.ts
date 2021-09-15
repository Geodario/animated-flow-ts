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
 * @module animated-flow-ts/flow/settings
 * 
 * This module contains parameters used by the `flow` package.
 */

import Color from "esri/Color";
import { Settings } from "../core/settings";
import { Milliseconds } from "../core/types";
import { Cells, PixelsPerCell } from "./types";

export class FlowSettings extends Settings {
  color = new Color([255, 255, 255, 1]);

  // The size of cell in pixels.
  fixedCellSize: PixelsPerCell = 5;

  // The size of the smoothing kernel in cells.
  smoothing: Cells = 3;

  // The length of a streamline segment.
  segmentLength: Cells = 1;

  // Maximum number of vertices in a streamline.
  verticesPerLine = 30;

  // Controls the speed of particles during simulation.
  speedScale = 0.1;

  // How many streamlines per screen.
  linesPerVisualization = 6000;

  // Protection against division-by-zero during smoothing with gaussian kernel.
  minWeightThreshold = 0.001;

  // The generation of the streamlines mesh has a chance of being stopped
  // once in a while; this allows to cancel the process when it is detected
  // that the viewpoint has changed and the mesh is not needed anymore.
  flowProcessingQuanta: Milliseconds = 100;

  // The width of a streamline in pixels.
  lineWidth = 2;

  // The length of a streamline trail expressed in seconds.
  trailDuration: number = 1;

  // The period after which a streamline animation repeats.
  trailPeriod: number = 3;

  // Controls the animation speed of the streamlines trails.
  timeScale = 30;

  // Whether lines that collide should be "merged"; this should be set to
  // `true` to avoid the "ridge" effect, caused by particles that clump
  // together in areas where different currents converge from different
  // directions.
  mergeLines = false;

  interpolate = false;
}