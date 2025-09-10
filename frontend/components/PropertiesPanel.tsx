
import { DesignElement, RectangleElement, EllipseElement } from '@/lib/model';

interface PropertiesPanelProps {
    selectedElements: DesignElement[];
    onElementChange: (element: DesignElement) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedElements, onElementChange }) => {
    if (selectedElements.length !== 1) {
        return <div className="text-sm text-muted-foreground">Select one element to see properties.</div>;
    }
    const element = selectedElements[0];
    
    const handleChange = (prop: string, value: any) => {
        onElementChange({ ...element, [prop]: value });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Properties</h3>
            <div className="space-y-2">
                <label className="text-sm">X</label>
                <input type="number" value={element.x} onChange={e => handleChange('x', +e.target.value)} className="w-full p-1 bg-muted rounded"/>
            </div>
             <div className="space-y-2">
                <label className="text-sm">Y</label>
                <input type="number" value={element.y} onChange={e => handleChange('y', +e.target.value)} className="w-full p-1 bg-muted rounded"/>
            </div>
             <div className="space-y-2">
                <label className="text-sm">Width</label>
                <input type="number" value={element.width} onChange={e => handleChange('width', +e.target.value)} className="w-full p-1 bg-muted rounded"/>
            </div>
             <div className="space-y-2">
                <label className="text-sm">Height</label>
                <input type="number" value={element.height} onChange={e => handleChange('height', +e.target.value)} className="w-full p-1 bg-muted rounded"/>
            </div>
            {(element.type === 'rectangle' || element.type === 'ellipse') && (
                 <div className="space-y-2">
                    <label className="text-sm">Fill Color</label>
                    <input type="color" value={(element as RectangleElement | EllipseElement).fillColor} onChange={e => handleChange('fillColor', e.target.value)} className="w-full p-1 bg-muted rounded"/>
                </div>
            )}
             <div className="space-y-2">
                <label className="text-sm">Stroke Color</label>
                <input type="color" value={element.strokeColor} onChange={e => handleChange('strokeColor', e.target.value)} className="w-full p-1 bg-muted rounded"/>
            </div>
             <div className="space-y-2">
                <label className="text-sm">Stroke Width</label>
                <input type="number" value={element.strokeWidth} min="0" onChange={e => handleChange('strokeWidth', +e.target.value)} className="w-full p-1 bg-muted rounded"/>
            </div>
        </div>
    );
};

export default PropertiesPanel;
