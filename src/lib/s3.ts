import aws from 'aws-sdk';

export async function uploadToS3(file: File) {
    try {
        aws.config.update({
            accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
        })
        const s3 = new aws.S3({
            params: {
                Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME,

            },
            region: 'ap-south-1',
        });

        const file_key = 'uploads/' + Date.now().toString() + file.name.replace(" ", "_");

        const params = {
            Key: file_key,
            Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME!,
            Body: file,
        }

        const upload = s3.putObject(params).on('httpUploadProgress', function (evt) {
            console.log('upload progress', parseInt(((evt.loaded * 100) / evt.total).toString()))
        }).promise();

        await upload.then((data) => {
            console.log('successfully uploaded', file_key);
        })

        return Promise.resolve({ file_key, file_name: file.name });
    } catch (error) {

    }
}

export function getS3FileUrl(file_key: string) {
    const url = `https://${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${file_key}`
    return url;
}