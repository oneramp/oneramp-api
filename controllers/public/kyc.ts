import { FiatConnectError } from "@fiatconnect/fiatconnect-types"
import { response, Response } from "express"
import KYCModel from "../../models/KYCModel"
import { kycLink } from "../../helpers"

export const publicKYCStatusHandler = async (req: any, res: Response) => {
  try {
    // Get the phonenumber from the params
    const { phoneNumber } = req.params

    if (!phoneNumber) {
      return res.status(400).json({ error: FiatConnectError.InvalidParameters })
    }

    // Check if KYC data already exists for the user
    const kycRecords = await KYCModel.findOne({
      phoneNumber: phoneNumber,
    })

    if (!kycRecords) {
      return res.status(404).json({
        error: FiatConnectError.ResourceNotFound,
        message: {
          reason:
            "KYC record not found, please create a new one using the link",
          link: kycLink,
        },
      })
    }

    return res.status(200).json({
      kycStatus: kycRecords.status,
    })
  } catch (error) {
    return res.status(400).json(error)
  }
}

export const createUserKYCWebhookHandler = async (req: any, res: Response) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: FiatConnectError.InvalidParameters })
    }

    const { step, eventName, flowId } = req.body

    return res.status(200).json({
      response: req.body,
      message: "KYC record created successfully",
    })
    // // Get the phonenumber from the params
  } catch (error) {
    return res.status(400).json(error)
  }
}
