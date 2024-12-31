import axios from "axios"
import { NextFunction, Request, Response } from "express"

let token: string

const createToken = async (req: Request, res: Response, next: NextFunction) => {
  const secret = ""
  const consumer = ""
  const auth = Buffer.from(`${consumer}:${secret}`).toString("base64")
  await axios
    .get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )
    .then((data) => {
      token = data.data.access_token
      //   next();
    })
    .catch((err) => {
      res.status(400).json(err.message)
    })
}

export { token, createToken }
