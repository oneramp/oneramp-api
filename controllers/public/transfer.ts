import { Response } from "express"
import { adminWalletAddress, networkAddressMap } from "../../constants"
import {
  createInvoice,
  getMerchantAccount,
  pausedOnBankCountries,
  pausedOnMomoCountries,
  PayCrestSupportedNetworks,
} from "../../helpers"
import { getEVMTransactionInfo } from "../../helpers/evm"
import { convertSatsBTCtoUSD } from "../../helpers/fiatconnect/handlers"
import { makeKotaniPayTx } from "../../helpers/kotani/helpers"
import {
  getKotaniOrderStatus,
  getKotaniOrderWithdrawStatus,
} from "../../helpers/kotani/withdraw/kotani-withdraw"
import { sendMomoPayout } from "../../helpers/momo"
import { payCrestPayCrypto, payOutCrypto } from "../../helpers/payouts"
import { getStarknetTransactionInfo } from "../../helpers/starknet"
import OrdersModel from "../../models/OrderModel"
import QuoteModel from "../../models/QuoteModel"
import TransactionModel from "../../models/TransactionModel"
import TransferModel from "../../models/TransferModel"
import WebhooksKeyModel from "../../models/WebhooksKeysModel"
import storeModel from "../../models/storeModel"
import { appWebhook, IAppWebhook } from "../../webhooks"
import PayCrestService from "../PayCrest/PayCrestService"
import { changeOrderStatusFunc } from "../kotani/kotani-controllers"
import BankQuote from "../../models/BankQuote"
import { payCrestStatusUpdater } from "../../helpers/paycrest"
import KYCModel from "../../models/KYCModel"

export const publicTransferInHandler = async (req: any, res: Response) => {
  try {
    const body = {
      phone: req.body.phone,
      operator: req.body.operator,
      quoteId: req.body.quoteId,
    }

    // const body = validateZodSchema(req.body, transferRequestBodySchema)

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: body.quoteId })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    if (quote.transferType != `TransferIn`)
      return res.status(400).json({ error: `TransferNotAllowed` })

    if (quote.used) return res.status(404).json({ error: `ResourceNotFound` })

    // Verify KYC
    // const kyc = await KYCModel.findOne({ phoneNumber: body.phone })

    // if (!kyc) return res.status(400).json({ error: `KYCResourceNotFound` })

    // if (kyc.status !== "VERIFIED")
    //   return res.status(400).json({ error: kyc.status })

    const { store } = req.store

    const appStore = await storeModel.findById(store)

    if (!appStore) return res.status(400).json({ error: `InvalidStore` })

    const operator = getMerchantAccount(body.operator, quote.country)

    if (!operator) return res.status(400).json({ error: `InvalidOperator` })

    // Check if the quote country is the same as the operator country
    if (!operator.operationalCountries.includes(quote.country))
      return res.status(400).json({ error: `InvalidOperator` })

    const transfer = await TransferModel.findOne({ quote: quote.quoteId })

    if (transfer) return res.status(400).json({ error: `NonceInUse` })

    const mainStore = await storeModel.findById(store)

    if (
      pausedOnMomoCountries.includes(quote.country) &&
      body.operator != "bank"
    ) {
      return res.status(400).json({
        error: "ServerError",
        message: "Contact support to resolve",
      })
    }

    if (
      pausedOnBankCountries.includes(quote.country) &&
      body.operator === "bank"
    ) {
      return res.status(400).json({
        error: "ServerError",
        message: "Contact support to resolve",
      })
    }

    const transferAddress: string | undefined = quote.address
    // Create a transfer table here....
    const transferData: any = {
      quote: quote.quoteId,
      status: "TransferStarted",
      address: transferAddress,
      operator: body.operator,
      phone: body.phone,
    }

    const newTransfer = new TransferModel(transferData)

    // Save the transfer to the database
    const savedTransfer = await newTransfer.save()

    // Create a transaction in the db...
    const newTransaction: any = {
      store: store,
      txHash: "initTxHash",
      amount: Number(quote.cryptoAmount),
      address: quote.address,
      fiat: Number(quote.fiatAmount),
      network: quote.network,
      operator: body.operator,
      phone: body.phone,
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
      phone: body.phone,
      network: operator.name,
      operator: body.operator,
      currency: quote.country,
      orderType: "BUY",
      quoteId: quote._id,
      transactionId: tx._id,
      transferId: savedTransfer._id,
      chain: quote.network,
      status: "INITIATED", // You can set the status to INITIATED, PAID, or DONE
      amount: Number(quote.fiatAmount), // This is the amount the user paid in fiat
      recieves: Number(quote.cryptoAmount), // This is the amount the user will receive in crypto
      amountPaid: Number(quote.amountPaid), // This is the amount the user paid. It can be either in fiat or crypto depending on the type of transfer
      paidIn: quote.fiatType,
    }

    const createdOrder = await OrdersModel.create(orderData)

    savedTransfer.orderId = createdOrder._id

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

    // Now you start listening to the incoming tx event for 10 min
    // if (quote.cryptoType === "USDC" && quote.network === "celo") {
    //   // Now you start listening to the incoming tx event for 10 min
    //   listenToIncomingTxTransfer(tx._id.toString())
    // }

    // Change the quote status to used
    quote.used = true
    await quote.save()

    await savedTransfer.save()

    const storeCallBackEndpoint = appStore.callback

    const webhookKeys = await WebhooksKeyModel.findOne({
      store: store,
    })

    const kotaniOrderRef = await makeKotaniPayTx(
      quote,
      body.phone,
      body.operator,
      createdOrder._id.toString(),
      storeCallBackEndpoint,
      webhookKeys?.secret,
      savedTransfer._id
    )

    createdOrder.orderRef = kotaniOrderRef

    savedTransfer.kotaniRef = kotaniOrderRef

    await savedTransfer.save()
    await createdOrder.save()

    return res.status(200).json(response)
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
      errorDetails: error,
    }
    return res.status(400).json(errorResponse)
  }
}

export const publicTransferStatusHandler = async (req: any, res: Response) => {
  try {
    const params = {
      transferId: req.params.transferId,
    }

    const transfer = await TransferModel.findById(params.transferId)

    if (!transfer) return res.status(400).json({ error: `InvalidParameters` })

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: transfer.quote })

    if (!quote) return res.status(400).json({ error: `InvalidQuote` })

    // const operator = onerampMerchantAccounts[transfer.operator!]
    const operator = getMerchantAccount(transfer.operator!, quote.country)

    // const transferAddress = quote.network == "lightning" ? quote.address : "starknet" ? starknetAdminWalletAddress : adminWalletAddress
    const transferAddress = networkAddressMap[quote.network!]

    const orderId = transfer.orderId

    let userActionDetails

    if (quote.transferType == "TransferIn") {
      userActionDetails = {
        userActionType: "AccountNumberUserAction",
        institutionName: operator.name,
        accountName: operator.name,
        accountNumber: operator.merchantId, // <--- or change to Airtel according to the user selection
        transactionReference: `ref-${quote._id}`,
        kotaniRef: transfer.kotaniRef,
        // deadline: // <-- enter deadline ref here
      }
    }

    let order
    let txHash

    if (transfer.orderId) {
      order = await OrdersModel.findById(transfer.orderId)
      txHash = order.txId
    }

    const transaction = await TransactionModel.findById(order.transactionId)

    if (quote.transferType === "TransferIn" && order.orderRef) {
      const kotaniOrderResult = await getKotaniOrderStatus(order.orderRef)

      if (!kotaniOrderResult.success)
        return res.status(400).json({ message: "Failed to get order status" })

      const orderStatus = kotaniOrderResult.data.status

      if (
        order.status === "INITIATED" &&
        orderStatus === "SUCCESSFUL" &&
        orderStatus !== "DUPLICATE"
      ) {
        // if (orderStatus === "CANCELLED") {
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

        if (txHash) {
          // return res.status(500).json({
          //   success: false,
          //   message: "Error occurred while processing payment",
          // })
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
        }
      }
    } else {
      /*
      // if (quote.transferType === "TransferOut" && order.orderRef) {
      // Send webhook to the store
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

      if (order.orderRef) {
        const kotaniOrderResult = await getKotaniOrderWithdrawStatus(
          order.orderRef
        )

        if (!kotaniOrderResult.success)
          return res.status(500).json({ message: "Failed to get order status" })

        if (kotaniOrderResult.data.status === "SUCCESSFUL") {
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

        if (
          kotaniOrderResult.data.status === "CANCELLED" ||
          kotaniOrderResult.data.status === "FAILED"
        ) {
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
      }
        */
    }

    //
    const usePayCrestDirectly = PayCrestSupportedNetworks.includes(
      quote.network!
    )

    // Handle if the order is a bank order
    if (
      transfer.operator === "bank" &&
      transfer.bankOrderId &&
      !usePayCrestDirectly
    ) {
      // Send webhook to the store
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

      await payCrestStatusUpdater(
        transfer,
        order,
        webhookSecrets,
        quote,
        callback as string
      )
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
      txHash: txHash ? txHash : transfer.txHash,
      userActionDetails: {
        ...userActionDetails,
        kotaniRef: order.orderRef ? order.orderRef : transfer.kotaniRef,
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

export async function sendOrderPaidReminer(req: any, res: Response) {
  try {
    // const customer = await CustomerModel.findOne({
    //   activeOrderId: order.orderno,
    // })

    // if (!customer) {
    //   return res.status(404).json({ message: "Customer not found" })
    // }

    // const orderRefKotani = order.orderRef

    // if (orderRefKotani) {
    //   const orderStatus = await getKotaniOrderStatus(orderRefKotani)

    //   // Only make the payment if the order is successful
    // }

    const transferId = req.params.transferId

    if (!transferId)
      return res.status(404).json({ error: "You need to enter a transfer" })

    const transfer = await TransferModel.findById(transferId)

    console.log("====================================")
    console.log("Transfer", transfer)
    console.log("====================================")

    if (!transfer) return res.status(404).json({ error: "Transfer not found" })

    if (transfer.status === "TransferComplete")
      return res
        .status(200)
        .json({ success: true, response: "Transfer already complete" })

    const quote = await QuoteModel.findOne({
      quoteId: transfer.quote,
    })

    if (!quote) return res.status(404).json({ error: "Quote not found" })

    // const order = await OrdersModel.findOne({
    //   orderno: quote.quoteId,
    // })

    const orderId = transfer.orderId

    let order

    order = await OrdersModel.findById(orderId)

    // Here is where we are going to listen to the incoming onchain tx event using the address from the user to the admin address
    // 1. Cater for celo, evm // Starknet Later....
    // Then send the the momo to the user
    if (
      quote.country === "GHA" ||
      quote.country === "KE" ||
      quote.country === "TZ" ||
      quote.country === "UG"
    ) {
      // Get the order status from Kotani
      const kotaniOrderResult = await getKotaniOrderStatus(order.orderRef)

      if (!kotaniOrderResult.success)
        return res.status(500).json({ message: "Failed to get order status" })

      const orderStatus = kotaniOrderResult.data.status

      // TODO: Change it to SUCCESS after Debugging
      if (orderStatus === "SUCCESSFUL" && orderStatus !== "DUPLICATE") {
        // if (orderStatus === "CANCELLED") {
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
          return res.status(500).json({
            success: false,
            message: "Error occurred while processing payment",
          })
        }

        // TODO: Uncomment code after testing
        await changeOrderStatusFunc(order, "DONE", txHash ? txHash : "0x")

        return res.status(200).json({
          success: true,
          message: "Order paid successfully",
        })
      }
    }

    let htmlText

    if (quote.transferType == "TransferIn") {
      // Send telegram reminder to admin
      htmlText = `<b> ⬇️ On ramp Buy Order</b>
      A user with <strong> ${transfer.phone} </strong> claims to have sent MOMO
      Set to recieve <strong> ${Number(quote.cryptoAmount).toFixed(2)} ${
        quote.cryptoType
      }</strong> on Address: <strong> ${quote.address} </strong>
      `
    } else {
      htmlText = `<b> ⬆️ Off ramp Sell Order</b>
      A user claims to have sent <strong> ${Number(quote.cryptoAmount).toFixed(
        2
      )} ${quote.cryptoType}</strong> using Address: <strong> ${
        quote.address
      } </strong>
      Set to recieve <strong> ${Number(quote.fiatAmount).toFixed(2)} ${
        quote.fiatType
      }</strong> MoMo

      `
    }

    // Run telegram bot requests in parallel
    // const [oneRampResponse, orderTwoResponse, orderThreeResponse] =
    //   await Promise.all([
    //     oneRampTelegramBot(htmlText),
    //     telegramOrderTwo(htmlText),
    //     telegramGroupOrder(htmlText),
    //   ])

    // if (
    //   !oneRampResponse.success ||
    //   !orderTwoResponse.success ||
    //   !orderThreeResponse.success
    // ) {
    //   return res
    //     .status(500)
    //     .json({ success: false, message: "Failed to send reminders" })
    // }

    // const smsMessage = `A user with ${transfer.phone} claims to have sent MOMO
    // Set to recieve ${Number(quote.cryptoAmount).toFixed(2)} ${
    //   quote.cryptoType
    // } on Address: ${quote.address}`

    // await sendSMS(smsMessage)

    // Send SMS to admins

    res.status(200).json({ success: true, response: "Reminder sent" })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export const publicTransferOutHandler = async (req: any, res: Response) => {
  try {
    // const body = validateZodSchema(req.body, transferRequestBodySchema)

    const body = {
      phone: req.body.phone,
      operator: req.body.operator,
      quoteId: req.body.quoteId,
    }

    // find the quote
    const quote = await QuoteModel.findOne({ quoteId: body.quoteId })

    if (!quote) return res.status(404).json({ error: `ResourceNotFound` })

    if (quote.transferType != `TransferOut`)
      return res.status(400).json({ error: `TransferNotAllowed` })

    if (quote.used) return res.status(404).json({ error: `ResourceNotFound` })

    // Verify KYC
    // const kyc = await KYCModel.findOne({ phoneNumber: body.phone })

    // if (!kyc) return res.status(400).json({ error: `ResourceNotFound` })

    // if (kyc.status !== "VERIFIED")
    //   return res.status(400).json({ error: kyc.status })

    const { store } = req.store

    const operator = getMerchantAccount(body.operator, quote.country)

    if (!operator) return res.status(400).json({ error: `InvalidOperator` })

    if (!operator.operationalCountries.includes(quote.country))
      return res.status(400).json({ error: `InvalidOperator` })

    const transfer = await TransferModel.findOne({ quote: quote.quoteId })

    if (transfer) return res.status(400).json({ error: `InvalidQuote` })

    const mainStore = await storeModel.findById(store)

    if (
      pausedOnMomoCountries.includes(quote.country) &&
      body.operator != "bank"
    ) {
      return res.status(400).json({
        error: "ServerError",
        message: "Contact support to resolve",
      })
    }

    if (
      pausedOnBankCountries.includes(quote.country) &&
      body.operator === "bank"
    ) {
      return res.status(400).json({
        error: "ServerError",
        message: "Contact support to resolve",
      })
    }

    let invoice
    let transferAddress: string | undefined

    if (quote.cryptoType == "BTC") {
      let convertedSats

      if (quote.requestType === "fiat") {
        convertedSats = await convertSatsBTCtoUSD(
          Number(quote.amountPaid),
          quote.fiatType
        )
      } else {
        convertedSats = await convertSatsBTCtoUSD(
          Number(quote.fiatAmount),
          quote.fiatType
        )
      }

      const lightningInvoice = await createInvoice(
        Math.floor(Number(convertedSats)),
        // Math.floor(Number(quote.cryptoAmount)),
        "OneRamp payment"
      )

      if (!lightningInvoice.success) {
        invoice = "oneramp@blink.sv"
        transferAddress = invoice
      } else {
        invoice = lightningInvoice.data
        networkAddressMap.lightning = invoice
        transferAddress = networkAddressMap.lightning
      }
    } else {
      transferAddress = networkAddressMap[quote.network!]
    }

    // const appStore = await storeModel.findById(store)
    // Create a transfer table here....
    const transferData: any = {
      quote: quote.quoteId,
      status: "TransferStarted",
      address: transferAddress,
      operator: body.operator,
    }

    const newTransfer = new TransferModel(transferData)

    // Save the transfer to the database
    const savedTransfer = await newTransfer.save()

    const phone = body.phone ? body.phone : "+233000000000"

    // Create a transaction in the db...
    let newTransaction: any = {
      store: store,
      txHash: "initTxHash",
      amount: Number(quote.cryptoAmount),
      address: quote.address,
      fiat: Number(quote.fiatAmount),
      network: quote.network,
      phone: phone,
      operator: body.operator,
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
      network: operator.name,
      operator: body.operator,
      currency: quote.country,
      orderType: "SELL",
      quoteId: quote._id,
      transactionId: tx._id,
      transferId: savedTransfer._id,
      chain: quote.network,
      status: "INITIATED", // You can set the status to INITIATED, PAID, or DONE
      amount: Number(quote.fiatAmount), // This is the amount the user paid in fiat
      recieves: Number(quote.cryptoAmount), // This is the amount the user will receive in crypto
      amountPaid: Number(quote.amountPaid), // This is the amount the user paid. It can be either in fiat or crypto depending on the type of transfer
      paidIn: quote.fiatType,
    }

    const createdOrder = await OrdersModel.create(orderData)

    const usePayCrestDirectly = PayCrestSupportedNetworks.includes(
      quote.network!
    )

    let response

    if (req.body.operator === "bank" && req.body.bank && usePayCrestDirectly) {
      if (!quote.network || !quote.address) {
        return res.status(400).json({
          success: false,
          error: "Invalid quote",
        })
      }

      const rate = await PayCrestService.getRate({
        token: quote.cryptoType,
        amount: quote.amountPaid,
        fiat: quote.fiatType,
      })

      if (rate.status != "success") {
        return res.status(400).json({
          success: false,
          error: "Operation Failed",
        })
      }

      const bankResponse = await PayCrestService.offRamp({
        amount: Number(quote.cryptoAmount),
        token: quote.cryptoType,
        rate: rate.data.toString(),
        network: quote.network,
        recipient: {
          bankId: req.body.bank.code,
          accountNumber: req.body.bank.accountNumber,
          accountName: req.body.bank.accountName,
        },
        returnAddress: quote.address,
      })

      if (bankResponse.status != "success") {
        return res.status(400).json({
          success: false,
          error: "Operation failed",
        })
      }

      savedTransfer.bankOrderId = bankResponse.data.id

      response = {
        transferId: savedTransfer._id,
        transferStatus: savedTransfer.status,
        transferAddress: bankResponse.data.receiveAddress,
      }
    } else {
      if (!usePayCrestDirectly && req.body.operator === "bank") {
        const bankQuote = await BankQuote.create({
          transferId: savedTransfer._id.toString(),
          code: req.body.bank.code,
          accountNumber: req.body.bank.accountNumber,
          accountName: req.body.bank.accountName,
        })

        await bankQuote.save()
      }

      response = {
        transferId: savedTransfer._id.toString(),
        transferStatus: savedTransfer.status,
        // transferAddress: savedTransfer.address,
        transferAddress: savedTransfer.address,
      }
    }

    // if (quote.cryptoType === "USDC" && quote.network === "celo") {
    //   // Now you start listening to the incoming tx event for 10 min
    //   listenToIncomingTxTransfer(tx._id.toString())
    // }

    // Change the quote status to used
    quote.used = true
    savedTransfer.orderId = createdOrder._id
    await savedTransfer.save()
    await quote.save()

    // const isAutomationSupported = kotaniSupportedCountries.includes(
    //   quote.country
    // )

    // if (isAutomationSupported && createdOrder.status === "INITIATED") {
    //   listenToOnChainPayment(
    //     quote,
    //     response.transferAddress,
    //     createdOrder._id.toString(),
    //     body.operator,
    //     body.phone
    //     // orderData.amount
    //   )
    // }

    return res.status(200).json(response)
  } catch (error) {
    const errorResponse = {
      error: `InvalidSchema`,
      errorDetails: error,
    }

    return res.status(400).json(errorResponse)
  }
}

export async function checkOnChainTransaction(req: any, res: Response) {
  try {
    const { transferId, txHash } = req.body

    if (!transferId)
      return res.status(404).json({ error: "You need to enter a transfer" })

    const transfer = await TransferModel.findById(transferId)

    if (!transfer) return res.status(404).json({ error: "Transfer not found" })

    if (transfer.status === "TransferComplete")
      return res.status(200).json({
        success: true,
        response: "Transfer already complete",
        id: transfer.kotaniRef,
      })

    const quote = await QuoteModel.findOne({
      quoteId: transfer.quote,
    })

    if (!quote) return res.status(404).json({ error: "Quote not found" })

    const orderId = transfer.orderId

    const order = await OrdersModel.findById(orderId)

    if (!order) return res.status(404).json({ error: "Order not found" })

    if (order.status === "IN-PROGRESS") {
      return res.status(201).json({
        success: true,
        id: order.orderRef,
        message: "Order already in progress",
      })
    }

    if (order.status === "DONE")
      return res.status(201).json({
        success: true,
        id: order.orderRef,
        message: "Order already paid",
      })

    if (order.status === "IS-REFUNDING") {
      return res.status(201).json({
        success: true,
        id: order.orderRef,
        message: "Order already in progress",
      })
    }

    if (order.status === "REFUNDED") {
      return res.status(201).json({
        success: true,
        id: order.orderRef,
        message: "Order already refunded",
      })
    }

    // Set the order in progress
    order.status = "IN-PROGRESS"
    await order.save()

    const cryptoNetwork = quote.network

    if (!cryptoNetwork)
      return res.status(404).json({ error: "Network not found" })

    let txResult

    if (cryptoNetwork === "starknet") {
      txResult = await getStarknetTransactionInfo(txHash)
    } else {
      txResult = await getEVMTransactionInfo(txHash, order.chain)
    }
    const transaction = await TransactionModel.findById(order.transactionId)

    if (!txResult?.success) {
      return res.status(500).json({ success: false, response: txHash.tx })
    }

    // Check and see the orderRef and get the transaction status from kotani Pay
    const orderRef = order.orderRef

    const store = await storeModel.findById(transaction.store)

    if (!store) {
      return res.status(404).json({
        success: false,
        error: "Invalid store",
      })
    }

    const callback = store.callback

    const webhookSecrets = await WebhooksKeyModel.findOne({
      store: store._id,
    })

    if (!webhookSecrets) {
      return res.status(404).json({
        success: false,
        error: "Invalid store webhook credentials",
      })
    }

    // Check the onchain transaction for the user basing on the crypto type
    if (orderRef) {
      const kotaniWithdrawStatus = await getKotaniOrderWithdrawStatus(orderRef)

      if (!kotaniWithdrawStatus || !kotaniWithdrawStatus.success)
        return res.status(500).json({ message: "Failed to get order status" })

      const kotaniStatus = kotaniWithdrawStatus.data.status

      if (
        kotaniStatus === "TRANSACTION_INITIATED" ||
        kotaniStatus === "INITIATED" ||
        kotaniStatus === "PENDING" ||
        kotaniStatus === "IN_PROGRESS" ||
        kotaniStatus === "PROCESSING"
      ) {
        return res.status(200).json({
          success: true,
          id: order.orderRef,
          message: "Transaction is still pending",
        })
      }

      if (kotaniStatus != "SUCCESSFUL") {
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

        let refundAmount: string

        if (quote.requestType === "crypto") {
          refundAmount = Number(quote.amountPaid).toString()
        } else {
          refundAmount = Number(quote.cryptoAmount).toFixed(2) // You can specify the precision here, e.g., 2 decimal places
        }

        // await changeOrderStatusFunc(order, "IN-PROGRESS", txHash)

        // Set the order in progress
        order.status = "IS-REFUNDING"
        await order.save()

        // Send refund to the user
        const payOutResponse = await payOutCrypto(
          order.address,
          refundAmount,
          order.chain,
          order.asset
        )

        if (!payOutResponse) {
          order.status = "FAILED"
          await order.save()
          return res.status(500).json({ message: "Failed to crypto refund!" })
        }

        order.status = "REFUNDED"

        await order.save()

        await changeOrderStatusFunc(order, "REFUNDED", payOutResponse)

        return res.status(200).json({
          message: "The order has been refunded to the user",
        })
      }
    }

    const phone = order.phone
    // Check the onchain transaction for the user basing on the crypto type

    // const amount = quote.providerAmount
    //   ? Number(quote.providerAmount)
    //   : order.amount

    let amount

    if (quote.country === "KE") {
      amount = Number(quote.providerAmount).toFixed()
    } else {
      amount = Number(quote.providerAmount)
    }

    const usePayCrestDirectly = PayCrestSupportedNetworks.includes(
      quote.network!
    )

    if (transfer.operator === "bank" && !usePayCrestDirectly) {
      const bankOrderId = transfer.bankOrderId

      if (bankOrderId) {
        const bankOrderStatus = await PayCrestService.getOrderStatus(
          bankOrderId
        )

        if (bankOrderStatus.status != "success") {
          return { success: false, message: "Failed to get order status" }
        }

        if (bankOrderStatus.data.status === "settled") {
          const txHash = req.body.txHash
          await changeOrderStatusFunc(order, "DONE", txHash)
        }
      }

      const bankQuote = await BankQuote.findOne({
        transferId: transfer._id.toString(),
      })

      if (!bankQuote) {
        return res.status(400).json({
          success: false,
          error: "Operation failed",
        })
      }

      const rate = await PayCrestService.getRate({
        token: "USDC",
        amount: quote.amountPaid,
        fiat: quote.fiatType,
      })

      const bankResponse = await PayCrestService.offRamp({
        amount: Number(quote.amountPaid),
        token: "USDC",
        rate: rate.data,
        network: "base",
        recipient: {
          bankId: bankQuote.code,
          accountNumber: bankQuote.accountNumber,
          accountName: bankQuote.accountName,
          // bankId: "ABNGNGLA",
          // accountNumber: "0058660220",
          // accountName: "CHUKWUEMEKA ANTHONY CHUKWU",
        },
        returnAddress: adminWalletAddress,
      })

      if (bankResponse.status != "success") {
        return res.status(400).json({
          success: false,
          error: "Operation failed",
        })
      }

      if (rate.status != "success") {
        return res.status(400).json({
          success: false,
          error: "Operation Failed",
        })
      }

      const payCrestAddress = bankResponse.data.receiveAddress
      const amountToPay = quote.amountPaid!
      const cryptoNetwork = "base"
      const cryptoAsset = "USDC"

      // --> Starting with Celo here...
      const txHash = await payOutCrypto(
        payCrestAddress,
        amountToPay,
        cryptoNetwork,
        cryptoAsset
      )

      if (!txHash) {
        return res.status(500).json({
          success: false,
          message: "Error occurred while processing payment",
        })
      }

      transfer.bankOrderId = bankResponse.data.id
      await transfer.save()

      await changeOrderStatusFunc(order, "IN-PROGRESS", txHash ? txHash : "0x")

      return res
        .status(200)
        .json({ success: true, message: "Payout done sent" })
    }

    // Momo Payout
    const payoutResult = await sendMomoPayout(
      phone,
      order._id,
      order.operator,
      order.currency,
      // order.amount
      amount as number
    )

    order.orderRef = payoutResult.response.referenceId
    transfer.kotaniRef = payoutResult.response.referenceId

    await transfer.save()
    await order.save()

    if (
      payoutResult.success &&
      payoutResult.response.message.includes(
        "Withdrawal request sent successfully"
      )
    ) {
      await changeOrderStatusFunc(order, "IN-PROGRESS", txHash)
      return res
        .status(200)
        .json({ success: true, message: "Payout initiated" })
    }

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

    res.status(200).json({ success: true, message: "Payout done sent" })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export async function payoutOrderManually(req: any, res: Response) {
  try {
    const { orderId } = req.body

    const order = await OrdersModel.findById(orderId)

    if (!order) return res.status(404).json({ error: "Order not found" })

    if (order.status === "DONE")
      return res.status(200).json({
        success: true,
        id: order.orderRef,
        message: "Order already paid",
      })

    if (order.status === "IN-PROGRESS") {
      return res.status(200).json({
        success: true,
        id: order.orderRef,
        message: "Order already in progress",
      })
    }

    // +254720551698

    // return res.status(200).json(order)

    const cryptoNetwork = order.chain
    const txHash = order.txId
    const country = order.currency
    const providerAmount = order.amount

    if (!cryptoNetwork)
      return res.status(404).json({ error: "Network not found" })

    let txResult

    if (cryptoNetwork === "starknet") {
      txResult = await getStarknetTransactionInfo(txHash)
    } else {
      txResult = await getEVMTransactionInfo(txHash, order.chain)
    }

    if (!txResult?.success) {
      return res.status(500).json({ success: false, response: txHash.tx })
    }

    order.status = "IN-PROGRESS"
    await order.save()

    await changeOrderStatusFunc(order, "IN-PROGRESS", txHash)

    const phone = order.phone

    let amount

    if (country === "KE") {
      amount = Number(providerAmount).toFixed()
    } else {
      amount = Number(providerAmount)
    }

    const payoutResult = await sendMomoPayout(
      phone,
      order._id,
      order.operator,
      order.currency,
      // order.amount
      amount as number
    )

    if (!payoutResult?.success) {
      order.status = "FAILED"
      await order.save()
      return res.status(500).json({ message: "Failed to send momo" })
    }

    order.status = "DONE"
    order.orderRef = payoutResult.response.referenceId

    await order.save()

    if (
      payoutResult.success &&
      payoutResult.response.message.includes("request sent successfully")
    ) {
      await changeOrderStatusFunc(order, "DONE", txHash)
    }

    res.status(200).json({ success: true, message: "Payout done sent" })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
