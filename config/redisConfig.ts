import dotenv from "dotenv"
import * as redis from "redis"

dotenv.config()

// Connect to Redis
export const redisClient = redis.createClient({
  //   host: process.env.REDIS_HOST,
  //   port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  url: process.env.REDIS_URL,
})

let redisConnectionAttempts = 0
const MAX_RETRIES = 5 // Maximum number of retries
const BASE_DELAY = 2000 // Base delay in milliseconds

// export const connectToRedis = () => {
//   redisClient
//     .connect()
//     .then(() => {
//       console.log("Redis connected")
//       redisConnectionAttempts = 0 // Reset attempts on successful connection
//     })
//     .catch((err) => {
//       console.error("Redis connection failed", err)
//       redisConnectionAttempts++
//       if (redisConnectionAttempts <= MAX_RETRIES) {
//         // Calculate exponential backoff
//         const delay = BASE_DELAY * Math.pow(2, redisConnectionAttempts - 1)
//         console.log(
//           `Retrying connection attempt ${redisConnectionAttempts} after ${delay}ms`
//         )
//         // Dont fail please
//         setTimeout(connectToRedis, delay)
//       } else {
//         console.log(
//           "Failed to connect to Redis after maximum attempts, continuing without Redis..."
//         )
//         // Implement fallback logic here, such as using an in-memory store as backup
//         // Optionally, send an alert/notification about the failure to connect
//       }
//     })
// }

// export const redisClient = redis.createClient(
