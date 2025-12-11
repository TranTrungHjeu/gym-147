const sepayService = require('../services/sepay.service');
const notificationService = require('../services/notification.service');
// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

class BankTransferController {
  /**
   * Create bank transfer for payment
   * POST /bank-transfers/create
   */
  async createBankTransfer(req, res) {
    try {
      const { payment_id, member_id, amount } = req.body;

      console.log('[BANK] Creating bank transfer:', { payment_id, member_id, amount });

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
        // Check if existing transfer is expired or in a final state
        const isExpired = new Date() > new Date(existingTransfer.expires_at);
        const isFinalState = ['EXPIRED', 'CANCELLED', 'FAILED', 'COMPLETED', 'VERIFIED'].includes(existingTransfer.status);
        
        // If expired or in final state, create a new bank transfer
        if (isExpired || isFinalState) {
          console.log('[BANK] Existing bank transfer is expired or in final state, creating new one:', {
            existingId: existingTransfer.id,
            status: existingTransfer.status,
            isExpired,
            expires_at: existingTransfer.expires_at,
          });
          
          // Update old transfer status to CANCELLED if not already in final state
          if (!isFinalState) {
            await prisma.bankTransfer.update({
              where: { id: existingTransfer.id },
              data: { status: 'CANCELLED' },
            });
            console.log('[BANK] Cancelled expired bank transfer:', existingTransfer.id);
          }
          
          // Continue to create new bank transfer below
        } else {
          // Return existing transfer info if still valid
          console.log('[SUCCESS] Bank transfer already exists and is still valid:', existingTransfer.id);
        return res.status(200).json({
          success: true,
          data: existingTransfer,
        });
        }
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

      console.log('[SUCCESS] Bank transfer created:', bankTransfer.id);

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
   * Get bank transfer by payment ID or bank transfer ID
   * GET /bank-transfers/:paymentId
   * Supports both payment_id and bank transfer id
   */
  async getBankTransfer(req, res) {
    try {
      const { paymentId } = req.params;

      console.log('[BANK_TRANSFER] Getting bank transfer for:', paymentId);

      // Try to find by payment_id first
      let bankTransfer = await prisma.bankTransfer.findUnique({
        where: { payment_id: paymentId },
        include: {
          payment: {
            include: {
              subscription: true,
            },
          },
        },
      });

      // If not found by payment_id, try to find by id (bank transfer ID)
      if (!bankTransfer) {
        console.log('[BANK_TRANSFER] Not found by payment_id, trying by id...');
        bankTransfer = await prisma.bankTransfer.findUnique({
          where: { id: paymentId },
          include: {
            payment: {
              include: {
                subscription: true,
              },
            },
          },
        });
      }

      if (!bankTransfer) {
        console.log('[BANK_TRANSFER] Bank transfer not found for:', paymentId);
        return res.status(404).json({
          success: false,
          message: 'Bank transfer not found',
        });
      }

      console.log('[BANK_TRANSFER] Bank transfer found:', bankTransfer.id);
      res.status(200).json({
        success: true,
        data: bankTransfer,
      });
    } catch (error) {
      console.error('[BANK_TRANSFER] Get bank transfer error:', error);
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

      console.log('[SEARCH] Verifying bank transfer:', id);

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

      console.log('[VERIFY] Bank transfer status:', {
        id: bankTransfer.id,
        status: bankTransfer.status,
        payment_status: bankTransfer.payment?.status,
        expires_at: bankTransfer.expires_at,
        is_expired: new Date() > new Date(bankTransfer.expires_at),
      });

      // Check if already in a final state (cannot be verified)
      if (bankTransfer.status === 'EXPIRED' || bankTransfer.status === 'CANCELLED' || bankTransfer.status === 'FAILED') {
        console.log('[VERIFY] Bank transfer is in final state, cannot verify:', bankTransfer.status);
        return res.status(400).json({
          success: false,
          message: `Transfer cannot be verified. Current status: ${bankTransfer.status}`,
          data: {
            status: bankTransfer.status,
            expires_at: bankTransfer.expires_at,
          },
        });
      }

      if (bankTransfer.status === 'COMPLETED' || bankTransfer.status === 'VERIFIED') {
        console.log('[VERIFY] Bank transfer already verified, returning early');
        // Ensure payment is also completed
        if (bankTransfer.payment && bankTransfer.payment.status !== 'COMPLETED') {
          console.log('[WARNING] BankTransfer verified but Payment not completed, fixing...');
          const fixedPayment = await prisma.payment.update({
            where: { id: bankTransfer.payment_id },
            data: {
              status: 'COMPLETED',
              processed_at: new Date(),
            },
            include: {
              subscription: {
                include: {
                  plan: true,
                },
              },
            },
          });

          // Update subscription if applicable
          if (bankTransfer.payment.subscription_id) {
            await prisma.subscription.update({
              where: { id: bankTransfer.payment.subscription_id },
              data: { status: 'ACTIVE' },
            });
            console.log('[SUCCESS] Subscription activated:', bankTransfer.payment.subscription_id);

            // Update member membership if subscription and plan exist
            // Reload subscription with latest plan data (important for upgrade cases)
            if (fixedPayment.subscription_id) {
              const updatedSubscription = await prisma.subscription.findUnique({
                where: { id: fixedPayment.subscription_id },
                include: {
                  plan: true, // Include plan to get latest plan type
                },
              });

              if (updatedSubscription && updatedSubscription.plan) {
                try {
                  const axios = require('axios');
                  const memberServiceUrl = process.env.MEMBER_SERVICE_URL;
                  console.log(
                    '[LINK] Updating membership for already-verified transfer, using URL:',
                    memberServiceUrl
                  );

                  // Get member to find user_id
                  const memberResponse = await axios.get(
                    `${memberServiceUrl}/members/${fixedPayment.member_id}`,
                    {
                      timeout: 5000,
                    }
                  );
                  const memberData = memberResponse.data?.data?.member || memberResponse.data?.data;

                  if (memberData && memberData.user_id) {
                    const updateResponse = await axios.post(
                      `${memberServiceUrl}/members/create-with-user`,
                      {
                        user_id: memberData.user_id,
                        membership_type: updatedSubscription.plan.type, // Use latest plan type from reloaded subscription
                        membership_start_date: updatedSubscription.start_date,
                        membership_end_date:
                          updatedSubscription.end_date || updatedSubscription.current_period_end,
                      },
                      {
                        timeout: 10000,
                      }
                    );

                    console.log(
                      `[SUCCESS] Member membership updated (already-verified): ${memberData.user_id} -> ${updatedSubscription.plan.type} (upgraded plan)`
                    );
                  }
                } catch (memberError) {
                  console.error(
                    '[ERROR] Failed to update member membership (already-verified):',
                    memberError.message
                  );
                }
              }
            }
          }

          console.log('[SUCCESS] Payment status fixed to COMPLETED');
        }

        return res.status(200).json({
          success: true,
          message: 'Transfer already verified',
          data: bankTransfer,
        });
      }

      // Check if expired (only if status is not already EXPIRED)
      if (bankTransfer.status !== 'EXPIRED' && new Date() > new Date(bankTransfer.expires_at)) {
        console.log('[VERIFY] Bank transfer expired, updating status to EXPIRED');
        await prisma.bankTransfer.update({
          where: { id },
          data: { status: 'EXPIRED' },
        });

        return res.status(400).json({
          success: false,
          message: 'Transfer window expired',
          data: {
            status: 'EXPIRED',
            expires_at: bankTransfer.expires_at,
          },
        });
      }

      // Verify with Sepay
      console.log('[VERIFY] Starting Sepay verification for bank transfer:', {
        id: bankTransfer.id,
        transfer_content: bankTransfer.transfer_content,
        amount: bankTransfer.amount,
        status: bankTransfer.status,
      });

      const verificationResult = await sepayService.verifyTransfer(
        bankTransfer.transfer_content,
        parseFloat(bankTransfer.amount),
        bankTransfer.created_at
      );

      console.log('[VERIFY] Verification result:', {
        verified: verificationResult.verified,
        message: verificationResult.message,
        transactionNotFound: verificationResult.transactionNotFound,
      });

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
          // Reload subscription with latest plan data (important for upgrade cases)
          const updatedSubscription = await prisma.subscription.findUnique({
            where: { id: bankTransfer.payment.subscription_id },
            include: {
              plan: true, // Include plan to get latest plan type
            },
          });

          if (updatedSubscription) {
            // Update subscription status to ACTIVE
            await prisma.subscription.update({
              where: { id: bankTransfer.payment.subscription_id },
              data: { status: 'ACTIVE' },
            });
            console.log('[SUCCESS] Subscription activated:', bankTransfer.payment.subscription_id);

            // Update member membership status and type with LATEST plan
            console.log('[UPGRADE] Updating membership with latest subscription plan:', {
              subscriptionId: updatedSubscription.id,
              planId: updatedSubscription.plan_id,
              planType: updatedSubscription.plan?.type,
              planName: updatedSubscription.plan?.name,
              memberId: updatedPayment.member_id,
              paymentType: updatedPayment.payment_type,
              paymentDescription: updatedPayment.description,
            });

            if (updatedSubscription.plan) {
              try {
                const axios = require('axios');
                if (!process.env.MEMBER_SERVICE_URL) {
                  throw new Error(
                    'MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.'
                  );
                }
                const memberServiceUrl = process.env.MEMBER_SERVICE_URL;
                console.log('[LINK] Using MEMBER_SERVICE_URL:', memberServiceUrl);

                // Get member to find user_id (payment.member_id is Member.id, not user_id)
                const membersEndpoint = memberServiceUrl.includes('/api')
                  ? `${memberServiceUrl}/members/${updatedPayment.member_id}`
                  : `${memberServiceUrl}/members/${updatedPayment.member_id}`;

                const memberResponse = await axios.get(membersEndpoint, {
                  timeout: 5000,
                });
                const memberData = memberResponse.data?.data?.member || memberResponse.data?.data;

                if (!memberData || !memberData.user_id) {
                  console.error('[ERROR] Cannot find user_id from member data:', memberData);
                  throw new Error('Member data does not contain user_id');
                }

                // Update member membership with LATEST plan type (important for upgrades)
                const createEndpoint = `${memberServiceUrl}/members/create-with-user`;
                console.log('📤 Calling member service to update membership (with latest plan):', {
                  endpoint: createEndpoint,
                  user_id: memberData.user_id,
                  membership_type: updatedSubscription.plan.type, // Use latest plan type
                  membership_start_date: updatedSubscription.start_date,
                  membership_end_date:
                    updatedSubscription.end_date || updatedSubscription.current_period_end,
                });

                const updateResponse = await axios.post(
                  createEndpoint,
                  {
                    user_id: memberData.user_id,
                    membership_type: updatedSubscription.plan.type, // Use latest plan type from reloaded subscription
                    membership_start_date: updatedSubscription.start_date,
                    membership_end_date:
                      updatedSubscription.end_date || updatedSubscription.current_period_end,
                  },
                  {
                    timeout: 10000,
                  }
                );

                console.log('[SUCCESS] Member membership update response:', {
                  status: updateResponse.status,
                  success: updateResponse.data?.success,
                  message: updateResponse.data?.message,
                  data: updateResponse.data?.data,
                });

                console.log(
                  `[SUCCESS] Member membership updated successfully: ${memberData.user_id} -> ${updatedSubscription.plan.type} (upgraded plan)`
                );
              } catch (memberError) {
                console.error('[ERROR] Failed to update member membership:', memberError.message);
                console.error('[ERROR] Error details:', {
                  message: memberError.message,
                  response: memberError.response?.data,
                  status: memberError.response?.status,
                  config: memberError.config?.url,
                });
                // Don't fail the verify - payment is still valid
              }
            } else {
              console.warn(
                '[WARNING] Cannot update membership: plan not found in reloaded subscription',
                {
                  subscriptionId: updatedSubscription.id,
                  planId: updatedSubscription.plan_id,
                }
              );
            }
          } else {
            console.warn('[WARNING] Cannot update membership: subscription not found', {
              subscriptionId: bankTransfer.payment.subscription_id,
            });
          }
        }

        // Update booking if payment is for CLASS_BOOKING
        if (updatedPayment.payment_type === 'CLASS_BOOKING' && updatedPayment.reference_id) {
          try {
            const axios = require('axios');
            if (!process.env.SCHEDULE_SERVICE_URL) {
              throw new Error(
                'SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.'
              );
            }
            const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL;

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
              '[SUCCESS] Booking payment confirmed via manual verify:',
              updatedPayment.reference_id
            );
          } catch (bookingError) {
            console.error(
              '[ERROR] Failed to confirm booking payment via manual verify:',
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

        console.log('[SUCCESS] Transfer verified and payment completed');

        return res.status(200).json({
          success: true,
          message: 'Transfer verified successfully',
          data: updatedTransfer,
        });
      } else {
        // Check if transaction was not found (vs other verification failures)
        const isTransactionNotFound = verificationResult.transactionNotFound === true;
        
        console.log('[VERIFY] Verification failed:', {
          isTransactionNotFound,
          message: verificationResult.message,
          currentStatus: bankTransfer.status,
        });
        
        // Only update to CHECKING if it's not a "not found" error
        // If transaction not found, keep status as PENDING so user can retry
        if (!isTransactionNotFound) {
          await prisma.bankTransfer.update({
            where: { id },
            data: { status: 'CHECKING' },
          });
          console.log('[VERIFY] Updated status to CHECKING');
        } else {
          console.log('[VERIFY] Transaction not found, keeping status as PENDING');
        }

        const responseMessage = verificationResult.message || 'Chưa tìm thấy giao dịch. Vui lòng kiểm tra lại hoặc thử lại sau.';
        
        console.log('[VERIFY] Returning response:', {
          success: false,
          message: responseMessage,
          checking: !isTransactionNotFound,
          transactionNotFound: isTransactionNotFound,
        });

        return res.status(202).json({
          success: false,
          message: responseMessage,
          checking: !isTransactionNotFound, // Only set checking if not "not found"
          transactionNotFound: isTransactionNotFound,
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
        console.log('[WARNING] Not a GymFit transfer, ignoring');
        return res.status(200).json({ success: true, message: 'Ignored' });
      }

      // Extract transfer code (e.g., "CMH6NEGX" from "CT DEN:031403605841 SEVQR GYMFIT CMH6NEGX")
      const codeMatch = transferContent.match(/GYMFIT\s+([A-Z0-9]+)/i);
      const transferCode = codeMatch ? codeMatch[1] : null;

      if (!transferCode) {
        console.log('[WARNING] Cannot extract transfer code from content:', transferContent);
        return res.status(200).json({ success: true, message: 'Invalid format' });
      }

      console.log('[SEARCH] Extracted transfer code:', transferCode);

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
        console.log('[WARNING] No matching bank transfer found');
        return res.status(200).json({ success: true, message: 'No match' });
      }

      console.log('[SUCCESS] Found matching bank transfer:', bankTransfer.id);

      // Verify amount
      const amountMatch = Math.abs(transaction.amount - parseFloat(bankTransfer.amount)) < 0.01;

      if (!amountMatch) {
        console.log('[ERROR] Amount mismatch:', {
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

      console.log('[SEARCH] Payment before update:', {
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

      console.log('[SUCCESS] Payment updated:', {
        id: updatedPayment.id,
        payment_type: updatedPayment.payment_type,
        reference_id: updatedPayment.reference_id,
        status: updatedPayment.status,
      });

      // Update subscription if applicable
      if (bankTransfer.payment.subscription_id) {
        // Reload subscription with latest plan data (important for upgrade cases)
        const updatedSubscription = await prisma.subscription.findUnique({
          where: { id: bankTransfer.payment.subscription_id },
          include: {
            plan: true, // Include plan to get latest plan type
          },
        });

        if (updatedSubscription) {
          // Update subscription status to ACTIVE
          await prisma.subscription.update({
            where: { id: bankTransfer.payment.subscription_id },
            data: { status: 'ACTIVE' },
          });

          console.log('[SUCCESS] Subscription activated:', bankTransfer.payment.subscription_id);

          // Update member membership status and type with LATEST plan
          if (updatedSubscription.plan) {
            try {
              const axios = require('axios');
              if (!process.env.MEMBER_SERVICE_URL) {
                throw new Error(
                  'MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.'
                );
              }
              const memberServiceUrl = process.env.MEMBER_SERVICE_URL;

              // Get member to find user_id (payment.member_id is Member.id, not user_id)
              const memberResponse = await axios.get(
                `${memberServiceUrl}/members/${updatedPayment.member_id}`,
                {
                  timeout: 5000,
                }
              );
              const memberData = memberResponse.data?.data?.member || memberResponse.data?.data;

              if (!memberData || !memberData.user_id) {
                console.error('[ERROR] Cannot find user_id from member data:', memberData);
                throw new Error('Member data does not contain user_id');
              }

              // Update member membership with LATEST plan type (important for upgrades)
              await axios.post(
                `${memberServiceUrl}/members/create-with-user`,
                {
                  user_id: memberData.user_id,
                  membership_type: updatedSubscription.plan.type, // Use latest plan type from reloaded subscription
                  membership_start_date: updatedSubscription.start_date,
                  membership_end_date:
                    updatedSubscription.end_date || updatedSubscription.current_period_end,
                },
                {
                  timeout: 10000,
                }
              );

              console.log(
                `[SUCCESS] Member membership updated via Sepay webhook: ${memberData.user_id} -> ${updatedSubscription.plan.type} (upgraded plan)`
              );
            } catch (memberError) {
              console.error(
                '[ERROR] Failed to update member membership via Sepay webhook:',
                memberError.message
              );
              console.error('Error details:', memberError.response?.data || memberError.message);
              // Don't fail the webhook - payment is still valid
            }
          }
        }

        // Notify admins about successful subscription payment
        try {
          console.log(
            '[NOTIFY] Notifying admins about subscription payment success (bank transfer)...'
          );
          if (!process.env.SCHEDULE_SERVICE_URL) {
            throw new Error(
              'SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.'
            );
          }
          if (!process.env.MEMBER_SERVICE_URL) {
            throw new Error(
              'MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.'
            );
          }
          const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL;
          const memberServiceUrl = process.env.MEMBER_SERVICE_URL;

          // Get subscription and plan info
          const subscription = await prisma.subscription.findUnique({
            where: { id: bankTransfer.payment.subscription_id },
            include: { plan: true },
          });

          // Get member info if available
          let memberInfo = null;
          try {
            const memberResponse = await axios.get(
              `${memberServiceUrl}/members/${updatedPayment.member_id}`,
              {
                timeout: 5000,
              }
            );
            memberInfo = memberResponse.data?.data?.member || memberResponse.data?.data;
          } catch (memberInfoError) {
            // Try to get by user_id if member_id fails
            try {
              if (!process.env.IDENTITY_SERVICE_URL) {
                throw new Error(
                  'IDENTITY_SERVICE_URL environment variable is required. Please set it in your .env file.'
                );
              }
              const identityServiceUrl = process.env.IDENTITY_SERVICE_URL;
              const userResponse = await axios.get(
                `${identityServiceUrl}/users/${updatedPayment.member_id}`,
                {
                  timeout: 5000,
                }
              );
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
          console.log(
            '[SUCCESS] Successfully notified admins about subscription payment (bank transfer)'
          );
        } catch (notifyError) {
          console.error(
            '[ERROR] Failed to notify admins about subscription payment (bank transfer):',
            notifyError.message
          );
        }

        // Create payment notification for member
        try {
          const userId = memberInfo?.user_id || updatedPayment.member_id;
          await notificationService.createPaymentNotification({
            userId,
            paymentId: updatedPayment.id,
            amount: parseFloat(updatedPayment.amount),
            status: 'SUCCESS',
            paymentMethod: 'BANK_TRANSFER',
            subscriptionId: subscription?.id || null,
          });

          // Create subscription renewal notification if applicable
          if (subscription) {
            await notificationService.createSubscriptionNotification({
              userId,
              subscriptionId: subscription.id,
              planName: subscription.plan?.name || 'Gói đăng ký',
              planType: subscription.plan?.type || 'BASIC',
              action: 'renewed',
            });
          }
        } catch (notificationError) {
          console.error(
            '[ERROR] Error creating payment/subscription notification:',
            notificationError
          );
          // Don't fail the webhook if notification fails
        }
      }

      // Update booking if payment is for CLASS_BOOKING
      if (updatedPayment.payment_type === 'CLASS_BOOKING' && updatedPayment.reference_id) {
        try {
          const axios = require('axios');
          if (!process.env.SCHEDULE_SERVICE_URL) {
            throw new Error(
              'SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.'
            );
          }
          const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL;

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

          console.log('[SUCCESS] Webhook: Booking payment confirmed:', updatedPayment.reference_id);
          console.log('[SUCCESS] Webhook: Confirm response:', confirmResponse.data);
        } catch (bookingError) {
          console.error('[ERROR] Webhook: Failed to confirm booking payment:', {
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
        console.log('[WARNING] Webhook: Not a CLASS_BOOKING payment or missing reference_id', {
          payment_type: updatedPayment.payment_type,
          reference_id: updatedPayment.reference_id,
        });
      }

      console.log('[SUCCESS] Payment completed via bank transfer');

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
