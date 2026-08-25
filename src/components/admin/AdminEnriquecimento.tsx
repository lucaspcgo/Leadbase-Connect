import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { 
  Search, RefreshCw, Loader2, CheckCircle2, XCircle, 
  AlertCircle, Database, Zap, History, SkipForward,
  Play, Pause, ListChecks, Clock, ArrowRight, BarChart3
} from 'lucide-react';

interface EnrichmentLog {
  id: string;
  admin_name: string;
  total_cnpjs: number;
  enriched: number;
  failed: number;
  skipped: number;
  source: string;
  status: string;
  control: string;
  started_at: string;
  completed_at: string | null;
}

interface EnrichmentResult {
  id: string;
  cnpj: string;
  razao_social: string | null;
  status: string;
  source: string | null;
  fields_updated: number;
  fields_changed: string[] | null;
  error_message: string | null;
  created_at: string;
}

const AdminEnriquecimento = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [singleCnpj, setSingleCnpj] = useState('');
  const [logs, setLogs] = useState<EnrichmentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [missingCount, setMissingCount] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [baseTodayEnriched, setBaseTodayEnriched] = useState(0);
  const [baseTodayFailed, setBaseTodayFailed] = useState(0);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<EnrichmentLog | null>(null);
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);
  const [pendingBatchMode, setPendingBatchMode] = useState<'batch' | 'queue'>('batch');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(15);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // On mount, check if there's already a running enrichment log (server-driven continuous mode)
  useEffect(() => {
    const checkRunning = async () => {
      const { data } = await supabase
        .from('enrichment_logs')
        .select('*')
        .eq('status', 'running')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setActiveLogId(data.id);
        setActiveLog(data as unknown as EnrichmentLog);
        setIsProcessing(true);
        setContinuousMode(true);
      }
    };
    checkRunning();
  }, []);

  // Poll for active log progress
  useEffect(() => {
    if (activeLogId) {
      pollRef.current = setInterval(async () => {
        const { data } = await supabase
          .from('enrichment_logs')
          .select('*')
          .eq('id', activeLogId)
          .single();
        if (data) {
          setActiveLog(data as unknown as EnrichmentLog);
          if (data.status === 'completed' || data.control === 'stopped' || data.control === 'completed') {
            setIsProcessing(false);
            setActiveLogId(null);
            setContinuousMode(false);
            fetchLogs();
            fetchStats();
            toast({ title: 'Enriquecimento concluído', description: `${data.enriched} enriquecidas, ${data.failed} falhas` });
            if (pollRef.current) clearInterval(pollRef.current);
          }
          if (data.status === 'paused') {
            setIsProcessing(false);
          }
        }
        if (selectedLogId === activeLogId) {
          fetchResults(activeLogId);
        }
      }, 3000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [activeLogId, selectedLogId]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from('enrichment_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    const logsData = (data as unknown as EnrichmentLog[]) || [];
    setLogs(logsData);
    setLoadingLogs(false);

    // Check if there's a running/paused log
    const running = logsData.find(l => l.status === 'running' || l.status === 'paused');
    if (running) {
      // Detect stale/orphaned processes (no update for 5+ minutes)
      const lastActivity = new Date(running.completed_at || running.started_at).getTime();
      const now = Date.now();
      const staleMinutes = 5;
      const isStale = now - lastActivity > staleMinutes * 60 * 1000;
      // Also detect stuck pause_requested (edge function died before completing pause)
      const isStuckPause = running.control === 'pause_requested' && now - lastActivity > 2 * 60 * 1000;
      
      if ((isStale && running.status === 'running') || isStuckPause) {
        await supabase.from('enrichment_logs').update({ 
          status: 'completed', 
          control: 'completed', 
          completed_at: new Date().toISOString() 
        }).eq('id', running.id);
        toast({ title: 'Processo anterior finalizado', description: 'Um processo travado foi encerrado automaticamente.' });
        setActiveLogId(null);
        setActiveLog(null);
        setIsProcessing(false);
        const { data: refreshed } = await supabase
          .from('enrichment_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        setLogs((refreshed as unknown as EnrichmentLog[]) || []);
        return;
      }
      setActiveLogId(running.id);
      setActiveLog(running);
      if (running.status === 'running') setIsProcessing(true);
      if (running.status === 'paused') setIsProcessing(false);
    } else {
      setActiveLogId(null);
      setActiveLog(null);
      setIsProcessing(false);
    }
  };

  const fetchStats = async () => {
    // Missing count
    const { count: missing } = await supabase
      .from('empresas')
      .select('id', { count: 'exact', head: true })
      .or('porte_empresa.is.null,opcao_simples.is.null,email.is.null,ddd_telefone_1.is.null,capital_social_empresa.is.null');
    setMissingCount(missing);

    // Queue count (needs_enrichment)
    const { count: queue } = await supabase
      .from('empresas')
      .select('id', { count: 'exact', head: true })
      .eq('needs_enrichment', true);
    setQueueCount(queue);

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayLogs } = await supabase
      .from('enrichment_logs')
      .select('enriched, failed')
      .gte('started_at', todayStart.toISOString());
    
    let eTotal = 0, fTotal = 0;
    (todayLogs || []).forEach((l: any) => { eTotal += l.enriched || 0; fTotal += l.failed || 0; });
    setBaseTodayEnriched(eTotal);
    setBaseTodayFailed(fTotal);
  };

  const fetchResults = async (logId: string) => {
    setLoadingResults(true);
    const { data } = await supabase
      .from('enrichment_results')
      .select('*')
      .eq('log_id', logId)
      .order('created_at', { ascending: false })
      .limit(200);
    setResults((data as unknown as EnrichmentResult[]) || []);
    setLoadingResults(false);
  };

  const startBatch = async (mode: 'batch' | 'queue' = 'batch') => {
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // If continuous mode is on, use 'continuous' mode so backend self-chains
      const effectiveMode = continuousMode ? 'continuous' : mode;

      const { data, error } = await supabase.functions.invoke('enrich-cnpj', {
        body: { mode: effectiveMode, limit: batchSize, onlyEmpty },
      });

      if (error) throw error;

      if (data.log_id) {
        setActiveLogId(data.log_id);
        setSelectedLogId(data.log_id);
        setActiveLog({
          id: data.log_id,
          admin_name: '',
          total_cnpjs: data.total || batchSize,
          enriched: 0,
          failed: 0,
          skipped: 0,
          source: 'brasilapi+receitaws',
          status: 'running',
          control: 'running',
          started_at: new Date().toISOString(),
          completed_at: null,
        });
      }

      if (data.total === 0) {
        toast({ title: 'Nenhuma empresa para enriquecer' });
        setIsProcessing(false);
        setContinuousMode(false);
        return;
      }

      // For non-continuous short batches that complete synchronously
      if (data.enriched !== undefined && !data.paused && !data.continuing) {
        setIsProcessing(false);
        setActiveLogId(null);
        setActiveLog(null);
        fetchLogs();
        fetchStats();
        toast({
          title: 'Enriquecimento concluído',
          description: `${data.enriched} enriquecidas, ${data.failed} falhas, ${data.skipped} ignoradas`,
        });
      }
      // For continuous mode, the backend self-chains. We just poll for progress.
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      setIsProcessing(false);
      setContinuousMode(false);
    }
  };

  const stopContinuous = async () => {
    setContinuousMode(false);
    if (activeLogId) {
      // Send stop action to the backend so it stops self-chaining
      try {
        await supabase.functions.invoke('enrich-cnpj', {
          body: { action: 'stop', logId: activeLogId, mode: 'batch' },
        });
      } catch {}
      forceStop();
    }
  };

  const forceStop = async () => {
    if (!activeLogId) return;
    try {
      await supabase.from('enrichment_logs').update({
        status: 'completed',
        control: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', activeLogId);
      setActiveLogId(null);
      setActiveLog(null);
      setIsProcessing(false);
      setContinuousMode(false);
      
      fetchLogs();
      fetchStats();
      toast({ title: 'Processo encerrado', description: 'O enriquecimento foi forçadamente parado.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const pauseEnrichment = async () => {
    if (!activeLogId) return;
    try {
      await supabase.functions.invoke('enrich-cnpj', {
        body: { action: 'pause', logId: activeLogId, mode: 'batch' },
      });
      toast({ title: 'Pausando...', description: 'O processo será pausado após o CNPJ atual' });
    } catch (err: any) {
      toast({ title: 'Erro ao pausar', description: err.message, variant: 'destructive' });
    }
  };

  const resumeEnrichment = async () => {
    if (!activeLogId) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-cnpj', {
        body: { action: 'resume', logId: activeLogId, mode: 'batch', limit: batchSize, onlyEmpty },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: 'Erro ao retomar', description: err.message, variant: 'destructive' });
      setIsProcessing(false);
    }
  };

  const enrichSingle = async () => {
    if (!singleCnpj.trim()) return;
    setIsProcessing(true);
    try {
      const cleanCnpj = singleCnpj.replace(/\D/g, '').padStart(14, '0');
      const { data, error } = await supabase.functions.invoke('enrich-cnpj', {
        body: { mode: 'single', cnpjs: [cleanCnpj], onlyEmpty },
      });
      if (error) throw error;

      if (data.log_id) {
        setSelectedLogId(data.log_id);
        fetchResults(data.log_id);
      }

      toast({
        title: data.enriched > 0 ? 'CNPJ enriquecido!' : 'Sem alterações',
        description: `${data.enriched} enriquecido, ${data.failed} falhas, ${data.skipped} ignoradas`,
      });

      fetchLogs();
      fetchStats();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enriched': return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Enriquecido</Badge>;
      case 'already_complete': return <Badge variant="secondary"><SkipForward className="h-3 w-3 mr-1" />Completo</Badge>;
      case 'not_found': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Não encontrado</Badge>;
      case 'api_error': return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erro API</Badge>;
      case 'update_error': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro update</Badge>;
      case 'error': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLogStatusBadge = (log: EnrichmentLog) => {
    if (log.status === 'running') return <Badge className="bg-blue-600 animate-pulse"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Em andamento</Badge>;
    if (log.status === 'paused') return <Badge className="bg-yellow-600"><Pause className="h-3 w-3 mr-1" />Pausado</Badge>;
    if (log.status === 'completed') return <Badge><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
    return <Badge variant="outline">{log.status}</Badge>;
  };

  // Derive today's stats: base (completed logs) + active log's live progress
  const todayEnriched = baseTodayEnriched + (activeLog && activeLog.status === 'running' ? activeLog.enriched : 0);
  const todayFailed = baseTodayFailed + (activeLog && activeLog.status === 'running' ? activeLog.failed : 0);

  // Aggregate logs by day for chart
  const dailyChartData = useMemo(() => {
    const dayMap: Record<string, { enriched: number; failed: number; skipped: number }> = {};
    logs.forEach(log => {
      const day = new Date(log.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[day]) dayMap[day] = { enriched: 0, failed: 0, skipped: 0 };
      dayMap[day].enriched += log.enriched;
      dayMap[day].failed += log.failed;
      dayMap[day].skipped += log.skipped;
    });
    return Object.entries(dayMap)
      .map(([date, vals]) => ({ date, ...vals }))
      .reverse();
  }, [logs]);

  const progressPercent = activeLog 
    ? ((activeLog.enriched + activeLog.failed + activeLog.skipped) / Math.max(activeLog.total_cnpjs, 1)) * 100 
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Enriquecimento de CNPJs</h1>
      <p className="text-muted-foreground mb-6">
        Valida e complementa dados de empresas consultando a BrasilAPI e ReceitaWS
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Database className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{missingCount?.toLocaleString('pt-BR') ?? '...'}</p>
              <p className="text-xs text-muted-foreground">Dados incompletos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <ListChecks className="h-8 w-8 text-orange-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{queueCount?.toLocaleString('pt-BR') ?? '...'}</p>
              <p className="text-xs text-muted-foreground">Na fila (auto)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{todayEnriched}</p>
              <p className="text-xs text-muted-foreground">Enriquecidas hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <XCircle className="h-8 w-8 text-red-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{todayFailed}</p>
              <p className="text-xs text-muted-foreground">Falhas hoje</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Process Banner */}
      {activeLog && (activeLog.status === 'running' || activeLog.status === 'paused') && (
        <Card className="mb-6 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {activeLog.status === 'running' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                {activeLog.status === 'paused' && <Pause className="h-5 w-5 text-yellow-500" />}
                <span className="font-semibold">
                  {activeLog.status === 'running' ? 'Processando...' : 'Pausado'}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({activeLog.enriched + activeLog.failed + activeLog.skipped} / {activeLog.total_cnpjs})
                </span>
              </div>
              <div className="flex gap-2">
                {activeLog.status === 'running' && (
                  <Button size="sm" variant="outline" onClick={pauseEnrichment}>
                    <Pause className="h-4 w-4 mr-1" /> Pausar
                  </Button>
                )}
                {activeLog.status === 'paused' && (
                  <Button size="sm" onClick={resumeEnrichment}>
                    <Play className="h-4 w-4 mr-1" /> Retomar
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={forceStop}>
                  <XCircle className="h-4 w-4 mr-1" /> Forçar Parada
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setSelectedLogId(activeLogId); fetchResults(activeLogId!); }}>
                  <ArrowRight className="h-4 w-4 mr-1" /> Ver detalhes
                </Button>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="grid grid-cols-3 gap-2 mt-2 text-center text-sm">
              <div><span className="font-bold text-green-600">{activeLog.enriched}</span> enriquecidas</div>
              <div><span className="font-bold text-red-600">{activeLog.failed}</span> falhas</div>
              <div><span className="font-bold text-muted-foreground">{activeLog.skipped}</span> ignoradas</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="actions" className="mb-6">
        <TabsList>
          <TabsTrigger value="actions">Ações</TabsTrigger>
          <TabsTrigger value="results">
            Resultados {selectedLogId && <Badge variant="secondary" className="ml-1 text-[10px]">{results.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Single CNPJ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4" /> Individual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="00.000.000/0001-00"
                  value={singleCnpj}
                  onChange={(e) => setSingleCnpj(e.target.value)}
                  disabled={isProcessing}
                />
                <Button onClick={enrichSingle} disabled={isProcessing || !singleCnpj.trim()} className="w-full" size="sm">
                  {isProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                  Enriquecer
                </Button>
              </CardContent>
            </Card>

            {/* Batch */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="h-4 w-4" /> Lote (Incompletos)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                 <div>
                   <Label className="text-xs">Quantidade por lote: {batchSize}</Label>
                    <Slider value={[batchSize]} onValueChange={(v) => setBatchSize(v[0])} min={10} max={500} step={10} className="mt-1" />
                    {batchSize > 200 && batchSize <= 300 && (
                      <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Lotes acima de 200 podem causar lentidão
                      </p>
                    )}
                    {batchSize > 300 && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Lotes acima de 300 exigem confirmação e podem causar timeout
                      </p>
                    )}
                 </div>
                <div className="flex items-center gap-2">
                  <Switch checked={onlyEmpty} onCheckedChange={setOnlyEmpty} id="only-empty" />
                  <Label htmlFor="only-empty" className="text-xs">Apenas campos vazios</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={continuousMode} onCheckedChange={setContinuousMode} id="continuous" />
                  <Label htmlFor="continuous" className="text-xs">Modo contínuo (roda no servidor até concluir tudo)</Label>
                </div>
                {continuousMode && isProcessing && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processamento contínuo no servidor — pode fechar a página
                  </p>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => {
                     if (batchSize > 300) {
                       setPendingBatchMode('batch');
                       setShowBatchConfirm(true);
                     } else {
                       startBatch('batch');
                     }
                   }} disabled={isProcessing} className="flex-1" size="sm">
                     <Play className="h-4 w-4 mr-1" /> Iniciar
                   </Button>
                  {continuousMode && isProcessing && (
                    <Button onClick={stopContinuous} variant="destructive" size="sm">
                      <Pause className="h-4 w-4 mr-1" /> Parar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="h-4 w-4" /> Fila Automática
                </CardTitle>
                <CardDescription className="text-xs">
                  {queueCount ?? 0} empresas aguardando
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Empresas cadastradas são automaticamente adicionadas à fila de enriquecimento.
                </p>
                <Button onClick={() => {
                  if (batchSize > 300) {
                    setPendingBatchMode('queue');
                    setShowBatchConfirm(true);
                  } else {
                    startBatch('queue');
                  }
                }} disabled={isProcessing || (queueCount ?? 0) === 0} className="w-full" size="sm">
                  <Play className="h-4 w-4 mr-1" /> Processar Fila
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results">
          {!selectedLogId ? (
            <p className="text-center py-8 text-muted-foreground">Selecione um enriquecimento no histórico para ver os detalhes</p>
          ) : loadingResults ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : results.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum resultado ainda</p>
          ) : (
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Campos Alterados</TableHead>
                    <TableHead>Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.cnpj}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{r.razao_social || '-'}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.source || '-'}</Badge></TableCell>
                      <TableCell>
                        {r.fields_changed && r.fields_changed.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[300px]">
                            {r.fields_changed.map(f => (
                              <Badge key={f} variant="secondary" className="text-[10px] font-mono">{f}</Badge>
                            ))}
                          </div>
                        ) : r.fields_updated > 0 ? (
                          <Badge>{r.fields_updated} campos</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        {r.error_message && (
                          <p className="text-[10px] text-destructive mt-1 truncate max-w-[300px]" title={r.error_message}>{r.error_message}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleTimeString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {loadingLogs ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum enriquecimento realizado</p>
          ) : (
            <div className="space-y-6">
              {/* Daily Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Enriquecimentos por Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="enriched" name="Enriquecidas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="failed" name="Falhas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="skipped" name="Ignoradas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              {(() => {
                const totalHistoryPages = Math.ceil(logs.length / historyPerPage);
                const paginatedLogs = logs.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);
                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Enriquecidas</TableHead>
                          <TableHead>Falhas</TableHead>
                          <TableHead>Ignoradas</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLogs.map(log => (
                          <TableRow key={log.id} className={selectedLogId === log.id ? 'bg-muted/50' : ''}>
                            <TableCell className="text-sm">
                              {new Date(log.started_at).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell>{log.admin_name}</TableCell>
                            <TableCell>{log.total_cnpjs}</TableCell>
                            <TableCell className="text-green-600 font-medium">{log.enriched}</TableCell>
                            <TableCell className="text-red-600">{log.failed}</TableCell>
                            <TableCell className="text-muted-foreground">{log.skipped}</TableCell>
                            <TableCell>{getLogStatusBadge(log)}</TableCell>
                            <TableCell>
                              <Button 
                                size="sm" variant="ghost" 
                                onClick={() => { setSelectedLogId(log.id); fetchResults(log.id); }}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {logs.length > 15 && (
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {(historyPage - 1) * historyPerPage + 1}–{Math.min(historyPage * historyPerPage, logs.length)} de {logs.length}
                          </p>
                          <select
                            value={historyPerPage}
                            onChange={(e) => { setHistoryPerPage(Number(e.target.value)); setHistoryPage(1); }}
                            className="text-xs border rounded px-1.5 py-0.5 bg-background"
                          >
                            <option value={15}>15/pág</option>
                            <option value={25}>25/pág</option>
                            <option value={50}>50/pág</option>
                          </select>
                        </div>
                        {totalHistoryPages > 1 && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)}>Anterior</Button>
                            <Button size="sm" variant="outline" disabled={historyPage === totalHistoryPages} onClick={() => setHistoryPage(p => p + 1)}>Próximo</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showBatchConfirm} onOpenChange={setShowBatchConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar lote grande</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a processar um lote de <strong>{batchSize}</strong> registros. 
              Lotes acima de 300 podem causar timeout na edge function e impactar a performance. 
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => startBatch(pendingBatchMode)}>
              Confirmar e Iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEnriquecimento;
