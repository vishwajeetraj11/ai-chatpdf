import { Pinecone, Vector, utils as PineconeUtils, PineconeRecord, RecordMetadata } from '@pinecone-database/pinecone'
import { downloadFromS3 } from './s3-server';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { Document, RecursiveCharacterTextSplitter } from '@pinecone-database/doc-splitter'
import { getOpenAIEmbedding } from './embeddings';
import md5 from 'md5';
import { convertToAscii } from './utils';
import { VectorOperationsApi } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch';

let pinecone: Pinecone | null = null;

export const getPineconeClient = () => {
    if (!pinecone) {
        pinecone = new Pinecone({
            environment: process.env.PINECONE_ENVIRONMENT!,
            apiKey: process.env.PINECONE_API_KEY!,
        });
    }
    return pinecone;
};

type PDFPage = {
    pageContent: string;
    metadata: {
        loc: { pageNumber: number };
    };
};

export async function loadS3IntoPinecone(fileKey: string) {
    // 1 obtain the pdf. - download and read from pdf.
    const file_name = await downloadFromS3(fileKey);
    if (!file_name) {
        throw new Error("file not found")
    }
    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];

    // 2 split and segment pdf.
    const documents = await Promise.all(pages.map(prepareDocument));

    // 3. vectorize and embed individual documents
    const vectors = await Promise.all(documents.flat().map(embedDocument));

    // 4. upload to pinecone
    const client = await getPineconeClient()
    // pine cone db name                            ||
    const pineconeIndex = await client.index('chatpdf');
    const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
    console.log('inserting vectors into pinecone');

    await namespace.upsert(vectors);
    // const namespace = convertToAscii(fileKey)
    // PineconeUtils.chunkedUpsert(pineconeIndex as any, vectors, namespace, 10);

}

export const truncateStringByBytes = (str: string, bytes: number) => {
    const enc = new TextEncoder();
    return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
    let { pageContent, metadata } = page;
    pageContent = pageContent.replace(/\n/g, " ");

    // split the docs
    const splitter = new RecursiveCharacterTextSplitter();
    const docs = await splitter.splitDocuments([
        new Document({
            pageContent,
            metadata: {
                pageNumber: metadata.loc.pageNumber,
                text: truncateStringByBytes(pageContent, 36000),
            }
        })
    ]);
    return docs;
}

async function embedDocument(doc: Document) {
    try {
        const embeddings = await getOpenAIEmbedding(doc.pageContent);
        const hash = md5(doc.pageContent);
        return {
            id: hash,
            values: embeddings,
            metadata: {
                text: doc.metadata.text,
                pageNumber: doc.metadata.pageNumber
            }
        } as PineconeRecord
    } catch (error) {
        console.log('error embedding the document', error);
        throw error
    }
}