
export type Vector3Tuple = [number, number, number];

export interface Asset {
  id: string;
  name: string;
  type: 'model' | 'text' | 'shape' | 'player_start';
  content?: string; // For text type
  geometryType?: 'box' | 'sphere' | 'cone' | 'torus'; // For shape type
  color: string;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
  url?: string;
  visible?: boolean;
}

export interface Step {
  id: string;
  title: string;
  instruction: string;
  cameraPosition: Vector3Tuple;
  targetAction: 'click' | 'move' | 'none';
  targetAssetId?: string;
  targetPosition?: Vector3Tuple; 
  snapAnchorId?: string; // The ID of the object to snap to
}

export interface ProjectData {
  projectName: string;
  assets: Asset[];
  steps: Step[];
}

export enum AppMode {
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER'
}
