'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { getSocket, initSocket } from '@/lib/socket';
import { DesignElement, Tool, Operation, Action, Point } from '@/lib/model';
import { UndoManager } from '@/lib/undoRedo';
import Toolbar from './Toolbar';
import SvgCanvas from './SvgCanvas';
import PropertiesPanel from './PropertiesPanel';
import LayerPanel from './LayerPanel';
import Minimap from './Minimap';
import { ThemeToggle } from './ThemeToggle';

interface EditorProps {
  docId: string;
}

export const Editor: React.FC<EditorProps> = ({ docId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [elements, setElements] = useState<{ [id: string]: DesignElement }>({});
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [presences, setPresences] = useState<{ [userId: string]: { cursor: Point } }>({});

  // FIX: Explicitly initialize useRef with null for better type safety.
  const undoManager = useRef<UndoManager | null>(null);

  const emitOp = useCallback((op: Partial<Operation>) => {
    if (!socket || !userId) return;
    const fullOp: Operation = {
      ...op,
      opId: op.opId || uuidv4(),
      userId: op.userId || userId,
      docId,
      timestamp: op.timestamp || Date.now(),
    } as Operation;
    socket.emit('op', fullOp);
  }, [socket, userId, docId]);

  const localStateApplier = useCallback((op: Operation) => {
    setElements(prevElements => {
        const newElements = { ...prevElements };
        switch(op.action) {
            case 'create':
                newElements[op.payload.element.id] = op.payload.element;
                break;
            case 'update':
                if (newElements[op.elementId!]) {
                    newElements[op.elementId!] = { ...newElements[op.elementId!], ...op.payload };
                }
                break;
            case 'delete':
                delete newElements[op.elementId!];
                break;
        }
        return newElements;
    });
  }, []);

  const getCurrentState = useCallback((elementId: string): DesignElement | undefined => {
     return elements[elementId];
  }, [elements]);


  useEffect(() => {
    const socketInstance = initSocket();
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setUserId(socketInstance.id);
      socketInstance.emit('join-doc', docId);
    });

    socketInstance.on('doc-state', (initialElements: { [id: string]: DesignElement }) => {
      setElements(initialElements);
    });

    socketInstance.on('op', (op: Operation) => {
      const { action, userId: opUserId, elementId, payload } = op;

      // Handle presence updates from others
      if (action === 'presence' && opUserId !== socketInstance.id) {
          setPresences(prev => ({
              ...prev,
              [opUserId]: payload,
          }));
          return; // Presence ops are handled, no further processing needed
      }

      // Always apply server-authoritative state changes like locks
      if (action === 'lock' || action === 'unlock') {
          setElements(prevElements => {
              const newElements = { ...prevElements };
              if (newElements[elementId!]) {
                  newElements[elementId!].lockedBy = action === 'lock' ? op.userId : undefined;
              }
              return newElements;
          });
      }

      // For CUD ops, only apply if from another user (to avoid overwriting optimistic updates)
      if (opUserId !== socketInstance.id) {
          setElements(prevElements => {
              const newElements = { ...prevElements };
              switch (action) {
                  case 'create':
                      newElements[elementId!] = payload.element;
                      break;
                  case 'update':
                      if (newElements[elementId!]) {
                          newElements[elementId!] = { ...newElements[elementId!], ...payload };
                      }
                      break;
                  case 'delete':
                      delete newElements[elementId!];
                      break;
              }
              return newElements;
          });
      }
    });

    socketInstance.on('user-left', (disconnectedUserId: string) => {
        setPresences(prev => {
            const newPresences = { ...prev };
            delete newPresences[disconnectedUserId];
            return newPresences;
        });
    });

    undoManager.current = new UndoManager(emitOp, localStateApplier, getCurrentState);

    return () => {
      socketInstance.off('connect');
      socketInstance.off('doc-state');
      socketInstance.off('op');
      socketInstance.off('user-left');
      socketInstance.disconnect();
    };
  }, [docId, localStateApplier, getCurrentState, emitOp]);

  const selectedElements = useMemo(
    () => selectedElementIds.map(id => elements[id]).filter(Boolean),
    [selectedElementIds, elements]
  );
  
  const handleElementChange = (element: DesignElement, recordUndo: boolean = false) => {
      const op: Operation = {
          opId: uuidv4(),
          docId,
          userId,
          action: 'update',
          elementId: element.id,
          payload: { ...element },
          timestamp: Date.now()
      };
      
      setElements(prev => ({...prev, [element.id]: element}));
      
      const updatePayload = { ...element };
      delete (updatePayload as any).id;
      delete (updatePayload as any).type;
      
      emitOp({
          action: 'update',
          elementId: element.id,
          payload: updatePayload
      });
      if(recordUndo && undoManager.current) {
         undoManager.current.record(op);
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoManager.current?.undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        undoManager.current?.redo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
          selectedElementIds.forEach(id => {
              const elementToDelete = elements[id];
              if (elementToDelete) {
                  const deleteOp = {
                      action: 'delete' as Action,
                      elementId: id,
                      payload: { element: elementToDelete } 
                  };
                  emitOp(deleteOp);
                  localStateApplier({ ...deleteOp, opId: '', docId, userId, timestamp: 0 }); 
                  if (undoManager.current) {
                      undoManager.current.record({ ...deleteOp, opId: uuidv4(), docId, userId, timestamp: Date.now() });
                  }
              }
          });
          setSelectedElementIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementIds, elements, docId, userId, emitOp, localStateApplier]);


  return (
    <div className="w-screen h-screen bg-background flex flex-col overflow-hidden">
        <div className="absolute top-2 right-2 z-20">
            <ThemeToggle />
        </div>
      <div className="flex flex-1 relative">
        <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
        <main className="flex-1 bg-muted/40 relative">
          <SvgCanvas
            elements={Object.values(elements)}
            selectedElementIds={selectedElementIds}
            onSelectedElementIdsChange={setSelectedElementIds}
            activeTool={activeTool}
            onElementsChange={setElements}
            emitOp={emitOp}
            userId={userId}
            undoManager={undoManager.current}
            presences={presences}
          />
        </main>
        <div className="w-64 bg-background border-l border-border p-4 flex flex-col gap-4">
          <PropertiesPanel selectedElements={selectedElements} onElementChange={handleElementChange} />
          <LayerPanel elements={Object.values(elements)} selectedElementIds={selectedElementIds} onSelectionChange={setSelectedElementIds} />
        </div>
        <div className="absolute bottom-4 right-72 z-10">
            <Minimap elements={Object.values(elements)} />
        </div>
      </div>
    </div>
  );
};