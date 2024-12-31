import mongoose, { Document, Schema, Model } from "mongoose"

enum STATUS {
  "INITIATED",
  "PAID",
  "DONE",
}

const OrdersSchema: Schema = new Schema({
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
  recieves: {
    type: Number,
    required: true,
    default: 0,
  },
  quoteId: {
    type: String,
  },
  orderno: {
    type: String,
    require: true,
  },
  orderType: {
    type: String,
    require: true,
  },
  transactionId: {
    type: String,
  },
  transferId: {
    type: String,
  },
  asset: {
    type: String,
    require: true,
  },
  address: {
    type: String,
    require: true,
  },
  phone: {
    type: String,
  },
  network: {
    type: String,
    require: true,
  },
  currency: {
    type: String,
    require: true,
  },
  paidIn: {
    type: String,
  },
  chain: {
    type: String,
    require: true,
  },
  amountPaid: {
    type: Number,
  },
  operator: {
    type: String,
  },
  status: {
    type: String,
    default: "INITIATED",
  },
  txId: {
    type: String,
  },
  orderRef: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const OrdersModel: any = mongoose.model(`orders`, OrdersSchema)

export default OrdersModel
