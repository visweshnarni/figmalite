
import { MousePointer, Square, Circle, Pen, Type, Image as ImageIcon } from 'lucide-react';
import { Tool } from '@/lib/model';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

const tools: { name: Tool, icon: React.ReactNode }[] = [
    { name: 'select', icon: <MousePointer /> },
    { name: 'rectangle', icon: <Square /> },
    { name: 'ellipse', icon: <Circle /> },
    { name: 'path', icon: <Pen /> },
];

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange }) => {
  return (
    <aside className="bg-background border-r border-border p-2 flex flex-col items-center gap-2">
      <TooltipProvider>
        {tools.map(tool => (
            <Tooltip key={tool.name}>
                <TooltipTrigger asChild>
                    <Button 
                        variant={activeTool === tool.name ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => onToolChange(tool.name)}
                    >
                        {tool.icon}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>{tool.name.charAt(0).toUpperCase() + tool.name.slice(1)}</p>
                </TooltipContent>
            </Tooltip>
        ))}
      </TooltipProvider>
    </aside>
  );
};

export default Toolbar;
