import {
  FiatConnectError,
  deleteFiatAccountRequestParamsSchema,
  postFiatAccountRequestBodySchema,
  transferRequestBodySchema,
  transferStatusRequestParamsSchema,
} from "@fiatconnect/fiatconnect-types"
import axios from "axios"
import dotenv from "dotenv"
import { Response } from "express"
import { v4 as uuidv4 } from "uuid"
import {
  exchangeFromUSD,
  exchangeToUSD,
  getDualCurrentExchangeIn,
  getDualCurrentExchangeOut,
  maximumCryptoAmount,
  maximumFiatAmount,
  minimumCryptoAmount,
  minimumFiatAmount,
  supportedAssets,
  supportedCountries,
  supportedFiat,
} from ".."
import addresses, {
  CONVERTOR_URL,
  adminWalletAddress,
  airtelMomoCode,
  coingeckoBtcUsdRateUrl,
  coingeckoStableCoinRateUrl,
  localExchangeRates,
  mtnMomoCode,
  platformCharge,
} from "../../constants"
import { listenToIncomingTxTransfer } from "../../events/onchain"
import FiatAccountModel from "../../models/FiatAccountModel"
import KYCModel from "../../models/KYCModel"
import OrdersModel from "../../models/OrderModel"
import QuoteModel from "../../models/QuoteModel"
import TransactionModel from "../../models/TransactionModel"
import TransferModel from "../../models/TransferModel"
import storeModel from "../../models/storeModel"
import { validateZodSchema } from "../../schema"

dotenv.config()

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

    let conversionResult

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

    let conversionResult

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

    let responseQuote: any = {
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

    // Create a transaction in the db...
    const newTransaction: any = {
      store: store,
      txHash: "initTxHash",
      amount: quote.fiatAmount,
      address: quote.address,
      fiat: quote.fiatAmount,
      network: "Celo",
      phone: phone,
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
      const platformPercentage = platformCharge
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
      phone: fiatAccount.mobile,
      network: "Mainnet",
      currency: quote.country,
      chain: "CELO",
      status: "INITIATED", // You can set the status to INITIATED, PAID, or DONE
    }

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

    // Now also create the order instance
    await OrdersModel.create(orderData)

    const merchantCode =
      fiatAccount.operator == "MTN" ? mtnMomoCode : airtelMomoCode

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

    if (!quote) return res.status(404).json({ error: `ResourceNotFound` })

    const { store } = req.store

    if (quote.transferType != `TransferOut`)
      return res.status(400).json({ error: `InvalidQuote` })

    const transfer = await TransferModel.findOne({ quote: quote.quoteId })

    if (transfer) return res.status(400).json({ error: `InvalidQuote` })

    const mainStore = await storeModel.findById(store)

    // const appStore = await storeModel.findById(store)
    // Create a transfer table here....
    const transferData: any = {
      quote: quote.quoteId,
      status: "TransferStarted",
      address: addresses.celo.stable,
    }

    const newTransfer = new TransferModel(transferData)

    // Save the transfer to the database
    const savedTransfer = await newTransfer.save()

    // Create a transaction in the db...
    const newTransaction: any = {
      store: store,
      txHash: "initTxHash",
      amount: quote.cryptoAmount,
      address: quote.address,
      fiat: quote.fiatAmount,
      network: "Celo",
      phone: fiatAccount.mobile,
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

    // if (
    //   quote.fiatAmount &&
    //   quote.fiatAmount.includes("should have required property")
    // ) {
    //   newTransaction.fiat = 0
    //   newTransaction.amount = Number(quote.cryptoAmount) - Number(quote.fee)
    // }

    // if (
    //   quote.cryptoAmount &&
    //   quote.cryptoAmount.includes("should have required property")
    // ) {
    //   newTransaction.amount = 0
    //   newTransaction.fiat = Number(quote.fiatAmount) - Number(quote.fee)
    // }

    const tx = await new TransactionModel(newTransaction)
    await tx.save()

    const response = {
      transferId: savedTransfer._id,
      transferStatus: savedTransfer.status,
      // transferAddress: savedTransfer.address,
      transferAddress: adminWalletAddress,
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
        // accountNumber: merchantCode ? merchantCode : mtnMomoCode, // <--- or change to Airtel according to the user selection
        accountNumber: merchantCode, // <--- or change to Airtel according to the user selection
        transactionReference: `ref-${quote._id}`,
        // deadline: // <-- enter deadline ref here
      },
    }

    // If the quote.transferType is TransferOut, then we need to exclude the userActionDetails
    if (quote.transferType == "TransferOut") {
      delete response.userActionDetails
    } else {
      // Otherwise, include the userActionDetails
      response.userActionDetails = {
        userActionType: "AccountNumberUserAction",
        institutionName: `OneRamp`,
        accountName: `OneRamp`,
        accountNumber: airtelMomoCode, // <--- or change to Airtel according to the user selection
        transactionReference: `ref-${quote._id}`,
        // deadline: // <-- enter deadline ref here
      }
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

export const calculatePlatformRates = async (req: any, res: Response) => {
  try {
    // Check to see if the request contains a fiatAmount or a cryptoAmount
    if (!req.body.fiatAmount && !req.body.cryptoAmount) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    if (req.body.fiatAmount && req.body.cryptoAmount) {
      return res.status(400).json({ error: "InvalidParameters" })
    }

    // Check to see the cryptoType is not BTC
    if (req.body.cryptoType === "BTC") {
      if (req.body.cryptoAmount) {
        // Step 1: Get the latest BTC price in USDT
        const response = await axios.get(coingeckoBtcUsdRateUrl)

        if (
          !response.data ||
          !response.data.bitcoin ||
          response.data.bitcoin.usd === undefined
        )
          return res.status(400).json({ error: "Failed to get BTC Rate" })

        // const btcToUsd = parseFloat(response.data.bitcoin.usd)
        // const btcToUsdRate = parseFloat(response.data.price)

        const btcToUsdRate = parseFloat(response.data.bitcoin.usd)
        const exchangeResponse = await axios.get(CONVERTOR_URL)

        if (!exchangeResponse.data.rates[req.body.fiatType])
          return res.status(400).json({ error: "InvalidParameters" })

        let exchangedRate = exchangeResponse.data.rates[req.body.fiatType]

        // Adjust the rate by 2.95%
        exchangedRate = exchangedRate * Number(process.env.PERCENTAGE_RATE)

        const platformFeeInSats = platformCharge * req.body.cryptoAmount

        const cryptoAmountReceived = req.body.cryptoAmount - platformFeeInSats

        // Now convert the cryptoAmount to fiat and return the fiatAmountReceived
        // Convert the sats to BTC
        const satsToBTC = cryptoAmountReceived / 100000000

        // Convert BTC to USD
        const cryptoAmountInUsd = satsToBTC * btcToUsdRate

        // Convert USD to requested fiat currency
        const fiatAmountReceived = cryptoAmountInUsd * exchangedRate

        return res.status(200).json({
          charge: platformFeeInSats,
          exchangeRate: exchangedRate,
          cryptoAmount: cryptoAmountReceived,
          fiatAmount: fiatAmountReceived,
        })
      }

      // Step 1: Get the latest BTC price in USDT
      const response = await axios.get(coingeckoBtcUsdRateUrl)

      if (
        !response.data ||
        !response.data.bitcoin ||
        response.data.bitcoin.usd === undefined
      )
        return res.status(400).json({ error: "Failed to get BTC Rate" })

      // const btcToUsd = parseFloat(response.data.bitcoin.usd)
      const btcToUsdRate = parseFloat(response.data.bitcoin.usd)

      const exchangeResponse = await axios.get(CONVERTOR_URL)

      if (!exchangeResponse.data.rates[req.body.fiatType])
        return res.status(400).json({ error: "InvalidParameters" })

      let exchangedRate = exchangeResponse.data.rates[req.body.fiatType]

      exchangedRate = exchangedRate * Number(process.env.PERCENTAGE_RATE)

      // Convert fiatAmount to USD
      const fiatAmountInUsd = req.body.fiatAmount / exchangedRate

      // Convert USD to BTC to Sats
      const fiatAmountInBTC = fiatAmountInUsd / btcToUsdRate

      const platformFee = platformCharge * req.body.fiatAmount

      const fiatAmountInSats = fiatAmountInBTC * 100000000

      const platformFeeInSats = platformCharge * fiatAmountInSats

      const cryptoAmountReceived = fiatAmountInSats - platformFeeInSats

      const fiatAmountReceived = req.body.fiatAmount - platformFee

      // Convert USD to BTC
      return res.status(200).json({
        charge: platformFeeInSats,
        exchangeRate: exchangedRate,
        cryptoAmount: cryptoAmountReceived,
        fiatAmount: fiatAmountReceived,
      })
    }

    // This goes if the cryptoType is not BTC

    // First do the conversion if the user entered cryptoAmount
    if (req.body.cryptoAmount) {
      const usdRate = await axios.get(coingeckoStableCoinRateUrl)

      if (!usdRate.data["usd-coin"] || !usdRate.data["usd-coin"].usd) {
        return res.status(400).json({ error: "InvalidParameters" })
      }

      const usdRatePrice = parseFloat(usdRate.data["usd-coin"].usd)

      const exchangeResponse = await axios.get(CONVERTOR_URL)

      const exchangePrice = usdRatePrice * Number(req.body.cryptoAmount)

      const result = await exchangeResponse.data

      let exchangedRate = result.rates[req.body.fiatType]

      exchangedRate = exchangedRate * Number(process.env.PERCENTAGE_RATE)

      const exchangedPrice = exchangePrice * exchangedRate

      // Calculate the platform charge
      const platformFeeInUsd = platformCharge * exchangePrice

      const platformChargeFeeInFiat = platformFeeInUsd * exchangedRate

      const cryptoAmountReceived = exchangePrice - platformFeeInUsd
      const fiatAmountReceived = exchangedPrice - platformChargeFeeInFiat

      return res.status(200).json({
        chargeFeeInFiat: platformChargeFeeInFiat,
        chargeFeeInUsd: platformFeeInUsd,
        exchangeRate: exchangedRate,
        cryptoAmount: cryptoAmountReceived,
        fiatAmount: fiatAmountReceived,
      })
    }

    // If the user entered fiatAmount
    if (req.body.fiatAmount) {
      const exchangeResponse = await axios.get(CONVERTOR_URL)

      const result = await exchangeResponse.data

      let exchangedRate = result.rates[req.body.fiatType]

      exchangedRate = exchangedRate * Number(process.env.PERCENTAGE_RATE)

      const exchangedPrice = Number(req.body.fiatAmount) / exchangedRate

      // Calculate the platform charge
      const platformFeeInUsd = platformCharge * exchangedPrice

      const platformChargeFeeInFiat = platformFeeInUsd * exchangedRate

      const cryptoAmountReceived = exchangedPrice - platformFeeInUsd
      const fiatAmountReceived = req.body.fiatAmount - platformChargeFeeInFiat

      return res.status(200).json({
        chargeFeeInFiat: platformChargeFeeInFiat,
        chargeFeeInUsd: platformFeeInUsd,
        exchangeRate: exchangedRate,
        cryptoAmount: cryptoAmountReceived,
        fiatAmount: fiatAmountReceived,
      })
    }
  } catch (error) {
    return res.status(400).json(error)
  }
}

export const calculatePlatformRatesHelper = async (
  req: any,
  isSell?: boolean
) => {
  try {
    // Check to see if the request contains a fiatAmount or a cryptoAmount
    if (!req.body.fiatAmount && !req.body.cryptoAmount) {
      return { success: false, error: "InvalidParameters" }
    }

    if (req.body.fiatAmount && req.body.cryptoAmount) {
      return { success: false, error: "InvalidParameters" }
    }

    let providerServiceFeePercentage

    if (req.orderType === "buying") {
      providerServiceFeePercentage =
        // @ts-ignore
        localExchangeRates[req.body.country].kotaniBuyingRate
    } else {
      providerServiceFeePercentage =
        // @ts-ignore
        localExchangeRates[req.body.country].kotaniSellingRate
    }

    // Check to see the cryptoType is not BTC
    // Fetch BTC price in USD if the cryptoType is BTC.
    if (req.body.cryptoType === "BTC") {
      const response = await axios.get(coingeckoBtcUsdRateUrl)

      if (
        !response.data ||
        !response.data.bitcoin ||
        response.data.bitcoin.usd === undefined
      ) {
        return { success: false, error: "Failed to get BTC Rate" }
      }

      const btcToUsdRate = parseFloat(response.data.bitcoin.usd)
      const exchangeResponse = await axios.get(CONVERTOR_URL)

      if (
        !exchangeResponse.data.rates ||
        exchangeResponse.data.rates[req.body.fiatType] === undefined
      ) {
        return { success: false, error: "InvalidParameters" }
      }

      let exchangedRate = exchangeResponse.data.rates[req.body.fiatType]

      exchangedRate = exchangedRate * Number(process.env.PERCENTAGE_RATE)

      if (req.body.cryptoAmount) {
        // Logic for cryptoAmount to fiat conversion.
        const platformFeeInSats = Number(req.body.cryptoAmount) * platformCharge

        const cryptoAmountReceived =
          Number(req.body.cryptoAmount) - platformFeeInSats

        const satsToBTC = cryptoAmountReceived / 100000000
        const cryptoAmountInUsd = satsToBTC * btcToUsdRate
        const fiatAmountReceived = cryptoAmountInUsd * exchangedRate

        const chargeFeeInFiat =
          (platformFeeInSats * btcToUsdRate) / exchangedRate

        return {
          success: true,
          chargeFeeInFiat: chargeFeeInFiat, // Convert platform fee to the requested fiat currency.
          chargeFeeInUsd: platformFeeInSats, // Convert platform fee from Sats to USD.
          exchangeRate: exchangedRate,
          cryptoAmount: cryptoAmountReceived,
          fiatAmount: fiatAmountReceived,
          gasFeeInFiat: 0.0,
        }
      } else if (req.body.fiatAmount) {
        // Logic for fiatAmount to crypto conversion.

        let cryptoAmountInBTC

        if (isSell) {
          const fiatAmountInUsd = Number(req.body.fiatAmount) / exchangedRate

          cryptoAmountInBTC = fiatAmountInUsd / btcToUsdRate
        } else {
          const fiatAmountAfterFee =
            Number(req.body.fiatAmount) -
            platformCharge * Number(req.body.fiatAmount)

          const fiatAmountInUsd = fiatAmountAfterFee / exchangedRate
          cryptoAmountInBTC = fiatAmountInUsd / btcToUsdRate
        }

        const cryptoAmountReceived = cryptoAmountInBTC * 100000000 // Convert BTC to Satoshis

        return {
          success: true,
          chargeFeeInFiat: platformCharge * Number(req.body.fiatAmount), // The platform fee in fiat currency.
          chargeFeeInUsd:
            (platformCharge * Number(req.body.fiatAmount)) / exchangedRate, // Convert platform fee from fiat to USD.
          exchangeRate: exchangedRate,
          cryptoAmount: cryptoAmountReceived, // Return the amount in Satoshis for consistency
          fiatAmount:
            Number(req.body.fiatAmount) -
            platformCharge * Number(req.body.fiatAmount), // The net fiat amount after deducting the platform fee
        }
      }
    }

    // First do the conversion if the user entered cryptoAmount
    if (req.body.cryptoAmount) {
      const orderType = req.orderType

      // @ts-ignore
      let exchangedRate = localExchangeRates[req.body.country][orderType]

      const fiatAmount = Number(req.body.cryptoAmount) * exchangedRate

      const cryptoAmount = Number(req.body.cryptoAmount)

      // @ts-ignore
      const feeRatePercentage = localExchangeRates[req.body.country].feeRate

      // Get the platform charge for the cryptoAmount using the feeRatePercentage
      const platformChargeInFiat = fiatAmount * feeRatePercentage

      const providerChargeInUsd = cryptoAmount * providerServiceFeePercentage

      const providerChargeInFiat = providerChargeInUsd * exchangedRate

      const platformChargeInUSD = cryptoAmount * feeRatePercentage

      const cryptoAmountReceived =
        cryptoAmount - platformChargeInUSD - providerChargeInUsd

      // Convert the cryptoAmountReceived to fiat and return the fiatAmountReceived
      const fiatAmountReceived = fiatAmount - platformChargeInFiat

      const totalFeeInFiat = platformChargeInFiat + providerChargeInFiat
      const totalFeeInUsd = platformChargeInUSD + providerChargeInUsd

      let providerPayoutAmount

      // providerPayoutAmount = fiatAmountReceived + providerChargeInFiat

      if (req.orderType === "buying") {
        // providerPayoutAmount = fiatAmountReceived + providerChargeInFiat
        providerPayoutAmount = fiatAmountReceived
      } else {
        // providerPayoutAmount = fiatAmountReceived - providerChargeInFiat
        providerPayoutAmount = fiatAmountReceived
      }

      const gasFeeInUsd = 0.02
      const gasFeeInFiat = gasFeeInUsd * exchangedRate

      return {
        success: true,
        // chargeFeeInFiat: platformChargeInFiat,
        // chargeFeeInUsd: platformCharge,
        chargeFeeInFiat: totalFeeInFiat,
        chargeFeeInUsd: totalFeeInUsd,
        exchangeRate: exchangedRate,
        cryptoAmount: cryptoAmountReceived,
        fiatAmount: providerPayoutAmount,
        providerPayoutAmount: providerPayoutAmount,
        gasFeeInFiat: gasFeeInFiat,
      }
    }

    // If the user entered fiatAmount
    if (req.body.fiatAmount) {
      const orderType = req.orderType

      // @ts-ignore
      let exchangedRate = localExchangeRates[req.body.country][orderType]

      const cryptoAmount = Number(req.body.fiatAmount) / exchangedRate

      const fiatAmount = Number(req.body.fiatAmount)

      // @ts-ignore
      const feeRatePercentage = localExchangeRates[req.body.country].feeRate

      const platformChargeInFiat = fiatAmount * feeRatePercentage

      const platformChargeInUSD = cryptoAmount * feeRatePercentage

      const providerChargeInFiat = fiatAmount * providerServiceFeePercentage

      const fiatAmountReceived =
        fiatAmount - platformChargeInFiat - providerChargeInFiat

      // To get the cryptoAmount received, we need to convert the fiatAmount to crypto
      const cryptoAmountReceived = fiatAmountReceived / exchangedRate

      const totalFeeInFiat = platformChargeInFiat + providerChargeInFiat

      const totalFeeInUsd =
        platformChargeInUSD + cryptoAmount * providerServiceFeePercentage

      let providerPayoutAmount

      if (req.orderType === "buying") {
        providerPayoutAmount = fiatAmountReceived + providerChargeInFiat
      } else {
        providerPayoutAmount = fiatAmountReceived - providerChargeInFiat
      }

      const gasFeeInUsd = 0.02
      const gasFeeInFiat = gasFeeInUsd * exchangedRate
      return {
        success: true,
        // chargeFeeInFiat: platformChargeInFiat,
        // chargeFeeInUsd: platformCharge,
        chargeFeeInFiat: totalFeeInFiat,
        chargeFeeInUsd: totalFeeInUsd,
        exchangeRate: exchangedRate,
        cryptoAmount: cryptoAmountReceived,
        fiatAmount: providerPayoutAmount,
        providerPayoutAmount: providerPayoutAmount,
        gasFeeInFiat: gasFeeInFiat,
      }
    }
  } catch (error) {
    return { success: false, error: error }
  }
}

export const convertSatsBTCtoUSD = async (
  fiatAmount: number,
  currency: string
): Promise<number | { error: string }> => {
  try {
    const exchangeResponse = await axios.get(CONVERTOR_URL)

    const response = await axios.get(coingeckoBtcUsdRateUrl)

    if (
      !response.data ||
      !response.data.bitcoin ||
      response.data.bitcoin.usd === undefined
    ) {
      return { error: "Failed to get BTC Rate" }
    }

    const btcToUsdRate = parseFloat(response.data.bitcoin.usd)

    const result = await exchangeResponse.data

    let exchangedRate = result.rates[currency]

    // exchangedRate = exchangedRate * Number(process.env.PERCENTAGE_RATE)

    const fiatAmountInUsd = fiatAmount / exchangedRate

    const amountFormatted = Number(fiatAmountInUsd.toFixed(2))

    const cryptoAmountInBTC = amountFormatted / btcToUsdRate

    const cryptoAmountInSats = cryptoAmountInBTC * 100000000 // Convert BTC to Satoshis

    return cryptoAmountInSats
  } catch (error: any) {
    return { error: error.message }
  }
}
export const platformRatesCalculator = async (
  quoteType: string,
  country: string,
  fiatAmount?: number,
  cryptoAmount?: number
) => {
  try {
    // Check to see if the request contains a fiatAmount or a cryptoAmount
    if (!fiatAmount && !cryptoAmount) {
      return { success: false, error: "InvalidParameters" }
    }

    if (fiatAmount && cryptoAmount) {
      return { success: false, error: "InvalidParameters" }
    }

    // This goes if the cryptoType is not BTC

    // First do the conversion if the user entered cryptoAmount
    if (cryptoAmount) {
      const orderType = quoteType

      // @ts-ignore
      let exchangedRate = localExchangeRates[country][orderType]

      const fiatAmount = Number(cryptoAmount) * exchangedRate

      const assetAmount = Number(cryptoAmount)

      // @ts-ignore
      const feeRatePercentage = localExchangeRates[req.body.country].feeRate

      // Get the platform charge for the cryptoAmount using the feeRatePercentage
      const platformChargeInFiat = fiatAmount * feeRatePercentage

      const platformChargeInUSD = assetAmount * feeRatePercentage

      const cryptoAmountReceived = assetAmount - platformChargeInUSD

      // Convert the cryptoAmount to fiat and return the fiatAmountReceived
      const fiatAmountReceived = fiatAmount - platformChargeInFiat

      return {
        success: true,
        chargeFeeInFiat: platformChargeInFiat,
        chargeFeeInUsd: platformCharge,
        exchangeRate: exchangedRate,
        cryptoAmount: cryptoAmountReceived,
        fiatAmount: fiatAmountReceived,
      }
    }

    // If the user entered fiatAmount
    if (fiatAmount) {
      const orderType = quoteType

      // @ts-ignore
      let exchangedRate = localExchangeRates[req.body.country][orderType]

      const cryptoAmount = Number(fiatAmount) / exchangedRate

      const localAmount = Number(fiatAmount)

      // @ts-ignore
      const feeRatePercentage = localExchangeRates[req.body.country].feeRate

      const platformChargeInFiat = localAmount * feeRatePercentage

      const platformChargeInUSD = cryptoAmount * feeRatePercentage

      const cryptoAmountReceived = cryptoAmount - platformChargeInUSD

      const fiatAmountReceived = localAmount - platformChargeInFiat

      return {
        success: true,
        chargeFeeInFiat: platformChargeInFiat,
        chargeFeeInUsd: platformCharge,
        exchangeRate: exchangedRate,
        cryptoAmount: cryptoAmountReceived,
        fiatAmount: fiatAmountReceived,
      }
    }
  } catch (error) {
    return { success: false, error: error }
  }
}
