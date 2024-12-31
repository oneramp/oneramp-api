import mongoose, { Document, Schema } from "mongoose"

export interface UserKYC extends Document {
  firstName: string
  surname: string
  nationality: string
  dateOfBirth: string
  email: string
  documentNumber: string
  documentSubType: string
  documentType: string
  fullName: string
  address: string
  gender: string
  status?: KYCSTATUS
  createdAt?: Date
  metamapResource?: string
}

enum KYCSTATUS {
  VERIFIED = "VERIFIED",
  IN_REVIEW = "IN_REVIEW",
  REJECTED = "REJECTED",
  PENDING = "PENDING",
}

const KYCModel: Schema = new Schema({
  firstName: {
    type: String,
    required: false,
  },
  surname: {
    type: String,
    required: false,
  },
  nationality: {
    type: String,
    required: false,
  },
  dateOfBirth: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: false,
    unique: true,
  },
  documentNumber: {
    type: String,
    required: false,
    unique: true,
  },
  documentSubType: {
    type: String,
    required: false,
  },
  documentType: {
    type: String,
    required: false,
  },
  fullName: {
    type: String,
    required: false,
  },
  address: {
    type: String,
    required: false,
  },
  gender: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: Object.values(KYCSTATUS),
    default: KYCSTATUS.PENDING,
  },
  metamapResource: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.model<UserKYC>("kycs", KYCModel)
