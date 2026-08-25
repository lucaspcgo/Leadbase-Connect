import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InvoiceData {
  id: string;
  user_email: string;
  plan_name: string;
  billing_cycle: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at?: string | null;
  created_at: string;
  description?: string | null;
}

export const generateInvoicePdf = (invoice: InvoiceData) => {
  const doc = new jsPDF();
  
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Colors
  const primaryColor = [59, 130, 246]; // Blue
  const textColor = [31, 41, 55]; // Gray-800
  const mutedColor = [107, 114, 128]; // Gray-500
  
  // Header - Company Info
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('LeadsBase Pro', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestão de Leads', 20, 35);
  
  // Invoice Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FATURA', 160, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${invoice.id.substring(0, 8).toUpperCase()}`, 160, 35);
  
  // Invoice Info Box
  doc.setFillColor(249, 250, 251);
  doc.rect(15, 55, 180, 35, 'F');
  
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  
  // Left side - Dates
  doc.setFont('helvetica', 'bold');
  doc.text('Data de Emissão:', 20, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.created_at), 65, 65);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Vencimento:', 20, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.due_date), 65, 75);
  
  if (invoice.paid_at) {
    doc.setFont('helvetica', 'bold');
    doc.text('Data Pagamento:', 20, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(invoice.paid_at), 65, 85);
  }
  
  // Right side - Status
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 120, 65);
  
  const statusText = invoice.status === 'PAID' ? 'PAGO' : 
                     invoice.status === 'PENDING' ? 'PENDENTE' :
                     invoice.status === 'OVERDUE' ? 'VENCIDA' : 
                     invoice.status === 'CANCELLED' ? 'CANCELADA' : invoice.status;
  
  const statusColor = invoice.status === 'PAID' ? [34, 197, 94] : 
                      invoice.status === 'PENDING' ? [234, 179, 8] :
                      invoice.status === 'OVERDUE' ? [239, 68, 68] : [107, 114, 128];
  
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, 145, 65);
  
  // Client Info
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Faturado para:', 20, 105);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(invoice.user_email, 20, 115);
  
  // Items Table Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, 130, 180, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Descrição', 20, 137);
  doc.text('Período', 100, 137);
  doc.text('Valor', 165, 137);
  
  // Items Table Content
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'normal');
  
  const planDescription = invoice.description || `Assinatura ${invoice.plan_name}`;
  const billingPeriod = invoice.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal';
  
  // Row background
  doc.setFillColor(249, 250, 251);
  doc.rect(15, 140, 180, 20, 'F');
  
  doc.text(planDescription, 20, 152);
  doc.text(billingPeriod, 100, 152);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(invoice.amount), 165, 152);
  
  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.line(15, 165, 195, 165);
  
  // Total
  doc.setFillColor(249, 250, 251);
  doc.rect(120, 170, 75, 25, 'F');
  
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', 125, 180);
  doc.text('Total:', 125, 190);
  
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(invoice.amount), 165, 180);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(formatCurrency(invoice.amount), 165, 190);
  
  // Footer
  doc.setFillColor(249, 250, 251);
  doc.rect(0, 260, 210, 37, 'F');
  
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('LeadsBase Pro - Sistema de Gestão de Leads', 105, 272, { align: 'center' });
  doc.text('Este documento é uma fatura válida para fins de comprovação de pagamento.', 105, 280, { align: 'center' });
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, 288, { align: 'center' });
  
  // Save
  const fileName = `fatura-${invoice.id.substring(0, 8)}-${format(new Date(invoice.created_at), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};
