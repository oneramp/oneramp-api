import { quoteRequestBodySchema } from "@fiatconnect/fiatconnect-types"
import { Response } from "express"
import { v4 as uuidv4 } from "uuid"
import {
  getBTCExchangeIn,
  getBTCExchangeOut,
  getCurrentExchangeIn,
  getDualCurrentExchangeIn,
  getDualCurrentExchangeOut,
  maximumCryptoAmount,
  maximumFiatAmount,
  minimumCryptoAmount,
  minimumFiatAmount,
  supportedFiat,
  validateAsset,
  validateBTCEntries,
  validateEntries,
} from "../helpers"
import QuoteModel from "../models/QuoteModel"
import { validateZodSchema } from "../schema"
import { mtnMomoCode } from "../constants"

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

export async function getAssetQuoteIn(req: any, res: Response) {
  try {
    const entryValidationResult = validateBTCEntries(req.body)

    if (entryValidationResult?.error)
      return res.status(400).json(entryValidationResult)

    // const body = validateZodSchema(req.body, quoteRequestBodySchema)

    const body = req.body

    const { total, charge, satsAmount, expiry } = await getBTCExchangeIn(
      body.fiatAmount,
      body.fiatType
    )

    // const { total, charge, satsAmount, expiry } = await getCurrentExchangeIn(

    const quote = {
      fiatType: body.fiatType,
      cryptoType: body.cryptoType,
      fiatAmount: total?.toString(),
      country: body.country,
      address: body.invoice,
      fee: charge.toString(),
      cryptoAmount: satsAmount?.toString(),
      guaranteedUntil: expiry,
      transferType: "TransferIn",
      phone: body.phone,
      quoteId: uuidv4(),
    }

    // Save the quote to the database
    const savedQuote = await QuoteModel.create(quote)

    const response = {
      quote: savedQuote,
      kyc: {
        kycRequired: false,
        kycSchemas: [
          {
            kycSchema: "PersonalDataAndDocuments",
            allowedValues: {
              isoCountryCode: ["UG", "KE"],
              isoRegionCode: ["UG", "KE"], // Example region codes
            },
          },
        ],
      },
      fiatAccount: {
        MobileMoney: {
          fiatAccountSchemas: [
            {
              fiatAccountSchema: "MobileMoney",
              userActionType: "AccountNumberUserAction",
              allowedValues: {
                country: ["UG", "KE"],
              },
              institutionName: "OneRamp",
              accountName: "OneRamp",
              accountNumber: mtnMomoCode, // <--- or change to Airtel according to the user selection
              transactionReference: `ref-${savedQuote._id}`,
              // deadline: deadline.toISOString(),
            },
          ],
          settlementTimeLowerBound: "3600", // 1 hour in seconds
          settlementTimeUpperBound: "86400", // 24 hours in seconds
        },
      },
    }

    // const response = {
    //   fiatType: body.fiatType,
    //   cryptoType: body.cryptoType,
    //   fiatAmount: body.fiatAmount?.toString(),
    //   cryptoAmount: total.toString(),
    //   address: body.address,
    //   guaranteedUntil: expiry.toString(),
    //   transferType: "TransferIn",
    //   quoteId: savedQuote.quoteId,
    //   kyc: {
    //     kycRequired: false,
    //   },
    //   fiatAccount: {
    //     MobileMoney: {
    //       fiatAccountSchemas: {
    //         fiatAccountSchema: `MobileMoney`,
    //         userActionType: "URLUserAction",
    //       },
    //     },
    //   },
    // }

    res.status(200).json(response)
  } catch (err: any) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}

// Public API Controllers

export async function getPublicQuoteOut(req: any, res: Response) {
  try {
    const entryValidationResult = validateAsset(req.body)

    if (entryValidationResult?.error)
      return res.status(400).json(entryValidationResult)

    const body = req.body

    if (
      !body.fiatType ||
      !body.cryptoType ||
      (!body.fiatAmount && !body.cryptoAmount) ||
      !body.country
    ) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    // if (body.cryptoType === "BTCLit" && !req.body.invoice) {
    //   return res.status(400).json({ error: "InvalidSchema" })
    // }

    if (body.fiatAmount && body.cryptoAmount) {
      return res.status(400).json({
        error: "InvalidParameters",
      })
    }

    if (!supportedFiat.includes(body.fiatType)) {
      return res.status(400).json({
        error: "FiatNotSupported",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.cryptoAmount < minimumCryptoAmount) {
      return res.status(400).json({
        error: "CryptoAmountTooLow",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.cryptoAmount > maximumCryptoAmount && body.cryptoType !== "BTC") {
      return res.status(400).json({
        error: "CryptoAmountTooHigh",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.fiatAmount < minimumFiatAmount) {
      return res.status(400).json({
        error: "FiatAmountTooLow",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.fiatAmount && body.fiatAmount < minimumFiatAmount) {
      return res.status(400).json({
        error: "FiatAmountTooLow",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.fiatAmount && body.fiatAmount > maximumFiatAmount) {
      return res.status(400).json({
        error: "FiatAmountTooHigh",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    let conversionResult
    let responseQuote

    if (body.fiatAmount) {
      conversionResult = await getDualCurrentExchangeIn(
        undefined,
        body.fiatAmount,
        body.fiatType
      )
    } else if (body.cryptoAmount) {
      conversionResult = await getDualCurrentExchangeIn(
        body.cryptoAmount,
        undefined,
        body.fiatType
      )
    }

    if (body.cryptoType === "BTCLit") {
      const { total, charge, satsAmount, expiry } = await getBTCExchangeOut(
        body.fiatAmount,
        body.fiatType
      )

      const quoteAddress = req.body.address || req.body.invoice

      // const { total, charge, satsAmount, expiry } = await getCurrentExchangeIn(
      responseQuote = {
        fiatType: body.fiatType,
        cryptoType: body.cryptoType,
        address: quoteAddress,
        country: body.country,
        fee: charge.toString(),
        feeType: "PlatformFee",
        feeFrequency: "OneTime",
        guaranteedUntil: expiry.toString(),
        transferType: "TransferOut",
        quoteId: uuidv4(),
      }

      if (body.fiatAmount) {
        responseQuote = {
          ...responseQuote,
          cryptoAmount: total.toString(),
          fiatAmount: Number(body.fiatAmount).toFixed(2),
        }
      } else if (body.cryptoAmount) {
        responseQuote = {
          ...responseQuote,
          fiatAmount: Number(total).toFixed(2).toString(),
          cryptoAmount: body.cryptoAmount,
        }
      } else {
        return res.status(400).json({ error: "InvalidParameters" })
      }

      // Save the quote to the database
      await QuoteModel.create(responseQuote)
    } else {
      if (body.fiatAmount) {
        conversionResult = await getDualCurrentExchangeOut(
          undefined,
          body.fiatAmount,
          body.fiatType
        )
      } else if (body.cryptoAmount) {
        conversionResult = await getDualCurrentExchangeOut(
          body.cryptoAmount,
          undefined,
          body.fiatType
        )
      }

      const { total, charge, expiry } = conversionResult

      responseQuote = {
        fiatType: body.fiatType,
        cryptoType: body.cryptoType,
        address: body.address,
        country: body.country,
        fee: charge.toString(),
        feeType: "PlatformFee",
        feeFrequency: "OneTime",
        guaranteedUntil: expiry.toString(),
        transferType: "TransferOut",
        quoteId: uuidv4(),
      }

      if (body.fiatAmount) {
        responseQuote = {
          ...responseQuote,
          cryptoAmount: total.toString(),
          fiatAmount: Number(body.fiatAmount).toFixed(2),
        }
      } else if (body.cryptoAmount) {
        responseQuote = {
          ...responseQuote,
          fiatAmount: Number(total).toFixed(2).toString(),
          cryptoAmount: body.cryptoAmount,
        }
      } else {
        return res.status(400).json({ error: "InvalidParameters" })
      }

      // Save the quote to the database
      await QuoteModel.create(responseQuote)
    }

    const response = {
      quote: responseQuote,
      kyc: {
        kycRequired: false,
        kycSchemas: [
          {
            kycSchema: "PersonalDataAndDocuments",
            allowedValues: {
              isoCountryCode: ["UG", "KE"],
              isoRegionCode: ["UG-01", "KE-02"],
            },
          },
        ],
      },
      fiatAccount: {
        MobileMoney: {
          fiatAccountSchemas: [
            {
              fiatAccountSchema: "MobileMoney",
              allowedValues: {
                country: ["UG", "KE"],
              },
            },
          ],
          settlementTimeLowerBound: "3600", // 1 hour in seconds
          settlementTimeUpperBound: "86400", // 24 hours in seconds
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

export async function getPublicQuoteIn(req: any, res: Response) {
  try {
    const entryValidationResult = validateAsset(req.body)

    if (entryValidationResult?.error)
      return res.status(400).json(entryValidationResult)

    const body = req.body

    if (
      !body.fiatType ||
      !body.cryptoType ||
      (!body.fiatAmount && !body.cryptoAmount) ||
      !body.country
    ) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    if (body.cryptoType === "BTCLit" && !req.body.invoice) {
      return res.status(400).json({ error: "InvalidSchema" })
    }

    if (body.fiatAmount && body.cryptoAmount) {
      return res.status(400).json({
        error: "InvalidParameters",
      })
    }

    if (!supportedFiat.includes(body.fiatType)) {
      return res.status(400).json({
        error: "FiatNotSupported",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.cryptoAmount < minimumCryptoAmount) {
      return res.status(400).json({
        error: "CryptoAmountTooLow",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.cryptoAmount > maximumCryptoAmount) {
      return res.status(400).json({
        error: "CryptoAmountTooHigh",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.fiatAmount < minimumFiatAmount) {
      return res.status(400).json({
        error: "FiatAmountTooLow",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.fiatAmount && body.fiatAmount < minimumFiatAmount) {
      return res.status(400).json({
        error: "FiatAmountTooLow",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.fiatAmount && body.fiatAmount > maximumFiatAmount) {
      return res.status(400).json({
        error: "FiatAmountTooHigh",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    let conversionResult
    let savedQuote

    if (body.fiatAmount) {
      conversionResult = await getDualCurrentExchangeIn(
        undefined,
        body.fiatAmount,
        body.fiatType
      )
    } else if (body.cryptoAmount) {
      conversionResult = await getDualCurrentExchangeIn(
        body.cryptoAmount,
        undefined,
        body.fiatType
      )
    }

    if (body.cryptoType === "BTCLit") {
      const { total, charge, satsAmount, expiry } = await getBTCExchangeIn(
        body.fiatAmount,
        body.fiatType
      )

      const quoteAddress = req.body.address || req.body.invoice

      // const { total, charge, satsAmount, expiry } = await getCurrentExchangeIn(
      const quote = {
        fiatType: body.fiatType,
        cryptoType: body.cryptoType,
        fiatAmount: total?.toString(),
        country: body.country,
        address: quoteAddress,
        fee: charge.toString(),
        cryptoAmount: satsAmount?.toString(),
        guaranteedUntil: expiry,
        transferType: "TransferIn",
        phone: body.phone,
        quoteId: uuidv4(),
      }

      // Save the quote to the database
      savedQuote = await QuoteModel.create(quote)
    } else {
      if (body.fiatAmount) {
        conversionResult = await getDualCurrentExchangeIn(
          undefined,
          body.fiatAmount,
          body.fiatType
        )
      } else if (body.cryptoAmount) {
        conversionResult = await getDualCurrentExchangeIn(
          body.cryptoAmount,
          undefined,
          body.fiatType
        )
      }

      const { total, charge, expiry } = conversionResult

      let responseQuote: any = {
        fiatType: body.fiatType,
        cryptoType: body.cryptoType,
        address: body.address,
        country: body.country,
        fee: charge.toString(),
        feeType: "PlatformFee",
        feeFrequency: "OneTime",
        guaranteedUntil: expiry.toString(),
        transferType: "TransferIn",
        quoteId: uuidv4(),
      }

      if (body.fiatAmount) {
        responseQuote = {
          ...responseQuote,
          cryptoAmount: total.toString(),
          fiatAmount: Number(body.fiatAmount).toFixed(2),
        }
      } else if (body.cryptoAmount) {
        responseQuote = {
          ...responseQuote,
          fiatAmount: Number(total).toFixed(2).toString(),
          cryptoAmount: body.cryptoAmount,
        }
      } else {
        return res.status(400).json({ error: "InvalidParameters" })
      }

      // Save the quote to the database
      savedQuote = await QuoteModel.create(responseQuote)
    }

    const response = {
      quote: savedQuote,
      kyc: {
        kycRequired: false,
        kycSchemas: [
          {
            kycSchema: "PersonalDataAndDocuments",
            allowedValues: {
              isoCountryCode: ["UG", "KE"],
              isoRegionCode: ["UG", "KE"], // Example region codes
            },
          },
        ],
      },
      fiatAccount: {
        MobileMoney: {
          fiatAccountSchemas: [
            {
              fiatAccountSchema: "MobileMoney",
              userActionType: "AccountNumberUserAction",
              allowedValues: {
                country: ["UG", "KE"],
              },
              institutionName: "OneRamp",
              accountName: "OneRamp",
              accountNumber: mtnMomoCode, // <--- or change to Airtel according to the user selection
              transactionReference: `ref-${savedQuote!._id}`,
              // deadline: deadline.toISOString(),
            },
          ],
          settlementTimeLowerBound: "3600", // 1 hour in seconds
          settlementTimeUpperBound: "86400", // 24 hours in seconds
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
