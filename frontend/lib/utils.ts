
import { Point } from './model';

/**
 * Converts screen coordinates (e.g., from a mouse event) to SVG coordinates,
 * taking into account the SVG's viewBox, pan, and zoom.
 */
export const screenToSvgCoords = (
  svg: SVGSVGElement,
  screenX: number,
  screenY: number
): Point => {
  const pt = svg.createSVGPoint();
  pt.x = screenX;
  pt.y = screenY;
  const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
  return [svgP.x, svgP.y];
};

/**
 * Calculates the bounding box of an element, considering its rotation.
 */
export const getBoundingBox = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const cx = x + width / 2;
  const cy = y + height / 2;

  const getRotatedPoint = (px: number, py: number): Point => {
    const dx = px - cx;
    const dy = py - cy;
    return [
      cx + dx * cos - dy * sin,
      cy + dx * sin + dy * cos,
    ];
  };

  const p1 = getRotatedPoint(x, y);
  const p2 = getRotatedPoint(x + width, y);
  const p3 = getRotatedPoint(x + width, y + height);
  const p4 = getRotatedPoint(x, y + height);

  const xs = [p1[0], p2[0], p3[0], p4[0]];
  const ys = [p1[1], p2[1], p3[1], p4[1]];

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
