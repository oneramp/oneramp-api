import mongoose, { ConnectOptions } from "mongoose"
import dotenv from "dotenv"
import { createClient } from "redis"
dotenv.config()

const MONGO_URI = process.env.MONGO_URI as string

const connectDB = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    } as ConnectOptions)

    console.log(`MongoDB connected: ${connection.connection.host}`)
  } catch (error: any) {
    console.error(`ERROR: ${error.message}`)
    return error
  }
}

export default connectDB

export async function createRedisClient() {
  const client = createClient({
    // url: "redis://default:1e9sQtXrAl4SxhNDL9yC66idrM151fca@redis-13851.c325.us-east-1-4.ec2.cloud.redislabs.com:13851",

    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST!,
      port: Number(process.env.REDIS_PORT),
    },
  })

  // Handle connection errors
  client.on("error", (err) => {
    console.error("Redis connection error:", err.message)
  })

  await client.connect()

  return client
}

export function createRedisSessionClient() {
  const client = createClient({
    // url: "redis://default:1e9sQtXrAl4SxhNDL9yC66idrM151fca@redis-13851.c325.us-east-1-4.ec2.cloud.redislabs.com:13851",
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST!,
      port: Number(process.env.REDIS_PORT),
    },
  })

  // Handle connection errors
  client.on("error", (err) => {
    console.error("Redis connection error:", err.message)
  })

  return client
}
