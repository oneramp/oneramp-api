import { adminWalletAddress, cUSDAddress, celoProviderUrl } from "../constants"
import { callback } from "../external/calls"
import { oneRampTelegramBot, telegramGroupOrder, sendSMS } from "../helpers"
import DepositsModel from "../models/DespositModel"
import StoreActivityModel from "../models/StoreActivityModel"
import TransactionModel from "../models/TransactionModel"
import TransferModel from "../models/TransferModel"
import WithdrawModel from "../models/WithdrawModel"
import storeModel from "../models/storeModel"

const { ethers } = require("ethers")

// In-memory cache for processed transaction hashes
const processedTransactions = new Set()

const provider = new ethers.JsonRpcProvider(celoProviderUrl)

export async function listenToIncomingTxTransfer(txId: string) {
  try {
    // Sets up a filter for all events of the specified token going to the wallet
    const topicSets = [
      ethers.utils.id("Transfer(address,address,uint256)"),
      null,
      [
        ethers.utils.hexZeroPad(cUSDAddress, 32),
        ethers.utils.hexZeroPad(adminWalletAddress, 32),
      ],
    ]

    // Listens for matching events
    const filter = provider.on(topicSets, async (log: any) => {
      await sendWithdrawTrigger(txId, log.transactionHash)
    })

    // Return the filter so it can be used later if needed
    return filter
  } catch (error) {
    return error
  }
}

export async function sendWithdrawTrigger(txId: string, txHash: string) {
  // Check if the transaction hash has already been processed
  if (processedTransactions.has(txHash)) {
    return // Skip processing this transaction
  }

  try {
    const transaction = await TransactionModel.findById(txId)

    if (!transaction) return { error: "Transaction was already complete" }

    if (transaction.txHash === txHash)
      return { error: "Transaction was already complete" }

    if (transaction.status === "Progress")
      return { error: "Transaction was already complete" }

    const store = await storeModel.findById(transaction.store)

    if (transaction._id.toString() != txId)
      return { error: "Invalid Transaction" }

    if (!store) return { error: "Store not found" }

    const dateObj = new Date()
    const day = dateObj.getDate()
    const month = dateObj
      .toLocaleString("default", { month: "short" })
      .slice(0, 3)

    // Create a deposit modal
    const withdraw = new WithdrawModel({
      store: store._id,
      withdrawAmount: transaction.amount,
      asset: transaction.asset,
      date: `${day}, ${month}`,
    })

    const savedWithdraw = await withdraw.save()

    // Update the transaction status to Progress
    transaction.txHash = txHash
    transaction.status = "Progress"

    const result = await transaction.save()

    // const result = await TransactionModel.findOneAndUpdate(
    //   { _id: transaction._id },
    //   {
    //     $set: {
    //       txHash: txHash,
    //       status: "Progress",
    //     },
    //   },
    //   { new: true }
    // )

    // First see if activity exists
    const activity = await StoreActivityModel.findOne({ store: store._id })

    if (!activity) {
      // Create a new instance of the StoreActivityModel
      await StoreActivityModel.create({
        store: store._id,
        deposits: 0,
        total: savedWithdraw.amount,
        withdraws: savedWithdraw.amount,
        enviroment: store?.enviroment,
      })

      // Save the new instance to the database
    } else {
      // Increase the withdraw total by updating the total on the StoreActivityModel

      const newTotal =
        Number(activity.total) + Number(savedWithdraw.withdrawAmount)

      const updatedActivity = await StoreActivityModel.findOneAndUpdate(
        { store: store._id },
        {
          $set: {
            total: newTotal,
            deposits: activity.deposits,
            withdraws: activity.withdraws + savedWithdraw.withdrawAmount,
          },
        },
        { new: true }
      )

      await updatedActivity?.save()

      // Handle the updated activity as needed
      // console.log("Updated Activity:", updatedActivity)
    }

    // Finds the store's dev enviroment to see if it's in DevMode and automatically calls the callback
    const enviroment: any = store.enviroment

    if (enviroment === "DEV") {
      setTimeout(function () {
        // auto call store's callback here
        callback(result._id)
      }, 30000) // 30000 milliseconds = 30 seconds
    } else {
      // send telegram notification here....
      // Send telegram order msg here...
      const htmlText = `<b>⬆️ OneRamp Sell Order (OnChain)</b>
      A User with address ${
        transaction.address
      } claims to have paid <strong> ${transaction.amount
        .toFixed(2)
        .toLocaleString()} cUSD. </strong> 
        
        🧐 See <strong>${txHash}</strong> 
        
        Phone to receive MoMo: <strong>${transaction.phone}</strong> 
      `

      await oneRampTelegramBot(htmlText)
      await telegramGroupOrder(htmlText)

      // sendSMS(`Send UGX ${transaction.amount} MOMO to ${transaction.phone}`)
      // sendSMS(`Send UGX ${req.body.fiat} MOMO to ${req.body.phone}`)
    }

    // Update the transfer status to TransferReceivedCryptoFunds
    // Update the Transfer status....
    const tranfer = await TransferModel.findOne({ quote: transaction.quote })

    if (tranfer) {
      const updatedTransfer = await TransferModel.findOneAndUpdate(
        { quote: transaction.quote },
        { $set: { status: "TransferReceivedCryptoFunds" } },
        { new: true }
      )

      await updatedTransfer?.save()
    }

    // After successfully processing, add the txHash to the cache
    processedTransactions.add(txHash)

    // Optionally, remove the txHash from the cache after some time to prevent memory issues
    setTimeout(() => processedTransactions.delete(txHash), 60000) // 60 seconds

    return {
      success: true,
      response: result,
    }
  } catch (err: any) {
    {
      message: err.message
    }
  }
}

export async function sendDepositsTrigger(txId: string, txHash: string) {
  try {
    const transaction = await TransactionModel.findById(txId)

    if (!transaction) return { error: "Transaction was already complete" }

    const store = await storeModel.findById(transaction.store)

    if (!store) return { error: "Store not found" }

    const dateObj = new Date()
    const day = dateObj.getDate()
    const month = dateObj
      .toLocaleString("default", { month: "short" })
      .slice(0, 3)

    // Create a deposit modal
    const deposit = new DepositsModel({
      store: store._id,
      amount: transaction.amount,
      asset: transaction.asset,
      date: `${day}, ${month}`,
    })

    const savedDeposit = await deposit.save()

    const result = await TransactionModel.findOneAndUpdate(
      { _id: transaction._id },
      {
        $set: {
          txHash: txHash,
          status: "Done",
        },
      },
      { new: true }
    )

    // First see if activity exists
    const activity = await StoreActivityModel.findOne({ store: store._id })

    if (!activity) {
      // Create a new instance of the StoreActivityModel
      await StoreActivityModel.create({
        store: store._id,
        deposits: savedDeposit.amount,
        total: savedDeposit.amount,
        withdraws: 0,
        enviroment: store?.enviroment,
      })

      // Save the new instance to the database
    } else {
      // Increase the deposit total by updating the total on the StoreActivityModel

      const newTotal = Number(activity.total) + Number(savedDeposit.amount)

      const updatedActivity = await StoreActivityModel.findOneAndUpdate(
        { store: store._id },
        {
          $set: {
            total: newTotal,
            deposits: activity.deposits + savedDeposit.amount,
            withdraws: activity.withdraws,
          },
        },
        { new: true }
      )

      await updatedActivity?.save()
    }

    // Finds the store's dev enviroment to see if it's in DevMode and automatically calls the callback
    const enviroment: any = store.enviroment

    if (enviroment === "DEV") {
      setTimeout(function () {
        // auto call store's callback here
        callback(result._id)
      }, 30000) // 30000 milliseconds = 30 seconds
    }

    return {
      success: true,
      response: result,
    }
  } catch (err: any) {
    {
      message: err.message
    }
  }
}
