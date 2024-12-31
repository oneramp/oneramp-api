import {
  FiatConnectError,
  authRequestBodySchema,
} from "@fiatconnect/fiatconnect-types"
import { Response } from "express"
import { SiweMessage } from "siwe"
import { celoChainId, codeVersion } from "../constants"
import { validateIssuedAtAndExpirationTime, validateNonce } from "../helpers"
import { validateZodSchema } from "../schema"
import { InvalidSiweParamsError } from "../types"

// Function to create a Redis client
export async function siweLogin(req: any, res: Response) {
  try {
    const body = await validateZodSchema(req.body, authRequestBodySchema)

    let SIWEObject

    SIWEObject = new SiweMessage(body.message)

    const { data: message } = await SIWEObject.verify({
      signature: req.body.signature,
    })

    SIWEObject = message

    await validateIssuedAtAndExpirationTime(
      message.issuedAt,
      message.expirationTime
    )

    // Validate the nonce
    await validateNonce(SIWEObject.nonce)

    // Validate the domain and url
    // await validateDomainAndUri(SIWEObject.domain, SIWEObject.uri)

    // Validate the Version
    if (SIWEObject.version !== codeVersion) {
      throw new InvalidSiweParamsError(
        FiatConnectError.InvalidParameters,
        "Invalid version"
      )
    }

    // TODO: Validate the chain ID
    if (SIWEObject.chainId !== celoChainId) {
      throw new InvalidSiweParamsError(
        FiatConnectError.InvalidParameters,
        "Invalid chain ID"
      )
    }

    // Save session to Redis
    await saveSessionToRedis(req, SIWEObject)

    return res.status(200).json(SIWEObject)
  } catch (error: any) {
    // Handle authentication errors
    handleAuthenticationError(error, res)
  }

  async function saveSessionToRedis(
    req: any,
    SIWEObject: SiweMessage
  ): Promise<void> {
    const sessionExpirationTime = new Date(SIWEObject.expirationTime!)

    req.session.siwe = SIWEObject
    req.session.cookie.expires = sessionExpirationTime

    // Log SIWEObject before session storage

    return new Promise((resolve, reject) => {
      req.session.save((err: any) => {
        if (err) {
          console.error("Error saving session to Redis:", err)
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  function handleAuthenticationError(error: any, res: Response): void {
    // Handle different authentication errors and send appropriate responses
    if (error.error?.type.includes("Expired message")) {
      res.status(401).json({ error: FiatConnectError.SessionExpired })
    } else if (error.fiatConnectError === "NonceInUse") {
      res.status(401).json({ error: FiatConnectError.NonceInUse })
    } else if (error.fiatConnectError === "IssuedTooEarly") {
      res.status(401).json({ error: FiatConnectError.IssuedTooEarly })
    } else if (error.fiatConnectError === "ExpirationTooLong") {
      res.status(401).json({ error: FiatConnectError.ExpirationTooLong })
    } else {
      res.status(401).json({ error: FiatConnectError.InvalidParameters })
    }
  }
}
