import { describe, it, expect } from "vitest";

import {
  buildPixPayload,
  makeTLV,
  calculateCRC16CCITT,
  normalizePhoneKey,
  sanitizeMerchantName,
  sanitizeMerchantCity,
  formatAmount,
  validatePixPayload,
} from "../pixGenerator";

describe("pixGenerator", () => {
  it("makeTLV deve montar TLV corretamente", () => {
    expect(makeTLV("00", "01")).toBe("000201");
    expect(makeTLV("26", "test")).toBe("2604test");
  });

  it("calculateCRC16CCITT deve bater com vetor conhecido", () => {
    const testPayload =
      "00020101021226580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000520400005303986540510.005802BR5905Nome15912Cidade6014Belo Horizonte6304";

    expect(calculateCRC16CCITT(testPayload)).toBe("B56B");
  });

  it("normalizePhoneKey deve normalizar telefone BR", () => {
    expect(normalizePhoneKey("62996343410")).toBe("5562996343410");
    expect(normalizePhoneKey("+5562996343410")).toBe("5562996343410");
    expect(normalizePhoneKey("5562996343410")).toBe("5562996343410");
    expect(normalizePhoneKey("(62) 99634-3410")).toBe("5562996343410");
  });

  it("sanitização deve remover acentos e truncar cidade", () => {
    expect(sanitizeMerchantName("João da Silva")).toBe("Joao da Silva");
    expect(sanitizeMerchantCity("Goiânia")).toBe("Goiania");
    expect(sanitizeMerchantCity("São Paulo Capital")).toBe("Sao Paulo Capit");
  });

  it("formatAmount deve formatar com 2 casas", () => {
    expect(formatAmount(1)).toBe("1.00");
    expect(formatAmount(29.9)).toBe("29.90");
    expect(formatAmount(199.99)).toBe("199.99");
  });

  it("buildPixPayload deve gerar payload válido", () => {
    const result = buildPixPayload({
      pixKeyPhone: "62996343410",
      merchantName: "Lucas Pereira de Carvalho",
      merchantCity: "Goiânia",
      amount: 1.0,
      description: "Assinatura Basic",
      txid: "LBTEST12345",
    });

    const validation = validatePixPayload(result.payload);

    expect(validation.valid).toBe(true);
    expect(result.payload).toContain("br.gov.bcb.pix");
    expect(result.payload).toContain("5562996343410");
    expect(result.payload).toContain("1.00");
    expect(result.payload.endsWith(result.crc)).toBe(true);
  });
});
