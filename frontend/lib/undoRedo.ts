
import { DesignElement, Operation } from './model';

interface UndoableOperation {
  inverse: Operation;
  original: Operation;
}

export class UndoManager {
  private undoStack: UndoableOperation[] = [];
  private redoStack: UndoableOperation[] = [];
  
  private opEmitter: (op: Operation) => void;
  private localStateApplier: (op: Operation) => void;
  private getCurrentState: (elementId: string) => DesignElement | undefined;


  constructor(
      opEmitter: (op: Operation) => void,
      localStateApplier: (op: Operation) => void,
      getCurrentState: (elementId: string) => DesignElement | undefined
    ) {
    this.opEmitter = opEmitter;
    this.localStateApplier = localStateApplier;
    this.getCurrentState = getCurrentState;
  }

  public record(op: Operation) {
    const inverse = this.createInverse(op);
    if (inverse) {
      this.undoStack.push({ original: op, inverse });
      this.redoStack = []; // Clear redo stack on new action
    }
  }

  public undo() {
    const op = this.undoStack.pop();
    if (op) {
      this.localStateApplier(op.inverse);
      this.opEmitter(op.inverse);
      this.redoStack.push(op);
    }
  }

  public redo() {
    const op = this.redoStack.pop();
    if (op) {
      this.localStateApplier(op.original);
      this.opEmitter(op.original);
      this.undoStack.push(op);
    }
  }

  private createInverse(op: Operation): Operation | null {
    const inverseOp: Partial<Operation> = { ...op };

    switch (op.action) {
      case 'create':
        inverseOp.action = 'delete';
        inverseOp.payload = {};
        break;
      
      case 'delete':
        inverseOp.action = 'create';
        // The payload for the inverse 'create' should be the state of the element before deletion
        // This is passed in the original delete op's payload
        break;

      case 'update':
        const element = this.getCurrentState(op.elementId!);
        if (!element) return null;
        const oldValues: { [key: string]: any } = {};
        for (const key in op.payload) {
          oldValues[key] = (element as any)[key];
        }
        inverseOp.payload = oldValues;
        break;
      
      default:
        // Actions like lock, unlock, presence are not undoable
        return null;
    }
    return inverseOp as Operation;
  }
}
