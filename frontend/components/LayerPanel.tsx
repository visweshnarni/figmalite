
import { DesignElement } from '@/lib/model';

interface LayerPanelProps {
    elements: DesignElement[];
    selectedElementIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({ elements, selectedElementIds, onSelectionChange }) => {
    return (
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">Layers</h3>
            <div className="bg-muted rounded-md max-h-64 overflow-y-auto">
                {elements.map(el => (
                    <div 
                        key={el.id}
                        className={`p-2 text-sm cursor-pointer ${selectedElementIds.includes(el.id) ? 'bg-primary/20' : ''}`}
                        onClick={() => onSelectionChange([el.id])}
                    >
                       {el.type.charAt(0).toUpperCase() + el.type.slice(1)} {el.id.substring(0, 4)}
                    </div>
                ))}
                {elements.length === 0 && <div className="p-2 text-sm text-muted-foreground">No layers yet.</div>}
            </div>
        </div>
    );
};

export default LayerPanel;
