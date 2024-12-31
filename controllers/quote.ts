import { quoteRequestBodySchema } from "@fiatconnect/fiatconnect-types"
import { Response } from "express"
import { v4 as uuidv4 } from "uuid"
import { getCurrentExchangeIn, validateEntries } from "../helpers"
import QuoteModel from "../models/QuoteModel"
import { validateZodSchema } from "../schema"

export async function getQuoteOut(req: any, res: Response) {
  try {
    const entryValidationResult = validateEntries(req.body)

    if (entryValidationResult?.error)
      return res.status(400).json(entryValidationResult)

    const body = validateZodSchema(req.body, quoteRequestBodySchema)

    if (entryValidationResult)
      return res.status(400).json(entryValidationResult)

    // const response = await quoteInHelper(body)
    const response = {}

    res.status(200).json(response)
  } catch (err: any) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}

export async function getQuoteIn(req: any, res: Response) {
  try {
    const entryValidationResult = validateEntries(req.body)

    if (entryValidationResult?.error)
      return res.status(400).json(entryValidationResult)

    const body = validateZodSchema(req.body, quoteRequestBodySchema)

    const { total, charge, expiry } = await getCurrentExchangeIn(
      body.fiatAmount,
      body.fiatType
    )

    const quote = {
      fiatType: body.fiatType,
      cryptoType: body.cryptoType,
      fiatAmount: body.fiatAmount?.toString(),
      country: body.country,
      address: body.address,
      fee: charge.toString(),
      cryptoAmount: body.cryptoAmount?.toString(),
      guaranteedUntil: expiry.toString(),
      transferType: "TransferIn",
      quoteId: uuidv4(),
    }

    // Save the quote to the database
    const savedQuote = await QuoteModel.create(quote)

    const response = {
      fiatType: body.fiatType,
      cryptoType: body.cryptoType,
      fiatAmount: body.fiatAmount?.toString(),
      cryptoAmount: total.toString(),
      address: body.address,
      guaranteedUntil: expiry.toString(),
      transferType: "TransferIn",
      quoteId: savedQuote.quoteId,
      kyc: {
        kycRequired: false,
      },
      fiatAccount: {
        MobileMoney: {
          fiatAccountSchemas: {
            fiatAccountSchema: `MobileMoney`,
            userActionType: "URLUserAction",
          },
        },
      },
    }

    res.status(200).json(response)
  } catch (err: any) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}
