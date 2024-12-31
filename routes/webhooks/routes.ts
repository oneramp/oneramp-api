import { Router } from "express"
import MetaMapController from "../../controllers/MetaMap/MetaMapController"
const router = Router()

// KYC webhook routes
router.post("/kyc/", MetaMapController.receiveWebhook)

export default router
