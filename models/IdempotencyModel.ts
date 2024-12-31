import mongoose, { Document, Schema, Model } from "mongoose"

const IdempotencySchema: Schema = new Schema({
  key: {
    type: String,
    required: true,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const IdempotencyModel: any = mongoose.model(`idempotency`, IdempotencySchema)

export default IdempotencyModel
