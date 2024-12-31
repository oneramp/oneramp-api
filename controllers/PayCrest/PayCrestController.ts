import { Request, Response } from "express"
import * as yup from "yup"
import PayCrestService from "./PayCrestService"
import {
  transactionSchema,
  verifyAccountNameDateSchema,
} from "./PayCrestShemas"

class PayCrestController {
  async getSupportedBanks(request: Request, response: Response) {
    try {
      const currency_code = request.params.currency_code.toUpperCase()

      if (!request.params.currency_code) {
        return response.status(400).json({
          message: "Currency code is required",
          status: false,
        })
      }

      const banks = await PayCrestService.getSupportedBanks({
        currency_code: currency_code,
      })

      const data = banks.data.map((bank: any) => {
        return {
          code: bank.code,
          name: bank.name,
          type: bank.type,
        }
      })

      return response.status(200).json({
        message: "Banks",
        status: true,
        data: data,
      })
    } catch (error) {
      return response.status(500).json({
        message: "Failed to retrived banks",
      })
    }
  }

  async getSupportedChainsAndToken(request: Request, response: Response) {
    try {
      const networks = await PayCrestService.getSupportedChainsAndToken()
      return response.status(200).json({
        message: "Networks",
        status: true,
        data: networks,
      })
    } catch (error) {
      return response.status(500).json({
        message: "Failed to retrived networks",
      })
    }
  }

  async getCurrencries(request: Request, response: Response) {
    try {
      const getCurrency = PayCrestService.getCurrencies
      return response.status(200).json({
        message: "Rate",
        status: true,
        data: {
          token: getCurrency,
        },
      })
    } catch (error) {
      return response.status(500).json({
        message: "Failed to retrived networks",
      })
    }
  }

  async getRate(request: Request, response: Response) {
    try {
      const { token, amount, fiat } = request.params

      const rate = await PayCrestService.getRate({ token, amount, fiat })
      return response.status(200).json({
        message: "Rate",
        status: true,
        data: {
          token: token.toUpperCase(),
          fiat: fiat.toUpperCase(),
          rate: rate.data,
        },
      })
    } catch (error) {
      return response.status(500).json({
        message: "Failed to retrived networks",
      })
    }
  }

  async offRamp(request: Request, response: Response) {
    try {
      const transactionData = request.body

      await transactionSchema.validate(transactionData)

      const payment = await PayCrestService.offRamp(transactionData)

      return response.status(200).json(payment.data)
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return response.status(400).json({
          error: error.errors[0],
        })
      }

      return response.status(500).json({
        error: error,
      })
    }
  }

  async verifyAccountName(request: Request, response: Response) {
    try {
      const verifyAccountNameDate = request.body

      await verifyAccountNameDateSchema.validate(verifyAccountNameDate)

      const payment = await PayCrestService.verifyAccountName(
        verifyAccountNameDate
      )

      return response.status(200).json({
        accountName: payment.data,
      })
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return response.status(400).json({
          error: error.errors[0],
        })
      }

      return response.status(500).json({
        error: error,
      })
    }
  }

  async webHook(request: Request, response: Response) {
    try {
      const signatureHeader = request.headers["x-paycrest-signature"] as string
      const requestBody = request.body

      let body = ""
      let pay = {}
      request.on("data", (chunk) => {
        body += chunk.toString() // Convert Buffer to string
      })

      request.on("end", () => {
        const pay = JSON.parse(body)
        //console.log('Request Body:', pay); // Access the complete body
        response.end("OK")
      })

      //console.log("request-------------", pay);
      //   console.log('Request Body:', requestBody);
      //   console.log('Signature Header:', signatureHeader);

      const requestBodyString = JSON.stringify(requestBody)
      const isValidPayload = await PayCrestService.verifyPaycrestSignature(
        signatureHeader,
        JSON.stringify(pay)
      )

      //   if (isValidPayload) {
      //     console.log('Payload is valid');
      //     // Process the valid payload
      //   } else {
      //     console.error('Invalid payload');
      //     return response.status(400).json({ error: 'Invalid payload' });
      //   }
    } catch (error) {
      //   console.error('Error processing webhook:', error);
      //   return response.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default new PayCrestController()
