import { ethers } from "ethers"
import {
  baseProviderRpc,
  celoProviderRpc,
  ethereumProviderRpc,
  polygonProviderRpc,
} from "../../constants"

export const getEVMTransactionInfo = async (
  txHash: string,
  chain: "celo" | "ethereum" | "polygon" | "base"
) => {
  try {
    let provider

    if (chain === "celo") {
      provider = new ethers.JsonRpcProvider(celoProviderRpc)
    } else if (chain === "ethereum") {
      provider = new ethers.JsonRpcProvider(ethereumProviderRpc)
    } else if (chain === "polygon") {
      provider = new ethers.JsonRpcProvider(polygonProviderRpc)
    } else if (chain === "base") {
      provider = new ethers.JsonRpcProvider(baseProviderRpc)
    } else {
      return {
        success: false,
      }
    }

    const transactionReceipt = await provider.getTransactionReceipt(txHash)

    if (transactionReceipt === null) {
      return {
        success: false,
      }
    }

    if (transactionReceipt.status === 1) {
      return {
        success: true,
        tx: transactionReceipt.status,
      }
    }

    return {
      success: false,
      tx: transactionReceipt.status,
    }
  } catch (err) {
    return {
      success: false,
    }
  }
}
