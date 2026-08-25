import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Empresa } from '@/types';
import { mockEmpresas } from '@/data/mockData';

interface EmpresasContextType {
  empresas: Empresa[];
  addEmpresas: (newEmpresas: Empresa[], handleDuplicates: 'update' | 'skip') => ImportReport;
  updateEmpresa: (id: number, data: Partial<Empresa>) => void;
  deleteEmpresa: (id: number) => void;
  clearEmpresas: () => void;
  getEmpresaById: (id: number) => Empresa | undefined;
  getEmpresaByCnpj: (cnpj: string) => Empresa | undefined;
}

export interface ImportReport {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

const EmpresasContext = createContext<EmpresasContextType | undefined>(undefined);

const STORAGE_KEY = 'leadbase_empresas';

export const EmpresasProvider = ({ children }: { children: ReactNode }) => {
  const [empresas, setEmpresas] = useState<Empresa[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.length > 0 ? parsed : mockEmpresas;
      }
    } catch (e) {
      console.error('Error loading empresas from localStorage:', e);
    }
    return mockEmpresas;
  });

  // Persist to localStorage whenever empresas change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(empresas));
    } catch (e) {
      console.error('Error saving empresas to localStorage:', e);
    }
  }, [empresas]);

  const normalizeCnpj = (cnpj: string): string => {
    return cnpj.replace(/\D/g, '').padStart(14, '0');
  };

  const getEmpresaByCnpj = (cnpj: string): Empresa | undefined => {
    const normalized = normalizeCnpj(cnpj);
    return empresas.find(e => normalizeCnpj(e.cnpj) === normalized);
  };

  const getEmpresaById = (id: number): Empresa | undefined => {
    return empresas.find(e => e.id === id);
  };

  const addEmpresas = (newEmpresas: Empresa[], handleDuplicates: 'update' | 'skip'): ImportReport => {
    const report: ImportReport = {
      total: newEmpresas.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    const updatedList = [...empresas];
    let nextId = Math.max(...empresas.map(e => e.id), 0) + 1;

    newEmpresas.forEach((empresa, index) => {
      if (!empresa.cnpj) {
        report.errors.push({ row: index + 1, message: 'CNPJ obrigatório' });
        return;
      }

      const normalizedCnpj = normalizeCnpj(empresa.cnpj);
      const existingIndex = updatedList.findIndex(e => normalizeCnpj(e.cnpj) === normalizedCnpj);

      if (existingIndex >= 0) {
        if (handleDuplicates === 'update') {
          updatedList[existingIndex] = { ...updatedList[existingIndex], ...empresa, cnpj: normalizedCnpj };
          report.updated++;
        } else {
          report.skipped++;
        }
      } else {
        updatedList.push({ ...empresa, id: nextId++, cnpj: normalizedCnpj });
        report.inserted++;
      }
    });

    setEmpresas(updatedList);
    return report;
  };

  const updateEmpresa = (id: number, data: Partial<Empresa>) => {
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deleteEmpresa = (id: number) => {
    setEmpresas(prev => prev.filter(e => e.id !== id));
  };

  const clearEmpresas = () => {
    setEmpresas([]);
  };

  return (
    <EmpresasContext.Provider value={{
      empresas,
      addEmpresas,
      updateEmpresa,
      deleteEmpresa,
      clearEmpresas,
      getEmpresaById,
      getEmpresaByCnpj
    }}>
      {children}
    </EmpresasContext.Provider>
  );
};

export const useEmpresas = () => {
  const context = useContext(EmpresasContext);
  if (!context) {
    throw new Error('useEmpresas must be used within an EmpresasProvider');
  }
  return context;
};
