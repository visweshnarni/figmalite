
export type Point = [number, number];

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  strokeColor: string;
  strokeWidth: number;
  lockedBy?: string;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  fillColor: string;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  fillColor: string;
}

export interface LineElement extends BaseElement {
    type: 'line';
    points: [Point, Point];
}

export interface PathElement extends BaseElement {
  type: 'path';
  points: Point[];
}

export interface ImageElement extends BaseElement {
    type: 'image';
    src: string; // data URL
}

export type DesignElement = RectangleElement | EllipseElement | LineElement | PathElement | ImageElement;

export type ElementType = 'rectangle' | 'ellipse' | 'line' | 'path' | 'image';
export type Tool = ElementType | 'select' | 'pan';
export type Action = 'create' | 'update' | 'delete' | 'lock' | 'unlock' | 'presence';

export interface Operation {
  opId: string;
  docId: string;
  userId: string;
  action: Action;
  elementId?: string;
  payload?: any;
  timestamp: number;
  serverTimestamp?: number;
}
