import bodyParser from "body-parser"
import cors from "cors"
import dotenv from "dotenv"
import express, { Express, Request, Response } from "express"
import { createServer } from "http"
import path from "path"
import { Server } from "socket.io"
// import socketIo from "socket.io";

// import offrampRoute from "./routes/offrampRoute";
import MongoStore from "connect-mongo"
import Session from "express-session"
import fiatConnectRouter from "./routes/fiatconnectRoutes/routes"
import connectDB from "./config/connectDB"
import routes from "./routes/routes"
import merchantRoutes from "./routes/merchant/routes"
import publicRoutes from "./routes/public/routes"
import webhookRoutes from "./routes/webhooks/routes"
import { initSocket } from "./sockets/sockets"
import { getClock } from "./controllers/fiatAccount"
import { errorHandler, notFound } from "./authMiddleware/errorHandler"
import { redisClient } from "./config/redisConfig"
import MetaMapService from "./controllers/MetaMap/MetaMapService"
import CronJob from "./controllers/MetaMap/MetaMapCronJob"

dotenv.config({ path: path.join(__dirname, "/.env") })

connectDB()

// connectToRedis()

const app: Express = express()
app.use(express.json())
app.use(cors())

// Middleware to parse JSON request body
app.use(bodyParser.json())

const server = createServer(app) // Create an HTTP server
export const io = new Server(server, {
  cors: {
    origin: "*", // Change this to your frontend's URL
    methods: ["GET", "POST", "PUT"],
  },
})

redisClient.on("error", (err) => console.log("Redis Client Error", err))
redisClient
  .connect()
  .then(() => console.log("Redis connected"))
  .catch(console.error)

app.use(
  Session({
    name: "oneramp-sess",
    secret: process.env.SESSION_COOKIE_SECRET!,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI! }),
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, sameSite: true },
  })
)

app.get("/", (req: Request, res: Response) => {
  res.send("this is the home page, Welcome")
})

app.get("/clock", getClock)

// Socket connections
initSocket()

// Implementation of routing
app.use("/api", routes)
app.use("/api/merchant", merchantRoutes)
app.use("/api/webhook", webhookRoutes)

// FiatConnect backend API Routes
app.use("/api/admin", fiatConnectRouter)

// Public API endpoints
app.use("", publicRoutes)

//metamap cronjob
CronJob

// Catch-all route for unmatched routes
app.use("*", (req, res) => {
  res.status(404).json({ message: "Not Found" })
})

// Middleware to handle not found errors
app.use(notFound)

// Error handling middleware
app.use(errorHandler)

const PORT: any = process.env.PORT || 4000

server.listen(PORT, async () => {
  console.log(`app is running in development mode on port 4000`)
  console.log(`🚀 Server ready at: http://localhost:${PORT}`)
})

export default app
