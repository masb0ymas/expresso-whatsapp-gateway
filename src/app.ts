/* eslint-disable no-case-declarations */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
import 'module-alias/register'
import './pathAlias'

import axios from 'axios'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import helmet from 'helmet'
import http from 'http'
import _ from 'lodash'
import path from 'path'
import logger from 'morgan'
import QRCode from 'qrcode'
import createError from 'http-errors'
import { Server, Socket } from 'socket.io'
import { Client, MessageMedia } from 'whatsapp-web.js'
import asyncHandler from '@expresso/helpers/asyncHandler'
import withState from '@expresso/helpers/withState'
import useMulter, { allowedImage } from '@expresso/hooks/useMulter'
import useValidation from '@expresso/hooks/useValidation'
import { FileAttributes } from '@expresso/interfaces/file'
import whatsappSchema from '@expresso/schema/whatsapp'
import ExpressErrorYup from '@middlewares/ExpressErrorYup'
import ExpressErrorResponse from '@middlewares/ExpressErrorResponse'
import winstonLogger, { winstonStream } from '@config/winston'
import BuildResponse from '@expresso/modules/Response/BuildResponse'
import ResponseError from '@expresso/modules/Response/ResponseError'
import { formatPhoneWhatsApp } from '@expresso/helpers/Phone'

require('dotenv').config()

const port = process.env.PORT || 8001
const appName = process.env.APP_NAME || 'Whatsapp Gateway'

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

app.use(helmet())
app.use(cors())
app.use(logger('combined', { stream: winstonStream }))
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true }))

app.use((req: Request, res, next) => {
  new withState(req)
  next()
})

const SESSION_FILE_PATH = path.resolve('wa-session.json')
let sessionCfg

if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH)
}

// app.get('/', (req: Request, res: Response) => {
//   res.sendFile('index.html', {
//     root: path.join(`${__dirname}/../`, 'views'),
//   })
// })

const clientWa = new Client({
  restartOnAuthFail: true,
  puppeteer: {
    // @ts-ignore
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu',
    ],
  },
  session: sessionCfg,
})

// Check change state listener
clientWa.on('change_state', (newState) => {
  console.log(newState)
  if (newState === 'CONFLICT') {
    console.log('CONFLICT detected')
    // do something here
  }
  if (newState === 'DEPRECATED_VERSION') {
    console.log('DEPRECATED_VERSION detected')
    // do something here
  }
  if (newState === 'OPENING') {
    console.log('OPENING detected')
    // do something here
  }
  if (newState === 'PAIRING') {
    console.log('PAIRING detected')
    // do something here
  }
  if (newState === 'PROXYBLOCK') {
    console.log('PROXYBLOCK detected')
    // do something here
  }
  if (newState === 'SMB_TOS_BLOCK') {
    console.log('SMB_TOS_BLOCK detected')
    // do something here
  }
  if (newState === 'TIMEOUT') {
    console.log('TIMEOUT detected')
    // do something here
  }
  if (newState === 'TOS_BLOCK') {
    console.log('TOS_BLOCK detected')
    // do something here
  }
  if (newState === 'UNLAUNCHED') {
    console.log('UNLAUNCHED detected')
    // do something here
  }
  if (newState === 'UNPAIRED') {
    console.log('UNPAIRED detected')
    // do something here
  }
  if (newState === 'UNPAIRED_IDLE') {
    console.log('UNPAIRED_IDLE detected')
    // do something here
  }
})

clientWa.on('message', async (msg) => {
  const checkChat =
    msg.body.includes('hallo') ||
    msg.body.includes('hey') ||
    msg.body.includes('kak') ||
    msg.body.includes('admin') ||
    msg.body.includes('pagi') ||
    msg.body.includes('siang') ||
    msg.body.includes('malam')

  if (checkChat) {
    const contact = await msg.getContact()
    const chat = await msg.getChat()

    chat.sendMessage(
      `
      Hi @${contact.number}!,
      Terimakasih telah menghubungi,
      Pesan anda akan dibalas nantinya.
      `,
      {
        mentions: [contact],
      }
    )
  }

  // PING
  if (msg.body === '!ping') {
    msg.reply('pong')

    // Help
  } else if (msg.body === '!help') {
    msg.reply(
      `
      *Command BOT yang tersedia*
      !ping   pong
      !info   info device
      !chats  info chat with BOT
      !help   see command BOT
      !sendto send message
      `
    )

    // Groups
  } else if (msg.body === '!groups') {
    clientWa.getChats().then((chats) => {
      const groups = chats.filter((chat) => chat.isGroup)

      if (groups.length === 0) {
        msg.reply('You have no group yet.')
      } else {
        let replyMsg = '*YOUR GROUPS*\n\n'
        groups.forEach((group, i) => {
          replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`
        })
        replyMsg += '_You can use the group id to send a message to the group._'
        msg.reply(replyMsg)
      }
    })

    // Info
  } else if (msg.body === '!info') {
    const { info } = clientWa

    const batteryInfo = await info.getBatteryStatus()

    clientWa.sendMessage(
      msg.from,
      `
      *Connection info*
      User name: ${info.pushname}
      My number: ${info.wid.user}
      Platform: ${info.platform}
      Battery: ${batteryInfo.battery} %
      WhatsApp version: ${info.phone.wa_version}
    `
    )

    // Chats
  } else if (msg.body === '!chats') {
    const chats = await clientWa.getChats()
    console.log(chats)
    clientWa.sendMessage(msg.from, `The bot has ${chats.length} chats open.`)

    // Sendto
  } else if (msg.body.startsWith('!sendto ')) {
    // Direct send a new message to specific id, example !sendto 08123456789 Hello world
    let number = msg.body.split(' ')[1]
    const messageIndex = msg.body.indexOf(number) + number.length
    const message = msg.body.slice(messageIndex, msg.body.length)
    number = formatPhoneWhatsApp(number)

    const chat = await msg.getChat()
    chat.sendSeen()
    clientWa.sendMessage(number, message)

    // Status
  } else if (msg.body.startsWith('!status ')) {
    // example !status Hello world
    const newStatus = msg.body.split(' ')[1]
    await clientWa.setStatus(newStatus)
    msg.reply(`Status was updated to *${newStatus}*`)

    // Mention
  } else if (msg.body === '!mention') {
    const contact = await msg.getContact()
    const chat = await msg.getChat()
    chat.sendMessage(`Hi @${contact.number}!`, {
      mentions: [contact],
    })
  }
})

clientWa.initialize()

// Socket IO
io.on('connection', (socket: Socket) => {
  socket.emit('message', 'Connecting...')

  clientWa.on('change_state', (newState) => {
    socket.emit('message', newState)
  })

  clientWa.on('qr', (qr) => {
    console.log('QR RECEIVED', qr)
    QRCode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url)
      socket.emit('message', 'QR Code received, scan please!')
    })
  })

  clientWa.on('ready', () => {
    socket.emit('ready', 'Whatsapp is ready!')
    socket.emit('message', 'Whatsapp is ready!')
  })

  clientWa.on('authenticated', (session) => {
    socket.emit('authenticated', 'Whatsapp is authenticated!')
    socket.emit('message', 'Whatsapp is authenticated!')
    console.log('AUTHENTICATED', session)
    sessionCfg = session
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
      if (err) {
        console.error(err)
      }
    })
  })

  clientWa.on('auth_failure', (session) => {
    socket.emit('message', 'Auth failure, restarting...')
  })

  clientWa.on('disconnected', (reason) => {
    socket.emit('message', 'Whatsapp is disconnected!')
    fs.unlinkSync(SESSION_FILE_PATH)

    clientWa.destroy()
    clientWa.initialize()
  })
})

// LIST ROUTE
const router = express.Router()

const checkRegisteredNumber = async function (phone: string) {
  const isRegistered = await clientWa.isRegisteredUser(phone)
  return isRegistered
}

const findGroupByName = async function (name: string) {
  const group = await clientWa.getChats().then((chats) => {
    return chats.find(
      (chat) => chat.isGroup && chat.name.toLowerCase() === name.toLowerCase()
    )
  })
  return group
}

router.get('/', async function getHome(req: Request, res: Response) {
  const responseData: any = {
    message: `expresso - ${appName}`,
    maintaner: 'masb0ymas',
  }

  const buildResponse = BuildResponse.get(responseData)
  return res.json(buildResponse)
})

router.get('/v1', function (req: Request, res: Response) {
  throw new ResponseError.Forbidden('forbidden, wrong access endpoint')
})

// get profile
router.get(
  '/v1/profile',
  asyncHandler(async function getProfile(req: Request, res: Response) {
    try {
      const { info } = clientWa
      const batteryInfo = await info.getBatteryStatus()

      const data = {
        phone: info.wid.user,
        pushname: info.pushname,
        platform: info.platform,
        version: info.phone.wa_version,
        battery: `${batteryInfo.battery} %`,
      }

      const buildResponse = BuildResponse.get({ data })
      return res.json(buildResponse)
    } catch (err) {
      throw new ResponseError.Unauthorized('please connect to whatsapp')
    }
  })
)

// Check Number
router.get(
  '/v1/check-number/:phone',
  asyncHandler(async function checkNumber(req: Request, res: Response) {
    const { phone } = req.getParams()

    const newPhone = formatPhoneWhatsApp(phone)

    const isRegisteredNumber = await checkRegisteredNumber(newPhone)
    const data = { oldPhone: phone, newPhone, isRegisteredNumber }

    const buildResponse = BuildResponse.get({
      message: 'check phone number',
      data,
    })
    res.json(buildResponse)
  })
)

// Send Message
router.post(
  '/v1/send-message',
  asyncHandler(async function sendMessage(req: Request, res: Response) {
    const formData = req.body

    const value = useValidation(whatsappSchema.sendMessage, formData)

    // format phone
    const newPhone = formatPhoneWhatsApp(value.phone)
    const newMessage = value.message

    // check your phone
    const isRegisteredNumber = await checkRegisteredNumber(newPhone)
    console.log({ oldPhone: value.phone, newPhone, isRegisteredNumber })

    if (!isRegisteredNumber) {
      throw new ResponseError.BadRequest(
        'The number is not registered in whatsapp'
      )
    }

    clientWa
      .sendMessage(newPhone, newMessage)
      .then((result) => {
        const buildResponse = BuildResponse.get({
          message: 'message sent successfully',
          data: result,
        })
        res.json(buildResponse)
      })
      .catch((err) => {
        console.log({ err })
        const buildResponse = BuildResponse.get({ message: err })
        res.status(500).json(buildResponse)
      })
  })
)

const uploadFile = useMulter({
  dest: 'public/uploads/images',
  allowedExt: allowedImage,
}).fields([{ name: 'fileUpload', maxCount: 1 }])

const setFileToBody = asyncHandler(async function setFileToBody(
  req: Request,
  res,
  next: NextFunction
) {
  const fileUpload = req.pickSingleFieldMulter(['fileUpload'])

  req.setBody(fileUpload)
  next()
})

// Send Media
router.post(
  '/v1/send-media',
  uploadFile,
  setFileToBody,
  asyncHandler(async function sendMedia(req: Request, res: Response) {
    const formData = req.body
    const fieldUpload: FileAttributes = _.get(formData, 'fileUpload', {})

    const value = useValidation(whatsappSchema.sendMedia, formData)

    // format phone
    const newPhone = formatPhoneWhatsApp(value.phone)

    // check your phone
    const isRegisteredNumber = await checkRegisteredNumber(newPhone)

    if (!isRegisteredNumber) {
      throw new ResponseError.BadRequest(
        'The number is not registered in whatsapp'
      )
    }

    const media = MessageMedia.fromFilePath(path.resolve(fieldUpload.path))

    clientWa
      .sendMessage(newPhone, media, { caption: value.caption })
      .then((result) => {
        fs.unlinkSync(fieldUpload.path)

        const buildResponse = BuildResponse.get({
          message: 'message sent successfully',
          data: result,
        })
        res.json(buildResponse)
      })
      .catch((err) => {
        console.log({ err })

        fs.unlinkSync(fieldUpload.path)
        const buildResponse = BuildResponse.get({ message: err })
        res.status(500).json(buildResponse)
      })
  })
)

// Send Media By URL
router.post(
  '/v1/send-media/by-url',
  asyncHandler(async function sendMediaByUrl(req: Request, res: Response) {
    const formData = req.body

    const value = useValidation(whatsappSchema.sendMediaByUrl, formData)

    let mimetype = ''
    const attachment = await axios
      .get(value.url, {
        responseType: 'arraybuffer',
      })
      .then((response) => {
        mimetype = response.headers['content-type']
        return response.data.toString('base64')
      })

    // format phone
    const newPhone = formatPhoneWhatsApp(value.phone)

    // check your phone
    const isRegisteredNumber = await checkRegisteredNumber(newPhone)

    if (!isRegisteredNumber) {
      throw new ResponseError.BadRequest(
        'The number is not registered in whatsapp'
      )
    }

    const media = new MessageMedia(mimetype, attachment, 'Media')

    clientWa
      .sendMessage(newPhone, media, { caption: value.caption })
      .then((result) => {
        const buildResponse = BuildResponse.get({
          message: 'message sent successfully',
          data: result,
        })
        res.json(buildResponse)
      })
      .catch((err) => {
        console.log({ err })
        const buildResponse = BuildResponse.get({ message: err })
        res.status(500).json(buildResponse)
      })
  })
)

// Send Group Name
router.post(
  '/v1/send-group-message',
  asyncHandler(async function sendGroupMessage(req: Request, res: Response) {
    const formData = req.body

    const value = useValidation(whatsappSchema.sendGroupMessage, formData)

    let newChatId = ''
    const newMessage = value.message

    // Find the group by name
    if (!value.chatId) {
      const group = await findGroupByName(value.groupName)
      if (!group) {
        throw new ResponseError.BadRequest(
          `No group found with name: ${value.groupName}`
        )
      }
      newChatId = group.id._serialized
    }

    clientWa
      .sendMessage(newChatId, newMessage)
      .then((result) => {
        const buildResponse = BuildResponse.get({
          message: 'message sent successfully',
          data: result,
        })
        res.json(buildResponse)
      })
      .catch((err) => {
        console.log({ err })
        const buildResponse = BuildResponse.get({ message: err })
        res.status(500).json(buildResponse)
      })
  })
)

// Clear Message
router.post(
  '/v1/clear-message',
  asyncHandler(async function clearMessage(req: Request, res: Response) {
    const formData = req.body

    const value = useValidation(whatsappSchema.clearMessage, formData)

    // format phone
    const newPhone = formatPhoneWhatsApp(value.phone)

    // check your phone
    const isRegisteredNumber = await checkRegisteredNumber(newPhone)

    if (!isRegisteredNumber) {
      throw new ResponseError.BadRequest(
        'The number is not registered in whatsapp'
      )
    }

    const chat = await clientWa.getChatById(newPhone)

    chat
      .clearMessages()
      .then((status) => {
        const buildResponse = BuildResponse.get({
          message: 'clear message successfully',
          data: status,
        })
        res.json(buildResponse)
      })
      .catch((err) => {
        console.log({ err })
        const buildResponse = BuildResponse.get({ message: err })
        res.status(500).json(buildResponse)
      })
  })
)

router.post(
  '/v1/terminate-session',
  asyncHandler(async function terminated(req: Request, res: Response) {
    fs.unlinkSync(SESSION_FILE_PATH)

    clientWa.destroy()
    clientWa.initialize()

    const buildResponse = BuildResponse.get({ message: 'session terminated' })
    return res.json(buildResponse)
  })
)

// indexing route
app.use(router)

app.use('/', ExpressErrorYup)
app.use('/', ExpressErrorResponse)

// catch 404 and forward to error handler
app.use(function (req: Request, res: Response, next: NextFunction) {
  next(createError(404))
})

// error handler
app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // add this line to include winston logging
  winstonLogger.error(
    `${err.status || 500} - ${err.message} - ${req.originalUrl} - ${
      req.method
    } - ${req.ip}`
  )

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

httpServer.listen(port, function () {
  console.log(`App running on *: ${port}`)
})
