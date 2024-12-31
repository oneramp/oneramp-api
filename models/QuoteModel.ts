import mongoose, { Schema, Document } from "mongoose"
import { Countries } from "../types"

// Define the Quote interface for TypeScript
export interface IQuote extends Document {
  fiatType: string
  cryptoType: string
  fiatAmount: string
  cryptoAmount?: string
  address?: string
  country: Countries
  fee: string
  amountPaid: string
  guaranteedUntil: string
  transferType: string
  quoteId: string
  phone?: string
  network?: string
  providerAmount?: string
  used: boolean
  requestType: "crypto" | "fiat"
}

// Define the Quote schema
const QuoteSchema: Schema = new Schema(
  {
    fiatType: { type: String, required: true },
    cryptoType: { type: String, required: true },
    fiatAmount: { type: String },
    cryptoAmount: { type: String },
    country: { type: String, default: Countries.UG },
    amountPaid: { type: String },
    address: { type: String },
    fee: { type: String, required: true },
    guaranteedUntil: { type: String, required: true },
    transferType: { type: String, required: true },
    phone: { type: String },
    quoteId: { type: String, required: true, unique: true },
    network: { type: String },
    providerAmount: { type: String },
    used: { type: Boolean, default: false },
    requestType: { type: String, default: "fiat" },
  },
  {
    // Specify that the _id field should not be included in the output
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        delete ret._id
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        delete ret._id
      },
      id: false,
    },
  }
)

// Create and export the Quote model
const QuoteModel = mongoose.model<IQuote>("quote", QuoteSchema)

export default QuoteModel
