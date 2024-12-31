import mongoose, { Document, Schema, Model } from "mongoose"
import { EnviromentE, TransactionI } from "../types"

const TransactionSchema: Schema = new Schema({
  store: {
    type: String,
    required: true,
  },
  txHash: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  fiat: {
    type: Number,
    required: true,
  },
  address: { type: String },
  phone: {
    type: String,
    required: true,
  },
  txType: {
    type: String,
    default: "Withdraw",
  },
  asset: {
    type: String,
    required: true,
  },
  network: {
    type: String,
  },
  status: {
    type: String,
    required: true,
  },
  operator: {
    type: String,
  },
  quote: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  env: {
    type: String,
    default: "DEV",
  },
})

const TransactionModel: any = mongoose.model<TransactionI>(
  `transactions`,
  TransactionSchema
)

export default TransactionModel
