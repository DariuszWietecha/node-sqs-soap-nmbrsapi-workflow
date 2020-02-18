import { fromNullable } from "fp-ts/lib/Option";
import * as AWS from "aws-sdk";

fromNullable(process.env.SQS_URL)
  .map((sqsUrl) => {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      region: process.env.AWS_REGION,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    const sqs = new AWS.SQS({ endpoint: sqsUrl });

    fromNullable(process.env.QUEUE_NAME)
      .map((queueName) => {
        const params = {
          QueueName: queueName,
        };

        sqs.createQueue(params, (err, data) => {
          if (err) {
            // tslint:disable-next-line:no-console
            console.error(err, err.stack);
          } else {
            // tslint:disable-next-line:no-console
            console.info(`Queue:\n${params.QueueName}\ncreated:\n${JSON.stringify(data)}`);
          }
        });
      })
      .getOrElseL(() => { throw new Error("Queue name not available") })
  })
  .getOrElseL(() => { throw new Error("SQS endpoint url not available") })
