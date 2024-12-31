import mongoose, { Schema } from "mongoose"
import { FiatAccountSchemaEnum } from "../types"

const FiatAccountSchema: Schema = new Schema({
  accountName: {
    type: String,
  },
  institutionName: {
    type: String,
  },
  mobile: {
    type: String,
    required: true,
  },
  operator: {
    type: String,
  },
  ethAddress: {
    type: String,
  },
  fiatAccountType: {
    type: String,
    default: FiatAccountSchemaEnum.MobileMoney,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const FiatAccountModel: any = mongoose.model(`fiataccount`, FiatAccountSchema)

export default FiatAccountModel
