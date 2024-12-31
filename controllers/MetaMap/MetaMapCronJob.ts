import axios from "axios"
import cron from "node-cron"
import * as _ from "lodash"
import {
  METAMAP_ACCESS_TOKEN_URL,
  METAMAP_CLIENT_ID,
  METAMAP_CLIENT_SECRET,
  UserKycData,
} from "./MetaMapTypes"
import MetaMapService from "./MetaMapService"

class CronJob {
  private START_CRON_JOB = process.env.START_CRON_JOB

  constructor() {
    if (this.START_CRON_JOB) {
      console.log("Cron job initialized.")
      // Schedule the cron job to run every 5 minutes
      cron.schedule("*/30 * * * * *", async () => {
        await this.metaMapCronJob()
      })
    } else {
      console.log(
        "CronJob is paused.\nTo activate it, set the `START_CRON_JOB` env variable to true."
      )
    }
  }

  async getMetaMapAccessToken() {
    const encodedParams = new URLSearchParams()
    encodedParams.set("grant_type", "client_credentials")
    const accessToken = METAMAP_CLIENT_ID + ":" + METAMAP_CLIENT_SECRET
    const buffer = Buffer.from(accessToken, "utf8")
    const base64String = buffer.toString("base64")
    try {
      const options = {
        method: "POST",
        url: METAMAP_ACCESS_TOKEN_URL,
        headers: {
          accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          authorization: `Basic ${base64String}`,
        },
        data: encodedParams,
      }
      const response = await axios.request(options)
      const { access_token } = response.data
      return access_token
    } catch (error: any) {
      // console.log(error)
      // console.log('error getting metamap access token')
    }
  }

  async metaMapCronJob() {
    const token = await this.getMetaMapAccessToken()

    //TO-DO : Get verified users without DocumentNumber.
    const users = await MetaMapService.queryVerifiedUsersWithOutDocumentNumber()

    if (users) {
      for (const user of users) {
        const options = {
          method: "GET",
          url: `${user.metamapResource}`,
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            authorization: `Bearer ${token}`,
          },
        }
        const response = await axios.request(options)

        const {
          surname,
          firstName,
          address,
          dateOfBirth,
          documentNumber,
          documentSubType,
          documentType,
          fullName,
          issueCountry,
          email,
          sex,
        } = response.data.documents[0].fields

        const words = _.words(fullName.value)
        const surnameN = _.last(words)
        const firstN = _.first(words)

        //update user details
        const userKycData: UserKycData = {
          kycAddress: address ? address.value : "",

          dateOfBirth: dateOfBirth
            ? this.formatDate(dateOfBirth.value.replace(/-/g, "/"))
            : "",
          documentNumber: documentNumber.value
            ? documentNumber.value.replace(/\s+/g, "")
            : "",
          documentSubType: documentSubType ? documentSubType.value : "LICENCE",
          documentType: documentType ? documentType.value : "ID",
          surname: surname ? surname.value : (surnameN as string),
          firstName: firstName ? firstName.value : (firstN as string),
          fullName: fullName.value,
          nationality: issueCountry ? issueCountry.value : "",
          gender: sex ? sex.value : "",
        }

        const isUpdated = await MetaMapService.updateUserKYCById(
          user._id,
          userKycData
        )
        if (isUpdated.upsertedId) {
          console.log(
            `User with ID: ${user.id}'s KYC details have been updated`
          )
        }
      }
    } else {
      console.log("No User found.....")
    }
  }

  formatDate(originalDateString: any) {
    const parts = originalDateString.split("/")
    const formattedDateString = `${parts[2]}/${parts[1]}/${parts[0]}`
    return formattedDateString
  }
}

export default new CronJob()
