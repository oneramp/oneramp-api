import { FiatConnectError } from "@fiatconnect/fiatconnect-types"
import express from "express"
import { UnauthorizedError } from "../types"
import StoreCreds from "../models/storeCredsModel"
import WebhooksKeyModel from "../models/WebhooksKeysModel"
import { redisClient } from "../config/redisConfig"
import { widgetSecret } from "../constants"
import storeModel, { EnviromentE } from "../models/storeModel"

export function siweAuthMiddleware(
  req: any,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    if (!req.session.siwe) {
      // throw new UnauthorizedError()
      return res.status(401).json({ error: "Unauthorized" })
    }

    if (new Date() > new Date(req.session.siwe.expirationTime!)) {
      // throw new UnauthorizedError(FiatConnectError.SessionExpired)
      return res.status(401).json({ error: FiatConnectError.SessionExpired })
    }

    next()
  } catch (error) {
    // Handle the error gracefully

    if (error instanceof UnauthorizedError) {
      // return res.status(401).json({ error: "Unauthorized" })
      return res.status(401).json({ error: FiatConnectError.Unauthorized })
    }

    // Handle other types of errors as needed
    res.status(500).json({ error: "Internal Server Error" })
  }
}

export async function verifyClientKeyMiddleware(
  req: any,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const authorizationHeader = req.headers.authorization

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      // throw new UnauthorizedError()
      return res.status(401).json({ error: FiatConnectError.Unauthorized })
    }

    const secret = authorizationHeader.split(" ")[1]

    const storeCreds = await StoreCreds.findOne({
      secret: secret,
    })

    if (!storeCreds) {
      // throw new UnauthorizedError()
      return res.status(401).json({ error: FiatConnectError.Unauthorized })
    }

    const store = await storeModel.findById(storeCreds.store)

    if (!store) {
      // throw new UnauthorizedError()
      return res.status(401).json({ error: FiatConnectError.Unauthorized })
    }

    if (store.enviroment !== EnviromentE.LIVE) {
      return res.status(401).json({ error: FiatConnectError.Unauthorized })
    }

    // Set the user object on the request for use in downstream middleware and routes
    req.store = storeCreds

    // Call the next middleware or route handler
    next()
  } catch (error) {
    // Handle the error gracefully

    if (error instanceof UnauthorizedError) {
      // return res.status(401).json({ error: "Unauthorized" })
      return res.status(401).json({ error: FiatConnectError.Unauthorized })
    }

    // Handle other types of errors as needed
    res.status(500).json({ error: "Internal Server Error" })
  }
}

export async function verifyWebhookKeyMiddleware(
  req: any,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const authorizationHeader = req.headers.authorization

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      // throw new UnauthorizedError()
      // return res.status(401).json({ error: "Unauthorized" })
      return res.status(401).json({ error: FiatConnectError.Unauthorized })
    }

    const secret = authorizationHeader.split(" ")[1]

    const webhookKeys = await WebhooksKeyModel.findOne({
      secret: secret,
    })

    if (!webhookKeys) {
      // return res.status(401).json({ error: "Unauthorized" })
      return res.status(401).json({ error: FiatConnectError.Unauthorized })
    }

    // Set the user object on the request for use in downstream middleware and routes
    req.store = webhookKeys.store

    // Call the next middleware or route handler
    next()
  } catch (error) {
    // Handle the error gracefully

    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Handle other types of errors as needed
    res.status(500).json({ error: "Internal Server Error" })
  }
}

export async function verifyIdempotencyKey(req: any, res: any, next: any) {
  // Use req.originalUrl or req._parsedOriginalUrl.pathname to get the full path
  const fullPath = req.originalUrl || req._parsedOriginalUrl.pathname

  // Check if the current path is '/transfer/:transferId/status'
  // eslint-disable-next-line no-useless-escape
  const isStatusRoute = fullPath.match(/^\/transfer\/[^\/]+\/status\/?$/)

  if (isStatusRoute) {
    return next() // Skip idempotency check for this route
  }

  const idempotencyKey = req.headers["idempotency-key"]

  if (!idempotencyKey) {
    return res.status(400).json({ error: "Idempotency key is required" })
  }

  try {
    // Check the db to see if the key exists
    const dbIdempotencyKey = await redisClient.get(idempotencyKey)

    if (dbIdempotencyKey) {
      //   // If the key already exists in the database, it has been used
      return res
        .status(409)
        .json({ error: "Idempotency key has already been used" })
    }

    // If the key does not exist, store it for future checks
    await redisClient.set(idempotencyKey, "true")
    next()
  } catch (error) {
    next(error)
  }
}

export const verifyWidgetRequest = async (
  req: any,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const widgetKey = req.headers["widget-key"]

    if (!widgetKey) {
      return res.status(400).json({ error: "Unauthorized request" })
    }

    if (widgetKey !== widgetSecret) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    next()
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" })
  }
}
