import { quoteRequestBodySchema } from "@fiatconnect/fiatconnect-types"
import { Response } from "express"
import { v4 as uuidv4 } from "uuid"
import {
  allowedAssets,
  localExchangeRates,
  mtnMomoCode,
  networkNames,
  supportedCountriesDetails,
  supportedNetwordAssets,
  supportedProviders,
} from "../../constants"
import {
  countryInfo,
  getBTCExchangeIn,
  getCurrentExchangeIn,
  MIN_MAX_CRYPTO_AMOUNTS,
  MIN_MAX_FIAT_AMOUNTS,
  PausedOffRampCountries,
  pausedOnMomoCountries,
  PausedOnRampCountries,
  supportedFiat,
  validateAsset,
  validateBTCEntries,
  validateEntries,
} from "../../helpers"
import { calculatePlatformRatesHelper } from "../../helpers/fiatconnect/handlers"
import QuoteModel from "../../models/QuoteModel"
import { validateZodSchema } from "../../schema"
import CustomerModel from "../../models/CustomerModel"

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

    if (!body.fiatType || !body.cryptoType || !body.country) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    const selectedCountry = countryInfo[body.country]

    if (selectedCountry.currency !== req.body.fiatType) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    if (body.fiatAmount && body.cryptoAmount) {
      return res.status(400).json({
        error: "InvalidParameters",
      })
    }

    // This handles paused transactions
    if (PausedOffRampCountries.includes(body.country)) {
      return res.status(400).json({
        error: "ServerError",
        message: "Contact support to resolve",
      })
    }

    const COUNTRY_CRYPTO_MINIMUM = MIN_MAX_CRYPTO_AMOUNTS[body.country].min
    const COUNTRY_CRYPTO_MAXIMUM = MIN_MAX_CRYPTO_AMOUNTS[body.country].max

    const COUNTRY_FIAT_MINIMUM = MIN_MAX_FIAT_AMOUNTS[body.country].min
    const COUNTRY_FIAT_MAXIMUM = MIN_MAX_FIAT_AMOUNTS[body.country].max

    // Define the minimum and maximum amounts to return in the response
    const minimumFiatAmount = COUNTRY_FIAT_MINIMUM
    const maximumFiatAmount = COUNTRY_FIAT_MAXIMUM
    const minimumCryptoAmount = COUNTRY_CRYPTO_MINIMUM
    const maximumCryptoAmount = COUNTRY_CRYPTO_MAXIMUM

    if (!supportedFiat.includes(body.fiatType)) {
      return res.status(400).json({
        error: "FiatNotSupported",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    if (body.cryptoAmount < COUNTRY_CRYPTO_MINIMUM) {
      return res.status(400).json({
        error: "CryptoAmountTooLow",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    if (
      body.cryptoAmount > COUNTRY_CRYPTO_MAXIMUM &&
      body.cryptoType !== "BTC"
    ) {
      return res.status(400).json({
        error: "CryptoAmountTooHigh",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    if (body.fiatAmount < COUNTRY_FIAT_MINIMUM) {
      return res.status(400).json({
        error: "FiatAmountTooLow",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    if (body.fiatAmount > COUNTRY_FIAT_MAXIMUM) {
      return res.status(400).json({
        error: "FiatAmountTooHigh",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    // const conversionResponse = await calculatePlatformRatesHelper(req, true)

    const conversionResponse = await calculatePlatformRatesHelper({
      ...req,
      orderType: "selling",
    })

    if (!conversionResponse || !conversionResponse.success) {
      return res.status(400).json({ error: "InvalidSchema" })
    }

    const {
      success,
      chargeFeeInFiat,
      chargeFeeInUsd,
      cryptoAmount,
      exchangeRate,
      fiatAmount,
      error,
      providerPayoutAmount,
    } = conversionResponse

    const chargeFee =
      body.cryptoType === "BTC" ? chargeFeeInFiat : chargeFeeInUsd

    if (!fiatAmount || !cryptoAmount || !chargeFee) {
      return res.status(400).json({ error: "InvalidSchema" })
    }

    // This checks if the user is paying in fiat or crypto
    const amountPaid = body.fiatAmount ? body.fiatAmount : body.cryptoAmount

    const requestType = body.fiatAmount ? "fiat" : "crypto"

    const quote = {
      fiatType: body.fiatType,
      cryptoType: body.cryptoType,
      fiatAmount: fiatAmount?.toString(),
      country: body.country,
      address: req.body.address,
      fee: chargeFee?.toString(),
      amountPaid: amountPaid.toString(), // This is what they're paying, depending on the type of transfer. It can be in fiat or crypto
      cryptoAmount: cryptoAmount.toString(), // This is what they're receiving in crypto
      guaranteedUntil: new Date().toISOString(),
      transferType: "TransferOut",
      quoteId: uuidv4(),
      network: body.network,
      providerAmount: providerPayoutAmount?.toString(),
      requestType,
    }

    let savedQuote = await QuoteModel.create(quote)

    // Remove the providerAmount field from the response
    savedQuote = savedQuote.toObject()
    delete savedQuote.providerAmount

    const response = {
      quote: savedQuote,
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
    const body = req.body

    const entryValidationResult = validateAsset(req.body)

    if (entryValidationResult?.error)
      return res.status(400).json(entryValidationResult)

    if (!body.fiatType || !body.cryptoType || !body.country) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    if (!body.address) {
      return res.status(400).json({ error: "InvalidSchema" })
    }

    const selectedCountry = countryInfo[body.country]

    if (selectedCountry.currency !== req.body.fiatType) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    // const ethAddressRegex = /^0x[a-fA-F0-9]{40,64}$/
    // const lightningAddressRegex =
    //   /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    // const lightningInvoiceRegex = /^ln[a-zA-Z0-9]+$/

    // // Check the address against the regex patterns
    // if (
    //   !ethAddressRegex.test(body.address) &&
    //   !lightningAddressRegex.test(body.address) &&
    //   !lightningInvoiceRegex.test(body.address)
    // ) {
    //   return res.status(400).json({ error: "InvalidAddress" })
    // }

    if (body.fiatAmount && body.cryptoAmount) {
      return res.status(400).json({
        error: "InvalidParameters",
      })
    }

    // This handles paused transactions
    if (PausedOnRampCountries.includes(body.country)) {
      return res.status(400).json({
        error: "ServerError",
        message: "Contact support to resolve",
      })
    }

    // Assuming MIN_MAX_CRYPTO_AMOUNTS and MIN_MAX_FIAT_AMOUNTS are defined and imported

    const COUNTRY_CRYPTO_MINIMUM = MIN_MAX_CRYPTO_AMOUNTS[body.country].min
    const COUNTRY_CRYPTO_MAXIMUM = MIN_MAX_CRYPTO_AMOUNTS[body.country].max

    const COUNTRY_FIAT_MINIMUM = MIN_MAX_FIAT_AMOUNTS[body.country].min
    const COUNTRY_FIAT_MAXIMUM = MIN_MAX_FIAT_AMOUNTS[body.country].max

    // Define the minimum and maximum amounts to return in the response
    const minimumFiatAmount = COUNTRY_FIAT_MINIMUM
    const maximumFiatAmount = COUNTRY_FIAT_MAXIMUM
    const minimumCryptoAmount = COUNTRY_CRYPTO_MINIMUM
    const maximumCryptoAmount = COUNTRY_CRYPTO_MAXIMUM

    // Validate crypto amount
    if (body.cryptoAmount < COUNTRY_CRYPTO_MINIMUM) {
      return res.status(400).json({
        error: "CryptoAmountTooLow",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    if (
      body.cryptoAmount > COUNTRY_CRYPTO_MAXIMUM &&
      body.cryptoType !== "BTC"
    ) {
      return res.status(400).json({
        error: "CryptoAmountTooHigh",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    // Validate fiat amount
    if (body.fiatAmount < COUNTRY_FIAT_MINIMUM) {
      return res.status(400).json({
        error: "FiatAmountTooLow",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    if (body.fiatAmount > COUNTRY_FIAT_MAXIMUM) {
      return res.status(400).json({
        error: "FiatAmountTooHigh",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    let conversionResult
    let savedQuote

    const conversionResponse = await calculatePlatformRatesHelper({
      ...req,
      orderType: "buying",
    })

    if (!conversionResponse || !conversionResponse.success) {
      return res.status(400).json({ error: "InvalidSchema" })
    }

    const {
      success,
      chargeFeeInFiat,
      chargeFeeInUsd,
      cryptoAmount,
      exchangeRate,
      fiatAmount,
      error,
      providerPayoutAmount,
    } = conversionResponse

    // Fixed starknet fee

    const chargeFee =
      body.cryptoType === "BTC" ? chargeFeeInFiat : chargeFeeInUsd

    if (!fiatAmount || !cryptoAmount || !chargeFee) {
      return res.status(400).json({ error: "InvalidSchema" })
    }

    // This checks if the user is paying in fiat or crypto
    const amountPaid = body.fiatAmount ? body.fiatAmount : body.cryptoAmount

    const quote = {
      fiatType: body.fiatType,
      cryptoType: body.cryptoType,
      fiatAmount: fiatAmount.toString(), // This is what they're receiving in converted in fiat
      country: body.country,
      address: req.body.address,
      fee: chargeFee.toString(),
      amountPaid: amountPaid.toString(), // This is what they're paying, depending on the type of transfer. It can be in fiat or crypto
      cryptoAmount: cryptoAmount.toString(), // This is what they're receiving in crypto
      guaranteedUntil: new Date().toISOString(),
      transferType: "TransferIn",
      quoteId: uuidv4(),
      network: body.network,
    }

    savedQuote = await QuoteModel.create(quote)

    // Kenya and TZ quote

    const response = {
      quote: savedQuote,
      kyc: {
        kycRequired: true,
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

export async function getPlatformRates(req: any, res: Response) {
  try {
    const body = req.body

    const entryValidationResult = validateAsset(req.body)

    if (entryValidationResult?.error)
      return res.status(400).json(entryValidationResult)

    if (!body.fiatType || !body.cryptoType || !body.country) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    const selectedCountry = countryInfo[body.country]

    if (selectedCountry.currency !== req.body.fiatType) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    if (body.fiatAmount && body.cryptoAmount) {
      return res.status(400).json({
        error: "InvalidParameters",
      })
    }

    // Assuming MIN_MAX_CRYPTO_AMOUNTS and MIN_MAX_FIAT_AMOUNTS are defined and imported

    const COUNTRY_CRYPTO_MINIMUM = MIN_MAX_CRYPTO_AMOUNTS[body.country].min
    const COUNTRY_CRYPTO_MAXIMUM = MIN_MAX_CRYPTO_AMOUNTS[body.country].max

    const COUNTRY_FIAT_MINIMUM = MIN_MAX_FIAT_AMOUNTS[body.country].min
    const COUNTRY_FIAT_MAXIMUM = MIN_MAX_FIAT_AMOUNTS[body.country].max

    // Define the minimum and maximum amounts to return in the response
    const minimumFiatAmount = COUNTRY_FIAT_MINIMUM
    const maximumFiatAmount = COUNTRY_FIAT_MAXIMUM
    const minimumCryptoAmount = COUNTRY_CRYPTO_MINIMUM
    const maximumCryptoAmount = COUNTRY_CRYPTO_MAXIMUM

    // Validate crypto amount
    if (body.cryptoAmount < COUNTRY_CRYPTO_MINIMUM) {
      return res.status(400).json({
        error: "CryptoAmountTooLow",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    if (
      body.cryptoAmount > COUNTRY_CRYPTO_MAXIMUM &&
      body.cryptoType !== "BTC"
    ) {
      return res.status(400).json({
        error: "CryptoAmountTooHigh",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    // Validate fiat amount
    if (body.fiatAmount < COUNTRY_FIAT_MINIMUM) {
      return res.status(400).json({
        error: "FiatAmountTooLow",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    if (body.fiatAmount > COUNTRY_FIAT_MAXIMUM) {
      return res.status(400).json({
        error: "FiatAmountTooHigh",
        minimumFiatAmount,
        maximumFiatAmount,
        minimumCryptoAmount,
        maximumCryptoAmount,
      })
    }

    const conversionResponse = await calculatePlatformRatesHelper({
      ...req,
      orderType: req.body.orderType,
    })

    if (!conversionResponse || !conversionResponse.success) {
      return res.status(400).json({ error: "InvalidSchema" })
    }

    const {
      success,
      chargeFeeInFiat,
      chargeFeeInUsd,
      cryptoAmount,
      exchangeRate,
      fiatAmount,
      error,
      providerPayoutAmount,
      gasFeeInFiat,
    } = conversionResponse

    // Fixed starknet fee

    const chargeFee =
      body.cryptoType === "BTC" ? chargeFeeInFiat : chargeFeeInUsd

    if (!fiatAmount || !cryptoAmount) {
      return res.status(400).json({ error: "InvalidSchema" })
    }

    // This checks if the user is paying in fiat or crypto
    const amountPaid = body.fiatAmount ? body.fiatAmount : body.cryptoAmount

    const transferType =
      body.orderType === "buying" ? "TransferIn" : "TransferOut"

    const quote = {
      fiatType: body.fiatType,
      cryptoType: body.cryptoType,
      fiatAmount: fiatAmount.toString(), // This is what they're receiving in converted in fiat
      country: body.country,
      fee: chargeFee ? chargeFee.toString() : "0",
      feeInFiat: chargeFeeInFiat.toString(),
      exchange: exchangeRate.toString(),
      amountPaid: amountPaid.toString(), // This is what they're paying, depending on the type of transfer. It can be in fiat or crypto
      cryptoAmount: cryptoAmount.toString(), // This is what they're receiving in crypto
      transferType: transferType,
      network: body.network,
      gasFeeInFiat: gasFeeInFiat && gasFeeInFiat.toString(),
      providerPayoutAmount: providerPayoutAmount?.toString(),
    }

    res.status(200).json(quote)
  } catch (err: any) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}

export async function getExchangeRate(req: any, res: Response) {
  try {
    const { country, orderType } = req.body

    // We're manually setting the cryptoAmount to 1 because we're only interested in the exchange rate ONLY
    req.body.cryptoAmount = 1

    const conversionResponse = await calculatePlatformRatesHelper({
      ...req,
      orderType: orderType,
    })

    if (!conversionResponse || !conversionResponse.success) {
      return res.status(400).json({ error: "InvalidSchema" })
    }

    return res.status(200).json({
      country: country,
      exchange: conversionResponse.exchangeRate,
      conversionResponse,
    })
  } catch (err: any) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}
export const getSupportedAssets = async (req: any, res: Response) => {
  try {
    const { network } = req.params

    if (!network) {
      return res.status(400).json({
        error: "InvalidParameters",
      })
    }

    if (!supportedNetwordAssets[network] as any) {
      return res.status(400).json({
        error: "NetworkNotSupported",
      })
    }

    const supportedAssets = supportedNetwordAssets[network] as any

    res.status(200).json(supportedAssets)
  } catch (err: any) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}

export const getSupportedProviders = async (req: any, res: Response) => {
  try {
    const { country } = req.params

    if (!country) {
      return res.status(400).json({
        error: "InvalidParameters",
      })
    }

    if (!supportedProviders[country] as any) {
      return res.status(400).json({
        error: "CountryNotSupported",
      })
    }

    const providers = supportedProviders[country] as any

    res.status(200).json(providers)
  } catch (err: any) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}

export const getMinAndMaxAmounts = async (req: any, res: Response) => {
  try {
    const { country } = req.params

    if (!country) {
      return res.status(400).json({
        error: "InvalidParameters",
      })
    }

    const countryDetails = supportedCountriesDetails[country]

    if (!countryDetails) {
      return res.status(400).json({
        error: "CountryNotSupported",
      })
    }

    if (
      !MIN_MAX_CRYPTO_AMOUNTS[countryDetails.code] ||
      !MIN_MAX_FIAT_AMOUNTS[countryDetails.code]
    ) {
      return res.status(400).json({
        error: "CountryNotSupported",
      })
    }

    const cryptoAmounts = MIN_MAX_CRYPTO_AMOUNTS[countryDetails.code]
    const fiatAmounts = MIN_MAX_FIAT_AMOUNTS[countryDetails.code]

    res.status(200).json({
      cryptoAmounts,
      fiatAmounts,
      currency: countryDetails.currency,
    })
  } catch (err: any) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}

export const changeNetworkToUppercase = async (req: any, res: Response) => {
  try {
    // Update all documents where network is "SAFARICOM" to "MPESA"
    await CustomerModel.updateMany(
      { network: "SAFARICOM" }, // Filter for documents where network is "SAFARICOM"
      {
        $set: {
          network: "MPESA", // Set the network to "MPESA"
        },
      }
    )

    res.status(200).json({
      message: "Networks updated from SAFARICOM to MPESA successfully",
    })
  } catch (err: any) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}
