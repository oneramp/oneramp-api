import { RpcProvider } from "starknet"
import { starknetProviderRpc } from "../../constants"

// STARKNET TRANSFER
export const getStarknetTransactionInfo = async (txHash: string) => {
  try {
    const starknetProvider = new RpcProvider({
      nodeUrl: starknetProviderRpc,
    })

    const transactionReceipt = await starknetProvider.getTransactionStatus(
      txHash
    )

    if (transactionReceipt.execution_status === "SUCCEEDED") {
      return {
        success: true,
        tx: transactionReceipt.execution_status,
      }
    }

    return {
      success: false,
      tx: transactionReceipt.execution_status,
    }
  } catch (err) {
    return {
      success: false,
    }
  }
}
