import { Router } from "express"
import {
  verifyClientKeyMiddleware,
  verifyIdempotencyKey,
  verifyWidgetRequest,
} from "../../authMiddleware/siweHandler"
import {
  getKotaniOrder,
  getKotaniWithdrawOrder,
} from "../../controllers/kotani/kotani-controllers"
import {
  getExchangeRate,
  getMinAndMaxAmounts,
  getPlatformRates,
  getPublicQuoteIn,
  getPublicQuoteOut,
  getSupportedAssets,
  getSupportedProviders,
} from "../../controllers/public/quote"
import {
  checkOnChainTransaction,
  publicTransferInHandler,
  publicTransferOutHandler,
  publicTransferStatusHandler,
  sendOrderPaidReminer,
} from "../../controllers/public/transfer"
import PayCrestController from "../../controllers/PayCrest/PayCrestController"
import { publicKYCStatusHandler } from "../../controllers/public/kyc"
import MetaMapController from "../../controllers/MetaMap/MetaMapController"

const router = Router()

// Public API endpoints
router.post("/quote-in", verifyClientKeyMiddleware, getPublicQuoteIn)
router.post("/quote-out", verifyClientKeyMiddleware, getPublicQuoteOut)

// Transfer In
router.post(
  "/transfer-in",
  verifyClientKeyMiddleware,
  verifyIdempotencyKey,
  publicTransferInHandler
)

router.post(
  "/transfer-out",
  verifyClientKeyMiddleware,
  verifyIdempotencyKey,
  publicTransferOutHandler
)
router.get(
  "/transfer/:transferId/",
  verifyClientKeyMiddleware,
  publicTransferStatusHandler
)

// KYC endpoint
router.get(
  "/kyc/status/:phoneNumber",
  verifyClientKeyMiddleware,
  publicKYCStatusHandler
)

// Order reminder
router.get(
  "/reminder/:transferId",
  verifyClientKeyMiddleware,
  sendOrderPaidReminer
)

router.get(
  "/kotani/status/:reference",
  verifyClientKeyMiddleware,
  getKotaniOrder
)

router.get(
  "/kotani/withdraw-status/:reference",
  verifyClientKeyMiddleware,
  getKotaniWithdrawOrder
)

router.post(
  "/tx",
  verifyClientKeyMiddleware,
  verifyWidgetRequest,
  checkOnChainTransaction
)

// Getter routes
router.get("/assets/:network", getSupportedAssets)
router.get("/providers/:country", getSupportedProviders)
router.get("/amounts/:country", getMinAndMaxAmounts)

// tx,
// transferId

// Dangerous routes
// router.get("/danger", deleteAll)

// Testing
router.post("/rates", verifyClientKeyMiddleware, getPlatformRates)
router.post("/exchange", verifyClientKeyMiddleware, getExchangeRate)

// router.post("/rates", calculatePlatformRates)
// router.get("/customers", changeNetworkToUppercase)
// router.post("/k/deposit", createKotaniDeposit)
// router.get("/k/customer/:customerKey", getKotaniCustomer)
// router.get("/k/customers", updateKotaniCustomer)

//Paycrest Endpoints Starts Here
router.get("/bank/:currency_code", PayCrestController.getSupportedBanks)
router.post("/bank/verify/account", PayCrestController.verifyAccountName)
router.post("/bank/web-hook", PayCrestController.webHook)

router.post("/paycrest/off-ramp", PayCrestController.offRamp)
router.get(
  "/paycrest/get-supported-networks",
  PayCrestController.getSupportedChainsAndToken
)
router.get(
  "/paycrest/get-rate/:token/:amount/:fiat",
  PayCrestController.getRate
)

router.post("/kyc-status", MetaMapController.checkUserKYCStatus)

export default router
