const { DynamoDBClient, ScanCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const dynamoClient = new DynamoDBClient({
    region: "ap-southeast-2"
});
const snsClient = new SNSClient({
    region: "ap-southeast-2"
});
const cleanupCategories = async (event) => {
    try {
        const tableName = process.env.TABLE_NAME
        const snsTopicArn = process.env.SNS_TOPIC_ARN

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const command = new ScanCommand({
            TableName: tableName,
            FilterExpression: "createdAt < :oneHourAgo AND attribute_not_exists(imageUrl)",
            ExpressionAttributeValues: {
                ":oneHourAgo": { S: oneHourAgo }
            }
        });
        const result = await dynamoClient.send(command);

        const itemsToDelete = result.Items || [];
        await Promise.all(itemsToDelete.map(async (item) => {
            await dynamoClient.send(new DeleteItemCommand({
                TableName: tableName,
                Key: {
                    fileName: { S: item.fileName.S }
                }
            }));
            deletedCount++;
        }));
        await snsClient.send(new PublishCommand({
            TopicArn: snsTopicArn,
            Message: JSON.stringify({
                message: "Categories cleaned up successfully",
                deletedCount: itemsToDelete.length
            })
        }));

        // send SNS notification
        await snsClient.send(new PublishCommand({
            TopicArn: snsTopicArn,
            Message: JSON.stringify({
                message: "Categories cleaned up successfully",
                deletedCount: itemsToDelete.length
            })
        }));
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Categories cleaned up successfully",
                deletedCount: itemsToDelete.length
            })
        };
    } catch (error) {
        console.log(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to clean up categories" })
        };
    }
}

module.exports = { cleanupCategories };