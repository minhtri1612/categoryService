const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner'); //Utility function dùng để tạo ra một đường link có gắn chữ ký bảo mật
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const s3Client = new S3Client({
    region: 'ap-southeast-2'
});
const dynamoDBClient = new DynamoDBClient({
    region: 'ap-southeast-2'
});

module.exports.getUploadUrl = async (event) => {
    try {
        const { fileName, fileType, categoryName } = JSON.parse(event.body);
        const bucketName = process.env.BUCKET_NAME;
        if (!fileName || !fileType || !categoryName) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            ContentType: fileType
        });
        const imageUrl = `https://${bucketName}.s3.ap-southeast-2.amazonaws.com/${fileName}`;
        const url = await getSignedUrl(s3Client, command, {
            expiresIn: 3600
        });
        const commandDB = new PutItemCommand({
            TableName: process.env.TABLE_NAME,
            Item: {
                fileName: { S: fileName },
                fileType: { S: fileType },
                categoryName: { S: categoryName },
                createdAt: { S: new Date().toISOString() },
                imageUrl: { S: imageUrl }
            }
        });
        await dynamoDBClient.send(commandDB);
        return {
            statusCode: 200,
            body: JSON.stringify({ url })
        };
    } catch (error) {
        console.log(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate pre-signed URL' })
        };
    }
}