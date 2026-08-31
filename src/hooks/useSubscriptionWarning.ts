import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionWarningState {
  daysRemaining: number | null;
  expirationDate: Date | null;
  isExpiringSoon: boolean; // <= 5 days
  isExpired: boolean;
  hasActiveSubscription: boolean;
  showWarningPopup: boolean;
  dismissPopup: () => void;
  loading: boolean;
}

const WARNING_DAYS_THRESHOLD = 5;
const POPUP_DISMISSED_KEY = 'subscription_warning_dismissed';

/**
 * Vencimento do plano, a partir de profiles.plan_expires_at.
 *
 * Antes isto lia a tabela `subscriptions`, procurando uma linha com
 * status = 'ACTIVE'. Quem tinha plano pago no perfil mas nenhuma linha ali --
 * o caso de todo cliente liberado manualmente pelo painel -- caia no ramo
 * "plano pago sem assinatura ativa", recebia daysRemaining = 0 e era tratado
 * como vencido, vendo "Acesso Bloqueado" mesmo com o plano em dia.
 *
 * A validade agora tem uma fonte unica: plan_expires_at, que e o campo que o
 * admin controla em Usuarios > Validade do plano. `subscriptions` volta a ser
 * so historico de cobranca.
 *
 * plan_expires_at nulo num plano pago = plano sem data para vencer.
 */
export const useSubscriptionWarning = (): SubscriptionWarningState => {
  // planExpiresAt ja vem resolvido do AuthContext: para membros de equipe e o
  // vencimento do dono do plano, nao o do proprio membro.
  const { user } = useAuth();
  const [showWarningPopup, setShowWarningPopup] = useState(false);

  const isPaidPlan = !!user?.plan && user.plan.id !== 'free';
  const expirationDate = isPaidPlan ? user?.planExpiresAt ?? null : null;

  const daysRemaining = expirationDate
    ? Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpiringSoon =
    daysRemaining !== null && daysRemaining <= WARNING_DAYS_THRESHOLD && daysRemaining > 0;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  // Plano pago sem data de vencimento continua ativo indefinidamente.
  const hasActiveSubscription = isPaidPlan && !isExpired;

  const dismissPopup = useCallback(() => {
    localStorage.setItem(POPUP_DISMISSED_KEY, new Date().toDateString());
    setShowWarningPopup(false);
  }, []);

  useEffect(() => {
    if (!isExpiringSoon) {
      setShowWarningPopup(false);
      return;
    }
    const dismissedDate = localStorage.getItem(POPUP_DISMISSED_KEY);
    setShowWarningPopup(dismissedDate !== new Date().toDateString());
  }, [isExpiringSoon]);

  return {
    daysRemaining,
    expirationDate,
    isExpiringSoon,
    isExpired,
    hasActiveSubscription,
    showWarningPopup,
    dismissPopup,
    // O plano ja vem carregado com o usuario; nao ha consulta propria a esperar.
    loading: false,
  };
};
