import {
  FiatConnectError,
  quoteRequestBodySchema,
} from "@fiatconnect/fiatconnect-types"
import africastalking from "africastalking"
import axios from "axios"
import dotenv from "dotenv"
import { redisClient } from "../config/redisConfig"
import {
  AdditionalIds,
  COINGECKO_URL,
  CONVERTOR_URL,
  MAX_EXPIRATION_TIME_MS,
  airtelMomoCode,
  allowedAssets,
  appDomain,
  appUri,
  mtnMomoCode,
  mtnNumberCodes,
  onerampMerchantAccounts,
  platformCharge,
  shukuruBackendToken,
  shukuruBackendUrl,
  shukuruBoltToken,
  shukuruUserId,
} from "../constants"
import { validateZodSchema } from "../schema"
import { FiatAccountSchemaEnum, InvalidSiweParamsError } from "../types"
import { validateEnteredAsset, validateNetworkAsset } from "../validationSchema"

dotenv.config()

interface ExchangeResult {
  total: number
  charge: number
  expiry: Date | number
}

// interface ExchangeResult {
//   total: string;
//   charge: string;
//   expiry: number;
// }

export const supportedCountries = ["UG", "KE", "GHA", "TZ", "ZM", "NG"]
export const supportedAssets = ["cUSD", "USDC"]
export const supportedOperators = ["MTN", "Airtel"]
export const supportedFiat = ["UGX", "KES", "GHS", "TZS", "ZMW", "NGN"]

export const kycLink =
  "https://signup.metamap.com/?merchantToken=671a3cf5673134001da20657&flowId=674457fcc9b2bc001ded23c9"

export const minimumFiatAmount = 1000
export const maximumFiatAmount = 4556194.43

export const minimumCryptoAmount = 0.2
export const maximumCryptoAmount = 2500

export const MIN_MAX_FIAT_AMOUNTS: any = {
  UG: {
    min: 3500,
    max: 4556194.43,
  },
  KE: {
    min: 130,
    max: 25000,
  },
  GHA: {
    min: 15,
    max: 35000,
  },
  TZ: {
    min: 1200,
    max: 13_475_000,
  },
  ZM: {
    min: 26,
    max: 27,
  },
  NG: {
    min: 1650,
    max: 480000,
  },
}

export const MIN_MAX_CRYPTO_AMOUNTS: any = {
  UG: {
    min: 1,
    max: 2_500,
  },
  KE: {
    min: 1,
    max: 2_500,
  },
  GHA: {
    min: 1,
    max: 2_500,
  },
  TZ: {
    min: 1,
    max: 2_500,
  },
  ZM: {
    min: 1,
    max: 25_000,
  },
  NG: {
    min: 1,
    max: 2_500,
  },
}

export const PausedOnRampCountries = ["TZ", "KE", "GHA"]
export const PausedOffRampCountries = ["N/A", "UG"]

export const pausedOnMomoCountries = ["N/A"]
export const pausedOnBankCountries = ["N/A"]

export const PayCrestSupportedNetworks = ["polygon", "base"]

export const countryInfo: {
  [key: string]: { name: string; currency: string; phoneCode: number }
} = {
  UG: {
    name: "Uganda",
    currency: "UGX",
    phoneCode: 256,
  },
  KE: {
    name: "Kenya",
    currency: "KES",
    phoneCode: 254,
  },
  GHA: {
    name: "Ghana",
    currency: "GHS",
    phoneCode: 233,
  },
  TZ: {
    name: "Tanzania",
    currency: "TZS",
    phoneCode: 255,
  },
  ZM: {
    name: "Zambia",
    currency: "ZMW",
    phoneCode: 260,
  },
  NG: {
    name: "Nigeria",
    currency: "NGN",
    phoneCode: 234,
  },
}

export async function telegramOrderTwo(htmlText: string) {
  try {
    const options = {
      method: "POST",
      url: "https://api.telegram.org/bot<YOUR_API_TOKEN>/sendMessage",
      headers: {
        accept: "application/json",
        "User-Agent":
          "Telegram Bot SDK - (https://github.com/irazasyed/telegram-bot-sdk)",
        "content-type": "application/json",
      },
      data: {
        chat_id: "<chat_id>",
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: false,
        disable_notification: false,
        reply_to_message_id: 0,
      },
    }

    const result = await axios
      .request(options)
      .then(function (response) {
        return response.data
      })
      .catch(function (error) {
        return error.message
      })

    return {
      success: true,
      response: "Order request sent",
      data: result,
    }
  } catch (error: any) {
    return {
      success: false,
      response: error.message,
    }
  }
}

export async function telegramOrder(htmlText: string) {
  try {
    // const htmlText = `<b>Incoming</b>, <strong>Airtel Data</strong>
    // Send +256700719619 25MB (500UGX) data.`

    const options = {
      method: "POST",
      url: "https://api.telegram.org/bot6268061148%3AAAGi5lzr9LRQp5jr5I5xpWfkmZlNo3268Tg/sendMessage",
      headers: {
        accept: "application/json",
        "User-Agent":
          "Telegram Bot SDK - (https://github.com/irazasyed/telegram-bot-sdk)",
        "content-type": "application/json",
      },
      data: {
        chat_id: "6196117698",
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: false,
        disable_notification: false,
        reply_to_message_id: 0,
      },
    }

    const result = await axios
      .request(options)
      .then(function (response) {
        return response.data
      })
      .catch(function (error) {
        return error.message
      })

    return {
      success: true,
      response: "Order request sent",
      data: result,
    }
  } catch (error: any) {
    return {
      success: false,
      response: error.message,
    }
  }
}
export async function telegramGroupOrder(htmlText: string) {
  try {
    // const htmlText = `<b>Incoming</b>, <strong>Airtel Data</strong>
    // Send +256700719619 25MB (500UGX) data.`

    const options = {
      method: "POST",
      url: "https://api.telegram.org/bot7493831926:AAEaBnrsXPoBgAFIgxi36WjFevGQmxtU05E/sendMessage",
      headers: {
        accept: "application/json",
        "User-Agent":
          "Telegram Bot SDK - (https://github.com/irazasyed/telegram-bot-sdk)",
        "content-type": "application/json",
      },
      data: {
        chat_id: "-1002248520824",
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: false,
        disable_notification: false,
        reply_to_message_id: 0,
      },
    }

    const result = await axios
      .request(options)
      .then(function (response) {
        return response.data
      })
      .catch(function (error) {
        return error.message
      })

    return {
      success: true,
      response: "Order request sent",
      data: result,
    }
  } catch (error: any) {
    return {
      success: false,
      response: error.message,
    }
  }
}
export async function sendSMS(message: string) {
  try {
    const af = africastalking({
      apiKey: process.env.AFRICAS_TALKING_KEY!,
      username: process.env.AFRICAS_TALKING_USERNAME!,
    })

    await af.SMS.send({
      to: [process.env.OFFRAMP_NO!],
      // to: [process.env.OFFRAMP_NO!, process.env.OFFRAMP_NO_TWO!],
      message: message,
      from: "",
    })
  } catch (error: any) {
    return {
      success: false,
      response: error.message,
    }
  }
}

export async function getCurrentExchangeIn(
  fiatAmount: string | undefined,
  currency: string
): Promise<ExchangeResult> {
  try {
    const response = await axios.get(`https://open.er-api.com/v6/latest/USD`)
    const result = await response.data

    const exchangePrice = result.rates[currency]

    const amount = Number(fiatAmount) / Number(exchangePrice) // Reverse the conversion

    // From

    const platformPercentage = 0.01

    const charge = amount * platformPercentage

    const total = amount - charge // Revert back to the original amount

    const currentDate = new Date()

    // Add 7 days to the current date
    const expiryDate = new Date(currentDate)
    expiryDate.setDate(currentDate.getDate() + 7)

    return { total, charge, expiry: expiryDate.getTime() }
  } catch (error) {
    throw error
  }
}

export async function getCurrentExchangeOut(
  cryptoAmount: string | undefined,
  currency: string
): Promise<ExchangeResult> {
  try {
    const response = await axios.get(`https://open.er-api.com/v6/latest/USD`)
    const result = await response.data

    const exchangePrice = result.rates[currency]

    const amount = Number(cryptoAmount) * Number(exchangePrice) // Reverse the conversion

    const platformPercentage = 0.01

    const charge = amount * platformPercentage

    const total = amount - charge // Revert back to the original amount

    const currentDate = new Date()

    // Add 7 days to the current date
    const expiryDate = new Date(currentDate)
    expiryDate.setDate(currentDate.getDate() + 7)

    return { total, charge, expiry: expiryDate.getTime() }
  } catch (error) {
    throw error
  }
}

export async function getDualCurrentExchangeOut(
  cryptoAmount: string | undefined,
  fiatAmount: string | undefined,
  currency: string
): Promise<any> {
  try {
    const response = await axios.get(`https://open.er-api.com/v6/latest/USD`)
    const result = await response.data

    const exchangePrice = result.rates[currency]

    let amount

    if (cryptoAmount) {
      amount = Number(cryptoAmount) * Number(exchangePrice)
    } else if (fiatAmount) {
      amount = Number(fiatAmount) / Number(exchangePrice)
    }

    if (amount) {
      const platformPercentage = 0.01
      const charge = amount * platformPercentage
      const total = amount - charge

      const currentDate = new Date()
      const expiryDate = new Date(currentDate)
      expiryDate.setDate(currentDate.getDate() + 7)

      return { total, charge, expiry: expiryDate.getTime() }
    }
  } catch (error) {
    throw error
  }
}

interface ExchangeResult {
  total: number
  charge: number
  expiry: Date | number
}

export async function getDualCurrentExchangeIn(
  cryptoAmount: string | undefined,
  fiatAmount: string | undefined,
  currency: string
): Promise<any> {
  try {
    const response = await axios.get(`https://open.er-api.com/v6/latest/USD`)
    const result = await response.data

    const exchangePrice = result.rates[currency]
    let amount: number

    if (cryptoAmount) {
      amount = Number(cryptoAmount) * Number(exchangePrice)
    } else if (fiatAmount) {
      amount = Number(fiatAmount) / Number(exchangePrice)
    } else {
      throw new Error(
        "Invalid input: either cryptoAmount or fiatAmount must be provided"
      )
    }

    if (isNaN(amount)) {
      throw new Error("Invalid amount calculated")
    }

    const platformPercentage = 0.01
    const charge = amount * platformPercentage
    const total = amount - charge

    const currentDate = new Date()
    const expiryDate = new Date(currentDate)
    expiryDate.setDate(currentDate.getDate() + 7)

    return { total, charge, expiry: expiryDate.getTime() }
  } catch (error) {
    throw error
  }
}

export async function exchangeToUSD(
  cryptoAmount: string | undefined,
  currency: string
): Promise<number> {
  try {
    const response = await axios.get(`https://open.er-api.com/v6/latest/USD`)
    const result = await response.data

    const exchangePrice = result.rates[currency]

    const amount = Number(cryptoAmount) / Number(exchangePrice) // Reverse the conversion

    const platformPercentage = platformCharge
    const charge = amount * platformPercentage
    const total = amount + charge

    return total
  } catch (error) {
    throw error
  }
}

export async function exchangeFromUSD(
  cryptoAmount: string | undefined,
  currency: string
): Promise<number> {
  try {
    const response = await axios.get(`https://open.er-api.com/v6/latest/USD`)
    const result = await response.data

    const exchangePrice = result.rates[currency]

    const amount = Number(cryptoAmount) * Number(exchangePrice) // Reverse the conversion

    const platformPercentage = platformCharge
    const charge = amount * platformPercentage
    const total = amount + charge

    return total
  } catch (error) {
    throw error
  }
}

export const validateFiatAccountEntries = (entry: {
  fiatAccountSchema: FiatAccountSchemaEnum
  data: {
    accountName: string
    institutionName: string
    mobile: string
    country: string
    operator: string
    fiatAccountType: FiatAccountSchemaEnum
  }
}) => {
  const {
    fiatAccountSchema,
    data: {
      accountName,
      country,
      fiatAccountType,
      institutionName,
      mobile,
      operator,
    },
  } = entry

  // if (!supportedFiat.includes(fiatAccountType)) {
  //   const errorResponse = {
  //     error: `FiatNotSupported`,
  //   }
  //   return errorResponse
  // }
  // Check if the user is using UG or KE
  if (!supportedCountries.includes(country)) {
    const errorResponse = {
      error: `GeoNotSupported`,
    }
    return errorResponse
  }

  if (!supportedOperators.includes(operator)) {
    const errorResponse = {
      error: `CryptoNotSupported`,
    }
    return errorResponse
  }
}

export const validateChainSchema = (entry: {
  country: string
  cryptoType: string
  fiatType: string
  fiatAmount?: string
}) => {
  const { country, cryptoType, fiatType } = entry
  let body

  if (cryptoType === "cUSD") {
    body = validateZodSchema(entry, quoteRequestBodySchema)
  } else {
    body = entry
  }

  return body
}

export const validateEntries = (entry: {
  country: string
  cryptoType: string
  fiatType: string
}) => {
  const { country, cryptoType, fiatType } = entry

  // Check if the user is using UG or KE
  if (!supportedCountries.includes(country)) {
    const errorResponse = {
      error: `GeoNotSupported`,
    }
    return errorResponse
  }

  if (!supportedAssets.includes(cryptoType)) {
    const errorResponse = {
      error: `CryptoNotSupported`,
    }
    return errorResponse
  }

  if (!supportedFiat.includes(fiatType)) {
    const errorResponse = {
      error: `FiatNotSupported`,
    }
    return errorResponse
  }
}

function getCryptoExchangeRate(cryptoType: string): number {
  if (cryptoType === "cUSD") {
    return 1
  }

  if (cryptoType === "TcUSD") {
    return 0.98
  }

  if (cryptoType === "USDT") {
    return 1.01
  }

  if (cryptoType === "TUSDT") {
    return 1.02
  }

  throw new Error("Unsupported crypto type")
}

// export const validateChainSchema = (entry: {
//   country: string
//   cryptoType: string
//   fiatType: string
//   fiatAmount?: string
// }) => {
//   const { country, cryptoType, fiatType } = entry
//   let body

//   if (cryptoType === "cUSD") {
//     body = validateZodSchema(entry, quoteRequestBodySchema)
//   } else {
//     body = entry
//   }

//   return body
// }

export function validateIssuedAtAndExpirationTime(
  issuedAt: any,
  expirationTime?: string
) {
  if (!expirationTime) {
    throw new InvalidSiweParamsError(
      FiatConnectError.InvalidParameters,
      "Missing ExpirationTime"
    )
  }
  const issuedAtDate = new Date(issuedAt)
  const expirationDate = new Date(expirationTime)
  const now = new Date()
  if (issuedAtDate > now) {
    throw new InvalidSiweParamsError(FiatConnectError.IssuedTooEarly)
  }
  if (expirationDate < now) {
    throw new InvalidSiweParamsError(
      FiatConnectError.InvalidParameters,
      "ExpirationTime is in the past"
    )
  }
  if (expirationDate < issuedAtDate) {
    throw new InvalidSiweParamsError(
      FiatConnectError.InvalidParameters,
      "ExpirationTime is before IssuedAt"
    )
  }
  if (
    expirationDate.getTime() - issuedAtDate.getTime() >
    MAX_EXPIRATION_TIME_MS
  ) {
    throw new InvalidSiweParamsError(FiatConnectError.ExpirationTooLong)
  }
}

export async function validateNonce(_nonce: string) {
  // const redisClient = await createRedisClient()

  const availableNoices = await redisClient.get(_nonce)

  if (availableNoices) {
    throw new InvalidSiweParamsError(
      FiatConnectError.NonceInUse,
      "Nonce In Use Already"
    )
  }

  // done by saving nonces in a store with TTL (like redis) and check if the
  // nonce is already used. If a nonce is already used, must throw a NonceInUse
  // error. e.g. `throw new InvalidSiweParamsError(FiatConnectError.NonceInUser)`
  //   throw new NotImplementedError("Nonce validation not implemented")

  // Set nonce in Redis with TTL (adjust the TTL as needed)
  await redisClient.set(_nonce, _nonce)

  await redisClient.expire(_nonce, 3600) // 1 hour TTL

  // await redisClient.quit()
  // Nonce validated successfully

  //   await redisClient.disconnect()
  return _nonce
}

export async function validateDomainAndUri(_domain: string, _uri: string) {
  if (_domain != appDomain) {
    throw new InvalidSiweParamsError(
      FiatConnectError.InvalidParameters,
      "Invalid server domain"
    )
  }

  if (_uri != appUri) {
    throw new InvalidSiweParamsError(
      FiatConnectError.InvalidParameters,
      "Invalid server uri"
    )
  }

  return { _domain, _uri }
}

export const validateBTCEntries = (entry: {
  country: string
  cryptoType: string
  fiatType: string
}) => {
  const { country, cryptoType, fiatType } = entry

  // Check if the user is using UG or KE
  if (!supportedCountries.includes(country)) {
    const errorResponse = {
      error: `GeoNotSupported`,
    }
    return errorResponse
  }

  // if (!supportedAssets.includes(cryptoType)) {
  if (cryptoType !== "BTCLit") {
    const errorResponse = {
      error: `CryptoNotSupported`,
    }
    return errorResponse
  }

  if (!supportedFiat.includes(fiatType)) {
    const errorResponse = {
      error: `FiatNotSupported`,
    }
    return errorResponse
  }
}

export async function getBTCExchangeIn(
  fiatAmount: string | undefined,
  currency: string
): Promise<any> {
  try {
    // Step 1: Get the latest BTC price in USDT
    const response = await axios.get(COINGECKO_URL)

    if (response.data && response.data.bitcoin) {
      const btcToUsd = parseFloat(response.data.bitcoin.usd)

      const exchangeResponse = await axios.get(CONVERTOR_URL)

      const result = await exchangeResponse.data

      const exchangedRate = result.rates[currency]

      const exchangedPrice = Number(fiatAmount) / exchangedRate

      // Step 1: Convert the exchanged price to BTC
      const btcAmount = exchangedPrice / Number(btcToUsd)

      // Step 2: Convert BTC to SATs
      const satsAmount = btcAmount * 100000000 // 100,000,000 SATs in 1 BTC

      const total = satsAmount / (1 - platformCharge)
      const charge = satsAmount * platformCharge
      //  const charge = platformFee;

      // Make expiry 7 days
      const currentDate = new Date()

      // Add 7 days to the current date
      const expiryDate = new Date(currentDate)
      expiryDate.setDate(currentDate.getDate() + 7)

      return {
        total,
        charge,
        satsAmount,
        expiry: expiryDate.getTime().toString(),
      }
    }
  } catch (error) {
    throw error
  }
}

export const validateAsset = (entry: {
  country: string
  cryptoType: string
  fiatType: string
  network: string
}) => {
  const { country, cryptoType, fiatType, network } = entry

  // This checks to see if the entered cryptoType is supported
  const cryptoValidationResult = validateEnteredAsset(cryptoType)

  if (cryptoValidationResult?.error) {
    return cryptoValidationResult
  }

  // This checks to see if the entered crypto network is supported
  const networkValidationResult = validateNetworkAsset(network)

  if (networkValidationResult?.error) {
    return networkValidationResult
  }

  // Validate the combination of cryptoType and network
  if (
    !allowedAssets.some(
      (asset) => asset.name === cryptoType && asset.network.includes(network)
    )
  ) {
    return {
      error: `InvalidAssetNetworkCombination`,
    }
  }

  // Check if the user is using UG or KE
  if (!supportedCountries.includes(country)) {
    const errorResponse = {
      error: `GeoNotSupported`,
    }
    return errorResponse
  }

  if (!supportedFiat.includes(fiatType)) {
    const errorResponse = {
      error: `FiatNotSupported`,
    }
    return errorResponse
  }
}

export async function getBTCExchangeOut(
  satsAmount: number,
  currency: string
): Promise<any> {
  try {
    // Step 1: Get the latest BTC price in USD
    const btcPriceResponse = await axios.get(COINGECKO_URL)

    if (btcPriceResponse.data && btcPriceResponse.data.bitcoin) {
      const btcToUsd = parseFloat(btcPriceResponse.data.bitcoin.usd)

      // Step 2: Convert SATs to BTC, then to USD
      const btcAmount = satsAmount / 100000000 // 100,000,000 SATs in 1 BTC
      const usdAmount = btcAmount * btcToUsd

      // Step 3: Convert USD to the desired fiat currency
      const exchangeResponse = await axios.get(CONVERTOR_URL)
      const exchangedRate = exchangeResponse.data.rates[currency]
      let fiatAmount = usdAmount * exchangedRate

      // Step 4: Apply charges
      const charge = fiatAmount * platformCharge
      fiatAmount -= charge

      // Step 5: Set expiry (e.g., 7 days from now)
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7)

      return {
        total: fiatAmount,
        charge,
        satsAmount,
        expiry: expiryDate.getTime().toString(),
      }
    }
  } catch (error) {
    throw error
  }
}

export const createInvoice = async (amount: number, memo: string) => {
  try {
    const response = await axios.post(
      `${shukuruBackendUrl}/invoice/create`,
      {
        userId: shukuruUserId,
        amount,
        memo,
      },
      {
        headers: {
          bolt: shukuruBoltToken,
          "Content-Type": "application/json",
          Authorization: "Bearer " + shukuruBackendToken,
        },
      }
    )

    const result = await response.data

    return result
  } catch (error) {
    throw error
  }
}

export async function convertSatsToUSD(
  satsAmount: number,
  fiatType: string
): Promise<number> {
  try {
    // Step 1: Get the latest BTC price in USD
    const response = await axios.get(COINGECKO_URL)

    if (response.data && response.data.bitcoin) {
      const btcToUsd = parseFloat(response.data.bitcoin.usd)

      // Step 2: Convert SATs to BTC (1 BTC = 100,000,000 SATs)
      const btcAmount = satsAmount / 100000000

      // Step 3: Convert BTC to USD
      const usdAmount = btcAmount * btcToUsd

      // Step 3: Convert USD to the desired fiat currency
      const exchangeResponse = await axios.get(CONVERTOR_URL)
      const exchangedRate = exchangeResponse.data.rates["UGX"]
      let fiatAmount = usdAmount * exchangedRate

      return fiatAmount
    } else {
      throw new Error("Unable to fetch BTC price")
    }
  } catch (error) {
    throw error
  }
}

export async function getFiatEquivalentFromSats(
  satsAmount: number,
  currency: string
): Promise<any> {
  try {
    // Step 1: Convert SATs to BTC
    const btcAmount = satsAmount / 100000000 // 100,000,000 SATs in 1 BTC

    // Step 2: Get the latest BTC price in USDT
    const btcResponse = await axios.get(COINGECKO_URL)
    if (btcResponse.data && btcResponse.data.bitcoin) {
      const btcToUsd = parseFloat(btcResponse.data.bitcoin.usd)

      // Step 3: Convert BTC amount to USD
      const usdAmount = btcAmount * btcToUsd

      // Step 4: Convert USD amount to the desired fiat currency
      const exchangeResponse = await axios.get(CONVERTOR_URL)
      const result = await exchangeResponse.data
      const exchangedRate = result.rates[currency]
      const fiatAmount = usdAmount * exchangedRate

      // Step 5: Calculate total amount including platform charge
      const total = fiatAmount / (1 - platformCharge)
      const charge = fiatAmount * platformCharge

      // Step 5: Set expiry (e.g., 7 days from now)
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7)
      const expiry = expiryDate.getTime().toString()

      return {
        total,
        charge,
        fiatAmount: total - charge,
        expiry,
      }
    }
  } catch (error) {
    throw error
  }
}

export async function getBTCExchangeInFiat(
  fiatAmount: number,
  currency: string
): Promise<any> {
  try {
    // Step 1: Convert local currency to USD
    const exchangeResponse = await axios.get(CONVERTOR_URL)
    const exchangedRate = exchangeResponse.data.rates[currency]
    const usdAmount = fiatAmount / exchangedRate

    // Step 2: Get the latest BTC price in USD
    const btcPriceResponse = await axios.get(COINGECKO_URL)

    if (btcPriceResponse.data && btcPriceResponse.data.bitcoin) {
      const btcToUsd = parseFloat(btcPriceResponse.data.bitcoin.usd)

      // Step 3: Convert USD to BTC
      const btcAmount = usdAmount / btcToUsd

      // Step 4: Convert BTC to SATs (Satoshis)
      const satsAmount = btcAmount * 100000000 // 100,000,000 SATs in 1 BTC

      // Step 5: Apply charges
      const charge = fiatAmount * platformCharge
      fiatAmount -= charge

      // Step 6: Set expiry (e.g., 7 days from now)
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7)

      return {
        total: satsAmount,
        charge,
        fiatAmount,
        expiry: expiryDate.getTime().toString(),
      }
    }
  } catch (error) {
    throw error
  }
}

export async function oneRampTelegramBot(htmlText: string) {
  try {
    // const htmlText = `<b>Incoming</b>, <strong>Airtel Data</strong>
    // Send +256700719619 25MB (500UGX) data.`

    const options = {
      method: "POST",
      url: "https://api.telegram.org/bot6929730648:AAEdrimT2Ry1LrOaR0yr9V42t1-my3UkeKw/sendMessage",
      headers: {
        accept: "application/json",
        "User-Agent":
          "Telegram Bot SDK - (https://github.com/irazasyed/telegram-bot-sdk)",
        "content-type": "application/json",
      },
      data: {
        chat_id: "6196117698",
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: false,
        disable_notification: false,
        reply_to_message_id: 0,
      },
    }

    const result = await axios
      .request(options)
      .then(function (response) {
        return response.data
      })
      .catch(function (error) {
        return error.message
      })

    return {
      success: true,
      response: "Order request sent",
      data: result,
    }
  } catch (error: any) {
    return {
      success: false,
      response: error.message,
    }
  }
}

export const getMerchantCode = (phoneNumber: string) => {
  // Normalize the phone number by removing any '+' at the start
  const normalizedNumber = phoneNumber.startsWith("+")
    ? phoneNumber.substring(1)
    : phoneNumber

  // Check if the number starts with any of the MTN codes
  const isMTN = mtnNumberCodes.some((code) => {
    return (
      normalizedNumber.startsWith("0" + code) ||
      normalizedNumber.startsWith("256" + code)
    )
  })

  if (isMTN) {
    return mtnMomoCode // Return the MTN merchant code
  } else {
    // Handle non-MTN numbers here, e.g., return a different code or null
    return airtelMomoCode // or return airtelMomoCode or any other default code
  }
}

export const getOneRampMerchantAccount = (operator: string) => {
  const selectedOperator = onerampMerchantAccounts[operator.toLocaleLowerCase()]
  return selectedOperator
}

export function findAlternativeId(
  operator: any,
  quoteCountry: string
): AdditionalIds | undefined {
  if (operator.additionalIds) {
    return operator.additionalIds[quoteCountry]
  }
  return operator // Explicitly return undefined if there are no additionalIds or the country code is not found
}

export function getMerchantAccount(
  userOperator: string,
  quoteCountry: string
): any {
  try {
    const userOperatorLowerCase = userOperator.toLowerCase()

    const operator = onerampMerchantAccounts[userOperatorLowerCase]

    if (quoteCountry !== operator.country && operator.additionalIds) {
      return {
        name: operator.additionalIds[quoteCountry].name,
        merchantId: operator.additionalIds[quoteCountry].merchantId,
        country: quoteCountry,
        operationalCountries: operator.operationalCountries,
      }
    }

    return operator
  } catch (error) {}
}

export async function sendUserSMS(message: string, phone: string) {
  try {
    const af = africastalking({
      apiKey: process.env.AFRICAS_TALKING_KEY!,
      username: process.env.AFRICAS_TALKING_USERNAME!,
    })

    await af.SMS.send({
      to: [phone],
      // to: [process.env.OFFRAMP_NO!, process.env.OFFRAMP_NO_TWO!],
      message: message,
      from: "",
    })
  } catch (error: any) {
    return {
      success: false,
      response: error.message,
    }
  }
}
