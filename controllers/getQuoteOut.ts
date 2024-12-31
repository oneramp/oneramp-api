import { quoteRequestBodySchema } from "@fiatconnect/fiatconnect-types"
import { Response } from "express"
import { v4 as uuidv4 } from "uuid"
import { getCurrentExchangeOut, validateEntries } from "../helpers"
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

    // Extract to new endpoint
    const { total, charge, expiry } = await getCurrentExchangeOut(
      body.cryptoAmount,
      body.fiatType
    )

    const quote = {
      fiatType: body.fiatType,
      cryptoType: body.cryptoType,
      fiatAmount: total.toString(),
      address: body.address,
      cryptoAmount: body.cryptoAmount?.toString(),
      county: body.country,
      fee: charge.toString(),
      guaranteedUntil: expiry.toString(),
      transferType: "TransferOut",
      quoteId: uuidv4(),
    }

    // Save the quote to the database
    const savedQuote = await QuoteModel.create(quote)

    const response = {
      quote: {
        fiatType: body.fiatType,
        cryptoType: body.cryptoType,
        fiatAmount: total.toString(),
        address: body.address,
        cryptoAmount: body.cryptoAmount?.toString(),
        country: body.country,
        guaranteedUntil: expiry.toString(),
        transferType: "TransferOut",
        quoteId: savedQuote.quoteId,
      },
      kyc: {
        kycRequired: false,
      },
      fiatAccount: {
        MobileMoney: {
          fiatAccountSchemas: [
            {
              fiatAccountSchema: "MobileMoney",
              userActionType: "URLUserAction",
            },
          ],
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
