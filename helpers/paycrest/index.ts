import PayCrestService from "../../controllers/PayCrest/PayCrestService"
import { IQuote } from "../../models/QuoteModel"
import TransferModel from "../../models/TransferModel"
import { ITransfer } from "../../types"
import { appWebhook, IAppWebhook } from "../../webhooks"

export const payCrestStatusUpdater = async (
  transfer: ITransfer,
  order: any,
  webhookSecrets: any,
  quote: IQuote,
  callback: string
) => {
  try {
    const bankOrderStatus = await PayCrestService.getOrderStatus(
      transfer.bankOrderId!
    )

    if (bankOrderStatus.status != "success") {
      return { success: false, message: "Failed to get order status" }
    }

    if (bankOrderStatus.data.status === "settled") {
      order.txId = "0x"
      order.updatedAt = new Date()

      await order.save()

      await TransferModel.updateOne(
        { quote: order.orderno },
        { $set: { status: "TransferComplete" } }
      )

      const webhookSecret = webhookSecrets.secret

      const webhookRequest: IAppWebhook = {
        eventType: "TransferComplete",
        transferType: "TransferOut",
        status: "TransferStatusEnum",
        fiatType: quote.fiatType,
        cryptoType: quote.cryptoType,
        amountProvided: quote.fiatAmount,
        amountReceived: quote.cryptoAmount
          ? quote.cryptoAmount
          : quote.fiatAmount,
        fee: quote.fee,
        transferId: transfer ? transfer._id : "",
        transferAddress: quote.address ? quote.address : "",
      }

      await appWebhook(callback!, webhookRequest, webhookSecret)
    }

    if (bankOrderStatus.data.status === "initiated") {
      order.txId = "0x"
      order.updatedAt = new Date()

      await order.save()

      await TransferModel.updateOne(
        { quote: order.orderno },
        { $set: { status: "TransferStarted" } }
      )

      const webhookSecret = webhookSecrets.secret

      const webhookRequest: IAppWebhook = {
        eventType: "TransferStarted",
        transferType: "TransferOut",
        status: "TransferStatusEnum",
        fiatType: quote.fiatType,
        cryptoType: quote.cryptoType,
        amountProvided: quote.fiatAmount,
        amountReceived: quote.cryptoAmount
          ? quote.cryptoAmount
          : quote.fiatAmount,
        fee: quote.fee,
        transferId: transfer ? transfer._id : "",
        transferAddress: quote.address ? quote.address : "",
      }

      await appWebhook(callback!, webhookRequest, webhookSecret)
    }

    if (bankOrderStatus.data.status === "expired") {
      order.txId = "0x"
      order.updatedAt = new Date()

      await order.save()

      await TransferModel.updateOne(
        { quote: order.orderno },
        { $set: { status: "TransferFailed" } }
      )

      const webhookSecret = webhookSecrets.secret

      const webhookRequest: IAppWebhook = {
        eventType: "TransferFailed",
        transferType: "TransferOut",
        status: "TransferStatusEnum",
        fiatType: quote.fiatType,
        cryptoType: quote.cryptoType,
        amountProvided: quote.fiatAmount,
        amountReceived: quote.cryptoAmount
          ? quote.cryptoAmount
          : quote.fiatAmount,
        fee: quote.fee,
        transferId: transfer ? transfer._id : "",
        transferAddress: quote.address ? quote.address : "",
      }

      await appWebhook(callback!, webhookRequest, webhookSecret)
    }

    return {
      success: true,
      response: "webhook successfully called",
    }
  } catch (error) {
    return {
      success: false,
      error,
    }
  }
}
