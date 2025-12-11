/**
 * Sepay Service - Bank Transfer Integration
 * Docs: https://docs.sepay.vn
 */

const axios = require('axios');
const QRCode = require('qrcode');

class SepayService {
  constructor() {
    // API Key - only use SEPAY_API_KEY, no fallback to avoid confusion
    this.apiKey = process.env.SEPAY_API_KEY;
    if (!this.apiKey) {
      throw new Error(
        'SEPAY_API_KEY environment variable is required. Please set it in your .env file.'
      );
    }

    this.merchantId = process.env.SEPAY_MERCHANT_ID;

    // Base URL from env var with default
    this.baseURL = process.env.SEPAY_API_BASE_URL || 'https://my.sepay.vn/userapi';
    this.qrBaseURL = process.env.SEPAY_QR_BASE_URL || 'https://qr.sepay.vn';

    this.accountNumber = process.env.SEPAY_ACCOUNT_NUMBER;
    this.accountName = process.env.SEPAY_ACCOUNT_NAME;
    if (!process.env.SEPAY_BANK_CODE) {
      throw new Error(
        'SEPAY_BANK_CODE environment variable is required. Please set it in your .env file.'
      );
    }
    if (!process.env.SEPAY_BANK_NAME) {
      throw new Error(
        'SEPAY_BANK_NAME environment variable is required. Please set it in your .env file.'
      );
    }
    this.bankCode = process.env.SEPAY_BANK_CODE;
    this.bankName = process.env.SEPAY_BANK_NAME;

    // Log để verify (chỉ hiện 10 ký tự đầu để bảo mật)
    console.log(
      '[CONFIG] Sepay API Key loaded:',
      this.apiKey ? this.apiKey.substring(0, 15) + '...' : 'NOT SET'
    );
    console.log('[CONFIG] Sepay Merchant ID:', this.merchantId || 'NOT SET');
    console.log('[BANK] Bank Account:', this.accountNumber, '-', this.bankName);
  }

  /**
   * Generate transfer content with unique code
   * Format: SEVQR GYMFIT {orderId}
   * Note: VietinBank requires 'SEVQR' prefix for Sepay to receive transaction notifications
   */
  generateTransferContent(orderId) {
    return `SEVQR GYMFIT ${orderId}`;
  }

  /**
   * Generate QR code for bank transfer
   * Using Sepay QR service (qr.sepay.vn)
   */
  async generateQRCode(amount, transferContent, orderId) {
    try {
      // Sepay QR URL format: {QR_BASE_URL}/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG
      const sepayQRUrl = `${this.qrBaseURL}/img?acc=${this.accountNumber}&bank=${encodeURIComponent(
        this.bankName
      )}&amount=${amount}&des=${encodeURIComponent(transferContent)}`;

      console.log('[BANK] Sepay QR URL:', sepayQRUrl);

      // Download QR image từ Sepay và convert sang base64
      let qrCodeDataURL = '';
      try {
        const response = await axios.get(sepayQRUrl, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        qrCodeDataURL = `data:image/png;base64,${base64}`;
        console.log('[SUCCESS] Sepay QR code generated successfully');
      } catch (err) {
        console.error('[WARNING] Error downloading QR from Sepay:', err.message);
        // Fallback: Generate simple QR with bank info
        const fallbackData = `Bank: ${this.bankName}\nAccount: ${this.accountNumber}\nName: ${this.accountName}\nAmount: ${amount}\nContent: ${transferContent}`;
        qrCodeDataURL = await QRCode.toDataURL(fallbackData, {
          errorCorrectionLevel: 'H',
          width: 300,
        });
        console.log('[WARNING] Using fallback QR generation');
      }

      return {
        qrCodeUrl: sepayQRUrl,
        qrCodeDataURL: qrCodeDataURL,
        qrData: transferContent,
        transferInfo: {
          bankName: this.bankName,
          bankCode: this.bankCode,
          accountNumber: this.accountNumber,
          accountName: this.accountName,
          amount: amount,
          content: transferContent,
        },
      };
    } catch (error) {
      console.error('[ERROR] Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Get API headers
   */
  getHeaders() {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    // Add merchant ID if available
    if (this.merchantId) {
      headers['X-Merchant-Id'] = this.merchantId;
    }

    console.log('📤 Request headers:', {
      Authorization: headers.Authorization?.substring(0, 20) + '...',
      'X-Merchant-Id': headers['X-Merchant-Id'],
    });

    return headers;
  }

  /**
   * Get transaction details from Sepay
   */
  async getTransactionDetails(transactionId) {
    try {
      const response = await axios.get(`${this.baseURL}/transactions/details/${transactionId}`, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('Error getting transaction details:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get list of transactions
   * Filter by content, amount, date range
   */
  async getTransactions(params = {}) {
    try {
      const queryParams = {
        limit: params.limit || 20,
        offset: params.offset || 0,
        ...params,
      };

      const response = await axios.get(`${this.baseURL}/transactions/list`, {
        headers: this.getHeaders(),
        params: queryParams,
      });

      console.log(
        '[DATA] Sepay response structure:',
        JSON.stringify(response.data).substring(0, 500)
      );

      // Log first transaction structure for debugging
      if (response.data?.transactions?.[0]) {
        console.log('[LIST] First transaction fields:', Object.keys(response.data.transactions[0]));
        console.log('📄 First transaction sample:', JSON.stringify(response.data.transactions[0]));
      }

      // Handle different response structures
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.transactions) {
        return response.data.transactions;
      } else if (response.data?.data) {
        return response.data.data;
      } else {
        console.warn('[WARNING] Unexpected Sepay response structure:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error getting transactions:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Search for a specific transaction by content
   */
  async findTransactionByContent(transferContent, amount, fromDate) {
    try {
      const params = {
        content: transferContent,
        from_date: fromDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24h
        limit: 50,
      };

      const transactions = await this.getTransactions(params);

      console.log(`[STATS] Found ${transactions.length} transactions from Sepay`);

      // Extract transfer code for flexible matching
      const codeMatch = transferContent.match(/GYMFIT\s+([A-Z0-9]+)/i);
      const transferCode = codeMatch ? codeMatch[1] : transferContent;

      console.log('[SEARCH] Matching with code:', transferCode);

      // Filter by content (flexible) and amount
      // Allow tolerance for rounding: user can transfer slightly more (up to 5 VND) but not less
      const AMOUNT_TOLERANCE = 5.0; // Allow up to 5 VND difference for rounding
      const matchingTransaction = transactions.find(tx => {
        // Check content in transaction_content field
        const contentMatch = tx.transaction_content?.includes(transferCode);

        // Check amount (incoming transactions have amount_in > 0)
        const txAmount = parseFloat(tx.amount_in || 0);
        const amountDifference = txAmount - amount;

        // Allow if amount matches exactly or user transferred slightly more (rounding)
        // But don't allow if user transferred less than expected
        const amountMatch = Math.abs(amountDifference) <= AMOUNT_TOLERANCE && amountDifference >= 0;

        // Check if incoming (amount_in > 0, amount_out = 0)
        const isIncoming = txAmount > 0 && parseFloat(tx.amount_out || 0) === 0;

        console.log('  🔎 Checking tx:', {
          id: tx.id,
          content: tx.transaction_content,
          amount_in: tx.amount_in,
          amount_out: tx.amount_out,
          expectedAmount: amount,
          amountDifference: amountDifference.toFixed(2),
          contentMatch,
          amountMatch,
          isIncoming,
        });

        return contentMatch && amountMatch && isIncoming;
      });

      if (matchingTransaction) {
        console.log('[SUCCESS] Found matching transaction:', matchingTransaction.id);
      } else {
        console.log('[ERROR] No matching transaction found');
      }

      return matchingTransaction || null;
    } catch (error) {
      console.error('Error finding transaction:', error);
      return null;
    }
  }

  /**
   * Verify bank transfer
   * Check if payment was received with correct content and amount
   */
  async verifyTransfer(transferContent, expectedAmount, transactionDate) {
    try {
      console.log('[SEARCH] Verifying transfer:', {
        transferContent,
        expectedAmount,
        transactionDate,
      });

      // Search for transaction
      const transaction = await this.findTransactionByContent(
        transferContent,
        expectedAmount,
        transactionDate
      );

      if (!transaction) {
        console.log('[ERROR] Transaction not found');
        return {
          verified: false,
          message: 'Chưa tìm thấy giao dịch. Vui lòng kiểm tra lại hoặc thử lại sau.',
          transactionNotFound: true,
        };
      }

      console.log('[SUCCESS] Transaction found:', transaction);

      // Verify amount matches
      // Allow tolerance for rounding: user can transfer slightly more (up to 5 VND) but not less
      const AMOUNT_TOLERANCE = 5.0; // Allow up to 5 VND difference for rounding
      const receivedAmount = parseFloat(transaction.amount_in);
      const amountDifference = receivedAmount - expectedAmount;

      // Allow if amount matches exactly or user transferred slightly more (rounding)
      // But don't allow if user transferred less than expected
      const amountMatch = Math.abs(amountDifference) <= AMOUNT_TOLERANCE && amountDifference >= 0;

      if (!amountMatch) {
        console.log('[ERROR] Amount mismatch:', {
          expected: expectedAmount,
          received: receivedAmount,
          difference: amountDifference.toFixed(2),
          tolerance: AMOUNT_TOLERANCE,
        });
        return {
          verified: false,
          message:
            amountDifference < 0
              ? `Amount too low. Expected at least ${expectedAmount}, received ${receivedAmount}`
              : `Amount mismatch. Expected ${expectedAmount}, received ${receivedAmount}`,
          transaction,
        };
      }

      console.log('[SUCCESS] Amount verified:', {
        expected: expectedAmount,
        received: receivedAmount,
        difference: amountDifference.toFixed(2),
        withinTolerance: true,
      });

      return {
        verified: true,
        message: 'Transfer verified successfully',
        transaction: {
          id: transaction.id,
          amount: receivedAmount,
          content: transaction.transaction_content,
          bankTransactionId: transaction.bank_transaction_id,
          transactionDate: transaction.transaction_date,
        },
      };
    } catch (error) {
      console.error('Error verifying transfer:', error);
      return {
        verified: false,
        message: 'Verification error',
        error: error.message,
      };
    }
  }

  /**
   * Verify webhook signature from Sepay
   * @param {Object} webhookData - Webhook payload
   * @param {string} signature - Signature from X-Sepay-Signature header
   * @returns {boolean} - True if signature is valid
   */
  verifyWebhookSignature(webhookData, signature) {
    try {
      if (!signature) {
        console.warn('[WARNING] No signature provided in webhook');
        // In development, allow without signature; in production, require it
        if (process.env.NODE_ENV === 'production') {
          return false;
        }
        return true; // Allow in development
      }

      if (!this.apiKey) {
        console.error('[ERROR] SEPAY_API_KEY not configured');
        return false;
      }

      // Sepay signature verification (HMAC SHA256)
      const crypto = require('crypto');
      const payload = JSON.stringify(webhookData);
      const expectedSignature = crypto
        .createHmac('sha256', this.apiKey)
        .update(payload)
        .digest('hex');

      // Compare signatures (constant-time comparison to prevent timing attacks)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.error('[ERROR] Invalid webhook signature');
        console.log('Expected:', expectedSignature.substring(0, 20) + '...');
        console.log('Received:', signature.substring(0, 20) + '...');
      }

      return isValid;
    } catch (error) {
      console.error('[ERROR] Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Process Sepay webhook data
   */
  processWebhookData(webhookData) {
    try {
      // Sepay webhook structure (actual):
      // {
      //   "id": "27714363",
      //   "gateway": "VietinBank",
      //   "transactionDate": "2025-10-26 02:09:54",
      //   "accountNumber": "108875009219",
      //   "content": "CT DEN:394494097753 SEVQR GYMFIT CMH6NMCU",
      //   "transferType": "in",
      //   "transferAmount": 2000,
      //   "referenceCode": "901S25A18EWHR4M6"
      // }

      return {
        sepayTransactionId: webhookData.id,
        bankCode: webhookData.gateway,
        bankTransactionId: webhookData.referenceCode || webhookData.code,
        amount: parseFloat(webhookData.transferAmount || webhookData.amount_in || 0),
        content: webhookData.content || webhookData.transaction_content,
        transactionDate: webhookData.transactionDate || webhookData.transaction_date,
        referenceNumber: webhookData.referenceCode || webhookData.reference_number,
        fullData: webhookData,
      };
    } catch (error) {
      console.error('Error processing webhook data:', error);
      throw error;
    }
  }
}

module.exports = new SepayService();
