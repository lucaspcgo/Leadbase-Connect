import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutList, LayoutGrid, Table2 } from 'lucide-react';

export type ViewMode = 'table' | 'compact' | 'cards';

interface EmpresasViewTabsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const EmpresasViewTabs = ({ viewMode, onViewModeChange }: EmpresasViewTabsProps) => {
  return (
    <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
      <TabsList className="h-8">
        <TabsTrigger value="table" className="h-7 px-2 text-xs">
          <Table2 className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">Tabela</span>
        </TabsTrigger>
        <TabsTrigger value="compact" className="h-7 px-2 text-xs">
          <LayoutList className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">Compacto</span>
        </TabsTrigger>
        <TabsTrigger value="cards" className="h-7 px-2 text-xs">
          <LayoutGrid className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">Cards</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default EmpresasViewTabs;
