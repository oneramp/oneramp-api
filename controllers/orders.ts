import { Response } from "express"
import OrdersModel from "../models/OrderModel"
import { sendSMS, telegramOrder, telegramGroupOrder, telegramOrderTwo } from "../helpers"
import TransferModel from "../models/TransferModel"
import TransactionModel from "../models/TransactionModel"
import { sendDepositsTrigger } from "../events/onchain"
import QuoteModel from "../models/QuoteModel"

export async function sendOrderPaidReminder(req: any, res: Response) {
  try {
    const { orderId } = req.body

    if (!orderId)
      return res.status(404).json({ error: "You need to enter an order id" })

    const order = await OrdersModel.findById(orderId)

    if (!order) return res.status(404).json({ error: "Order not found" })

    // Send telegram reminder to admin
    const htmlText = `<b> 🧐 On ramp Order</b>
      A user claims to have sent MOMO worth <strong>${order.currency} ${order.amount}</strong> using <strong>${order.phone}</strong> 
      on <strong >${order.network}</strong> on the <strong>${order.chain}</strong> blockchain.
      Verify using <strong>order no. ${order.orderno}</strong>
      Address: <strong> ${order.address} </strong>
      `
    await telegramGroupOrder(htmlText)
    await telegramOrder(htmlText)
    await telegramOrderTwo(htmlText)

    res.status(200).json({ success: true, response: "Reminder sent" })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export async function getAllOrders(req: any, res: Response) {
  try {
    const orders = await OrdersModel.find().sort({ createdAt: -1 })

    res.status(200).json(orders)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export async function sendOrderPaidNotification(req: any, res: Response) {
  try {
    const { transferId } = req.body

    if (!transferId)
      return res.status(404).json({ error: "You need to enter a transfer" })

    const transfer = await TransferModel.findById(transferId)

    if (!transfer) return res.status(404).json({ error: "Transfer not found" })

    if (transfer.status === "TransferComplete")
      return res
        .status(200)
        .json({ success: true, response: "Transfer already complete" })

    const quote = await QuoteModel.findOne({
      quoteId: transfer.quote,
    })

    if (!quote) return res.status(404).json({ error: "Quote not found" })

    // Send telegram reminder to admin
    const htmlText = `<b> 🧐 On ramp Buy Order</b>
      A user with <strong> ${transfer.phone} </strong> claims to have sent MOMO
      Set to recieve <strong> ${Number(quote.cryptoAmount).toFixed(2)} ${
      quote.cryptoType
    }</strong> on Address: <strong> ${quote.address} </strong>
      `
    await telegramGroupOrder(htmlText)
    await telegramOrder(htmlText)
    await telegramOrderTwo(htmlText)

    const smsMessage = `A user with ${transfer.phone} claims to have sent MOMO
    Set to recieve ${Number(quote.cryptoAmount).toFixed(2)} ${
      quote.cryptoType
    } on Address: ${quote.address}`

    await sendSMS(smsMessage)

    // Send SMS to admins

    res.status(200).json({ success: true, response: "Reminder sent" })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

// Merchants Controllers
export async function getActiveBuyOrders(req: any, res: Response) {
  try {
    const orders = await OrdersModel.find({
      orderType: "BUY",
      status: "INITIATED",
    }).sort({ createdAt: -1 })

    res.status(200).json(orders)
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
