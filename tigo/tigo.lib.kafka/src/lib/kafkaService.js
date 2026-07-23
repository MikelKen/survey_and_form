import 'dotenv/config'
import { Kafka } from 'kafkajs'
import { KAFKA_CONFIGS } from '../util/constants.js'

let _kafkaInstance = null

export function kafkaInstance() {
  return _kafkaInstance
}

export async function initializeKafka() {
  if (!_kafkaInstance) {
    _kafkaInstance = new Kafka({
      clientId: KAFKA_CONFIGS.CLIENT_ID,
      brokers: [`${KAFKA_CONFIGS.HOST}:${KAFKA_CONFIGS.PORT}`]
    })
    console.log('Kafka instance initialized')
  }
}

export function attachKafkaErrorHandlers(instance, name) {
  if (instance._handlersAttached) return
  instance._handlersAttached = true

  let reconnectAttempts = 0
  const maxReconnects = KAFKA_CONFIGS.RETRIES

  async function tryReconnect() {
    if (reconnectAttempts < maxReconnects) {
      reconnectAttempts++
      console.log(`[Kafka] ${name} intentando reconectar (${reconnectAttempts}/${maxReconnects}) en 1 minuto...`)
      await new Promise(res => setTimeout(res, 60000))
      try {
        await instance.connect()
        console.log(`[Kafka] ${name} reconectado exitosamente`)
        reconnectAttempts = 0
      } catch (err) {
        console.error(`[Kafka] ${name} error al reconectar:`, err)
        tryReconnect()
      }
    } else {
      console.error(`[Kafka] ${name} superó el máximo de reintentos de reconexión (${maxReconnects})`)
    }
  }

  instance.on(instance.events.DISCONNECT, () => {
    console.error(`[Kafka] ${name} disconnected`)
    tryReconnect()
  })

  if (name.startsWith('Consumer')) {
    instance.on(instance.events.CRASH, (event) => {
      console.error(`[Kafka] ${name} crashed:`, event.payload.error)
      tryReconnect()
    })
    instance.on(instance.events.CONNECT, () => {
      console.log(`[Kafka] ${name} connected`)
      reconnectAttempts = 0
    })
    instance.on(instance.events.GROUP_JOIN, (event) => {
      console.log(`[Kafka] ${name} joined group:`, event.payload.groupId)
      console.log(`[Kafka] ${name} partition assignment:`, event.payload.memberAssignment)
    })
  }

  if (name === 'Producer') {
    instance.on(instance.events.CONNECT, () => {
      console.log(`[Kafka] ${name} connected`)
      reconnectAttempts = 0
    })
    instance.on(instance.events.REQUEST_TIMEOUT, (event) => {
      console.error(`[Kafka] ${name} request timeout:`, event)
    })
  }
}
