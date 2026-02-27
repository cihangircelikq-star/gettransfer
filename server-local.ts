import app from './backend/app.js'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'

const PORT = process.env.PORT || 3005

const httpServer = http.createServer(app as any)
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

;(app as any).set('io', io)

io.on('connection', (socket) => {
  socket.on('booking:join', (payload: any) => {
    const bookingId = String(payload?.bookingId || '').trim()
    if (!bookingId) return
    socket.join(`booking:${bookingId}`)
  })
  socket.on('booking:leave', (payload: any) => {
    const bookingId = String(payload?.bookingId || '').trim()
    if (!bookingId) return
    socket.leave(`booking:${bookingId}`)
  })
  socket.on('disconnect', () => {})
})

httpServer.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
