import { Pinecone, QueryResponse, RecordMetadata } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getOpenAIEmbedding } from "./embeddings";
import { NextResponse } from "next/server";

export async function getMatchesFromEmbeddings(embeddings: number[], fileKey: string) {
    try {
        // const client = new Pinecone({
        //     environment: process.env.PINECONE_ENVIRONMENT!,
        //     apiKey: process.env.PINECONE_API_KEY!,
        // });
        // if (!client) { console.log('weew'); return }

        // const namespace = await client.index("chatpdf").namespace(convertToAscii(fileKey));

        // // const namespace = await pineconeIndex.namespace(convertToAscii(fileKey));
        // console.log({ l: embeddings.length })
        // const queryResult = await namespace.query({
        //     topK: 5,
        //     vector: embeddings,
        //     includeMetadata: true,
        // });

        // return queryResult.matches || []
        const url = `${process.env.PINECONE_HOST!}/query`;

        const res = await fetch(url, {
            method: "POST",
            headers: {
                accept: "application/json",
                "Content-Type": "application/json",
                "Api-Key": process.env.PINECONE_API_KEY || "unknown",
            },
            body: JSON.stringify({
                includeValues: false,
                includeMetadata: true,
                topK: 5,
                vector: embeddings,
                namespace: convertToAscii(fileKey),
            }),
        });
        const resJson = await res.json() as QueryResponse<RecordMetadata>;
        return resJson.matches || [];
    } catch (error) {
        console.log('error querying embeddings', error);
        throw error;
    }
}

type Metadata = {
    text: string, pageNumber: number,
}

export async function getContext(query: string, fileKey: string) {
    const queryEmbedding = await getOpenAIEmbedding(query);
    const matches = await getMatchesFromEmbeddings(queryEmbedding, fileKey);
    // look through matches and find the ones that are above a certain threshold
    // if less than 0.7 its probably irrelevant.
    const qualifyingDocs = matches.filter(match => match.score && match.score > 0.7);
    let docs = qualifyingDocs.map(doc => {
        const metadata = doc.metadata as Metadata;
        return metadata.text;
    })
    // console.log({ docs })
    // not feeding too much info in open ai, token limit might be reached.
    return docs.join('\n').substring(0, 3000);
}