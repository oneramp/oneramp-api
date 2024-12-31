import {
  FiatConnectError,
  deleteFiatAccountRequestParamsSchema,
  postFiatAccountRequestBodySchema,
  transferRequestBodySchema,
  transferStatusRequestParamsSchema,
} from "@fiatconnect/fiatconnect-types"
import { Response } from "express"
import { v4 as uuidv4 } from "uuid"
import addresses, {
  adminWalletAddress,
  airtelMomoCode,
  mtnMomoCode,
  networkAddressMap,
  platformCharge,
} from "../../constants"
import { listenToIncomingTxTransfer } from "../../events/onchain"
import {
  countryInfo,
  exchangeFromUSD,
  exchangeToUSD,
  getDualCurrentExchangeIn,
  getDualCurrentExchangeOut,
  getMerchantAccount,
  maximumCryptoAmount,
  maximumFiatAmount,
  minimumCryptoAmount,
  minimumFiatAmount,
  supportedAssets,
  supportedCountries,
  supportedFiat,
} from "../../helpers"
import FiatAccountModel from "../../models/FiatAccountModel"
import KYCModel from "../../models/KYCModel"
import OrdersModel from "../../models/OrderModel"
import QuoteModel from "../../models/QuoteModel"
import TransactionModel from "../../models/TransactionModel"
import TransferModel from "../../models/TransferModel"
import storeModel from "../../models/storeModel"
import { validateZodSchema } from "../../schema"
import { calculatePlatformRatesHelper } from "../../helpers/fiatconnect/handlers"

export const quoteInHelperHandler = async (req: any, res: Response) => {
  try {
    const body = req.body

    if (
      !body.fiatType ||
      !body.cryptoType ||
      (!body.fiatAmount && !body.cryptoAmount) ||
      !body.address ||
      !body.country
    ) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    const selectedCountry = countryInfo[body.country]

    if (selectedCountry.currency !== req.body.fiatType) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    // if (!supportedCountries.includes(body.region)) {
    //   return res.status(400).json({ error: "GeoNotSupported" })
    // }

    if (!supportedCountries.includes(body.country)) {
      return res.status(400).json({ error: "GeoNotSupported" })
    }

    if (!supportedAssets.includes(body.cryptoType)) {
      return res.status(400).json({
        error: "CryptoNotSupported",
      })
    }

    if (!supportedFiat.includes(body.fiatType)) {
      return res.status(400).json({
        error: "GeoNotSupported",
      })
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

    // let conversionResult

    // if (body.fiatAmount) {
    //   conversionResult = await getDualCurrentExchangeIn(
    //     undefined,
    //     body.fiatAmount,
    //     body.fiatType
    //   )
    // } else if (body.cryptoAmount) {
    //   conversionResult = await getDualCurrentExchangeIn(
    //     body.cryptoAmount,
    //     undefined,
    //     body.fiatType
    //   )
    // }

    // const { total, charge, expiry } = conversionResult

    const conversionResponse = await calculatePlatformRatesHelper(req)

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
    } = conversionResponse

    const currentDate = new Date()
    const expiryDate = new Date(currentDate)
    expiryDate.setDate(currentDate.getDate() + 7)

    // const quote = {
    //   fiatType: body.fiatType,
    //   cryptoType: body.cryptoType,
    //   fiatAmount: body.fiatAmount?.toString(),
    //   country: body.country,
    //   address: body.address,
    //   fee: charge.toString(),
    //   cryptoAmount: body.cryptoAmount?.toString(),
    //   guaranteedUntil: expiry.toString(),
    //   transferType: "TransferIn",
    //   quoteId: uuidv4(),
    // }

    let responseQuote: any = {
      fiatType: body.fiatType,
      cryptoType: body.cryptoType,
      address: body.address,
      country: body.country,
      fiatAmount: Number(fiatAmount).toFixed(2).toString(),
      cryptoAmount: cryptoAmount?.toString(),
      fee: chargeFeeInUsd?.toString(),
      feeType: "PlatformFee",
      feeFrequency: "OneTime",
      guaranteedUntil: expiryDate.getTime().toString(),
      transferType: "TransferIn",
      quoteId: uuidv4(),
    }

    // if (body.fiatAmount) {
    //   responseQuote = {
    //     ...responseQuote,
    //     cryptoAmount: total.toString(),
    //     fiatAmount: Number(body.fiatAmount).toFixed(2),
    //   }
    // } else if (body.cryptoAmount) {
    //   responseQuote = {
    //     ...responseQuote,
    //     fiatAmount: Number(total).toFixed(2).toString(),
    //     cryptoAmount: body.cryptoAmount,
    //   }
    // } else {
    //   return res.status(400).json({ error: "InvalidParameters" })
    // }

    // Save the quote to the database
    const savedQuote = await QuoteModel.create(responseQuote)

    // create a deadline of 24 hours from now
    // const deadline = new Date() // Now
    // deadline.setHours(deadline.getHours() + 24)

    const response = {
      quote: responseQuote,
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
              accountNumber: airtelMomoCode, // <--- or change to Airtel according to the user selection
              transactionReference: `ref-${savedQuote._id}`,
              // deadline: deadline.toISOString(),
            },
          ],
          settlementTimeLowerBound: "3600", // 1 hour in seconds
          settlementTimeUpperBound: "86400", // 24 hours in seconds
        },
      },
    }

    return res.status(200).json(response)
  } catch (error) {
    return res.status(400).json(error)
  }
}

export const getQuoteOutHelperHandler = async (req: any, res: Response) => {
  try {
    const body = req.body

    // Perform validations and throw appropriate errors
    if (
      !body.fiatType ||
      !body.cryptoType ||
      (!body.fiatAmount && !body.cryptoAmount) ||
      !body.address ||
      !body.country
    ) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    if (body.fiatAmount && body.cryptoAmount) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    const selectedCountry = countryInfo[body.country]

    if (selectedCountry.currency !== req.body.fiatType) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    if (!supportedCountries.includes(body.country)) {
      return res.status(400).json({ error: "GeoNotSupported" })
    }

    if (!supportedAssets.includes(body.cryptoType)) {
      return res.status(400).json({
        error: "CryptoNotSupported",
      })
    }

    if (!supportedFiat.includes(body.fiatType)) {
      return res.status(400).json({
        error: "GeoNotSupported",
      })
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

    if (body.cryptoAmount && body.cryptoAmount < minimumCryptoAmount) {
      return res.status(400).json({
        error: "CryptoAmountTooLow",
        minimumFiatAmount: minimumFiatAmount,
        maximumFiatAmount: maximumFiatAmount,
        minimumCryptoAmount: minimumCryptoAmount,
        maximumCryptoAmount: maximumCryptoAmount,
      })
    }

    if (body.cryptoAmount && body.cryptoAmount > maximumCryptoAmount) {
      return res.status(400).json({
        error: "CryptoAmountTooHigh",
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

    // if (body.fiatAmount) {
    //   conversionResult = await getDualCurrentExchangeOut(
    //     undefined,
    //     body.fiatAmount,
    //     body.fiatType
    //   )
    // } else if (body.cryptoAmount) {
    //   conversionResult = await getDualCurrentExchangeOut(
    //     body.cryptoAmount,
    //     undefined,
    //     body.fiatType
    //   )
    // }

    // const { total, charge, expiry } = conversionResult

    const conversionResponse = await calculatePlatformRatesHelper(req)

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
    } = conversionResponse

    const currentDate = new Date()
    const expiryDate = new Date(currentDate)
    expiryDate.setDate(currentDate.getDate() + 7)

    let responseQuote: any = {
      fiatType: body.fiatType,
      cryptoType: body.cryptoType,
      address: body.address,
      country: body.country,
      fiatAmount: Number(fiatAmount).toFixed(2).toString(),
      cryptoAmount: cryptoAmount?.toString(),
      fee: chargeFeeInUsd?.toString(),
      feeType: "PlatformFee",
      feeFrequency: "OneTime",
      guaranteedUntil: expiryDate.getTime().toString(),
      transferType: "TransferOut",
      quoteId: uuidv4(),
    }

    // if (body.fiatAmount) {
    //   responseQuote = {
    //     ...responseQuote,
    //     cryptoAmount: total.toString(),
    //     fiatAmount: Number(body.fiatAmount).toFixed(2),
    //   }
    // } else if (body.cryptoAmount) {
    //   responseQuote = {
    //     ...responseQuote,
    //     fiatAmount: Number(total).toFixed(2).toString(),
    //     cryptoAmount: body.cryptoAmount,
    //   }
    // } else {
    //   return res.status(400).json({ error: "InvalidParameters" })
    // }

    // Save the quote to the database
    await QuoteModel.create(responseQuote)

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

    return res.status(200).json(response)
  } catch (error) {
    return res.status(400).send(error)
  }
}

export const createFiatAccountHandler = async (req: any, res: Response) => {
  try {
    const { data, fiatAccountSchema } = validateZodSchema(
      req.body,
      postFiatAccountRequestBodySchema
    )

    const obj = {
      accountName: data.accountName,
      institutionName: data.institutionName,
      mobile: req.body.data.mobile,
      operator: req.body.data.operator,
      ethAddress: req.body.ethAddress,
      fiatAccountType: data.fiatAccountType,
    }

    // Check to if the reqion is supported
    if (!supportedCountries.includes(req.body.data.country))
      return res.status(400).json({ error: `GeoNotSupported` })

    const operator = getMerchantAccount(
      req.body.data.operator,
      req.body.data.country
    )

    if (!operator) return res.status(400).json({ error: `ResourceNotFound` })

    // Verify to see that the operator supports the country
    if (!operator.operationalCountries.includes(req.body.data.country))
      return res.status(400).json({ error: `GeoNotSupported` })

    // check if the account already exists
    const account = await FiatAccountModel.findOne({
      ethAddress: obj.ethAddress,
      accountName: obj.accountName,
      institutionName: obj.institutionName,
      mobile: obj.mobile,
      operator: obj.operator,
      fiatAccountType: obj.fiatAccountType,
    })

    if (account) return res.status(400).json({ error: `ResourceExists` })

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

export const deleteFiatAccountHandler = async (req: any, res: Response) => {
  try {
    const body = validateZodSchema(
      req.params,
      deleteFiatAccountRequestParamsSchema
    )

    const account = await FiatAccountModel.findById(body.fiatAccountId)

    if (!account) return res.status(404).json({ error: `ResourceNotFound` })

    // Fix for me here...
    await FiatAccountModel.findByIdAndDelete(body.fiatAccountId)

    const response = {}

    return res.status(200).json(response)
  } catch (error) {
    return res.status(400).json(error)
  }
}

export const getAllFiatAccountsHandler = async (req: any, res: Response) => {
  try {
    const accounts = await FiatAccountModel.find({
      ethAddress: req.body.ethAddress,
    })

    return res.status(200).json(accounts)
  } catch (error) {
    return res.status(400).json(error)
  }
}

export const createTransferInHelperHandler = async (
  req: any,
  res: Response
) => {
  try {
    const body = validateZodSchema(req.body, transferRequestBodySchema)

    let fiatAccount

    try {
      fiatAccount = await FiatAccountModel.findById(body.fiatAccountId)
    } catch (error: any) {
      if (error.name === "CastError") {
        return res.status(404).json({ error: "ResourceNotFound" })
      }
      throw error // Rethrow other errors
    }

    if (!fiatAccount) return res.status(404).json({ error: "ResourceNotFound" })

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: body.quoteId })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    if (quote.used) return res.status(400).json({ error: `InvalidQuote` })

    const operator = getMerchantAccount(fiatAccount.operator, quote.country)

    if (!operator) return res.status(400).json({ error: `ResourceNotFound` })

    // Check if the quote country is the same as the operator country
    if (!operator.operationalCountries.includes(quote.country))
      return res.status(400).json({ error: `InvalidQuote` })

    const { store } = req.store

    if (quote.transferType != `TransferIn`)
      return res.status(400).json({ error: `InvalidQuote` })

    const transfer = await TransferModel.findOne({ quote: quote.quoteId })

    if (transfer) return res.status(400).json({ error: `InvalidQuote` })

    const mainStore = await storeModel.findById(store)

    // Create a transfer table here....
    const transferData: any = {
      quote: quote.quoteId,
      status: "TransferStarted",
      address: addresses.celo.stable,
      operator: fiatAccount.operator,
    }

    const newTransfer = new TransferModel(transferData)

    // Save the transfer to the database
    const savedTransfer = await newTransfer.save()

    const phone =
      quote.cryptoType === "BTCLit" && quote.phone
        ? quote.phone
        : fiatAccount.mobile

    const newTransaction: any = {
      store: store,
      txHash: "initTxHash",
      amount: Number(quote.cryptoAmount),
      address: quote.address,
      fiat: Number(quote.fiatAmount),
      network: "Celo",
      operator: fiatAccount.operator,
      phone: phone,
      txType: "Deposit",
      asset: quote.cryptoType,
      status: "Pending",
      env: mainStore?.enviroment,
      quote: quote.quoteId,
    }

    const tx = await new TransactionModel(newTransaction)
    await tx.save()

    const orderData: any = {
      orderno: quote.quoteId,
      asset: quote.cryptoType,
      address: quote.address,
      phone: phone,
      network: "Celo",
      // operator: body.operator,
      currency: quote.country,
      chain: "celo",
      status: "INITIATED", // You can set the status to INITIATED, PAID, or DONE
      amount: Number(quote.fiatAmount),
      recieves: Number(quote.cryptoAmount),
      paidIn: quote.fiatType,
    }

    // Now also create the order instance
    await OrdersModel.create(orderData)

    const response = {
      transferId: savedTransfer._id,
      transferStatus: savedTransfer.status,
      transferAddress: savedTransfer.address,
      userActionDetails: {
        userActionType: "AccountNumberUserAction",
        institutionName: "OneRamp",
        accountName: operator.name,
        accountNumber: operator.merchantId, // <--- or change to Airtel according to the user selection
        transactionReference: `ref-${quote._id}`,
        // deadline: // <-- enter deadline ref here
      },
    }

    // Change the quote status to used
    quote.used = true
    await quote.save()

    // Now you start listening to the incoming tx event for 10 min
    listenToIncomingTxTransfer(tx._id)

    return res.status(200).json(response)
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
      errorDetails: error,
    }

    return res.status(400).json(errorResponse)
  }
}

export const createTransferOutHelperHandler = async (
  req: any,
  res: Response
) => {
  try {
    const body = validateZodSchema(req.body, transferRequestBodySchema)

    let fiatAccount
    try {
      fiatAccount = await FiatAccountModel.findById(body.fiatAccountId)
    } catch (error: any) {
      if (error.name === "CastError") {
        return res.status(404).json({ error: "ResourceNotFound" })
      }
      throw error // Rethrow other errors
    }

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: body.quoteId })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    if (quote.used) return res.status(400).json({ error: `InvalidQuote` })

    const operator = getMerchantAccount(fiatAccount.operator, quote.country)

    if (!operator) return res.status(400).json({ error: `ResourceNotFound` })

    // Check if the quote country is the same as the operator country
    if (!operator.operationalCountries.includes(quote.country))
      return res.status(400).json({ error: `InvalidQuote` })

    const { store } = req.store

    if (quote.transferType != `TransferOut`)
      return res.status(400).json({ error: `InvalidQuote` })

    const transfer = await TransferModel.findOne({ quote: quote.quoteId })

    if (transfer) return res.status(400).json({ error: `InvalidQuote` })

    const mainStore = await storeModel.findById(store)

    const transferAddress = networkAddressMap["celo"]

    // const appStore = await storeModel.findById(store)
    // Create a transfer table here....
    const transferData: any = {
      quote: quote.quoteId,
      status: "TransferStarted",
      address: transferAddress,
    }

    const newTransfer = new TransferModel(transferData)

    // Save the transfer to the database
    const savedTransfer = await newTransfer.save()

    // Create a transaction in the db...
    let newTransaction: any = {
      store: store,
      txHash: "initTxHash",
      amount: Number(quote.cryptoAmount),
      address: quote.address,
      fiat: Number(quote.fiatAmount),
      network: "celo",
      phone: fiatAccount.mobile,
      operator: fiatAccount.operator,
      asset: quote.cryptoType,
      status: "Pending",
      env: mainStore?.enviroment,
      quote: quote.quoteId,
    }

    const tx = await new TransactionModel(newTransaction)
    await tx.save()

    const response = {
      transferId: savedTransfer._id,
      transferStatus: savedTransfer.status,
      transferAddress: savedTransfer.address,
    }

    // delete the quote
    quote.used = true
    await quote.save()

    // Now you start listening to the incoming tx event for 10 min
    listenToIncomingTxTransfer(tx._id)

    return res.status(200).json(response)
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
      errorDetails: error,
    }

    return res.status(400).json(errorResponse)
  }
}

export const getTransferStatusHandler = async (req: any, res: Response) => {
  try {
    const params = validateZodSchema(
      req.params,
      transferStatusRequestParamsSchema
    )

    let transfer
    try {
      transfer = await TransferModel.findById(params.transferId)
    } catch (error: any) {
      if (error.name === "CastError") {
        return res.status(404).json({ error: "ResourceNotFound" })
      }
      throw error // Rethrow other errors
    }

    if (!transfer) return res.status(404).json({ error: `ResourceNotFound` })

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: transfer.quote })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    const transferAddress = networkAddressMap["celo"]

    let userActionDetails

    if (quote.transferType == "TransferIn") {
      // const operator = onerampMerchantAccounts[transfer.operator!]
      const operator = getMerchantAccount(transfer.operator!, quote.country)

      if (!operator) return res.status(400).json({ error: "OperatorNotFound" })

      // const transferAddress = quote.network == "lightning" ? quote.address : "starknet" ? starknetAdminWalletAddress : adminWalletAddress

      userActionDetails = {
        userActionType: "AccountNumberUserAction",
        institutionName: operator.name,
        accountName: operator.name,
        accountNumber: operator.merchantId, // <--- or change to Airtel according to the user selection
        transactionReference: `ref-${quote._id}`,
        // deadline: // <-- enter deadline ref here
      }
    }

    const response: any = {
      status: transfer.status,
      transferType: quote.transferType,
      fiatType: quote.fiatType,
      cryptoType: quote.cryptoType,
      amountProvided: quote.fiatAmount,
      amountReceived: quote.fiatAmount,
      fiatAccountId: quote.id,
      transferId: transfer.id,
      transferAddress: transferAddress,
      txHash: transfer.txHash,
      userActionDetails: userActionDetails,
    }

    if (quote.fiatAmount) {
      response.amountProvided = quote.cryptoAmount
      response.amountReceived = (
        Number(quote.cryptoAmount) - Number(quote.fee)
      ).toString()
    }

    if (quote.cryptoAmount) {
      response.amountProvided = quote.fiatAmount
      response.amountReceived = (
        Number(quote.fiatAmount) - Number(quote.fee)
      ).toString()
    }

    return res.status(200).json(response)
  } catch (error) {
    return res.status(400).json(error)
  }
}

export const createUserKYCHandler = async (req: any, res: Response) => {
  try {
    // Check if KYC data already exists for the user
    const kycRecords = await KYCModel.find({
      phoneNumber: req.body.phoneNumber,
      ethAddress: req.body.ethAddress,
    })

    if (kycRecords.length > 0) {
      return res.status(409).json({ error: FiatConnectError.ResourceExists })
    }

    // Extract KYC data from request body
    const data = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      middleName: req.body.middleName,
      dateOfBirth: {
        day: req.body.dateOfBirth.day,
        month: req.body.dateOfBirth.month,
        year: req.body.dateOfBirth.year,
      },
      address: {
        address1: req.body.address.address1,
        address2: req.body.address.address2,
        isoCountryCode: req.body.address.isoCountryCode,
        isoRegionCode: req.body.address.isoRegionCode,
        city: req.body.address.city,
        postalCode: req.body.address.postalCode,
      },
      phoneNumber: req.body.phoneNumber,
      selfieDocument: req.body.selfieDocument, // Assuming Base64 image string
      identificationDocument: req.body.identificationDocument, // Assuming Base64 image string
      ethAddress: req.body.ethAddress,
    }

    const newKYC = await KYCModel.create(data)

    return res.status(200).json({
      kycStatus: newKYC.status,
    })
  } catch (error) {
    return res.status(400).json(error)
  }
}

export const getKYCStatusHandler = async (req: any, res: Response) => {
  try {
    // Check if KYC data already exists for the user
    const kycRecords = await KYCModel.findOne({
      phoneNumber: req.body.phoneNumber,
      ethAddress: req.body.ethAddress,
    })

    if (!kycRecords) {
      return res.status(404).json({ error: FiatConnectError.ResourceNotFound })
    }

    return res.status(200).json({
      kycStatus: kycRecords.status,
    })
  } catch (error) {
    return res.status(400).json(error)
  }
}

export const deleteKYCRecordHandler = async (req: any, res: Response) => {
  try {
    const kycRecords = await KYCModel.findOneAndDelete({
      phoneNumber: req.body.phoneNumber,
      ethAddress: req.body.ethAddress,
    })

    if (!kycRecords) {
      return res.status(404).json({ error: FiatConnectError.ResourceNotFound })
    }

    return res.status(200).json({})
  } catch (error) {
    return res.status(400).json(error)
  }
}

export const createRawTransferInHelperHandler = async (
  req: any,
  res: Response
) => {
  try {
    const body = {
      phone: req.body.phone,
      quoteId: req.body.quoteId,
    }

    // const body = validateZodSchema(req.body, transferRequestBodySchema)

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: body.quoteId })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    const { store } = req.store

    if (quote.transferType != `TransferIn`)
      return res.status(400).json({ error: `TransferNotAllowed` })

    const transfer = await TransferModel.findOne({ quote: quote.quoteId })

    if (transfer) return res.status(400).json({ error: `NonceInUse` })

    const mainStore = await storeModel.findById(store)

    // Create a transfer table here....
    const transferData: any = {
      quote: quote.quoteId,
      status: "TransferStarted",
      address: addresses.celo.stable,
      phone: body.phone,
    }

    const newTransfer = new TransferModel(transferData)

    // Save the transfer to the database
    const savedTransfer = await newTransfer.save()

    // Create a transaction in the db...
    const newTransaction: any = {
      store: store,
      txHash: "initTxHash",
      amount: quote.fiatAmount,
      address: quote.address,
      fiat: quote.fiatAmount,
      network: "Celo",
      phone: body.phone,
      txType: "Deposit",
      asset: quote.cryptoType,
      status: "Pending",
      env: mainStore?.enviroment,
      quote: quote.quoteId,
    }

    if (quote.fiatAmount) {
      newTransaction.fiat = Number(quote.fiatAmount)
      newTransaction.amount = Number(
        await exchangeToUSD(quote.fiatAmount, quote.fiatType)
      )
    }

    if (quote.cryptoAmount) {
      const platformPercentage = 0.01
      const charge = Number(quote.cryptoAmount) * platformPercentage
      newTransaction.amount = Number(quote.cryptoAmount) + charge
      newTransaction.fiat = Number(
        await exchangeFromUSD(quote.cryptoAmount, quote.fiatType)
      )
    }

    const tx = await new TransactionModel(newTransaction)
    await tx.save()

    const orderData: any = {
      orderno: quote.quoteId,
      asset: quote.cryptoType,
      address: quote.address,
      phone: body.phone,
      network: "Mainnet",
      currency: quote.country,
      chain: "CELO",
      status: "INITIATED", // You can set the status to INITIATED, PAID, or DONE
    }

    if (quote.cryptoType !== "BTCLit") {
      if (quote.fiatAmount) {
        const platformPercentage = platformCharge
        const charge = Number(quote.fiatAmount) * platformPercentage
        orderData.amount = Number(quote.fiatAmount) + charge
        orderData.recieves = quote.fiatAmount
        orderData.paidIn = quote.fiatType
      }

      if (quote.cryptoAmount) {
        const platformPercentage = platformCharge
        const charge = Number(quote.cryptoAmount) * platformPercentage
        orderData.amount = Number(quote.cryptoAmount) + charge
        orderData.recieves = quote.cryptoAmount
        orderData.paidIn = quote.cryptoType
      }
    } else {
      orderData.amount = quote.cryptoAmount
      orderData.recieves = quote.fiatAmount
      orderData.paidIn = quote.cryptoType
    }

    // Now also create the order instance
    await OrdersModel.create(orderData)

    const merchantCode = mtnMomoCode
    //   fiatAccount.operator == "MTN" ? mtnMomoCode : airtelMomoCode

    const response = {
      transferId: savedTransfer._id,
      transferStatus: savedTransfer.status,
      transferAddress: savedTransfer.address,
      userActionDetails: {
        userActionType: "AccountNumberUserAction",
        institutionName: `OneRamp`,
        accountName: `OneRamp`,
        accountNumber: merchantCode, // <--- or change to Airtel according to the user selection
        transactionReference: `ref-${quote._id}`,
        // deadline: // <-- enter deadline ref here
      },
    }

    // Now you start listening to the incoming tx event for 10 min
    listenToIncomingTxTransfer(tx._id)

    return res.status(200).json(response)
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
      errorDetails: error,
    }

    return res.status(400).json(errorResponse)
  }
}

export const getRawTransferStatusHandler = async (req: any, res: Response) => {
  try {
    const params = {
      transferId: req.params.transferId,
    }

    const transfer = await TransferModel.findById(params.transferId)

    if (!transfer) return res.status(400).json({ error: `InvalidParameters` })

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: transfer.quote })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    const merchantCode =
      transfer.operator == "MTN" ? mtnMomoCode : airtelMomoCode

    const response: any = {
      status: transfer.status,
      transferType: quote.transferType,
      fiatType: quote.fiatType,
      cryptoType: quote.cryptoType,
      amountProvided: quote.fiatAmount,
      amountReceived: quote.fiatAmount,
      fiatAccountId: quote.id,
      transferId: transfer.id,
      transferAddress: adminWalletAddress,
      txHash: transfer.txHash,
      userActionDetails: {
        userActionType: "AccountNumberUserAction",
        institutionName: `OneRamp`,
        accountName: `OneRamp`,
        accountNumber: merchantCode ? merchantCode : mtnMomoCode, // <--- or change to Airtel according to the user selection
        transactionReference: `ref-${quote._id}`,
        // deadline: // <-- enter deadline ref here
      },
    }

    if (quote.fiatAmount) {
      response.amountProvided = quote.cryptoAmount
      response.amountReceived = (
        Number(quote.cryptoAmount) - Number(quote.fee)
      ).toString()
    }

    if (quote.cryptoAmount) {
      response.amountProvided = quote.fiatAmount
      response.amountReceived = (
        Number(quote.fiatAmount) - Number(quote.fee)
      ).toString()
    }

    return res.status(200).json(response)
  } catch (error) {
    return res.status(400).json(error)
  }
}

export async function getRawWebhookTransferStatus(req: any, res: Response) {
  try {
    // Get the eventType

    const { transferId, fiatType, cryptoType } = req.body.payload

    const transfer = await TransferModel.findById(transferId)

    if (!transfer) return res.status(400).json({ error: `InvalidParameters` })

    // find the quote
    const quote = await QuoteModel.findOne({
      quoteId: transfer.quote,
      fiatType: fiatType,
      cryptoType: cryptoType,
    })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    const merchantCode =
      transfer.operator === "MTN" ? mtnMomoCode : airtelMomoCode

    const response: any = {
      status: transfer.status,
      transferType: quote.transferType,
      fiatType: quote.fiatType,
      cryptoType: quote.cryptoType,
      amountProvided: quote.fiatAmount,
      amountReceived: quote.fiatAmount,
      fiatAccountId: quote.id,
      transferId: transfer.id,
      transferAddress: adminWalletAddress,
      txHash: transfer.txHash,
      userActionDetails: {
        userActionType: "AccountNumberUserAction",
        institutionName: `OneRamp`,
        accountName: `OneRamp`,
        accountNumber: merchantCode ? merchantCode : mtnMomoCode, // <--- or change to Airtel according to the user selection
        transactionReference: `ref-${quote._id}`,
        // deadline: // <-- enter deadline ref here
      },
    }

    if (quote.fiatAmount) {
      response.amountProvided = quote.cryptoAmount
      response.amountReceived = (
        Number(quote.cryptoAmount) - Number(quote.fee)
      ).toString()
    }

    if (quote.cryptoAmount) {
      response.amountProvided = quote.fiatAmount
      response.amountReceived = (
        Number(quote.fiatAmount) - Number(quote.fee)
      ).toString()
    }

    return res.status(200).json(response)
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}
