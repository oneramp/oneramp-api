import dotenv from "dotenv"
import request from "supertest"
import { v4 as uuidv4 } from "uuid"
import { describe, expect, it } from "vitest"
import {
  ghanaianQuoteOrder,
  GhanaianUser,
  kenyanQuoteOrder,
  KenyanUser,
} from "../data"

dotenv.config()

const baseURL = "http://localhost:4000"
const clientSecret = process.env.ONERAMP_SECRET!

describe("GET /", () => {
  it("should return the home page message", async () => {
    const response = await request(baseURL).get("/")
    expect(response.status).toBe(200)
    expect(response.text).toBe("this is the home page, Welcome")
  })
})

describe("GET /clock", () => {
  it("should return the current time", async () => {
    const response = await request(baseURL).get("/clock")
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty("time")
  })
})

describe("POST /api/transfer-in", () => {
  it("should successful create a transfer-in KENYA", async () => {
    const response = await request(baseURL)
      .post("/quote-in")
      .set("Authorization", `Bearer ${clientSecret}`)
      .send(kenyanQuoteOrder)

    const quote = response.body

    const quoteId = quote.quote.quoteId

    // Generate an idempotency key
    const idempotency = uuidv4()

    // Make the transfer
    const transferResponse = await request(baseURL)
      .post("/transfer-in")
      .set("Authorization", `Bearer ${clientSecret}`)
      .set("Idempotency-Key", idempotency)
      .send({
        phone: KenyanUser.phone,
        operator: KenyanUser.operator,
        quoteId: quoteId,
      })

    expect(response.status).toBe(200)

    // Add further expectations as necessary
  }, 30000)

  it("should successful create a transfer-in GHANA", async () => {
    const response = await request(baseURL)
      .post("/quote-in")
      .set("Authorization", `Bearer ${clientSecret}`)
      .send(ghanaianQuoteOrder)

    const quote = response.body

    const quoteId = quote.quote.quoteId

    // Generate an idempotency key
    const idempotency = uuidv4()

    // Make the transfer
    const transferResponse = await request(baseURL)
      .post("/transfer-in")
      .set("Authorization", `Bearer ${clientSecret}`)
      .set("Idempotency-Key", idempotency)
      .send({
        phone: GhanaianUser.phone,
        operator: GhanaianUser.operator,
        quoteId: quoteId,
      })

    expect(response.status).toBe(200)

    // Add further expectations as necessary
  }, 30000)
})

describe("POST /api/transfer-out", () => {
  it("should successful create a transfer-out KENYA", async () => {
    const response = await request(baseURL)
      .post("/quote-out")
      .set("Authorization", `Bearer ${clientSecret}`)
      .send(kenyanQuoteOrder)

    const quote = response.body

    const quoteId = quote.quote.quoteId

    // Generate an idempotency key
    const idempotency = uuidv4()

    // Make the transfer
    const transferResponse = await request(baseURL)
      .post("/transfer-out")
      .set("Authorization", `Bearer ${clientSecret}`)
      .set("Idempotency-Key", idempotency)
      .send({
        phone: KenyanUser.phone,
        operator: KenyanUser.operator,
        quoteId: quoteId,
      })

    expect(response.status).toBe(200)

    // Add further expectations as necessary
  }, 30000)

  it("should successful create a transfer-out GHANA", async () => {
    const response = await request(baseURL)
      .post("/quote-out")
      .set("Authorization", `Bearer ${clientSecret}`)
      .send(ghanaianQuoteOrder)

    const quote = response.body

    const quoteId = quote.quote.quoteId

    // Generate an idempotency key
    const idempotency = uuidv4()

    // Make the transfer
    const transferResponse = await request(baseURL)
      .post("/transfer-out")
      .set("Authorization", `Bearer ${clientSecret}`)
      .set("Idempotency-Key", idempotency)
      .send({
        phone: GhanaianUser.phone,
        operator: GhanaianUser.operator,
        quoteId: quoteId,
      })

    expect(response.status).toBe(200)

    // Add further expectations as necessary
  }, 30000)
})
