import mongoose, { Schema, Document } from "mongoose"
import { ITransfer } from "../types"

// Define the Response schema
const TransferSchema: Schema = new Schema({
  quote: { type: String, required: true, unique: true },
  status: { type: String, required: true },
  address: { type: String, required: true },
  operator: { type: String },
  // type: { type: String },
  phone: { type: String },
  txHash: { type: String },
  bankOrderId: { type: String },
  kotaniRef: { type: String },
  orderId: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now() },
})

// Create and export the Response model
const TransferModel = mongoose.model<ITransfer>("transfer", TransferSchema)

export default TransferModel
