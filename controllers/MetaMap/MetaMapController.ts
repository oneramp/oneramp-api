import { Request, Response } from "express"
import { BAD_REQUEST, OK } from "../../src/utils/status-codes"
import { HttpException } from "../../src/utils/http-exception"
import MetamapService from "./MetaMapService"

class MetaMapController {
  async receiveWebhook(req: Request, res: Response) {
    // acknowledge receipt of the webhook.
    res.sendStatus(OK)
    try {
      const { body, headers } = req

      const signatureHeader = headers["x-signature"]
      const signature = Array.isArray(signatureHeader)
        ? signatureHeader[0]
        : signatureHeader

      if (!signature)
        throw new HttpException(
          BAD_REQUEST,
          "Signature is missing from request"
        )

      const webhookPayload = MetamapService.validateWebhookPayload(
        signature,
        JSON.stringify(body)
      )

      // use valid webhook payload
      return await MetamapService.consumeWebhookPayload(webhookPayload)
    } catch (error: any) {
      // log error appropriately, since the webhook response code should always be 200.
      console.log(error)
    }
  }

  async checkUserKYCStatus(request: Request, response: Response) {
    try {
      const { email } = request.body

      if (!email) {
        return response.status(400).json({
          message: "Email is required",
        })
      }

      const user = await MetamapService.getUserByEmail(email)

      if (user) {
        return response.status(200).json({
          message: "User KYC info",
          data: {
            email: user?.email,
            kycStatus: user?.status?.toUpperCase(),
          },
        })
      } else {
        return response.status(200).json({
          message: "User not found",
        })
      }
    } catch (error) {
      return response.status(500).json({
        message: "Failed to retrived networks",
      })
    }
  }
}

export default new MetaMapController()
