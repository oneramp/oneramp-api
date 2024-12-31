import { Response } from "express"
import OrdersModel from "../../models/OrderModel"
import TransferModel from "../../models/TransferModel"
import TransactionModel from "../../models/TransactionModel"
import { sendDepositsTrigger } from "../../events/onchain"
import { sendUserSMS, telegramOrder } from "../../helpers"
import CustomerModel from "../../models/CustomerModel"
import { getKotaniOrderStatus } from "../../helpers/kotani/withdraw/kotani-withdraw"

// Merchants Controllers
export async function getOrders(req: any, res: Response) {
  try {
    // const { orderType, status } = req.params
    const { status } = req.params

    // if (orderType !== "BUY" || orderType !== "SELL") {
    //   return res.status(400).json({ message: "Invalid order type" })
    // }

    if (
      status !== "INITIATED" &&
      status !== "IN-PROGRESS" &&
      status !== "CANCELLED" &&
      status !== "DONE" &&
      status !== "FAILED"
    ) {
      return res.status(400).json({ message: "Invalid status" })
    }

    const orders = await OrdersModel.find({
      //   orderType: orderType,
      status: status,
    }).sort({ createdAt: -1 })

    res.status(200).json(orders)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export async function changeOrderStatus(req: any, res: Response) {
  try {
    // GET THE ORDER ID from the params
    const { orderId, status } = req.body

    // Corrected validation logic
    if (
      status !== "IN-PROGRESS" &&
      status !== "CANCELLED" &&
      status !== "DONE"
    ) {
      return res.status(400).json({ message: "Invalid status" })
    }

    const order = await OrdersModel.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (order.status === "DONE") {
      return res.status(400).json({ message: "Order already completed" })
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({ message: "Order already cancelled" })
    }

    order.status = status
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
          default:
            return "TransferWaitingForUserAction"
        }
      }

      await TransferModel.updateOne(
        { quote: order.orderno },
        { $set: { status: getTransferStatus() } }
      )
    }

    res.status(200).json(order)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export async function getActiveSellOrders(req: any, res: Response) {
  try {
    const orders = await OrdersModel.find({
      orderType: "SELL",
      status: "INITIATED",
    }).sort({ createdAt: -1 })

    res.status(200).json(orders)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export async function confirmOrder(req: any, res: Response) {
  try {
    const { orderId } = req.body

    const order = await OrdersModel.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    order.status = "DONE"

    await order.save()

    // Change the Tx Status to Completed....
    const transfer = await TransferModel.findOne({
      quote: order.orderno,
    })

    if (transfer) {
      await TransferModel.updateOne(
        { quote: order.orderno },
        { $set: { status: "TransferComplete" } }
      )
    }

    const transaction = await TransactionModel.findOne({
      quote: transfer?.quote,
    })

    if (transaction) {
      await sendDepositsTrigger(transaction._id, transaction._id)
    }

    res.status(200).json(order)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export const walletPayment = async (req: any, res: Response) => {
  try {
    const htmlText = `Payment Received`

    await telegramOrder(htmlText)
    return res.status(200).json({ message: "Payment received" })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
