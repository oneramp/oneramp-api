import { createHmac, timingSafeEqual } from "crypto"
import { HttpException } from "../../src/utils/http-exception"
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
} from "../../src/utils/status-codes"
import {
  EMPTY_PAYLOAD_MESSAGE,
  EMPTY_SIGNATURE_MESSAGE,
  ENCRYPTION_ALGO,
  HMAC_DIGEST,
  INVALID_PAYLOAD_FORMAT_MESSAGE,
  INVALID_PAYLOAD_MESSAGE,
  METAMAP_WEBHOOK_SECRET,
  MISSING_ENV_VARIABLE_MESSAGE,
  UserKycData,
  verificationStatusMap,
  WebhookPayload,
} from "./MetaMapTypes"
import KYCModel from "../../models/KYCModel"

const isNotEmptyString = (value: string) => {
  return Boolean(value)
}

class MetamapService {
  validateWebhookPayload(signature: string, payload: string): WebhookPayload {
    if (!METAMAP_WEBHOOK_SECRET)
      throw new HttpException(
        INTERNAL_SERVER_ERROR,
        MISSING_ENV_VARIABLE_MESSAGE
      )

    const [signatureIsSet, payloadIsSet] = [
      isNotEmptyString(signature),
      isNotEmptyString(payload),
    ]

    if (!signatureIsSet)
      throw new HttpException(BAD_REQUEST, EMPTY_SIGNATURE_MESSAGE)
    if (!payloadIsSet)
      throw new HttpException(BAD_REQUEST, EMPTY_PAYLOAD_MESSAGE)

    const hash = createHmac(ENCRYPTION_ALGO, METAMAP_WEBHOOK_SECRET)
      .update(payload)
      .digest(HMAC_DIGEST)
    const isValidPayload = timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(signature)
    )

    if (!isValidPayload)
      throw new HttpException(BAD_REQUEST, INVALID_PAYLOAD_MESSAGE)

    try {
      const parsedPayload: WebhookPayload = JSON.parse(payload)
      return parsedPayload
    } catch (error) {
      throw new HttpException(BAD_REQUEST, INVALID_PAYLOAD_FORMAT_MESSAGE)
    }
  }

  async consumeWebhookPayload(validPayload: WebhookPayload) {
    const { eventName, identityStatus, metadata, resource } = validPayload

    console.log(eventName, identityStatus, metadata, resource)

    const shouldTakeAction =
      eventName === "verification_completed" ||
      eventName === "verification_updated"

    if (!shouldTakeAction)
      return { success: true, message: "Request received and acknowledged" }

    // action 1: update user `kycStatus` based on `identityStatus`
    if (!metadata)
      throw new HttpException(BAD_REQUEST, "Metadata is missing from payload")

    try {
      console.log(
        "running action: update user `kycStatus` based on `identityStatus`",
        identityStatus,
        resource
      )

      const user: any = {
        email: metadata.email,
        resource: resource,
      }

      const IsUserFound = await this.getUserByEmail(user.email)

      const kycStatus = verificationStatusMap[identityStatus]
      if (IsUserFound) {
        const userData = {
          status: kycStatus as string,
          metamapResource: user.resource as string,
        }
        await this.updateUserKYCById(IsUserFound.id, userData)
      } else {
        await this.createUser(user.email, user.resource, kycStatus)
      }

      // Send a response to acknowledge the successful processing
      return { success: true, message: "Processing completed successfully" }
    } catch (error) {
      // Handle errors and send an acknowledgment with an error message
      return { success: false, message: "Error processing the payload" }
    }
  }

  async queryVerifiedUsersWithOutDocumentNumber() {
    try {
      const results = await KYCModel.find({
        status: "VERIFIED",
        $or: [{ documentNumber: null }, { documentNumber: "" }],
      })

      return results
    } catch (error) {
      throw new HttpException(INTERNAL_SERVER_ERROR, "Internal server error...")
    }
  }

  async getUserById(id: string) {
    try {
      const user = await KYCModel.find({ _id: id })
      return user
    } catch (error) {
      throw new HttpException(INTERNAL_SERVER_ERROR, "Internal server error...")
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await KYCModel.findOne({ email: email })
      return user
    } catch (error) {
      throw new HttpException(INTERNAL_SERVER_ERROR, "Internal server error...")
    }
  }

  async createUser(email: string, metamapResource: string, status: string) {
    try {
      await KYCModel.create({
        email: email,
        metamapResource: metamapResource,
        kycAddress: "",
        dateOfBirth: "",
        documentNumber: "",
        documentSubType: "",
        documentType: "",
        surname: "",
        firstName: "",
        fullName: "",
        nationality: "",
        gender: "",
        status: status,
      })
    } catch (error) {
      throw new HttpException(INTERNAL_SERVER_ERROR, "Internal server error...")
    }
  }

  async updateUserKYCById(id: string, data: UserKycData) {
    try {
      const user = await KYCModel.updateOne({ _id: id }, data)
      return user
    } catch (error) {
      throw new HttpException(INTERNAL_SERVER_ERROR, "Internal server error...")
    }
  }
}

export default new MetamapService()
