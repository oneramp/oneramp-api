import { Router } from "express"
import { verifyMerchantKeys } from "../../authMiddleware/authAdmin"
import {
  confirmKotaniPayCallback,
  kotaniPayWithdrawCallback,
} from "../../controllers/kotani/kotani-controllers"
import {
  changeOrderStatus,
  confirmOrder,
  getOrders,
  walletPayment,
} from "../../controllers/merchants/orders"
import { payoutOrderManually } from "../../controllers/public/transfer"
const router = Router()

// Define the route
// router.get("/orders/:orderType/:status", verifyMerchantKeys, getOrders)
router.get("/orders/:status", verifyMerchantKeys, getOrders)

router.post("/change-status", verifyMerchantKeys, changeOrderStatus)

router.post("/wallet-payment", verifyMerchantKeys, walletPayment)

router.post("/confirm", verifyMerchantKeys, confirmOrder)

// webhook routes
router.post("/callback", confirmKotaniPayCallback) // TODO: Ask the kotani pay team to apply hashing headers to protect the endpoint by  middleware

router.post("/callback/withdraw", kotaniPayWithdrawCallback)

router.post("/tx", verifyMerchantKeys, payoutOrderManually)

// Temporary routes : TODO: Remove these routes
// router.post("/bcrypt", bcryptAccess) // TODO: Ask the kotani pay team to apply hashing headers to protect the endpoint by  middleware
// router.post("/re-bcrypt", bcryptAccessRead) // TODO: Ask the kotani pay team to apply hashing headers to protect the endpoint by  middleware
// router.post("/tx", payoutOrderManually)

// Blink routes TODO: Remove these routes
// router.get("/blink", getOneRampBlinkBalance)
// router.post("/blink", sendBlinkSats)

// Dangerous routes
// router.get("/danger", deleteAll)
export default router
