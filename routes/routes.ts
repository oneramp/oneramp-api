import { Router } from "express"
import { createUser, login } from "../controllers/auth"
import {
  createEmulator,
  getEmulator,
  getEmulatorMessages,
  sendEmulatorMomoMessage,
} from "../controllers/emulator"
import {
  createFiatAccount,
  deleteFiatAccount,
} from "../controllers/fiatAccount"
import { getAssetQuoteIn, getQuoteIn } from "../controllers/getQuoteIn"
import { getQuoteOut } from "../controllers/getQuoteOut"
import {
  confirmOrder,
  getActiveBuyOrders,
  getAllOrders,
  sendOrderPaidNotification,
  sendOrderPaidReminder,
} from "../controllers/orders"
import { siweLogin } from "../controllers/siweauth"
import {
  addStoreCallback,
  addStoreKYCEmail,
  confirmTransaction,
  createStore,
  createStoreUserKYC,
  getActiveStore,
  getAllStoreTransactions,
  getCreds,
  getLiveTransactions,
  getRawStoreAuth,
  getRawStoreCreds,
  getStorEnv,
  getStore,
  getStoreActivities,
  getStoreCreds,
  getStoreKYC,
  getStoreKYCUsers,
  getStoreTransactions,
  getStores,
  getTransaction,
  getTransactions,
  getUserEmailStore,
  getUserStore,
  getUserStoreKYCDetail,
  getWithdrawTxs,
  newStore,
  rejectUserKYC,
  removeStore,
  switchStoreEnviroment,
} from "../controllers/store"
import {
  createDeposit,
  createTransactionAPI,
  createWithdraw,
  getAllActivity,
  getDeposits,
  getWithdraw,
  openZepplinTrigger,
  removeActivity,
  removeDeposits,
  removeWithdraws,
} from "../controllers/transactions"
import {
  createTransfer,
  createTransferIn,
  getTransferStatus,
} from "../controllers/transfer"
import {
  authenticateOpenzepplinTriggers,
  verifyFiatConnectAdmin,
} from "../authMiddleware/authAdmin"
import {
  authenticateStoreSecrets,
  authenticateToken,
  authorizeRoute,
  verifyIdempotencyKey,
} from "../authMiddleware/authToken"
import {
  siweAuthMiddleware,
  verifyClientKeyMiddleware,
} from "../authMiddleware/siweHandler"
import { sendNotifTx } from "../sockets/sockets"
import {
  createRawTransferInHelperHandler,
  getRawTransferStatusHandler,
  getRawWebhookTransferStatus,
} from "../controllers/fiatconnect/handlers"
import { createToken } from "../controllers/mpesa/token/generateToken"
// import { mpesaPay } from "./Intasend/intasend"

const router = Router()

// Account routes
router.post("/user/auth/signup", createUser)
router.post("/user/auth/login", login)

// STORE ROUTER
// GET all stores owned by a userId
router.get("/stores", authorizeRoute, getUserStore)
router.get("/all-stores", getStores)

router.get("/store/active", authenticateToken, getActiveStore)
router.get("/store/env", authenticateToken, getStorEnv)

// Get store using store Id
router.get("/store/:userId", getStore)

// CREATE a new store
router.post("/stores", authenticateToken, createStore)
router.post("/store/create", newStore)

router.post("/store/email", getUserEmailStore)
router.put("/store/callback", authorizeRoute, addStoreCallback)

// delete
router.delete("/store/:storeId", authorizeRoute, removeStore)

// Store creds
router.get("/creds/:storeId", authorizeRoute, getStoreCreds)
router.post("/switch/", authorizeRoute, switchStoreEnviroment)

router.get("/creds/", authenticateStoreSecrets, getCreds)
router.get("/activity", authenticateStoreSecrets, getStoreActivities)
router.get("/all-txs", authenticateStoreSecrets, getAllStoreTransactions)
router.get("/store/creds", getRawStoreCreds)
router.get("/store/auth", getRawStoreAuth)
router.get("/store/tx/:storeId", authorizeRoute, getStoreTransactions)

router.get("/txs", getTransactions)
router.get("/tx/:transactionId", getTransaction)
router.get("/live-txs", getLiveTransactions)
router.get("/tx/live/withdraws", getWithdrawTxs)
router.post("/tx/confirm", confirmTransaction)

// Tx
router.post("/tx/create", createTransactionAPI)

// Analytics
router.get("/activity/:storeId", authorizeRoute, getAllActivity)

router.get("/deposit/:storeId", authorizeRoute, getDeposits)
router.post("/deposit/create", authorizeRoute, createDeposit)

router.get("/withdraw/:storeId", authorizeRoute, getWithdraw)
router.post("/withdraw/create", authorizeRoute, createWithdraw)

router.get("/del/deposit/:storeId", removeDeposits)
router.get("/del/withdraw/:storeId", removeWithdraws)
router.get("/del/activity/:storeId", removeActivity)

// APP KYC
router.post("/kyc", authorizeRoute, addStoreKYCEmail)
router.get("/kyc/:storeId", authenticateStoreSecrets, getStoreKYC)
router.get("/app-kyc/:storeId", authorizeRoute, getStoreKYC)
router.post("/user-kyc", authenticateStoreSecrets, createStoreUserKYC)
router.get("/user-kyc/:store", authorizeRoute, getStoreKYCUsers)
router.get("/user-kyc/info/:user", authorizeRoute, getUserStoreKYCDetail)
router.post("/reject-kyc", authenticateStoreSecrets, rejectUserKYC)

// Emulator
router.post("/emulator", authorizeRoute, createEmulator)
router.post("/emulator/messages", authorizeRoute, sendEmulatorMomoMessage)
router.get("/emulator/messages/:id", authorizeRoute, getEmulatorMessages)
router.get("/emulator/active/:storeId", authorizeRoute, getEmulator)

// Tx Notifications
router.post("/em", sendNotifTx)

// Orders
router.post("/orders", sendOrderPaidReminder)
router.get("/orders", getAllOrders)

// Admin Dashboard Orders Endpoints
router.get("/orders/buy", getActiveBuyOrders)
router.post("/orders/confirm", confirmOrder)

// Fiat Connect
// Clock

// SIWE endpoints
router.post("/auth/login", siweLogin)

// Account
router.post(
  "/accounts",
  siweAuthMiddleware,
  verifyClientKeyMiddleware,
  createFiatAccount
)

router.delete(
  "/accounts/:fiatAccountId",
  siweAuthMiddleware,
  verifyClientKeyMiddleware,
  deleteFiatAccount
)

// Quote
router.post("/quote/out", getQuoteOut)
router.post("/quote/in", getQuoteIn)

// Transfer
// In
router.post(
  "/transfer/in",
  siweAuthMiddleware,
  verifyClientKeyMiddleware,
  verifyIdempotencyKey,
  createTransferIn
)

// Out
router.post(
  "/transfer/out",
  siweAuthMiddleware,
  verifyClientKeyMiddleware,
  verifyIdempotencyKey,
  createTransfer
)

// router.post("/transfer/out", authenticateStoreSecrets, createTransfer)
router.get(
  "/transfer/:transferId/status",
  siweAuthMiddleware,
  verifyClientKeyMiddleware,
  getTransferStatus
)

// Triggers
router.post("/trigger", authenticateOpenzepplinTriggers, openZepplinTrigger)

// Ignore To be removed --->
// Raw transfer routes
router.post(
  "/raw/transfer/in",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  createRawTransferInHelperHandler
)
router.get(
  "/raw/transfer/:transferId/status",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  getRawTransferStatusHandler
)
router.post(
  "/raw/buy/trigger",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  sendOrderPaidNotification
)
router.post(
  "/raw/webhook",
  verifyFiatConnectAdmin,
  verifyClientKeyMiddleware,
  getRawWebhookTransferStatus
)

// Bitcoin Lightning routes
router.post("/btc/quote/in", getAssetQuoteIn)

router.get("/mpesa", createToken, (req, res) => {
  res.json({ message: "Hello from M-Pesa" });
})

// router.post("/initiatePayment", mpesaPay)

// Dangerous routes
// router.get("/danger", deleteAll)
export default router
