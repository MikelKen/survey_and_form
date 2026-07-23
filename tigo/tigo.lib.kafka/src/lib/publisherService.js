import { kafkaInstance, attachKafkaErrorHandlers } from './kafkaService.js'
import { KAFKA_CONFIGS } from '../util/constants.js'

let producerInstance = null

function serializeMessage(message) {
  if (Buffer.isBuffer(message) || typeof message === 'string') {
    return message
  }

  if (message === undefined) {
    throw new Error('Message is required.')
  }

  return JSON.stringify(message)
}

export async function publish(topic, message) {
  if (!kafkaInstance()) {
    throw new Error('Kafka not initialized. Call initializeKafka() first.')
  }

  if (!producerInstance) {
    producerInstance = kafkaInstance().producer({ idempotent: true })
    attachKafkaErrorHandlers(producerInstance, 'Producer')
    await producerInstance.connect()
  }

  try {
    await producerInstance.send({
      topic,
      acks: KAFKA_CONFIGS.ACKS,
      messages: [{ value: serializeMessage(message) }],
    })
  } catch (error) {
    if (error.name === 'KafkaJSError' && error.message.includes('disconnected')) {
      console.warn('[Kafka] Producer disconnected, attempting to reconnect...')
      await producerInstance.connect()
      await producerInstance.send({
        topic,
        acks: KAFKA_CONFIGS.ACKS,
        messages: [{ value: serializeMessage(message) }],
      })
    } else {
      throw error
    }
  }
}
