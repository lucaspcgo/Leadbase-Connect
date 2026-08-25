import QRCode from 'qrcode';

/**
 * PIX BR Code (EMV) Generator
 * Follows the official Brazilian Central Bank PIX specification
 */

interface PixPayloadParams {
  pixKeyPhone: string;      // Phone number (will be normalized to 55XXXXXXXXXXX)
  merchantName: string;     // Max 25 chars, will be sanitized
  merchantCity: string;     // Max 15 chars, will be sanitized  
  amount: number;           // Will be formatted to 2 decimal places
  description?: string;     // Optional, max 25 chars
  txid?: string;            // Optional, will generate if not provided
}

interface PixPayloadResult {
  payload: string;
  qrCodeBase64: string;
  crc: string;
  copiaECola: string;
}

/**
 * Make TLV (Type-Length-Value) field for EMV format
 * @param id - 2 character field ID
 * @param value - Field value
 * @returns Formatted TLV string
 */
const makeTLV = (id: string, value: string): string => {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
};

/**
 * Calculate CRC16-CCITT
 * Polynomial: 0x1021, Initial value: 0xFFFF
 * @param payload - String to calculate CRC for
 * @returns 4-character uppercase hex string
 */
const calculateCRC16CCITT = (payload: string): string => {
  const polynomial = 0x1021;
  let crc = 0xFFFF;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

/**
 * Remove accents and special characters from text
 * @param text - Input text
 * @returns Sanitized text (ASCII only, alphanumeric + space)
 */
const removeAccents = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9 ]/g, '')   // Keep only alphanumeric and space
    .trim();
};

/**
 * Sanitize and truncate merchant name (max 25 chars)
 * @param name - Raw merchant name
 * @returns Sanitized name, max 25 characters
 */
const sanitizeMerchantName = (name: string): string => {
  const sanitized = removeAccents(name);
  return sanitized.substring(0, 25);
};

/**
 * Sanitize and truncate city (max 15 chars)
 * @param city - Raw city name
 * @returns Sanitized city, max 15 characters
 */
const sanitizeMerchantCity = (city: string): string => {
  const sanitized = removeAccents(city);
  return sanitized.substring(0, 15);
};

/**
 * Sanitize and truncate description (max 25 chars)
 * @param description - Raw description
 * @returns Sanitized description, max 25 characters
 */
const sanitizeDescription = (description: string): string => {
  const sanitized = removeAccents(description);
  return sanitized.substring(0, 25);
};

/**
 * Normalize phone number to PIX format (55XXXXXXXXXXX)
 * Accepts: 62996343410, +5562996343410, 5562996343410
 * Returns: 5562996343410
 * @param phone - Raw phone number
 * @returns Normalized phone number with country code 55
 */
const normalizePhoneKey = (phone: string): string => {
  // Remove all non-numeric characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If already starts with 55 and has proper length (13 digits for mobile)
  if (digitsOnly.startsWith('55') && digitsOnly.length >= 12) {
    return digitsOnly;
  }
  
  // Add country code 55 if not present
  return `55${digitsOnly}`;
};

/**
 * Format amount to 2 decimal places
 * @param amount - Numeric amount
 * @returns String with 2 decimal places (e.g., "1.00")
 */
const formatAmount = (amount: number): string => {
  return amount.toFixed(2);
};

/**
 * Generate a short TXID
 * Format: "LB" + 10 random alphanumeric characters
 * Max 25 characters as per PIX spec
 * @returns Generated TXID
 */
const generateTxid = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'LB';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Build PIX BR Code payload following EMV specification
 * 
 * Structure:
 * - 00: Payload Format Indicator = "01"
 * - 01: Point of Initiation Method = "12" (static)
 * - 26: Merchant Account Information
 *   - 00: GUI = "br.gov.bcb.pix"
 *   - 01: PIX Key (phone without +, with DDI 55)
 *   - 02: Description (optional, max 25 chars)
 * - 52: Merchant Category Code = "0000"
 * - 53: Transaction Currency = "986" (BRL)
 * - 54: Transaction Amount (2 decimal places)
 * - 58: Country Code = "BR"
 * - 59: Merchant Name (max 25 chars)
 * - 60: Merchant City (max 15 chars)
 * - 62: Additional Data Field Template
 *   - 05: TXID (max 25 chars)
 * - 63: CRC16 (calculated over entire payload including "6304")
 */
export const buildPixPayload = (params: PixPayloadParams): { payload: string; crc: string } => {
  const {
    pixKeyPhone,
    merchantName,
    merchantCity,
    amount,
    description,
    txid,
  } = params;

  // Normalize and sanitize all inputs
  const normalizedPhone = normalizePhoneKey(pixKeyPhone);
  const safeMerchantName = sanitizeMerchantName(merchantName);
  const safeMerchantCity = sanitizeMerchantCity(merchantCity);
  const formattedAmount = formatAmount(amount);
  const safeTxid = txid ? txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) : generateTxid();

  // Build Merchant Account Information (ID 26)
  let merchantAccountInfo = '';
  merchantAccountInfo += makeTLV('00', 'br.gov.bcb.pix');  // GUI
  merchantAccountInfo += makeTLV('01', normalizedPhone);   // PIX Key (phone)
  
  // Add description if provided
  if (description) {
    const safeDescription = sanitizeDescription(description);
    if (safeDescription.length > 0) {
      merchantAccountInfo += makeTLV('02', safeDescription);
    }
  }

  // Build Additional Data Field Template (ID 62)
  const additionalDataField = makeTLV('05', safeTxid);

  // Build complete payload (without CRC)
  let payload = '';
  payload += makeTLV('00', '01');                          // Payload Format Indicator
  payload += makeTLV('01', '12');                          // Point of Initiation Method (static)
  payload += makeTLV('26', merchantAccountInfo);           // Merchant Account Information
  payload += makeTLV('52', '0000');                        // Merchant Category Code
  payload += makeTLV('53', '986');                         // Transaction Currency (BRL)
  payload += makeTLV('54', formattedAmount);               // Transaction Amount
  payload += makeTLV('58', 'BR');                          // Country Code
  payload += makeTLV('59', safeMerchantName);              // Merchant Name
  payload += makeTLV('60', safeMerchantCity);              // Merchant City
  payload += makeTLV('62', additionalDataField);           // Additional Data Field Template
  payload += '6304';                                        // CRC field prefix (ID 63, length 04)

  // Calculate CRC16 over the entire payload including "6304"
  const crc = calculateCRC16CCITT(payload);
  
  // Append CRC to complete the payload
  const completePayload = payload + crc;

  return {
    payload: completePayload,
    crc,
  };
};

/**
 * Generate complete PIX payload with QR Code
 * Main function to be used for PIX payments
 */
export const generatePixPayload = async (params: {
  beneficiario: string;
  cidade: string;
  valor: number;
  txid: string;
  descricao?: string;
  chavePix?: string;
}): Promise<PixPayloadResult> => {
  const {
    beneficiario,
    cidade,
    valor,
    txid,
    descricao,
    chavePix,
  } = params;

  // If no PIX key provided, return empty result
  if (!chavePix) {
    console.warn('PIX key not provided');
    return {
      payload: '',
      qrCodeBase64: '',
      crc: '',
      copiaECola: '',
    };
  }

  // Build the PIX payload
  const { payload, crc } = buildPixPayload({
    pixKeyPhone: chavePix,
    merchantName: beneficiario,
    merchantCity: cidade,
    amount: valor,
    description: descricao,
    txid: txid,
  });

  // Generate QR Code as base64
  let qrCodeBase64 = '';
  try {
    qrCodeBase64 = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
  }

  return {
    payload,
    qrCodeBase64,
    crc,
    copiaECola: payload,
  };
};

/**
 * Validate PIX payload structure
 * @param payload - PIX payload string to validate
 * @returns Validation result with any errors
 */
export const validatePixPayload = (payload: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!payload) {
    errors.push('Payload is empty');
    return { valid: false, errors };
  }

  // Check basic structure
  if (!payload.startsWith('00020101')) {
    errors.push('Invalid payload format indicator');
  }

  // Check if CRC is present (last 4 characters after 6304)
  if (!payload.includes('6304')) {
    errors.push('CRC field not found');
  } else {
    const crcIndex = payload.lastIndexOf('6304');
    const declaredCRC = payload.substring(crcIndex + 4, crcIndex + 8);
    const payloadForCRC = payload.substring(0, crcIndex + 4);
    const calculatedCRC = calculateCRC16CCITT(payloadForCRC);
    
    if (declaredCRC !== calculatedCRC) {
      errors.push(`CRC mismatch: expected ${calculatedCRC}, got ${declaredCRC}`);
    }
  }

  // Check for PIX GUI
  if (!payload.includes('br.gov.bcb.pix')) {
    errors.push('PIX GUI not found');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Export helper functions for testing
export {
  makeTLV,
  calculateCRC16CCITT,
  normalizePhoneKey,
  sanitizeMerchantName,
  sanitizeMerchantCity,
  sanitizeDescription,
  formatAmount,
  generateTxid,
};
