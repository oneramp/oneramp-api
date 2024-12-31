import mongoose, { Document, Schema } from "mongoose"

interface IWebhookKey extends Document {
  _id: mongoose.Types.ObjectId
  store: string
  secret: string
  createdAt: Date
}

const webhookKeySchema: Schema = new mongoose.Schema({
  store: {
    type: String,
    unique: true,
    required: true,
  },
  secret: {
    type: String,
    unique: true,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const WebhooksKeyModel = mongoose.model<IWebhookKey>(
  "webhookkeys",
  webhookKeySchema
)

export default WebhooksKeyModel
