const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDBClient = new DynamoDBClient({
    region: 'ap-southeast-2'
});

module.exports.updateCategoryImage = async (event) => {
    try {
        const tableName = process.env.TABLE_NAME;
        const record = event.Records[0];

        // get S3 bucket name
        const bucketName = record.s3.bucket.name;
        const fileName = record.s3.object.key;

        // update category image
        const command = new UpdateItemCommand({
            TableName: tableName,
            Key: {
                fileName: { S: fileName }
            },
            UpdateExpression: 'SET #imageUrl = :imageUrl',
            ExpressionAttributeNames: {
                '#imageUrl': 'imageUrl'
            },
            ExpressionAttributeValues: {
                ':imageUrl': { S: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}` }
            }
        });
        await dynamoDBClient.send(command);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Category image updated successfully' })
        };
    } catch (error) {
        console.log(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to update category image' })
        };
    }
}