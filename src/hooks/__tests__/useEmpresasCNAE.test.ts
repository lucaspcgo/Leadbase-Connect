import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEmpresasPaginated } from "../useEmpresas";
import { supabase } from "@/integrations/supabase/client";
import React from "react";

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
  }),
}));

// Mock supabase RPC
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("useEmpresasPaginated - CNAE Search Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle CNAE search with full description format '0111301 - CULTIVO DE ARROZ'", async () => {
    const mockData = [
      {
        id: 1,
        cnae_codigo: "0111301",
        cnae_fiscal: "0111301 - CULTIVO DE ARROZ",
        total_count: 1,
      },
    ];

    (supabase.rpc as any).mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() =>
      useEmpresasPaginated(1, 10, { cnae: "0111301 - CULTIVO DE ARROZ" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabase.rpc).toHaveBeenCalledWith("get_empresas_public", expect.objectContaining({
      p_cnae: "0111301 - CULTIVO DE ARROZ",
    }));
    
    expect(result.current.empresas).toHaveLength(1);
    expect(result.current.empresas[0].cnae_codigo).toBe("0111301");
  });

  it("should handle CNAE search with code only '0111301'", async () => {
    const mockData = [
      {
        id: 1,
        cnae_codigo: "0111301",
        cnae_fiscal: "0111301 - CULTIVO DE ARROZ",
        total_count: 1,
      },
    ];

    (supabase.rpc as any).mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() =>
      useEmpresasPaginated(1, 10, { cnae: "0111301" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabase.rpc).toHaveBeenCalledWith("get_empresas_public", expect.objectContaining({
      p_cnae: "0111301",
    }));
  });

  it("should handle CNAE with leading zeros '0111301' and '111301'", async () => {
    // This test ensures the hook sends the value as is. 
    // The normalization logic itself is inside the SQL function.
    (supabase.rpc as any).mockResolvedValue({ data: [], error: null });

    const { result: resultWithZero } = renderHook(() =>
      useEmpresasPaginated(1, 10, { cnae: "0111301" })
    );
    await waitFor(() => expect(resultWithZero.current.loading).toBe(false));
    expect(supabase.rpc).toHaveBeenCalledWith("get_empresas_public", expect.objectContaining({
      p_cnae: "0111301",
    }));

    vi.clearAllMocks();
    (supabase.rpc as any).mockResolvedValue({ data: [], error: null });

    const { result: resultWithoutZero } = renderHook(() =>
      useEmpresasPaginated(1, 10, { cnae: "111301" })
    );
    await waitFor(() => expect(resultWithoutZero.current.loading).toBe(false));
    expect(supabase.rpc).toHaveBeenCalledWith("get_empresas_public", expect.objectContaining({
      p_cnae: "111301",
    }));
  });

  it("should handle secondary CNAEs implicitly via the RPC", async () => {
    // This test verifies that if the RPC returns data for a CNAE, the hook populates it.
    // The get_empresas_public function logic (which we saw) handles the actual secondary CNAE matching.
    const mockData = [
      {
        id: 2,
        cnae_codigo: "4751201",
        cnae_fiscal: "4751201 - COMÉRCIO VAREJISTA ESPECIALIZADO DE EQUIPAMENTOS E SUPRIMENTOS DE INFORMÁTICA",
        cnaes_secundarios: "4751201,4752100",
        total_count: 1,
      },
    ];

    (supabase.rpc as any).mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() =>
      useEmpresasPaginated(1, 10, { cnae: "4752100" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabase.rpc).toHaveBeenCalledWith("get_empresas_public", expect.objectContaining({
      p_cnae: "4752100",
    }));
    expect(result.current.empresas).toHaveLength(1);
    expect(result.current.empresas[0].cnaes_secundarios).toContain("4752100");
  });
});
