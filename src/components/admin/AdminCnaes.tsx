import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscribeEmpresasCatalogUpdated } from '@/lib/empresasCatalogSync';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, List, Building2, Download } from 'lucide-react';

interface CnaeData {
  cnae_codigo: string;
  cnae_fiscal: string | null;
  count: number;
}

const AdminCnaes = () => {
  const [cnaes, setCnaes] = useState<CnaeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    fetchCnaes();

    // Subscribe to catalog updates to refresh the list automatically
    return subscribeEmpresasCatalogUpdated(() => {
      fetchCnaes();
    });
  }, []);

  const fetchCnaes = async () => {
    setLoading(true);
    try {
      // Usar a função RPC que já agrupa os CNAEs no banco de dados
      // Isso é muito mais eficiente do que buscar todas as empresas
      const { data, error } = await supabase.rpc('get_cnaes_grouped');
      
      if (error) {
        console.error('Error fetching CNAEs:', error.message, error.details, error.hint);
        setCnaes([]);
        return;
      }
      
      console.log('CNAEs loaded:', data?.length, 'records');

      // Mapear o resultado para o formato esperado
      const cnaeArray: CnaeData[] = (data || []).map((row: { cnae_codigo: string; cnae_fiscal: string | null; count: number }) => ({
        cnae_codigo: row.cnae_codigo,
        cnae_fiscal: row.cnae_fiscal,
        count: Number(row.count)
      }));

      setCnaes(cnaeArray);
    } catch (error) {
      console.error('Error:', error);
      setCnaes([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar CNAEs pela busca
  const filteredCnaes = useMemo(() => {
    if (!search.trim()) return cnaes;
    
    const searchLower = search.toLowerCase();
    return cnaes.filter(cnae => 
      cnae.cnae_codigo?.toLowerCase().includes(searchLower) ||
      cnae.cnae_fiscal?.toLowerCase().includes(searchLower)
    );
  }, [cnaes, search]);

  // Paginação
  const totalPages = Math.ceil(filteredCnaes.length / itemsPerPage);
  const paginatedCnaes = filteredCnaes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset página ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Exportar para CSV
  const handleExportCSV = () => {
    const headers = ['Código CNAE', 'Descrição', 'Quantidade de Empresas'];
    const rows = filteredCnaes.map(cnae => [
      cnae.cnae_codigo,
      cnae.cnae_fiscal || '',
      cnae.count.toString()
    ]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cnaes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Total de empresas
  const totalEmpresas = cnaes.reduce((acc, cnae) => acc + cnae.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">CNAEs Cadastrados</h1>
          <p className="text-muted-foreground">
            Lista de CNAEs das empresas no banco de dados
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <List className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cnaes.length}</p>
                <p className="text-sm text-muted-foreground">CNAEs Únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <Building2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEmpresas.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Empresas com CNAE</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-lg">
                <Search className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredCnaes.length}</p>
                <p className="text-sm text-muted-foreground">Resultados Filtrados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de CNAEs</CardTitle>
          <CardDescription>
            Busque por código ou descrição do CNAE
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right w-[150px]">Empresas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCnaes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          {search ? 'Nenhum CNAE encontrado para a busca.' : 'Nenhum CNAE cadastrado.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCnaes.map((cnae, index) => (
                        <TableRow key={cnae.cnae_codigo || index}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {cnae.cnae_codigo}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[400px] truncate">
                            {cnae.cnae_fiscal || <span className="text-muted-foreground">Sem descrição</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">
                              {cnae.count.toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredCnaes.length)} de {filteredCnaes.length}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCnaes;
