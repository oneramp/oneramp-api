import {
  deleteFiatAccountRequestParamsSchema,
  postFiatAccountRequestBodySchema,
} from "@fiatconnect/fiatconnect-types"
import { Response } from "express"
import { validateFiatAccountEntries } from "../helpers"
import FiatAccountModel from "../models/FiatAccountModel"
import { validateZodSchema } from "../schema"

export async function createFiatAccount(req: any, res: Response) {
  try {
    const entryValidationResult = validateFiatAccountEntries(req.body)

    if (entryValidationResult?.error)
      return res.status(400).json(entryValidationResult)

    const { data, fiatAccountSchema } = validateZodSchema(
      req.body,
      postFiatAccountRequestBodySchema
    )

    const fiatAccount = await FiatAccountModel.findOne({
      accountName: req.body.data.accountName,
      mobile: req.body.data.mobile,
      institutionName: data.institutionName,
      operator: req.body.data.operator,
      fiatAccountType: data.fiatAccountType,
    })

    if (fiatAccount) {
      const response = {
        fiatAccountId: fiatAccount._id,
        accountName: fiatAccount.accountName,
        institutionName: fiatAccount.institutionName,
        fiatAccountType: fiatAccount.fiatAccountType,
        fiatAccountSchema: fiatAccountSchema,
      }
      return res.status(200).json(response)
    }

    const obj = {
      accountName: data.accountName,
      institutionName: data.institutionName,
      mobile: req.body.data.mobile,
      operator: req.body.data.operator,
      fiatAccountType: data.fiatAccountType,
    }

    // Save this to the database
    const newFiatAccount = await FiatAccountModel.create(obj)

    const response = {
      fiatAccountId: newFiatAccount._id,
      accountName: newFiatAccount.accountName,
      institutionName: newFiatAccount.institutionName,
      fiatAccountType: newFiatAccount.fiatAccountType,
      fiatAccountSchema: fiatAccountSchema,
    }
    // if (entryValidationResult)
    //   return res.status(400).json(entryValidationResult)

    return res.status(200).json(response)
  } catch (error) {
    return res.status(400).json(error)
  }
}

export async function deleteFiatAccount(req: any, res: Response) {
  try {
    const body = validateZodSchema(
      req.body,
      deleteFiatAccountRequestParamsSchema
    )

    const account = await FiatAccountModel.findById(body.fiatAccountId)

    if (!account) return res.status(404).json({ error: `ResourceNotFound` })

    // Fix for me here...
    await FiatAccountModel.findByIdAndDelete(body.fiatAccountId)

    const response = {}
    // if (entryValidationResult)
    //   return res.status(400).json(entryValidationResult)

    return res.status(200).json(response)
  } catch (error) {
    return res.status(400).json(error)
  }
}

export async function getClock(req: any, res: Response) {
  try {
    const serverTime = new Date()

    return res.status(200).json({ time: serverTime.toISOString() })
  } catch (error) {
    return res.status(400).json(error)
  }
}
