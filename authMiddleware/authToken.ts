import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { decrypt } from "./encryption"
import StoreCreds from "../models/storeCredsModel"
import IdempotencyModel from "../models/IdempotencyModel"

dotenv.config()

const ENCRYPTION_KEY: any = process.env.ENCRYPTION_KEY
const NEXTAUTH_SECRET: any = process.env.NEXTAUTH_SECRET

function authenticateToken(
  req: any,
  res: Response,
  next: NextFunction
): Response<any> | void {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(403).json({ success: false, message: "Not Authorized." })
  }

  try {
    // Verify the token and get the decoded payload
    const decoded = jwt.verify(token, ENCRYPTION_KEY) as {
      [key: string]: any
    }

    // Set the user object on the request for use in downstream middleware and routes
    req.user = decoded

    // Call the next middleware or route handler
    next()
  } catch (err) {
    return res.status(401).send("Unauthorized")
  }
}

async function authenticateStoreSecrets(
  req: any,
  res: Response,
  next: NextFunction
): Promise<Response<any> | void> {
  const { client, secret } = req.headers

  if (!client || !secret) {
    return res
      .status(403)
      .json({ success: false, message: "Invalid app credentials." })
  }

  // First get the app creds here...
  const store = await StoreCreds.findOne({
    clientId: client,
    secret: secret,
  })

  if (!store)
    return res.status(404).json({ success: false, message: "Store not found" })

  try {
    // Verify the token and get the decoded payload
    // const decrypted = await decrypt(store.secret)

    // if (decrypted != secret) {
    //   return res
    //     .status(403)
    //     .json({ success: false, message: "Invalid app credentials." })
    // }

    // Set the user object on the request for use in downstream middleware and routes
    req.store = store

    // Call the next middleware or route handler
    next()
  } catch (err) {
    return res.status(401).send("Unauthorized")
  }
}

export async function authorizeRoute(
  req: any,
  res: any,
  next: NextFunction
): Promise<any> {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  jwt.verify(token, NEXTAUTH_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: "Authorization failed!" })
    }
    req.user = decoded // Attach decoded user data to the request
    next()
  })
}

export { authenticateToken, authenticateStoreSecrets }
export async function verifyIdempotencyKey(req: any, res: any, next: any) {
  const idempotencyKey = req.headers["idempotency-key"]

  if (!idempotencyKey) {
    return res.status(400).json({ error: "Idempotency key is required" })
  }

  try {
    // Check the db to see if the key exists
    const dbIdempotencyKey = await IdempotencyModel.findOne({
      key: idempotencyKey,
    })

    if (dbIdempotencyKey) {
      // If the key already exists in the database, it has been used
      return res
        .status(409)
        .json({ error: "Idempotency key has already been used" })
    }

    // If the key does not exist, store it for future checks
    await IdempotencyModel.create({ key: idempotencyKey })
    next()
  } catch (error) {
    console.error("Error while checking idempotency key:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
