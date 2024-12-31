import { NextFunction, Response } from "express"
import * as dotenv from "dotenv"

// Load environment variables from .env file
dotenv.config()

const {
  ZEPPLIN_CLIENT_KEY,
  ZEPPLIN_SECRET,
  VITE_ADMIN_CLIENT,
  VITE_ADMIN_SECRET_KEY,
  FIATCONNECT_ADMIN_KEY,
  MERCHANT_KEY,
} = process.env

export async function authenticateOpenzepplinTriggers(
  req: any,
  res: Response,
  next: NextFunction
): Promise<Response<any> | void> {
  try {
    const { client, secret } = req.headers

    if (!client || !secret) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid trigger credentials." })
    }

    if (client != ZEPPLIN_CLIENT_KEY && secret != ZEPPLIN_SECRET) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid trigger credentials." })
    }

    next()
  } catch (err) {
    return res.status(401).send("Unauthorized")
  }
}

export async function adminAuthSecrets(
  req: any,
  res: Response,
  next: NextFunction
): Promise<Response<any> | void> {
  try {
    const { client, secret } = req.headers

    if (!client || !secret) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid trigger credentials." })
    }

    if (client != VITE_ADMIN_CLIENT && secret != VITE_ADMIN_SECRET_KEY) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid admin credentials." })
    }

    next()
  } catch (err) {
    return res.status(401).send("Unauthorized")
  }
}

export async function verifyFiatConnectAdmin(
  req: any,
  res: Response,
  next: NextFunction
): Promise<Response<any> | void> {
  try {
    const adminKey = req.headers.adminkey

    if (!adminKey) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid admin credentials." })
    }

    if (adminKey != FIATCONNECT_ADMIN_KEY) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid admin credentials." })
    }

    next()
  } catch (err) {
    return res.status(401).send("Unauthorized")
  }
}

export async function verifyMerchantKeys(
  req: any,
  res: Response,
  next: NextFunction
): Promise<Response<any> | void> {
  try {
    // Get the bearer token from the request headers
    const secret = req.headers.authorization.split(" ")[1]

    if (!secret) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid admin credentials." })
    }

    if (secret != MERCHANT_KEY) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid admin credentials." })
    }

    next()
  } catch (err) {
    return res.status(401).send("Unauthorized")
  }
}
