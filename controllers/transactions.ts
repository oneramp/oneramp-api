import dotenv from "dotenv"
import { Request, Response } from "express"
import { callback } from "../external/calls"
import { sendSMS, telegramOrder, telegramGroupOrder } from "../helpers"
import DepositsModel from "../models/DespositModel"
import StoreActivityModel from "../models/StoreActivityModel"
import TransactionModel from "../models/TransactionModel"
import WithdrawModel from "../models/WithdrawModel"
import storeModel from "../models/storeModel"
import TransferModel from "../models/TransferModel"

dotenv.config()

export async function getAllActivity(req: Request, res: Response) {
  try {
    const { storeId } = req.params

    const allActivity = await StoreActivityModel.findOne({ store: storeId })

    return res.status(200).json({
      success: true,
      data: allActivity,
    })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      response: error.message,
    })
  }
}

export async function createTransactionAPI(req: Request, res: Response) {
  try {
    const store = await storeModel.findById(req.body.store)

    if (!store) return res.status(404).json({ error: "Store not found" })

    const newTransaction = {
      store: req.body.store,
      txHash: req.body.txHash,
      amount: req.body.amount,
      fiat: req.body.fiat,
      network: req.body.network,
      phone: req.body.phone,
      asset: req.body.asset,
      status: req.body.status,
      env: store.enviroment,
    }

    const transaction = new TransactionModel(newTransaction)
    const result = await transaction.save()

    const dateObj = new Date()
    const day = dateObj.getDate()
    const month = dateObj
      .toLocaleString("default", { month: "short" })
      .slice(0, 3)

    // Create a deposit modal
    const deposit = new DepositsModel({
      store: req.body.store,
      amount: req.body.amount,
      asset: req.body.asset,
      date: `${day}, ${month}`,
    })

    const savedDeposit = await deposit.save()

    // First see if activity exists
    const activity = await StoreActivityModel.findOne({ store: store._id })

    if (!activity) {
      // Create a new instance of the StoreActivityModel
      const newActivityInstance = new StoreActivityModel({
        store: store._id,
        deposits: savedDeposit.amount,
        total: savedDeposit.amount,
        withdraws: 0,
        enviroment: store?.enviroment,
      })

      // Save the new instance to the database
      await newActivityInstance.save()
    } else {
      // Increase the deposit total by updating the total on the StoreActivityModel

      const newTotal = Number(activity.total) + Number(savedDeposit.amount)

      const updatedActivity = await StoreActivityModel.findOneAndUpdate(
        { store: store._id },
        {
          $set: {
            total: newTotal,
            deposits: newTotal,
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
      const htmlText = `<b>OneRamp MOMO Order</b>
     Send UGX ${req.body.fiat} MOMO to ${req.body.phone} data.`

      telegramGroupOrder(htmlText)
      telegramOrder(htmlText)

      sendSMS(`Send UGX ${req.body.fiat} MOMO to ${req.body.phone}`)
      sendSMS(`Send UGX ${req.body.fiat} MOMO to ${req.body.phone}`)
    }

    return res.status(200).json({
      success: true,
      response: result,
    })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

export async function getFaucet(req: Request, res: Response) {
  try {
    const { address } = req.body

    //
  } catch (error) {}
}

export async function getDeposits(req: Request, res: Response) {
  try {
    const { storeId } = req.params
    const deposits = await DepositsModel.find({ store: storeId })

    return res.status(200).json({
      success: true,
      data: deposits,
    })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      response: error.message,
    })
  }
}

export async function createDeposit(req: Request, res: Response) {
  try {
    const dateObj = new Date()
    const day = dateObj.getDate()
    const month = dateObj
      .toLocaleString("default", { month: "short" })
      .slice(0, 3)

    const deposits = new DepositsModel({
      store: req.body.store,
      amount: req.body.amount,
      date: `${day}, ${month}`,
      asset: req.body.asset,
    })

    const saved = await deposits.save()

    // Make sure they have an all StoreActivityModel
    const storeActivity = await StoreActivityModel.findOne({
      store: req.body.store,
    })

    if (!storeActivity) {
      const newStoreActivity = new StoreActivityModel({
        store: req.body.store,
        total: req.body.amount,
        deposits: req.body.amount,
      })

      await newStoreActivity.save()
    } else {
      storeActivity.total += Number(req.body.amount)
      storeActivity.deposits += Number(req.body.amount)

      await storeActivity.save()
    }

    return res.status(200).json({
      success: true,
      data: saved,
    })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      response: error.message,
    })
  }
}

export async function getWithdraw(req: Request, res: Response) {
  try {
    const { storeId } = req.params
    const deposits = await WithdrawModel.find({ store: storeId })

    return res.status(200).json({
      success: true,
      data: deposits,
    })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      response: error.message,
    })
  }
}

export async function createWithdraw(req: Request, res: Response) {
  try {
    const dateObj = new Date()
    const day = dateObj.getDate()
    const month = dateObj
      .toLocaleString("default", { month: "short" })
      .slice(0, 3)

    const deposits = new WithdrawModel({
      store: req.body.store,
      withdrawAmount: req.body.amount,
      date: `${day}, ${month}`,
      asset: req.body.asset,
    })

    const saved = await deposits.save()

    // Make sure they have an all StoreActivityModel
    const storeActivity = await StoreActivityModel.findOne({
      store: req.body.store,
    })

    if (!storeActivity) {
      const newStoreActivity = new StoreActivityModel({
        store: req.body.store,
        total: req.body.amount,
        withdraws: req.body.amount,
      })

      await newStoreActivity.save()
    } else {
      storeActivity.total += Number(req.body.amount)
      storeActivity.withdraws += Number(req.body.amount)

      await storeActivity.save()
    }

    return res.status(200).json({
      success: true,
      data: saved,
    })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      response: error.message,
    })
  }
}

export async function removeDeposits(req: Request, res: Response) {
  try {
    const { storeId } = req.params
    const deposits = await DepositsModel.deleteMany({ store: storeId })

    return res.status(200).json({
      success: true,
      data: "removed",
    })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      response: error.message,
    })
  }
}

export async function removeWithdraws(req: Request, res: Response) {
  try {
    const { storeId } = req.params
    await WithdrawModel.deleteMany({ store: storeId })

    return res.status(200).json({
      success: true,
      data: "removed",
    })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      response: error.message,
    })
  }
}

export async function removeActivity(req: Request, res: Response) {
  try {
    const { storeId } = req.params
    await StoreActivityModel.deleteMany({ store: storeId })

    return res.status(200).json({
      success: true,
      data: "removed",
    })
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).json({
      success: false,
      response: error.message,
    })
  }
}

// Helper function to shuffle an array using Fisher-Yates algorithm
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export async function openZepplinTrigger(req: Request, res: Response) {
  try {
    const { address, txHash } = req.body

    const transaction = await TransactionModel.findOne({
      address: address,
      status: "Pending",
    })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order (latest first)
      .limit(1)

    if (!transaction)
      return res.status(400).json({ error: "Transaction was already complete" })

    const store = await storeModel.findById(transaction.store)

    if (!store) return res.status(404).json({ error: "Store not found" })

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
          status: "Progress",
        },
      },
      { new: true }
    )

    // First see if activity exists
    const activity = await StoreActivityModel.findOne({ store: store._id })

    if (!activity) {
      // Create a new instance of the StoreActivityModel
      const newActivityInstance = new StoreActivityModel({
        store: store._id,
        deposits: savedDeposit.amount,
        total: savedDeposit.amount,
        withdraws: 0,
        enviroment: store?.enviroment,
      })

      // Save the new instance to the database
      await newActivityInstance.save()
    } else {
      // Increase the deposit total by updating the total on the StoreActivityModel

      const newTotal = Number(activity.total) + Number(savedDeposit.amount)

      const updatedActivity = await StoreActivityModel.findOneAndUpdate(
        { store: store._id },
        {
          $set: {
            total: newTotal,
            deposits: newTotal,
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
      const htmlText = `<b>OneRamp MOMO Order</b>
     Send UGX ${transaction.fiat.toFixed(2).toLocaleString()} MOMO to ${
        transaction.phone
      }.`
      telegramGroupOrder(htmlText)
      telegramOrder(htmlText)

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

    return res.status(200).json({
      success: true,
      response: result,
    })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
