import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, Eye, LogIn, LayoutDashboard, CreditCard, Target } from 'lucide-react';

interface FunnelStep {
  name: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

interface ConversionFunnelProps {
  eventCounts: { event_name: string; count: number }[];
  loading: boolean;
}

const ConversionFunnel = ({ eventCounts, loading }: ConversionFunnelProps) => {
  const funnelData = useMemo(() => {
    const getEventCount = (eventName: string) => 
      eventCounts.find(e => e.event_name === eventName)?.count || 0;

    const steps: FunnelStep[] = [
      { 
        name: 'Visualizações de Página', 
        value: getEventCount('page_view'),
        icon: <Eye className="h-5 w-5" />,
        color: 'bg-blue-500'
      },
      { 
        name: 'Logins', 
        value: getEventCount('login'),
        icon: <LogIn className="h-5 w-5" />,
        color: 'bg-green-500'
      },
      { 
        name: 'Acesso ao Dashboard', 
        value: getEventCount('dashboard_access'),
        icon: <LayoutDashboard className="h-5 w-5" />,
        color: 'bg-yellow-500'
      },
      { 
        name: 'Buscas Realizadas', 
        value: getEventCount('search'),
        icon: <Target className="h-5 w-5" />,
        color: 'bg-orange-500'
      },
      { 
        name: 'Conversões', 
        value: getEventCount('conversion') + getEventCount('purchase') + getEventCount('plan_upgrade'),
        icon: <CreditCard className="h-5 w-5" />,
        color: 'bg-primary'
      },
    ];

    return steps;
  }, [eventCounts]);

  const maxValue = Math.max(...funnelData.map(s => s.value), 1);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
          <CardDescription>Jornada do usuário do acesso à conversão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
        <CardDescription>Jornada do usuário do acesso à conversão</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnelData.map((step, index) => {
            const widthPercentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
            const conversionRate = index > 0 && funnelData[index - 1].value > 0
              ? ((step.value / funnelData[index - 1].value) * 100).toFixed(1)
              : null;

            return (
              <div key={step.name}>
                {index > 0 && (
                  <div className="flex justify-center py-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ArrowDown className="h-4 w-4" />
                      {conversionRate && (
                        <span className={Number(conversionRate) >= 50 ? 'text-green-600' : Number(conversionRate) >= 20 ? 'text-yellow-600' : 'text-red-600'}>
                          {conversionRate}% conversão
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="relative">
                  <div 
                    className={`${step.color} rounded-lg transition-all duration-500 ease-out`}
                    style={{ 
                      width: `${Math.max(widthPercentage, 10)}%`,
                      minWidth: '120px'
                    }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 text-white">
                      <div className="flex items-center gap-2">
                        {step.icon}
                        <span className="font-medium text-sm">{step.name}</span>
                      </div>
                      <span className="font-bold">{step.value.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversion Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Taxa de conversão geral:</span>
              <p className="text-lg font-bold text-primary">
                {funnelData[0].value > 0 
                  ? ((funnelData[funnelData.length - 1].value / funnelData[0].value) * 100).toFixed(2)
                  : 0}%
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Total de conversões:</span>
              <p className="text-lg font-bold text-green-600">
                {funnelData[funnelData.length - 1].value.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversionFunnel;
