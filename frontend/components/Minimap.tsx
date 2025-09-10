
import { DesignElement } from '@/lib/model';

interface MinimapProps {
    elements: DesignElement[];
}

const Minimap: React.FC<MinimapProps> = ({ elements }) => {
    const PADDING = 50;
    const allX = elements.map(e => [e.x, e.x + e.width]).flat();
    const allY = elements.map(e => [e.y, e.y + e.height]).flat();

    const minX = Math.min(...allX, 0) - PADDING;
    const minY = Math.min(...allY, 0) - PADDING;
    const maxX = Math.max(...allX, 0) + PADDING;
    const maxY = Math.max(...allY, 0) + PADDING;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const viewBox = `${minX} ${minY} ${contentWidth} ${contentHeight}`;

    return (
        <div className="w-48 h-36 bg-background border border-border rounded-md shadow-lg overflow-hidden">
            <svg viewBox={viewBox} className="w-full h-full">
                {elements.map(el => {
                     switch(el.type) {
                        case 'rectangle': return <rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} fill={el.fillColor} />;
                        case 'ellipse': return <ellipse key={el.id} cx={el.x + el.width/2} cy={el.y + el.height/2} rx={el.width/2} ry={el.height/2} fill={el.fillColor} />;
                        default: return <rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} fill="gray" />;
                    }
                })}
            </svg>
        </div>
    );
};

export default Minimap;
