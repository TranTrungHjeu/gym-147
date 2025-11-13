const { PrismaClient } = require('@prisma/client');
const sepayService = require('../services/sepay.service');

const prisma = new PrismaClient();

class BankTransferController {
  /**
   * Create bank transfer for payment
   * POST /bank-transfers/create
   */
  async createBankTransfer(req, res) {
    try {
      const { payment_id, member_id, amount } = req.body;

      console.log('🏦 Creating bank transfer:', { payment_id, member_id, amount });

      // Validate input
      if (!payment_id || !member_id || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: payment_id, member_id, amount',
        });
      }

      // Check if payment exists
      const payment = await prisma.payment.findUnique({
        where: { id: payment_id },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      // Check if bank transfer already exists
      const existingTransfer = await prisma.bankTransfer.findUnique({
        where: { payment_id },
      });

      if (existingTransfer) {
        // Return existing transfer info
        console.log('✅ Bank transfer already exists:', existingTransfer.id);
        return res.status(200).json({
          success: true,
          data: existingTransfer,
        });
      }

      // Generate transfer content with unique order ID
      const orderId = payment_id.substring(0, 8).toUpperCase();
      const transferContent = sepayService.generateTransferContent(orderId);

      // Generate QR code
      const qrCodeInfo = await sepayService.generateQRCode(amount, transferContent, orderId);

      // Create bank transfer record
      const bankTransfer = await prisma.bankTransfer.create({
        data: {
          payment_id,
          member_id,
          transfer_content: transferContent,
          amount,
          status: 'PENDING',
          bank_name: qrCodeInfo.transferInfo.bankName,
          bank_code: qrCodeInfo.transferInfo.bankCode,
          account_number: qrCodeInfo.transferInfo.accountNumber,
          account_name: qrCodeInfo.transferInfo.accountName,
          qr_code_url: qrCodeInfo.qrCodeUrl,
          qr_data: qrCodeInfo.qrData,
          expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        },
      });

      console.log('✅ Bank transfer created:', bankTransfer.id);

      res.status(201).json({
        success: true,
        data: {
          ...bankTransfer,
          qrCodeDataURL: qrCodeInfo.qrCodeDataURL, // Include data URL for immediate display
        },
      });
    } catch (error) {
      console.error('Create bank transfer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create bank transfer',
        error: error.message,
      });
    }
  }

  /**
   * Get bank transfer by payment ID
   * GET /bank-transfers/:paymentId
   */
  async getBankTransfer(req, res) {
    try {
      const { paymentId } = req.params;

      const bankTransfer = await prisma.bankTransfer.findUnique({
        where: { payment_id: paymentId },
        include: {
          payment: {
            include: {
              subscription: true,
            },
          },
        },
      });

      if (!bankTransfer) {
        return res.status(404).json({
          success: false,
          message: 'Bank transfer not found',
        });
      }

      res.status(200).json({
        success: true,
        data: bankTransfer,
      });
    } catch (error) {
      console.error('Get bank transfer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get bank transfer',
        error: error.message,
      });
    }
  }

  /**
   * Check bank transfer status
   * Manually verify with Sepay API
   * POST /bank-transfers/:id/verify
   */
  async verifyBankTransfer(req, res) {
    try {
      const { id } = req.params;

      console.log('🔍 Verifying bank transfer:', id);

      const bankTransfer = await prisma.bankTransfer.findUnique({
        where: { id },
        include: {
          payment: {
            include: {
              subscription: {
                include: {
                  plan: true,
                },
              },
            },
          },
        },
      });

      if (!bankTransfer) {
        return res.status(404).json({
          success: false,
          message: 'Bank transfer not found',
        });
      }

      if (bankTransfer.status === 'COMPLETED' || bankTransfer.status === 'VERIFIED') {
        // Ensure payment is also completed
        if (bankTransfer.payment && bankTransfer.payment.status !== 'COMPLETED') {
          console.log('⚠️ BankTransfer verified but Payment not completed, fixing...');
          await prisma.payment.update({
            where: { id: bankTransfer.payment_id },
            data: {
              status: 'COMPLETED',
              processed_at: new Date(),
            },
          });

          // Update subscription if applicable
          if (bankTransfer.payment.subscription_id) {
            await prisma.subscription.update({
              where: { id: bankTransfer.payment.subscription_id },
              data: { status: 'ACTIVE' },
            });
          }

          console.log('✅ Payment status fixed to COMPLETED');
        }

        return res.status(200).json({
          success: true,
          message: 'Transfer already verified',
          data: bankTransfer,
        });
      }

      // Check if expired
      if (new Date() > new Date(bankTransfer.expires_at)) {
        await prisma.bankTransfer.update({
          where: { id },
          data: { status: 'EXPIRED' },
        });

        return res.status(400).json({
          success: false,
          message: 'Transfer window expired',
        });
      }

      // Verify with Sepay
      const verificationResult = await sepayService.verifyTransfer(
        bankTransfer.transfer_content,
        parseFloat(bankTransfer.amount),
        bankTransfer.created_at
      );

      if (verificationResult.verified) {
        // Update bank transfer
        const updatedTransfer = await prisma.bankTransfer.update({
          where: { id },
          data: {
            status: 'VERIFIED',
            verified_at: new Date(),
            verified_amount: parseFloat(verificationResult.transaction.amount),
            verified_content: verificationResult.transaction.content,
            bank_transaction_id: verificationResult.transaction.bankTransactionId,
            sepay_transaction_id: String(verificationResult.transaction.id),
            completed_at: new Date(),
          },
        });

        // Get payment with all details
        const paymentBeforeUpdate = await prisma.payment.findUnique({
          where: { id: bankTransfer.payment_id },
        });

        // Update payment status
        const updatedPayment = await prisma.payment.update({
          where: { id: bankTransfer.payment_id },
          data: {
            status: 'COMPLETED',
            transaction_id: verificationResult.transaction.bankTransactionId,
            processed_at: new Date(),
          },
        });

        // Update subscription status if applicable
        if (bankTransfer.payment.subscription_id) {
          await prisma.subscription.update({
            where: { id: bankTransfer.payment.subscription_id },
            data: { status: 'ACTIVE' },
          });
          console.log('✅ Subscription activated:', bankTransfer.payment.subscription_id);

          // Update member membership status and type
          if (bankTransfer.payment.subscription && bankTransfer.payment.subscription.plan) {
            try {
              const axios = require('axios');
              const memberServiceUrl = process.env.MEMBER_SERVICE_URL || 'http://localhost:3002';

              // Get user_id from payment member_id (which is actually Member.id)
              const memberResponse = await axios.get(`${memberServiceUrl}/members/${updatedPayment.member_id}`);
              const memberData = memberResponse.data.data.member;
              
              await axios.post(`${memberServiceUrl}/members/create-with-user`, {
                user_id: memberData.user_id,
                membership_type: bankTransfer.payment.subscription.plan.type,
                membership_start_date: bankTransfer.payment.subscription.start_date,
                membership_end_date: bankTransfer.payment.subscription.end_date,
              });
            } catch (memberError) {
              console.error('Failed to update member membership:', memberError.message);
              // Don't fail the verify - payment is still valid
            }
          }
        }

        // Update booking if payment is for CLASS_BOOKING
        if (updatedPayment.payment_type === 'CLASS_BOOKING' && updatedPayment.reference_id) {
          try {
            const axios = require('axios');
            const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3003';

            console.log(
              `Calling confirmBookingPayment for booking: ${updatedPayment.reference_id}`
            );
            await axios.post(
              `${scheduleServiceUrl}/bookings/${updatedPayment.reference_id}/confirm-payment`,
              {
                payment_id: updatedPayment.id,
                amount: parseFloat(updatedPayment.amount),
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            console.log(
              '✅ Booking payment confirmed via manual verify:',
              updatedPayment.reference_id
            );
          } catch (bookingError) {
            console.error(
              '❌ Failed to confirm booking payment via manual verify:',
              bookingError.response?.data || bookingError.message
            );
            console.error('Error details:', {
              status: bookingError.response?.status,
              statusText: bookingError.response?.statusText,
              data: bookingError.response?.data,
            });
            // Don't fail the verify - payment is still valid
          }
        }

        console.log('✅ Transfer verified and payment completed');

        return res.status(200).json({
          success: true,
          message: 'Transfer verified successfully',
          data: updatedTransfer,
        });
      } else {
        // Update status to CHECKING
        await prisma.bankTransfer.update({
          where: { id },
          data: { status: 'CHECKING' },
        });

        return res.status(202).json({
          success: false,
          message: verificationResult.message || 'Transfer not found yet',
          checking: true,
        });
      }
    } catch (error) {
      console.error('Verify bank transfer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify bank transfer',
        error: error.message,
      });
    }
  }

  /**
   * Sepay Webhook Handler
   * POST /bank-transfers/webhook/sepay
   */
  async handleSepayWebhook(req, res) {
    try {
      const webhookData = req.body;

      console.log('📨 Received Sepay webhook:', webhookData);

      // Process webhook data
      const transaction = sepayService.processWebhookData(webhookData);

      // Extract transfer content to find matching bank transfer
      const transferContent = transaction.content;

      if (!transferContent || !transferContent.includes('GYMFIT')) {
        console.log('⚠️ Not a GymFit transfer, ignoring');
        return res.status(200).json({ success: true, message: 'Ignored' });
      }

      // Extract transfer code (e.g., "CMH6NEGX" from "CT DEN:031403605841 SEVQR GYMFIT CMH6NEGX")
      const codeMatch = transferContent.match(/GYMFIT\s+([A-Z0-9]+)/i);
      const transferCode = codeMatch ? codeMatch[1] : null;

      if (!transferCode) {
        console.log('⚠️ Cannot extract transfer code from content:', transferContent);
        return res.status(200).json({ success: true, message: 'Invalid format' });
      }

      console.log('🔍 Extracted transfer code:', transferCode);

      // Find bank transfer by code (flexible matching)
      const bankTransfer = await prisma.bankTransfer.findFirst({
        where: {
          transfer_content: {
            contains: transferCode,
          },
          status: {
            in: ['PENDING', 'CHECKING'],
          },
        },
        include: { payment: true },
      });

      if (!bankTransfer) {
        console.log('⚠️ No matching bank transfer found');
        return res.status(200).json({ success: true, message: 'No match' });
      }

      console.log('✅ Found matching bank transfer:', bankTransfer.id);

      // Verify amount
      const amountMatch = Math.abs(transaction.amount - parseFloat(bankTransfer.amount)) < 0.01;

      if (!amountMatch) {
        console.log('❌ Amount mismatch:', {
          expected: bankTransfer.amount,
          received: transaction.amount,
        });

        await prisma.bankTransfer.update({
          where: { id: bankTransfer.id },
          data: {
            status: 'FAILED',
            notes: `Amount mismatch: expected ${bankTransfer.amount}, received ${transaction.amount}`,
            sepay_webhook_data: webhookData,
          },
        });

        return res.status(200).json({ success: true, message: 'Amount mismatch' });
      }

      // Update bank transfer
      await prisma.bankTransfer.update({
        where: { id: bankTransfer.id },
        data: {
          status: 'VERIFIED',
          verified_at: new Date(),
          verified_amount: parseFloat(transaction.amount),
          verified_content: transaction.content,
          bank_transaction_id: transaction.bankTransactionId,
          sepay_transaction_id: String(transaction.sepayTransactionId),
          sepay_webhook_data: webhookData,
          completed_at: new Date(),
        },
      });

      // Get payment with all details first to check payment_type and reference_id
      const paymentBeforeUpdate = await prisma.payment.findUnique({
        where: { id: bankTransfer.payment_id },
      });

      console.log('🔍 Payment before update:', {
        id: paymentBeforeUpdate?.id,
        payment_type: paymentBeforeUpdate?.payment_type,
        reference_id: paymentBeforeUpdate?.reference_id,
        status: paymentBeforeUpdate?.status,
      });

      // Update payment
      const updatedPayment = await prisma.payment.update({
        where: { id: bankTransfer.payment_id },
        data: {
          status: 'COMPLETED',
          transaction_id: transaction.bankTransactionId,
          gateway: 'SEPAY',
          processed_at: new Date(),
        },
      });

      console.log('✅ Payment updated:', {
        id: updatedPayment.id,
        payment_type: updatedPayment.payment_type,
        reference_id: updatedPayment.reference_id,
        status: updatedPayment.status,
      });

      // Update subscription if applicable
      if (bankTransfer.payment.subscription_id) {
        await prisma.subscription.update({
          where: { id: bankTransfer.payment.subscription_id },
          data: { status: 'ACTIVE' },
        });

        console.log('✅ Subscription activated:', bankTransfer.payment.subscription_id);

        // Notify admins about successful subscription payment
        try {
          console.log('📢 Notifying admins about subscription payment success (bank transfer)...');
          const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3003';
          const memberServiceUrl = process.env.MEMBER_SERVICE_URL || 'http://localhost:3002';
          
          // Get subscription and plan info
          const subscription = await prisma.subscription.findUnique({
            where: { id: bankTransfer.payment.subscription_id },
            include: { plan: true },
          });

          // Get member info if available
          let memberInfo = null;
          try {
            const memberResponse = await axios.get(`${memberServiceUrl}/members/${updatedPayment.member_id}`, {
              timeout: 5000,
            });
            memberInfo = memberResponse.data?.data?.member || memberResponse.data?.data;
          } catch (memberInfoError) {
            // Try to get by user_id if member_id fails
            try {
              const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';
              const userResponse = await axios.get(`${identityServiceUrl}/users/${updatedPayment.member_id}`, {
                timeout: 5000,
              });
              memberInfo = userResponse.data?.data?.user || userResponse.data?.data;
            } catch (userInfoError) {
              console.log('Could not fetch member/user info for notification');
            }
          }

          // Call schedule service to notify admins
          await axios.post(
            `${scheduleServiceUrl}/notifications/subscription-payment-success`,
            {
              payment_id: updatedPayment.id,
              member_id: updatedPayment.member_id,
              user_id: memberInfo?.user_id || updatedPayment.member_id,
              amount: parseFloat(updatedPayment.amount),
              plan_type: subscription?.plan?.type || null,
              plan_name: subscription?.plan?.name || null,
              member_name: memberInfo?.full_name || memberInfo?.firstName || null,
              member_email: memberInfo?.email || null,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );
          console.log('✅ Successfully notified admins about subscription payment (bank transfer)');
        } catch (notifyError) {
          console.error('❌ Failed to notify admins about subscription payment (bank transfer):', notifyError.message);
          // Don't fail the webhook if notification fails
        }
      }

      // Update booking if payment is for CLASS_BOOKING
      if (updatedPayment.payment_type === 'CLASS_BOOKING' && updatedPayment.reference_id) {
        try {
          const axios = require('axios');
          const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3003';

          console.log(
            `Webhook: Calling confirmBookingPayment for booking: ${updatedPayment.reference_id}`
          );
          console.log(
            `Webhook: Payment ID: ${updatedPayment.id}, Amount: ${parseFloat(
              updatedPayment.amount
            )}`
          );

          const confirmResponse = await axios.post(
            `${scheduleServiceUrl}/bookings/${updatedPayment.reference_id}/confirm-payment`,
            {
              payment_id: updatedPayment.id,
              amount: parseFloat(updatedPayment.amount),
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000, // 10 seconds timeout
            }
          );

          console.log('✅ Webhook: Booking payment confirmed:', updatedPayment.reference_id);
          console.log('✅ Webhook: Confirm response:', confirmResponse.data);
        } catch (bookingError) {
          console.error('❌ Webhook: Failed to confirm booking payment:', {
            bookingId: updatedPayment.reference_id,
            error: bookingError.message,
            response: bookingError.response?.data,
            status: bookingError.response?.status,
            statusText: bookingError.response?.statusText,
            stack: bookingError.stack,
          });
          // Don't fail the webhook - payment is still valid
        }
      } else {
        console.log('⚠️ Webhook: Not a CLASS_BOOKING payment or missing reference_id', {
          payment_type: updatedPayment.payment_type,
          reference_id: updatedPayment.reference_id,
        });
      }

      console.log('✅ Payment completed via bank transfer');

      // Respond to Sepay
      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      console.error('Sepay webhook error:', error);
      // Always return 200 to Sepay to avoid retries
      res.status(200).json({
        success: false,
        message: 'Webhook processing error',
        error: error.message,
      });
    }
  }

  /**
   * Cancel bank transfer
   * POST /bank-transfers/:id/cancel
   */
  async cancelBankTransfer(req, res) {
    try {
      const { id } = req.params;

      const bankTransfer = await prisma.bankTransfer.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: 'Cancelled by user',
        },
      });

      res.status(200).json({
        success: true,
        data: bankTransfer,
      });
    } catch (error) {
      console.error('Cancel bank transfer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel bank transfer',
        error: error.message,
      });
    }
  }
}

module.exports = new BankTransferController();
