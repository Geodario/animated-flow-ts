import { subclass } from "esri/core/accessorSupport/decorators";
import Layer from "esri/layers/Layer";
import { Settings } from "./settings";

@subclass("animated-flow-ts.core.layer.LayerView2D")
export abstract class VisualizationLayer extends Layer {
  abstract settings: Settings;
}