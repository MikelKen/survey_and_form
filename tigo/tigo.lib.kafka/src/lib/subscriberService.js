import { KAFKA_CONFIGS } from '../util/constants.js'
import { kafkaInstance, attachKafkaErrorHandlers } from './kafkaService.js'

const consumers = new Map();

export async function subscribe(topic, eachMessage, options = {}) {
  if (!kafkaInstance()) {
    throw new Error('Kafka not initialized. Call initializeKafka() first.')
  }

  const { groupId = KAFKA_CONFIGS.GROUP_ID, fromBeginning = true, ...runOptions } = options;

  if (!consumers.has(groupId)) {
    // Extraemos opciones específicas del consumidor (no del run)
    const { sessionTimeout, rebalanceTimeout, heartbeatInterval, allowAutoTopicCreation } = options;
    const instance = kafkaInstance().consumer({
      groupId,
      sessionTimeout,
      rebalanceTimeout,
      heartbeatInterval,
      allowAutoTopicCreation
    });
    attachKafkaErrorHandlers(instance, `Consumer-${groupId}`);
    await instance.connect();
    consumers.set(groupId, { instance, isRunning: false, listeningPartitions: new Set() });
  }

  const consumerEntry = consumers.get(groupId);
  const consumerInstance = consumerEntry.instance;

  if (consumerEntry.isRunning) {
    throw new Error(`Kafka consumer with groupId "${groupId}" is already running. You cannot subscribe to more topics on the same group after it has started. Provide all topics as an array or use a different groupId.`);
  }

  const wrapEachMessage = (originalEachMessage) => {
    return async (payload) => {
      const { topic, partition, message } = payload;
      const partitionKey = `${topic}-${partition}`;

      if (!consumerEntry.listeningPartitions.has(partitionKey)) {
        consumerEntry.listeningPartitions.add(partitionKey);
        console.log(`[Kafka] Consumer-${groupId} listening topic "${topic}" partition ${partition}`);
      }

      // Método: confirma el mensaje actual
      payload.acknowledge = async () => {
        await consumerInstance.commitOffsets([
          { topic, partition, offset: (BigInt(message.offset) + 1n).toString() }
        ]);
      };

      await originalEachMessage(payload);
    };
  };

  // Support for multiple topics on the same consumer: if topic is an array of objects { topic, onMessage }
  if (Array.isArray(topic)) {
    const subscriptions = topic;
    for (const sub of subscriptions) {
      const subFromBeginning = sub.fromBeginning !== undefined ? sub.fromBeginning : fromBeginning;
      await consumerInstance.subscribe({ topic: sub.topic, fromBeginning: subFromBeginning });
    }
    await consumerInstance.run({
      ...runOptions,
      eachMessage: wrapEachMessage(async (payload) => {
        const sub = subscriptions.find(s => s.topic === payload.topic);
        if (sub?.onMessage) {
          await sub.onMessage(payload);
        }
      })
    });
    consumerEntry.isRunning = true;
    return;
  }

  await consumerInstance.subscribe({ topic, fromBeginning });
  await consumerInstance.run({
    ...runOptions,
    eachMessage: wrapEachMessage(eachMessage)
  });
  consumerEntry.isRunning = true;
}
