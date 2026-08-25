import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  FileQuestion,
  Database,
  FileWarning,
  Info
} from 'lucide-react';
import { ParseError, ErrorType, UnmappedColumn } from '@/lib/empresaParser';
import { cn } from '@/lib/utils';

interface ImportErrorsDetailProps {
  errors: ParseError[];
  unmappedColumns?: UnmappedColumn[];
  mappedHeaders?: { header: string; field: string | null; index: number }[];
}

const ERROR_TYPE_CONFIG: Record<ErrorType, { label: string; icon: typeof AlertCircle; color: string }> = {
  missing_required: { 
    label: 'Campo Obrigatório', 
    icon: AlertCircle, 
    color: 'text-destructive' 
  },
  invalid_format: { 
    label: 'Formato Inválido', 
    icon: FileWarning, 
    color: 'text-warning' 
  },
  column_mismatch: { 
    label: 'Colunas Divergentes', 
    icon: AlertTriangle, 
    color: 'text-orange-500' 
  },
  parse_error: { 
    label: 'Erro de Leitura', 
    icon: FileQuestion, 
    color: 'text-destructive' 
  },
  database_error: { 
    label: 'Erro de Banco', 
    icon: Database, 
    color: 'text-destructive' 
  },
};

const ImportErrorsDetail = ({ errors, unmappedColumns, mappedHeaders }: ImportErrorsDetailProps) => {
  const [errorsOpen, setErrorsOpen] = useState(true);
  const [unmappedOpen, setUnmappedOpen] = useState(true);
  const [mappingOpen, setMappingOpen] = useState(false);
  
  // Group errors by type
  const errorsByType = errors.reduce((acc, error) => {
    const type = error.errorType || 'parse_error';
    if (!acc[type]) acc[type] = [];
    acc[type].push(error);
    return acc;
  }, {} as Record<ErrorType, ParseError[]>);

  const hasUnmapped = unmappedColumns && unmappedColumns.length > 0;
  const hasMapped = mappedHeaders && mappedHeaders.length > 0;
  const hasErrors = errors.length > 0;

  if (!hasErrors && !hasUnmapped) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Unmapped Columns Warning */}
      {hasUnmapped && (
        <Collapsible open={unmappedOpen} onOpenChange={setUnmappedOpen}>
          <Card className="border-warning/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-warning" />
                  <CardTitle className="text-base">
                    Colunas Não Mapeadas ({unmappedColumns.length})
                  </CardTitle>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {unmappedOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CardDescription>
                Estas colunas da sua planilha não foram reconhecidas e serão ignoradas na importação.
              </CardDescription>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="max-h-48 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 sticky top-0 bg-background z-10">#</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">Nome da Coluna</TableHead>
                        <TableHead className="sticky top-0 bg-background z-10">Exemplos de Valores</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmappedColumns.map((col, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {col.columnIndex + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Badge variant="outline" className="bg-warning/10">
                              {col.header}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs">
                            {col.sampleValues.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {col.sampleValues.map((val, i) => (
                                  <span 
                                    key={i} 
                                    className="inline-block bg-muted px-2 py-0.5 rounded text-xs truncate max-w-[150px]"
                                    title={val}
                                  >
                                    {val}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="italic">(vazio)</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Como resolver:</p>
                      <p className="text-muted-foreground">
                        Renomeie as colunas na sua planilha para corresponder aos nomes aceitos pelo sistema 
                        (ex: "razao_social", "nome_fantasia", "email", "telefone", etc.)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Column Mapping Reference */}
      {hasMapped && (
        <Collapsible open={mappingOpen} onOpenChange={setMappingOpen}>
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">
                    Mapeamento de Colunas
                  </CardTitle>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {mappingOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CardDescription>
                Veja como cada coluna da sua planilha foi mapeada para os campos do sistema.
              </CardDescription>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="max-h-48 overflow-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {mappedHeaders.map((mapping, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "p-2 rounded-lg border text-sm",
                          mapping.field 
                            ? "bg-success/5 border-success/30" 
                            : "bg-muted/50 border-muted"
                        )}
                      >
                        <p className="font-medium truncate" title={mapping.header}>
                          {mapping.header}
                        </p>
                        <p className={cn(
                          "text-xs truncate",
                          mapping.field ? "text-success" : "text-muted-foreground"
                        )}>
                          → {mapping.field || '(ignorado)'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Detailed Errors List */}
      {hasErrors && (
        <Collapsible open={errorsOpen} onOpenChange={setErrorsOpen}>
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-base">
                    Erros de Importação ({errors.length})
                  </CardTitle>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {errorsOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CardDescription>
                Detalhes sobre os erros encontrados durante a validação e importação.
              </CardDescription>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {/* Summary by error type */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(errorsByType).map(([type, typeErrors]) => {
                    const config = ERROR_TYPE_CONFIG[type as ErrorType];
                    const Icon = config?.icon || AlertCircle;
                    return (
                      <TooltipProvider key={type}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className={cn("gap-1", config?.color)}
                            >
                              <Icon className="h-3 w-3" />
                              {config?.label || type}: {typeErrors.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{typeErrors.length} erro(s) do tipo "{config?.label || type}"</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>

                {/* Error details table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 sticky top-0 bg-background z-10">Linha</TableHead>
                          <TableHead className="w-24 sticky top-0 bg-background z-10">Tipo</TableHead>
                          <TableHead className="sticky top-0 bg-background z-10">Campo</TableHead>
                          <TableHead className="sticky top-0 bg-background z-10">Mensagem</TableHead>
                          <TableHead className="sticky top-0 bg-background z-10">Valor Original</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errors.slice(0, 100).map((error, idx) => {
                          const config = ERROR_TYPE_CONFIG[error.errorType];
                          const Icon = config?.icon || AlertCircle;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">
                                {error.row}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs gap-1", config?.color)}
                                >
                                  <Icon className="h-3 w-3" />
                                  <span className="hidden sm:inline">{config?.label?.split(' ')[0]}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {error.fieldLabel || error.field ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {error.fieldLabel || error.field}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm max-w-[300px]">
                                <div className="whitespace-normal break-words">
                                  {error.message}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[250px]">
                                {error.originalValue ? (
                                  <code 
                                    className="bg-muted px-1.5 py-0.5 rounded text-xs block whitespace-normal break-all"
                                    title={error.originalValue}
                                  >
                                    {error.originalValue.length > 50 
                                      ? error.originalValue.substring(0, 47) + '...' 
                                      : error.originalValue}
                                  </code>
                                ) : (
                                  <span className="italic">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {errors.length > 100 && (
                      <p className="text-center text-sm text-muted-foreground py-3 border-t">
                        ... e mais {errors.length - 100} erros não exibidos
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default ImportErrorsDetail;
