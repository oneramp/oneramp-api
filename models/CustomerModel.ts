import mongoose, { Document, Schema } from "mongoose"

interface ICustomer extends Document {
  customerKey: string
  countryCode: string
  phoneNumber: string
  network: string
  accountName: string
  activeOrderId: string
}

const Customer: Schema = new Schema({
  customerKey: {
    type: String,
    unique: true,
    required: true,
  },
  countryCode: {
    type: String,
  },
  phoneNumber: {
    type: String,
    unique: true,
  },
  network: {
    type: String,
    required: true,
  },
  accountName: {
    type: String,
  },
  activeOrderId: {
    type: String,
    required: true,
  },
})

export default mongoose.model<ICustomer>("customer", Customer)
