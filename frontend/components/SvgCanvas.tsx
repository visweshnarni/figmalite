
'use client'
import React, { useRef, useState, useEffect, PointerEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DesignElement, Point, Tool, Operation, Action } from '@/lib/model';
import { screenToSvgCoords, fileToBase64 } from '@/lib/utils';
import { UndoManager } from '@/lib/undoRedo';
import {
    RectangleElement,
    EllipseElement,
    LineElement,
    PathElement,
    ImageElement
} from '@/lib/model';

// --- Element Components ---

const ElementRenderer = ({ element }: { element: DesignElement }) => {
    switch(element.type) {
        case 'rectangle': return <rect x={element.x} y={element.y} width={element.width} height={element.height} fill={element.fillColor} stroke={element.strokeColor} strokeWidth={element.strokeWidth} transform={`rotate(${element.rotation} ${element.x + element.width/2} ${element.y + element.height/2})`} />;
        case 'ellipse': return <ellipse cx={element.x + element.width/2} cy={element.y + element.height/2} rx={element.width/2} ry={element.height/2} fill={element.fillColor} stroke={element.strokeColor} strokeWidth={element.strokeWidth} transform={`rotate(${element.rotation} ${element.x + element.width/2} ${element.y + element.height/2})`} />;
        case 'line': return <line x1={element.points[0][0]} y1={element.points[0][1]} x2={element.points[1][0]} y2={element.points[1][1]} stroke={element.strokeColor} strokeWidth={element.strokeWidth} />;
        case 'path': return <path d={element.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')} fill="none" stroke={element.strokeColor} strokeWidth={element.strokeWidth} />;
        case 'image': return <image href={element.src} x={element.x} y={element.y} width={element.width} height={element.height} transform={`rotate(${element.rotation} ${element.x + element.width/2} ${element.y + element.height/2})`} />;
    }
};

// --- Presence Cursor Component ---
const PresenceCursor = ({ id, cursor }: { id: string, cursor: Point }) => (
    <g transform={`translate(${cursor[0]}, ${cursor[1]})`} style={{ pointerEvents: 'none' }}>
        <svg style={{ overflow: 'visible' }} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.23218 3.00002L19.1961 14.2835L14.3129 15.5247L11.5181 21.0825L8.47571 16.4883L5.23218 3.00002Z" fill="#007BFF" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
        <rect x="25" y="0" width={42} height={20} rx="3" fill="hsl(var(--background))" stroke="hsl(var(--border))" />
        <text x="28" y="14" fill="hsl(var(--foreground))" fontSize="12" fontWeight="500">
            {id.substring(0, 4)}
        </text>
    </g>
);


interface SvgCanvasProps {
  elements: DesignElement[];
  selectedElementIds: string[];
  onSelectedElementIdsChange: (ids: string[]) => void;
  activeTool: Tool;
  onElementsChange: (elements: any) => void;
  emitOp: (op: Partial<Operation>) => void;
  userId: string;
  undoManager?: UndoManager;
  presences: { [userId: string]: { cursor: Point } };
}

const SvgCanvas: React.FC<SvgCanvasProps> = ({ elements, selectedElementIds, onSelectedElementIdsChange, activeTool, onElementsChange, emitOp, userId, undoManager, presences }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DesignElement | null>(null);
  const [startPoint, setStartPoint] = useState<Point>([0, 0]);
  const presenceThrottle = useRef<NodeJS.Timeout | null>(null);


  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const svgPoint = screenToSvgCoords(svgRef.current, e.clientX, e.clientY);
    setStartPoint(svgPoint);
    setIsDrawing(true);

    if (activeTool === 'select') {
      onSelectedElementIdsChange([]);
    } else if (activeTool !== 'pan') {
      const id = uuidv4();
      let newElement: DesignElement;
      const commonProps = { id, x: svgPoint[0], y: svgPoint[1], width: 0, height: 0, rotation: 0, strokeColor: '#000000', strokeWidth: 1 };
      switch (activeTool) {
        case 'rectangle':
          newElement = { ...commonProps, type: 'rectangle', fillColor: '#d9d9d9' };
          break;
        case 'ellipse':
          newElement = { ...commonProps, type: 'ellipse', fillColor: '#d9d9d9' };
          break;
        case 'line':
            newElement = { ...commonProps, type: 'line', points: [svgPoint, svgPoint] };
            break;
        case 'path':
            newElement = { ...commonProps, type: 'path', points: [svgPoint] };
            break;
        default: return;
      }
      setCurrentElement(newElement);
    }
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const svgPoint = screenToSvgCoords(svgRef.current, e.clientX, e.clientY);

    // Throttle presence updates to every 50ms
    if (!presenceThrottle.current) {
        emitOp({
            action: 'presence',
            payload: { cursor: svgPoint }
        });
        presenceThrottle.current = setTimeout(() => {
            presenceThrottle.current = null;
        }, 50);
    }
    
    if (!isDrawing || !currentElement) return;
    
    setCurrentElement(prev => {
        if (!prev) return null;
        let updated = { ...prev };
        const width = Math.abs(svgPoint[0] - startPoint[0]);
        const height = Math.abs(svgPoint[1] - startPoint[1]);
        const x = Math.min(svgPoint[0], startPoint[0]);
        const y = Math.min(svgPoint[1], startPoint[1]);

        if (updated.type === 'line') {
            (updated as LineElement).points[1] = svgPoint;
        } else if (updated.type === 'path') {
            (updated as PathElement).points.push(svgPoint);
        } else {
            updated.width = width;
            updated.height = height;
            updated.x = x;
            updated.y = y;
        }
        return updated;
    });
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    if (currentElement && (currentElement.width > 0 || currentElement.height > 0 || currentElement.type === 'path' || currentElement.type === 'line' ) ) {
        const op = {
            action: 'create' as Action,
            elementId: currentElement.id,
            payload: { element: currentElement }
        };
        emitOp(op);
        onElementsChange((prev: any) => ({ ...prev, [currentElement.id]: currentElement }));
        if(undoManager) {
            undoManager.record({ ...op, opId: uuidv4(), docId: '', userId, timestamp: Date.now() });
        }
    }
    setCurrentElement(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && svgRef.current) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        const svgPoint = screenToSvgCoords(svgRef.current, e.clientX, e.clientY);
        const id = uuidv4();
        const newImage: ImageElement = {
            id, type: 'image', x: svgPoint[0], y: svgPoint[1], width: 100, height: 100,
            rotation: 0, strokeColor: 'transparent', strokeWidth: 0, src: base64
        };
        const op = {
            action: 'create' as Action,
            elementId: newImage.id,
            payload: { element: newImage }
        };
        emitOp(op);
        onElementsChange((prev: any) => ({ ...prev, [newImage.id]: newImage }));
      }
      e.dataTransfer.clearData();
    }
  };


  return (
    <svg
      ref={svgRef}
      className="w-full h-full cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <g>
        {elements.map(el => (
          <ElementRenderer key={el.id} element={el} />
        ))}
        {currentElement && <ElementRenderer element={currentElement} />}
      </g>
      <g>
        {Object.entries(presences).map(([id, presence]) => (
            presence.cursor && <PresenceCursor key={id} id={id} cursor={presence.cursor} />
        ))}
      </g>
    </svg>
  );
};

export default SvgCanvas;
