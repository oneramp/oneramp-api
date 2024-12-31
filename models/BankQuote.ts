import mongoose, { Schema } from "mongoose"
import { BankQuoteI } from "../types"

const BankQuoteSchema: Schema = new Schema({
  transferId: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  accountNumber: {
    type: String,
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
})

export default mongoose.model<BankQuoteI>("BankQuote", BankQuoteSchema)
