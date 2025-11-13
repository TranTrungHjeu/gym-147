/**
 * Sepay Service - Bank Transfer Integration
 * Docs: https://docs.sepay.vn
 */

const axios = require('axios');
const QRCode = require('qrcode');

class SepayService {
  constructor() {
    this.apiKey = process.env.SEPAY_API_KEY || process.env.SEPAY_SECRET_KEY;
    this.merchantId = process.env.SEPAY_MERCHANT_ID;
    this.baseURL = 'https://my.sepay.vn/userapi';
    this.accountNumber = process.env.SEPAY_ACCOUNT_NUMBER;
    this.accountName = process.env.SEPAY_ACCOUNT_NAME;
    if (!process.env.SEPAY_BANK_CODE) {
      throw new Error('SEPAY_BANK_CODE environment variable is required. Please set it in your .env file.');
    }
    if (!process.env.SEPAY_BANK_NAME) {
      throw new Error('SEPAY_BANK_NAME environment variable is required. Please set it in your .env file.');
    }
    this.bankCode = process.env.SEPAY_BANK_CODE;
    this.bankName = process.env.SEPAY_BANK_NAME;

    // Log để verify (chỉ hiện 10 ký tự đầu để bảo mật)
    console.log(
      '🔑 Sepay API Key loaded:',
      this.apiKey ? this.apiKey.substring(0, 15) + '...' : 'NOT SET'
    );
    console.log('🆔 Sepay Merchant ID:', this.merchantId || 'NOT SET');
    console.log('🏦 Bank Account:', this.accountNumber, '-', this.bankName);
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
      // Sepay QR URL format: https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG
      const sepayQRUrl = `https://qr.sepay.vn/img?acc=${
        this.accountNumber
      }&bank=${encodeURIComponent(this.bankName)}&amount=${amount}&des=${encodeURIComponent(
        transferContent
      )}`;

      console.log('🏦 Sepay QR URL:', sepayQRUrl);

      // Download QR image từ Sepay và convert sang base64
      let qrCodeDataURL = '';
      try {
        const response = await axios.get(sepayQRUrl, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        qrCodeDataURL = `data:image/png;base64,${base64}`;
        console.log('✅ Sepay QR code generated successfully');
      } catch (err) {
        console.error('⚠️ Error downloading QR from Sepay:', err.message);
        // Fallback: Generate simple QR with bank info
        const fallbackData = `Bank: ${this.bankName}\nAccount: ${this.accountNumber}\nName: ${this.accountName}\nAmount: ${amount}\nContent: ${transferContent}`;
        qrCodeDataURL = await QRCode.toDataURL(fallbackData, {
          errorCorrectionLevel: 'H',
          width: 300,
        });
        console.log('⚠️ Using fallback QR generation');
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
      console.error('❌ Error generating QR code:', error);
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

      console.log('📥 Sepay response structure:', JSON.stringify(response.data).substring(0, 500));

      // Log first transaction structure for debugging
      if (response.data?.transactions?.[0]) {
        console.log('📋 First transaction fields:', Object.keys(response.data.transactions[0]));
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
        console.warn('⚠️ Unexpected Sepay response structure:', response.data);
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

      console.log(`📊 Found ${transactions.length} transactions from Sepay`);

      // Extract transfer code for flexible matching
      const codeMatch = transferContent.match(/GYMFIT\s+([A-Z0-9]+)/i);
      const transferCode = codeMatch ? codeMatch[1] : transferContent;

      console.log('🔍 Matching with code:', transferCode);

      // Filter by content (flexible) and amount
      const matchingTransaction = transactions.find(tx => {
        // Check content in transaction_content field
        const contentMatch = tx.transaction_content?.includes(transferCode);

        // Check amount (incoming transactions have amount_in > 0)
        const txAmount = parseFloat(tx.amount_in || 0);
        const amountMatch = Math.abs(txAmount - amount) < 0.01;

        // Check if incoming (amount_in > 0, amount_out = 0)
        const isIncoming = txAmount > 0 && parseFloat(tx.amount_out || 0) === 0;

        console.log('  🔎 Checking tx:', {
          id: tx.id,
          content: tx.transaction_content,
          amount_in: tx.amount_in,
          amount_out: tx.amount_out,
          contentMatch,
          amountMatch,
          isIncoming,
        });

        return contentMatch && amountMatch && isIncoming;
      });

      if (matchingTransaction) {
        console.log('✅ Found matching transaction:', matchingTransaction.id);
      } else {
        console.log('❌ No matching transaction found');
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
      console.log('🔍 Verifying transfer:', {
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
        console.log('❌ Transaction not found');
        return {
          verified: false,
          message: 'Transaction not found',
        };
      }

      console.log('✅ Transaction found:', transaction);

      // Verify amount matches
      const receivedAmount = parseFloat(transaction.amount_in);
      const amountMatch = Math.abs(receivedAmount - expectedAmount) < 0.01;

      if (!amountMatch) {
        console.log('❌ Amount mismatch:', {
          expected: expectedAmount,
          received: receivedAmount,
        });
        return {
          verified: false,
          message: 'Amount mismatch',
          transaction,
        };
      }

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
