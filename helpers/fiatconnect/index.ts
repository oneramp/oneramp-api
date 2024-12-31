import { v4 as uuidv4 } from "uuid"
import { getCurrentExchangeIn } from ".."
import QuoteModel from "../../models/QuoteModel"

export const quoteInHelper = async (body: any) => {
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

  return response
}
