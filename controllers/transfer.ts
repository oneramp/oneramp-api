import { Response } from "express"
import { validateZodSchema } from "../schema"
import {
  transferRequestBodySchema,
  transferStatusRequestParamsSchema,
  webhookRequestBodyTransferInSchema,
  webhookRequestBodyTransferOutSchema,
} from "@fiatconnect/fiatconnect-types"
import QuoteModel from "../models/QuoteModel"
import addresses, {
  adminWalletAddress,
  airtelMomoCode,
  howToPayUrl,
  mtnMomoCode,
} from "../constants"
import TransferModel from "../models/TransferModel"
import TransactionModel from "../models/TransactionModel"
import FiatAccountModel from "../models/FiatAccountModel"
import storeModel from "../models/storeModel"
import { listenToIncomingTxTransfer } from "../events/onchain"
import OrdersModel from "../models/OrderModel"
import WithdrawModel from "../models/WithdrawModel"
import DepositsModel from "../models/DespositModel"

export async function createTransfer(req: any, res: Response) {
  try {
    const params = {
      fiatAccountId: req.body.fiatAccountId,
      quoteId: req.body.quoteId,
    }

    const body = validateZodSchema(req.body, transferRequestBodySchema)

    const fiatAccount = await FiatAccountModel.findById(params.fiatAccountId)

    if (!fiatAccount)
      return res.status(400).json({ error: `InvalidFiatAccount` })

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: body.quoteId })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    const { store } = req.store

    if (quote.transferType != `TransferOut`)
      return res.status(400).json({ error: `TransferNotAllowed` })

    const transfer = await TransferModel.findOne({ quote: quote.quoteId })

    if (transfer) return res.status(400).json({ error: `NonceInUse` })

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
    const newTransaction = {
      store: store,
      txHash: "initTxHash",
      amount: quote.cryptoAmount,
      address: quote.address,
      fiat: quote.fiatAmount,
      network: "Celo",
      phone: fiatAccount.mobile,
      txType: "Withdrawal",
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
      // transferAddress: savedTransfer.address,
      transferAddress: adminWalletAddress,
    }

    // Now you start listening to the incoming tx event for 10 min
    listenToIncomingTxTransfer(tx._id)

    return res.status(200).json(response)
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}

export async function createTransferIn(req: any, res: Response) {
  try {
    const params = {
      fiatAccountId: req.body.fiatAccountId,
      quoteId: req.body.quoteId,
    }

    const body = validateZodSchema(req.body, transferRequestBodySchema)

    const fiatAccount = await FiatAccountModel.findById(params.fiatAccountId)

    if (!fiatAccount)
      return res.status(400).json({ error: `InvalidFiatAccount` })

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
    }

    const newTransfer = new TransferModel(transferData)

    // Save the transfer to the database
    const savedTransfer = await newTransfer.save()

    // Create a transaction in the db...
    const newTransaction = {
      store: store,
      txHash: "initTxHash",
      amount: quote.fiatAmount,
      address: quote.address,
      fiat: quote.fiatAmount,
      network: "Celo",
      phone: fiatAccount.mobile,
      txType: "Deposit",
      asset: quote.cryptoType,
      status: "Pending",
      env: mainStore?.enviroment,
      quote: quote.quoteId,
    }

    const tx = await new TransactionModel(newTransaction)
    await tx.save()

    // Now also create the order instance
    await OrdersModel.create({
      orderno: quote.quoteId,
      amount: quote.fiatAmount,
      recieves: quote.fiatAmount,
      asset: quote.cryptoType,
      address: quote.address,
      phone: fiatAccount.mobile,
      network: "Mainnet",
      currency: quote.country,
      chain: "CELO",
      status: "INITIATED", // You can set the status to INITIATED, PAID, or DONE
    })

    const response = {
      transferId: savedTransfer._id,
      transferStatus: savedTransfer.status,
      transferAddress: savedTransfer.address,
      userActionDetails: {
        userActionType: "AccountNumberUserAction",
        institutionName: `OneRamp`,
        accountName: `OneRamp`,
        accountNumber: mtnMomoCode, // <--- or change to Airtel according to the user selection
        transactionReference: "ref-tx-no",
        // deadline: // <-- enter deadline ref here
      },
    }

    // Now you start listening to the incoming tx event for 10 min
    listenToIncomingTxTransfer(tx._id)

    return res.status(200).json(response)
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}

export async function getTransferStatus(req: any, res: Response) {
  try {
    const params = validateZodSchema(
      req.params,
      transferStatusRequestParamsSchema
    )

    const transfer = await TransferModel.findById(params.transferId)

    if (!transfer) return res.status(400).json({ error: `InvalidParameters` })

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: transfer.quote })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    const response = {
      status: transfer.status,
      transferType: quote.transferType,
      fiatType: quote.fiatType,
      cryptoType: quote.cryptoType,
      amountProvided: quote.fiatAmount,
      amountReceived: quote.fiatAmount,
      fiatAccountId: quote.id,
      transferId: transfer.id,
      transferAddress: transfer.address,
      txHash: transfer.txHash,
      userActionDetails: {
        userActionType: "URLUserAction",
        url: `${howToPayUrl}/${transfer._id}`,
      },
    }

    return res.status(200).json(response)
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}

export async function getWebhookTransferStatus(req: any, res: Response) {
  try {
    // Get the eventType
    if (req.body.eventType === "WebhookTransferInStatusEvent") {
      req.body = validateZodSchema(req.body, webhookRequestBodyTransferInSchema)
    }

    if (req.body.eventType === "WebhookTransferOutStatusEvent") {
      req.body = validateZodSchema(
        req.body,
        webhookRequestBodyTransferOutSchema
      )
    }

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

// Create an endpoint that delete all transactions, quotes, orders and transfers
export async function deleteAll(req: any, res: Response) {
  try {
    await TransferModel.deleteMany({})
    await QuoteModel.deleteMany({})
    await TransactionModel.deleteMany({})
    await OrdersModel.deleteMany({})
    await WithdrawModel.deleteMany({})
    await DepositsModel.deleteMany({})

    return res.status(200).json({ message: `Deleted all` })
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
    }
    res.status(400).json(errorResponse)
  }
}
