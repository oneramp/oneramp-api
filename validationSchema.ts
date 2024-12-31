import { ZodError, z } from "zod"
import { AssetsI } from "./types"
import { allowedAssets, assetNames, networkNames } from "./constants"

// Extracting the asset names from the allowedAssets array

// Creating a Zod schema to validate the asset name
// Manually cast assetNames to a tuple of string literals
export const validatePublicAsset = z.enum(assetNames as [string, ...string[]])
export const validateAssetNework = z.enum(networkNames as [string, ...string[]])

// const isSupportedAsset = validatePublicAsset.parse(cryptoType)
export const validateEnteredAsset = (cryptoType: string): any => {
  try {
    validatePublicAsset.parse(cryptoType)
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: `CryptoNotSupported`,
        details: error.issues,
      }
    }
  }
}

export const validateNetworkAsset = (network: string): any => {
  try {
    validateAssetNework.parse(network)
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        error: `NetworkNotSupported`,
        details: error.issues,
      }
    }
  }
}
