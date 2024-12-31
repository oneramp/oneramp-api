import { Router } from "express"
import { getAssetQuoteIn } from "../../controllers/getQuoteIn"
import { sendOrderPaidNotification } from "../../controllers/orders"
import { getWebhookTransferStatus } from "../../controllers/transfer"
import {
  createFiatAccountHandler,
  createRawTransferInHelperHandler,
  createTransferInHelperHandler,
  createTransferOutHelperHandler,
  createUserKYCHandler,
  deleteFiatAccountHandler,
  deleteKYCRecordHandler,
  getAllFiatAccountsHandler,
  getKYCStatusHandler,
  getQuoteOutHelperHandler,
  getRawTransferStatusHandler,
  getRawWebhookTransferStatus,
  getTransferStatusHandler,
  quoteInHelperHandler,
} from "../../controllers/fiatconnect/handlers"
import { verifyFiatConnectAdmin } from "../../authMiddleware/authAdmin"
import {
  verifyClientKeyMiddleware,
  verifyWebhookKeyMiddleware,
} from "../../authMiddleware/siweHandler"

const router = Router()
// Fiat Connect
// Fiat Connect Admin routes
// These are called by the fiatConnect API server
router.post(
  "/quote/in",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  quoteInHelperHandler
)
router.post(
  "/quote/out",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  getQuoteOutHelperHandler
)

// Accounts
router.get("/accounts", verifyFiatConnectAdmin, getAllFiatAccountsHandler)
router.post("/accounts", verifyFiatConnectAdmin, createFiatAccountHandler)
router.delete(
  "/accounts/:fiatAccountId",
  verifyFiatConnectAdmin,
  deleteFiatAccountHandler
)
router.post(
  "/transfer/in",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  createTransferInHelperHandler
)
router.get(
  "/transfer/:transferId/status",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  getTransferStatusHandler
)
router.post(
  "/transfer/out",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  createTransferOutHelperHandler
)

// KYC
router.post(
  "/kyc",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  createUserKYCHandler
)
router.get(
  "/kyc",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  getKYCStatusHandler
)
router.delete(
  "/kyc",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  deleteKYCRecordHandler
)

// Webhooks
router.post(
  "/webhook",
  verifyFiatConnectAdmin,
  verifyWebhookKeyMiddleware,
  getWebhookTransferStatus
)

// Raw transfer routes
router.post(
  "/transfer/in",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  createRawTransferInHelperHandler
)
router.get(
  "/transfer/:transferId/status",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  getRawTransferStatusHandler
)
router.post(
  "/buy/trigger",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  sendOrderPaidNotification
)
router.post(
  "/webhook",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  getRawWebhookTransferStatus
)

// Bitcoin Lightning routes
router.post("/btc/quote/in", getAssetQuoteIn)

// Dangerous routes
// router.get("/danger", deleteAll)
export default router
