import { response, Response } from "express"
import { payOutCrypto } from "../../helpers/payouts"
import CustomerModel from "../../models/CustomerModel"
import OrdersModel from "../../models/OrderModel"
import TransferModel from "../../models/TransferModel"
import {
  getKotaniOrderStatus,
  getKotaniOrderWithdrawStatus,
} from "../../helpers/kotani/withdraw/kotani-withdraw"
import { getBlinkBalance, sendBlinkPayment } from "../../helpers/payouts/blink"
import { appWebhook, IAppWebhook } from "../../webhooks"
import QuoteModel from "../../models/QuoteModel"
import storeModel from "../../models/storeModel"
import TransactionModel from "../../models/TransactionModel"
import WebhooksKeyModel from "../../models/WebhooksKeysModel"

export async function confirmKotaniPayCallback(req: any, res: Response) {
  try {
    // const { orderId } = req.body
    // console.log("------------- Callback from Kotani Pay ----------------")

    // 1. Get the customer's address,
    // 2. Get the crypto and network they want to get paid in
    // 3. Get the amount paid, and amount to receive in Crypt

    // TODO: Requery the order if the status is PENDING
    const customer = await CustomerModel.findOne({
      customerKey: req.body.customerKey,
    })

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" })
    }

    const order = await OrdersModel.findById(customer.activeOrderId)

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" })
    }

    const quote = await QuoteModel.findById(order.quoteId)

    const transaction = await TransactionModel.findById(order.transactionId)

    const transfer = await TransferModel.findById(order.transferId)

    if (
      req.body.status === "CANCELLED" ||
      req.body.status === "FAILED" ||
      req.body.status === "DECLINED" ||
      req.body.status === "DUPLICATE" ||
      req.body.status === "ERROR_OCCURRED"
    ) {
      // Change the order status to CANCELLED

      await changeOrderStatusFunc(order, "CANCELLED", "0x")

      if (quote && transaction) {
        const store = await storeModel.findById(transaction.store)

        if (!store) {
          return res.status(200).json(order)
        }

        const callback = store.callback

        const webhookSecrets = await WebhooksKeyModel.findOne({
          store: store._id,
        })

        if (!webhookSecrets) {
          return res.status(200).json(order)
        }

        const webhookSecret = webhookSecrets.secret

        const webhookRequest: IAppWebhook = {
          eventType: "TransferFailed",
          transferType: "TransferIn",
          status: "TransferStatusEnum",
          fiatType: quote.fiatType,
          cryptoType: quote.cryptoType,
          amountProvided: quote.amountPaid,
          amountReceived: quote.cryptoAmount
            ? quote.cryptoAmount
            : quote.fiatAmount,
          fee: quote.fee,
          transferId: transfer ? transfer._id : "",
          transferAddress: quote.address ? quote.address : "",
        }

        await appWebhook(callback!, webhookRequest, webhookSecret)
      }

      return res.status(200).json(order)
    }

    if (req.body.status === "SUCCESSFUL" && req.body.status !== "DUPLICATE") {
      // if (req.body.status === "CANCELLED") {
      // Change the order status to DONE

      // Make the crypto payment to the user's wallet here....
      const userAddress = order.address
      const cryptoNetwork = order.chain
      const cryptoAsset = order.asset
      const amountToReceive = order.recieves

      // Make the network according the the chain, <Starknet Or EVM (Celo, Polygon, Eth) we their providers>::: BTC will come later

      // Chain provider ...
      // --> Starting with Celo here...
      const txHash = await payOutCrypto(
        userAddress,
        amountToReceive,
        cryptoNetwork,
        cryptoAsset
      )

      if (!txHash) {
        if (quote && transaction) {
          const store = await storeModel.findById(transaction.store)

          if (!store) {
            return res.status(200).json(order)
          }

          const callback = store.callback

          const webhookSecrets = await WebhooksKeyModel.findOne({
            store: store._id,
          })

          if (!webhookSecrets) {
            return res.status(200).json(order)
          }

          const webhookSecret = webhookSecrets.secret

          const webhookRequest: IAppWebhook = {
            eventType: "TransferFailed",
            transferType: "TransferIn",
            status: "TransferStatusEnum",
            fiatType: quote.fiatType,
            cryptoType: quote.cryptoType,
            amountProvided: quote.amountPaid,
            amountReceived: quote.cryptoAmount
              ? quote.cryptoAmount
              : quote.fiatAmount,
            fee: quote.fee,
            transferId: transfer ? transfer._id : "",
            transferAddress: quote.address ? quote.address : "",
          }

          await appWebhook(callback!, webhookRequest, webhookSecret)
        }
        return res.status(500).json({
          success: false,
          message: "Error occurred while processing payment",
        })
      }

      await changeOrderStatusFunc(order, "DONE", txHash ? txHash : "0x")

      if (quote && transaction) {
        const store = await storeModel.findById(transaction.store)

        if (!store) {
          return res.status(200).json(order)
        }

        const callback = store.callback

        const webhookSecrets = await WebhooksKeyModel.findOne({
          store: store._id,
        })

        if (!webhookSecrets) {
          return res.status(200).json(order)
        }

        const webhookSecret = webhookSecrets.secret

        const webhookRequest: IAppWebhook = {
          eventType: "TransferComplete",
          transferType: "TransferIn",
          status: "TransferStatusEnum",
          fiatType: quote.fiatType,
          cryptoType: quote.cryptoType,
          amountProvided: quote.amountPaid,
          amountReceived: quote.cryptoAmount
            ? quote.cryptoAmount
            : quote.fiatAmount,
          fee: quote.fee,
          transferId: transfer ? transfer._id : "",
          transferAddress: quote.address ? quote.address : "",
        }

        await appWebhook(callback!, webhookRequest, webhookSecret)
      }

      return res.status(200).json({ success: true, message: order })
    }

    return res.status(200).json(req.body)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export async function changeOrderStatusFunc(
  order: any,
  status: "IN-PROGRESS" | "CANCELLED" | "DONE" | "FAILED" | "REFUNDED",
  txHash: string
) {
  try {
    order.status = status
    order.txId = txHash
    order.updatedAt = new Date()

    await order.save()

    // Get the transfer for the order
    const transfer = await TransferModel.findOne({
      quote: order.orderno,
    })

    if (transfer) {
      const getTransferStatus = () => {
        switch (status) {
          case "IN-PROGRESS":
            if (order.orderType === "BUY") {
              return "TransferSendingCryptoFunds"
            }
            return "TransferReceivedFiatFunds"
          case "CANCELLED":
            return "TransferFailed"
          case "DONE":
            return "TransferComplete"
          case "REFUNDED":
            return "TransferRefunded"
          default:
            return "TransferWaitingForUserAction"
        }
      }

      await TransferModel.updateOne(
        { quote: order.orderno },
        { $set: { status: getTransferStatus() } }
      )
    }

    return order
  } catch (err: any) {
    // throw new Error(err)
    return err
  }
}

export async function getKotaniOrder(req: any, res: Response) {
  try {
    const orderRef = req.params.reference

    if (!orderRef) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order reference" })
    }

    const kotaniOrderStatus = await getKotaniOrderStatus(orderRef)

    return res.status(200).json(kotaniOrderStatus)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export async function getKotaniWithdrawOrder(req: any, res: Response) {
  try {
    const orderRef = req.params.reference

    if (!orderRef) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order reference" })
    }

    const kotaniOrderStatus = await getKotaniOrderWithdrawStatus(orderRef)

    return res.status(200).json(kotaniOrderStatus)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export const manuallPayOut = async (req: any, res: Response) => {
  try {
    // Get the last 20 transfers
    const transfers = await TransferModel.find().limit(50)

    return res.status(200).json({ response: transfers })
  } catch (error) {
    return res.status(500).json({ message: error })
  }
}

export const sendBlinkSats = async (req: any, res: Response) => {
  try {
    const { amount, lnAddress } = req.body

    // First, get the balance of the wallet
    const wallets = await getBlinkBalance()

    if (!wallets.success) {
      return res.status(500).json({ message: wallets.message })
    }

    const satsWallet = wallets.response[0]

    // Check if the amount is greater than the wallet balance
    if (parseInt(amount) > parseInt(satsWallet.balance)) {
      return res.status(400).json({
        message: "Amount is greater than the wallet balance",
      })
    }

    const payment = await sendBlinkPayment(amount, lnAddress)

    if (!payment.success) {
      return res.status(500).json({ message: payment.message })
    }

    return res.status(200).json({ payment })
  } catch (error) {
    return res.status(500).json({ message: error })
  }
}

export const getOneRampBlinkBalance = async (req: any, res: Response) => {
  try {
    const wallets = await getBlinkBalance()

    if (!wallets.success) {
      return res.status(500).json({ message: wallets.message })
    }

    return res.status(200).json({ wallets })
  } catch (error) {
    return res.status(500).json({ message: error })
  }
}

export async function kotaniPayWithdrawCallback(req: any, res: Response) {
  try {
    // const { orderId } = req.body
    console.log(
      "-------------Withdraw Callback from Kotani Pay ----------------"
    )

    // 1. Get the customer's address,
    // 2. Get the crypto and network they want to get paid in
    // 3. Get the amount paid, and amount to receive in Crypt

    // TODO: Requery the order if the status is PENDING
    const customer = await CustomerModel.findOne({
      customerKey: req.body.customerKey,
    })

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" })
    }

    const order = await OrdersModel.findById(customer.activeOrderId)

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" })
    }

    if (order.status === "REFUNDED") {
      return res.status(200).json({
        success: true,
        message: "Order already refunded",
      })
    }

    const quote = await QuoteModel.findById(order.quoteId)

    const transaction = await TransactionModel.findById(order.transactionId)

    const transfer = await TransferModel.findById(order.transferId)

    if (
      req.body.status === "CANCELLED" ||
      req.body.status === "FAILED" ||
      req.body.status === "DECLINED" ||
      req.body.status === "DUPLICATE" ||
      req.body.status === "ERROR_OCCURRED"
    ) {
      // Change the order status to CANCELLED

      await changeOrderStatusFunc(order, "CANCELLED", "0x")

      if (quote && transaction) {
        const store = await storeModel.findById(transaction.store)

        if (!store) {
          return res.status(200).json(order)
        }

        const callback = store.callback

        const webhookSecrets = await WebhooksKeyModel.findOne({
          store: store._id,
        })

        if (!webhookSecrets) {
          return res.status(200).json(order)
        }

        const webhookSecret = webhookSecrets.secret

        const webhookRequest: IAppWebhook = {
          eventType: "TransferFailed",
          transferType: "TransferOut",
          status: "TransferStatusEnum",
          fiatType: quote.fiatType,
          cryptoType: quote.cryptoType,
          amountProvided: quote.amountPaid,
          amountReceived: quote.cryptoAmount
            ? quote.cryptoAmount
            : quote.fiatAmount,
          fee: quote.fee,
          transferId: transfer ? transfer._id : "",
          transferAddress: quote.address ? quote.address : "",
        }

        await appWebhook(callback!, webhookRequest, webhookSecret)

        // Send refund to the user
        const payOutResponse = await payOutCrypto(
          order.address,
          order.recieves,
          order.chain,
          order.asset
        )

        if (payOutResponse.success) {
          order.status = "REFUNDED"
          await order.save()
        }
      }

      return res.status(200).json(order)
    }

    /*

    if (req.body.status === "SUCCESSFUL" && req.body.status !== "DUPLICATE") {
      // if (req.body.status === "CANCELLED") {
      // Change the order status to DONE

      // Make the crypto payment to the user's wallet here....
      const userAddress = order.address
      const cryptoNetwork = order.chain
      const cryptoAsset = order.asset
      const amountToReceive = order.recieves

      // Make the network according the the chain, <Starknet Or EVM (Celo, Polygon, Eth) we their providers>::: BTC will come later

      // Chain provider ...
      // --> Starting with Celo here...
      const txHash = await payOutCrypto(
        userAddress,
        amountToReceive,
        cryptoNetwork,
        cryptoAsset
      )

      if (!txHash) {
        if (quote && transaction) {
          const store = await storeModel.findById(transaction.store)

          if (!store) {
            return res.status(200).json(order)
          }

          const callback = store.callback

          const webhookSecrets = await WebhooksKeyModel.findOne({
            store: store._id,
          })

          if (!webhookSecrets) {
            return res.status(200).json(order)
          }

          const webhookSecret = webhookSecrets.secret

          const webhookRequest: IAppWebhook = {
            eventType: "TransferFailed",
            transferType: "TransferIn",
            status: "TransferStatusEnum",
            fiatType: quote.fiatType,
            cryptoType: quote.cryptoType,
            amountProvided: quote.amountPaid,
            amountReceived: quote.cryptoAmount
              ? quote.cryptoAmount
              : quote.fiatAmount,
            fee: quote.fee,
            transferId: transfer ? transfer._id : "",
            transferAddress: quote.address ? quote.address : "",
          }

          await appWebhook(callback!, webhookRequest, webhookSecret)
        }
        return res.status(500).json({
          success: false,
          message: "Error occurred while processing payment",
        })
      }

      await changeOrderStatusFunc(order, "DONE", txHash ? txHash : "0x")

      if (quote && transaction) {
        const store = await storeModel.findById(transaction.store)

        if (!store) {
          return res.status(200).json(order)
        }

        const callback = store.callback

        const webhookSecrets = await WebhooksKeyModel.findOne({
          store: store._id,
        })

        if (!webhookSecrets) {
          return res.status(200).json(order)
        }

        const webhookSecret = webhookSecrets.secret

        const webhookRequest: IAppWebhook = {
          eventType: "TransferComplete",
          transferType: "TransferIn",
          status: "TransferStatusEnum",
          fiatType: quote.fiatType,
          cryptoType: quote.cryptoType,
          amountProvided: quote.amountPaid,
          amountReceived: quote.cryptoAmount
            ? quote.cryptoAmount
            : quote.fiatAmount,
          fee: quote.fee,
          transferId: transfer ? transfer._id : "",
          transferAddress: quote.address ? quote.address : "",
        }

        await appWebhook(callback!, webhookRequest, webhookSecret)
      }

      return res.status(200).json({ success: true, message: order })
    }

    */

    return res.status(200).json(req.body)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
